import type { OpenAPISchema } from "@farm-framework/types";
import type { TypeSyncConfig } from "../config/validation";

/**
 * Plugin lifecycle hooks
 */
export interface PluginHooks {
  /**
   * Called before schema loading
   */
  beforeSchemaLoad?: (source: string) => Promise<void> | void;

  /**
   * Called after schema loading, allows transformation
   */
  afterSchemaLoad?: (
    schema: OpenAPISchema
  ) => Promise<OpenAPISchema> | OpenAPISchema;

  /**
   * Called before code generation starts
   */
  beforeGeneration?: (
    schema: OpenAPISchema,
    config: TypeSyncConfig
  ) => Promise<void> | void;

  /**
   * Called after each generator runs
   */
  afterGeneration?: (
    generatorType: string,
    result: GenerationResult,
    schema: OpenAPISchema
  ) => Promise<GenerationResult> | GenerationResult;

  /**
   * Called after all generation completes
   */
  afterAllGeneration?: (
    results: GenerationResult[]
  ) => Promise<GenerationResult[]> | GenerationResult[];

  /**
   * Called on errors during generation
   */
  onError?: (error: Error, context: PluginContext) => Promise<void> | void;

  /**
   * Called during cleanup
   */
  cleanup?: () => Promise<void> | void;
}

/**
 * Plugin context provided to hooks
 */
export interface PluginContext {
  config: TypeSyncConfig;
  schema?: OpenAPISchema;
  generatorType?: string;
  outputDirectory: string;
  cacheDirectory?: string;
}

/**
 * Plugin configuration
 */
export interface PluginConfig {
  name: string;
  version?: string;
  enabled?: boolean;
  options?: Record<string, any>;
}

/**
 * Generation result interface
 */
export interface GenerationResult {
  path: string;
  content?: string;
  size?: number;
  checksum?: string;
  generatedAt?: Date;
  type?: string;
}

/**
 * Base plugin interface
 */
export interface TypeSyncPlugin extends PluginHooks {
  /**
   * Plugin metadata
   */
  meta: {
    name: string;
    version: string;
    description?: string;
    author?: string;
  };

  /**
   * Plugin options
   */
  options?: Record<string, any>;

  /**
   * Initialize plugin with options
   */
  init?(
    options: Record<string, any>,
    context: PluginContext
  ): Promise<void> | void;

  /**
   * Validate plugin options
   */
  validateOptions?(options: Record<string, any>): boolean | string;
}

/**
 * Plugin manager for type-sync
 */
export class PluginManager {
  private plugins: Map<string, TypeSyncPlugin> = new Map();
  private enabledPlugins: TypeSyncPlugin[] = [];
  private context: PluginContext;

  constructor(context: PluginContext) {
    this.context = context;
  }

  /**
   * Register a plugin
   */
  register(plugin: TypeSyncPlugin, options: Record<string, any> = {}): void {
    // Validate plugin
    if (!plugin.meta?.name) {
      throw new Error("Plugin must have a name");
    }

    // Validate options if validator exists
    if (plugin.validateOptions) {
      const validation = plugin.validateOptions(options);
      if (validation !== true) {
        throw new Error(
          `Plugin ${plugin.meta.name} options validation failed: ${validation}`
        );
      }
    }

    // Initialize plugin
    if (plugin.init) {
      plugin.init(options, this.context);
    }

    this.plugins.set(plugin.meta.name, plugin);
    this.enabledPlugins.push(plugin);

    console.log(
      `🔌 Registered plugin: ${plugin.meta.name}@${plugin.meta.version}`
    );
  }

  /**
   * Load plugins from configuration
   */
  async loadFromConfig(pluginConfigs: PluginConfig[]): Promise<void> {
    for (const config of pluginConfigs) {
      if (config.enabled === false) {
        continue;
      }

      try {
        // Try to load plugin
        const plugin = await this.loadPlugin(config.name);
        this.register(plugin, config.options || {});
      } catch (error) {
        console.error(`Failed to load plugin ${config.name}:`, error);
      }
    }
  }

  /**
   * Load plugin from module
   */
  private async loadPlugin(name: string): Promise<TypeSyncPlugin> {
    try {
      // Try to import as npm package
      const module = await import(name);
      return module.default || module;
    } catch {
      // Try to import as local file
      const module = await import(name);
      return module.default || module;
    }
  }

  /**
   * Execute hook on all enabled plugins
   */
  async executeHook<T>(
    hookName: keyof PluginHooks,
    ...args: any[]
  ): Promise<T | undefined> {
    let result: T | undefined;

    for (const plugin of this.enabledPlugins) {
      const hook = plugin[hookName] as Function;
      if (typeof hook === "function") {
        try {
          const hookResult = await hook.apply(plugin, args);
          if (hookResult !== undefined) {
            result = hookResult;
          }
        } catch (error) {
          console.error(
            `Plugin ${plugin.meta.name} hook ${hookName} failed:`,
            error
          );

          // Call error hook if available
          if (plugin.onError) {
            await plugin.onError(error as Error, this.context);
          }
        }
      }
    }

    return result;
  }

