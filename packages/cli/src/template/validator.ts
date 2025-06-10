/**
 * Template validation utilities for FARM framework
 */

import path from "path";
import fs from "fs-extra";
import Handlebars from "handlebars";
import { glob } from "glob";
import { logger } from "../utils/logger.js";

/**
 * Template validation result
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  metrics: ValidationMetrics;
}

/**
 * Validation error details
 */
export interface ValidationError {
  type:
    | "syntax"
    | "missing-file"
    | "circular-dependency"
    | "invalid-helper"
    | "schema";
  file: string;
  line?: number;
  column?: number;
  message: string;
  details?: string;
}

/**
 * Validation warning details
 */
export interface ValidationWarning {
  type: "deprecated" | "performance" | "best-practice" | "unused";
  file: string;
  line?: number;
  message: string;
  suggestion?: string;
}

/**
 * Validation metrics
 */
export interface ValidationMetrics {
  totalFiles: number;
  templatesValidated: number;
  helpersUsed: string[];
  complexityScore: number;
  validationTime: number;
}

/**
 * Template validation options
 */
export interface ValidationOptions {
  strict?: boolean;
  checkPerformance?: boolean;
  checkBestPractices?: boolean;
  customHelpers?: string[];
}

/**
 * Enhanced template validator with comprehensive checks
 */
export class TemplateValidator {
  private knownHelpers: Set<string>;

  constructor() {
    // Initialize with known Handlebars helpers
    this.knownHelpers = new Set([
      // Built-in Handlebars helpers
      "if",
      "unless",
      "each",
      "with",
      "lookup",
      "log",

      // FARM framework helpers (from helpers.ts)
      "eq",
      "ne",
      "gt",
      "lt",
      "and",
      "or",
      "not",
      "includes",
      "capitalize",
      "lowercase",
      "uppercase",
      "kebab_case",
      "snake_case",
      "camel_case",
      "pascal_case",
      "pluralize",
      "join",
      "length",
      "default",
      "if_feature",
      "unless_feature",
      "has_features",
      "if_database",
      "unless_database",
      "is_mongodb",
      "is_postgresql",
      "is_mysql",
      "is_sqlite",
      "if_template",
      "is_basic",
      "is_ai_chat",
      "is_ai_dashboard",
      "is_ecommerce",
      "is_cms",
      "is_api_only",
      "if_env",
      "is_development",
      "is_production",
      "is_staging",
      "if_ai_provider",
      "has_ollama",
      "has_openai",
      "has_huggingface",
      "has_ai_enabled",
      "project_name",
      "project_name_kebab",
      "project_name_snake",
      "project_name_camel",
      "project_name_pascal",
      "farm_version",
      "timestamp",
      "year",
      "has_typescript",
      "has_docker",
      "has_testing",
      "if_plugin",
      "get_config",
      "json",
      "debug",
      "log",

      // Template processor helpers
      "switch",
      "case",
      "indent",
      "comment",
      "import_path",
      "validate_name",
      "lazy",
    ]);
  }

