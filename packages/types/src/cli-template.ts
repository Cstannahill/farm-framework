/**
 * CLI Template Types
 * CLI-specific template types and configurations
 */
import type { FarmConfig, TemplateType, FeatureType } from "./config.js";
import type {
  TemplateContext,
  TemplateDefinition,
  TemplateDependencies,
} from "./templates.js";

// =============================================================================
// CLI SPECIFIC TEMPLATE TYPES
// =============================================================================

export type TemplateName = TemplateType;
export type FeatureName = FeatureType;
export type EnvironmentName = "development" | "staging" | "production";

/**
 * Options for the `create` command
 */
export interface CreateCommandOptions {
  template?: TemplateName;
  features?: FeatureName[];
  database?: string;
  typescript?: boolean;
  docker?: boolean;
  testing?: boolean;
  git?: boolean;
  install?: boolean;
  interactive?: boolean;
  verbose?: boolean;
  preflight?: boolean;
}

/**
 * Extended template context for CLI template processing
 */
export interface CLITemplateContext
  extends Omit<TemplateContext, "template" | "features"> {
  // The config property allows templates to access the full config
  config?: CLITemplateContext;

  // Extended properties from FarmConfig
  template: TemplateName;
  features: FeatureName[];
  environment?: EnvironmentName;

  // CLI options that might be passed through
  interactive?: boolean;
  verbose?: boolean;

  // Additional properties needed by CLI
  testing?: boolean;
  author?: string;
}

// =============================================================================
// TEMPLATE PROCESSING TYPES
// =============================================================================

export interface TemplateFile {
  src: string;
  dest: string;
  condition?: (context: CLITemplateContext) => boolean;
  sourcePath?: string; // Allow legacy property for compatibility
  targetPath?: string; // Allow legacy property for compatibility
  transform?: boolean;
}

export interface TemplateDirectory {
  src: string;
  dest: string;
  condition?: (context: CLITemplateContext) => boolean;
  sourcePath?: string; // Allow legacy property for compatibility
  targetPath?: string; // Allow legacy property for compatibility
}

/**
 * CLI-specific template definition (independent of base TemplateDefinition)
 */
export interface CLITemplateDefinition {
  name: TemplateName;
  description: string;
  features: FeatureName[];
  files: TemplateFile[];
  directories: TemplateDirectory[];
  dependencies: TemplateDependencies;
  postProcess?: (
    context: CLITemplateContext,
    outputPath: string
  ) => Promise<void>;
  // Allow extra fields for template registry compatibility
  supportedFeatures?: FeatureName[];
  defaultFeatures?: FeatureName[];
  supportedDatabases?: string[];
  defaultDatabase?: string;
  [key: string]: any; // Allow any additional custom fields
}

// =============================================================================
// ERROR TYPES
// =============================================================================

export class TemplateProcessingError extends Error {
  constructor(
    message: string,
    public templatePath?: string,
    public outputPath?: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = "TemplateProcessingError";
  }
}

export class ConfigurationValidationError extends Error {
  constructor(
    message: string,
    public field?: string,
    public value?: any
  ) {
    super(message);
    this.name = "ConfigurationValidationError";
  }
}

// =============================================================================
// UTILITY TYPES
// =============================================================================

/**
 * Type guard to check if a value is a valid template name
 */
export function isTemplateName(value: any): value is TemplateName {
  return (
    typeof value === "string" &&
    [
      "basic",
      "ai-chat",
      "ai-dashboard",
      "ecommerce",
      "cms",
      "api-only",
    ].includes(value)
  );
}

/**
 * Type guard to check if a value is a valid feature name
 */
export function isFeatureName(value: any): value is FeatureName {
  return (
    typeof value === "string" &&
    [
      "auth",
      "ai",
      "realtime",
      "payments",
      "email",
      "storage",
      "search",
      "analytics",
    ].includes(value)
  );
}

/**
 * Create a template context from CLI options and project name
 */
export function createTemplateContext(
  projectName: string,
  options: CreateCommandOptions
): CLITemplateContext {
  return {
    name: projectName,
    projectName,
    template: options.template || "basic",
    features: options.features || [],
    database: options.database || "mongodb",
    answers: {},
    timestamp: new Date().toISOString(),
    farmVersion: "1.0.0", // This should come from package.json
    environment: "development",

    // Optional development properties inherited from base TemplateContext
    typescript: options.typescript !== false, // Default to true
    docker: options.docker !== false, // Default to true
    git: options.git !== false, // Default to true
    install: options.install !== false, // Default to true

    // CLI-specific options
    interactive: options.interactive,
    verbose: options.verbose,
  };
}
