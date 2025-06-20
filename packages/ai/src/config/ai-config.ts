// packages/ai/src/config/ai-config.ts - Fix missing import
// import type { AIConfig } from "@farm-framework/types";

/**
 * Utility classes and helpers for managing AI provider configuration. This file
 * defines zod based schemas that validate the configuration structure used by
 * the FARM framework and exposes a manager class for runtime manipulation.
 */
import { z } from "zod";
import { EventEmitter } from "events";

// Simple error helper since we don't have the CLI package yet
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

// Base configuration schemas
const BaseProviderConfigSchema = z.object({
  enabled: z.boolean().default(false),
  name: z.string().min(1),
  type: z.enum(["ollama", "openai", "huggingface", "custom"]),
  priority: z.number().min(0).default(1),
  timeout: z.number().min(1000).default(30000),
  retries: z.number().min(0).default(3),
  metadata: z.record(z.unknown()).optional(),
});

// Ollama-specific configuration
const OllamaConfigSchema = BaseProviderConfigSchema.extend({
  type: z.literal("ollama"),
  url: z.string().url().default("http://localhost:11434"),
  models: z.array(z.string()).default([]),
  defaultModel: z.string().optional(),
  autoStart: z.boolean().default(true),
  autoPull: z.array(z.string()).default([]),
  gpu: z.boolean().optional(),
  dockerImage: z.string().default("ollama/ollama:latest"),
  volumePath: z.string().optional(),
  pullTimeout: z.number().min(60000).default(300000), // 5 minutes
  maxConcurrentRequests: z.number().min(1).default(10),
});

// OpenAI-specific configuration
const OpenAIConfigSchema = BaseProviderConfigSchema.extend({
  type: z.literal("openai"),
  apiKey: z.string().min(1),
  baseURL: z.string().url().optional(),
  organization: z.string().optional(),
  models: z.array(z.string()).default(["gpt-3.5-turbo", "gpt-4"]),
  defaultModel: z.string().default("gpt-3.5-turbo"),
  rateLimiting: z
    .object({
      requestsPerMinute: z.number().min(1).default(60),
      tokensPerMinute: z.number().min(1).default(40000),
      maxRetries: z.number().min(0).default(3),
      backoffFactor: z.number().min(1).default(2),
    })
    .optional(),
});

// HuggingFace-specific configuration
const HuggingFaceConfigSchema = BaseProviderConfigSchema.extend({
  type: z.literal("huggingface"),
  apiToken: z.string().optional(),
  endpoint: z.string().url().optional(),
  models: z.array(z.string()).default([]),
  defaultModel: z.string().optional(),
  useInferenceAPI: z.boolean().default(true),
  device: z.enum(["auto", "cpu", "cuda"]).default("auto"),
  modelCachePath: z.string().optional(),
});

// Custom provider configuration
const CustomProviderConfigSchema = BaseProviderConfigSchema.extend({
  type: z.literal("custom"),
  endpoint: z.string().url(),
  apiKey: z.string().optional(),
  headers: z.record(z.string()).optional(),
  models: z.array(z.string()).default([]),
  defaultModel: z.string().optional(),
});

// Union of all provider configurations
export const ProviderConfigSchema = z.discriminatedUnion("type", [
  OllamaConfigSchema,
  OpenAIConfigSchema,
  HuggingFaceConfigSchema,
  CustomProviderConfigSchema,
]);

// AI routing configuration
const AIRoutingConfigSchema = z.object({
  development: z.string().optional(),
  staging: z.string().optional(),
  production: z.string().optional(),
  default: z.string().optional(),
});

// AI feature configuration
const AIFeaturesConfigSchema = z.object({
  streaming: z.boolean().default(true),
  caching: z.boolean().default(true),
  rateLimiting: z.boolean().default(true),
  fallback: z.boolean().default(true),
  metrics: z.boolean().default(true),
  logging: z.boolean().default(true),
});

