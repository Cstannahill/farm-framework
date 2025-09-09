# @farm/type-sync

The FARM Framework type synchronization package automatically generates TypeScript types, API clients, and React hooks from FastAPI OpenAPI schemas. It provides seamless type safety between your Python backend and TypeScript frontend.

## 🚀 Quick Start

```bash
npm install @farm/type-sync
```

```typescript
import { TypeSyncOrchestrator } from '@farm/type-sync';

const orchestrator = new TypeSyncOrchestrator({
  apiUrl: 'http://localhost:8000',
  outputDir: './src/api',
  watch: true
});

await orchestrator.sync();
```

## 📋 Core Features

### Automatic Type Generation

Generate TypeScript types from FastAPI models and endpoints.

```typescript
// Generated from FastAPI model
export interface User {
  id: number;
  name: string;
  email: string;
  created_at: string;
  updated_at: string;
}

// Generated from FastAPI endpoint
export interface CreateUserRequest {
  name: string;
  email: string;
  password: string;
}
```

### API Client Generation

Create fully-typed API clients with automatic request/response handling.

```typescript
import { ApiClient } from './generated/api-client';

const client = new ApiClient({
  baseURL: 'http://localhost:8000',
  timeout: 10000
});

// Fully typed API calls
const user = await client.users.create({
  name: 'John Doe',
  email: 'john@example.com',
  password: 'secure123'
});

const users = await client.users.list({
  page: 1,
  limit: 10
});
```

### React Query Hooks

Generate React Query hooks for seamless data fetching.

```typescript
import { useUsers, useCreateUser } from './generated/hooks';

function UsersList() {
  const { data: users, isLoading, error } = useUsers({
    page: 1,
    limit: 10
  });

  const createUser = useCreateUser();

  const handleCreateUser = async (userData: CreateUserRequest) => {
    await createUser.mutateAsync(userData);
  };

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      {users?.map(user => (
        <div key={user.id}>{user.name}</div>
      ))}
    </div>
  );
}
```

### AI-Specific Hooks

Generate specialized hooks for AI operations with streaming support.

```typescript
import { useStreamingChat, useAIModels } from './generated/ai-hooks';

function ChatInterface() {
  const { messages, sendMessage, isLoading } = useStreamingChat();
  const { data: models } = useAIModels();

  const handleSendMessage = async (content: string) => {
    await sendMessage({
      content,
      model: 'llama3.2:3b'
    });
  };

  return (
    <div>
      {messages.map(message => (
        <div key={message.id}>{message.content}</div>
      ))}
      <input 
        onKeyPress={(e) => {
          if (e.key === 'Enter') {
            handleSendMessage(e.target.value);
          }
        }}
        disabled={isLoading}
      />
    </div>
  );
}
```

## 🏗️ Architecture

### Core Components

```
@farm/type-sync
├── Orchestration
│   ├── TypeSyncOrchestrator    # Main coordination
│   ├── TypeSyncWatcher         # File watching
│   └── GenerationCache         # Caching system
├── Extraction
│   ├── OpenAPIExtractor        # Schema extraction
│   └── SchemaValidator         # Schema validation
├── Generation
│   ├── TypeScriptGenerator     # Type generation
│   ├── APIClientGenerator      # Client generation
│   ├── ReactHookGenerator      # Hook generation
│   └── AIHookGenerator         # AI-specific hooks
├── Templates
│   ├── TemplateEngine          # Template processing
│   ├── BuiltInTemplates        # Default templates
│   └── CustomTemplates         # User templates
└── Utilities
    ├── TypeDiffer              # Change detection
    ├── PerformanceMonitor      # Performance tracking
    └── ErrorHandler            # Error management
```

### Processing Pipeline

```
1. Schema Extraction
   ├── Fetch OpenAPI schema from FastAPI
   ├── Validate schema structure
   └── Parse and normalize schema

2. Type Generation
   ├── Generate TypeScript interfaces
   ├── Create request/response types
   └── Handle complex nested types

3. Client Generation
   ├── Generate API client class
   ├── Create method signatures
   └── Add error handling

4. Hook Generation
   ├── Generate React Query hooks
   ├── Create AI-specific hooks
   └── Add streaming support

5. File Output
   ├── Write generated files
   ├── Update imports
   └── Trigger rebuilds
```

## 📚 API Reference

