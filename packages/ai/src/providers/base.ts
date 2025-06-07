// packages/ai/src/providers/base.ts
import { EventEmitter } from "events";

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
  create(name: string, config: ProviderConfig): BaseAIProvider;
  supports(type: string): boolean;
}

// Provider registry interface
export interface IProviderRegistry {
  register(factory: ProviderFactory): void;
  create(name: string, type: string, config: ProviderConfig): BaseAIProvider;
  getAvailableTypes(): string[];
}

// Error types
export class ProviderError extends Error {
  constructor(message: string, public provider: string, public cause?: Error) {
    super(message);
    this.name = "ProviderError";
  }
}

export class ModelNotFoundError extends ProviderError {
  constructor(model: string, provider: string) {
    super(`Model "${model}" not found in provider "${provider}"`, provider);
    this.name = "ModelNotFoundError";
  }
}

export class ProviderUnavailableError extends ProviderError {
  constructor(provider: string, cause?: Error) {
    super(`Provider "${provider}" is unavailable`, provider, cause);
    this.name = "ProviderUnavailableError";
  }
}

export class InvalidRequestError extends ProviderError {
  constructor(message: string, provider: string) {
    super(message, provider);
    this.name = "InvalidRequestError";
  }
}
