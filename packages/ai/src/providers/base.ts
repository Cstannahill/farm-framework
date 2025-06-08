// packages/ai/src/providers/base.ts
import { EventEmitter } from "events";

/**
 * Contains foundational types and the {@link BaseAIProvider} abstract class
 * that all concrete AI provider implementations must extend. These definitions
 * establish a consistent interface for interacting with AI models and services
 * within the FARM framework.
 */

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
  metadata?: Record<string, any>;
}

export interface GenerationOptions {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stopSequences?: string[];
  metadata?: Record<string, any>;
}

export interface GenerationRequest {
  messages: ChatMessage[];
  model: string;
  options?: GenerationOptions;
  stream?: boolean;
}

export interface GenerationResponse {
  content: string;
  model: string;
  provider: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  metadata?: Record<string, any>;
}

export interface ModelInfo {
  name: string;
  provider: string;
  size?: string;
  description?: string;
  capabilities: string[];
  parameters?: Record<string, any>;
}

export interface ProviderStatus {
  name: string;
  status: "healthy" | "unhealthy" | "loading" | "offline";
  message?: string;
  models: string[];
  capabilities: string[];
  lastChecked: Date;
}

export interface ProviderConfig {
  enabled: boolean;
  name: string;
  type: "ollama" | "openai" | "huggingface" | "custom";
}

export interface StreamChunk {
  content: string;
  done: boolean;
  metadata?: Record<string, any>;
}

export interface ProviderHealthCheck {
  isHealthy: boolean;
  message?: string;
  latency?: number;
  capabilities?: string[];
  models?: string[];
}

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
  public async isHealthy(): Promise<boolean> {
    try {
      const health = await this.healthCheck();
      return health.isHealthy;
    } catch (error) {
      this.emit("error", error);
      return false;
    }
  }

  public getStatus(): ProviderStatus {
    return {
      name: this.name,
      status: this.isInitialized ? "healthy" : "offline",
      models: Array.from(this.models.keys()),
      capabilities: this.getCapabilities(),
      lastChecked: new Date(),
    };
  }

  public getCapabilities(): string[] {
    return ["chat", "completion"];
  }

  public hasModel(modelName: string): boolean {
    return this.models.has(modelName);
  }

  public getModel(modelName: string): ModelInfo | undefined {
    return this.models.get(modelName);
  }

  public getAvailableModels(): ModelInfo[] {
    return Array.from(this.models.values());
  }

  public updateConfig(newConfig: Partial<ProviderConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.emit("config-updated", this.config);
  }

  public getConfig(): ProviderConfig {
    return { ...this.config };
  }

  // Event handlers for provider lifecycle
  protected onModelLoaded(model: ModelInfo): void {
    this.models.set(model.name, model);
    this.emit("model-loaded", model);
  }

  protected onModelUnloaded(modelName: string): void {
    this.models.delete(modelName);
    this.emit("model-unloaded", modelName);
  }

  protected onError(error: Error, context?: string): void {
    this.emit("error", { error, context, provider: this.name });
  }

  protected onStatusChange(status: ProviderStatus): void {
    this.emit("status-change", status);
  }

  // Utility methods
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

// Provider factory interface
export interface ProviderFactory {
  /**
   * Create a new provider instance given a name and configuration.
   *
   * @param name - Unique provider identifier
   * @param config - Provider configuration object
   */
  create(name: string, config: ProviderConfig): BaseAIProvider;

  /**
   * Determine if this factory supports the given provider type.
   *
   * @param type - Provider type string
   */
  supports(type: string): boolean;
}

// Provider registry interface
export interface IProviderRegistry {
  /** Register a provider factory */
  register(factory: ProviderFactory): void;
  /** Create and register a provider instance */
  create(name: string, type: string, config: ProviderConfig): BaseAIProvider;
  /** Get a list of supported provider types */
  getAvailableTypes(): string[];
}

// Error types
/**
 * Base error type thrown by provider implementations when an operation fails.
 */
export class ProviderError extends Error {
  constructor(message: string, public provider: string, public cause?: Error) {
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
