/**
 * Error Handling Types
 */

export interface FarmError extends Error {
  code?: string;
  component?: string;
  context?: Record<string, any>;
  timestamp?: number;
}

export interface ErrorContext {
  command?: string;
  options?: Record<string, any>;
  stackTrace?: string;
  environment?: Record<string, any>;
}

export interface ValidationError extends FarmError {
  field?: string;
  value?: any;
  expected?: string;
}

export interface ConfigurationError extends FarmError {
  configPath?: string;
  configKey?: string;
}

export interface TemplateError extends FarmError {
  templateName?: string;
  templatePath?: string;
}

export interface BuildError extends FarmError {
  buildTarget?: string;
  buildPhase?: string;
}

export interface NetworkError extends FarmError {
  url?: string;
  method?: string;
  statusCode?: number;
}

export interface FileSystemError extends FarmError {
  path?: string;
  operation?: "read" | "write" | "delete" | "copy" | "move";
  permissions?: boolean;
}

// AI-specific error types
export enum ErrorCategory {
  CONFIGURATION = "configuration",
  NETWORK = "network",
  AUTHENTICATION = "authentication",
  RATE_LIMIT = "rate_limit",
  MODEL = "model",
  VALIDATION = "validation",
  TIMEOUT = "timeout",
  PROVIDER = "provider",
  UNKNOWN = "unknown",
}

export enum ErrorSeverity {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical",
}

export interface ErrorDetails {
  category: ErrorCategory;
  severity: ErrorSeverity;
  code?: string;
  retryable?: boolean;
  suggestions?: string[];
}

export interface AIError extends FarmError {
  category: ErrorCategory;
  severity: ErrorSeverity;
  provider?: string;
  model?: string;
  retryable?: boolean;
  suggestions?: string[];
}

export interface ProviderError extends AIError {
  provider: string;
  cause?: Error;
}

export interface ModelNotFoundError extends ProviderError {
  model: string;
}

export interface ProviderUnavailableError extends ProviderError {
  cause?: Error;
}

export interface InvalidRequestError extends ProviderError {
  request?: any;
}

export interface RateLimitError extends AIError {
  retryAfter?: number;
  dailyLimit?: number;
  currentUsage?: number;
}

export interface ModelError extends AIError {
  model: string;
  modelVersion?: string;
}

export interface TimeoutError extends AIError {
  timeout: number;
  operation: string;
}

export interface AuthenticationError extends AIError {
  provider: string;
  credential?: string;
}

export interface ErrorHandlerOptions {
  maxRetries?: number;
  retryDelay?: number;
  enableLogging?: boolean;
  onError?: (error: AIError) => void;
}

export interface ErrorMetrics {
  totalErrors: number;
  errorsByCategory: Record<ErrorCategory, number>;
  errorsBySeverity: Record<ErrorSeverity, number>;
  retryAttempts: number;
  successfulRetries: number;
}
