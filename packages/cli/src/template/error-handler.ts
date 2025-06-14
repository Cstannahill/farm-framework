// packages/cli/src/template/error-handler.ts
/**
 * Comprehensive error handling system for template processing
 * Provides helpful feedback and safety rails for template contributors
 */

import { logger } from "../utils/logger.js";

export interface TemplateError {
  type: "missing_helper" | "syntax_error" | "jsx_conflict" | "unknown";
  message: string;
  file: string;
  line?: number;
  column?: number;
  suggestion?: string;
  severity: "error" | "warning" | "info";
}

export interface TemplateProcessingResult {
  success: boolean;
  content?: string;
  errors: TemplateError[];
  warnings: TemplateError[];
}

export class TemplateErrorHandler {
  private knownHelpers: Set<string> = new Set();

  constructor(registeredHelpers: string[]) {
    this.knownHelpers = new Set(registeredHelpers);
  }

  /**
   * Parse and categorize Handlebars errors
   */
  public parseHandlebarsError(error: Error, filePath: string): TemplateError {
    const errorMessage = error.message.toLowerCase();
    const fileName = filePath.split(/[/\\]/).pop() || filePath;

    // Missing helper detection
    if (errorMessage.includes("missing helper")) {
      const helperMatch = error.message.match(
        /missing helper[:\s]+"?([^"]+)"?/i
      );
      const missingHelper = helperMatch?.[1] || "unknown";

