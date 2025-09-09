# @farm/core

The FARM Framework core package provides essential utilities, configuration management, and framework initialization. It serves as the foundation for all other FARM packages.

## 🚀 Quick Start

```bash
npm install @farm/core
```

```typescript
import { defineConfig, initialize } from '@farm/core';

// Define your configuration
const config = defineConfig({
  projectName: 'my-app',
  ai: {
    providers: {
      ollama: {
        model: 'llama3.2:3b'
      }
    }
  }
});

// Initialize the framework
const framework = await initialize();
```

## 📋 Core Features

### Configuration Management

The `defineConfig` helper provides type-safe configuration with intelligent defaults.

```typescript
import { defineConfig } from '@farm/core';

export default defineConfig({
  // Project settings
  projectName: 'my-ai-app',
  version: '1.0.0',
  environment: 'development',
  
  // AI configuration
  ai: {
    providers: {
      ollama: {
        model: 'llama3.2:3b',
        baseUrl: 'http://localhost:11434'
      },
      openai: {
        apiKey: process.env.OPENAI_API_KEY,
        model: 'gpt-4'
      }
    },
    defaultProvider: 'ollama',
    streaming: true,
    caching: true
  },
  
  // Database configuration
  database: {
    type: 'mongodb',
    url: 'mongodb://localhost:27017/my-app',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true
    }
  },
  
  // Development settings
  dev: {
    frontend: {
      port: 3000,
      host: 'localhost'
    },
    backend: {
      port: 8000,
      host: 'localhost'
    },
    hotReload: true,
    verbose: false
  }
});
```

### Framework Initialization

Initialize the framework with proper setup and validation.

```typescript
import { initialize } from '@farm/core';

const framework = await initialize({
  config: './farm.config.ts',
  validate: true,
  verbose: true
});

console.log(`Framework v${framework.version} ready!`);
```

### Code Generation

Orchestrate code generation processes across the framework.

```typescript
import { CodeGenerator } from '@farm/core';

const generator = new CodeGenerator({
  templates: './templates',
  output: './generated',
  watch: true
});

await generator.generate('api-client', {
  schema: './api/openapi.json',
  target: 'typescript'
});
```

### File Watching

Monitor file changes and trigger appropriate actions.

```typescript
import { FileWatcher } from '@farm/core';

const watcher = new FileWatcher({
  paths: ['./src', './templates'],
  ignore: ['node_modules', '.git'],
  debounce: 300
});

watcher.on('change', (file) => {
  console.log(`File changed: ${file}`);
  // Trigger rebuild or regeneration
});

await watcher.start();
```

## 🏗️ Architecture

### Core Components

```
@farm/core
├── Configuration
│   ├── defineConfig()      # Type-safe config helper
│   ├── ConfigValidator     # Configuration validation
│   └── ConfigLoader        # Configuration loading
├── Initialization
│   ├── initialize()        # Framework initialization
│   ├── HealthChecker       # System health monitoring
│   └── DependencyResolver  # Dependency management
├── Code Generation
│   ├── CodeGenerator       # Code generation orchestration
│   ├── TemplateEngine      # Template processing
│   └── FileGenerator       # File generation utilities
├── File System
│   ├── FileWatcher         # File change monitoring
│   ├── PathResolver        # Path resolution utilities
│   └── FileUtils           # File system utilities
└── Utilities
    ├── Logger              # Logging utilities
    ├── ErrorHandler        # Error handling
    └── ProgressTracker     # Progress tracking
```

### Package Dependencies

```typescript
// Core dependencies
import { TemplateContext } from '@farm/types';
import { TypeSyncOrchestrator } from '@farm/type-sync';

// External dependencies
import fs from 'fs-extra';
import chokidar from 'chokidar';
import Handlebars from 'handlebars';
```

## 📚 API Reference

### Configuration

#### `defineConfig<T>(config: T): T`

Creates a type-safe configuration object with validation.

```typescript
import { defineConfig } from '@farm/core';

interface MyConfig {
  projectName: string;
  ai: {
    providers: Record<string, any>;
  };
}

const config = defineConfig<MyConfig>({
  projectName: 'my-app',
  ai: {
    providers: {
      ollama: { model: 'llama3.2:3b' }
    }
  }
});
```

#### `ConfigValidator`

Validates configuration objects against schemas.

```typescript
import { ConfigValidator } from '@farm/core';

const validator = new ConfigValidator();
const result = await validator.validate(config, schema);

if (!result.valid) {
  console.error('Configuration errors:', result.errors);
}
```

### Initialization

#### `initialize(options?: InitOptions): Promise<Framework>`

Initializes the FARM framework with configuration and health checks.

```typescript
import { initialize } from '@farm/core';

const framework = await initialize({
  config: './farm.config.ts',
  validate: true,
  verbose: true,
  healthCheck: true
});

// Framework is ready
console.log(framework.version);
console.log(framework.status);
```

#### `HealthChecker`

Monitors system health and dependencies.

