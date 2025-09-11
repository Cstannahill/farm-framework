// packages/cli/src/templates/helpers.ts
/**
 * Comprehensive Handlebars helper system for FARM framework templates
 * Fully typed with TypeScript interfaces
 */

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

interface HandlebarsInstance {
  registerHelper(name: string, helper: (...args: any[]) => any): void;
}

interface HandlebarsOptions {
  fn: (context: any) => string;
  inverse: (context: any) => string;
}

/**
 * @deprecated Moved to `@farm/types` package
 */
interface DatabaseConfig {
  type?: "mongodb" | "postgresql" | "mysql" | "sqlite";
}

/**
 * @deprecated Moved to `@farm/types` package
 */
interface AIProviderConfig {
  enabled?: boolean;
  url?: string;
  models?: string[];
  defaultModel?: string;
  apiKey?: string;
  token?: string;
  autoStart?: boolean;
  autoPull?: string[];
  gpu?: boolean;
}

/**
 * @deprecated Moved to `@farm/types` package
 */
interface AIConfig {
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

type FeatureName =
  | "auth"
  | "ai"
  | "realtime"
  | "payments"
  | "email"
  | "storage"
  | "search"
  | "analytics";
type TemplateName =
  | "basic"
  | "ai-chat"
  | "ai-dashboard"
  | "ecommerce"
  | "cms"
  | "api-only";
type DatabaseType = "mongodb" | "postgresql" | "mysql" | "sqlite";
type EnvironmentName = "development" | "staging" | "production";

/**
 * @deprecated Moved to `@farm/types` package
 */
interface TemplateContext {
  // Project configuration
  config?: TemplateContext;
  projectName?: string;
  name?: string;
  template?: TemplateName;
  features?: FeatureName[];
  database?: DatabaseConfig | DatabaseType;
  environment?: EnvironmentName;

  // Development options
  typescript?: boolean;
  docker?: boolean;
  testing?: boolean;

  // AI configuration
  ai?: AIConfig;

  // Plugin configuration
  plugins?: (string | [string, Record<string, any>])[];

  // Metadata
  farmVersion?: string;