// Main AI configuration schema
export const AIConfigSchema = z.object({
  providers: z.record(ProviderConfigSchema).default({}),
  routing: AIRoutingConfigSchema.optional(),
  features: AIFeaturesConfigSchema.default({}),
  global: z
    .object({
      maxConcurrentRequests: z.number().min(1).default(50),
      requestTimeout: z.number().min(1000).default(30000),
      healthCheckInterval: z.number().min(5000).default(30000),
      cacheSize: z.number().min(0).default(1000),
      logLevel: z.enum(["debug", "info", "warn", "error"]).default("info"),
    })
    .default({}),
});

// Exported types
export type ProviderConfig = z.infer<typeof ProviderConfigSchema>;
export type OllamaConfig = z.infer<typeof OllamaConfigSchema>;
export type OpenAIConfig = z.infer<typeof OpenAIConfigSchema>;
export type HuggingFaceConfig = z.infer<typeof HuggingFaceConfigSchema>;
export type CustomProviderConfig = z.infer<typeof CustomProviderConfigSchema>;
export type AIRoutingConfig = z.infer<typeof AIRoutingConfigSchema>;
export type AIFeaturesConfig = z.infer<typeof AIFeaturesConfigSchema>;
export type AIConfig = z.infer<typeof AIConfigSchema>;

// Configuration manager class
/**
 * Manages AI provider configuration at runtime. Consumers can load, validate
 * and query provider settings using this class. It also emits a variety of
 * events whenever configuration values change.
 *
 * @extends EventEmitter
 */
export class AIConfigManager extends EventEmitter {
  private config: AIConfig;
  private environment: string;
  private configPath?: string;

  /**
   * Create a new configuration manager instance.
   *
   * @param initialConfig - Optional configuration overrides
   * @param environment - Current runtime environment
   */
  constructor(
    initialConfig?: Partial<AIConfig>,
    environment: string = "development"
  ) {
    super();
    this.environment = environment;
    this.config = this.validateAndNormalize(initialConfig || {});
  }

  // Configuration loading and validation
  /**
   * Load a configuration object and emit the appropriate events.
   *
   * @param config - Partial configuration to load
   */
  public loadConfig(config: Partial<AIConfig>): void {
    const previousConfig = { ...this.config };

    try {
      this.config = this.validateAndNormalize(config);
      this.emit("config-loaded", { config: this.config, previousConfig });
    } catch (error) {
      this.emit("config-error", { error, config });
      throw new Error(`Invalid AI configuration: ${getErrorMessage(error)}`);
    }
  }

  /**
   * Validate and normalize a configuration object using zod schemas.
   *
   * @param config - Partial configuration to validate
   * @returns The parsed and normalized configuration
   */
  public validateAndNormalize(config: Partial<AIConfig>): AIConfig {
    const result = AIConfigSchema.safeParse(config);

    if (!result.success) {
      const errorMessages = result.error.errors
        .map((err: any) => `${err.path.join(".")}: ${err.message}`)
        .join(", ");
      throw new Error(`Configuration validation failed: ${errorMessages}`);
    }

    return result.data;
  }

  // Configuration access
  /**
   * Retrieve a copy of the current configuration.
   */
  public getConfig(): AIConfig {
    return { ...this.config };
  }

  /**
   * Get the configuration object for a specific provider.
   *
   * @param name - Provider identifier
   */
  public getProviderConfig(name: string): ProviderConfig | undefined {
    return this.config.providers[name];
  }

  /**
   * Return configurations for all providers.
   */
  public getProviderConfigs(): Record<string, ProviderConfig> {
    return { ...this.config.providers };
  }

  /**
   * Retrieve only the providers that are currently enabled.
   */
  public getEnabledProviders(): Record<string, ProviderConfig> {
    return Object.fromEntries(
      Object.entries(this.config.providers).filter(
        ([_, config]: [string, ProviderConfig]) => config.enabled
      )
    );
  }

  /**
   * Get the configured provider routing table.
   */
  public getRoutingConfig(): AIRoutingConfig {
    return this.config.routing || {};
  }

  /**
   * Access the enabled feature configuration.
   */
  public getFeaturesConfig(): AIFeaturesConfig {
    return this.config.features;
  }

