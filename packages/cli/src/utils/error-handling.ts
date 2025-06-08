/**
 * Error handling utilities for FARM CLI
 */

/**
 * @deprecated Moved to `@farm/types` package
 */
export interface ErrorContext {
  command?: string;
  operation?: string;
  details?: Record<string, any>;
  timestamp?: Date;
}

export class FarmError extends Error {
  public readonly code: string;
  public readonly context: ErrorContext;

  constructor(
    message: string,
    code: string = "FARM_ERROR",
    context: ErrorContext = {}
  ) {
    super(message);
    this.name = "FarmError";
    this.code = code;
    this.context = {
      ...context,
      timestamp: new Date(),
    };
  }
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return "An unknown error occurred";
}

export function formatError(error: unknown, context?: ErrorContext): string {
  const message = getErrorMessage(error);

  if (error instanceof FarmError) {
    let formatted = `❌ ${error.message}`;
    if (error.code !== "FARM_ERROR") {
      formatted += ` (${error.code})`;
    }
    if (context?.command) {
      formatted += `\n   Command: ${context.command}`;
    }
    if (context?.operation) {
      formatted += `\n   Operation: ${context.operation}`;
    }
    return formatted;
  }

  return `❌ ${message}`;
}

export function wrapError(
  error: unknown,
  message: string,
  code: string = "FARM_ERROR",
  context: ErrorContext = {}
): FarmError {
  if (error instanceof FarmError) {
    return error;
  }

  const wrappedMessage = `${message}: ${getErrorMessage(error)}`;
  return new FarmError(wrappedMessage, code, context);
}

export function handleCliError(error: unknown, context?: ErrorContext): never {
  const formattedError = formatError(error, context);
  console.error(formattedError);

  // Provide helpful suggestions for common errors
  if (error instanceof Error) {
    const suggestions = getErrorSuggestions(error);
    if (suggestions.length > 0) {
      console.error("\n💡 Suggestions:");
      suggestions.forEach((suggestion) => {
        console.error(`   • ${suggestion}`);
      });
    }
  }

  process.exit(1);
}

export function getErrorSuggestions(error: Error): string[] {
  const suggestions: string[] = [];
  const message = error.message.toLowerCase();

  if (message.includes("enoent") || message.includes("file not found")) {
    suggestions.push("Check if the file path is correct");
    suggestions.push("Ensure you're in the correct directory");
  }

  if (message.includes("permission denied") || message.includes("eacces")) {
    suggestions.push("Check file permissions");
    suggestions.push("Try running with appropriate permissions");
  }

  if (message.includes("port") && message.includes("in use")) {
    suggestions.push("Try a different port with --port option");
    suggestions.push("Stop the process using that port");
  }

  if (message.includes("network") || message.includes("fetch")) {
    suggestions.push("Check your internet connection");
    suggestions.push("Verify the URL is accessible");
  }

  if (message.includes("timeout")) {
    suggestions.push("Try increasing the timeout");
    suggestions.push("Check network connectivity");
  }

  return suggestions;
}

// Legacy alias for backward compatibility
export const handleError = handleCliError;