  // Allow additional properties
  [key: string]: any;
}

type ConditionalHelper = (
  this: TemplateContext,
  options: HandlebarsOptions
) => string;
type ConditionalHelperWithArg<T = any> = (
  this: TemplateContext,
  arg: T,
  options: HandlebarsOptions
) => string;
type StringHelper = (this: TemplateContext, str: string) => string;
type ArrayHelper = (this: TemplateContext, array: any[], ...args: any[]) => any;

// =============================================================================
// HELPER REGISTRATION FUNCTION
// =============================================================================

export function registerHandlebarsHelpers(
  handlebars: HandlebarsInstance
): void {
  // =============================================================================
  // DATABASE HELPERS
  // =============================================================================
  // Check if specific database type is selected
  handlebars.registerHelper(
    "if_database",
    function (this: TemplateContext, ...args: any[]): string {
      const options = args.pop() as HandlebarsOptions;
      const databaseTypes = args as DatabaseType[];

      const config = this.config || this;
      const selectedDb =
        (typeof config.database === "object"
          ? config.database?.type
          : config.database) || "mongodb";

      const isMatch = databaseTypes.includes(selectedDb as DatabaseType);
      return isMatch ? options.fn(this) : options.inverse(this);
    }
  );
  handlebars.registerHelper(
    "unless_database",
    function (this: TemplateContext, ...args: any[]): string {
      const options = args.pop() as HandlebarsOptions;
      const databaseTypes = args as DatabaseType[];

      const config = this.config || this;
      const selectedDb =
        (typeof config.database === "object"
          ? config.database?.type
          : config.database) || "mongodb";

      const isMatch = databaseTypes.includes(selectedDb as DatabaseType);
      return !isMatch ? options.fn(this) : options.inverse(this);
    }
  );

  // Specific database checks
  handlebars.registerHelper(
    "is_mongodb",
    function (this: TemplateContext, options: HandlebarsOptions): string {
      const config = this.config || this;
      const selectedDb =
        (typeof config.database === "object"
          ? config.database?.type
          : config.database) || "mongodb";
      return selectedDb === "mongodb"
        ? options.fn(this)
        : options.inverse(this);
    }
  );

  handlebars.registerHelper(
    "is_postgresql",
    function (this: TemplateContext, options: HandlebarsOptions): string {
      const config = this.config || this;
      const selectedDb =
        (typeof config.database === "object"
          ? config.database?.type
          : config.database) || "mongodb";
      return selectedDb === "postgresql"
        ? options.fn(this)
        : options.inverse(this);
    }
  );

  handlebars.registerHelper(
    "is_mysql",
    function (this: TemplateContext, options: HandlebarsOptions): string {
      const config = this.config || this;
      const selectedDb =
        (typeof config.database === "object"
          ? config.database?.type
          : config.database) || "mongodb";
      return selectedDb === "mysql" ? options.fn(this) : options.inverse(this);
    }
  );

  handlebars.registerHelper(
    "is_sqlite",
    function (this: TemplateContext, options: HandlebarsOptions): string {
      const config = this.config || this;
      const selectedDb =
        (typeof config.database === "object"
          ? config.database?.type
          : config.database) || "mongodb";
      return selectedDb === "sqlite" ? options.fn(this) : options.inverse(this);
    }
  );

  // =============================================================================
  // FEATURE HELPERS
  // =============================================================================

  // Check if specific feature is enabled
  handlebars.registerHelper(
    "if_feature",
    function (
      this: TemplateContext,
      featureName: FeatureName,
      options: HandlebarsOptions
    ): string {
      const config = this.config || this;
      const features = config.features || [];
      return features.includes(featureName)
        ? options.fn(this)
        : options.inverse(this);
    }
  );

  handlebars.registerHelper(
    "unless_feature",
    function (
      this: TemplateContext,
      featureName: FeatureName,
      options: HandlebarsOptions
    ): string {
      const config = this.config || this;
      const features = config.features || [];
      return !features.includes(featureName)
        ? options.fn(this)
        : options.inverse(this);
    }
  );

  // Specific feature checks
  const featureList: FeatureName[] = [
    "auth",
    "ai",
    "realtime",
    "payments",
    "email",
    "storage",
    "search",
    "analytics",
  ];

  featureList.forEach((feature: FeatureName) => {
    handlebars.registerHelper(
      `has_${feature}`,
      function (this: TemplateContext, options: HandlebarsOptions): string {
        const config = this.config || this;
        const features = config.features || [];
        return features.includes(feature)
          ? options.fn(this)
          : options.inverse(this);
      }
    );
  });

  // Check if any features are enabled
  handlebars.registerHelper(
    "has_features",
    function (this: TemplateContext, options: HandlebarsOptions): string {
      const config = this.config || this;
      const features = config.features || [];
      return features.length > 0 ? options.fn(this) : options.inverse(this);
    }
  );

  // =============================================================================
  // AI PROVIDER HELPERS
  // =============================================================================

  // Check if specific AI provider is enabled
  handlebars.registerHelper(
    "if_ai_provider",
    function (
      this: TemplateContext,
      providerName: string,
      options: HandlebarsOptions
    ): string {
      const config = this.config || this;
      const aiConfig = config.ai || {};
      const providers = aiConfig.providers || {};
      const provider = providers[providerName as keyof typeof providers];
      return provider?.enabled ? options.fn(this) : options.inverse(this);
    }
  );

  // Specific AI provider checks
  handlebars.registerHelper(
    "has_ollama",
    function (this: TemplateContext, options: HandlebarsOptions): string {
      const config = this.config || this;
      const aiConfig = config.ai || {};
      const providers = aiConfig.providers || {};
      return providers.ollama?.enabled
        ? options.fn(this)
        : options.inverse(this);
    }
  );

  handlebars.registerHelper(
    "has_openai",
    function (this: TemplateContext, options: HandlebarsOptions): string {
      const config = this.config || this;
      const aiConfig = config.ai || {};
      const providers = aiConfig.providers || {};
      return providers.openai?.enabled
        ? options.fn(this)
        : options.inverse(this);
    }
  );

  handlebars.registerHelper(
    "has_huggingface",
    function (this: TemplateContext, options: HandlebarsOptions): string {
      const config = this.config || this;
      const aiConfig = config.ai || {};
      const providers = aiConfig.providers || {};
      return providers.huggingface?.enabled
        ? options.fn(this)
        : options.inverse(this);
    }
  );

  // Check if any AI provider is enabled
  handlebars.registerHelper(
    "has_ai_enabled",
    function (this: TemplateContext, options: HandlebarsOptions): string {
      const config = this.config || this;
      const features = config.features || [];
      const aiConfig = config.ai || {};
      const providers = aiConfig.providers || {};

      const hasAiFeature = features.includes("ai");
      const hasEnabledProvider = Object.values(providers).some(
        (p: AIProviderConfig | undefined) => p?.enabled
      );

      return hasAiFeature || hasEnabledProvider
        ? options.fn(this)
        : options.inverse(this);
    }
  );

  // =============================================================================
  // TEMPLATE HELPERS
  // =============================================================================

  // Check if specific template is selected
  handlebars.registerHelper(
    "if_template",
    function (
      this: TemplateContext,
      ...args: any[]
    ): string {
      const config = this.config || this;
      const selectedTemplate = config.template || "basic";

      // Get the last argument (options) and the rest are template names
      const options = args[args.length - 1];
      const templateNames = args.slice(0, -1);

      // Check if selected template matches any of the provided template names
      const matches = templateNames.includes(selectedTemplate);

      return matches
        ? options.fn(this)
        : options.inverse(this);
    }
  );

  // Specific template checks
  const templateList: TemplateName[] = [
    "basic",
    "ai-chat",
    "ai-dashboard",
    "ecommerce",
    "cms",
    "api-only",
  ];

  templateList.forEach((template: TemplateName) => {
    const helperName = template.replace("-", "_");
    handlebars.registerHelper(
      `is_${helperName}`,
      function (this: TemplateContext, options: HandlebarsOptions): string {
        const config = this.config || this;
        const selectedTemplate = config.template || "basic";
        return selectedTemplate === template
          ? options.fn(this)
          : options.inverse(this);
      }
    );
  });

  // =============================================================================
  // ENVIRONMENT HELPERS
  // =============================================================================

  // Check current environment
  handlebars.registerHelper(
    "if_env",
    function (
      this: TemplateContext,
      envName: EnvironmentName,
      options: HandlebarsOptions
    ): string {
      const config = this.config || this;
      const environment =
        config.environment ||
        (process.env.NODE_ENV as EnvironmentName) ||
        "development";
      return environment === envName ? options.fn(this) : options.inverse(this);
    }
  );

  // Specific environment checks
  handlebars.registerHelper(
    "is_development",
    function (this: TemplateContext, options: HandlebarsOptions): string {
      const config = this.config || this;
      const environment =
        config.environment ||
        (process.env.NODE_ENV as EnvironmentName) ||
        "development";
      return environment === "development"
        ? options.fn(this)
        : options.inverse(this);
    }
  );

  handlebars.registerHelper(
    "is_production",
    function (this: TemplateContext, options: HandlebarsOptions): string {
      const config = this.config || this;
      const environment =
        config.environment ||
        (process.env.NODE_ENV as EnvironmentName) ||
        "development";
      return environment === "production"
        ? options.fn(this)
        : options.inverse(this);
    }
  );

  handlebars.registerHelper(
    "is_staging",
    function (this: TemplateContext, options: HandlebarsOptions): string {
      const config = this.config || this;
      const environment =
        config.environment ||
        (process.env.NODE_ENV as EnvironmentName) ||
        "development";
      return environment === "staging"
        ? options.fn(this)
        : options.inverse(this);
    }
  );

  // =============================================================================
  // STRING TRANSFORMATION HELPERS
  // =============================================================================

  // Add kebabCase alias for compatibility with existing templates
  handlebars.registerHelper(
    "kebabCase",
    function (this: TemplateContext, str: string): string {
      if (typeof str !== "string") return "";
      return str
        .replace(/([a-z])([A-Z])/g, "$1-$2")
        .replace(/[\s_]+/g, "-")
        .toLowerCase();
    }
  );

  // Add pascalCase alias for compatibility with existing templates
  handlebars.registerHelper(
    "pascalCase",
    function (this: TemplateContext, str: string): string {
      if (typeof str !== "string") return "";
      const camelCase = str.replace(/[-_\s]+(.)?/g, (_, char: string) =>
        char ? char.toUpperCase() : ""
      );
      return camelCase.charAt(0).toUpperCase() + camelCase.slice(1);
    }
  );

  // String manipulation
  handlebars.registerHelper(
    "capitalize",
    function (this: TemplateContext, str: string): string {
      if (typeof str !== "string") return "";
      return str.charAt(0).toUpperCase() + str.slice(1);
    }
  );

  handlebars.registerHelper(
    "lowercase",
    function (this: TemplateContext, str: string): string {
      if (typeof str !== "string") return "";
      return str.toLowerCase();
    }
  );

  handlebars.registerHelper(
    "uppercase",
    function (this: TemplateContext, str: string): string {
      if (typeof str !== "string") return "";
      return str.toUpperCase();
    }
  );

  handlebars.registerHelper(
    "kebab_case",
    function (this: TemplateContext, str: string): string {
      if (typeof str !== "string") return "";
      return str
        .replace(/([a-z])([A-Z])/g, "$1-$2")
        .replace(/[\s_]+/g, "-")
        .toLowerCase();
    }
  );

  handlebars.registerHelper(
    "snake_case",
    function (this: TemplateContext, str: string): string {
      if (typeof str !== "string") return "";
      return str
        .replace(/([a-z])([A-Z])/g, "$1_$2")
        .replace(/[\s-]+/g, "_")
        .toLowerCase();
    }
  );

  handlebars.registerHelper(
    "camel_case",
    function (this: TemplateContext, str: string): string {
      if (typeof str !== "string") return "";
      return str.replace(/[-_\s]+(.)?/g, (_, char: string) =>
        char ? char.toUpperCase() : ""
      );
    }
  );

  handlebars.registerHelper(
    "pascal_case",
    function (this: TemplateContext, str: string): string {
      if (typeof str !== "string") return "";
      const camelCase = str.replace(/[-_\s]+(.)?/g, (_, char: string) =>
        char ? char.toUpperCase() : ""
      );
      return camelCase.charAt(0).toUpperCase() + camelCase.slice(1);
    }
  );

  // Pluralization (simple)
  handlebars.registerHelper(
    "pluralize",
    function (this: TemplateContext, str: string): string {
      if (typeof str !== "string") return "";
      if (str.endsWith("y")) return str.slice(0, -1) + "ies";
      if (str.endsWith("s") || str.endsWith("sh") || str.endsWith("ch"))
        return str + "es";
      return str + "s";
    }
  );

  // Array helpers
  handlebars.registerHelper(
    "join",
    function (
      this: TemplateContext,
      array: unknown[],
      separator: string = ", "
    ): string {
      if (!Array.isArray(array)) return "";
      return array.join(separator);
    }
  );

  handlebars.registerHelper(
    "length",
    function (this: TemplateContext, array: unknown[]): number {
      if (!Array.isArray(array)) return 0;
      return array.length;
    }
  );

  // Default value helper
  handlebars.registerHelper(
    "default",
    function (this: TemplateContext, value: any, defaultValue: any): any {
      return value || defaultValue;
    }
  );

  // =============================================================================
  // LOGIC HELPERS
  // =============================================================================

  // Logical operations
  handlebars.registerHelper(
    "and",
    function (this: TemplateContext, ...args: any[]): string {
      const options = args.pop() as HandlebarsOptions;
      return args.every(Boolean) ? options.fn(this) : options.inverse(this);
    }
  );

  handlebars.registerHelper(
    "or",
    function (this: TemplateContext, ...args: any[]): string {
      const options = args.pop() as HandlebarsOptions;
      return args.some(Boolean) ? options.fn(this) : options.inverse(this);
    }
  );

  handlebars.registerHelper(
    "not",
    function (
      this: TemplateContext,
      value: any,
      options: HandlebarsOptions
    ): string {
      return !value ? options.fn(this) : options.inverse(this);
    }
  );
  // Comparison helpers that work both as block and inline helpers
  handlebars.registerHelper(
    "eq",
    function (
      this: TemplateContext,
      a: any,
      b: any,
      options?: HandlebarsOptions
    ): string | boolean {
      const result = a === b;
      // If called as inline helper (no options.fn), return boolean
      if (!options || typeof options !== "object" || !options.fn) {
        return result;
      }
      // If called as block helper, return template content
      return result ? options.fn(this) : options.inverse(this);
    }
  );

  handlebars.registerHelper(
    "ne",
    function (
      this: TemplateContext,
      a: any,
      b: any,
      options?: HandlebarsOptions
    ): string | boolean {
      const result = a !== b;
      if (!options || typeof options !== "object" || !options.fn) {
        return result;
      }
      return result ? options.fn(this) : options.inverse(this);
    }
  );
  handlebars.registerHelper(
    "gt",
    function (
      this: TemplateContext,
      a: number,
      b: number,
      options?: HandlebarsOptions
    ): string | boolean {
      const result = a > b;
      if (!options || typeof options !== "object" || !options.fn) {
        return result;
      }
      return result ? options.fn(this) : options.inverse(this);
    }
  );

  handlebars.registerHelper(
    "lt",
    function (
      this: TemplateContext,
      a: number,
      b: number,
      options?: HandlebarsOptions
    ): string | boolean {
      const result = a < b;
      if (!options || typeof options !== "object" || !options.fn) {
        return result;
      }
      return result ? options.fn(this) : options.inverse(this);
    }
  );
  handlebars.registerHelper(
    "includes",
    function (
      this: TemplateContext,
      array: unknown[],
      value: any,
      options?: HandlebarsOptions
    ): string | boolean {
      const result = Array.isArray(array) && array.includes(value);
      if (!options || typeof options !== "object" || !options.fn) {
        return result;
      }
      return result ? options.fn(this) : options.inverse(this);
    }
  );

  // =============================================================================
  // PROJECT HELPERS
  // =============================================================================

  // Project name variants
  handlebars.registerHelper(
    "project_name",
    function (this: TemplateContext): string {
      const config = this.config || this;
      return config.projectName || config.name || "farm-app";
    }
  );

  handlebars.registerHelper(
    "project_name_kebab",
    function (this: TemplateContext): string {
      const config = this.config || this;
      const name = config.projectName || config.name || "farm-app";
      return name
        .replace(/([a-z])([A-Z])/g, "$1-$2")
        .replace(/[\s_]+/g, "-")
        .toLowerCase();
    }
  );

  handlebars.registerHelper(
    "project_name_snake",
    function (this: TemplateContext): string {
      const config = this.config || this;
      const name = config.projectName || config.name || "farm-app";
      return name
        .replace(/([a-z])([A-Z])/g, "$1_$2")
        .replace(/[\s-]+/g, "_")
        .toLowerCase();
    }
  );

  handlebars.registerHelper(
    "project_name_camel",
    function (this: TemplateContext): string {
      const config = this.config || this;
      const name = config.projectName || config.name || "farm-app";
      return name.replace(/[-_\s]+(.)?/g, (_, char: string) =>
        char ? char.toUpperCase() : ""
      );
    }
  );

  handlebars.registerHelper(
    "project_name_pascal",
    function (this: TemplateContext): string {
      const config = this.config || this;
      const name = config.projectName || config.name || "farm-app";
      const camelCase = name.replace(/[-_\s]+(.)?/g, (_, char: string) =>
        char ? char.toUpperCase() : ""
      );
      return camelCase.charAt(0).toUpperCase() + camelCase.slice(1);
    }
  );

  // Version and metadata
  handlebars.registerHelper(
    "farm_version",
    function (this: TemplateContext): string {
      const config = this.config || this;
      return config.farmVersion || "1.0.0";
    }
  );

  handlebars.registerHelper(
    "timestamp",
    function (this: TemplateContext): string {
      return new Date().toISOString();
    }
  );

  handlebars.registerHelper("year", function (this: TemplateContext): number {
    return new Date().getFullYear();
  });

  // =============================================================================
  // DEVELOPMENT HELPERS
  // =============================================================================

  // TypeScript helpers
  handlebars.registerHelper(
    "has_typescript",
    function (this: TemplateContext, options: HandlebarsOptions): string {
      const config = this.config || this;
      const useTypeScript = config.typescript !== false; // Default to true
      return useTypeScript ? options.fn(this) : options.inverse(this);
    }
  );

  // Docker helpers
  handlebars.registerHelper(
    "has_docker",
    function (this: TemplateContext, options: HandlebarsOptions): string {
      const config = this.config || this;
      const useDocker = config.docker !== false; // Default to true
      return useDocker ? options.fn(this) : options.inverse(this);
    }
  );

  // Testing helpers
  handlebars.registerHelper(
    "has_testing",
    function (this: TemplateContext, options: HandlebarsOptions): string {
      const config = this.config || this;
      const useTesting = config.testing !== false; // Default to true
      return useTesting ? options.fn(this) : options.inverse(this);
    }
  );

  // =============================================================================
  // PLUGIN HELPERS
  // =============================================================================

  // Check if plugin is enabled
  handlebars.registerHelper(
    "if_plugin",
    function (
      this: TemplateContext,
      pluginName: string,
      options: HandlebarsOptions
    ): string {
      const config = this.config || this;
      const plugins = config.plugins || [];

      // Check if plugin is in array (simple string) or array of objects
      const isEnabled = plugins.some(
        (plugin: string | [string, Record<string, any>]) => {
          if (typeof plugin === "string") {
            return plugin === pluginName || plugin === `@farm/${pluginName}`;
          }
          if (Array.isArray(plugin)) {
            return (
              plugin[0] === pluginName || plugin[0] === `@farm/${pluginName}`
            );
          }
          return false;
        }
      );

      return isEnabled ? options.fn(this) : options.inverse(this);
    }
  );

  // =============================================================================
  // ADVANCED CONFIGURATION HELPERS
  // =============================================================================

  // Get nested configuration values
  handlebars.registerHelper(
    "get_config",
    function (
      this: TemplateContext,
      path: string,
      defaultValue: any = ""
    ): any {
      const config = this.config || this;
      const keys = path.split(".");
      let value: any = config;

      for (const key of keys) {
        if (value && typeof value === "object" && key in value) {
          value = value[key];
        } else {
          return defaultValue;
        }
      }

      return value !== undefined ? value : defaultValue;
    }
  );

  // JSON stringify for complex objects
  handlebars.registerHelper(
    "json",
    function (this: TemplateContext, obj: any, indent: number = 2): string {
      return JSON.stringify(obj, null, indent);
    }
  );

  // =============================================================================
  // MISSING HELPER ALIASES (for backward compatibility)
  // =============================================================================

  // Direct variable access helpers (these should be available as context properties)
  handlebars.registerHelper(
    "projectName",
    function (this: TemplateContext): string {
      return this.projectName || this.name || "";
    }
  );

  handlebars.registerHelper(
    "projectNameKebab",
    function (this: TemplateContext): string {
      const name = this.projectName || this.name || "";
      return name.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '');
    }
  );

