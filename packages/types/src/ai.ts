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
}

export interface ProviderStatus {
  name: string;
  status: "healthy" | "unhealthy" | "loading";
  models: string[];
  lastChecked?: number;
}
