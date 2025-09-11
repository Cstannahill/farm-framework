// packages/cli/src/template/error-handler.ts
/**
 * Comprehensive error handling system for template processing
 * Provides helpful feedback and safety rails for template contributors
 */

import { logger } from "../utils/logger.js";
import { logHandlebarsError, logTemplateProcessingError, ErrorCategory } from "../utils/error-logger.js";
import {
  getAllHelpers,
  getAllVariables,
  isValidHelper,
  isValidVariable,
  getHelperSuggestions,
  getVariableSuggestions,
  generateErrorMessage,
  HELPER_ALIASES
} from "./template-specification.js";

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
    // Use the authoritative helper list from template specification
    this.knownHelpers = new Set(getAllHelpers());
    // Also include any additional registered helpers
    registeredHelpers.forEach(helper => this.knownHelpers.add(helper));
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

      // Log the missing helper error
      logHandlebarsError(`Missing helper: ${missingHelper}`, {
        filePath: filePath,
        operation: 'missing_helper_detection',
        missingHelper: missingHelper,
        errorMessage: error.message,
        suggestion: this.suggestHelperFix(missingHelper)
      });

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
      // Log the syntax error
      logHandlebarsError("Helper used incorrectly - inline vs block helper mismatch", {
        filePath: filePath,
        operation: 'syntax_error_detection',
        errorType: 'options_inverse_error',
        errorMessage: error.message,
        suggestion: "Check if helper is being used as inline ({{helper arg}}) vs block ({{#helper}}...{{/helper}})"
      });

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
      // Log the JSX conflict error
      logHandlebarsError("JSX syntax conflicts with Handlebars", {
        filePath: filePath,
        operation: 'jsx_conflict_detection',
        errorType: 'jsx_syntax_conflict',
        errorMessage: error.message,
        suggestion: "Use \\{{}} or {\\{}} to escape JSX object syntax in React templates"
      });

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

    // Log unknown Handlebars errors
    logHandlebarsError(`Unknown Handlebars error: ${error.message}`, {
      filePath: filePath,
      operation: 'unknown_error_detection',
      errorType: 'unknown_handlebars_error',
      errorMessage: error.message,
      line: line,
      suggestion: "Check template syntax and ensure all helpers are properly registered"
    });

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
   * Suggest fixes for missing helpers using the template specification
   */
  private suggestHelperFix(missingHelper: string): string {
    // Check if it's a known alias
    if (missingHelper in HELPER_ALIASES) {
      const alias = HELPER_ALIASES[missingHelper as keyof typeof HELPER_ALIASES];
      return `Use ${alias} instead of ${missingHelper}`;
    }

    // Get suggestions from the template specification
    const suggestions = getHelperSuggestions(missingHelper);
    if (suggestions.length > 0) {
      return `Did you mean: ${suggestions.join(", ")}?`;
    }

    return `Add helper to src/template/helpers.ts or use existing alternatives`;
  }

  /**
   * Find similar helper names using the template specification
   */
  private findSimilarHelpers(target: string): string[] {
    return getHelperSuggestions(target);
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

      // Log the template processing failure
      logTemplateProcessingError(`Template processing failed: ${templateError.message}`, {
        filePath: filePath,
        operation: 'safe_process_template',
        errorType: templateError.type,
        templateError: templateError,
        originalError: error instanceof Error ? error.message : String(error)
      });
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
            const issue = {
              type: "missing_helper" as const,
              message: `Unknown helper "${helper}" found`,
              file: fileName,
              line: lineNumber,
              suggestion: this.suggestHelperFix(helper),
              severity: "warning" as const,
            };

            // Log the unknown helper warning
            logHandlebarsError(`Unknown helper "${helper}" found in preflight check`, {
              filePath: filePath,
              operation: 'preflight_check',
              errorType: 'unknown_helper_warning',
              helper: helper,
              line: lineNumber,
              suggestion: this.suggestHelperFix(helper)
            });

            issues.push(issue);
          }
        });
      }

      // Check for JSX conflicts in React files
      if (fileName.includes(".tsx") && line.includes("={{")) {
        const jsxMatches = line.match(/\w+=\{\{/g);
        if (jsxMatches) {
          const issue = {
            type: "jsx_conflict" as const,
            message: "Potential JSX syntax conflict detected",
            file: fileName,
            line: lineNumber,
            suggestion:
              "Consider escaping JSX object syntax: prop={\\{{ value }}}",
            severity: "warning" as const,
          };

          // Log the JSX conflict warning
          logHandlebarsError("Potential JSX syntax conflict detected in preflight check", {
            filePath: filePath,
            operation: 'preflight_check',
            errorType: 'jsx_conflict_warning',
            line: lineNumber,
            suggestion: "Consider escaping JSX object syntax: prop={\\{{ value }}}"
          });

          issues.push(issue);
        }
      }

      // Check for deprecated patterns (switch/case helpers are now implemented)
      // Removed the hardcoded check that was preventing switch/case from working
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