      return {
        type: "missing_helper",
        message: `Missing Handlebars helper: "${missingHelper}"`,
        file: fileName,
        suggestion: this.suggestHelperFix(missingHelper),
        severity: "error",
      };
    }

    // Options.inverse error (common with inline vs block helper usage)
    if (errorMessage.includes("options.inverse is not a function")) {
      return {
        type: "syntax_error",
        message:
          "Helper used incorrectly - likely inline vs block helper mismatch",
        file: fileName,
        suggestion:
          "Check if helper is being used as inline ({{helper arg}}) vs block ({{#helper}}...{{/helper}})",
        severity: "error",
      };
    }

    // JSX syntax conflicts
    if (
      errorMessage.includes("expecting 'id', 'string'") &&
      fileName.includes(".tsx")
    ) {
      return {
        type: "jsx_conflict",
        message:
          "JSX syntax conflicts with Handlebars - double curly braces need escaping",
        file: fileName,
        suggestion:
          "Use \\{{}} or {\\{}} to escape JSX object syntax in React templates",
        severity: "error",
      };
    }

    // Parse error with line information
    const lineMatch = error.message.match(/line (\d+)/i);
    const line = lineMatch ? parseInt(lineMatch[1]) : undefined;

    return {
      type: "unknown",
      message: error.message,
      file: fileName,
      line,
      suggestion:
        "Check template syntax and ensure all helpers are properly registered",
      severity: "error",
    };
  }

  /**
   * Suggest fixes for missing helpers
   */
  private suggestHelperFix(missingHelper: string): string {
    const suggestions: Record<string, string> = {
      switch: 'Use {{#if_database "type"}} instead of {{#switch database}}',
      case: 'Use individual database checks like {{#if_database "mongodb"}}',
      kebabCase:
        "Helper added - use project_name_kebab or kebab_case for existing helpers",
      pascalCase:
        "Helper added - use project_name_pascal or pascal_case for existing helpers",
      camelCase: "Use camel_case helper instead",
      snakeCase: "Use snake_case helper instead",
    };

    if (suggestions[missingHelper]) {
      return suggestions[missingHelper];
    }

    // Check for similar helpers
    const similar = this.findSimilarHelpers(missingHelper);
    if (similar.length > 0) {
      return `Did you mean: ${similar.join(", ")}?`;
    }

    return `Add helper to src/template/helpers.ts or use existing alternatives`;
  }

  /**
   * Find similar helper names
   */
  private findSimilarHelpers(target: string): string[] {
    const helpers = Array.from(this.knownHelpers);
    return helpers
      .filter((helper) => {
        const similarity = this.calculateSimilarity(
          target.toLowerCase(),
          helper.toLowerCase()
        );
        return similarity > 0.6;
      })
      .slice(0, 3);
  }

  /**
   * Calculate string similarity (Levenshtein distance)
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1)
      .fill(null)
      .map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }

    const maxLength = Math.max(str1.length, str2.length);
    return maxLength === 0
      ? 1
      : (maxLength - matrix[str2.length][str1.length]) / maxLength;
  }

  /**
   * Safe template processing with comprehensive error handling
   */
  public async safeProcessTemplate(
    templateContent: string,
    context: any,
    filePath: string,
    handlebarsInstance: any
  ): Promise<TemplateProcessingResult> {
    const result: TemplateProcessingResult = {
      success: false,
      errors: [],
      warnings: [],
    };

    try {
      // Pre-process template for common issues
      const preprocessedContent = this.preprocessTemplate(
        templateContent,
        filePath
      );

      // Check for potential issues before compilation
      const preflightIssues = this.preflightCheck(
        preprocessedContent,
        filePath
      );
      result.warnings.push(
        ...preflightIssues.filter((issue) => issue.severity === "warning")
      );
      result.errors.push(
        ...preflightIssues.filter((issue) => issue.severity === "error")
      );

      // If we have critical errors, don't attempt compilation
      if (result.errors.length > 0) {
        return result;
      }

      // Attempt compilation
      const compiledTemplate = handlebarsInstance.compile(preprocessedContent);

      // Attempt execution
      const output = compiledTemplate(context);

      result.success = true;
      result.content = output;
    } catch (error) {
      const templateError = this.parseHandlebarsError(error as Error, filePath);
      result.errors.push(templateError);
    }

    return result;
  }

  /**
   * Preprocess template content to handle common issues
   */
  private preprocessTemplate(content: string, filePath: string): string {
    let processed = content;

    // Handle JSX syntax in TypeScript/JavaScript files
    if (filePath.match(/\.(tsx?|jsx?)\.hbs$/)) {
      // Escape JSX object syntax that conflicts with Handlebars
      processed = processed.replace(/(\s+)(\w+)=\{\{/g, "$1$2={\\{{");
    }

    return processed;
  }

  /**
   * Preflight checks for common template issues
   */
  public preflightCheck(content: string, filePath: string): TemplateError[] {
    const issues: TemplateError[] = [];
    const fileName = filePath.split(/[/\\]/).pop() || filePath;
    const lines = content.split("\n");

    lines.forEach((line, index) => {
      const lineNumber = index + 1;

      // Check for unknown helpers
      const helperMatches = line.match(/\{\{#?(\w+)/g);
      if (helperMatches) {
        helperMatches.forEach((match) => {
          const helper = match.replace(/\{\{#?/, "");
          if (!this.knownHelpers.has(helper) && !this.isBuiltinHelper(helper)) {
            issues.push({
              type: "missing_helper",
              message: `Unknown helper "${helper}" found`,
              file: fileName,
              line: lineNumber,
              suggestion: this.suggestHelperFix(helper),
              severity: "warning",
            });
          }
        });
      }

      // Check for JSX conflicts in React files
      if (fileName.includes(".tsx") && line.includes("={{")) {
        const jsxMatches = line.match(/\w+=\{\{/g);
        if (jsxMatches) {
          issues.push({
            type: "jsx_conflict",
            message: "Potential JSX syntax conflict detected",
            file: fileName,
            line: lineNumber,
            suggestion:
              "Consider escaping JSX object syntax: prop={\\{{ value }}}",
            severity: "warning",
          });
        }
      }

      // Check for deprecated patterns
      if (line.includes("{{#switch") || line.includes("{{#case")) {
        issues.push({
          type: "syntax_error",
          message: "Switch/case helpers are not implemented",
          file: fileName,
          line: lineNumber,
          suggestion: 'Use {{#if_database "type"}} pattern instead',
          severity: "error",
        });
      }
    });

    return issues;
  }

  /**
   * Check if helper is a Handlebars builtin
   */
  private isBuiltinHelper(helper: string): boolean {
    const builtins = new Set([
      "if",
      "unless",
      "each",
      "with",
      "lookup",
      "log",
      "blockHelperMissing",
      "helperMissing",
    ]);
    return builtins.has(helper);
  }

  /**
   * Format error report for display
   */
  public formatErrorReport(errors: TemplateError[]): string {
    if (errors.length === 0) return "";

    const report = ["", "🔍 Template Processing Issues:", ""];

    errors.forEach((error, index) => {
      const icon = error.severity === "error" ? "❌" : "⚠️";
      const location = error.line ? `:${error.line}` : "";

      report.push(`${icon} ${error.file}${location}`);
      report.push(`   ${error.message}`);

      if (error.suggestion) {
        report.push(`   💡 Suggestion: ${error.suggestion}`);
      }

      if (index < errors.length - 1) report.push("");
    });

    return report.join("\n");
  }

  /**
   * Get list of available helpers for debugging
   */
  public getAvailableHelpers(): string[] {
    return Array.from(this.knownHelpers).sort();
  }
}
