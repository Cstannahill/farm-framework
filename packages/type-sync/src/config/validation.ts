/**
 * Configuration validation and management for @farm-framework/type-sync
 *const InputConfigSchema = z.object({
  source: z.string().min(1).default("./openapi.json"),
});fe configuration with validation, defaults, and schema
 */

import { z } from "zod";
import fs from "fs-extra";
import path from "path";
import {
  ConfigurationError,
  ValidationError,
  ValidationIssue,
} from "../errors/enhanced-errors";

// Base configuration schemas
const ExtractionConfigSchema = z.object({
  host: z.string().default("localhost"),
  port: z.number().int().min(1).max(65535).default(8000),
  timeout: z.number().int().min(1000).default(30000),
  retries: z.number().int().min(0).max(10).default(3),
  retryDelay: z.number().int().min(100).default(2000),
  enableCache: z.boolean().default(true),
  cacheTimeout: z.number().int().min(0).default(300000),
  serverStartupTime: z.number().int().min(0).default(5000),
  healthCheckEndpoint: z.string().default("/health"),
  include: z.array(z.string()).optional(),
  exclude: z.array(z.string()).optional(),
});

const CacheConfigSchema = z.object({
  enabled: z.boolean().default(true),
  timeout: z.number().int().min(0).default(300000),
  enableCompression: z.boolean().default(true),
  enableMetrics: z.boolean().default(true),
  maxSize: z
    .number()
    .int()
    .min(0)
    .default(100 * 1024 * 1024), // 100MB
  cleanupInterval: z.number().int().min(0).default(600000), // 10 minutes
  directory: z.string().default("./.type-sync-cache"), // Cache directory
});

const PerformanceConfigSchema = z.object({
  enableMonitoring: z.boolean().default(true),
  maxConcurrency: z.number().int().min(1).max(10).default(4),
  enableParallelGeneration: z.boolean().default(true),
  enableIncrementalGeneration: z.boolean().default(true),
  memoryLimit: z.number().int().min(0).optional(),
});

const GeneratorConfigSchema = z.object({
  outputDir: z.string().min(1),
  enabled: z.boolean().default(true),
  options: z.record(z.any()).optional(),
});

const FeaturesConfigSchema = z.object({
  client: z.boolean().default(true),
  hooks: z.boolean().default(true),
  streaming: z.boolean().default(false),
  aiHooks: z.boolean().default(false),
  types: z.boolean().default(true),
  tests: z.boolean().default(false),
  mocks: z.boolean().default(false),
});

const OutputConfigSchema = z.object({
  baseDir: z.string().min(1).default("./src/generated"),
  directory: z.string().min(1).default("./src/generated"), // Legacy compatibility
  fileNaming: z
    .enum(["camelCase", "kebab-case", "snake_case"])
    .default("camelCase"),
  cleanBefore: z.boolean().default(true),
  createIndex: z.boolean().default(true),
  enableSourceMaps: z.boolean().default(false),
  generators: z.array(z.string()).optional(), // Array of generator names
});

const InputConfigSchema = z.object({
  source: z.string().min(1).default("./openapi.json"),
  type: z.string().optional().default("openapi"),
});

const WatchConfigSchema = z.object({
  enabled: z.boolean().default(false),
  patterns: z.array(z.string()).default(["**/*.py"]),
  ignorePatterns: z
    .array(z.string())
    .default(["**/node_modules/**", "**/.git/**"]),
  debounceMs: z.number().int().min(100).default(1000),
  enablePolling: z.boolean().default(false),
  pollingInterval: z.number().int().min(100).default(1000),
});

// Main configuration schema
export const TypeSyncConfigSchema = z.object({
  apiUrl: z.string().url("Must be a valid URL"),
  outputDir: z
    .string()
    .min(1, "Output directory cannot be empty")
    .default("./src/generated"),

  input: InputConfigSchema.optional(),
  extraction: ExtractionConfigSchema.optional(),
  cache: CacheConfigSchema.optional(),
  performance: PerformanceConfigSchema.optional(),
  features: FeaturesConfigSchema.optional(),
  output: OutputConfigSchema.optional(),
  watch: WatchConfigSchema.optional(),

  generators: z.record(GeneratorConfigSchema).optional(),

  // Environment-specific overrides
  environments: z
    .record(
      z.object({
        apiUrl: z.string().url().optional(),
        extraction: ExtractionConfigSchema.partial().optional(),
        performance: PerformanceConfigSchema.partial().optional(),
      })
    )
    .optional(),

  // Plugin configuration
  plugins: z
    .array(
      z.object({
        name: z.string(),
        enabled: z.boolean().default(true),
        options: z.record(z.any()).optional(),
      })
    )
    .optional(),
});

