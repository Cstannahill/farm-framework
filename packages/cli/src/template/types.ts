// packages/cli/src/templates/types.ts
/**
 * Type definitions for template configuration and context
 */

// =============================================================================
// FARM CONFIGURATION TYPES
// =============================================================================

export type DatabaseType = "mongodb" | "postgresql" | "mysql" | "sqlite";
export type FeatureName =
  | "auth"
  | "ai"
  | "realtime"
  | "payments"
  | "email"
  | "storage"
  | "search"
  | "analytics";
export type TemplateName =
  | "basic"
  | "ai-chat"
  | "ai-dashboard"
  | "ecommerce"
  | "cms"
  | "api-only";
export type EnvironmentName = "development" | "staging" | "production";

export interface DatabaseConfig {
  type: DatabaseType;
  url?: string;
  options?: Record<string, any>;
}

export interface AIProviderConfig {
  enabled: boolean;
  url?: string;
  models?: string[];
  defaultModel?: string;
  apiKey?: string;
  token?: string;
  autoStart?: boolean;
  autoPull?: string[];
  gpu?: boolean;
  rateLimiting?: {
    requestsPerMinute?: number;
    tokensPerMinute?: number;
  };
}

export interface AIConfig {
  providers?: {
    ollama?: AIProviderConfig;
    openai?: AIProviderConfig;
    huggingface?: AIProviderConfig;
  };
  routing?: {
    development?: string;
    staging?: string;
    production?: string;
  };
  features?: {
    streaming?: boolean;
    caching?: boolean;
    rateLimiting?: boolean;
    fallback?: boolean;
  };
}

export interface DevelopmentConfig {
  ports?: {
    frontend?: number;
    backend?: number;
    proxy?: number;
    ollama?: number;
  };
  hotReload?: {
    enabled?: boolean;
    typeGeneration?: boolean;
    aiModels?: boolean;
  };
  ssl?: boolean;
}

export interface BuildConfig {
  target?: string;
  sourcemap?: boolean;
  minify?: boolean;
  splitting?: boolean;
  outDir?: string;
}

export interface DeploymentConfig {
  platform?: "vercel" | "netlify" | "aws" | "gcp" | "docker";
  regions?: string[];
  environment?: Record<string, string>;
}

export type PluginConfig = string | [string, Record<string, any>];

export interface FarmConfig {
  // Project metadata
  name: string;
  projectName?: string;
  version?: string;
  description?: string;

  // Template and features
  template: TemplateName;
  features: FeatureName[];

  // Core configurations
  database: DatabaseConfig | DatabaseType;
  ai?: AIConfig;
  development?: DevelopmentConfig;
  build?: BuildConfig;
  deployment?: DeploymentConfig;

  // Development options
  typescript?: boolean;
  docker?: boolean;
  testing?: boolean;
  git?: boolean;
  install?: boolean;

  // Environment
  environment?: EnvironmentName;

  // Plugin system
  plugins?: PluginConfig[];

  // Framework metadata
  farmVersion?: string;

  // CLI options that might be passed through
  interactive?: boolean;
  verbose?: boolean;
}

// =============================================================================
// TEMPLATE CONTEXT TYPES
// =============================================================================

/**
 * Template context that gets passed to Handlebars templates
 * This extends FarmConfig with additional computed properties
 */
export interface TemplateContext extends FarmConfig {
  // The config property allows templates to access the full config
  config?: TemplateContext;

  // Additional computed properties that might be added by the template processor
  [key: string]: any;
}

// =============================================================================
// CLI COMMAND TYPES
// =============================================================================

export interface CreateCommandOptions {
  template?: TemplateName;
  features?: FeatureName[];
  database?: DatabaseType;
  typescript?: boolean;
  docker?: boolean;
  testing?: boolean;
  git?: boolean;
  install?: boolean;
  interactive?: boolean;
  verbose?: boolean;
}

// =============================================================================
// TEMPLATE PROCESSING TYPES
// =============================================================================

export interface TemplateFile {
  src: string;
  dest: string;
  condition?: (context: TemplateContext) => boolean;
}

export interface TemplateDirectory {
  src: string;
  dest: string;
  condition?: (context: TemplateContext) => boolean;
}

export interface TemplateDefinition {
  name: TemplateName;
  description: string;
  features: FeatureName[];
  files: TemplateFile[];
  directories: TemplateDirectory[];
  postProcess?: (context: TemplateContext, outputPath: string) => Promise<void>;
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
 * Type guard to check if a value is a valid database type
 */
export function isDatabaseType(value: any): value is DatabaseType {
  return (
    typeof value === "string" &&
    ["mongodb", "postgresql", "mysql", "sqlite"].includes(value)
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
 * Normalize database configuration to a consistent format
 */
export function normalizeDatabaseConfig(
  database: DatabaseConfig | DatabaseType
): DatabaseConfig {
  if (typeof database === "string") {
    return { type: database };
  }
  return database;
}

/**
 * Create a template context from CLI options and project name
 */
export function createTemplateContext(
  projectName: string,
  options: CreateCommandOptions
): TemplateContext {
  return {
    name: projectName,
    projectName,
    template: options.template || "basic",
    features: options.features || [],
    database: options.database || "mongodb",
    typescript: options.typescript !== false, // Default to true
    docker: options.docker !== false, // Default to true
    testing: options.testing !== false, // Default to true
    git: options.git !== false, // Default to true
    install: options.install !== false, // Default to true
    environment: "development",
    farmVersion: "1.0.0", // This should come from package.json

    // AI configuration based on template
    ...(options.template?.includes("ai") && {
      ai: {
        providers: {
          ollama: {
            enabled: true,
            models: ["llama3.1"],
            defaultModel: "llama3.1",
            autoStart: true,
            autoPull: ["llama3.1"],
          },
        },
        routing: {
          development: "ollama",
          production: "openai",
        },
        features: {
          streaming: true,
          caching: true,
          rateLimiting: true,
          fallback: true,
        },
      },
    }),
  };
}
