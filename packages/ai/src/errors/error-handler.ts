// packages/ai/src/errors/error-handler.ts
import { EventEmitter } from "events";

// Error classification and types
export enum ErrorCategory {
  NETWORK = "network",
  AUTHENTICATION = "authentication",
  AUTHORIZATION = "authorization",
  RATE_LIMIT = "rate_limit",
  MODEL = "model",
  VALIDATION = "validation",
  TIMEOUT = "timeout",
  CONFIGURATION = "configuration",
  PROVIDER = "provider",
  SYSTEM = "system",
  UNKNOWN = "unknown",
}

export enum ErrorSeverity {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical",
}

export interface ErrorContext {
  provider?: string;
  model?: string;
  operation?: string;
  requestId?: string;
  userId?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface ErrorDetails {
  category: ErrorCategory;
  severity: ErrorSeverity;
  retryable: boolean;
  userMessage: string;
  technicalMessage: string;
  context: ErrorContext;
  suggestions?: string[];
  debugInfo?: Record<string, any>;
}

// Base AI Error class
export class AIError extends Error {
  public readonly category: ErrorCategory;
  public readonly severity: ErrorSeverity;
  public readonly retryable: boolean;
  public readonly userMessage: string;
  public readonly technicalMessage: string;
  public readonly context: ErrorContext;
  public readonly suggestions: string[];
  public readonly debugInfo: Record<string, any>;
  public readonly originalError?: Error;

  constructor(details: ErrorDetails, originalError?: Error) {
    super(details.technicalMessage);
    this.name = "AIError";
    this.category = details.category;
    this.severity = details.severity;
    this.retryable = details.retryable;
    this.userMessage = details.userMessage;
    this.technicalMessage = details.technicalMessage;
    this.context = details.context;
    this.suggestions = details.suggestions || [];
    this.debugInfo = details.debugInfo || {};
    this.originalError = originalError;

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AIError);
    }
  }

  public toJSON(): Record<string, any> {
    return {
      name: this.name,
      message: this.message,
      category: this.category,
      severity: this.severity,
      retryable: this.retryable,
      userMessage: this.userMessage,
      technicalMessage: this.technicalMessage,
      context: this.context,
      suggestions: this.suggestions,
      debugInfo: this.debugInfo,
      stack: this.stack,
    };
  }
}

// Specific error types
export class NetworkError extends AIError {
  constructor(message: string, context: ErrorContext, originalError?: Error) {
    super(
      {
        category: ErrorCategory.NETWORK,
        severity: ErrorSeverity.MEDIUM,
        retryable: true,
        userMessage:
          "Network connection issue. Please check your internet connection and try again.",
        technicalMessage: message,
        context,
        suggestions: [
          "Check your internet connection",
          "Verify the provider endpoint is accessible",
          "Try again in a few moments",
        ],
      },
      originalError
    );
    this.name = "NetworkError";
  }
}

export class AuthenticationError extends AIError {
  constructor(message: string, context: ErrorContext, originalError?: Error) {
    super(
      {
        category: ErrorCategory.AUTHENTICATION,
        severity: ErrorSeverity.HIGH,
        retryable: false,
        userMessage:
          "Authentication failed. Please check your API credentials.",
        technicalMessage: message,
        context,
        suggestions: [
          "Verify your API key is correct",
          "Check if your API key has expired",
          "Ensure the API key has proper permissions",
        ],
      },
      originalError
    );
    this.name = "AuthenticationError";
  }
}

export class RateLimitError extends AIError {
  constructor(
    message: string,
    context: ErrorContext,
    retryAfter?: number,
    originalError?: Error
  ) {
    super(
      {
        category: ErrorCategory.RATE_LIMIT,
        severity: ErrorSeverity.MEDIUM,
        retryable: true,
        userMessage: "Rate limit exceeded. Please try again later.",
        technicalMessage: message,
        context,
        suggestions: [
          "Wait before making another request",
          "Consider implementing request throttling",
          "Check your rate limit settings",
        ],
        debugInfo: { retryAfter },
      },
      originalError
    );
    this.name = "RateLimitError";
  }
}

export class ModelError extends AIError {
  constructor(message: string, context: ErrorContext, originalError?: Error) {
    super(
      {
        category: ErrorCategory.MODEL,
        severity: ErrorSeverity.HIGH,
        retryable: false,
        userMessage:
          "The AI model encountered an error. Please try a different model or contact support.",
        technicalMessage: message,
        context,
        suggestions: [
          "Try a different model",
          "Check if the model is available",
          "Verify model compatibility with your request",
        ],
      },
      originalError
    );
    this.name = "ModelError";
  }
}

