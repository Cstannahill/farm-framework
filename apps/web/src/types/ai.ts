// apps/web/src/types/ai.ts (auto-generated from FastAPI OpenAPI schema)
// AI Types for FARM Framework - supports Ollama, OpenAI, and HuggingFace

// =============================================================================
// Core AI Types
// =============================================================================

export interface ChatMessage {
  role: "system" | "user" | "assistant" | "function";
  content: string;
  timestamp?: string;
}

export interface ChatRequest {
  messages: ChatMessage[];
  model: string;
  provider?: "ollama" | "openai" | "huggingface";
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  systemPrompt?: string;
}

export interface ChatResponse {
  response: string;
  model: string;
  provider: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason?: "stop" | "length" | "error";
  timestamp: string;
}

export interface StreamingChatChunk {
  content: string;
  done: boolean;
  model?: string;
  provider?: string;
}

// =============================================================================
// Model Management Types
// =============================================================================

export interface ModelInfo {
  name: string;
  provider: "ollama" | "openai" | "huggingface";
  size?: string;
  description?: string;
  parameters?: number;
  family?: string;
  format?: string;
  quantization?: string;
  capabilities?: ModelCapability[];
}

export type ModelCapability =
  | "text-generation"
  | "chat"
  | "embeddings"
  | "code-generation"
  | "function-calling";

export interface ModelLoadRequest {
  modelName: string;
  provider?: string;
  force?: boolean;
}

export interface ModelLoadResponse {
  message: string;
  status: "loading" | "loaded" | "error";
  progress?: number;
}

// =============================================================================
// Provider Health Types
// =============================================================================

export interface ProviderStatus {
  name: string;
  status: "healthy" | "unhealthy" | "loading" | "unreachable";
  models: string[];
  capabilities?: ModelCapability[];
  url?: string;
  version?: string;
  lastChecked: string;
  error?: string;
}

export interface ProviderHealthResponse {
  [providerName: string]: ProviderStatus;
}

// =============================================================================
// Configuration Types
// =============================================================================

export interface OllamaConfig {
  enabled: boolean;
  url?: string;
  models: string[];
  defaultModel: string;
  autoStart?: boolean;
  autoPull?: string[];
  gpu?: boolean;
}

export interface OpenAIConfig {
  enabled: boolean;
  apiKey?: string;
  models: string[];
  defaultModel: string;
  rateLimiting?: {
    requestsPerMinute?: number;
    tokensPerMinute?: number;
  };
}

export interface HuggingFaceConfig {
  enabled: boolean;
  token?: string;
  models: string[];
  device?: "auto" | "cpu" | "cuda";
}

export interface AIProviderConfig {
  ollama?: OllamaConfig;
  openai?: OpenAIConfig;
  huggingface?: HuggingFaceConfig;
}

// =============================================================================
// Error Types
// =============================================================================

export interface AIError {
  code: string;
  message: string;
  provider?: string;
  model?: string;
  details?: Record<string, any>;
}

export interface AIErrorResponse {
  error: AIError;
  timestamp: string;
}

// =============================================================================
// API Request/Response Types (Generated from FastAPI)
// =============================================================================

// Chat endpoints
export interface PostAiChatRequest extends ChatRequest {}
export interface PostAiChatResponse extends ChatResponse {}

// Streaming chat
export interface PostAiChatStreamRequest extends ChatRequest {
  stream: true;
}

// Models endpoint
export interface GetAiModelsRequest {
  provider?: "ollama" | "openai" | "huggingface";
}
export interface GetAiModelsResponse {
  models: ModelInfo[];
  provider?: string;
}

// Health endpoint
export interface GetAiHealthRequest {}
export interface GetAiHealthResponse extends ProviderHealthResponse {}

// Model loading
export interface PostAiModelsModelNameLoadRequest extends ModelLoadRequest {}
export interface PostAiModelsModelNameLoadResponse extends ModelLoadResponse {}

// =============================================================================
// Hook Types
// =============================================================================

export interface UseStreamingChatOptions {
  provider?: "ollama" | "openai" | "huggingface";
  model?: string;
  initialMessages?: ChatMessage[];
  onMessage?: (message: ChatMessage) => void;
  onError?: (error: Error) => void;
  onStreamStart?: () => void;
  onStreamEnd?: () => void;
}

export interface UseStreamingChatReturn {
  messages: ChatMessage[];
  currentResponse: string;
  isStreaming: boolean;
  sendMessage: (
    content: string,
    options?: Partial<ChatRequest>
  ) => Promise<void>;
  stopGeneration: () => void;
  clearMessages: () => void;
  regenerateLastResponse: () => void;
  provider: string;
}

export interface UseAIProviderReturn {
  selectedProvider: string | null;
  selectedModel: string | null;
  availableProviders: string[];
  availableModels: ModelInfo[];
  switchProvider: (provider: string, model?: string) => void;
  setSelectedModel: (model: string) => void;
  providerHealth: ProviderHealthResponse | undefined;
}

// =============================================================================
// Component Props Types
// =============================================================================

export interface StreamingChatWindowProps {
  provider?: "ollama" | "openai" | "huggingface";
  model?: string;
  placeholder?: string;
  className?: string;
  onMessageSent?: (message: string) => void;
  onResponseReceived?: (response: string) => void;
  maxHeight?: string;
  showProviderInfo?: boolean;
  initialMessages?: ChatMessage[];
  systemPrompt?: string;
}

export interface AIModelSelectorProps {
  onProviderChange?: (provider: string) => void;
  onModelChange?: (model: string) => void;
  className?: string;
  showHealth?: boolean;
  filter?: {
    capabilities?: ModelCapability[];
    providers?: string[];
  };
}

export interface AIHealthDashboardProps {
  className?: string;
  refreshInterval?: number;
  showDetails?: boolean;
}

export interface AIInferenceStatusProps {
  provider?: string;
  model?: string;
  showDetails?: boolean;
  className?: string;
}

// =============================================================================
// Utility Types
// =============================================================================

export type AIProviderName = "ollama" | "openai" | "huggingface";

export type ChatRole = "system" | "user" | "assistant";

export type ModelSize = "small" | "medium" | "large" | "xl";

export type InferenceMode = "streaming" | "batch";

// =============================================================================
// Advanced Types for Future Features
// =============================================================================

export interface ConversationMetadata {
  id: string;
  title?: string;
  provider: string;
  model: string;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
  tags?: string[];
}

export interface EmbeddingRequest {
  text: string;
  model?: string;
  provider?: string;
}

export interface EmbeddingResponse {
  embedding: number[];
  model: string;
  provider: string;
}

export interface FunctionCall {
  name: string;
  arguments: Record<string, any>;
}

export interface FunctionCallMessage extends Omit<ChatMessage, "content"> {
  role: "function";
  functionCall: FunctionCall;
  content?: string;
}

// Export everything as a namespace for organized imports
export namespace AI {
  export type Message = ChatMessage;
  export type Request = ChatRequest;
  export type Response = ChatResponse;
  export type Model = ModelInfo;
  export type Provider = AIProviderName;
  export type Status = ProviderStatus;
  export type Error = AIError;
  export type Config = AIProviderConfig;
}

// Default export for convenience
export default {
  // Types are not values, but we can export useful constants
  PROVIDERS: ["ollama", "openai", "huggingface"] as const,
  ROLES: ["system", "user", "assistant"] as const,
  CAPABILITIES: [
    "text-generation",
    "chat",
    "embeddings",
    "code-generation",
    "function-calling",
  ] as const,
  STATUS_TYPES: ["healthy", "unhealthy", "loading", "unreachable"] as const,
};
