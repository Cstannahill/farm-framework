# Configuration System Architecture

## Overview

FARM uses a TypeScript-first configuration system centered around `farm.config.ts`. This provides type safety, IntelliSense, and modern developer experience while supporting environment-specific overrides, plugin integration, and hot-reload capabilities.

---

## Configuration File Structure

### Primary Configuration (`farm.config.ts`)

**Type-Safe Configuration with IntelliSense:**
```typescript
// farm.config.ts
import { defineConfig } from '@farm/core';
import type { FarmConfig } from '@farm/types';

export default defineConfig({
  // Project metadata
  name: 'my-farm-app',
  version: '1.0.0',
  description: 'AI-powered full-stack application',

  // Template and features
  template: 'ai-chat',
  features: ['auth', 'ai', 'realtime'],

  // Database configuration
  database: {
    type: 'mongodb',
    url: process.env.DATABASE_URL || 'mongodb://localhost:27017/farmapp',
    options: {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
    }
  },

  // AI/ML configuration
  ai: {
    providers: {
      ollama: {
        enabled: true,
        url: 'http://localhost:11434',
        models: ['llama3.1', 'codestral', 'phi3'],
        defaultModel: 'llama3.1',
        autoStart: true,
        autoPull: ['llama3.1'],
        gpu: true
      },
      openai: {
        enabled: true,
        apiKey: process.env.OPENAI_API_KEY,
        models: ['gpt-4', 'gpt-3.5-turbo'],
        defaultModel: 'gpt-3.5-turbo',
        rateLimiting: {
          requestsPerMinute: 60,
          tokensPerMinute: 40000
        }
      },
      huggingface: {
        enabled: false,
        token: process.env.HUGGINGFACE_TOKEN,
        models: ['microsoft/DialoGPT-medium'],
        device: 'auto'
      }
    },
    routing: {
      development: 'ollama',
      staging: 'openai',
      production: 'openai'
    },
    features: {
      streaming: true,
      caching: true,
      rateLimiting: true,
      fallback: true
    }
  },

  // Development server configuration
  development: {
    ports: {
      frontend: 3000,
      backend: 8000,
      proxy: 4000,
      ai: 8001
    },
    hotReload: {
      enabled: true,
      typeGeneration: true,
      aiModels: true
    },
    ssl: false
  },

  // Build configuration
  build: {
    target: 'node18',
    sourcemap: true,
    minify: true,
    splitting: true,
    outDir: 'dist'
  },

  // Deployment configuration
  deployment: {
    platform: 'vercel',
    regions: ['us-east-1'],
    environment: {
      NODE_ENV: 'production',
      API_URL: 'https://api.myapp.com'
    }
  },

  // Plugin configuration
  plugins: [
    '@farm/plugin-auth',
    '@farm/plugin-analytics',
    ['@farm/plugin-storage', {
      provider: 's3',
      bucket: 'my-app-storage'
    }]
  ]
});
```

### Configuration Type Definitions

**Comprehensive Type System:**
```typescript
// packages/types/src/config.ts
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
  development?: DevelopmentConfig;
  build?: BuildConfig;
  deployment?: DeploymentConfig;
  
  // Plugin system
  plugins?: PluginConfig[];
}

export type TemplateType = 
  | 'basic' 
  | 'ai-chat' 
  | 'ai-dashboard' 
  | 'ecommerce' 
  | 'cms' 
  | 'api-only';

export type FeatureType = 
  | 'auth' 
  | 'ai' 
  | 'realtime' 
  | 'payments' 
  | 'email' 
  | 'storage' 
  | 'search' 
  | 'analytics';

export interface DatabaseConfig {
  type: 'mongodb' | 'postgresql' | 'mysql' | 'sqlite';
  url: string;
  options?: Record<string, any>;
}

export interface AIConfig {
  providers: {
    ollama?: OllamaConfig;
    openai?: OpenAIConfig;
    huggingface?: HuggingFaceConfig;
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

export interface DevelopmentConfig {
  ports: {
    frontend?: number;
    backend?: number;
    proxy?: number;
    ai?: number;
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
}

export interface DeploymentConfig {
  platform: 'vercel' | 'netlify' | 'aws' | 'gcp' | 'docker';
  regions?: string[];
  environment?: Record<string, string>;
}

export type PluginConfig = string | [string, Record<string, any>];
```

---

## Configuration Loading & Validation

### Configuration Loader

