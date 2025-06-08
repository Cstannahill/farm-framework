// packages/ai/src/index.ts - Main integration example
import { EventEmitter } from "events";
import {
  BaseAIProvider,
  GenerationRequest,
  GenerationResponse,
} from "./providers/base.js";
import {
  ProviderRegistry,
  globalProviderRegistry,
} from "./registry/provider-registry.js";
import {
  AIConfigManager,
  AIConfig,
  type ProviderConfig,
  type OllamaConfig,
  type OpenAIConfig,
  type HuggingFaceConfig,
  type CustomProviderConfig,
} from "./config/ai-config.js";
import { HealthChecker } from "./health/health-checker.js";
import { AIErrorHandler, globalErrorHandler } from "./errors/error-handler.js";

// Main AI System class that orchestrates all components
/**
 * High level API that coordinates provider registration, configuration and
 * request routing for the FARM AI system.
 */
export class AISystem extends EventEmitter {
  private configManager: AIConfigManager;
  private registry: ProviderRegistry;
  private healthChecker: HealthChecker;
  private errorHandler: AIErrorHandler;
  private isInitialized: boolean = false;

  /**
   * Create a new AI system instance.
   *
   * @param config - Optional configuration overrides
   * @param environment - Runtime environment name
   */
  constructor(config?: Partial<AIConfig>, environment: string = "development") {
    super();

    // Initialize components
    this.configManager = new AIConfigManager(config, environment);
    this.registry = globalProviderRegistry;
    this.healthChecker = new HealthChecker(this.registry);
    this.errorHandler = globalErrorHandler;

    this.setupEventHandlers();
  }

  // System initialization
  /**
   * Initialize the AI system and register configured providers.
   */
  public async initialize(): Promise<void> {
    try {
      console.log("🤖 Initializing FARM AI System...");

      // Load and validate configuration
      const config = this.configManager.getConfig();
      console.log(
        `📋 Configuration loaded for environment: ${this.configManager.getEnvironment()}`
      );

      // Register provider factories (these would be imported from actual provider implementations)
      // this.registry.register(new OllamaProviderFactory());
      // this.registry.register(new OpenAIProviderFactory());
      // this.registry.register(new HuggingFaceProviderFactory());

      // Create and initialize providers from configuration
      await this.initializeProvidersFromConfig(config);

      // Start health monitoring
      this.healthChecker.startMonitoring();
      console.log("🏥 Health monitoring started");

      // Start provider registry health checks
      this.registry.startHealthMonitoring();

      this.isInitialized = true;
      this.emit("initialized");
      console.log("✅ FARM AI System initialized successfully");
    } catch (error: any) {
      const aiError = this.errorHandler.handleError(error, {
        operation: "system-initialization",
        timestamp: new Date(),
      });

      this.emit("initialization-failed", aiError);
      throw aiError;
    }
  }

  // Main AI generation method with full error handling and provider routing
  /**
   * Generate a response using the best available provider.
   *
   * @param request - The generation request parameters
   * @param preferredProvider - Optional provider preference
   */
  public async generate(
    request: GenerationRequest,
    preferredProvider?: string
  ): Promise<GenerationResponse> {
    if (!this.isInitialized) {
      throw new Error("AI System not initialized. Call initialize() first.");
    }

    return this.errorHandler.executeWithRetry(
      async () => {
        // Get the best available provider
        const provider = await this.selectProvider(preferredProvider);
        if (!provider) {
          throw new Error("No healthy AI providers available");
        }

        console.log(`🚀 Generating response using provider: ${provider.name}`);

        // Execute the generation request
        const response = await provider.generate(request);

        this.emit("generation-complete", {
          provider: provider.name,
          model: request.model,
          tokensUsed: response.usage?.totalTokens || 0,
        });

        return response;
      },
      {
        provider: preferredProvider,
        model: request.model,
        operation: "generate",
        timestamp: new Date(),
      }
    );
  }

  // Streaming generation with error handling
  /**
   * Stream a response from the underlying provider.
   *
   * @param request - The generation request parameters
   * @param preferredProvider - Optional provider preference
   */
  public async *generateStream(
    request: GenerationRequest,
    preferredProvider?: string
  ): AsyncGenerator<any, void, unknown> {
    if (!this.isInitialized) {
      throw new Error("AI System not initialized. Call initialize() first.");
    }

    const provider = await this.selectProvider(preferredProvider);
    if (!provider) {
      throw new Error("No healthy AI providers available");
    }

    console.log(
      `🌊 Starting stream generation using provider: ${provider.name}`
    );

    try {
      for await (const chunk of provider.generateStream(request)) {
        yield chunk;
      }
    } catch (error: unknown) {
      const aiError = this.errorHandler.handleError(error as Error, {
        provider: provider.name,
        model: request.model,
        operation: "generateStream",
        timestamp: new Date(),
      });
      throw aiError;
    }
  }

