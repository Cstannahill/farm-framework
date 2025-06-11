/**
 * Template loading utilities
 */

import fs from "fs-extra";
import path from "path";
import { glob } from "glob";
import type { TemplateDefinition } from "@farm-framework/types";

export async function loadTemplate(
  templatePath: string
): Promise<TemplateDefinition> {
  const configPath = path.join(templatePath, "template.json");

  if (!(await fs.pathExists(configPath))) {
    throw new Error(`Template configuration not found at: ${configPath}`);
  }

  const config = await fs.readJSON(configPath);
  return config as TemplateDefinition;
}

export async function loadTemplateFiles(
  templatePath: string
): Promise<string[]> {
  const pattern = path.join(templatePath, "**/*").replace(/\\/g, "/");
  const files = await glob(pattern, {
    ignore: ["**/node_modules/**", "**/dist/**", "**/build/**", "**/.git/**"],
    nodir: true,
  });

  return files.map((file) => path.relative(templatePath, file));
}

export async function getBuiltinTemplates(): Promise<TemplateDefinition[]> {
  const templatesDir = path.join(__dirname, "../../templates");

  if (!(await fs.pathExists(templatesDir))) {
    return [];
  }

  const templateDirs = await fs.readdir(templatesDir);
  const templates: TemplateDefinition[] = [];

  for (const dir of templateDirs) {
    const templatePath = path.join(templatesDir, dir);
    const stat = await fs.stat(templatePath);

    if (stat.isDirectory()) {
      try {
        const template = await loadTemplate(templatePath);
        templates.push(template);
      } catch (error) {
        console.warn(`Failed to load template ${dir}:`, error);
      }
    }
  }

  return templates;
}