export class ValidationError extends AIError {
  constructor(
    message: string,
    context: ErrorContext,
    validationErrors?: Record<string, string[]>
  ) {
    super({
      category: ErrorCategory.VALIDATION,
      severity: ErrorSeverity.MEDIUM,
      retryable: false,
      userMessage:
        "Invalid request parameters. Please check your input and try again.",
      technicalMessage: message,
      context,
      suggestions: [
        "Check your request parameters",
        "Ensure all required fields are provided",
        "Verify parameter types and formats",
      ],
      debugInfo: { validationErrors },
    });
    this.name = "ValidationError";
  }
}

export class TimeoutError extends AIError {
  constructor(
    message: string,
    context: ErrorContext,
    timeout?: number,
    originalError?: Error
  ) {
    super(
      {
        category: ErrorCategory.TIMEOUT,
        severity: ErrorSeverity.MEDIUM,
        retryable: true,
        userMessage: "Request timed out. Please try again.",
        technicalMessage: message,
        context,
        suggestions: [
          "Try again with a longer timeout",
          "Reduce the complexity of your request",
          "Check network connectivity",
        ],
        debugInfo: { timeout },
      },
      originalError
    );
    this.name = "TimeoutError";
  }
}

export class ConfigurationError extends AIError {
  constructor(message: string, context: ErrorContext, configPath?: string) {
    super({
      category: ErrorCategory.CONFIGURATION,
      severity: ErrorSeverity.HIGH,
      retryable: false,
      userMessage: "Configuration error. Please check your settings.",
      technicalMessage: message,
      context,
      suggestions: [
        "Check your configuration file",
        "Verify all required settings are provided",
        "Ensure configuration values are valid",
      ],
      debugInfo: { configPath },
    });
    this.name = "ConfigurationError";
  }
}

export class ProviderUnavailableError extends AIError {
  constructor(message: string, context: ErrorContext, originalError?: Error) {
    super(
      {
        category: ErrorCategory.PROVIDER,
        severity: ErrorSeverity.HIGH,
        retryable: true,
        userMessage:
          "AI provider is currently unavailable. Please try again later.",
        technicalMessage: message,
        context,
        suggestions: [
          "Try again in a few minutes",
          "Check provider status",
          "Use a different provider if available",
        ],
      },
      originalError
    );
    this.name = "ProviderUnavailableError";
  }
}

// Error handler interface
export interface ErrorHandlerOptions {
  enableLogging?: boolean;
  enableMetrics?: boolean;
  enableRecovery?: boolean;
  logLevel?: "debug" | "info" | "warn" | "error";
  maxRetries?: number;
  retryDelay?: number;
  retryBackoffFactor?: number;
}

// Error metrics
export interface ErrorMetrics {
  totalErrors: number;
  errorsByCategory: Record<ErrorCategory, number>;
  errorsBySeverity: Record<ErrorSeverity, number>;
  errorsByProvider: Record<string, number>;
  retryableErrors: number;
  nonRetryableErrors: number;
  lastError?: Date;
  errorRate: number; // errors per hour
}

// Error handler class
export class AIErrorHandler extends EventEmitter {
  private options: Required<ErrorHandlerOptions>;
  private metrics: ErrorMetrics;
  private errorHistory: AIError[] = [];
  private retryAttempts: Map<string, number> = new Map();

  constructor(options: ErrorHandlerOptions = {}) {
    super();
    this.options = {
      enableLogging: true,
      enableMetrics: true,
      enableRecovery: true,
      logLevel: "error",
      maxRetries: 3,
      retryDelay: 1000,
      retryBackoffFactor: 2,
      ...options,
    };

    this.metrics = this.initializeMetrics();
  }

  // Main error handling method
  public handleError(
    error: Error | AIError,
    context: Partial<ErrorContext> = {}
  ): AIError {
    const aiError = this.normalizeError(error, context);

    // Update metrics
    if (this.options.enableMetrics) {
      this.updateMetrics(aiError);
    }

    // Log error
    if (this.options.enableLogging) {
      this.logError(aiError);
    }

    // Store in history
    this.addToHistory(aiError);

    // Emit event
    this.emit("error", aiError);

    return aiError;
  }