export type TypeSyncConfig = z.infer<typeof TypeSyncConfigSchema>;
export type ExtractionConfig = z.infer<typeof ExtractionConfigSchema>;
export type CacheConfig = z.infer<typeof CacheConfigSchema>;
export type PerformanceConfig = z.infer<typeof PerformanceConfigSchema>;
export type FeaturesConfig = z.infer<typeof FeaturesConfigSchema>;
export type OutputConfig = z.infer<typeof OutputConfigSchema>;
export type WatchConfig = z.infer<typeof WatchConfigSchema>;

/**
 * Configuration manager with validation, defaults, and environment support
 */
export class TypeSyncConfigManager {
  private static readonly CONFIG_FILE_NAMES = [
    "farm-type-sync.config.js",
    "farm-type-sync.config.ts",
    "farm-type-sync.config.json",
    ".farm-type-sync.json",
    "package.json", // Look for farm-type-sync section
  ];

  // Instance methods for backward compatibility with tests
  async loadConfigFromFile(filePath: string): Promise<any> {
    return TypeSyncConfigManager.loadConfigFromFile(filePath);
  }

  mergeConfigurations(base: any, override: any): any {
    return TypeSyncConfigManager.mergeConfigs(base, override);
  }

  async validateConfig(config: unknown): Promise<TypeSyncConfig> {
    const result = TypeSyncConfigManager.validateConfig(config);
    if (!result.valid) {
      throw new ValidationError(
        "Configuration validation failed",
        result.errors
      );
    }
    return result.config!;
  }

  /**
   * Load configuration from file or provide defaults
   */
  static async loadConfig(
    configPath?: string,
    environment?: string
  ): Promise<TypeSyncConfig> {
    let rawConfig: any = {};

    if (configPath) {
      rawConfig = await this.loadConfigFromFile(configPath);
    } else {
      rawConfig = await this.findAndLoadConfig();
    }

    // Apply environment-specific overrides
    if (environment && rawConfig.environments?.[environment]) {
      rawConfig = this.mergeConfigs(
        rawConfig,
        rawConfig.environments[environment]
      );
    }

    // Validate and apply defaults
    return this.validateAndNormalize(rawConfig);
  }

  /**
   * Create a new configuration file with defaults
   */
  static async initializeConfig(
    outputPath: string,
    options: {
      format?: "json" | "js" | "ts";
      interactive?: boolean;
    } = {}
  ): Promise<void> {
    const { format = "json", interactive = false } = options;

    let config: Partial<TypeSyncConfig>;

    if (interactive) {
      config = await this.runInteractiveSetup();
    } else {
      config = this.getDefaultConfig();
    }

    const filePath = path.join(outputPath, this.getConfigFileName(format));
    await this.writeConfigFile(filePath, config, format);
  }

  /**
   * Validate configuration and return detailed errors
   */
  static validateConfig(config: unknown): ValidationResult {
    const result = TypeSyncConfigSchema.safeParse(config);

    if (result.success) {
      return {
        valid: true,
        config: result.data,
        errors: [],
      };
    }

    const errors: ValidationIssue[] = result.error.issues.map((issue: any) => ({
      path: issue.path.join("."),
      message: issue.message,
      severity: "error" as const,
      code: issue.code,
    }));

    return {
      valid: false,
      config: null,
      errors,
    };
  }

  /**
   * Merge two configuration objects with deep merging
   */
  static mergeConfigs(base: any, override: any): any {
    const result = { ...base };

    for (const [key, value] of Object.entries(override)) {
      if (value === null || value === undefined) {
        continue;
      }

      if (
        typeof value === "object" &&
        !Array.isArray(value) &&
        typeof result[key] === "object"
      ) {
        result[key] = this.mergeConfigs(result[key], value);
      } else {
        result[key] = value;
      }
    }

    return result;
  }

  /**
   * Get configuration for specific generator
   */
  static getGeneratorConfig(
    config: TypeSyncConfig,
    generatorName: string
  ): GeneratorConfigWithDefaults {
    const generatorConfig = config.generators?.[generatorName];

    if (!generatorConfig) {
      throw new ConfigurationError(
        `Generator '${generatorName}' not found in configuration`,
        { invalidFields: [generatorName] }
      );
    }

    return {
      outputDir: generatorConfig.outputDir || config.outputDir,
      enabled: generatorConfig.enabled ?? true,
      options: {
        ...this.getGeneratorDefaults(generatorName),
        ...generatorConfig.options,
      },
    };
  }

