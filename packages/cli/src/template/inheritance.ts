// packages/cli/src/template/inheritance.ts

import path from "path";
import fs from "fs-extra";
import { glob } from "glob";
import { logger } from "../utils/logger.js";
import { TemplateContext } from "@farm-framework/types";

/**
 * Template inheritance configuration
 */
export interface TemplateInheritanceConfig {
  /** Base template to inherit from */
  base?: string;
  /** Files to exclude from inheritance */
  excludeFromInheritance?: string[];
  /** Files to override (force overwrite base files) */
  overrideFiles?: string[];
  /** Features directory for modular components */
  featuresDir?: string;
  /** Allow overwriting base dependencies */
  allowDependencyOverride?: boolean;
}

/**
 * File inheritance strategy
 */
export interface FileInheritanceStrategy {
  /** How to handle file conflicts */
  conflictResolution: "base-wins" | "template-wins" | "merge" | "error";
  /** Files that should always be inherited from base */
  alwaysInherit?: string[];
  /** Files that should never be inherited */
  neverInherit?: string[];
  /** Custom merge strategies for specific file patterns */
  mergeStrategies?: Record<
    string,
    "deep-merge" | "template-override" | "base-append"
  >;
}

/**
 * Template file metadata
 */
export interface TemplateFileInfo {
  path: string;
  relativePath: string;
  source: "base" | "template" | "feature";
  isHandlebars: boolean;
  priority: number;
}

/**
 * Template inheritance resolver
 */
export class TemplateInheritanceResolver {
  private templatesDir: string;
  private inheritanceConfig: TemplateInheritanceConfig;
  private fileStrategy: FileInheritanceStrategy;

  constructor(
    templatesDir: string,
    inheritanceConfig: TemplateInheritanceConfig = {},
    fileStrategy: FileInheritanceStrategy = {
      conflictResolution: "template-wins",
    }
  ) {
    this.templatesDir = templatesDir;
    this.inheritanceConfig = {
      base: "base",
      excludeFromInheritance: [], // Remove package.json exclusion to enable dependency validation
      overrideFiles: [],
      featuresDir: "features",
      allowDependencyOverride: false,
      ...inheritanceConfig,
    };
    this.fileStrategy = {
      alwaysInherit: [
        "eslint.config.js.hbs",
        "postcss.config.js.hbs",
        "tailwind.config.js.hbs",
        "tsconfig.json.hbs",
        "tsconfig.node.json.hbs",
        "vite.config.ts.hbs",
        "index.html.hbs",
      ],
      neverInherit: ["README.md.hbs"], // Remove package.json.hbs to enable inheritance and validation
      mergeStrategies: {
        "package.json.hbs": "deep-merge",
        "farm.config.ts.hbs": "template-override",
        "*.md.hbs": "template-override",
      },
      ...fileStrategy,
    };
  }

  /**
   * Resolve all files for a template with inheritance
   */
  async resolveTemplateFiles(
    templateName: string,
    context: TemplateContext
  ): Promise<TemplateFileInfo[]> {
    const files: TemplateFileInfo[] = [];

    // 1. Get base template files first
    if (
      this.inheritanceConfig.base &&
      templateName !== this.inheritanceConfig.base
    ) {
      const baseFiles = await this.getTemplateFiles(
        this.inheritanceConfig.base,
        "base"
      );
      files.push(...baseFiles);
    }

    // 2. Get template-specific files
    const templateFiles = await this.getTemplateFiles(templateName, "template");
    files.push(...templateFiles);

    // 3. Get feature files based on context
    if (context.features && context.features.length > 0) {
      const featureFiles = await this.getFeatureFiles(context.features);
      files.push(...featureFiles);
    }

    // 4. Resolve conflicts and apply inheritance rules
    const resolvedFiles = this.resolveFileConflicts(files);

    logger.debug(
      `📁 Resolved ${resolvedFiles.length} files for template ${templateName}`
    );
    return resolvedFiles;
  }

