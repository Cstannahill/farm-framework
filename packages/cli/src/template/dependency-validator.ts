// packages/cli/src/template/dependency-validator.ts

import fs from "fs-extra";
import path from "path";
import { logger } from "../utils/logger.js";

/**
 * Configuration for dependency validation
 */
export interface DependencyValidationConfig {
  /** Allow template to override base dependencies */
  allowOverrides?: boolean;
  /** Specific packages that can be overridden */
  allowedOverrides?: string[];
  /** Warn about potential conflicts instead of erroring */
  warnOnly?: boolean;
  /** Skip validation entirely */
  skipValidation?: boolean;
}

/**
 * Dependency information for validation
 */
export interface DependencyInfo {
  name: string;
  version: string;
  source: "base" | "template" | "feature";
  filePath: string;
}

/**
 * Validation result
 */
export interface DependencyValidationResult {
  valid: boolean;
  conflicts: DependencyConflict[];
  warnings: string[];
  mergedDependencies: Record<string, string>;
  mergedDevDependencies: Record<string, string>;
}

/**
 * Dependency conflict information
 */
export interface DependencyConflict {
  packageName: string;
  baseVersion: string;
  templateVersion: string;
  severity: "error" | "warning";
  resolution: "use-base" | "use-template" | "manual-review";
}

/**
 * Dependency validator and merger for template inheritance
 */
export class DependencyValidator {
  private config: DependencyValidationConfig;
  private baseDependencies: Record<string, string> = {};
  private baseDevDependencies: Record<string, string> = {};

  constructor(config: DependencyValidationConfig = {}) {
    this.config = {
      allowOverrides: false,
      allowedOverrides: [],
      warnOnly: false,
      skipValidation: false,
      ...config,
    };
  }

  /**
   * Load base template dependencies for validation
   */
  async loadBaseDependencies(baseTemplatePath: string): Promise<void> {
    const basePackageJsonPath = path.join(
      baseTemplatePath,
      "apps/web/package.json.hbs"
    );

    if (!(await fs.pathExists(basePackageJsonPath))) {
      logger.warn(`⚠️  Base package.json not found at: ${basePackageJsonPath}`);
      return;
    }

    try {
      const baseContent = await fs.readFile(basePackageJsonPath, "utf-8");

      // Parse Handlebars template to extract dependencies
      const basePackageJson = this.parsePackageJsonTemplate(baseContent);

      this.baseDependencies = basePackageJson.dependencies || {};
      this.baseDevDependencies = basePackageJson.devDependencies || {};

      logger.debug(
        `📦 Loaded ${Object.keys(this.baseDependencies).length} base dependencies and ${Object.keys(this.baseDevDependencies).length} base dev dependencies`
      );
    } catch (error) {
      logger.error(`Failed to load base dependencies: ${error}`);
      throw error;
    }
  }

  /**
   * Validate and merge package.json files from template inheritance
   */
  async validateAndMergeDependencies(
    packageJsonFiles: Array<{
      content: string;
      source: "base" | "template" | "feature";
      filePath: string;
    }>
  ): Promise<DependencyValidationResult> {
    if (this.config.skipValidation) {
      return this.mergeWithoutValidation(packageJsonFiles);
    }

    const conflicts: DependencyConflict[] = [];
    const warnings: string[] = [];
    let mergedDependencies = { ...this.baseDependencies };
    let mergedDevDependencies = { ...this.baseDevDependencies };

    // Process each package.json file
    for (const file of packageJsonFiles) {
      if (file.source === "base") continue; // Skip base, already loaded

      try {
        const packageJson = this.parsePackageJsonTemplate(file.content);

        // Validate dependencies
        const depConflicts = this.validateDependencies(
          packageJson.dependencies || {},
          "dependencies",
          file
        );
        conflicts.push(...depConflicts);

        const devDepConflicts = this.validateDependencies(
          packageJson.devDependencies || {},
          "devDependencies",
          file
        );
        conflicts.push(...devDepConflicts);

        // Merge non-conflicting dependencies
        mergedDependencies = this.mergeDependencies(
          mergedDependencies,
          packageJson.dependencies || {},
          conflicts,
          "dependencies"
        );

        mergedDevDependencies = this.mergeDependencies(
          mergedDevDependencies,
          packageJson.devDependencies || {},
          conflicts,
          "devDependencies"
        );
      } catch (error) {
        warnings.push(
          `Failed to parse ${file.source} package.json at ${file.filePath}: ${error}`
        );
      }
    }

    // Determine if validation passed
    const errorConflicts = conflicts.filter((c) => c.severity === "error");
    const valid = errorConflicts.length === 0;

    if (!valid && !this.config.warnOnly) {
      logger.error("❌ Dependency validation failed:");
      errorConflicts.forEach((conflict) => {
        logger.error(
          `   ${conflict.packageName}: base uses ${conflict.baseVersion}, template wants ${conflict.templateVersion}`
        );
      });
    }

    return {
      valid: valid || (this.config.warnOnly ?? false),
      conflicts,
      warnings,
      mergedDependencies,
      mergedDevDependencies,
    };
  }

