# FARM Configuration Options Reference

Complete documentation of all available configuration properties for `farm.config.ts`.

## Table of Contents

- [All Options Example](#all-options-example)
- [Basic Structure](#basic-structure)
- [Project Metadata](#project-metadata)
- [Template & Features](#template--features)
- [Database Configuration](#database-configuration)
- [AI/ML Configuration](#aiml-configuration)
- [Development Server](#development-server)
- [Build Configuration](#build-configuration)
- [Deployment Configuration](#deployment-configuration)
- [Plugin System](#plugin-system)
- [Observability & Monitoring](#observability--monitoring)
- [Authentication & Security](#authentication--security)
- [Real-time Features](#real-time-features)
- [Storage Configuration](#storage-configuration)
- [Environment-Specific Configs](#environment-specific-configs)
- [Advanced Options](#advanced-options)

---

## All Options Example

Here's a comprehensive example showing **every possible configuration option** with valid values. This is meant as a reference - you typically wouldn't use all options together:

```typescript
import { defineConfig } from "@farm-framework/core";

export default defineConfig({
  // Project Metadata
  name: "comprehensive-farm-app",
  version: "2.1.0",
  description:
    "A comprehensive example showcasing all FARM configuration options",

  // Template & Features
  template: "ai-chat",
  features: [
    "auth",
    "ai",
    "realtime",
    "payments",
    "email",
    "storage",
    "search",
    "analytics",
  ],

  // Database Configuration
  database: {
    type: "mongodb",
    url:
      process.env.DATABASE_URL || "mongodb://localhost:27017/comprehensive-app",
    options: {
      maxPoolSize: 20,
      serverSelectionTimeoutMS: 10000,
      retryWrites: true,
      w: "majority",
      readPreference: "primary",
    },
    collections: {
      users: "users",
      conversations: "conversations",
      aiUsage: "ai_usage",
      sessions: "user_sessions",
      analytics: "analytics_events",
    },
  },

  // AI/ML Configuration
  ai: {
    providers: {
      ollama: {
        enabled: true,
        url: "http://localhost:11434",
        models: ["llama3.1", "codestral", "phi3", "mistral", "llava"],
        defaultModel: "llama3.1",
        autoStart: true,
        autoPull: ["llama3.1", "codestral"],
        gpu: true,
        timeout: 120,
        maxRetries: 3,
      },
      openai: {
        enabled: true,
        apiKey: process.env.OPENAI_API_KEY,
        models: [
          "gpt-4",
          "gpt-4-turbo",
          "gpt-3.5-turbo",
          "text-embedding-ada-002",
        ],
        defaultModel: "gpt-4-turbo",
        rateLimiting: {
          requestsPerMinute: 500,
          tokensPerMinute: 150000,
        },
        organization: process.env.OPENAI_ORG_ID,
        timeout: 60,
      },
      huggingface: {
        enabled: true,
        token: process.env.HUGGINGFACE_TOKEN,
        models: [
          "microsoft/DialoGPT-medium",
          "facebook/blenderbot-400M-distill",
        ],
        device: "auto",
        useCloud: false,
      },
    },
    routing: {
      development: "ollama",
      staging: "openai",
      production: "openai",
    },
    fallback: {
      enabled: true,
      chains: {
        development: ["ollama", "huggingface", "openai"],
        staging: ["openai", "ollama", "huggingface"],
        production: ["openai", "huggingface", "ollama"],
      },
      triggers: [
        "connection_error",
        "timeout",
        "rate_limit",
        "model_not_found",
        "server_error",
      ],
      circuitBreaker: {
        failureThreshold: 5,
        timeout: 300,
        halfOpenMaxCalls: 3,
      },
    },
    modelRouting: {
      "gpt-4": "openai",
      "gpt-4-turbo": "openai",
      "llama3.1": "ollama",
      codestral: "ollama",
      "text-embedding-ada-002": "openai",
    },
    features: {
      streaming: {
        enabled: true,
        chunkSize: 1,
        delay: 0.01,
        maxConcurrent: 15,
      },
      caching: {
        enabled: true,
        ttl: 7200,
        maxSize: 2000,
        keyFields: ["model", "provider", "messages", "temperature"],
      },
      rateLimiting: {
        enabled: true,
        requestsPerMinute: 200,
        burstLimit: 50,
        windowSize: 60,
      },
      logging: {
        enabled: true,
        logLevel: "info",
        includeRequestBody: false,
        includeResponseBody: false,
        logMetrics: true,
      },
      monitoring: {
        enabled: true,
        interval: 30,
        timeout: 10,
        retryAttempts: 3,
        degradedThreshold: 2,
        unhealthyThreshold: 5,
      },
    },
  },

  // Development Server
  development: {
    ports: {
      frontend: 3000,
      backend: 8000,
      proxy: 4000,
      database: 27017,
      ollama: 11434,
      ai: 11434,
    },
    hotReload: {
      enabled: true,
      typeGeneration: true,
      aiModels: true,
      debounceMs: 500,
    },
    ssl: {
      enabled: false,
      cert: "./ssl/localhost.pem",
      key: "./ssl/localhost-key.pem",
    },
  },

  // Build Configuration
  build: {
    target: "es2020",
    sourcemap: true,
    minify: true,
    splitting: true,
    outDir: "dist",
    optimization: {
      treeshaking: true,
      deadCodeElimination: true,
      bundleAnalyzer: false,
    },
    assets: {
      publicPath: "/assets/",
      inlineLimit: 8192,
      copyPatterns: [
        { from: "public", to: "assets" },
        { from: "docs", to: "documentation" },
      ],
    },
  },

  // Deployment Configuration
  deployment: {
    platform: "docker",
    regions: ["us-east-1", "eu-west-1", "ap-southeast-1"],
    environment: {
      NODE_ENV: "production",
      API_URL: "https://api.comprehensive-app.com",
      CDN_URL: "https://cdn.comprehensive-app.com",
    },
    docker: {
      baseImage: "node:20-alpine",
      workdir: "/app",
      ports: [3000, 8000],
      healthcheck: {
        command: "curl -f http://localhost:8000/health || exit 1",
        interval: "30s",
        timeout: "10s",
        retries: 3,
        startPeriod: "40s",
      },
    },
  },

  // Authentication & Security
  auth: {
    jwt: {
      secret: process.env.JWT_SECRET,
      expiration: "24h",
      algorithm: "HS256",
      issuer: "comprehensive-app",
      audience: "comprehensive-app-users",
    },
    providers: ["jwt", "oauth"],
    oauth: {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        scopes: ["profile", "email"],
      },
      github: {
        clientId: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
      },
      microsoft: {
        clientId: process.env.MICROSOFT_CLIENT_ID,
        clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
        scopes: ["User.Read"],
      },
    },
  },

  // Security Settings
  security: {
    cors: {
      origin: ["http://localhost:3000", "https://comprehensive-app.com"],
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    },
    rateLimit: {
      windowMs: 15 * 60 * 1000,
      max: 1000,
      standardHeaders: true,
      legacyHeaders: false,
    },
    encryption: {
      algorithm: "aes-256-gcm",
      keyRotation: {
        enabled: true,
        interval: 2592000,
      },
    },
    audit: {
      enabled: true,
      logRequests: true,
      logResponses: false,
      includeUserInfo: true,
    },
  },

  // Real-time Features
  websocket: {
    enabled: true,
    cors: ["http://localhost:3000", "https://comprehensive-app.com"],
    pingInterval: 25000,
    pingTimeout: 10000,
    maxConnections: 5000,
  },

  realtime: {
    chat: {
      enabled: true,
      rooms: true,
      privateMessages: true,
      messageHistory: 500,
      fileSharing: true,
    },
    notifications: {
      enabled: true,
      pushNotifications: true,
      emailDigest: true,
      smsAlerts: false,
    },
  },

  // Storage Configuration
  storage: {
    provider: "s3",
    s3: {
      bucket: "comprehensive-app-storage",
      region: "us-east-1",
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      publicRead: false,
    },
    local: {
      path: "./uploads",
      maxFileSize: "50MB",
      allowedTypes: ["image/*", "application/pdf", "text/*"],
    },
  },

  // Observability & Monitoring
  observability: {
    enabled: true,
    provider: "uptrace",
    serviceName: "comprehensive-farm-app",
    sampling: 0.1,
    costTracking: {
      enabled: true,
      currency: "USD",
      thresholds: {
        hourly: 10,
        daily: 100,
        monthly: 2000,
      },
      quotas: {
        daily: 150,
        monthly: 3000,
      },
    },
    alerts: {
      enabled: true,
      channels: {
        slack: process.env.SLACK_WEBHOOK,
        email: process.env.ALERT_EMAIL,
        webhook: "https://comprehensive-app.com/alerts",
        pagerduty: process.env.PAGERDUTY_API_KEY,
      },
      rules: {
        costSpike: true,
        quotaApproaching: true,
        errorRate: true,
        customRules: [
          {
            name: "high_memory_usage",
            condition: "memory > 80%",
            severity: "warning",
          },
          {
            name: "database_connection_high",
            condition: "db_connections > 90%",
            severity: "critical",
          },
        ],
      },
    },
    telemetry: {
      enabled: true,
      batchSize: 500,
      timeout: 10000,
      retryAttempts: 5,
      includeStackTraces: true,
    },
    providers: {
      development: {
        type: "console",
        pretty: true,
        colors: true,
      },
      production: {
        type: "uptrace",
        endpoint: process.env.UPTRACE_DSN,
        sampling: 0.05,
      },
    },
  },

  // Code Intelligence
  codeIntelligence: {
    enabled: true,
    indexing: {
      include: ["src/**/*", "packages/**/*", "apps/**/*"],
      exclude: ["**/test/**", "**/*.test.*", "**/node_modules/**"],
      watch: true,
      incremental: true,
    },
    ai: {
      provider: "local",
      model: "codellama",
      temperature: 0.1,
    },
    performance: {
      maxMemory: "4GB",
      parallelism: 8,
      cacheSize: "1GB",
    },
    privacy: {
      localOnly: true,
      sanitizeSecrets: true,
      excludeSensitive: true,
    },
  },

  // Type Generation
  codegen: {
    outputDir: "./src/types/generated",
    enableCache: true,
    enableIncrementalGeneration: true,
    typeSync: {
      enabled: true,
      watchMode: true,
      outputFormat: "typescript",
    },
  },

  // Performance Optimization
  optimization: {
    connectionPool: {
      maxConnections: 50,
      timeout: 60,
      keepAlive: true,
    },
    batching: {
      enabled: true,
      maxBatchSize: 10,
      batchTimeout: 200,
    },
    preload: {
      enabled: true,
      models: ["llama3.1", "gpt-3.5-turbo"],
      warmup: true,
    },
  },

  // Environment Variables
  env: {
    required: ["DATABASE_URL", "JWT_SECRET", "OPENAI_API_KEY"],
    optional: {
      NODE_ENV: "development",
      LOG_LEVEL: "info",
      PORT: "3000",
    },
    validation: {
      DATABASE_URL: "url",
      JWT_SECRET: { type: "string", minLength: 32 },
      PORT: { type: "number", min: 1000, max: 65535 },
    },
  },

  // Plugin System
  plugins: [
    "@farm-framework/plugin-auth",
    "@farm-framework/plugin-analytics",
    [
      "@farm-framework/plugin-storage",
      {
        provider: "s3",
        bucket: "comprehensive-app-storage",
        region: "us-east-1",
      },
    ],
    [
      "@farm-framework/plugin-cache",
      {
        provider: "redis",
        host: "localhost",
        port: 6379,
      },
    ],
    [
      "@farm-framework/plugin-search",
      {
        provider: "elasticsearch",
        host: "localhost:9200",
      },
    ],
    "./plugins/custom-comprehensive-plugin",
  ],
});
```

> **Note**: This example shows every possible configuration option for reference purposes. In practice, you would only configure the options relevant to your specific application needs.

---

## Configuration Contexts

FARM configurations serve different purposes at different times:

### Scaffolding Time (Project Generation)

Properties used when creating a new project with `farm create`:

- `template` - Determines which base template files to copy
- `features` - Determines which feature-specific files and dependencies to include
- `database` - Determines which database dependencies and Docker configs to add
- `name` - Used in generated file names and project structure

### Runtime (Development & Production)

Properties used by the running application and development tools:

- `features` - Exported as environment variables (`VITE_FEATURES`)
- `template` - Used by dev server for service configuration defaults
- `ai.*` - Used by AI provider routing and model management
- `database.*` - Used for runtime database connections
- `development.*` - Used by dev server for port allocation and hot reload
- `plugins.*` - Used by plugin system for activation/deactivation

### Hybrid (Both Contexts)

Some properties are used in both contexts:

- `features`: Determines scaffolding files AND runtime behavior
- `template`: Affects generated structure AND dev server defaults
- `ai.providers`: Scaffolding dependencies AND runtime configuration

---

## Basic Structure

Every `farm.config.ts` file follows this structure:

```typescript
import { defineConfig } from "@farm-framework/core";

export default defineConfig({
  // Configuration options here
});
```

The `defineConfig` function provides TypeScript IntelliSense and validation for all configuration options.

---

## Project Metadata

### Core Properties

| Property      | Type     | Required | Default   | Description                                           |
| ------------- | -------- | -------- | --------- | ----------------------------------------------------- |
| `name`        | `string` | ✅       | -         | Project name (used for directories, containers, etc.) |
| `version`     | `string` | ❌       | `"1.0.0"` | Project version following semver                      |
| `description` | `string` | ❌       | -         | Human-readable project description                    |

### Template & Features

| Property   | Type       | Usage | Description                                               |
| ---------- | ---------- | ----- | --------------------------------------------------------- |
| `template` | `string`   | 🔄    | Template type (scaffolding + dev server defaults)         |
| `features` | `string[]` | 🔄    | Enabled features (scaffolding + runtime environment vars) |

**Usage Indicators:**

- 🏗️ **Scaffolding-only**: Used during project generation
- 🔄 **Scaffolding + Runtime**: Used during generation AND by dev tools
- ⚡ **Runtime-only**: Used by running application and dev tools

### Example

```typescript
export default defineConfig({
  name: "my-ai-app",
  version: "2.1.0",
  description: "AI-powered customer service platform",

  // Template and features (used for scaffolding AND runtime)
  template: "ai-chat",
  features: ["auth", "ai", "realtime"],
});
```

---

## Template & Features

### Template Types

| Template       | Description            | Use Case                   |
| -------------- | ---------------------- | -------------------------- |
| `basic`        | Simple full-stack app  | General web applications   |
| `ai-chat`      | AI chat interface      | Conversational AI apps     |
| `ai-dashboard` | AI analytics dashboard | AI metrics and monitoring  |
| `ecommerce`    | E-commerce platform    | Online stores              |
| `cms`          | Content management     | Blogs, documentation sites |
| `api-only`     | Backend API only       | Microservices, APIs        |

### Available Features

| Feature     | Description           | Dependencies              |
| ----------- | --------------------- | ------------------------- |
| `auth`      | Authentication system | JWT, OAuth support        |
| `ai`        | AI/ML integration     | Provider configs required |
| `realtime`  | WebSocket support     | Real-time updates         |
| `payments`  | Payment processing    | Stripe integration        |
| `email`     | Email sending         | SMTP/SendGrid             |
| `storage`   | File storage          | S3, GCS, local            |
| `search`    | Full-text search      | Elasticsearch             |
| `analytics` | Usage analytics       | Event tracking            |

### Example

```typescript
export default defineConfig({
  template: "ai-chat",
  features: ["auth", "ai", "realtime", "analytics"],
});
```

---

## Database Configuration

### Basic Database Config

```typescript
database: {
  type: 'mongodb' | 'postgresql' | 'mysql' | 'sqlite',
  url: string
}
```

### Database Types & URLs

| Type         | Example URL                                   | Notes               |
| ------------ | --------------------------------------------- | ------------------- |
| `mongodb`    | `mongodb://localhost:27017/myapp`             | Document database   |
| `postgresql` | `postgresql://user:pass@localhost:5432/myapp` | Relational database |
| `mysql`      | `mysql://user:pass@localhost:3306/myapp`      | Relational database |
| `sqlite`     | `sqlite:///./myapp.db`                        | File-based database |

### Advanced Database Options

```typescript
database: {
  type: 'mongodb',
  url: process.env.DATABASE_URL,
  options: {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    retryWrites: true,
    w: 'majority'
  },
  collections: {
    users: 'users',
    conversations: 'conversations',
    aiUsage: 'ai_usage'
  }
}
```

---

## AI/ML Configuration

### Provider Configuration

#### Ollama (Local AI)

```typescript
ai: {
  providers: {
    ollama: {
      enabled: true,
      url: 'http://localhost:11434',
      models: ['llama3.1', 'codestral', 'phi3'],
      defaultModel: 'llama3.1',
      autoStart: true,        // Start Ollama automatically
      autoPull: ['llama3.1'], // Download models on first run
      gpu: true,              // Use GPU acceleration
      timeout: 60,            // Request timeout (seconds)
      maxRetries: 2           // Retry failed requests
    }
  }
}
```

#### OpenAI

```typescript
ai: {
  providers: {
    openai: {
      enabled: true,
      apiKey: process.env.OPENAI_API_KEY,
      models: ['gpt-4', 'gpt-3.5-turbo'],
      defaultModel: 'gpt-3.5-turbo',
      rateLimiting: {
        requestsPerMinute: 100,
        tokensPerMinute: 80000
      },
      organization: process.env.OPENAI_ORG_ID, // Optional
      timeout: 30
    }
  }
}
```

#### Hugging Face

```typescript
ai: {
  providers: {
    huggingface: {
      enabled: true,
      token: process.env.HUGGINGFACE_TOKEN,
      models: ['microsoft/DialoGPT-medium'],
      device: 'auto' | 'cpu' | 'cuda',
      useCloud: false  // Use local transformers vs API
    }
  }
}
```

### AI Routing & Fallbacks

```typescript
ai: {
  routing: {
    development: 'ollama',
    staging: 'openai',
    production: 'openai'
  },
  fallback: {
    enabled: true,
    chains: {
      development: ['ollama', 'huggingface', 'openai'],
      production: ['openai', 'huggingface', 'ollama']
    },
    triggers: ['connection_error', 'timeout', 'rate_limit'],
    circuitBreaker: {
      failureThreshold: 5,
      timeout: 300,
      halfOpenMaxCalls: 3
    }
  }
}
```

### AI Features

```typescript
ai: {
  features: {
    streaming: {
      enabled: true,
      chunkSize: 1,         // Tokens per chunk
      delay: 0.01,          // Delay between chunks (seconds)
      maxConcurrent: 10     // Max concurrent streams
    },
    caching: {
      enabled: true,
      ttl: 3600,            // Cache TTL in seconds
      maxSize: 1000,        // Max cached responses
      keyFields: ['model', 'provider', 'messages']
    },
    rateLimiting: {
      enabled: true,
      requestsPerMinute: 100,
      burstLimit: 20,
      windowSize: 60
    },
    logging: {
      enabled: true,
      logLevel: 'info',
      includeRequestBody: false,
      includeResponseBody: false,
      logMetrics: true
    }
  }
}
```

### Model-Specific Routing

```typescript
ai: {
  modelRouting: {
    'gpt-4': 'openai',
    'llama3.1': 'ollama',
    'codestral': 'ollama',
    'text-embedding-ada-002': 'openai'
  }
}
```

---

## Development Server

### Port Configuration

```typescript
development: {
  ports: {
    frontend: 3000,      // React/Vite dev server
    backend: 8000,       // FastAPI server
    proxy: 4000,         // Development proxy
    database: 27017,     // Database port
    ollama: 11434,       // Ollama AI server
    ai: 11434            // Alias for ollama
  }
}
```

### Hot Reload Settings

```typescript
development: {
  hotReload: {
    enabled: true,
    typeGeneration: true,    // Auto-generate TypeScript types
    aiModels: true,          // Reload on AI model changes
    debounceMs: 300         // Debounce file changes
  }
}
```

### SSL Configuration

```typescript
development: {
  ssl: {
    enabled: false,
    cert: './ssl/cert.pem',
    key: './ssl/key.pem'
  }
}
```

---

## Build Configuration

### Basic Build Options

```typescript
build: {
  target: 'es2020' | 'esnext' | 'node18' | 'node20',
  sourcemap: true,
  minify: boolean | 'production',
  splitting: true,        // Code splitting
  outDir: 'dist'
}
```

### Advanced Build Options

```typescript
build: {
  target: 'es2020',
  sourcemap: true,
  minify: process.env.NODE_ENV === 'production',
  splitting: true,
  outDir: 'dist',

  // Optimization settings
  optimization: {
    treeshaking: true,
    deadCodeElimination: true,
    bundleAnalyzer: false
  },

  // Asset handling
  assets: {
    publicPath: '/assets/',
    inlineLimit: 4096,    // Inline assets smaller than 4KB
    copyPatterns: [
      { from: 'public', to: 'assets' }
    ]
  }
}
```

---

## Deployment Configuration

### Platform Options

```typescript
deployment: {
  platform: 'vercel' | 'netlify' | 'aws' | 'gcp' | 'docker',
  regions: ['us-east-1', 'eu-west-1'],
  environment: {
    NODE_ENV: 'production',
    API_URL: 'https://api.myapp.com'
  }
}
```

### Platform-Specific Settings

#### Vercel

```typescript
deployment: {
  platform: 'vercel',
  vercel: {
    functions: {
      'api/ai': {
        memory: 1024,
        maxDuration: 30
      }
    },
    redirects: [
      { source: '/old-path', destination: '/new-path' }
    ]
  }
}
```

#### Docker

```typescript
deployment: {
  platform: 'docker',
  docker: {
    baseImage: 'node:20-alpine',
    workdir: '/app',
    ports: [3000, 8000],
    healthcheck: {
      command: 'curl -f http://localhost:8000/health',
      interval: '30s',
      timeout: '10s',
      retries: 3
    }
  }
}
```

---

## Plugin System

### Plugin Configuration

| Property  | Type                             | Usage | Description                           |
| --------- | -------------------------------- | ----- | ------------------------------------- |
| `plugins` | `(string \| [string, object])[]` | ⚡    | Plugin list (runtime activation only) |

**Plugin System Usage:**

- Plugins are **runtime-only** - they don't affect scaffolding
- Used by the plugin manager for activation/deactivation
- Each plugin can provide components, hooks, and backend integrations

```typescript
plugins: [
  // Simple plugin
  "@farm-framework/plugin-auth",

  // Plugin with options
  [
    "@farm-framework/plugin-storage",
    {
      provider: "s3",
      bucket: "my-app-storage",
      region: "us-east-1",
    },
  ],

  // Local plugin
  "./plugins/custom-plugin",
];
```

### Available Official Plugins

| Plugin                             | Description    | Configuration             |
| ---------------------------------- | -------------- | ------------------------- |
| `@farm-framework/plugin-auth`      | Authentication | JWT, OAuth providers      |
| `@farm-framework/plugin-storage`   | File storage   | S3, GCS, local storage    |
| `@farm-framework/plugin-analytics` | Analytics      | Event tracking            |
| `@farm-framework/plugin-cache`     | Caching        | Redis, memory cache       |
| `@farm-framework/plugin-search`    | Search         | Elasticsearch integration |

---

## Observability & Monitoring

### Basic Observability

```typescript
observability: {
  enabled: true,
  provider: 'console' | 'uptrace' | 'datadog' | 'custom',
  serviceName: 'my-ai-app',
  sampling: 1.0  // 100% sampling in development
}
```

### Cost Tracking

```typescript
observability: {
  costTracking: {
    enabled: true,
    currency: 'USD' | 'EUR' | 'GBP',
    thresholds: {
      hourly: 5,      // Alert if hourly cost > $5
      daily: 25,      // Alert if daily cost > $25
      monthly: 500    // Alert if monthly cost > $500
    },
    quotas: {
      daily: 30,      // Hard limit: $30/day
      monthly: 600    // Hard limit: $600/month
    }
  }
}
```

### Alert Configuration

```typescript
observability: {
  alerts: {
    enabled: true,
    channels: {
      slack: process.env.SLACK_WEBHOOK,
      email: process.env.ALERT_EMAIL,
      webhook: 'https://my-app.com/alerts'
    },
    rules: {
      costSpike: true,        // Alert on cost spikes
      quotaApproaching: true, // Alert at 80% quota
      errorRate: true,        // Alert on high error rates
      customRules: [
        {
          name: 'high_latency',
          condition: 'latency > 1000',
          severity: 'warning'
        }
      ]
    }
  }
}
```

### Telemetry Configuration

```typescript
observability: {
  telemetry: {
    enabled: true,
    batchSize: 100,         // Batch size for exports
    timeout: 5000,          // Export timeout (ms)
    retryAttempts: 3,       // Retry failed exports
    includeStackTraces: false
  }
}
```

---

## Authentication & Security

### JWT Configuration

```typescript
auth: {
  jwt: {
    secret: process.env.JWT_SECRET,
    expiration: '24h',
    algorithm: 'HS256',
    issuer: 'my-app',
    audience: 'my-app-users'
  }
}
```

### OAuth Providers

```typescript
auth: {
  providers: ['jwt', 'oauth'],
  oauth: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      scopes: ['profile', 'email']
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET
    }
  }
}
```

### Security Settings

```typescript
security: {
  cors: {
    origin: ['http://localhost:3000'],
    credentials: true
  },
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100                   // 100 requests per window
  },
  encryption: {
    algorithm: 'aes-256-gcm',
    keyRotation: {
      enabled: false,
      interval: 2592000  // 30 days
    }
  }
}
```

---

## Real-time Features

### WebSocket Configuration

```typescript
websocket: {
  enabled: true,
  cors: ['http://localhost:3000'],
  pingInterval: 30000,      // Heartbeat interval
  pingTimeout: 5000,        // Ping timeout
  maxConnections: 1000      // Max concurrent connections
}
```

### Real-time Features

```typescript
realtime: {
  chat: {
    enabled: true,
    rooms: true,              // Chat rooms support
    privateMessages: true,    // Direct messages
    messageHistory: 100       // Messages to keep in memory
  },
  notifications: {
    enabled: true,
    pushNotifications: true,  // Browser push notifications
    emailDigest: true         // Email notification digest
  }
}
```

---

## Storage Configuration

### Local Storage

```typescript
storage: {
  provider: 'local',
  local: {
    path: './uploads',
    maxFileSize: '10MB',
    allowedTypes: ['image/*', 'application/pdf']
  }
}
```

### Cloud Storage

```typescript
storage: {
  provider: 's3',
  s3: {
    bucket: 'my-app-storage',
    region: 'us-east-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    publicRead: false
  }
}
```

### GCS Storage

```typescript
storage: {
  provider: 'gcs',
  gcs: {
    bucket: 'my-app-storage',
    projectId: 'my-gcp-project',
    keyFile: './gcp-service-account.json'
  }
}
```

---

## Environment-Specific Configs

### Development Overrides

Create `farm.config.development.ts`:

```typescript
import { defineConfig } from "@farm-framework/core";

export default defineConfig({
  ai: {
    providers: {
      openai: {
        enabled: false, // Disable OpenAI in dev to save costs
      },
    },
  },
  development: {
    hotReload: {
      enabled: true,
      typeGeneration: true,
      aiModels: true,
    },
  },
  observability: {
    sampling: 1.0, // 100% sampling in development
  },
});
```

### Production Overrides

Create `farm.config.production.ts`:

```typescript
import { defineConfig } from "@farm-framework/core";

export default defineConfig({
  ai: {
    providers: {
      ollama: {
        enabled: false, // Disable local models in production
      },
      openai: {
        rateLimiting: {
          requestsPerMinute: 200, // Higher limits in production
        },
      },
    },
  },
  observability: {
    sampling: 0.1, // 10% sampling in production
    provider: "uptrace",
  },
});
```

---

## Advanced Options

### Code Intelligence

```typescript
codeIntelligence: {
  enabled: true,
  indexing: {
    include: ['src/**/*', 'packages/**/*'],
    exclude: ['**/test/**', '**/*.test.*'],
    watch: true,
    incremental: true
  },
  ai: {
    provider: 'local',
    model: 'codellama',
    temperature: 0.1
  },
  performance: {
    maxMemory: '2GB',
    parallelism: 4,
    cacheSize: '500MB'
  }
}
```

### Type Generation

```typescript
codegen: {
  outputDir: './src/types',
  enableCache: true,
  enableIncrementalGeneration: true,
  typeSync: {
    enabled: true,
    watchMode: true,
    outputFormat: 'typescript'
  }
}
```

### Performance Optimization

```typescript
optimization: {
  connectionPool: {
    maxConnections: 20,
    timeout: 30,
    keepAlive: true
  },
  batching: {
    enabled: false,
    maxBatchSize: 5,
    batchTimeout: 100
  },
  preload: {
    enabled: true,
    models: ['llama3.1'],
    warmup: true
  }
}
```

### Environment Variables

```typescript
env: {
  // Required environment variables
  required: [
    'DATABASE_URL',
    'JWT_SECRET'
  ],

  // Optional with defaults
  optional: {
    NODE_ENV: 'development',
    LOG_LEVEL: 'info'
  },

  // Validation
  validation: {
    DATABASE_URL: 'url',
    JWT_SECRET: { type: 'string', minLength: 32 }
  }
}
```

---

## Configuration Validation

The FARM framework automatically validates your configuration and provides helpful error messages:

```bash
# Validate configuration
farm config validate

# Show resolved configuration
farm config show

# Show configuration for specific environment
farm config show --env production
```

---

## Best Practices

1. **Environment Variables**: Always use environment variables for secrets
2. **Development vs Production**: Use environment-specific configs
3. **AI Costs**: Set appropriate cost thresholds and quotas
4. **Security**: Never commit API keys or secrets
5. **Performance**: Enable caching and optimize AI provider routing
6. **Monitoring**: Enable observability in production
7. **Documentation**: Comment complex configuration sections

---

## Configuration Examples

### Minimal Configuration

```typescript
export default defineConfig({
  name: "my-app",
  template: "basic",
  features: [],
  database: {
    type: "sqlite",
    url: "sqlite:///./app.db",
  },
});
```

### Full-Featured AI Application

```typescript
export default defineConfig({
  name: "ai-customer-service",
  version: "1.0.0",
  description: "AI-powered customer service platform",
  template: "ai-chat",
  features: ["auth", "ai", "realtime", "analytics"],

  database: {
    type: "mongodb",
    url: process.env.DATABASE_URL,
  },

  ai: {
    providers: {
      ollama: {
        enabled: true,
        models: ["llama3.1", "codestral"],
        defaultModel: "llama3.1",
        autoStart: true,
      },
      openai: {
        enabled: true,
        apiKey: process.env.OPENAI_API_KEY,
        models: ["gpt-4", "gpt-3.5-turbo"],
        defaultModel: "gpt-3.5-turbo",
      },
    },
    routing: {
      development: "ollama",
      production: "openai",
    },
    features: {
      streaming: true,
      caching: true,
      rateLimiting: true,
    },
  },

  auth: {
    jwt: {
      secret: process.env.JWT_SECRET,
      expiration: "24h",
    },
    providers: ["jwt", "oauth"],
  },

  websocket: {
    enabled: true,
    cors: ["http://localhost:3000"],
  },

  observability: {
    enabled: true,
    costTracking: {
      enabled: true,
      thresholds: {
        daily: 25,
        monthly: 500,
      },
    },
  },
});
```

---

For more information, see the [FARM Framework Documentation](https://farm-framework.dev) or run `farm --help` for CLI assistance.