  /**
   * Retrieve global configuration settings shared across providers.
   */
  public getGlobalConfig(): AIConfig["global"] {
    return this.config.global;
  }

  // Provider routing
  /**
   * Determine which provider should be used for a given environment.
   *
   * @param environment - Optional environment override
   */
  public getProviderForEnvironment(environment?: string): string | undefined {
    const env = environment || this.environment;
    const routing = this.getRoutingConfig();

    // Check environment-specific routing
    const envProvider = routing[env as keyof AIRoutingConfig];
    if (envProvider && this.hasProvider(envProvider)) {
      return envProvider;
    }

    // Check default routing
    if (routing.default && this.hasProvider(routing.default)) {
      return routing.default;
    }

    // Fallback to first enabled provider
    const enabledProviders = this.getEnabledProviders();
    const firstProvider = Object.keys(enabledProviders)[0];
    return firstProvider;
  }

  /**
   * Shortcut for {@link getProviderForEnvironment} using the current environment.
   */
  public getDefaultProvider(): string | undefined {
    return this.getProviderForEnvironment();
  }

  /**
   * Return a list of enabled providers sorted by configured priority.
   */
  public getProvidersByPriority(): Array<{
    name: string;
    config: ProviderConfig;
  }> {
    return Object.entries(this.getEnabledProviders())
      .map(([name, config]) => ({ name, config }))
      .sort((a, b) => (b.config.priority || 1) - (a.config.priority || 1));
  }

  // Configuration updates
  /**
   * Update configuration for a named provider.
   *
   * @param name - Provider identifier
   * @param updates - Partial configuration updates
   */
  public updateProviderConfig(
    name: string,
    updates: Partial<ProviderConfig>
  ): void {
    const currentConfig = this.config.providers[name];
    if (!currentConfig) {
      throw new Error(`Provider "${name}" not found in configuration`);
    }

    const updatedConfig = { ...currentConfig, ...updates };
    const result = ProviderConfigSchema.safeParse(updatedConfig);

    if (!result.success) {
      throw new Error(
        `Invalid provider configuration: ${result.error.message}`
      );
    }

    this.config.providers[name] = result.data;
    this.emit("provider-config-updated", {
      name,
      config: result.data,
      updates,
    });
  }

  /**
   * Add a new provider configuration entry.
   *
   * @param name - Provider identifier
   * @param config - Provider configuration values
   */
  public addProvider(name: string, config: ProviderConfig): void {
    if (this.hasProvider(name)) {
      throw new Error(`Provider "${name}" already exists`);
    }

    const result = ProviderConfigSchema.safeParse(config);
    if (!result.success) {
      throw new Error(
        `Invalid provider configuration: ${result.error.message}`
      );
    }

    this.config.providers[name] = result.data;
    this.emit("provider-added", { name, config: result.data });
  }

  /**
   * Remove a provider from the configuration.
   *
   * @param name - Provider identifier
   * @returns `true` if the provider existed and was removed
   */
  public removeProvider(name: string): boolean {
    if (!this.hasProvider(name)) {
      return false;
    }

    delete this.config.providers[name];
    this.emit("provider-removed", { name });
    return true;
  }

  /**
   * Update the global feature configuration block.
   */
  public updateFeatures(updates: Partial<AIFeaturesConfig>): void {
    this.config.features = { ...this.config.features, ...updates };
    this.emit("features-updated", { features: this.config.features, updates });
  }

  /**
   * Update the provider routing configuration.
   */
  public updateRouting(updates: Partial<AIRoutingConfig>): void {
    this.config.routing = { ...this.config.routing, ...updates };
    this.emit("routing-updated", { routing: this.config.routing, updates });
  }

  // Utility methods
  /**
   * Check if a provider entry exists in the configuration.
   */
  public hasProvider(name: string): boolean {
    return name in this.config.providers;
  }

  /**
   * Determine if a provider is both configured and enabled.
   */
  public isProviderEnabled(name: string): boolean {
    const config = this.getProviderConfig(name);
    return config?.enabled || false;
  }

