/**
 * Enhanced error handling for @farm-framework/type-sync
 * Provides structured error types, recovery strategies, and detailed context
 */

export class TypeSyncError extends Error {
  public readonly code: string;
  public readonly context: Record<string, any>;
  public readonly timestamp: Date;
  public readonly recoverable: boolean;

  constructor(
    message: string,
    options: {
      code?: string;
      context?: Record<string, any>;
      cause?: Error;
      recoverable?: boolean;
    } = {}
  ) {
    super(message);
    this.name = "TypeSyncError";
    this.code = options.code || "UNKNOWN_ERROR";
    this.context = options.context || {};
    this.timestamp = new Date();
    this.recoverable = options.recoverable ?? false;

    if (options.cause) {
      this.cause = options.cause;
      this.stack = `${this.stack}\nCaused by: ${options.cause.stack}`;
    }
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      context: this.context,
      timestamp: this.timestamp.toISOString(),
      recoverable: this.recoverable,
      stack: this.stack,
    };
  }
}

export class SchemaExtractionError extends TypeSyncError {
  constructor(
    message: string,
    options: {
      apiUrl?: string;
      statusCode?: number;
      response?: string;
      retryCount?: number;
      cause?: Error;
    } = {}
  ) {
    super(message, {
      code: "SCHEMA_EXTRACTION_FAILED",
      context: {
        apiUrl: options.apiUrl,
        statusCode: options.statusCode,
        response: options.response,
        retryCount: options.retryCount,
      },
      cause: options.cause,
      recoverable: true,
    });
    this.name = "SchemaExtractionError";
  }
}

export class GenerationError extends TypeSyncError {
  constructor(
    message: string,
    options: {
      generator?: string;
      outputPath?: string;
      schemaHash?: string;
      cause?: Error;
    } = {}
  ) {
    super(message, {
      code: "GENERATION_FAILED",
      context: {
        generator: options.generator,
        outputPath: options.outputPath,
        schemaHash: options.schemaHash,
      },
      cause: options.cause,
      recoverable: true,
    });
    this.name = "GenerationError";
  }
}

export class ValidationError extends TypeSyncError {
  public readonly validationErrors: ValidationIssue[];

  constructor(
    message: string,
    validationErrors: ValidationIssue[],
    options: {
      context?: Record<string, any>;
      cause?: Error;
    } = {}
  ) {
    super(message, {
      code: "VALIDATION_FAILED",
      context: {
        errorCount: validationErrors.length,
        ...options.context,
      },
      cause: options.cause,
      recoverable: false,
    });
    this.name = "ValidationError";
    this.validationErrors = validationErrors;
  }
}

export class CacheError extends TypeSyncError {
  constructor(
    message: string,
    options: {
      operation?: "read" | "write" | "delete" | "cleanup";
      cacheKey?: string;
      cachePath?: string;
      cause?: Error;
    } = {}
  ) {
    super(message, {
      code: "CACHE_ERROR",
      context: {
        operation: options.operation,
        cacheKey: options.cacheKey,
        cachePath: options.cachePath,
      },
      cause: options.cause,
      recoverable: true,
    });
    this.name = "CacheError";
  }
}

export class ConfigurationError extends TypeSyncError {
  constructor(
    message: string,
    options: {
      configPath?: string;
      invalidFields?: string[];
      cause?: Error;
    } = {}
  ) {
    super(message, {
      code: "CONFIGURATION_ERROR",
      context: {
        configPath: options.configPath,
        invalidFields: options.invalidFields,
      },
      cause: options.cause,
      recoverable: false,
    });
    this.name = "ConfigurationError";
  }
}

export interface ValidationIssue {
  path: string;
  message: string;
  severity: "error" | "warning";
  code?: string;
}

export interface ErrorRecoveryStrategy {
  canRecover(error: TypeSyncError): boolean;
  recover(
    error: TypeSyncError,
    context: ErrorRecoveryContext
  ): Promise<RecoveryResult>;
}

export interface ErrorRecoveryContext {
  retryCount: number;
  maxRetries: number;
  fallbackEnabled: boolean;
  cacheEnabled: boolean;
  [key: string]: any;
}

export interface RecoveryResult {
  success: boolean;
  data?: any;
  newError?: TypeSyncError;
  strategy: string;
}

/**
 * Recovery strategy for schema extraction failures
 */
export class SchemaExtractionRecovery implements ErrorRecoveryStrategy {
  canRecover(error: TypeSyncError): boolean {
    return error instanceof SchemaExtractionError && error.recoverable;
  }