  // Error classification
  public classifyError(
    error: Error,
    context: Partial<ErrorContext> = {}
  ): AIError {
    const normalizedContext: ErrorContext = {
      timestamp: new Date(),
      ...context,
    };

    // Network errors
    if (this.isNetworkError(error)) {
      return new NetworkError(error.message, normalizedContext, error);
    }

    // Authentication errors
    if (this.isAuthenticationError(error)) {
      return new AuthenticationError(error.message, normalizedContext, error);
    }

    // Rate limit errors
    if (this.isRateLimitError(error)) {
      const retryAfter = this.extractRetryAfter(error);
      return new RateLimitError(
        error.message,
        normalizedContext,
        retryAfter,
        error
      );
    }

    // Timeout errors
    if (this.isTimeoutError(error)) {
      return new TimeoutError(
        error.message,
        normalizedContext,
        undefined,
        error
      );
    }

    // Model errors
    if (this.isModelError(error)) {
      return new ModelError(error.message, normalizedContext, error);
    }

    // Validation errors
    if (this.isValidationError(error)) {
      return new ValidationError(error.message, normalizedContext);
    }

    // Generic AI error
    return new AIError(
      {
        category: ErrorCategory.UNKNOWN,
        severity: ErrorSeverity.MEDIUM,
        retryable: false,
        userMessage: "An unexpected error occurred. Please try again.",
        technicalMessage: error.message,
        context: normalizedContext,
      },
      error
    );
  }

  // Retry logic
  public async executeWithRetry<T>(
    operation: () => Promise<T>,
    context: Partial<ErrorContext> = {},
    customRetryOptions?: {
      maxRetries?: number;
      retryDelay?: number;
      backoffFactor?: number;
    }
  ): Promise<T> {
    const options = { ...this.options, ...customRetryOptions };
    const operationId = this.generateOperationId(context);
    let lastError: AIError;

    for (let attempt = 0; attempt <= options.maxRetries; attempt++) {
      try {
        const result = await operation();

        // Reset retry count on success
        this.retryAttempts.delete(operationId);

        if (attempt > 0) {
          this.emit("retry-success", { operationId, attempt, context });
        }

        return result;
      } catch (error) {
        lastError = this.handleError(
          error instanceof Error ? error : new Error(String(error)),
          {
            ...context,
            operation: operationId,
          }
        );

        // Don't retry if error is not retryable or we've reached max attempts
        if (!lastError.retryable || attempt === options.maxRetries) {
          this.retryAttempts.delete(operationId);
          throw lastError;
        }

        // Calculate delay with exponential backoff
        const delay =
          (options.retryDelay ?? 1000) *
          Math.pow(options.backoffFactor ?? 2, attempt);

        this.emit("retry-attempt", {
          operationId,
          attempt: attempt + 1,
          maxRetries: options.maxRetries,
          delay,
          error: lastError,
          context,
        });

        // Wait before retrying
        await this.delay(delay);
      }
    }

    throw lastError!;
  }

  // Recovery mechanisms
  public suggestRecovery(error: AIError): string[] {
    const suggestions = [...error.suggestions];

    // Category-specific recovery suggestions
    switch (error.category) {
      case ErrorCategory.NETWORK:
        suggestions.push(
          "Check your internet connection",
          "Verify firewall settings",
          "Try using a different network"
        );
        break;

      case ErrorCategory.RATE_LIMIT:
        suggestions.push(
          "Implement exponential backoff",
          "Reduce request frequency",
          "Consider upgrading your plan"
        );
        break;

      case ErrorCategory.MODEL:
        suggestions.push(
          "Switch to a different model",
          "Check model availability",
          "Verify model parameters"
        );
        break;

      case ErrorCategory.AUTHENTICATION:
        suggestions.push(
          "Regenerate API key",
          "Check API key permissions",
          "Verify provider account status"
        );
        break;
    }

    // Provider-specific suggestions
    if (error.context.provider) {
      suggestions.push(
        `Check ${error.context.provider} provider documentation`
      );
    }

    return [...new Set(suggestions)]; // Remove duplicates
  }

  // Metrics and monitoring
  public getMetrics(): ErrorMetrics {
    return { ...this.metrics };
  }

  public getErrorHistory(limit?: number): AIError[] {
    return limit ? this.errorHistory.slice(-limit) : [...this.errorHistory];
  }

  public clearHistory(): void {
    this.errorHistory = [];
    this.metrics = this.initializeMetrics();
  }

  // Private helper methods
  private normalizeError(
    error: Error | AIError,
    context: Partial<ErrorContext>
  ): AIError {
    if (error instanceof AIError) {
      // Update context if provided
      if (Object.keys(context).length > 0) {
        const updatedError = new AIError(
          {
            category: error.category,
            severity: error.severity,
            retryable: error.retryable,
            userMessage: error.userMessage,
            technicalMessage: error.technicalMessage,
            context: { ...error.context, ...context },
            suggestions: error.suggestions,
            debugInfo: error.debugInfo,
          },
          error.originalError
        );
        return updatedError;
      }
      return error;
    }

    return this.classifyError(error, context);
  }

