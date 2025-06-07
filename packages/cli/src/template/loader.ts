// packages/cli/src/utils/template-loader.ts
import { promises as fs } from "fs";
import { join, dirname } from "path";
import { glob } from "glob";

export class TemplateLoader {
  constructor(private basePath: string) {}

  async loadTemplate(templatePath: string): Promise<string> {
    const fullPath = join(this.basePath, templatePath);
    return await fs.readFile(fullPath, "utf-8");
  }

  async loadBinaryTemplate(templatePath: string): Promise<Buffer> {
    const fullPath = join(this.basePath, templatePath);
    return await fs.readFile(fullPath);
  }

  async expandGlobPattern(pattern: string): Promise<string[]> {
    const fullPattern = join(this.basePath, pattern);
    return await glob(fullPattern);
  }

  async isDirectory(path: string): Promise<boolean> {
    try {
      const fullPath = join(this.basePath, path);
      const stats = await fs.stat(fullPath);
      return stats.isDirectory();
    } catch {
      return false;
    }
  }

  async listFiles(directory: string): Promise<string[]> {
    const fullPath = join(this.basePath, directory);
    const entries = await fs.readdir(fullPath, { withFileTypes: true });
    return entries.filter((entry) => entry.isFile()).map((entry) => entry.name);
  }
}