  /**
   * Validate dependencies against base template
   */
  private validateDependencies(
    templateDeps: Record<string, string>,
    depType: "dependencies" | "devDependencies",
    file: { source: string; filePath: string }
  ): DependencyConflict[] {
    const conflicts: DependencyConflict[] = [];
    const baseDeps =
      depType === "dependencies"
        ? this.baseDependencies
        : this.baseDevDependencies;

    for (const [packageName, templateVersion] of Object.entries(templateDeps)) {
      const baseVersion = baseDeps[packageName];

      if (baseVersion) {
        // Package exists in base template
        const isAllowedOverride =
          this.config.allowOverrides ||
          this.config.allowedOverrides?.includes(packageName);

        const severity = isAllowedOverride ? "warning" : "error";
        const resolution = isAllowedOverride ? "use-template" : "use-base";

        if (baseVersion !== templateVersion) {
          conflicts.push({
            packageName,
            baseVersion,
            templateVersion,
            severity,
            resolution,
          });

          const level = severity === "error" ? "error" : "warn";
          logger[level](
            `🔄 Dependency conflict in ${file.source} (${file.filePath}): ` +
              `${packageName} - base: ${baseVersion}, template: ${templateVersion}`
          );
        } else {
          // Same version - this is redundant but not an error
          logger.warn(
            `⚠️  Redundant dependency in ${file.source}: ${packageName}@${templateVersion} ` +
              `(already defined in base template)`
          );
        }
      }
    }

    return conflicts;
  }

  /**
   * Merge dependencies while respecting conflict resolution
   */
  private mergeDependencies(
    baseDeps: Record<string, string>,
    templateDeps: Record<string, string>,
    conflicts: DependencyConflict[],
    depType: string
  ): Record<string, string> {
    const merged = { ...baseDeps };

    for (const [packageName, templateVersion] of Object.entries(templateDeps)) {
      const conflict = conflicts.find((c) => c.packageName === packageName);

      if (conflict) {
        // Handle conflict based on resolution strategy
        if (conflict.resolution === "use-template") {
          merged[packageName] = templateVersion;
          logger.debug(
            `📝 Using template version for ${packageName}: ${templateVersion}`
          );
        } else {
          // use-base or manual-review - keep base version
          logger.debug(
            `📝 Keeping base version for ${packageName}: ${baseDeps[packageName]}`
          );
        }
      } else {
        // No conflict - add new dependency
        merged[packageName] = templateVersion;
        logger.debug(
          `✅ Adding new dependency: ${packageName}@${templateVersion}`
        );
      }
    }

    return merged;
  }

  /**
   * Merge without validation (for skipValidation mode)
   */
  private mergeWithoutValidation(
    packageJsonFiles: Array<{
      content: string;
      source: "base" | "template" | "feature";
      filePath: string;
    }>
  ): DependencyValidationResult {
    let mergedDependencies = {};
    let mergedDevDependencies = {};

    // Simple merge - last one wins
    for (const file of packageJsonFiles) {
      try {
        const packageJson = this.parsePackageJsonTemplate(file.content);
        mergedDependencies = {
          ...mergedDependencies,
          ...(packageJson.dependencies || {}),
        };
        mergedDevDependencies = {
          ...mergedDevDependencies,
          ...(packageJson.devDependencies || {}),
        };
      } catch (error) {
        logger.warn(
          `Failed to parse package.json from ${file.source}: ${error}`
        );
      }
    }

    return {
      valid: true,
      conflicts: [],
      warnings: [],
      mergedDependencies,
      mergedDevDependencies,
    };
  }

  /**
   * Parse a Handlebars package.json template
   * This is a simplified parser that handles basic templates
   */
  private parsePackageJsonTemplate(content: string): any {
    try {
      // Remove Handlebars comments
      let cleaned = content.replace(/\{\{!.*?\}\}/g, "");

      // Handle simple conditionals by removing them for parsing
      // This is a basic implementation - could be enhanced
      cleaned = cleaned.replace(/\{\{#if.*?\}\}/g, "");
      cleaned = cleaned.replace(/\{\{\/if.*?\}\}/g, "");
      cleaned = cleaned.replace(/\{\{#unless.*?\}\}/g, "");
      cleaned = cleaned.replace(/\{\{\/unless.*?\}\}/g, "");

      // Handle simple variable substitutions
      cleaned = cleaned.replace(/\{\{projectName\}\}/g, "test-project");
      cleaned = cleaned.replace(/\{\{projectNameKebab\}\}/g, "test-project");
      cleaned = cleaned.replace(/\{\{version\}\}/g, "0.1.0");

      return JSON.parse(cleaned);
    } catch (error) {
      // If parsing fails, return empty object
      logger.debug(`Failed to parse package.json template: ${error}`);
      return {};
    }
  }

  /**
   * Generate a report of dependency validation results
   */
  generateValidationReport(result: DependencyValidationResult): string {
    const lines: string[] = [];

    lines.push("📦 Dependency Validation Report");
    lines.push("=".repeat(40));

    if (result.valid) {
      lines.push("✅ Validation passed");
    } else {
      lines.push("❌ Validation failed");
    }

    if (result.conflicts.length > 0) {
      lines.push("");
      lines.push("🔄 Conflicts:");
      result.conflicts.forEach((conflict) => {
        const icon = conflict.severity === "error" ? "❌" : "⚠️";
        lines.push(
          `   ${icon} ${conflict.packageName}: ${conflict.baseVersion} → ${conflict.templateVersion} (${conflict.resolution})`
        );
      });
    }

    if (result.warnings.length > 0) {
      lines.push("");
      lines.push("⚠️  Warnings:");
      result.warnings.forEach((warning) => {
        lines.push(`   ${warning}`);
      });
    }

    lines.push("");
    lines.push(
      `📊 Merged dependencies: ${Object.keys(result.mergedDependencies).length}`
    );
    lines.push(
      `📊 Merged dev dependencies: ${Object.keys(result.mergedDevDependencies).length}`
    );

    return lines.join("\n");
  }
}