  /**
   * Get files from a specific template directory
   */
  private async getTemplateFiles(
    templateName: string,
    source: "base" | "template"
  ): Promise<TemplateFileInfo[]> {
    const templatePath = path.join(this.templatesDir, templateName);

    if (!(await fs.pathExists(templatePath))) {
      if (source === "base") {
        logger.warn(`⚠️  Base template not found: ${templatePath}`);
        return [];
      }
      throw new Error(`Template directory not found: ${templatePath}`);
    }

    const pattern = path.join(templatePath, "**/*").replace(/\\/g, "/");
    const files = await glob(pattern, {
      ignore: [
        "**/node_modules/**",
        "**/dist/**",
        "**/build/**",
        "**/.git/**",
        "**/coverage/**",
        "**/*.log",
      ],
      nodir: true,
      dot: true,
    });

    return files.map((file) => {
      const relativePath = path.relative(templatePath, file);
      return {
        path: file,
        relativePath,
        source,
        isHandlebars: file.endsWith(".hbs"),
        priority: source === "base" ? 1 : 2,
      };
    });
  }

  /**
   * Get feature files from features directory
   */
  private async getFeatureFiles(
    features: string[]
  ): Promise<TemplateFileInfo[]> {
    const files: TemplateFileInfo[] = [];

    for (const feature of features) {
      const featurePath = path.join(this.templatesDir, "features", feature);

      if (await fs.pathExists(featurePath)) {
        const pattern = path.join(featurePath, "**/*").replace(/\\/g, "/");
        const featureFiles = await glob(pattern, {
          ignore: ["**/node_modules/**", "**/dist/**"],
          nodir: true,
          dot: true,
        });

        const mappedFiles = featureFiles.map((file) => {
          const relativePath = path.relative(featurePath, file);
          return {
            path: file,
            relativePath,
            source: "feature" as const,
            isHandlebars: file.endsWith(".hbs"),
            priority: 3, // Features have highest priority
          };
        });

        files.push(...mappedFiles);
        logger.debug(
          `📦 Added ${mappedFiles.length} files from feature: ${feature}`
        );
      }
    }

    return files;
  }

  /**
   * Resolve conflicts between files from different sources
   */
  private resolveFileConflicts(files: TemplateFileInfo[]): TemplateFileInfo[] {
    const fileMap = new Map<string, TemplateFileInfo[]>();

    // Group files by relative path
    for (const file of files) {
      const key = file.relativePath;
      if (!fileMap.has(key)) {
        fileMap.set(key, []);
      }
      fileMap.get(key)!.push(file);
    }

    const resolvedFiles: TemplateFileInfo[] = [];

    for (const [relativePath, conflictingFiles] of fileMap) {
      if (conflictingFiles.length === 1) {
        // No conflict, add the file
        resolvedFiles.push(conflictingFiles[0]);
        continue;
      }

      // Handle conflicts based on inheritance rules
      const resolvedFile = this.resolveFileConflict(
        relativePath,
        conflictingFiles
      );
      if (resolvedFile) {
        resolvedFiles.push(resolvedFile);
      }
    }

    return resolvedFiles;
  }