  private updateMetrics(error: AIError): void {
    this.metrics.totalErrors++;
    this.metrics.errorsByCategory[error.category] =
      (this.metrics.errorsByCategory[error.category] || 0) + 1;
    this.metrics.errorsBySeverity[error.severity] =
      (this.metrics.errorsBySeverity[error.severity] || 0) + 1;

    if (error.context.provider) {
      this.metrics.errorsByProvider[error.context.provider] =
        (this.metrics.errorsByProvider[error.context.provider] || 0) + 1;
    }

    if (error.retryable) {
      this.metrics.retryableErrors++;
    } else {
      this.metrics.nonRetryableErrors++;
    }

    this.metrics.lastError = error.context.timestamp;

    // Calculate error rate (errors per hour)
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentErrors = this.errorHistory.filter(
      (e) => e.context.timestamp > hourAgo
    );
    this.metrics.errorRate = recentErrors.length;
  }

  private logError(error: AIError): void {
    const logLevel = this.getLogLevelForSeverity(error.severity);
    if (this.shouldLog(logLevel)) {
      const logData = {
        level: logLevel,
        message: error.technicalMessage,
        category: error.category,
        severity: error.severity,
        provider: error.context.provider,
        model: error.context.model,
        operation: error.context.operation,
        retryable: error.retryable,
        context: error.context,
        stack: error.stack,
      };

      const logMethod =
        console[logLevel as "debug" | "info" | "warn" | "error"];
      if (typeof logMethod === "function") {
        logMethod("[AI Error]", JSON.stringify(logData, null, 2));
      }
    }
  }

  private addToHistory(error: AIError): void {
    this.errorHistory.push(error);

    // Keep only last 1000 errors to prevent memory leaks
    if (this.errorHistory.length > 1000) {
      this.errorHistory = this.errorHistory.slice(-1000);
    }
  }

  private initializeMetrics(): ErrorMetrics {
    return {
      totalErrors: 0,
      errorsByCategory: {} as Record<ErrorCategory, number>,
      errorsBySeverity: {} as Record<ErrorSeverity, number>,
      errorsByProvider: {},
      retryableErrors: 0,
      nonRetryableErrors: 0,
      errorRate: 0,
    };
  }

  private generateOperationId(context: Partial<ErrorContext>): string {
    return `${context.provider || "unknown"}-${
      context.operation || "operation"
    }-${Date.now()}`;
  }

  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private getLogLevelForSeverity(severity: ErrorSeverity): string {
    switch (severity) {
      case ErrorSeverity.LOW:
        return "info";
      case ErrorSeverity.MEDIUM:
        return "warn";
      case ErrorSeverity.HIGH:
      case ErrorSeverity.CRITICAL:
        return "error";
      default:
        return "warn";
    }
  }

  private shouldLog(level: string): boolean {
    const levels = ["debug", "info", "warn", "error"];
    const currentLevelIndex = levels.indexOf(this.options.logLevel);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex >= currentLevelIndex;
  }

  // Error detection methods
  private isNetworkError(error: Error): boolean {
    return (
      /network|connection|timeout|ECONNREFUSED|ENOTFOUND|ETIMEDOUT/i.test(
        error.message
      ) ||
      error.name === "NetworkError" ||
      ("code" in error &&
        ["ECONNREFUSED", "ENOTFOUND", "ETIMEDOUT"].includes(
          error.code as string
        ))
    );
  }

  private isAuthenticationError(error: Error): boolean {
    return (
      /unauthorized|authentication|api.?key|invalid.?credentials|401/i.test(
        error.message
      ) ||
      ("status" in error && error.status === 401)
    );
  }

  private isRateLimitError(error: Error): boolean {
    return (
      /rate.?limit|too.?many.?requests|429/i.test(error.message) ||
      ("status" in error && error.status === 429)
    );
  }

  private isTimeoutError(error: Error): boolean {
    return (
      /timeout|timed.?out/i.test(error.message) || error.name === "TimeoutError"
    );
  }

  private isModelError(error: Error): boolean {
    return /model|invalid.?model|model.?not.?found/i.test(error.message);
  }

  private isValidationError(error: Error): boolean {
    return (
      /validation|invalid|bad.?request|400/i.test(error.message) ||
      ("status" in error && error.status === 400)
    );
  }

  private extractRetryAfter(error: Error): number | undefined {
    if (
      "headers" in error &&
      error.headers &&
      typeof error.headers === "object"
    ) {
      const retryAfter = (error.headers as any)["retry-after"];
      if (retryAfter) {
        const seconds = parseInt(retryAfter, 10);
        return isNaN(seconds) ? undefined : seconds * 1000; // Convert to milliseconds
      }
    }
    return undefined;
  }
}

// Global error handler instance
export const globalErrorHandler = new AIErrorHandler();
