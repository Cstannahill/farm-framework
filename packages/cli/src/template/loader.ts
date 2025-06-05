// packages/cli/src/template/loader.ts - Updated for monorepo structure
import { readFile, readdir, stat } from "fs/promises";
import { join, resolve, relative } from "path";
import { fileURLToPath } from "url";
import { glob } from "glob";
import { getErrorMessage } from "../utils/error-utils.js";

export class TemplateLoader {
  private templatesPath: string;

  constructor() {
    // Get templates directory from monorepo root
    // Navigate from packages/cli/src/template/ to root/templates/
    this.templatesPath = resolve(process.cwd(), "templates");
  }

  async loadTemplate(templatePath: string): Promise<string> {
    const fullPath = join(this.templatesPath, templatePath);
    try {
      return await readFile(fullPath, "utf-8");
    } catch (error) {
      throw new Error(
        `Failed to load template: ${templatePath} - ${getErrorMessage(error)}`
      );
    }
  }

  async loadBinaryTemplate(templatePath: string): Promise<Buffer> {
    const fullPath = join(this.templatesPath, templatePath);
    try {
      return await readFile(fullPath);
    } catch (error) {
      throw new Error(
        `Failed to load binary template: ${templatePath} - ${getErrorMessage(
          error
        )}`
      );
    }
  }

  async expandGlobPattern(pattern: string): Promise<string[]> {
    const fullPattern = join(this.templatesPath, pattern);
    try {
      const files = await glob(fullPattern, {
        dot: true, // Include dotfiles
        nodir: true, // Only files, not directories
      });

      // Return relative paths from templates directory
      return files.map((file) => relative(this.templatesPath, file));
    } catch (error) {
      console.warn(`Failed to expand glob pattern: ${pattern}`);
      return [];
    }
  }

  async templateExists(templatePath: string): Promise<boolean> {
    try {
      const fullPath = join(this.templatesPath, templatePath);
      await stat(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  async isDirectory(templatePath: string): Promise<boolean> {
    try {
      const fullPath = join(this.templatesPath, templatePath);
      const stats = await stat(fullPath);
      return stats.isDirectory();
    } catch {
      return false;
    }
  }

  async listFiles(templatePath: string): Promise<string[]> {
    const fullPath = join(this.templatesPath, templatePath);
    const files: string[] = [];

    async function walkDir(dir: string, basePath: string = "") {
      try {
        const entries = await readdir(dir, { withFileTypes: true });

        for (const entry of entries) {
          const entryPath = join(dir, entry.name);
          const relativePath = join(basePath, entry.name);

          if (entry.isDirectory()) {
            await walkDir(entryPath, relativePath);
          } else {
            files.push(relativePath);
          }
        }
      } catch (error) {
        // Skip directories that can't be read
        console.warn(`Warning: Could not read directory ${dir}`);
      }
    }

    try {
      if (await this.isDirectory(templatePath)) {
        await walkDir(fullPath);
      } else if (await this.templateExists(templatePath)) {
        files.push(templatePath);
      }
    } catch (error) {
      throw new Error(
        `Failed to list files in template directory: ${templatePath}`
      );
    }

    return files;
  }

  getTemplatesPath(): string {
    return this.templatesPath;
  }
}
