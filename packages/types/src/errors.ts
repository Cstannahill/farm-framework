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
