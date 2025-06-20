/**
 * FARM Core Framework
 */

export * from "@farm-framework/types";

// Re-export type-sync types (single source of truth)
export type {
  OpenAPISchema,
  SyncOptions,
  SyncResult,
  TypeScriptGenerationOptions,
  APIClientGeneratorOptions,
  ReactHookGeneratorOptions,
  AIHookGeneratorOptions,
} from "@farm-framework/type-sync";

// Core utilities
/**
 * Helper used by consuming applications to supply typed configuration.
 */
export function defineConfig<T>(config: T): T {
  return config;
}

// Version information
export const VERSION = "0.1.0";

// Framework initialization
/**
 * Initialize the core framework. In a real implementation this would perform
 * startup tasks such as loading configuration or plugins.
 */
export async function initialize() {
  // Core initialization logic will be implemented here
  return {
    version: VERSION,
    ready: true,
  };
}

// Codegen exports
export * from "./codegen";
