// packages/ai/src/registry/provider-registry.ts
import { EventEmitter } from "events";
import {
  BaseAIProvider,
  ProviderFactory,
  IProviderRegistry,
  ProviderConfig,
  ProviderStatus,
  ProviderError,
} from "../providers/base.js";
import { getErrorMessage } from "@farm-framework/cli";
export interface RegistryConfig {
  healthCheckInterval?: number;
  maxRetries?: number;
  retryDelay?: number;
  enableAutoRecovery?: boolean;
}

export interface ProviderRegistryStatus {
  totalProviders: number;
  healthyProviders: number;
  unhealthyProviders: number;
  providers: Record<string, ProviderStatus>;
  lastUpdate: Date;
}

export class ProviderRegistry
  extends EventEmitter
  implements IProviderRegistry
{
  private factories: Map<string, ProviderFactory> = new Map();
  private providers: Map<string, BaseAIProvider> = new Map();
  private healthCheckTimer?: NodeJS.Timeout;
  private config: Required<RegistryConfig>;

  constructor(config: RegistryConfig = {}) {
    super();
    this.config = {
      healthCheckInterval: 30000, // 30 seconds
      maxRetries: 3,
      retryDelay: 1000, // 1 second
      enableAutoRecovery: true,
      ...config,
    };
  }

  // Factory management
  public register(factory: ProviderFactory): void {
    for (const type of this.getFactoryTypes(factory)) {
      if (this.factories.has(type)) {
        throw new Error(
          `Provider factory for type "${type}" is already registered`
        );
      }
      this.factories.set(type, factory);
      this.emit("factory-registered", { type, factory });
    }
  }

  public unregister(type: string): boolean {
    const removed = this.factories.delete(type);
    if (removed) {
      this.emit("factory-unregistered", { type });
    }
    return removed;
  }

  public getAvailableTypes(): string[] {
    return Array.from(this.factories.keys());
  }

  // Provider management
  public create(
    name: string,
    type: string,
    config: ProviderConfig
  ): BaseAIProvider {
    const factory = this.factories.get(type);
    if (!factory) {
      throw new Error(`No factory registered for provider type: ${type}`);
    }

    if (this.providers.has(name)) {
      throw new Error(`Provider with name "${name}" already exists`);
    }

    try {
      const provider = factory.create(name, config);
      this.setupProviderEventHandlers(provider);
      this.providers.set(name, provider);

      this.emit("provider-created", { name, type, provider });
      return provider;
    } catch (error) {
      throw new ProviderError(
        `Failed to create provider "${name}": ${getErrorMessage(error)}`,
        name,
        error as Error
      );
    }
  }

  public async addProvider(
    name: string,
    type: string,
    config: ProviderConfig
  ): Promise<BaseAIProvider> {
    const provider = this.create(name, type, config);

    try {
      await provider.initialize();
      this.emit("provider-added", { name, provider });
      return provider;
    } catch (error) {
      this.providers.delete(name);
      throw new ProviderError(
        `Failed to initialize provider "${name}": ${getErrorMessage(error)}`,
        name,
        error as Error
      );
    }
  }

  public async removeProvider(name: string): Promise<boolean> {
    const provider = this.providers.get(name);
    if (!provider) {
      return false;
    }

    try {
      await provider.cleanup();
    } catch (error) {
      console.warn(`Error during provider cleanup: ${getErrorMessage(error)}`);
    }

    this.providers.delete(name);
    this.emit("provider-removed", { name });
    return true;
  }

  public getProvider(name: string): BaseAIProvider | undefined {
    return this.providers.get(name);
  }

  public getAllProviders(): Map<string, BaseAIProvider> {
    return new Map(this.providers);
  }

  public hasProvider(name: string): boolean {
    return this.providers.has(name);
  }

  // Health management
  public async checkAllHealth(): Promise<ProviderRegistryStatus> {
    const providers: Record<string, ProviderStatus> = {};
    let healthyCount = 0;
    let unhealthyCount = 0;

    for (const [name, provider] of this.providers) {
      try {
        const health = await provider.healthCheck();
        const status: ProviderStatus = {
          name: provider.name,
          status: health.isHealthy ? "healthy" : "unhealthy",
          message: health.message,
          models: health.models || [],
          capabilities: health.capabilities || [],
          lastChecked: new Date(),
        };

        providers[name] = status;

        if (health.isHealthy) {
          healthyCount++;
        } else {
          unhealthyCount++;
          this.emit("provider-unhealthy", { name, status });
        }
      } catch (error) {
        const status: ProviderStatus = {
          name: provider.name,
          status: "unhealthy",
          message: getErrorMessage(error),
          models: [],
          capabilities: [],
          lastChecked: new Date(),
        };

        providers[name] = status;
        unhealthyCount++;
        this.emit("provider-error", { name, error });
      }
    }

    const registryStatus: ProviderRegistryStatus = {
      totalProviders: this.providers.size,
      healthyProviders: healthyCount,
      unhealthyProviders: unhealthyCount,
      providers,
      lastUpdate: new Date(),
    };

    this.emit("health-check-complete", registryStatus);
    return registryStatus;
  }

  public startHealthMonitoring(): void {
    if (this.healthCheckTimer) {
      this.stopHealthMonitoring();
    }

    this.healthCheckTimer = setInterval(async () => {
      try {
        await this.checkAllHealth();
      } catch (error) {
        this.emit("health-check-error", error);
      }
    }, this.config.healthCheckInterval);

    this.emit("health-monitoring-started");
  }

  public stopHealthMonitoring(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = undefined;
      this.emit("health-monitoring-stopped");
    }
  }

  // Provider selection and routing
  public async getHealthyProvider(
    preferredNames?: string[]
  ): Promise<BaseAIProvider | null> {
    const status = await this.checkAllHealth();

    // First try preferred providers
    if (preferredNames) {
      for (const name of preferredNames) {
        const provider = this.providers.get(name);
        if (provider && status.providers[name]?.status === "healthy") {
          return provider;
        }
      }
    }

    // Fallback to any healthy provider
    for (const [name, providerStatus] of Object.entries(status.providers)) {
      if (providerStatus.status === "healthy") {
        return this.providers.get(name) || null;
      }
    }

    return null;
  }

  public getProvidersByCapability(capability: string): BaseAIProvider[] {
    return Array.from(this.providers.values()).filter((provider) =>
      provider.getCapabilities().includes(capability)
    );
  }

  // Lifecycle management
  public async initializeAll(): Promise<void> {
    const initPromises = Array.from(this.providers.values()).map(
      async (provider) => {
        try {
          await provider.initialize();
          this.emit("provider-initialized", { name: provider.name });
        } catch (error) {
          this.emit("provider-initialization-failed", {
            name: provider.name,
            error: getErrorMessage(error),
          });
          throw error;
        }
      }
    );

    await Promise.allSettled(initPromises);
  }

  public async shutdownAll(): Promise<void> {
    this.stopHealthMonitoring();

    const shutdownPromises = Array.from(this.providers.values()).map(
      async (provider) => {
        try {
          await provider.cleanup();
          this.emit("provider-shutdown", { name: provider.name });
        } catch (error) {
          console.warn(
            `Error shutting down provider ${provider.name}: ${getErrorMessage(
              error
            )}`
          );
        }
      }
    );

    await Promise.allSettled(shutdownPromises);
    this.providers.clear();
    this.emit("registry-shutdown");
  }

  // Configuration management
  public updateProviderConfig(
    name: string,
    config: Partial<ProviderConfig>
  ): void {
    const provider = this.providers.get(name);
    if (!provider) {
      throw new Error(`Provider "${name}" not found`);
    }

    provider.updateConfig(config);
    this.emit("provider-config-updated", { name, config });
  }

  // Private helper methods
  private setupProviderEventHandlers(provider: BaseAIProvider): void {
    provider.on("error", (error) => {
      this.emit("provider-error", { name: provider.name, error });

      if (this.config.enableAutoRecovery) {
        this.attemptProviderRecovery(provider);
      }
    });

    provider.on("status-change", (status) => {
      this.emit("provider-status-change", { name: provider.name, status });
    });

    provider.on("model-loaded", (model) => {
      this.emit("model-loaded", { provider: provider.name, model });
    });

    provider.on("model-unloaded", (modelName) => {
      this.emit("model-unloaded", { provider: provider.name, modelName });
    });
  }

  private async attemptProviderRecovery(
    provider: BaseAIProvider
  ): Promise<void> {
    const maxRetries = this.config.maxRetries;
    const retryDelay = this.config.retryDelay;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        this.emit("provider-recovery-attempt", {
          name: provider.name,
          attempt,
          maxRetries,
        });

        await new Promise((resolve) =>
          setTimeout(resolve, retryDelay * attempt)
        );

        const health = await provider.healthCheck();
        if (health.isHealthy) {
          this.emit("provider-recovered", { name: provider.name, attempt });
          return;
        }
      } catch (error) {
        if (attempt === maxRetries) {
          this.emit("provider-recovery-failed", {
            name: provider.name,
            attempts: maxRetries,
            lastError: getErrorMessage(error),
          });
        }
      }
    }
  }

  private getFactoryTypes(factory: ProviderFactory): string[] {
    // Get all supported types from factory
    const commonTypes = ["ollama", "openai", "huggingface", "custom"];
    return commonTypes.filter((type) => factory.supports(type));
  }
}

// Singleton instance for global access
export const globalProviderRegistry = new ProviderRegistry();