```typescript
import { HealthChecker } from '@farm/core';

const healthChecker = new HealthChecker();
const health = await healthChecker.checkAll();

console.log('System health:', health);
```

### Code Generation

#### `CodeGenerator`

Orchestrates code generation processes.

```typescript
import { CodeGenerator } from '@farm/core';

const generator = new CodeGenerator({
  templates: './templates',
  output: './generated',
  watch: true,
  verbose: true
});

// Generate API client
await generator.generate('api-client', {
  schema: './api/openapi.json',
  target: 'typescript',
  output: './src/api'
});

// Generate types
await generator.generate('types', {
  schema: './api/openapi.json',
  target: 'typescript',
  output: './src/types'
});
```

#### `TemplateEngine`

Processes Handlebars templates with context.

```typescript
import { TemplateEngine } from '@farm/core';

const engine = new TemplateEngine({
  templates: './templates',
  helpers: {
    uppercase: (str) => str.toUpperCase(),
    formatDate: (date) => new Date(date).toISOString()
  }
});

const result = await engine.render('component.hbs', {
  name: 'MyComponent',
  props: ['title', 'content']
});
```

### File System

#### `FileWatcher`

Monitors file changes with debouncing and filtering.

```typescript
import { FileWatcher } from '@farm/core';

const watcher = new FileWatcher({
  paths: ['./src', './templates'],
  ignore: ['node_modules', '.git', '*.tmp'],
  debounce: 300,
  persistent: true
});

watcher.on('change', (file, stats) => {
  console.log(`File changed: ${file}`);
});

watcher.on('add', (file) => {
  console.log(`File added: ${file}`);
});

watcher.on('unlink', (file) => {
  console.log(`File removed: ${file}`);
});

await watcher.start();
```

#### `PathResolver`

Resolves paths with support for aliases and base directories.

```typescript
import { PathResolver } from '@farm/core';

const resolver = new PathResolver({
  baseDir: './src',
  aliases: {
    '@': './src',
    '@components': './src/components',
    '@utils': './src/utils'
  }
});

const resolved = resolver.resolve('@components/Button');
// Returns: ./src/components/Button
```

### Utilities

#### `Logger`

Structured logging with different levels and formatting.

```typescript
import { Logger } from '@farm/core';

const logger = new Logger({
  level: 'info',
  format: 'json',
  output: './logs'
});

logger.info('Framework initialized');
logger.warn('Deprecated API used');
logger.error('Configuration error', { error: 'Invalid schema' });
```

#### `ErrorHandler`

Centralized error handling with context and recovery.

```typescript
import { ErrorHandler } from '@farm/core';

const errorHandler = new ErrorHandler({
  logErrors: true,
  exitOnError: false,
  recovery: true
});

try {
  // Risky operation
  await riskyOperation();
} catch (error) {
  await errorHandler.handle(error, {
    context: 'code-generation',
    operation: 'template-processing'
  });
}
```

#### `ProgressTracker`

Track and report progress for long-running operations.

```typescript
import { ProgressTracker } from '@farm/core';

const tracker = new ProgressTracker({
  total: 100,
  format: 'percentage'
});

tracker.on('progress', (progress) => {
  console.log(`Progress: ${progress.percentage}%`);
});

tracker.on('complete', () => {
  console.log('Operation completed!');
});

// Update progress
tracker.update(25); // 25%
tracker.update(50); // 50%
tracker.complete(); // 100%
```

## 🔧 Development

### Local Development

```bash
# Install dependencies
pnpm install

# Build the package
pnpm build

# Run tests
pnpm test

# Run tests in watch mode
pnpm test:watch
```

### Testing

```typescript
import { defineConfig, initialize } from '@farm/core';

describe('Core Framework', () => {
  it('should initialize with valid config', async () => {
    const config = defineConfig({
      projectName: 'test-app'
    });
    
    const framework = await initialize({ config });
    expect(framework.status).toBe('ready');
  });
});
```

## 🐛 Troubleshooting

### Common Issues

#### Configuration Validation Errors
```typescript
// Check configuration schema
const validator = new ConfigValidator();
const result = await validator.validate(config);

if (!result.valid) {
  console.error('Configuration errors:', result.errors);
}
```

#### File Watching Issues
```typescript
// Check file watcher status
const watcher = new FileWatcher({ paths: ['./src'] });
console.log('Watcher status:', watcher.status);
```

#### Code Generation Failures
```typescript
// Enable verbose logging
const generator = new CodeGenerator({
  verbose: true,
  debug: true
});
```

### Getting Help

- **GitHub Issues**: [Report bugs](https://github.com/farm-stack/framework/issues)
- **Documentation**: [Core Reference](../docs/reference/core/)
- **Discussions**: [Community help](https://github.com/farm-stack/framework/discussions)

## 🔄 Changelog

### v0.2.0
- Added comprehensive configuration management
- Improved error handling and logging
- Enhanced file watching capabilities
- Added progress tracking utilities

### v0.1.0
- Initial release with basic functionality
- Configuration helpers
- File system utilities
- Basic code generation support

## 📄 License

MIT © FARM Framework