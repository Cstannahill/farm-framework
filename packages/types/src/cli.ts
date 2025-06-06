/**
 * CLI Command Types
 */

export interface CLIOptions {
  verbose?: boolean;
  debug?: boolean;
  config?: string;
  help?: boolean;
  version?: boolean;
}

export interface CreateOptions extends CLIOptions {
  template?: string;
  features?: string[];
  database?: string;
  typescript?: boolean;
  docker?: boolean;
  testing?: boolean;
  git?: boolean;
  install?: boolean;
  interactive?: boolean;
  force?: boolean;
}

export interface DevOptions extends CLIOptions {
  port?: number;
  frontendOnly?: boolean;
  backendOnly?: boolean;
  watch?: boolean;
}

export interface BuildOptions extends CLIOptions {
  target?: string[];
  env?: string;
  dev?: boolean;
  watch?: boolean;
  analyze?: boolean;
  cache?: boolean;
  clearCache?: boolean;
  profile?: boolean;
  sizeLimit?: string;
}

export interface GenerateOptions extends CLIOptions {
  type: "model" | "route" | "page" | "component" | "api";
  name: string;
  fields?: string;
  relations?: string;
  permissions?: string;
}

export interface CommandResult {
  success: boolean;
  message?: string;
  data?: any;
  error?: Error;
}

export interface CLIContext {
  options: CLIOptions;
  projectRoot: string;
  farmConfig?: any;
  logger: Logger;
}

export interface Logger {
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
  debug(message: string, ...args: any[]): void;
  success(message: string, ...args: any[]): void;
}

export interface Spinner {
  start(text?: string): void;
  stop(): void;
  succeed(text?: string): void;
  fail(text?: string): void;
  info(text?: string): void;
  warn(text?: string): void;
}
