/**
 * AI/ML Integration Types
 */

export interface AIProvider {
  name: string;
  type: "ollama" | "openai" | "huggingface" | "custom";
  config: Record<string, any>;
  models: string[];
  capabilities: AICapability[];
}

export type AICapability =
  | "chat"
  | "completion"
  | "embedding"
  | "image"
  | "audio";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
  metadata?: Record<string, any>;
}

export interface ChatRequest {
  messages: ChatMessage[];
  model: string;
  provider?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

export interface ChatResponse {
  response: string;
  model: string;
  provider: string;
  usage?: TokenUsage;
  metadata?: Record<string, any>;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface ModelInfo {
  name: string;
  provider: string;
  size?: string;
  description?: string;
  capabilities: AICapability[];
  parameters?: Record<string, any>;
}

export interface ProviderStatus {
  name: string;
  status: "healthy" | "unhealthy" | "loading" | "offline";
  message?: string;
  models: string[];
  capabilities: string[];
  lastChecked?: number;
}

// Additional interfaces for AI provider system

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
  usage?: TokenUsage;
  metadata?: Record<string, any>;
}

export interface AIProviderConfig {
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

export interface ProviderFactory {
  create(name: string, config: AIProviderConfig): any; // BaseAIProvider
  supports(type: string): boolean;
}

export interface IProviderRegistry {
  register(factory: ProviderFactory): void;
  create(name: string, type: string, config: AIProviderConfig): any; // BaseAIProvider
  getAvailableTypes(): string[];
}

// Registry types
export interface RegistryConfig {
  defaultProvider?: string;
  fallbackProviders?: string[];
  timeout?: number;
}

export interface ProviderRegistryStatus {
  totalProviders: number;
  activeProviders: number;
  healthyProviders: number;
  lastHealthCheck: Date;
}

// Health check types
export interface HealthMetrics {
  responseTime: number;
  uptime: number;
  errorRate: number;
  requestCount: number;
  lastError?: string;
}

export interface HealthCheckOptions {
  timeout?: number;
  retries?: number;
  interval?: number;
}

export interface AIHealthCheck {
  name: string;
  description: string;
  execute(): Promise<HealthCheckResult>;
}

export interface HealthCheckResult {
  healthy: boolean;
  message?: string;
  metrics?: HealthMetrics;
  details?: Record<string, any>;
}

export interface ProviderHealthReport {
  provider: string;
  status: "healthy" | "unhealthy" | "unknown";
  checks: HealthCheckResult[];
  lastChecked: Date;
}

export interface SystemHealthReport {
  overall: "healthy" | "degraded" | "unhealthy";
  providers: ProviderHealthReport[];
  generatedAt: Date;
}
