/**
 * FARM Configuration Types
 */
import type { DatabaseConfig } from "./database.js";
import type { DeploymentConfig } from "./deployment.js";
import type { ObservabilityConfig } from "./observability.js";

export interface FarmConfig {
  // Project metadata
  name: string;
  version?: string;
  description?: string;

  // Template and features
  template: TemplateType;
  features: FeatureType[];

  // Core system configurations
  database: DatabaseConfig;
  ai?: AIConfig;
  auth?: AuthConfig;
  cache?: CacheConfig;
  development?: DevelopmentConfig;
  build?: BuildConfig;
  deployment?: DeploymentConfig;
  observability?: ObservabilityConfig;

  // Plugin system
  plugins?: PluginConfig[];
}

export type TemplateType =
  | "basic"
  | "ai-chat"
  | "ai-dashboard"
  | "ecommerce"
  | "cms"
  | "api-only";

export type FeatureType =
  | "auth"
  | "ai"
  | "realtime"
  | "payments"
  | "email"
  | "storage"
  | "search"
  | "analytics";

export interface AIConfig {
  enabled?: boolean;
  providers: {
    ollama?: OllamaConfig;
    openai?: OpenAIConfig;
    huggingface?: HuggingFaceConfig;
    anthropic?: AnthropicConfig;
  };
  routing: {
    development?: string;
    staging?: string;
    production?: string;
  };
  features: {
    streaming?: boolean;
    caching?: boolean;
    rateLimiting?: boolean;
    fallback?: boolean;
  };
}

export interface OllamaConfig {
  enabled: boolean;
  url?: string;
  baseUrl?: string;
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

export interface AnthropicConfig {
  enabled: boolean;
  apiKey?: string;
  models: string[];
  defaultModel: string;
  rateLimiting?: {
    requestsPerMinute?: number;
    tokensPerMinute?: number;
  };
}

export interface AuthConfig {
  enabled?: boolean;
  provider?: "jwt" | "oauth" | "custom";
  jwt?: {
    secret?: string;
    expiresIn?: string;
  };
  oauth?: {
    providers?: string[];
  };
}

export interface CacheConfig {
  enabled?: boolean;
  type?: "redis" | "memory" | "file";
  redis?: {
    url?: string;
    host?: string;
    port?: number;
    password?: string;
  };
  ttl?: number;
}

export interface DevelopmentConfig {
  ports: {
    frontend?: number;
    backend?: number;
    proxy?: number;
    database?: number;
    ai?: number;
    ollama?: number;
  };
  api?: {
    url?: string;
    port?: number;
  };
  hotReload?: {
    enabled?: boolean;
    typeGeneration?: boolean;
    aiModels?: boolean;
  };
  ssl?: boolean;
}

export interface BuildConfig {
  target?: string;
  sourcemap?: boolean;
  minify?: boolean;
  splitting?: boolean;
  outDir?: string;
  args?: Record<string, any>;
}

export type PluginConfig = string | [string, Record<string, any>];
