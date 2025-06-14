// packages/cli/src/template/types.ts
/**
 * Type definitions for template configuration and context
 *
 * @deprecated These types have been moved to @farm-framework/types
 * This file now re-exports them for backward compatibility
 */

// Import shared types
export type {
  // Core types from shared types (these use different names)
  TemplateType as TemplateName,
  FeatureType as FeatureName,

  // Configuration types
  DatabaseConfig,
  AIConfig,
  DevelopmentConfig,
  BuildConfig,
  DeploymentConfig,
  FarmConfig,
  PluginConfig,

  // Template types
  CLITemplateContext as TemplateContext,
  CreateCommandOptions,
  TemplateFile,
  TemplateDirectory,
  CLITemplateDefinition as TemplateDefinition,

  // Error types
  TemplateProcessingError,
  ConfigurationValidationError,
} from "@farm-framework/types";

// Import utility functions as values
export {
  isTemplateName,
  isFeatureName,
  createTemplateContext,
} from "@farm-framework/types";

// Re-export database types
export type { DatabaseType } from "@farm-framework/types";

// Add environment name type locally since it's not in shared types yet
export type EnvironmentName = "development" | "staging" | "production";

// Re-export some types with legacy names for compatibility
import type {
  DatabaseConfig as SharedDatabaseConfig,
  DatabaseType as SharedDatabaseType,
} from "@farm-framework/types";

/**
 * Type guard to check if a value is a valid database type
 */
export function isDatabaseType(value: any): value is SharedDatabaseType {
  return (
    typeof value === "string" &&
    ["mongodb", "postgresql", "mysql", "sqlite", "sqlserver"].includes(value)
  );
}

/**
 * Normalize database configuration to a consistent format
 */
export function normalizeDatabaseConfig(database: any): SharedDatabaseConfig {
  if (typeof database === "string") {
    return { type: database as SharedDatabaseType, url: "" }; // Provide default url
  }
  if (database && typeof database === "object" && database.type) {
    return database as SharedDatabaseConfig;
  }
  // Default fallback
  return { type: "mongodb", url: "" };
}

/**
 * Extract database type from database config (handles both string and object formats)
 */
export function getDatabaseType(database: any): SharedDatabaseType {
  if (typeof database === "string") {
    return database as SharedDatabaseType;
  }
  if (database && typeof database === "object" && database.type) {
    return database.type as SharedDatabaseType;
  }
  return "mongodb"; // default fallback
}

/**
 * Extract database type as string for templates
 */
export function getDatabaseTypeString(database: any): string {
  return getDatabaseType(database);
}
