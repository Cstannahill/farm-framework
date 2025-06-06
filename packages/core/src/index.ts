/**
 * FARM Core Framework
 */

export * from "@farm/types";

// Core utilities
export function defineConfig<T>(config: T): T {
  return config;
}

// Version information
export const VERSION = "0.1.0";

// Framework initialization
export async function initialize() {
  // Core initialization logic will be implemented here
  return {
    version: VERSION,
    ready: true,
  };
}