  // Provider management
  /**
   * Dynamically add a provider at runtime.
   *
   * @param name - Identifier for the provider
   * @param config - Provider specific configuration
   */
  public async addProvider(
    name: string,
    config: ProviderConfig
  ): Promise<void> {
    try {
      // Add to configuration
      this.configManager.addProvider(name, config);

      // Create and add to registry
      await this.registry.addProvider(name, config.type, config);

      console.log(`✅ Provider "${name}" added successfully`);
      this.emit("provider-added", { name, config });
    } catch (error: any) {
      const aiError = this.errorHandler.handleError(error, {
        provider: name,
        operation: "add-provider",
        timestamp: new Date(),
      });
      throw aiError;
    }
  }

  /**
   * Remove an existing provider from the system.
   *
   * @param name - Provider identifier
   */
  public async removeProvider(name: string): Promise<void> {
    try {
      // Remove from registry
      await this.registry.removeProvider(name);

      // Remove from configuration
      this.configManager.removeProvider(name);

      console.log(`🗑️ Provider "${name}" removed successfully`);
      this.emit("provider-removed", { name });
    } catch (error: any) {
      const aiError = this.errorHandler.handleError(error, {
        provider: name,
        operation: "remove-provider",
        timestamp: new Date(),
      });
      throw aiError;
    }
  }

  // Health and status monitoring
  /**
   * Retrieve combined health information for all providers.
   */
  public async getSystemHealth(): Promise<any> {
    try {
      const [registryStatus, healthReport] = await Promise.all([
        this.registry.checkAllHealth(),
        this.healthChecker.checkAllProviders(),
      ]);

      return {
        status: healthReport.status,
        providers: healthReport.providers,
        registry: registryStatus,
        metrics: this.errorHandler.getMetrics(),
        lastUpdate: new Date(),
      };
    } catch (error: any) {
      const aiError = this.errorHandler.handleError(error, {
        operation: "health-check",
        timestamp: new Date(),
      });
      throw aiError;
    }
  }

  // Configuration management
  /**
   * Update the AI system configuration at runtime.
   */
  public updateConfiguration(updates: Partial<AIConfig>): void {
    try {
      this.configManager.loadConfig({
        ...this.configManager.getConfig(),
        ...updates,
      });

      this.emit("configuration-updated", updates);
      console.log("⚙️ Configuration updated");
    } catch (error: any) {
      const aiError = this.errorHandler.handleError(error, {
        operation: "update-configuration",
        timestamp: new Date(),
      });
      throw aiError;
    }
  }

  // Graceful shutdown
  /**
   * Gracefully shut down all providers and stop monitoring.
   */
  public async shutdown(): Promise<void> {
    try {
      console.log("🛑 Shutting down FARM AI System...");

      // Stop monitoring
      this.healthChecker.stopMonitoring();
      this.registry.stopHealthMonitoring();

      // Shutdown all providers
      await this.registry.shutdownAll();

      this.isInitialized = false;
      this.emit("shutdown");
      console.log("✅ FARM AI System shutdown complete");
    } catch (error: any) {
      console.error("❌ Error during shutdown:", error);
    }
  }

  // Private helper methods
  private async initializeProvidersFromConfig(config: AIConfig): Promise<void> {
    const enabledProviders = this.configManager.getEnabledProviders();

    for (const [name, providerConfig] of Object.entries(enabledProviders)) {
      try {
        console.log(`🔧 Initializing provider: ${name}`);
        await this.registry.addProvider(
          name,
          providerConfig.type,
          providerConfig
        );
        console.log(`✅ Provider "${name}" initialized`);
      } catch (error: any) {
        console.warn(
          `⚠️ Failed to initialize provider "${name}":`,
          error.message
        );

        // Don't fail system initialization for optional providers
        if (providerConfig.type !== "ollama") {
          throw error;
        }
      }
    }
  }