  handlebars.registerHelper(
    "author",
    function (this: TemplateContext): string {
      return this.author || "Unknown Author";
    }
  );

  handlebars.registerHelper(
    "description",
    function (this: TemplateContext): string {
      return this.description || "A FARM Framework project";
    }
  );

  // Template name helper
  handlebars.registerHelper(
    "template",
    function (this: TemplateContext): string {
      return this.template || "basic";
    }
  );

  // Database type helper
  handlebars.registerHelper(
    "database",
    function (this: TemplateContext): string {
      const db = this.database;
      if (typeof db === "string") {
        return db;
      } else if (typeof db === "object" && db?.type) {
        return db.type;
      }
      return "mongodb";
    }
  );

  // Current timestamp helper
  handlebars.registerHelper(
    "now",
    function (this: TemplateContext): string {
      return this.timestamp || new Date().toISOString();
    }
  );

  // Name alias helper
  handlebars.registerHelper(
    "name",
    function (this: TemplateContext): string {
      return this.projectName || this.name || "";
    }
  );

  // AI feature helper
  handlebars.registerHelper(
    "ai",
    function (this: TemplateContext): boolean {
      return this.features?.includes('ai') || false;
    }
  );

  // Context reference helper (for 'this' usage)
  handlebars.registerHelper(
    "this",
    function (this: TemplateContext, property?: string): any {
      if (property) {
        return (this as any)[property];
      }
      return this.projectName || this.name || "";
    }
  );