### Orchestration

#### `TypeSyncOrchestrator`

Main orchestrator that coordinates the entire type synchronization process.

```typescript
import { TypeSyncOrchestrator } from '@farm/type-sync';

const orchestrator = new TypeSyncOrchestrator({
  apiUrl: 'http://localhost:8000',
  outputDir: './src/api',
  watch: true,
  cache: true,
  verbose: true
});

// Start synchronization
await orchestrator.sync();

// Stop watching
await orchestrator.stop();
```

#### `TypeSyncWatcher`

Watches for changes and triggers automatic synchronization.

```typescript
import { TypeSyncWatcher } from '@farm/type-sync';

const watcher = new TypeSyncWatcher({
  apiUrl: 'http://localhost:8000',
  outputDir: './src/api',
  debounce: 1000,
  ignore: ['node_modules', '.git']
});

watcher.on('change', (file) => {
  console.log(`Schema changed: ${file}`);
});

watcher.on('error', (error) => {
  console.error('Watch error:', error);
});

await watcher.start();
```

### Extraction

#### `OpenAPIExtractor`

Extracts and validates OpenAPI schemas from FastAPI applications.

```typescript
import { OpenAPIExtractor } from '@farm/type-sync';

const extractor = new OpenAPIExtractor({
  apiUrl: 'http://localhost:8000',
  timeout: 10000,
  retries: 3
});

const schema = await extractor.extract();
console.log('Extracted schema:', schema);
```

### Generation

#### `TypeScriptGenerator`

Generates TypeScript types from OpenAPI schemas.

```typescript
import { TypeScriptGenerator } from '@farm/type-sync';

const generator = new TypeScriptGenerator({
  outputDir: './src/types',
  format: true,
  includeComments: true
});

await generator.generate(schema, {
  includeModels: true,
  includeEnums: true,
  includeSchemas: true
});
```

#### `APIClientGenerator`

Generates typed API clients.

```typescript
import { APIClientGenerator } from '@farm/type-sync';

const generator = new APIClientGenerator({
  outputDir: './src/api',
  clientName: 'ApiClient',
  baseURL: 'http://localhost:8000'
});

await generator.generate(schema, {
  includeAuth: true,
  includeRetry: true,
  includeStreaming: true
});
```

#### `ReactHookGenerator`

Generates React Query hooks.

```typescript
import { ReactHookGenerator } from '@farm/type-sync';

const generator = new ReactHookGenerator({
  outputDir: './src/hooks',
  queryClient: 'queryClient',
  includeMutations: true
});

await generator.generate(schema, {
  includeQueries: true,
  includeMutations: true,
  includeInfiniteQueries: true
});
```

#### `AIHookGenerator`

Generates AI-specific hooks with streaming support.

```typescript
import { AIHookGenerator } from '@farm/type-sync';

const generator = new AIHookGenerator({
  outputDir: './src/hooks/ai',
  streaming: true,
  providers: ['ollama', 'openai']
});

await generator.generate(schema, {
  includeChat: true,
  includeModels: true,
  includeStreaming: true
});
```

### Templates

#### `TemplateEngine`

Processes templates for code generation.

```typescript
import { TemplateEngine, BuiltInTemplates } from '@farm/type-sync';

const engine = new TemplateEngine({
  templates: BuiltInTemplates,
  helpers: {
    toPascalCase: (str) => str.charAt(0).toUpperCase() + str.slice(1),
    toCamelCase: (str) => str.charAt(0).toLowerCase() + str.slice(1)
  }
});

const result = await engine.render('api-client.hbs', {
  clientName: 'ApiClient',
  endpoints: schema.endpoints
});
```

### Utilities

#### `TypeDiffer`

Detects changes in generated types.

```typescript
import { TypeDiffer } from '@farm/type-sync';

const differ = new TypeDiffer({
  outputDir: './src/api',
  cacheFile: './.farm/type-sync-cache.json'
});

const changes = await differ.detectChanges(newSchema, oldSchema);
console.log('Changes detected:', changes);
```

#### `PerformanceMonitor`

Monitors generation performance.

```typescript
import { PerformanceMonitor } from '@farm/type-sync';

const monitor = new PerformanceMonitor({
  enabled: true,
  outputFile: './.farm/performance.json'
});

const metrics = await monitor.measure('type-generation', async () => {
  await generator.generate(schema);
});

console.log('Generation took:', metrics.duration, 'ms');
```

