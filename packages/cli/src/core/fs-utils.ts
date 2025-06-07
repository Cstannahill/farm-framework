import {
  promises as fs,
  existsSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  copyFileSync,
  statSync,
} from "fs";
import { resolve, dirname, join, relative, basename } from "path";
import { glob } from "glob";
import { FarmError, createFileSystemError } from "./errors.js";
import { logger } from "../utils/logger.js";
import { getErrorMessage } from "@farm/cli/utils/error-handling.js";

export interface CopyOptions {
  overwrite?: boolean;
  filter?: (src: string, dest: string) => boolean;
  transform?: (content: string, filePath: string) => string;
}

export interface TemplateVariables {
  [key: string]: string | number | boolean;
}

export class FileSystemUtils {
  /**
   * Ensure directory exists, create if it doesn't
   */
  async ensureDir(dirPath: string): Promise<void> {
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (error) {
      throw createFileSystemError(
        `Failed to create directory: ${getErrorMessage(error)}`,
        dirPath
      );
    }
  }

  /**
   * Check if path exists
   */
  async exists(path: string): Promise<boolean> {
    try {
      await fs.access(path);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if path exists synchronously
   */
  existsSync(path: string): boolean {
    return existsSync(path);
  }

  /**
   * Read file content
   */
  async readFile(
    filePath: string,
    encoding: BufferEncoding = "utf-8"
  ): Promise<string> {
    try {
      return await fs.readFile(filePath, encoding);
    } catch (error) {
      throw createFileSystemError(
        `Failed to read file: ${getErrorMessage(error)}`,
        filePath
      );
    }
  }

  /**
   * Write file content
   */
  async writeFile(filePath: string, content: string): Promise<void> {
    try {
      await this.ensureDir(dirname(filePath));
      await fs.writeFile(filePath, content, "utf-8");
    } catch (error) {
      throw createFileSystemError(
        `Failed to write file: ${getErrorMessage(error)}`,
        filePath
      );
    }
  }

  /**
   * Copy file from source to destination
   */
  async copyFile(
    src: string,
    dest: string,
    options: CopyOptions = {}
  ): Promise<void> {
    const { overwrite = false, transform } = options;

    try {
      // Check if destination exists and overwrite is disabled
      if (!overwrite && (await this.exists(dest))) {
        throw new Error(`Destination file already exists: ${dest}`);
      }

      // Ensure destination directory exists
      await this.ensureDir(dirname(dest));

      if (transform) {
        // Read, transform, and write
        const content = await this.readFile(src);
        const transformedContent = transform(content, src);
        await this.writeFile(dest, transformedContent);
      } else {
        // Direct copy
        copyFileSync(src, dest);
      }

      logger.debug(`Copied: ${src} → ${dest}`);
    } catch (error) {
      throw createFileSystemError(
        `Failed to copy file: ${getErrorMessage(error)}`,
        src
      );
    }
  }

  /**
   * Copy directory recursively
   */
  async copyDir(
    src: string,
    dest: string,
    options: CopyOptions = {}
  ): Promise<void> {
    const { filter, overwrite = false } = options;

    try {
      const srcStat = statSync(src);
      if (!srcStat.isDirectory()) {
        throw new Error(`Source is not a directory: ${src}`);
      }

      // Ensure destination directory exists
      await this.ensureDir(dest);

      // Get all files in source directory
      const files = await glob("**/*", {
        cwd: src,
        dot: true,
        mark: true,
        absolute: false,
      });

      for (const file of files) {
        const srcFile = join(src, file);
        const destFile = join(dest, file);

        // Apply filter if provided
        if (filter && !filter(srcFile, destFile)) {
          continue;
        }

        const stat = statSync(srcFile);

        if (stat.isDirectory()) {
          await this.ensureDir(destFile);
        } else {
          await this.copyFile(srcFile, destFile, options);
        }
      }

      logger.debug(`Copied directory: ${src} → ${dest}`);
    } catch (error) {
      throw createFileSystemError(
        `Failed to copy directory: ${getErrorMessage(error)}`,
        src
      );
    }
  }

  /**
   * Replace template variables in file content
   */
  replaceTemplateVariables(
    content: string,
    variables: TemplateVariables
  ): string {
    let result = content;

    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, "g");
      result = result.replace(regex, String(value));
    }

    return result;
  }

  /**
   * Process template file with variable substitution
   */
  async processTemplate(
    templatePath: string,
    outputPath: string,
    variables: TemplateVariables
  ): Promise<void> {
    try {
      const content = await this.readFile(templatePath);
      const processedContent = this.replaceTemplateVariables(
        content,
        variables
      );
      await this.writeFile(outputPath, processedContent);

      logger.debug(`Processed template: ${templatePath} → ${outputPath}`);
    } catch (error) {
      throw createFileSystemError(
        `Failed to process template: ${getErrorMessage(error)}`,
        templatePath
      );
    }
  }

  /**
   * Remove file or directory
   */
  async remove(path: string): Promise<void> {
    try {
      await fs.rm(path, { recursive: true, force: true });
    } catch (error) {
      throw createFileSystemError(
        `Failed to remove: ${getErrorMessage(error)}`,
        path
      );
    }
  }

  /**
   * Get file/directory information
   */
  async stat(
    path: string
  ): Promise<{ isFile: boolean; isDirectory: boolean; size: number }> {
    try {
      const stats = await fs.stat(path);
      return {
        isFile: stats.isFile(),
        isDirectory: stats.isDirectory(),
        size: stats.size,
      };
    } catch (error) {
      throw createFileSystemError(
        `Failed to get file stats: ${getErrorMessage(error)}`,
        path
      );
    }
  }

  /**
   * Create symbolic link
   */
  async symlink(target: string, path: string): Promise<void> {
    try {
      await fs.symlink(target, path);
    } catch (error) {
      throw createFileSystemError(
        `Failed to create symlink: ${getErrorMessage(error)}`,
        path
      );
    }
  }

  /**
   * Find files matching pattern
   */
  async glob(
    pattern: string,
    options: { cwd?: string } = {}
  ): Promise<string[]> {
    try {
      return await glob(pattern, options);
    } catch (error) {
      throw createFileSystemError(
        `Failed to find files: ${getErrorMessage(error)}`,
        pattern
      );
    }
  }
}

// Singleton instance for global use
export const fsUtils = new FileSystemUtils();
