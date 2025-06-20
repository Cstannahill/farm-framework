// packages/ai/src/providers/base.ts
import { EventEmitter } from "events";
import type {
  ChatMessage,
  GenerationOptions,
  GenerationRequest,
  GenerationResponse,
  ModelInfo,
  ProviderStatus,
  AIProviderConfig as ProviderConfig,
  StreamChunk,
  ProviderHealthCheck,
  ProviderFactory,
  IProviderRegistry,
} from "@farm-framework/types";

/**
 * Contains foundational types and the {@link BaseAIProvider} abstract class
 * that all concrete AI provider implementations must extend. These definitions
 * establish a consistent interface for interacting with AI models and services
 * within the FARM framework.
 */

/**
 * Abstract base class that all AI provider implementations must extend. It
 * defines a common lifecycle and set of operations for interacting with AI
 * models regardless of the underlying service.
 *
 * @extends EventEmitter
 */
export abstract class BaseAIProvider extends EventEmitter {
  public readonly name: string;
  public readonly type: string;
  protected config: ProviderConfig;
  protected models: Map<string, ModelInfo> = new Map();
  protected isInitialized: boolean = false;

  constructor(name: string, type: string, config: ProviderConfig) {
    super();
    this.name = name;
    this.type = type;
    this.config = config;
  }

  // Abstract methods that must be implemented by providers
  abstract initialize(): Promise<void>;
  abstract cleanup(): Promise<void>;
  abstract healthCheck(): Promise<ProviderHealthCheck>;
  abstract listModels(): Promise<ModelInfo[]>;
  abstract loadModel(modelName: string): Promise<boolean>;
  abstract unloadModel(modelName: string): Promise<boolean>;
  abstract generate(request: GenerationRequest): Promise<GenerationResponse>;
  abstract generateStream(
    request: GenerationRequest
  ): AsyncIterable<StreamChunk>;

  // Common provider functionality
  /**
   * Determine whether the provider is healthy by invoking its {@link healthCheck}
   * method. Any errors are caught and emitted as an "error" event.
   *
   * @returns `true` when the provider reports a healthy status
   */
  public async isHealthy(): Promise<boolean> {
    try {
      const health = await this.healthCheck();
      return health.isHealthy;
    } catch (error) {
      this.emit("error", error);
      return false;
    }
  }

  /**
   * Get the current status information for the provider.
   *
   * @returns Structured status data describing the provider health
   */ public getStatus(): ProviderStatus {
    return {
      name: this.name,
      status: this.isInitialized ? "healthy" : "offline",
      models: Array.from(this.models.keys()),
      capabilities: this.getCapabilities(),
      lastChecked: Date.now(),
    };
  }

  /**
   * List the capabilities supported by this provider implementation.
   *
   * @returns Array of capability strings
   */
  public getCapabilities(): string[] {
    return ["chat", "completion"];
  }

  /**
   * Determine if a particular model is available from this provider.
   *
   * @param modelName - Name of the model to check
   * @returns `true` if the model has been registered
   */
  public hasModel(modelName: string): boolean {
    return this.models.has(modelName);
  }

  /**
   * Retrieve metadata about a specific model.
   *
   * @param modelName - Model identifier
   * @returns Model details if loaded
   */
  public getModel(modelName: string): ModelInfo | undefined {
    return this.models.get(modelName);
  }

  /**
   * Get a list of all models currently known to the provider.
   */
  public getAvailableModels(): ModelInfo[] {
    return Array.from(this.models.values());
  }

  /**
   * Update the provider configuration at runtime.
   *
   * @param newConfig - Partial configuration values to merge in
   */
  public updateConfig(newConfig: Partial<ProviderConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.emit("config-updated", this.config);
  }

  /**
   * Retrieve a copy of the current provider configuration.
   */
  public getConfig(): ProviderConfig {
    return { ...this.config };
  }

  // Event handlers for provider lifecycle
  /**
   * Notify listeners that a model has been loaded.
   *
   * @param model - Loaded model metadata
   */
  protected onModelLoaded(model: ModelInfo): void {
    this.models.set(model.name, model);
    this.emit("model-loaded", model);
  }

  /**
   * Notify listeners that a model has been unloaded.
   *
   * @param modelName - Identifier of the removed model
   */
  protected onModelUnloaded(modelName: string): void {
    this.models.delete(modelName);
    this.emit("model-unloaded", modelName);
  }

  /**
   * Emit a normalized error event for consumers.
   *
   * @param error - Error instance
   * @param context - Optional contextual message
   */
  protected onError(error: Error, context?: string): void {
    this.emit("error", { error, context, provider: this.name });
  }

  /**
   * Emit a status change event for monitoring tools.
   *
   * @param status - Updated provider status
   */
  protected onStatusChange(status: ProviderStatus): void {
    this.emit("status-change", status);
  }

  // Utility methods
  /**
   * Validate an incoming generation request and throw if invalid.
   *
   * @param request - Request payload to validate
   */
  protected validateRequest(request: GenerationRequest): void {
    if (!request.messages || request.messages.length === 0) {
      throw new Error("Messages array cannot be empty");
    }

    if (!request.model) {
      throw new Error("Model must be specified");
    }

    for (const message of request.messages) {
      if (!message.role || !message.content) {
        throw new Error("Each message must have role and content");
      }

      if (!["system", "user", "assistant"].includes(message.role)) {
        throw new Error(`Invalid message role: ${message.role}`);
      }
    }
  }

  /**
   * Helper to create a {@link GenerationResponse} object.
   *
   * @param content - Response body from the model
   * @param model - Name of the model producing the response
   * @param usage - Optional token usage information
   * @param metadata - Additional metadata to attach
   */
  protected createGenerationResponse(
    content: string,
    model: string,
    usage?: GenerationResponse["usage"],
    metadata?: Record<string, any>
  ): GenerationResponse {
    return {
      content,
      model,
      provider: this.name,
      usage,
      metadata,
    };
  }
}

// Re-export types from shared types
// Re-export types for other modules in this package
export type {
  ChatMessage,
  GenerationOptions,
  GenerationRequest,
  GenerationResponse,
  ModelInfo,
  ProviderStatus,
  StreamChunk,
  ProviderHealthCheck,
  ProviderFactory,
  IProviderRegistry,
} from "@farm-framework/types";
export type { AIProviderConfig as ProviderConfig } from "@farm-framework/types";

// Error classes implementing the shared interfaces
/**
 * Base error type thrown by provider implementations when an operation fails.
 */
export class ProviderError extends Error {
  constructor(
    message: string,
    public provider: string,
    public cause?: Error
  ) {
    super(message);
    this.name = "ProviderError";
  }
}

/**
 * Thrown when a requested model cannot be found by the provider.
 */
export class ModelNotFoundError extends ProviderError {
  constructor(model: string, provider: string) {
    super(`Model "${model}" not found in provider "${provider}"`, provider);
    this.name = "ModelNotFoundError";
  }
}

/**
 * Indicates that the provider service is currently unavailable.
 */
export class ProviderUnavailableError extends ProviderError {
  constructor(provider: string, cause?: Error) {
    super(`Provider "${provider}" is unavailable`, provider, cause);
    this.name = "ProviderUnavailableError";
  }
}

/**
 * Error thrown when a generation request is invalid or malformed.
 */
export class InvalidRequestError extends ProviderError {
  constructor(message: string, provider: string) {
    super(message, provider);
    this.name = "InvalidRequestError";
  }
}
