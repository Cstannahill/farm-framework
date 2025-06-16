// Configuration for code intelligence package
interface IntelligenceConfig {
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
    cacheSize?: number;
    maxConcurrency?: number;
    timeout?: number;
    retries?: number;
  };
  privacy?: {
    sanitize?: boolean;
    excludeSecrets?: boolean;
    anonymize?: boolean;
  };
  api?: {
    enabled?: boolean;
    port?: number;
    host?: string;
    cors?: boolean;
    rateLimit?: {
      requests?: number;
      window?: number;
    };
  };
}

export interface CodeIntelligenceConfig {
  enabled: boolean;
  indexing: IndexingConfig;
  ai: AIConfig;
  performance: PerformanceConfig;
  privacy: PrivacyConfig;
  vectorPath: string;
  api: APIConfig;
}

export interface IndexingConfig {
  include: string[];
  exclude: string[];
  watch: boolean;
  incremental: boolean;
  batchSize: number;
  maxFileSize: number;
  respectGitignore: boolean;
}

export interface AIConfig {
  provider: "local" | "openai" | "anthropic" | "azure";
  model: string;
  temperature: number;
  maxTokens: number;
  apiKey?: string;
  endpoint?: string;
}

export interface PerformanceConfig {
  maxMemory: string;
  parallelism: number;
  cacheSize: number;
  embedBatchSize: number;
  indexingTimeout: number;
}

export interface PrivacyConfig {
  localOnly: boolean;
  sanitizeSecrets: boolean;
  excludeSensitive: boolean;
  allowedFileTypes: string[];
  secretPatterns: string[];
}

export interface APIConfig {
  port: number;
  host: string;
  cors: boolean;
  rateLimit: RateLimitConfig;
  auth?: AuthConfig;
}

export interface RateLimitConfig {
  requests: number;
  window: number; // in seconds
}

export interface AuthConfig {
  enabled: boolean;
  type: "apiKey" | "jwt" | "basic";
  secret?: string;
}

export function createDefaultConfig(): CodeIntelligenceConfig {
  return {
    enabled: true,
    indexing: {
      include: ["src/**/*", "packages/**/*", "apps/**/*"],
      exclude: [
        "**/node_modules/**",
        "**/dist/**",
        "**/build/**",
        "**/.git/**",
        "**/test/**",
        "**/*.test.*",
        "**/*.spec.*",
        "**/*.d.ts",
      ],
      watch: true,
      incremental: true,
      batchSize: 100,
      maxFileSize: 1024 * 1024, // 1MB
      respectGitignore: true,
    },
    ai: {
      provider: "local",
      model: "codellama",
      temperature: 0.1,
      maxTokens: 2048,
    },
    performance: {
      maxMemory: "2GB",
      parallelism: 4,
      cacheSize: 500, // 500MB represented as number
      embedBatchSize: 32,
      indexingTimeout: 30000, // 30 seconds
    },
    privacy: {
      localOnly: true,
      sanitizeSecrets: true,
      excludeSensitive: true,
      allowedFileTypes: [
        ".ts",
        ".tsx",
        ".js",
        ".jsx",
        ".py",
        ".md",
        ".json",
        ".yaml",
        ".yml",
      ],
      secretPatterns: [
        "api[_-]?key",
        "secret[_-]?key",
        "password",
        "token",
        "private[_-]?key",
        "access[_-]?token",
      ],
    },
    vectorPath: ".farm/intel",
    api: {
      port: 8001,
      host: "localhost",
      cors: true,
      rateLimit: {
        requests: 100,
        window: 60, // 1 minute
      },
    },
  };
}

/**
 * Create a code intelligence configuration with sensible defaults
 */
export function createCodeIntelligenceConfig(
  overrides: Partial<IntelligenceConfig> = {}
): CodeIntelligenceConfig {
  const defaultConfig = createDefaultConfig();

  // Apply overrides to the default configuration
  return mergeIntelligenceConfig(defaultConfig, overrides);
}

/**
 * Helper function to deeply merge configuration objects
 */
function mergeIntelligenceConfig(
  base: CodeIntelligenceConfig,
  overrides: Partial<IntelligenceConfig>
): CodeIntelligenceConfig {
  const result = { ...base };

  if (overrides.enabled !== undefined) {
    result.enabled = overrides.enabled;
  }

  if (overrides.indexing) {
    result.indexing = { ...result.indexing, ...overrides.indexing };
  }

  if (overrides.ai) {
    result.ai = { ...result.ai, ...overrides.ai };
  }

  if (overrides.performance) {
    // Map IntelligenceConfig performance to CodeIntelligenceConfig performance
    const perfOverrides = overrides.performance;
    result.performance = {
      ...result.performance,
      cacheSize: perfOverrides.cacheSize ?? result.performance.cacheSize,
      parallelism:
        perfOverrides.maxConcurrency ?? result.performance.parallelism,
      indexingTimeout:
        perfOverrides.timeout ?? result.performance.indexingTimeout,
    };
  }

  if (overrides.privacy) {
    result.privacy = {
      ...result.privacy,
      sanitizeSecrets:
        overrides.privacy.sanitize ?? result.privacy.sanitizeSecrets,
      excludeSensitive:
        overrides.privacy.excludeSecrets ?? result.privacy.excludeSensitive,
    };
  }

  if (overrides.api) {
    result.api = {
      ...result.api,
      port: overrides.api.port ?? result.api.port,
      host: overrides.api.host ?? result.api.host,
      cors: overrides.api.cors ?? result.api.cors,
      rateLimit: overrides.api.rateLimit
        ? {
            ...result.api.rateLimit,
            ...overrides.api.rateLimit,
          }
        : result.api.rateLimit,
    };
  }

  return result;
}

export function mergeConfig(
  base: Partial<CodeIntelligenceConfig>,
  override: Partial<CodeIntelligenceConfig>
): CodeIntelligenceConfig {
  const defaultConfig = createDefaultConfig();

  return {
    ...defaultConfig,
    ...base,
    ...override,
    indexing: {
      ...defaultConfig.indexing,
      ...base.indexing,
      ...override.indexing,
    },
    ai: {
      ...defaultConfig.ai,
      ...base.ai,
      ...override.ai,
    },
    performance: {
      ...defaultConfig.performance,
      ...base.performance,
      ...override.performance,
    },
    privacy: {
      ...defaultConfig.privacy,
      ...base.privacy,
      ...override.privacy,
    },
    api: {
      ...defaultConfig.api,
      ...base.api,
      ...override.api,
    },
  };
}

export function validateConfig(config: CodeIntelligenceConfig): string[] {
  const errors: string[] = [];

  if (!config.vectorPath) {
    errors.push("vectorPath is required");
  }

  if (config.indexing.include.length === 0) {
    errors.push("indexing.include must contain at least one pattern");
  }

  if (config.performance.parallelism < 1) {
    errors.push("performance.parallelism must be at least 1");
  }

  if (config.ai.temperature < 0 || config.ai.temperature > 2) {
    errors.push("ai.temperature must be between 0 and 2");
  }

  if (config.api.port < 1 || config.api.port > 65535) {
    errors.push("api.port must be between 1 and 65535");
  }

  return errors;
}