## 🔧 Configuration

### CLI Configuration

```bash
# Basic synchronization
type-sync sync --api-url http://localhost:8000 --output ./src/api

# Watch mode
type-sync sync --watch --api-url http://localhost:8000

# Custom templates
type-sync sync --templates ./custom-templates --api-url http://localhost:8000

# Verbose output
type-sync sync --verbose --api-url http://localhost:8000
```

### Programmatic Configuration

```typescript
import { TypeSyncOrchestrator } from '@farm/type-sync';

const orchestrator = new TypeSyncOrchestrator({
  // API configuration
  apiUrl: 'http://localhost:8000',
  apiKey: process.env.API_KEY,
  timeout: 10000,
  
  // Output configuration
  outputDir: './src/api',
  typesDir: './src/types',
  hooksDir: './src/hooks',
  
  // Generation options
  generateTypes: true,
  generateClient: true,
  generateHooks: true,
  generateAIHooks: true,
  
  // Template options
  templates: './custom-templates',
  formatCode: true,
  includeComments: true,
  
  // Watch options
  watch: true,
  debounce: 1000,
  ignore: ['node_modules', '.git'],
  
  // Cache options
  cache: true,
  cacheFile: './.farm/type-sync-cache.json',
  
  // Performance options
  performance: true,
  verbose: true
});
```

## 🎯 Advanced Usage

### Custom Templates

Create custom templates for specialized code generation.

```handlebars
{{!-- custom-api-client.hbs --}}
import { AxiosInstance } from 'axios';

export class {{clientName}} {
  constructor(private axios: AxiosInstance) {}

  {{#each endpoints}}
  async {{methodName}}({{#each parameters}}{{name}}: {{type}}{{#unless @last}}, {{/unless}}{{/each}}): Promise<{{returnType}}> {
    const response = await this.axios.{{httpMethod}}('{{path}}', {
      {{#if hasBody}}data: {{bodyParameter}}{{/if}}
    });
    return response.data;
  }
  {{/each}}
}
```

### Plugin System

Extend functionality with plugins.

```typescript
import { TypeSyncPlugin } from '@farm/type-sync';

const customPlugin: TypeSyncPlugin = {
  name: 'custom-plugin',
  hooks: {
    beforeGenerate: async (context) => {
      console.log('Before generation:', context);
    },
    afterGenerate: async (context) => {
      console.log('After generation:', context);
    }
  }
};

const orchestrator = new TypeSyncOrchestrator({
  plugins: [customPlugin]
});
```

### Build Integration

Integrate with build tools like Vite, Webpack, or Next.js.

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import { typeSyncPlugin } from '@farm/type-sync/vite';

export default defineConfig({
  plugins: [
    typeSyncPlugin({
      apiUrl: 'http://localhost:8000',
      outputDir: './src/api',
      watch: true
    })
  ]
});
```

## 🐛 Troubleshooting

### Common Issues

#### Schema Extraction Fails
```typescript
// Check API availability
const extractor = new OpenAPIExtractor({
  apiUrl: 'http://localhost:8000',
  timeout: 10000
});

try {
  const schema = await extractor.extract();
} catch (error) {
  console.error('Schema extraction failed:', error);
}
```

#### Type Generation Errors
```typescript
// Validate schema before generation
const validator = new SchemaValidator();
const isValid = await validator.validate(schema);

if (!isValid) {
  console.error('Invalid schema:', validator.errors);
}
```

#### Watch Mode Issues
```typescript
// Check watcher status
const watcher = new TypeSyncWatcher({ apiUrl: 'http://localhost:8000' });
console.log('Watcher status:', watcher.status);
```

### Getting Help

- **GitHub Issues**: [Report bugs](https://github.com/farm-stack/framework/issues)
- **Documentation**: [Type Sync Reference](../docs/reference/type-sync/)
- **Discussions**: [Community help](https://github.com/farm-stack/framework/discussions)

## 🔄 Changelog

### v0.1.0
- Initial release with basic type synchronization
- OpenAPI schema extraction
- TypeScript type generation
- API client generation
- React Query hook generation
- AI-specific hook generation
- Watch mode support
- Template system
- Plugin architecture

## 📄 License

MIT © FARM Framework