  private async selectProvider(
    preferredProvider?: string
  ): Promise<BaseAIProvider | null> {
    // If a specific provider is requested, try to use it
    if (preferredProvider) {
      const provider = this.registry.getProvider(preferredProvider);
      if (provider && (await provider.isHealthy())) {
        return provider;
      }
    }

    // Fall back to environment-based routing
    const defaultProviderName = this.configManager.getDefaultProvider();
    if (defaultProviderName) {
      const provider = this.registry.getProvider(defaultProviderName);
      if (provider && (await provider.isHealthy())) {
        return provider;
      }
    }

    // Last resort: get any healthy provider
    return await this.registry.getHealthyProvider();
  }

  private setupEventHandlers(): void {
    // Configuration events
    this.configManager.on("provider-added", (event) => {
      console.log(`📋 Provider "${event.name}" added to configuration`);
    });

    this.configManager.on("provider-config-updated", (event) => {
      console.log(`📋 Provider "${event.name}" configuration updated`);
    });

    // Registry events
    this.registry.on("provider-error", (event) => {
      console.warn(`⚠️ Provider "${event.name}" error:`, event.error.message);
    });

    this.registry.on("provider-recovered", (event) => {
      console.log(
        `🔄 Provider "${event.name}" recovered after ${event.attempt} attempts`
      );
    });

    // Health checker events
    this.healthChecker.on("provider-unhealthy", (report) => {
      console.warn(
        `🏥 Provider "${report.provider}" is unhealthy: ${report.overall.message}`
      );
    });

    // Error handler events
    this.errorHandler.on("retry-attempt", (event) => {
      console.log(
        `🔄 Retrying operation (${event.attempt}/${event.maxRetries}): ${event.operationId}`
      );
    });

    this.errorHandler.on("retry-success", (event) => {
      console.log(
        `✅ Operation succeeded after ${event.attempt} retries: ${event.operationId}`
      );
    });
  }

  // Getters for accessing components
  public get config(): AIConfigManager {
    return this.configManager;
  }

  public get providers(): ProviderRegistry {
    return this.registry;
  }

  public get health(): HealthChecker {
    return this.healthChecker;
  }

  public get errors(): AIErrorHandler {
    return this.errorHandler;
  }
}

// Example usage
export async function exampleUsage() {
  // Create AI system with configuration
  const aiSystem = new AISystem(
    {
      providers: {
        ollama: {
          enabled: true,
          name: "ollama",
          type: "ollama",
          url: "http://localhost:11434",
          models: ["llama3.1"],
          defaultModel: "llama3.1",
          autoStart: true,
          autoPull: ["llama3.1"],
          priority: 1,
          timeout: 60_000,
          retries: 2,
          dockerImage: "ollama/ollama:latest",
          pullTimeout: 300_000,
          maxConcurrentRequests: 4,
        },
        openai: {
          enabled: true,
          name: "openai",
          type: "openai",
          apiKey: process.env.OPENAI_API_KEY || "",
          models: ["gpt-3.5-turbo"],
          defaultModel: "gpt-3.5-turbo",
          priority: 2,
          timeout: 60_000,
          retries: 2,
        },
      },
      routing: {
        development: "ollama",
        production: "openai",
      },
      features: {
        streaming: true,
        caching: true,
        fallback: true,
        rateLimiting: false,
        metrics: false,
        logging: true,
      },
    },
    "development"
  );

  try {
    // Initialize the system
    await aiSystem.initialize();

    // Generate a response
    const response = await aiSystem.generate({
      messages: [{ role: "user", content: "Hello, how are you?" }],
      model: "llama3.1",
    });

    console.log("Response:", response.content);

    // Check system health
    const health = await aiSystem.getSystemHealth();
    console.log("System Health:", health.status);

    // Graceful shutdown
    await aiSystem.shutdown();
  } catch (error) {
    console.error("AI System Error:", error);
  }
}

// Export all components for external use
export { BaseAIProvider, ProviderRegistry, AIConfigManager, HealthChecker };
export {
  AIErrorHandler,
  // Error types
  NetworkError,
  AuthenticationError,
  RateLimitError,
  ModelError,
  ValidationError,
  TimeoutError,
  ConfigurationError,
  ProviderUnavailableError,
} from "./errors/error-handler.js";

export type {
  AIConfig,
  ProviderConfig,
  OllamaConfig,
  OpenAIConfig,
  HuggingFaceConfig,
} from "./config/ai-config.js";

export type {
  ChatMessage,
  GenerationRequest,
  GenerationResponse,
  ModelInfo,
  ProviderStatus,
} from "./providers/base.js";
