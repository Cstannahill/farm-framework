// farm.config.ts - Complete AI provider configuration example
import { defineConfig } from "@farm-framework/core";

export default defineConfig({
  name: "my-ai-app",
  template: "ai-chat",
  features: ["auth", "ai", "realtime"],

  // Enhanced AI configuration with cloud providers
  ai: {
    providers: {
      // Ollama - Local AI for development
      ollama: {
        enabled: true,
        url: "http://localhost:11434",
        models: [
          "llama3.1", // General chat
          "codestral", // Code generation
          "phi3", // Lightweight model
          "mistral", // Alternative chat model
          "llava", // Vision model (if needed)
        ],
        defaultModel: "llama3.1",
        autoStart: true,
        autoPull: ["llama3.1"], // Auto-download on first run
        gpu: true,

        // Ollama-specific settings
        timeout: 60,
        maxRetries: 2,
        healthCheckInterval: 30,
        memoryLimit: "8GB", // GPU memory limit
      },

      // OpenAI - Production cloud provider
      openai: {
        enabled: true,
        apiKey: process.env.OPENAI_API_KEY,
        models: [
          "gpt-4",
          "gpt-4-turbo",
          "gpt-3.5-turbo",
          "gpt-3.5-turbo-16k",
          "text-embedding-ada-002", // For embeddings
        ],
        defaultModel: "gpt-3.5-turbo",

        // Rate limiting to avoid hitting OpenAI limits
        rateLimiting: {
          requestsPerMinute: 60,
          tokensPerMinute: 40000,
        },

        // Enhanced error handling
        timeout: 30,
        maxRetries: 3,
        retryDelay: 1, // Exponential backoff starting at 1s

        // Cost optimization
        organization: process.env.OPENAI_ORG_ID,
        defaultMaxTokens: 1000, // Limit default response length
      },

      // HuggingFace - Open source models
      huggingface: {
        enabled: true,
        token: process.env.HUGGINGFACE_TOKEN,

        // Mix of cloud and local models
        useCloud: true, // Use cloud inference API by default

        models: [
          // Chat models
          "microsoft/DialoGPT-medium",
          "microsoft/DialoGPT-large",
          "facebook/blenderbot-400M-distill",

          // Code models
          "microsoft/CodeBERT-base",
          "Salesforce/codet5-base",

          // Embedding models
          "sentence-transformers/all-MiniLM-L6-v2",
          "sentence-transformers/all-mpnet-base-v2",
        ],
        defaultModel: "microsoft/DialoGPT-medium",

        // Local model settings (if useCloud: false)
        device: "auto", // auto, cuda, cpu
        cacheDir: "./models/huggingface",

        // Cloud settings
        cloudTimeout: 30,
        maxRetries: 2,
      },
    },

    // Smart routing based on environment
    routing: {
      // Development: Prefer local models
      development: "ollama",

      // Staging: Mix of local and cloud for testing
      staging: "ollama", // Can fallback to cloud providers

      // Production: Cloud providers for reliability
      production: "openai",
    },

    // Fallback configuration
    fallback: {
      // Automatic fallbacks
      enabled: true,

      // Provider priority order by environment
      chains: {
        development: ["ollama", "huggingface", "openai"],
        staging: ["ollama", "openai", "huggingface"],
        production: ["openai", "huggingface", "ollama"],
      },

      // Conditions that trigger fallback
      triggers: [
        "connection_error",
        "timeout",
        "rate_limit",
        "model_not_found",
        "server_error",
      ],

      // Circuit breaker settings
      circuitBreaker: {
        failureThreshold: 5, // Failures before opening circuit
        timeout: 300, // Seconds before retrying
        halfOpenMaxCalls: 3, // Test calls when half-open
      },
    },

    // Model-specific routing
    modelRouting: {
      // Code generation models
      codestral: "ollama", // Prefer local for code
      "CodeBERT-base": "huggingface",

      // Chat models
      "gpt-4": "openai", // Only available on OpenAI
      "llama3.1": "ollama", // Prefer local
      "DialoGPT-medium": "huggingface",

      // Embedding models
      "text-embedding-ada-002": "openai",
      "all-MiniLM-L6-v2": "huggingface",
    },

    // Feature configuration
    features: {
      // Real-time streaming
      streaming: {
        enabled: true,
        chunkSize: 1, // Tokens per chunk
        delay: 0.01, // Delay between chunks (seconds)
        maxConcurrent: 10, // Max concurrent streams
      },

      // Response caching
      caching: {
        enabled: true,
        ttl: 3600, // Cache TTL in seconds
        maxSize: 1000, // Max cached responses
        keyFields: ["model", "provider", "messages"], // Cache key fields
      },

      // Rate limiting (global)
      rateLimiting: {
        enabled: true,
        requestsPerMinute: 100, // Per-user rate limit
        burstLimit: 20, // Burst allowance
        windowSize: 60, // Rate limit window (seconds)
      },

      // Request/response logging
      logging: {
        enabled: true,
        logLevel: "info", // debug, info, warn, error
        includeRequestBody: false, // Privacy: don't log full requests
        includeResponseBody: false, // Privacy: don't log full responses
        logMetrics: true, // Log performance metrics
      },

      // Health monitoring
      monitoring: {
        enabled: true,
        interval: 30, // Health check interval (seconds)
        timeout: 10, // Health check timeout (seconds)
        retryAttempts: 3, // Health check retries
        degradedThreshold: 2, // Failures before marking degraded
        unhealthyThreshold: 5, // Failures before marking unhealthy
      },
    },

    // Performance optimization
    optimization: {
      // Connection pooling
      connectionPool: {
        maxConnections: 20, // Max concurrent connections
        timeout: 30, // Connection timeout
        keepAlive: true, // Keep connections alive
      },

      // Request batching
      batching: {
        enabled: false, // Batch similar requests
        maxBatchSize: 5, // Max requests per batch
        batchTimeout: 100, // Max wait time for batch (ms)
      },

      // Model preloading
      preload: {
        enabled: true,
        models: ["llama3.1"], // Models to preload on startup
        warmup: true, // Send warmup requests
      },
    },

    // Security configuration
    security: {
      // API key rotation
      keyRotation: {
        enabled: false, // Automatic key rotation
        interval: 2592000, // Rotation interval (30 days)
      },

      // Request filtering
      filtering: {
        enabled: true,
        maxPromptLength: 4000, // Max prompt length
        blockedPatterns: [], // Regex patterns to block
        sanitizeInput: true, // Sanitize input text
      },

      // Audit logging
      audit: {
        enabled: true,
        logRequests: true, // Log all AI requests
        logResponses: false, // Don't log responses for privacy
        includeUserInfo: true, // Include user info in logs
      },
    },
  },

  // Database configuration
  database: {
    type: "mongodb",
    url: process.env.DATABASE_URL || "mongodb://localhost:27017/farmapp",

    // Additional collections for AI features
    collections: {
      conversations: "conversations",
      aiUsage: "ai_usage",
      modelCache: "model_cache",
    },
  },

  // Development server configuration
  development: {
    ports: {
      frontend: 3000,
      backend: 8000,
      proxy: 4000,
      ollama: 11434,
    },

    // Enhanced hot reload for AI
    hotReload: {
      enabled: true,
      typeGeneration: true,
      aiModels: true, // Hot reload AI models
      configReload: true, // Reload config changes
    },

    // Development-specific AI settings
    ai: {
      verbose: true, // Verbose AI logging in dev
      mockResponses: false, // Use mock responses for testing
      debugMode: true, // Enable debug features
    },
  },

  // Build configuration
  build: {
    target: "node18",
    sourcemap: true,
    minify: true,
    splitting: true,
    outDir: "dist",

    // AI-specific build settings
    ai: {
      bundleModels: false, // Don't bundle AI models in build
      generateTypes: true, // Generate AI types
      optimizeImages: true, // Optimize any AI-generated images
    },
  },

  // Environment variables
  env: {
    // AI provider keys
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    HUGGINGFACE_TOKEN: process.env.HUGGINGFACE_TOKEN,

    // Optional configuration
    OPENAI_ORG_ID: process.env.OPENAI_ORG_ID,

    // Feature flags
    ENABLE_AI_STREAMING: process.env.ENABLE_AI_STREAMING || "true",
    ENABLE_AI_CACHING: process.env.ENABLE_AI_CACHING || "true",
    ENABLE_RATE_LIMITING: process.env.ENABLE_RATE_LIMITING || "true",

    // Performance tuning
    AI_MAX_CONCURRENT: process.env.AI_MAX_CONCURRENT || "10",
    AI_TIMEOUT: process.env.AI_TIMEOUT || "30",

    // Debugging
    AI_DEBUG: process.env.AI_DEBUG || "false",
    AI_LOG_LEVEL: process.env.AI_LOG_LEVEL || "info",
  },

  // Plugin configuration
  plugins: [
    // AI-related plugins
    "@farm-framework/plugin-ai-analytics",
    "@farm-framework/plugin-ai-cache",

    // Other plugins
    "@farm-framework/plugin-auth",
    [
      "@farm-framework/plugin-storage",
      {
        provider: "s3",
        bucket: "my-ai-app-storage",
      },
    ],
  ],
});

// Environment-specific overrides
export const developmentConfig = {
  ai: {
    providers: {
      openai: {
        enabled: false, // Disable OpenAI in development to save costs
      },
      huggingface: {
        useCloud: false, // Use local models in development
      },
    },
    features: {
      logging: {
        logLevel: "debug",
        includeRequestBody: true,
        includeResponseBody: true,
      },
    },
  },
};

export const productionConfig = {
  ai: {
    providers: {
      ollama: {
        enabled: false, // Disable local models in production
      },
      openai: {
        rateLimiting: {
          requestsPerMinute: 100, // Higher limits in production
          tokensPerMinute: 80000,
        },
      },
    },
    features: {
      caching: {
        ttl: 7200, // Longer cache in production
      },
      rateLimiting: {
        requestsPerMinute: 200, // Higher user limits
      },
      logging: {
        logLevel: "warn", // Less verbose logging
        includeRequestBody: false,
        includeResponseBody: false,
      },
    },
    security: {
      audit: {
        enabled: true,
        logRequests: true,
        includeUserInfo: true,
      },
    },
  },
};
