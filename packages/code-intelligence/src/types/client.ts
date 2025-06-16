// Client-specific types
export interface CodeIntelligenceClientConfig {
  baseUrl?: string;
  timeout?: number;
  apiKey?: string;
  retries?: number;
  cache?: boolean;
}

export interface ClientQueryRequest {
  query: string;
  maxResults?: number;
  includeContext?: boolean;
  filters?: ClientQueryFilters;
}

export interface ClientQueryFilters {
  entityTypes?: string[];
  filePatterns?: string[];
  languages?: string[];
  frameworks?: string[];
}

export interface ClientSearchOptions {
  stream?: boolean;
  timeout?: number;
  signal?: AbortSignal;
}

export interface ClientExplainRequest {
  entityName: string;
  includeExamples?: boolean;
  includeTests?: boolean;
  includeContext?: boolean;
}

export interface WebSocketClientOptions {
  url: string;
  reconnect?: boolean;
  maxReconnectAttempts?: number;
  reconnectDelay?: number;
}
