// tools/template-validator/src/types.ts
import type {
  TemplateConfig,
  ValidationResult,
  TestResult,
} from "@farm-framework/types";

export interface ServiceProcess {
  name: string;
  process: any; // Child process
  port?: number;
  healthCheckUrl?: string;
}

export interface ProviderConfig {
  name: string;
  enabled: boolean;
  url?: string;
  apiKey?: string;
  models: string[];
  defaultModel: string;
}

/**
 * @deprecated Moved to `@farm/types` package
 */
export interface AIConfig {
  providers: ProviderConfig[];
  routing: {
    development: string;
    staging: string;
    production: string;
  };
  features: {
    streaming: boolean;
    caching: boolean;
    rateLimiting: boolean;
    fallback: boolean;
  };
}

/**
 * @deprecated Moved to `@farm/types` package
 */
export interface DatabaseConfig {
  type: "mongodb" | "postgresql" | "mysql" | "sqlite";
  url: string;
  options?: Record<string, any>;
}

export interface ValidationOptions {
  template?: string;
  config?: string;
  skipAi?: boolean;
  parallel?: boolean;
  environment?: "development" | "staging" | "production";
  verbose?: boolean;
}

export interface ProviderTestResult {
  provider: string;
  available: boolean;
  models?: string[];
  latency?: number;
  error?: string;
}

export interface PerformanceMetrics {
  templateName: string;
  configName: string;
  startupTime: number;
  memoryUsage: number;
  apiResponseTime: number;
  aiResponseTime?: number;
  buildTime?: number;
}

export interface CompatibilityResult {
  template: string;
  provider: string;
  features: string[];
  compatible: boolean;
  issues: string[];
  recommendations: string[];
}

export interface ValidationReport {
  timestamp: string;
  duration: number;
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
  };
  results: ValidationResult[];
  performance: PerformanceMetrics[];
  compatibility: CompatibilityResult[];
  environment: {
    nodeVersion: string;
    pythonVersion: string;
    os: string;
    farmVersion: string;
  };
}

export interface BenchmarkResult {
  template: string;
  configuration: string;
  metrics: {
    generationTime: number;
    installTime: number;
    startupTime: number;
    memoryPeak: number;
    diskUsage: number;
  };
  scores: {
    performance: number;
    reliability: number;
    compatibility: number;
    overall: number;
  };
}

// Enums for better type safety
export enum TemplateType {
  BASIC = "basic",
  AI_CHAT = "ai-chat",
  AI_DASHBOARD = "ai-dashboard",
  ECOMMERCE = "ecommerce",
  CMS = "cms",
  API_ONLY = "api-only",
}

export enum FeatureType {
  AUTH = "auth",
  AI = "ai",
  REALTIME = "realtime",
  PAYMENTS = "payments",
  EMAIL = "email",
  STORAGE = "storage",
  SEARCH = "search",
  ANALYTICS = "analytics",
}

export enum DatabaseType {
  MONGODB = "mongodb",
  POSTGRESQL = "postgresql",
  MYSQL = "mysql",
  SQLITE = "sqlite",
}

export enum AIProvider {
  OLLAMA = "ollama",
  OPENAI = "openai",
  HUGGINGFACE = "huggingface",
  ANTHROPIC = "anthropic",
}

export enum ValidationStatus {
  PENDING = "pending",
  RUNNING = "running",
  PASSED = "passed",
  FAILED = "failed",
  SKIPPED = "skipped",
  TIMEOUT = "timeout",
}

// Extended configurations for different scenarios
export interface ExtendedTemplateConfig extends TemplateConfig {
  timeout?: number;
  retries?: number;
  environment?: "development" | "staging" | "production";
  skipTests?: string[];
  customTests?: string[];
  variables?: Record<string, any>;
}

// Test suite configuration
export interface TestSuite {
  name: string;
  description: string;
  tests: TestConfiguration[];
  setup?: () => Promise<void>;
  teardown?: () => Promise<void>;
}

export interface TestConfiguration {
  name: string;
  description: string;
  timeout: number;
  retries: number;
  dependencies: string[];
  execute: (config: TemplateConfig) => Promise<TestResult>;
}

// Provider-specific configurations
/**
 * @deprecated Moved to `@farm/types` package
 */
export interface OllamaConfig extends ProviderConfig {
  gpu: boolean;
  autoStart: boolean;
  autoPull: string[];
  memoryLimit?: string;
}

/**
 * @deprecated Moved to `@farm/types` package
 */
export interface OpenAIConfig extends ProviderConfig {
  organization?: string;
  rateLimiting: {
    requestsPerMinute: number;
    tokensPerMinute: number;
  };
}

/**
 * @deprecated Moved to `@farm/types` package
 */
export interface HuggingFaceConfig extends ProviderConfig {
  token?: string;
  device: "auto" | "cpu" | "cuda";
  cacheDir?: string;
}