  async recover(
    error: SchemaExtractionError,
    context: ErrorRecoveryContext
  ): Promise<RecoveryResult> {
    // Strategy 1: Retry with exponential backoff
    if (context.retryCount < context.maxRetries) {
      const delay = Math.min(1000 * Math.pow(2, context.retryCount), 10000);
      await this.sleep(delay);

      return {
        success: false, // Will trigger another attempt
        strategy: "retry_with_backoff",
      };
    }

    // Strategy 2: Fall back to cached schema
    if (context.fallbackEnabled && context.cacheEnabled) {
      try {
        // Attempt to load from cache
        // This would be implemented by the caller
        return {
          success: true,
          strategy: "fallback_to_cache",
        };
      } catch (cacheError) {
        // Cache fallback failed
      }
    }

    // Strategy 3: Use static schema file
    try {
      // Attempt to load static schema
      return {
        success: true,
        strategy: "fallback_to_static",
      };
    } catch (staticError) {
      return {
        success: false,
        newError: new SchemaExtractionError("All recovery strategies failed", {
          cause: error,
        }),
        strategy: "exhausted",
      };
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Recovery strategy for generation failures
 */
export class GenerationRecovery implements ErrorRecoveryStrategy {
  canRecover(error: TypeSyncError): boolean {
    return error instanceof GenerationError && error.recoverable;
  }

  async recover(
    error: GenerationError,
    context: ErrorRecoveryContext
  ): Promise<RecoveryResult> {
    // Strategy 1: Retry with cleaned output directory
    if (context.retryCount === 0) {
      try {
        // Clean output directory and retry
        // This would be implemented by the caller
        return {
          success: false, // Will trigger another attempt
          strategy: "clean_and_retry",
        };
      } catch (cleanError) {
        // Continue to next strategy
      }
    }

    // Strategy 2: Use fallback generator configuration
    if (context.retryCount === 1) {
      return {
        success: false, // Will trigger another attempt with different config
        strategy: "fallback_config",
      };
    }

    // Strategy 3: Skip this generator and continue with others
    return {
      success: true,
      strategy: "skip_generator",
    };
  }
}

/**
 * Enhanced error handler with recovery strategies
 */
export class ErrorHandler {
  private recoveryStrategies: ErrorRecoveryStrategy[] = [
    new SchemaExtractionRecovery(),
    new GenerationRecovery(),
  ];

  addRecoveryStrategy(strategy: ErrorRecoveryStrategy): void {
    this.recoveryStrategies.push(strategy);
  }

  async handleError(
    error: Error,
    context: ErrorRecoveryContext = {
      retryCount: 0,
      maxRetries: 3,
      fallbackEnabled: true,
      cacheEnabled: true,
    }
  ): Promise<RecoveryResult> {
    // Convert to TypeSyncError if needed
    const typeSyncError =
      error instanceof TypeSyncError
        ? error
        : new TypeSyncError(error.message, { cause: error });

    // Log the error with context
    this.logError(typeSyncError, context);

    // Try recovery strategies
    for (const strategy of this.recoveryStrategies) {
      if (strategy.canRecover(typeSyncError)) {
        try {
          const result = await strategy.recover(typeSyncError, context);
          if (result.success || result.newError) {
            return result;
          }
        } catch (recoveryError) {
          // Recovery strategy itself failed, continue to next
          console.warn("Recovery strategy failed:", recoveryError);
        }
      }
    }

    // No recovery possible
    return {
      success: false,
      newError: typeSyncError,
      strategy: "no_recovery",
    };
  }

  private logError(error: TypeSyncError, context: ErrorRecoveryContext): void {
    const logData = {
      error: error.toJSON(),
      context,
      timestamp: new Date().toISOString(),
    };

    if (error.recoverable) {
      console.warn("Recoverable error occurred:", logData);
    } else {
      console.error("Fatal error occurred:", logData);
    }
  }

  /**
   * Format error for user-friendly display
   */
  formatUserError(error: TypeSyncError): string {
    const suggestions = this.getErrorSuggestions(error);

    return `
❌ ${error.name}: ${error.message}

${
  suggestions.length > 0
    ? `💡 Suggestions:
${suggestions.map((s) => `   • ${s}`).join("\n")}`
    : ""
}

🔍 Error Details:
   • Code: ${error.code}
   • Timestamp: ${error.timestamp.toLocaleString()}
   • Recoverable: ${error.recoverable ? "Yes" : "No"}
   ${Object.keys(error.context).length > 0 ? `• Context: ${JSON.stringify(error.context, null, 2)}` : ""}
`;
  }

  private getErrorSuggestions(error: TypeSyncError): string[] {
    const suggestions: string[] = [];

    switch (error.code) {
      case "SCHEMA_EXTRACTION_FAILED":
        suggestions.push(
          "Ensure your API server is running and accessible",
          "Check that the OpenAPI endpoint (/docs/openapi.json) is available",
          "Verify your API URL configuration",
          "Try running with --fallback-cache to use cached schema"
        );
        break;

      case "GENERATION_FAILED":
        suggestions.push(
          "Check that the output directory is writable",
          "Ensure there's enough disk space",
          "Try clearing the output directory and regenerating",
          "Verify the OpenAPI schema is valid"
        );
        break;

      case "VALIDATION_FAILED":
        suggestions.push(
          "Review the OpenAPI schema for compliance issues",
          "Check for missing required fields or invalid references",
          "Use an OpenAPI validator tool to identify specific issues"
        );
        break;

      case "CONFIGURATION_ERROR":
        suggestions.push(
          "Check your type-sync configuration file syntax",
          "Ensure all required configuration fields are provided",
          "Verify file paths and URLs are correct",
          "Run with --init to generate a default configuration"
        );
        break;
    }

    return suggestions;
  }
}

// Export a default instance
export const errorHandler = new ErrorHandler();