**TypeScript Configuration Loader:**
```typescript
// packages/core/src/config/loader.ts
import { pathExists } from 'fs-extra';
import { register } from 'esbuild-register/dist/node';
import type { FarmConfig } from '@farm/types';
import { validateConfig } from './validator';
import { mergeConfigs } from './merger';

export class ConfigLoader {
  private configCache = new Map<string, FarmConfig>();
  
  async loadConfig(configPath?: string): Promise<FarmConfig> {
    const resolvedPath = await this.resolveConfigPath(configPath);
    
    // Check cache first
    if (this.configCache.has(resolvedPath)) {
      return this.configCache.get(resolvedPath)!;
    }
    
    // Register TypeScript support for config files
    register({
      target: 'node16',
      format: 'cjs'
    });
    
    try {
      // Load the configuration file
      const configModule = await import(resolvedPath);
      const config = configModule.default || configModule;
      
      // Validate configuration
      const validatedConfig = await validateConfig(config);
      
      // Apply environment-specific overrides
      const finalConfig = await this.applyEnvironmentOverrides(validatedConfig);
      
      // Cache the result
      this.configCache.set(resolvedPath, finalConfig);
      
      return finalConfig;
    } catch (error) {
      throw new Error(`Failed to load configuration from ${resolvedPath}: ${error.message}`);
    }
  }
  
  private async resolveConfigPath(configPath?: string): Promise<string> {
    if (configPath) {
      return path.resolve(configPath);
    }
    
    const candidates = [
      'farm.config.ts',
      'farm.config.js',
      'farm.config.mjs'
    ];
    
    for (const candidate of candidates) {
      if (await pathExists(candidate)) {
        return path.resolve(candidate);
      }
    }
    
    throw new Error('No configuration file found. Please create farm.config.ts');
  }
  
  private async applyEnvironmentOverrides(config: FarmConfig): Promise<FarmConfig> {
    const envConfig = await this.loadEnvironmentConfig();
    return mergeConfigs(config, envConfig);
  }
  
  private async loadEnvironmentConfig(): Promise<Partial<FarmConfig>> {
    // Load environment-specific configuration
    const env = process.env.NODE_ENV || 'development';
    const envConfigPath = `farm.config.${env}.ts`;
    
    if (await pathExists(envConfigPath)) {
      const envModule = await import(path.resolve(envConfigPath));
      return envModule.default || envModule;
    }
    
    return {};
  }
}
```

### Configuration Validator

**Runtime Configuration Validation:**
```typescript
// packages/core/src/config/validator.ts
import Joi from 'joi';
import type { FarmConfig } from '@farm/types';

const configSchema = Joi.object<FarmConfig>({
  name: Joi.string().required(),
  version: Joi.string().optional(),
  description: Joi.string().optional(),
  
  template: Joi.string().valid(
    'basic', 'ai-chat', 'ai-dashboard', 'ecommerce', 'cms', 'api-only'
  ).required(),
  
  features: Joi.array().items(
    Joi.string().valid(
      'auth', 'ai', 'realtime', 'payments', 'email', 'storage', 'search', 'analytics'
    )
  ).required(),
  
  database: Joi.object({
    type: Joi.string().valid('mongodb', 'postgresql', 'mysql', 'sqlite').required(),
    url: Joi.string().required(),
    options: Joi.object().optional()
  }).required(),
  
  ai: Joi.object({
    providers: Joi.object({
      ollama: Joi.object({
        enabled: Joi.boolean().required(),
        url: Joi.string().optional(),
        models: Joi.array().items(Joi.string()).required(),
        defaultModel: Joi.string().required(),
        autoStart: Joi.boolean().optional(),
        autoPull: Joi.array().items(Joi.string()).optional(),
        gpu: Joi.boolean().optional()
      }).optional(),
      
      openai: Joi.object({
        enabled: Joi.boolean().required(),
        apiKey: Joi.string().optional(),
        models: Joi.array().items(Joi.string()).required(),
        defaultModel: Joi.string().required(),
        rateLimiting: Joi.object({
          requestsPerMinute: Joi.number().optional(),
          tokensPerMinute: Joi.number().optional()
        }).optional()
      }).optional()
    }),
    
    routing: Joi.object({
      development: Joi.string().optional(),
      staging: Joi.string().optional(),
      production: Joi.string().optional()
    }),
    
    features: Joi.object({
      streaming: Joi.boolean().optional(),
      caching: Joi.boolean().optional(),
      rateLimiting: Joi.boolean().optional(),
      fallback: Joi.boolean().optional()
    })
  }).optional(),
  
  development: Joi.object({
    ports: Joi.object({
      frontend: Joi.number().optional(),
      backend: Joi.number().optional(),
      proxy: Joi.number().optional(),
      ai: Joi.number().optional()
    }),
    hotReload: Joi.object({
      enabled: Joi.boolean().optional(),
      typeGeneration: Joi.boolean().optional(),
      aiModels: Joi.boolean().optional()
    }).optional(),
    ssl: Joi.boolean().optional()
  }).optional(),
  
  plugins: Joi.array().items(
    Joi.alternatives().try(
      Joi.string(),
      Joi.array().items(Joi.string(), Joi.object())
    )
  ).optional()
});

export async function validateConfig(config: any): Promise<FarmConfig> {
  const { error, value } = configSchema.validate(config, {
    allowUnknown: true,
    stripUnknown: false
  });
  
  if (error) {
    throw new Error(`Configuration validation failed: ${error.message}`);
  }
  
  return value;
}
```