  /**
   * Resolve a specific file conflict
   */
  private resolveFileConflict(
    relativePath: string,
    conflictingFiles: TemplateFileInfo[]
  ): TemplateFileInfo | null {
    // Sort by priority (higher priority wins)
    const sortedFiles = conflictingFiles.sort(
      (a, b) => b.priority - a.priority
    );

    // Check inheritance rules
    if (
      this.fileStrategy.neverInherit?.some((pattern) =>
        this.matchesPattern(relativePath, pattern)
      )
    ) {
      // Only keep template/feature files, exclude base
      const nonBaseFiles = sortedFiles.filter((f) => f.source !== "base");
      if (nonBaseFiles.length > 0) {
        logger.debug(`🚫 Skipping base inheritance for: ${relativePath}`);
        return nonBaseFiles[0];
      }
    }

    if (
      this.fileStrategy.alwaysInherit?.some((pattern) =>
        this.matchesPattern(relativePath, pattern)
      )
    ) {
      // Always inherit from base unless explicitly overridden
      const baseFile = sortedFiles.find((f) => f.source === "base");
      const overrideFile = sortedFiles.find((f) => f.source !== "base");

      if (baseFile && !overrideFile) {
        logger.debug(`📋 Inheriting from base: ${relativePath}`);
        return baseFile;
      } else if (baseFile && overrideFile) {
        logger.debug(`🔄 Template overrides base: ${relativePath}`);
        return overrideFile;
      }
    }

    // Check if file is excluded from inheritance
    if (
      this.inheritanceConfig.excludeFromInheritance?.some((pattern) =>
        this.matchesPattern(relativePath, pattern)
      )
    ) {
      // Only keep template/feature files
      const nonBaseFiles = sortedFiles.filter((f) => f.source !== "base");
      if (nonBaseFiles.length > 0) {
        logger.debug(`⚠️  Excluding from inheritance: ${relativePath}`);
        return nonBaseFiles[0];
      }
    }

    // Default conflict resolution
    switch (this.fileStrategy.conflictResolution) {
      case "template-wins":
        logger.debug(`🏆 Template wins conflict: ${relativePath}`);
        return sortedFiles[0];

      case "base-wins":
        const baseFile = sortedFiles.find((f) => f.source === "base");
        if (baseFile) {
          logger.debug(`🏆 Base wins conflict: ${relativePath}`);
          return baseFile;
        }
        return sortedFiles[0];

      case "error":
        throw new Error(
          `File conflict detected for ${relativePath}. Sources: ${conflictingFiles.map((f) => f.source).join(", ")}`
        );

      case "merge":
        // For now, return the highest priority file
        // TODO: Implement actual file merging
        logger.warn(
          `🔀 Merge not implemented, using highest priority for: ${relativePath}`
        );
        return sortedFiles[0];

      default:
        return sortedFiles[0];
    }
  }

  /**
   * Check if a path matches a pattern (supports simple wildcards)
   */
  private matchesPattern(path: string, pattern: string): boolean {
    // Convert glob pattern to regex
    const regexPattern = pattern
      .replace(/\./g, "\\.")
      .replace(/\*/g, ".*")
      .replace(/\?/g, ".");

    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(path);
  }

  /**
   * Validate template inheritance configuration
   */
  async validateInheritance(templateName: string): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if base template exists
    if (this.inheritanceConfig.base) {
      const basePath = path.join(
        this.templatesDir,
        this.inheritanceConfig.base
      );
      if (!(await fs.pathExists(basePath))) {
        errors.push(`Base template not found: ${this.inheritanceConfig.base}`);
      }
    }

    // Check if template exists
    const templatePath = path.join(this.templatesDir, templateName);
    if (!(await fs.pathExists(templatePath))) {
      errors.push(`Template not found: ${templateName}`);
    }

    // Check for circular inheritance (simple check)
    if (templateName === this.inheritanceConfig.base) {
      warnings.push(`Template ${templateName} inherits from itself`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Get inheritance information for debugging
   */
  async getInheritanceInfo(
    templateName: string,
    context: TemplateContext
  ): Promise<{
    baseTemplate?: string;
    templateFiles: number;
    baseFiles: number;
    featureFiles: number;
    conflicts: Array<{ path: string; sources: string[] }>;
  }> {
    const files = await this.resolveTemplateFiles(templateName, context);

    const templateFiles = files.filter((f) => f.source === "template").length;
    const baseFiles = files.filter((f) => f.source === "base").length;
    const featureFiles = files.filter((f) => f.source === "feature").length;

    // Find conflicts (files with same relativePath)
    const pathGroups = new Map<string, TemplateFileInfo[]>();
    files.forEach((file) => {
      const key = file.relativePath;
      if (!pathGroups.has(key)) pathGroups.set(key, []);
      pathGroups.get(key)!.push(file);
    });

    const conflicts = Array.from(pathGroups.entries())
      .filter(([_, files]) => files.length > 1)
      .map(([path, files]) => ({
        path,
        sources: Array.from(new Set(files.map((f) => f.source))),
      }));

    return {
      baseTemplate: this.inheritanceConfig.base,
      templateFiles,
      baseFiles,
      featureFiles,
      conflicts,
    };
  }
}
