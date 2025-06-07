/**
 * Plugin System Types
 */

export interface PluginDefinition {
  name: string;
  version: string;
  description: string;
  author: string;
  license: string;
  farmVersion: string;
  configSchema?: PluginConfigSchema;
  defaultConfig?: Record<string, any>;
}

export interface PluginConfigSchema {
  type: "object";
  properties: Record<string, ConfigPropertySchema>;
  required?: string[];
  additionalProperties?: boolean;
}

export interface ConfigPropertySchema {
  type: "string" | "number" | "boolean" | "array" | "object";
  description?: string;
  default?: any;
  enum?: any[];
  format?: string;
  items?: ConfigPropertySchema;
  properties?: Record<string, ConfigPropertySchema>;
}

export interface PluginContext {
  config: any;
  pluginConfig: Record<string, any>;
  farmVersion: string;
  environment: "development" | "staging" | "production";
  logger: Logger;
  services: ServiceRegistry;
}

export interface Logger {
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
  debug(message: string, ...args: any[]): void;
}

export interface ServiceRegistry {
  get(name: string): any;
  register(name: string, service: any): void;
  unregister(name: string): void;
}

export interface PluginHooks {
  onInstall?: (context: PluginContext) => Promise<void>;
  onActivate?: (context: PluginContext) => Promise<void>;
  onDeactivate?: (context: PluginContext) => Promise<void>;
  onUninstall?: (context: PluginContext) => Promise<void>;
}

export interface PluginDependency {
  name: string;
  version: string;
  optional?: boolean;
  reason?: string;
}