  // =============================================================================
  // BUILT-IN HANDLEBARS HELPERS
  // =============================================================================

  // Else helper for if/else blocks
  handlebars.registerHelper(
    "else",
    function (this: TemplateContext, options: HandlebarsOptions): string {
      // The else helper is typically used with if blocks
      // This is a simple implementation that returns the inverse block
      return options.inverse(this);
    }
  );

  // Safe description helper that handles undefined and object cases
  handlebars.registerHelper(
    "safeDescription",
    function (this: TemplateContext): string {
      const { description, template } = this;

      // Only use description if it's a non-empty string
      if (typeof description === "string" && description.trim()) {
        return description;
      }

      // Fallback based on template type
      switch (template) {
        case "ai-chat":
          return "AI-powered chat application with streaming responses";
        case "ai-dashboard":
          return "AI analytics and insights dashboard";
        case "api-only":
          return "RESTful API service";
        default:
          return "Full-stack web application";
      }
    }
  );

  // Safe environment helper that handles undefined and object cases
  handlebars.registerHelper(
    "safeEnvironment",
    function (this: TemplateContext): string {
      const env = this.environment;
      if (typeof env === "string" && env.trim()) {
        return env;
      }

      // Default to development if not properly set
      return "development";
    }
  );

  // Safe database helper that handles undefined and object cases
  handlebars.registerHelper(
    "safeDatabase",
    function (this: TemplateContext): string {
      const db = this.database;
      if (typeof db === "string" && db.trim()) {
        return db;
      }

      // If it's an object, try to extract the type
      if (db && typeof db === "object" && "type" in db) {
        return (db as any).type;
      }

      // Default to mongodb if not properly set
      return "mongodb";
    }
  );