  /**
   * Execute hook that transforms data through all plugins
   */
  async executeTransformHook<T>(
    hookName: keyof PluginHooks,
    initialValue: T,
    ...args: any[]
  ): Promise<T> {
    let result = initialValue;

    for (const plugin of this.enabledPlugins) {
      const hook = plugin[hookName] as Function;
      if (typeof hook === "function") {
        try {
          const hookResult = await hook.apply(plugin, [result, ...args]);
          if (hookResult !== undefined) {
            result = hookResult;
          }
        } catch (error) {
          console.error(
            `Plugin ${plugin.meta.name} hook ${hookName} failed:`,
            error
          );

          if (plugin.onError) {
            await plugin.onError(error as Error, this.context);
          }
        }
      }
    }

    return result;
  }

  /**
   * Get list of enabled plugins
   */
  getEnabledPlugins(): TypeSyncPlugin[] {
    return [...this.enabledPlugins];
  }

  /**
   * Get plugin by name
   */
  getPlugin(name: string): TypeSyncPlugin | undefined {
    return this.plugins.get(name);
  }

  /**
   * Disable plugin
   */
  disable(name: string): void {
    const plugin = this.plugins.get(name);
    if (plugin) {
      this.enabledPlugins = this.enabledPlugins.filter(
        (p) => p.meta.name !== name
      );
      console.log(`🔌 Disabled plugin: ${name}`);
    }
  }

  /**
   * Enable plugin
   */
  enable(name: string): void {
    const plugin = this.plugins.get(name);
    if (plugin && !this.enabledPlugins.includes(plugin)) {
      this.enabledPlugins.push(plugin);
      console.log(`🔌 Enabled plugin: ${name}`);
    }
  }

  /**
   * Cleanup all plugins
   */
  async cleanup(): Promise<void> {
    await this.executeHook("cleanup");
    this.plugins.clear();
    this.enabledPlugins = [];
  }
}

/**
 * Built-in plugins
 */

/**
 * Plugin for adding custom headers to generated files
 */
export const customHeaderPlugin: TypeSyncPlugin = {
  meta: {
    name: "custom-header",
    version: "1.0.0",
    description: "Adds custom headers to generated files",
  },

  validateOptions(options: any): boolean | string {
    if (options.header && typeof options.header !== "string") {
      return "header option must be a string";
    }
    return true;
  },

  afterGeneration(generatorType, result, schema) {
    const options = this.options || {};
    const header =
      options.header ||
      `/* Generated by type-sync at ${new Date().toISOString()} */`;

    if (result.content) {
      result.content = header + "\n\n" + result.content;
      result.size = result.content.length;
    }

    return result;
  },

  options: {} as Record<string, any>,
};

/**
 * Plugin for file formatting (Prettier integration)
 */
export const prettierPlugin: TypeSyncPlugin = {
  meta: {
    name: "prettier",
    version: "1.0.0",
    description: "Formats generated files with Prettier",
  },

  async afterGeneration(generatorType, result, schema) {
    if (!result.content || !result.path.endsWith(".ts")) {
      return result;
    }

    try {
      const prettier = await import("prettier");
      const formatted = await prettier.format(result.content, {
        parser: "typescript",
        semi: true,
        singleQuote: true,
        trailingComma: "es5",
        ...(this.options?.prettierOptions || {}),
      });

      result.content = formatted;
      result.size = formatted.length;
    } catch (error) {
      console.warn("Prettier formatting failed:", error);
    }

    return result;
  },

  options: {} as Record<string, any>,
};

/**
 * Plugin for ESLint integration
 */
export const eslintPlugin: TypeSyncPlugin = {
  meta: {
    name: "eslint",
    version: "1.0.0",
    description: "Runs ESLint on generated files",
  },

  async afterGeneration(generatorType, result, schema) {
    if (!result.content || !result.path.endsWith(".ts")) {
      return result;
    }

    try {
      const { ESLint } = await import("eslint");
      const eslint = new ESLint({
        fix: this.options?.fix !== false,
        ...(this.options?.eslintOptions || {}),
      });

      const [lintResult] = await eslint.lintText(result.content, {
        filePath: result.path,
      });

      if (lintResult.output) {
        result.content = lintResult.output;
        result.size = lintResult.output.length;
      }

      if (lintResult.messages.length > 0) {
        console.warn(`ESLint issues in ${result.path}:`, lintResult.messages);
      }
    } catch (error) {
      console.warn("ESLint processing failed:", error);
    }

    return result;
  },

  options: {} as Record<string, any>,
};

/**
 * Plugin for schema validation
 */
export const schemaValidationPlugin: TypeSyncPlugin = {
  meta: {
    name: "schema-validation",
    version: "1.0.0",
    description: "Validates OpenAPI schema before processing",
  },

  async afterSchemaLoad(schema) {
    // Basic validation
    if (!schema.openapi && !schema.swagger) {
      throw new Error("Invalid OpenAPI/Swagger specification");
    }

    if (!schema.info) {
      throw new Error("OpenAPI specification must have info section");
    }

    if (!schema.info.title) {
      throw new Error("OpenAPI specification must have a title");
    }

    if (!schema.info.version) {
      throw new Error("OpenAPI specification must have a version");
    }

    console.log(
      `✅ Schema validation passed for ${schema.info.title} v${schema.info.version}`
    );

    return schema;
  },
};

export default PluginManager;