---

## Environment-Specific Configuration

### Environment Override System

**Environment-Specific Configurations:**
```typescript
// farm.config.development.ts
import { defineConfig } from '@farm/core';

export default defineConfig({
  ai: {
    providers: {
      ollama: {
        enabled: true,
        autoStart: true,
        autoPull: ['llama3.1']
      },
      openai: {
        enabled: false  // Disable in development to save API costs
      }
    },
    routing: {
      development: 'ollama'
    }
  },
  development: {
    hotReload: {
      enabled: true,
      typeGeneration: true,
      aiModels: true
    },
    ssl: false
  }
});
```

```typescript
// farm.config.production.ts
import { defineConfig } from '@farm/core';

export default defineConfig({
  ai: {
    providers: {
      ollama: {
        enabled: false  // Disable local models in production
      },
      openai: {
        enabled: true,
        rateLimiting: {
          requestsPerMinute: 60,
          tokensPerMinute: 40000
        }
      }
    },
    routing: {
      production: 'openai'
    },
    features: {
      caching: true,
      rateLimiting: true
    }
  },
  build: {
    minify: true,
    sourcemap: false
  }
});
```

### Environment Variable Integration

**Secure Environment Variable Handling:**
```typescript
// packages/core/src/config/env.ts
import { z } from 'zod';

// Define environment variable schema
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  DATABASE_URL: z.string().url(),
  OPENAI_API_KEY: z.string().optional(),
  HUGGINGFACE_TOKEN: z.string().optional(),
  FARM_PORT: z.coerce.number().default(4000),
  FARM_AI_PROVIDER: z.string().optional(),
});

export function loadEnvironmentVariables() {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    throw new Error(`Environment validation failed: ${error.message}`);
  }
}
```

---

## Plugin Configuration System

### Plugin Configuration Interface

**Type-Safe Plugin Configuration:**
```typescript
// packages/types/src/plugins.ts
export interface PluginDefinition {
  name: string;
  version?: string;
  options?: Record<string, any>;
}

export interface PluginContext {
  config: FarmConfig;
  environment: string;
  logger: Logger;
}

export interface FarmPlugin {
  name: string;
  configSchema?: any; // Joi schema for validation
  apply(context: PluginContext): void | Promise<void>;
}
```

### Plugin Configuration Examples

**Built-in Plugin Configurations:**
```typescript
// farm.config.ts with plugins
export default defineConfig({
  plugins: [
    // Simple plugin (no configuration)
    '@farm/plugin-auth',
    
    // Plugin with configuration
    ['@farm/plugin-storage', {
      provider: 's3',
      bucket: 'my-app-storage',
      region: 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
      }
    }],
    
    // Plugin with environment-specific config
    ['@farm/plugin-analytics', {
      provider: process.env.NODE_ENV === 'production' ? 'mixpanel' : 'console',
      apiKey: process.env.MIXPANEL_API_KEY,
      debug: process.env.NODE_ENV !== 'production'
    }],
    
    // Custom plugin
    ['./plugins/custom-plugin', {
      customOption: 'value'
    }]
  ]
});
```

---

## Configuration Hot Reload

### Hot Reload System