  private static async findAndLoadConfig(): Promise<any> {
    for (const fileName of this.CONFIG_FILE_NAMES) {
      const configPath = path.resolve(fileName);

      if (await fs.pathExists(configPath)) {
        return this.loadConfigFromFile(configPath);
      }
    }

    // No config file found, return empty object (defaults will be applied)
    return {};
  }

  private static async loadConfigFromFile(filePath: string): Promise<any> {
    try {
      const ext = path.extname(filePath);

      if (ext === ".json") {
        const content = await fs.readFile(filePath, "utf-8");
        return JSON.parse(content);
      }

      if (ext === ".js" || ext === ".ts") {
        // Dynamic import for JS/TS config files
        const absolutePath = path.resolve(filePath);
        const module = await import(absolutePath);
        return module.default || module;
      }

      if (path.basename(filePath) === "package.json") {
        const content = await fs.readFile(filePath, "utf-8");
        const packageJson = JSON.parse(content);
        return packageJson["farm-type-sync"] || {};
      }

      throw new ConfigurationError(
        `Unsupported configuration file format: ${ext}`,
        { configPath: filePath }
      );
    } catch (error) {
      throw new ConfigurationError(
        `Failed to load configuration from ${filePath}`,
        {
          configPath: filePath,
          cause: error as Error,
        }
      );
    }
  }

  private static validateAndNormalize(rawConfig: any): TypeSyncConfig {
    const validation = this.validateConfig(rawConfig);

    if (!validation.valid) {
      throw new ValidationError(
        "Configuration validation failed",
        validation.errors
      );
    }

    return validation.config!;
  }

  private static getDefaultConfig(): TypeSyncConfig {
    return TypeSyncConfigSchema.parse({
      apiUrl: "http://localhost:8000",
    });
  }

  private static async runInteractiveSetup(): Promise<Partial<TypeSyncConfig>> {
    // This would integrate with a CLI prompting library like inquirer
    // For now, return basic defaults
    return {
      apiUrl: "http://localhost:8000",
      outputDir: "./src/generated",
      features: {
        client: true,
        hooks: true,
        streaming: false,
        aiHooks: false,
        types: true,
        tests: false,
        mocks: false,
      },
    };
  }

  private static getConfigFileName(format: "json" | "js" | "ts"): string {
    switch (format) {
      case "json":
        return "farm-type-sync.config.json";
      case "js":
        return "farm-type-sync.config.js";
      case "ts":
        return "farm-type-sync.config.ts";
    }
  }

  private static async writeConfigFile(
    filePath: string,
    config: Partial<TypeSyncConfig>,
    format: "json" | "js" | "ts"
  ): Promise<void> {
    await fs.ensureDir(path.dirname(filePath));

    if (format === "json") {
      await fs.writeFile(filePath, JSON.stringify(config, null, 2));
    } else {
      // For JS/TS, write as module export
      const content = `export default ${JSON.stringify(config, null, 2)};`;
      await fs.writeFile(filePath, content);
    }
  }

  private static getGeneratorDefaults(
    generatorName: string
  ): Record<string, any> {
    const defaults: Record<string, Record<string, any>> = {
      typescript: {
        generateComments: true,
        enumType: "union",
        dateType: "string",
        strict: true,
      },
      "api-client": {
        enableAI: false,
        outputFormat: "typescript",
        includeTypes: true,
        authentication: "bearer",
        enableInterceptors: true,
      },
      "react-hooks": {
        enableInfiniteQueries: true,
        enableOptimisticUpdates: true,
        apiClientImportPath: "../api/client",
        typesImportPath: "../api/types",
      },
      "ai-hooks": {
        enableStreamingHooks: true,
        enableChatHooks: true,
      },
    };

    return defaults[generatorName] || {};
  }
}

export interface ValidationResult {
  valid: boolean;
  config: TypeSyncConfig | null;
  errors: ValidationIssue[];
}

export interface GeneratorConfigWithDefaults {
  outputDir: string;
  enabled: boolean;
  options: Record<string, any>;
}

// Export validation functions for external use
export const validateTypeSyncConfig = TypeSyncConfigManager.validateConfig;
export const mergeTypeSyncConfigs = TypeSyncConfigManager.mergeConfigs;