  /**
   * Check if a specific feature flag is enabled.
   */
  public isFeatureEnabled(feature: keyof AIFeaturesConfig): boolean {
    return this.config.features[feature] || false;
  }

  /**
   * Get all providers that match a specific implementation type.
   *
   * @param type - Provider type label
   */
  public getProvidersByType(
    type: ProviderConfig["type"]
  ): Array<{ name: string; config: ProviderConfig }> {
    return Object.entries(this.config.providers)
      .filter(([_, config]: [string, ProviderConfig]) => config.type === type)
      .map(([name, config]) => ({ name, config }));
  }

  // Environment management
  /**
   * Change the current environment and emit a change event.
   */
  public setEnvironment(environment: string): void {
    const previousEnvironment = this.environment;
    this.environment = environment;
    this.emit("environment-changed", { environment, previousEnvironment });
  }

  /**
   * Get the name of the currently configured environment.
   */
  public getEnvironment(): string {
    return this.environment;
  }

  // Configuration validation helpers
  /**
   * Validate a raw provider configuration object.
   *
   * @param config - Unknown object to validate
   * @returns Parsed provider configuration
   */
  public validateProviderConfig(config: unknown): ProviderConfig {
    const result = ProviderConfigSchema.safeParse(config);
    if (!result.success) {
      throw new Error(
        `Invalid provider configuration: ${result.error.message}`
      );
    }
    return result.data;
  }

  // Configuration serialization
  /**
   * Serialize the configuration to a plain object.
   */
  public toJSON(): AIConfig {
    return this.getConfig();
  }

  /**
   * Create a new {@link AIConfigManager} from a JSON string or object.
   */
  public static fromJSON(json: string | object): AIConfigManager {
    const config = typeof json === "string" ? JSON.parse(json) : json;
    return new AIConfigManager(config);
  }

  // Default configurations
  /**
   * Get a baseline configuration suitable for an Ollama provider.
   */
  public static getDefaultOllamaConfig(): OllamaConfig {
    return {
      enabled: true,
      name: "ollama",
      type: "ollama",
      url: "http://localhost:11434",
      models: ["llama3.1", "codestral", "phi3"],
      defaultModel: "llama3.1",
      autoStart: true,
      autoPull: ["llama3.1"],
      gpu: true,
      dockerImage: "ollama/ollama:latest",
      pullTimeout: 300000,
      maxConcurrentRequests: 10,
      priority: 1,
      timeout: 30000,
      retries: 3,
    };
  }

  /**
   * Get a baseline configuration for the OpenAI provider.
   *
   * @param apiKey - API key used for authentication
   */
  public static getDefaultOpenAIConfig(apiKey: string): OpenAIConfig {
    return {
      enabled: true,
      name: "openai",
      type: "openai",
      apiKey,
      models: ["gpt-4", "gpt-3.5-turbo"],
      defaultModel: "gpt-3.5-turbo",
      priority: 2,
      timeout: 30000,
      retries: 3,
      rateLimiting: {
        requestsPerMinute: 60,
        tokensPerMinute: 40000,
        maxRetries: 3,
        backoffFactor: 2,
      },
    };
  }
}

// Utility functions
/**
 * Create a minimal default configuration object conforming to the
 * {@link AIConfigSchema}. Useful for bootstrapping new projects.
 *
 * @returns {AIConfig} Parsed default configuration structure
 */
export function createDefaultAIConfig(): AIConfig {
  return AIConfigSchema.parse({
    providers: {},
    features: {},
    global: {},
  });
}

/**
 * Merge two AI configuration objects using the schema for validation. The
 * base configuration is overwritten by the values from `override`.
 *
 * @param base - The existing configuration values
 * @param override - A partial configuration to merge in
 * @returns {AIConfig} A new validated configuration object
 */
export function mergeAIConfigs(
  base: AIConfig,
  override: Partial<AIConfig>
): AIConfig {
  return AIConfigSchema.parse({
    ...base,
    ...override,
    providers: { ...base.providers, ...override.providers },
    features: { ...base.features, ...override.features },
    global: { ...base.global, ...override.global },
  });
}