**Configuration File Watching:**
```typescript
// packages/core/src/config/watcher.ts
import chokidar from 'chokidar';
import { EventEmitter } from 'events';
import { ConfigLoader } from './loader';

export class ConfigWatcher extends EventEmitter {
  private loader = new ConfigLoader();
  private watcher?: chokidar.FSWatcher;
  private currentConfig?: FarmConfig;
  
  async start() {
    // Load initial configuration
    this.currentConfig = await this.loader.loadConfig();
    
    // Watch configuration files
    this.watcher = chokidar.watch([
      'farm.config.ts',
      'farm.config.*.ts',
      'farm.config.js',
      'farm.config.*.js'
    ], {
      ignoreInitial: true
    });
    
    this.watcher.on('change', this.handleConfigChange.bind(this));
    this.watcher.on('add', this.handleConfigChange.bind(this));
    this.watcher.on('unlink', this.handleConfigChange.bind(this));
  }
  
  private async handleConfigChange(path: string) {
    try {
      console.log(`⚙️ Configuration file changed: ${path}`);
      
      // Clear require cache for TypeScript modules
      this.clearConfigCache();
      
      // Reload configuration
      const newConfig = await this.loader.loadConfig();
      
      // Compare configurations to determine what changed
      const changes = this.detectChanges(this.currentConfig!, newConfig);
      
      // Emit change events
      this.emit('config-changed', {
        path,
        oldConfig: this.currentConfig,
        newConfig,
        changes
      });
      
      this.currentConfig = newConfig;
      
      console.log('✅ Configuration reloaded successfully');
    } catch (error) {
      console.error('❌ Configuration reload failed:', error.message);
      this.emit('config-error', { path, error });
    }
  }
  
  private clearConfigCache() {
    // Clear Node.js require cache for config files
    Object.keys(require.cache).forEach(key => {
      if (key.includes('farm.config')) {
        delete require.cache[key];
      }
    });
  }
  
  private detectChanges(oldConfig: FarmConfig, newConfig: FarmConfig) {
    // Deep diff to determine what specific parts changed
    // This helps determine which services need restarting
    return {
      database: JSON.stringify(oldConfig.database) !== JSON.stringify(newConfig.database),
      ai: JSON.stringify(oldConfig.ai) !== JSON.stringify(newConfig.ai),
      development: JSON.stringify(oldConfig.development) !== JSON.stringify(newConfig.development),
      plugins: JSON.stringify(oldConfig.plugins) !== JSON.stringify(newConfig.plugins)
    };
  }
  
  stop() {
    this.watcher?.close();
  }
}
```

---

## Configuration Utilities

### Helper Functions

**Configuration Utilities:**
```typescript
// packages/core/src/config/utils.ts
export function defineConfig(config: FarmConfig): FarmConfig {
  return config;
}

export function mergeConfigs(base: FarmConfig, override: Partial<FarmConfig>): FarmConfig {
  // Deep merge with array replacement for plugins
  return {
    ...base,
    ...override,
    database: { ...base.database, ...override.database },
    ai: {
      ...base.ai,
      ...override.ai,
      providers: {
        ...base.ai?.providers,
        ...override.ai?.providers
      }
    },
    development: { ...base.development, ...override.development },
    build: { ...base.build, ...override.build },
    deployment: { ...base.deployment, ...override.deployment },
    plugins: override.plugins || base.plugins
  };
}

export function getConfigForEnvironment(config: FarmConfig, env: string): FarmConfig {
  // Apply environment-specific routing and settings
  if (config.ai?.routing) {
    const aiProvider = config.ai.routing[env as keyof typeof config.ai.routing];
    if (aiProvider && config.ai.providers?.[aiProvider as keyof typeof config.ai.providers]) {
      // Ensure the selected provider is enabled
      const providers = { ...config.ai.providers };
      Object.keys(providers).forEach(key => {
        if (providers[key as keyof typeof providers]) {
          providers[key as keyof typeof providers]!.enabled = key === aiProvider;
        }
      });
      
      config = {
        ...config,
        ai: {
          ...config.ai,
          providers
        }
      };
    }
  }
  
  return config;
}
```

### CLI Configuration Commands

**Configuration Management Commands:**
```bash
# Validate configuration
farm config validate

# Show resolved configuration
farm config show [--env production]

# Initialize configuration with template
farm config init --template ai-chat

# Migrate configuration to new version
farm config migrate

# Generate TypeScript types for custom plugins
farm config types
```

---

## Integration with Development Server

### Configuration Integration

**Development Server Configuration Usage:**
```typescript
// tools/dev-server/index.ts
import { ConfigLoader, ConfigWatcher } from '@farm/core/config';

export class FarmDevServer {
  private configLoader = new ConfigLoader();
  private configWatcher = new ConfigWatcher();
  
  async start() {
    // Load configuration
    const config = await this.configLoader.loadConfig();
    
    // Start configuration watcher
    await this.configWatcher.start();
    
    // Handle configuration changes
    this.configWatcher.on('config-changed', this.handleConfigChange.bind(this));
    
    // Start services based on configuration
    await this.startServices(config);
  }
  
  private async handleConfigChange(event: any) {
    const { changes, newConfig } = event;
    
    // Restart services based on what changed
    if (changes.database) {
      await this.restartService('database');
    }
    
    if (changes.ai) {
      await this.restartService('ai');
    }
    
    if (changes.development) {
      await this.restartService('frontend');
      await this.restartService('backend');
    }
    
    // Reload plugins if plugin configuration changed
    if (changes.plugins) {
      await this.reloadPlugins(newConfig.plugins);
    }
  }
}
```

---

*Status: ✅ Completed - Ready for implementation*