  /**
   * Validate a template directory
   */
  async validateTemplate(
    templatePath: string,
    options: ValidationOptions = {}
  ): Promise<ValidationResult> {
    const startTime = Date.now();
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    logger.info(`🔍 Validating template: ${path.basename(templatePath)}`);

    try {
      // Check if template directory exists
      if (!(await fs.pathExists(templatePath))) {
        errors.push({
          type: "missing-file",
          file: templatePath,
          message: "Template directory not found",
        });
        return this.createResult(false, errors, warnings, startTime, 0);
      }

      // Get all template files
      const templateFiles = await this.getTemplateFiles(templatePath);
      const handlebarsFiles = templateFiles.filter((file) =>
        file.endsWith(".hbs")
      );

      // Validate required files
      await this.validateRequiredFiles(templatePath, errors, warnings);

      // Validate Handlebars templates
      const helpersUsed = new Set<string>();
      let complexityScore = 0;

      for (const file of handlebarsFiles) {
        const filePath = path.join(templatePath, file);
        const result = await this.validateHandlebarsFile(filePath, options);

        errors.push(...result.errors);
        warnings.push(...result.warnings);
        result.helpersUsed.forEach((helper) => helpersUsed.add(helper));
        complexityScore += result.complexityScore;
      }

      // Check for circular dependencies
      await this.checkCircularDependencies(
        templatePath,
        handlebarsFiles,
        errors
      );

      // Performance checks
      if (options.checkPerformance) {
        await this.performanceChecks(templatePath, handlebarsFiles, warnings);
      }

      // Best practice checks
      if (options.checkBestPractices) {
        await this.bestPracticeChecks(templatePath, handlebarsFiles, warnings);
      }

      const metrics: ValidationMetrics = {
        totalFiles: templateFiles.length,
        templatesValidated: handlebarsFiles.length,
        helpersUsed: Array.from(helpersUsed),
        complexityScore,
        validationTime: Date.now() - startTime,
      };

      const isValid = errors.length === 0;

      logger.info(
        `✅ Template validation complete: ${isValid ? "VALID" : "INVALID"}`
      );
      logger.info(
        `   Files: ${metrics.totalFiles}, Templates: ${metrics.templatesValidated}`
      );
      logger.info(`   Errors: ${errors.length}, Warnings: ${warnings.length}`);

      return {
        isValid,
        errors,
        warnings,
        metrics,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      errors.push({
        type: "schema",
        file: templatePath,
        message: `Validation failed: ${errorMessage}`,
      });

      return this.createResult(false, errors, warnings, startTime, 0);
    }
  }

  /**
   * Validate a single Handlebars file
   */
  private async validateHandlebarsFile(
    filePath: string,
    options: ValidationOptions
  ): Promise<{
    errors: ValidationError[];
    warnings: ValidationWarning[];
    helpersUsed: string[];
    complexityScore: number;
  }> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const helpersUsed: string[] = [];
    let complexityScore = 0;

    try {
      const content = await fs.readFile(filePath, "utf-8");

      // Try to compile the template to catch syntax errors
      try {
        const template = Handlebars.compile(content);

        // Extract helpers used
        const helperMatches = content.match(/\{\{#?(\w+)/g);
        if (helperMatches) {
          for (const match of helperMatches) {
            const helper = match.replace(/\{\{#?/, "");
            helpersUsed.push(helper);

            // Check if helper is known
            if (
              !this.knownHelpers.has(helper) &&
              !options.customHelpers?.includes(helper)
            ) {
              errors.push({
                type: "invalid-helper",
                file: filePath,
                message: `Unknown helper: ${helper}`,
                details:
                  "This helper is not registered and may cause runtime errors",
              });
            }
          }
        }

        // Calculate complexity score
        complexityScore = this.calculateComplexity(content);

        // Check for performance issues
        if (options.checkPerformance) {
          this.checkTemplatePerformance(content, filePath, warnings);
        }
      } catch (syntaxError) {
        errors.push({
          type: "syntax",
          file: filePath,
          message: `Handlebars syntax error: ${
            syntaxError instanceof Error
              ? syntaxError.message
              : String(syntaxError)
          }`,
          details: syntaxError instanceof Error ? syntaxError.stack : undefined,
        });
      }
    } catch (readError) {
      errors.push({
        type: "missing-file",
        file: filePath,
        message: `Could not read file: ${
          readError instanceof Error ? readError.message : String(readError)
        }`,
      });
    }

    return { errors, warnings, helpersUsed, complexityScore };
  }

  /**
   * Calculate template complexity score
   */
  private calculateComplexity(content: string): number {
    let score = 0;

    // Count control structures
    score += (content.match(/\{\{#if/g) || []).length * 2;
    score += (content.match(/\{\{#unless/g) || []).length * 2;
    score += (content.match(/\{\{#each/g) || []).length * 3;
    score += (content.match(/\{\{#with/g) || []).length * 2;

    // Count nested structures
    const depth = this.calculateNestingDepth(content);
    score += depth * 5;

    return score;
  }

  /**
   * Calculate maximum nesting depth
   */
  private calculateNestingDepth(content: string): number {
    let maxDepth = 0;
    let currentDepth = 0;

    const tokens = content.match(/\{\{[#\/][^}]+\}\}/g) || [];

    for (const token of tokens) {
      if (token.startsWith("{{#")) {
        currentDepth++;
        maxDepth = Math.max(maxDepth, currentDepth);
      } else if (token.startsWith("{{/")) {
        currentDepth--;
      }
    }

    return maxDepth;
  }

  /**
   * Check for performance issues in templates
   */
  private checkTemplatePerformance(
    content: string,
    filePath: string,
    warnings: ValidationWarning[]
  ): void {
    // Check for potential performance issues
    if (content.length > 10000) {
      warnings.push({
        type: "performance",
        file: filePath,
        message: "Large template file may impact compilation performance",
        suggestion: "Consider breaking into smaller partial templates",
      });
    }

    // Check for excessive nesting
    const depth = this.calculateNestingDepth(content);
    if (depth > 5) {
      warnings.push({
        type: "performance",
        file: filePath,
        message: `Deep nesting detected (depth: ${depth})`,
        suggestion: "Consider refactoring to reduce nesting complexity",
      });
    }

    // Check for complex expressions
    const complexExpressions =
      content.match(/\{\{[^}]*\([^}]*\)[^}]*\}\}/g) || [];
    if (complexExpressions.length > 10) {
      warnings.push({
        type: "performance",
        file: filePath,
        message: "Many complex expressions may impact rendering performance",
        suggestion: "Consider moving complex logic to helpers",
      });
    }
  }

  /**
   * Validate required template files
   */
  private async validateRequiredFiles(
    templatePath: string,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): Promise<void> {
    const requiredFiles = ["package.json.hbs", "farm.config.ts.hbs"];

    for (const requiredFile of requiredFiles) {
      const filePath = path.join(templatePath, requiredFile);
      if (!(await fs.pathExists(filePath))) {
        errors.push({
          type: "missing-file",
          file: requiredFile,
          message: `Required template file is missing: ${requiredFile}`,
        });
      }
    }
  }

  /**
   * Check for circular dependencies between templates
   */
  private async checkCircularDependencies(
    templatePath: string,
    handlebarsFiles: string[],
    errors: ValidationError[]
  ): Promise<void> {
    // This is a simplified check - in a real implementation,
    // you'd parse the template files to detect actual dependencies

    const dependencies = new Map<string, string[]>();

    for (const file of handlebarsFiles) {
      const filePath = path.join(templatePath, file);
      try {
        const content = await fs.readFile(filePath, "utf-8");
        const partialMatches = content.match(/\{\{>\s*([^}]+)\}\}/g) || [];

        dependencies.set(
          file,
          partialMatches.map((match) =>
            match
              .replace(/\{\{>\s*/, "")
              .replace(/\}\}/, "")
              .trim()
          )
        );
      } catch (error) {
        // Skip files that can't be read
      }
    }

    // Simple cycle detection (would need more sophisticated algorithm for real use)
    for (const [file, deps] of dependencies) {
      for (const dep of deps) {
        if (dependencies.get(dep)?.includes(file)) {
          errors.push({
            type: "circular-dependency",
            file,
            message: `Circular dependency detected between ${file} and ${dep}`,
          });
        }
      }
    }
  }

  /**
   * Perform performance checks on template structure
   */
  private async performanceChecks(
    templatePath: string,
    handlebarsFiles: string[],
    warnings: ValidationWarning[]
  ): Promise<void> {
    // Check for too many template files (may slow down processing)
    if (handlebarsFiles.length > 100) {
      warnings.push({
        type: "performance",
        file: templatePath,
        message: `Large number of template files (${handlebarsFiles.length})`,
        suggestion:
          "Consider organizing templates into subdirectories or using partials",
      });
    }
  }

  /**
   * Perform best practice checks
   */
  private async bestPracticeChecks(
    templatePath: string,
    handlebarsFiles: string[],
    warnings: ValidationWarning[]
  ): Promise<void> {
    // Check for naming conventions
    for (const file of handlebarsFiles) {
      if (!file.match(/^[a-z0-9.-]+\.hbs$/)) {
        warnings.push({
          type: "best-practice",
          file,
          message: "Template file name should use lowercase and hyphens",
          suggestion: "Follow kebab-case naming convention",
        });
      }
    }
  }

  /**
   * Get all files in template directory
   */
  private async getTemplateFiles(templatePath: string): Promise<string[]> {
    const pattern = path.join(templatePath, "**/*").replace(/\\/g, "/");
    const files = await glob(pattern, {
      ignore: ["**/node_modules/**", "**/dist/**", "**/.git/**"],
      nodir: true,
      dot: true,
    });
    return files.map((file) => path.relative(templatePath, file));
  }

  /**
   * Create validation result
   */
  private createResult(
    isValid: boolean,
    errors: ValidationError[],
    warnings: ValidationWarning[],
    startTime: number,
    templatesValidated: number
  ): ValidationResult {
    return {
      isValid,
      errors,
      warnings,
      metrics: {
        totalFiles: 0,
        templatesValidated,
        helpersUsed: [],
        complexityScore: 0,
        validationTime: Date.now() - startTime,
      },
    };
  }
}

/**
 * Validate template with default options
 */
export async function validateTemplate(
  templatePath: string,
  options?: ValidationOptions
): Promise<ValidationResult> {
  const validator = new TemplateValidator();
  return validator.validateTemplate(templatePath, options);
}

/**
 * Export validation utilities
 */
export { TemplateValidator as default };