  // Switch helper for conditional rendering ({{#switch value}}...{{/switch}})
  handlebars.registerHelper(
    "switch",
    function (this: TemplateContext, value: any, options: any): string {
      // Store the switch value in the context for case helpers to use
      (this as any).__switch_value = value;
      (this as any).__switch_break = false;
      const result = options.fn(this);
      // Clean up the switch context
      delete (this as any).__switch_value;
      delete (this as any).__switch_break;
      return result;
    }
  );

  // Case helper for switch statements ({{#case value}}...{{/case}})
  handlebars.registerHelper(
    "case",
    function (this: TemplateContext, value: any, options: any): string {
      const switchValue = (this as any).__switch_value;
      const switchBreak = (this as any).__switch_break;

      // If we've already hit a break, don't render this case
      if (switchBreak) {
        return "";
      }

      // If this case matches the switch value, render it and set break
      if (switchValue === value) {
        (this as any).__switch_break = true;
        return options.fn(this);
      }

      return "";
    }
  );

  // Default block helper for switch statements ({{#defaultBlock}}...{{/defaultBlock}})
  handlebars.registerHelper(
    "defaultBlock",
    function (this: TemplateContext, options: any): string {
      const switchBreak = (this as any).__switch_break;

      // If we've already hit a break, don't render the default
      if (switchBreak) {
        return "";
      }

      // This is the default case when no other case matches
      return options.fn(this);
    }
  );

  // =============================================================================
  // DEBUG HELPERS
  // =============================================================================

  // Debug helper to inspect context
  handlebars.registerHelper(
    "debug",
    function (this: TemplateContext, value: any): string {
      console.log("DEBUG:", value);
      return "";
    }
  );

  // Log helper for development
  handlebars.registerHelper(
    "log",
    function (this: TemplateContext, message: string): string {
      console.log("TEMPLATE LOG:", message);
      return "";
    }
  );

  console.log("✅ Registered all Handlebars helpers");
}

// Export helper registration function and types
export default registerHandlebarsHelpers;
export type {
  TemplateContext,
  HandlebarsInstance,
  HandlebarsOptions,
  FeatureName,
  TemplateName,
  DatabaseType,
  EnvironmentName,
  AIConfig,
  AIProviderConfig,
  DatabaseConfig,
};
