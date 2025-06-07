import chalk from "chalk";
import { logger } from "../utils/logger.js";

export type ErrorCode =
  | "CLI_ERROR"
  | "CONFIG_ERROR"
  | "VALIDATION_ERROR"
  | "FILESYSTEM_ERROR"
  | "NETWORK_ERROR"
  | "COMPATIBILITY_ERROR"
  | "VERSION_ERROR"
  | "TEMPLATE_ERROR"
  | "GENERATION_ERROR"
  | "BUILD_ERROR";

export class FarmError extends Error {
  public readonly code: ErrorCode;
  public readonly context?: Record<string, any>;

  constructor(message: string, code: ErrorCode, context?: Record<string, any>) {
    super(message);
    this.name = "FarmError";
    this.code = code;
    this.context = context;

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, FarmError);
    }
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      context: this.context,
      stack: this.stack,
    };
  }
}

export function handleError(error: unknown): void {
  if (error instanceof FarmError) {
    handleFarmError(error);
  } else if (error instanceof Error) {
    handleGenericError(error);
  } else {
    handleUnknownError(error);
  }
}

function handleFarmError(error: FarmError): void {
  logger.error(`${chalk.red("Error:")} ${error.message}`);

  if (error.context) {
    logger.debug("Error context:", error.context);
  }

  // Provide helpful suggestions based on error code
  switch (error.code) {
    case "CONFIG_ERROR":
      logger.info(
        chalk.yellow("💡 Check your farm.config.ts file for syntax errors")
      );
      break;
    case "COMPATIBILITY_ERROR":
      logger.info(
        chalk.yellow("💡 Consider using a Node.js version manager like nvm")
      );
      break;
    case "FILESYSTEM_ERROR":
      logger.info(
        chalk.yellow("💡 Check file permissions and available disk space")
      );
      break;
    case "TEMPLATE_ERROR":
      logger.info(
        chalk.yellow('💡 Run "farm create --help" to see available templates')
      );
      break;
    case "GENERATION_ERROR":
      logger.info(
        chalk.yellow("💡 Ensure your models and routes are properly defined")
      );
      break;
  }

  if (process.env.FARM_DEBUG === "true") {
    logger.debug("Stack trace:", error.stack);
  }
}

function handleGenericError(error: Error): void {
  logger.error(`${chalk.red("Unexpected Error:")} ${error.message}`);
  logger.debug("Stack trace:", error.stack);
}

function handleUnknownError(error: unknown): void {
  logger.error(`${chalk.red("Unknown Error:")} ${String(error)}`);
}

export function createValidationError(
  message: string,
  field?: string
): FarmError {
  return new FarmError(
    message,
    "VALIDATION_ERROR",
    field ? { field } : undefined
  );
}

export function createConfigError(
  message: string,
  configPath?: string
): FarmError {
  return new FarmError(
    message,
    "CONFIG_ERROR",
    configPath ? { configPath } : undefined
  );
}

export function createFileSystemError(
  message: string,
  path?: string
): FarmError {
  return new FarmError(
    message,
    "FILESYSTEM_ERROR",
    path ? { path } : undefined
  );
}
