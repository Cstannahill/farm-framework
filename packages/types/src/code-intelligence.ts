// Code Intelligence Types
export interface IntelligenceConfig {
  enabled?: boolean;
  indexing?: {
    include?: string[];
    exclude?: string[];
    watch?: boolean;
    incremental?: boolean;
    batchSize?: number;
    maxFileSize?: number;
    respectGitignore?: boolean;
  };
  ai?: {
    provider?: "local" | "openai" | "anthropic" | "azure";
    model?: string;
    temperature?: number;
    maxTokens?: number;
    apiKey?: string;
    endpoint?: string;
  };
  performance?: {
    maxMemory?: string;
    parallelism?: number;
    cacheSize?: string;
    embedBatchSize?: number;
    indexingTimeout?: number;
  };
  privacy?: {
    localOnly?: boolean;
    sanitizeSecrets?: boolean;
    excludeSensitive?: boolean;
    allowedFileTypes?: string[];
    secretPatterns?: string[];
  };
  vectorPath?: string;
  api?: {
    port?: number;
    host?: string;
    cors?: boolean;
    rateLimit?: {
      requests: number;
      window: number;
    };
    auth?: {
      enabled: boolean;
      type: "apiKey" | "jwt" | "basic";
      secret?: string;
    };
  };
}

// Basic types that might be needed by other packages
export interface CodeEntityBasic {
  id: string;
  name: string;
  type: string;
  file: string;
  line: number;
}

export interface IntelligenceQueryBasic {
  query: string;
  maxResults?: number;
  includeContext?: boolean;
}
