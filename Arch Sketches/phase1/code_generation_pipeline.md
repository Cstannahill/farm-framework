# Code Generation Pipeline Architecture

## Overview

The code generation pipeline is the core "magic" that enables type-safe full-stack development in FARM. It automatically transforms Python Pydantic models and FastAPI routes into TypeScript types and API client functions, maintaining perfect synchronization between backend and frontend.

---

## Generation Flow Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│ Pydantic Models │───▶│ OpenAPI Schema   │───▶│ TypeScript Types│
│ (Python)        │    │ (JSON)           │    │ (Generated)     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                        │                        │
         ▼                        ▼                        ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│ FastAPI Routes  │───▶│ API Endpoints    │───▶│ API Client      │
│ (Python)        │    │ (OpenAPI)        │    │ (Generated)     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                        │                        │
         ▼                        ▼                        ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│ File Watcher    │───▶│ Hot Reload       │───▶│ Frontend Update │
│ (Development)   │    │ Trigger          │    │ (Live)          │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

---

## Core Components

### 1. OpenAPI Schema Extraction

**Purpose:** Extract comprehensive schema from FastAPI application

**Implementation:**
```python
# tools/codegen/openapi_extractor.py
from fastapi.openapi.utils import get_openapi
from fastapi import FastAPI
import json

class OpenAPIExtractor:
    def __init__(self, app: FastAPI):
        self.app = app
    
    def extract_schema(self) -> dict:
        """Extract OpenAPI schema from FastAPI app"""
        return get_openapi(
            title=self.app.title,
            version=self.app.version,
            openapi_version=self.app.openapi_version,
            description=self.app.description,
            routes=self.app.routes,
            servers=self.app.servers
        )
    
    def save_schema(self, output_path: str):
        """Save schema to file for generation"""
        schema = self.extract_schema()
        with open(output_path, 'w') as f:
            json.dump(schema, f, indent=2)
```

### 2. TypeScript Type Generator

**Purpose:** Convert OpenAPI schemas to TypeScript interfaces

**Generated File Structure:**
```
apps/web/src/types/
├── index.ts                 # Main export file
├── api.ts                   # API-related types
├── ai.ts                    # AI provider types (Ollama, OpenAI, HuggingFace)
├── models/                  # Model interfaces
│   ├── user.ts              # Generated from User model
│   ├── conversation.ts      # Generated from Conversation model (AI apps)
│   ├── message.ts           # Generated from Message model (AI apps)
│   └── index.ts             # Model exports
└── requests/                # Request/Response types
    ├── auth.ts              # Auth-related requests
    ├── users.ts             # User CRUD requests
    ├── ai.ts                # AI provider requests/responses
    └── index.ts             # Request exports
```

**Generation Logic:**
```typescript
// tools/codegen/typescript_generator.js
class TypeScriptGenerator {
  constructor(openAPISchema) {
    this.schema = openAPISchema;
  }

  generateTypes() {
    const types = {};
    
    // Generate model interfaces from components/schemas
    for (const [name, schema] of Object.entries(this.schema.components?.schemas || {})) {
      types[name] = this.generateInterface(name, schema);
    }
    
    // Generate request/response types from paths
    for (const [path, methods] of Object.entries(this.schema.paths || {})) {
      for (const [method, operation] of Object.entries(methods)) {
        types[`${operation.operationId}Request`] = this.generateRequestType(operation);
        types[`${operation.operationId}Response`] = this.generateResponseType(operation);
      }
    }
    
    return types;
  }

  generateInterface(name, schema) {
    // Convert OpenAPI schema to TypeScript interface
    // Handle: objects, arrays, unions, enums, optionals
  }
}
```

### 3. API Client Generator

**Purpose:** Generate type-safe API client functions

**Generated API Client:**
```typescript
// apps/web/src/services/api.ts (generated)
import { ApiClient } from '@farm/api-client';
import type * as Types from '../types';

const client = new ApiClient({
  baseURL: process.env.VITE_API_URL || 'http://localhost:8000'
});

// User operations
export const userApi = {
  // GET /api/users
  list: (params?: Types.ListUsersRequest): Promise<Types.PaginatedResponse<Types.User>> =>
    client.get('/api/users', { params }),
  
  // POST /api/users
  create: (data: Types.CreateUserRequest): Promise<Types.User> =>
    client.post('/api/users', data),
  
  // GET /api/users/{id}
  getById: (id: string): Promise<Types.User> =>
    client.get(`/api/users/${id}`),
  
  // PATCH /api/users/{id}
  update: (id: string, data: Types.UpdateUserRequest): Promise<Types.User> =>
    client.patch(`/api/users/${id}`, data),
  
  // DELETE /api/users/{id}
  delete: (id: string): Promise<void> =>
    client.delete(`/api/users/${id}`)
};

// AI operations with provider support
export const aiApi = {
  // POST /api/ai/chat - Defaults to Ollama in development
  chat: (data: Types.ChatRequest): Promise<Types.ChatResponse> =>
    client.post('/api/ai/chat', data),
  
  // POST /api/ai/chat/stream - Streaming with Ollama/OpenAI
  chatStream: (data: Types.ChatRequest): EventSource =>
    client.streamPost('/api/ai/chat/stream', data),

  // GET /api/ai/models - List models by provider
  listModels: (provider?: 'ollama' | 'openai' | 'huggingface'): Promise<Types.ModelInfo[]> =>
    client.get('/api/ai/models', { params: { provider } }),

  // GET /api/ai/health - Check all AI provider health
  healthCheck: (): Promise<Record<string, Types.ProviderStatus>> =>
    client.get('/api/ai/health'),

  // POST /api/ai/models/{model}/load - Load Ollama model
  loadModel: (modelName: string, provider?: string): Promise<{message: string}> =>
    client.post(`/api/ai/models/${modelName}/load`, { provider })
};
```

### 4. React Hook Generator

**Purpose:** Generate custom hooks for API operations

**Generated Hooks:**
```typescript
// apps/web/src/hooks/api.ts (generated)
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userApi, aiApi } from '../services/api';
import type * as Types from '../types';

// User hooks
export function useUsers(params?: Types.ListUsersRequest) {
  return useQuery({
    queryKey: ['users', params],
    queryFn: () => userApi.list(params)
  });
}

export function useUser(id: string) {
  return useQuery({
    queryKey: ['users', id],
    queryFn: () => userApi.getById(id),
    enabled: !!id
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: userApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    }
  });
}

// AI hooks with Ollama support
export function useAIChat(provider: 'ollama' | 'openai' = 'ollama') {
  return useMutation({
    mutationFn: (request: Types.ChatRequest) => 
      aiApi.chat({ ...request, provider })
  });
}

export function useAIModels(provider?: 'ollama' | 'openai') {
  return useQuery({
    queryKey: ['ai-models', provider],
    queryFn: () => aiApi.listModels(provider),
    staleTime: 5 * 60 * 1000 // 5 minutes
  });
}

export function useAIProviderHealth() {
  return useQuery({
    queryKey: ['ai-health'],
    queryFn: () => aiApi.healthCheck(),
    refetchInterval: 30000 // Check every 30 seconds
  });
}

export function useStreamingChat(defaultProvider: 'ollama' | 'openai' = 'ollama') {
  // Custom streaming hook for real-time AI responses
  // Defaults to Ollama for local development, OpenAI for production
  const [messages, setMessages] = useState<Types.ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  
  // Implementation handles EventSource streaming from Ollama/OpenAI
  // ...
}
```

---

## Generation Triggers

### 1. Development Mode (File Watching)

**File Watcher Configuration:**
```javascript
// tools/codegen/file_watcher.js
import chokidar from 'chokidar';
import { CodeGenerator } from './generator.js';

class FarmFileWatcher {
  constructor(projectPath) {
    this.projectPath = projectPath;
    this.generator = new CodeGenerator(projectPath);
  }

  start() {
    // Watch Python model files
    const modelWatcher = chokidar.watch('apps/api/src/models/**/*.py', {
      ignoreInitial: true
    });

    // Watch FastAPI route files
    const routeWatcher = chokidar.watch('apps/api/src/routes/**/*.py', {
      ignoreInitial: true
    });

    // Trigger regeneration on changes
    [modelWatcher, routeWatcher].forEach(watcher => {
      watcher.on('change', this.onPythonFileChange.bind(this));
      watcher.on('add', this.onPythonFileChange.bind(this));
      watcher.on('unlink', this.onPythonFileChange.bind(this));
    });
  }

  async onPythonFileChange(path) {
    console.log(`🔄 Python file changed: ${path}`);
    console.log('🏗️  Regenerating TypeScript types...');
    
    try {
      await this.generator.regenerateTypes();
      console.log('✅ Types regenerated successfully');
      
      // Trigger frontend hot reload
      this.triggerHotReload();
    } catch (error) {
      console.error('❌ Type generation failed:', error);
    }
  }

  triggerHotReload() {
    // Send HMR signal to Vite dev server
    // This ensures frontend picks up new types immediately
  }
}
```

### 2. Build Time Generation

**Build Integration:**
```javascript
// apps/web/vite.config.ts
import { defineConfig } from 'vite';
import { farmCodegenPlugin } from '@farm/vite-plugin';

export default defineConfig({
  plugins: [
    farmCodegenPlugin({
      // Generate types before build starts
      generateOnBuild: true,
      // Path to FastAPI app
      apiPath: '../api/src/main.py',
      // Output directory for generated files
      outputDir: './src/types'
    })
  ]
});
```

### 3. Manual Generation

**CLI Command:**
```bash
# Regenerate all types and API clients
farm generate types

# Regenerate specific model types
farm generate types --models User,Product

# Regenerate API client only
farm generate client
```

---

## Generation Process Detail

### Step 1: Schema Extraction

```python
# Extract OpenAPI schema from running FastAPI app
def extract_openapi_schema(api_module_path: str) -> dict:
    """
    Import FastAPI app and extract OpenAPI schema
    """
    # Import the FastAPI app dynamically
    app = import_fastapi_app(api_module_path)
    
    # Extract schema
    schema = get_openapi(
        title=app.title,
        version=app.version,
        routes=app.routes
    )
    
    return schema
```

### Step 2: Type Transformation

```typescript
// Transform OpenAPI schema types to TypeScript
function transformSchemaToTypeScript(schema: OpenAPISchema): string {
  switch (schema.type) {
    case 'object':
      return generateInterfaceFromObject(schema);
    case 'array':
      return `Array<${transformSchemaToTypeScript(schema.items)}>`;
    case 'string':
      return schema.enum ? generateEnumType(schema.enum) : 'string';
    case 'integer':
    case 'number':
      return 'number';
    case 'boolean':
      return 'boolean';
    default:
      return 'unknown';
  }
}

function generateInterfaceFromObject(schema: ObjectSchema): string {
  const properties = Object.entries(schema.properties || {})
    .map(([key, prop]) => {
      const optional = !schema.required?.includes(key) ? '?' : '';
      const type = transformSchemaToTypeScript(prop);
      return `  ${key}${optional}: ${type};`;
    })
    .join('\n');

  return `{\n${properties}\n}`;
}
```

### Step 3: API Client Generation

```typescript
// Generate API client methods from OpenAPI paths
function generateApiClientFromPaths(paths: OpenAPIPaths): string {
  const methods = Object.entries(paths).flatMap(([path, pathItem]) =>
    Object.entries(pathItem).map(([method, operation]) =>
      generateClientMethod(method, path, operation)
    )
  );

  return `export const api = {\n${methods.join(',\n')}\n};`;
}

function generateClientMethod(method: string, path: string, operation: OperationObject): string {
  const operationId = operation.operationId;
  const requestType = `${operationId}Request`;
  const responseType = `${operationId}Response`;
  
  return `  ${operationId}: (data: ${requestType}): Promise<${responseType}> =>
    client.${method}('${path}', data)`;
}
```

---

## Error Handling & Validation

### Schema Validation
```python
def validate_generated_schema(schema: dict) -> bool:
    """Validate OpenAPI schema before generation"""
    required_fields = ['openapi', 'info', 'paths']
    
    for field in required_fields:
        if field not in schema:
            raise ValueError(f"Missing required field: {field}")
    
    return True
```

### Type Generation Errors
```typescript
class TypeGenerationError extends Error {
  constructor(
    message: string,
    public schemaPath: string,
    public originalError?: Error
  ) {
    super(`Type generation failed at ${schemaPath}: ${message}`);
  }
}

// Handle unsupported types gracefully
function handleUnsupportedType(schema: any, path: string): string {
  console.warn(`Unsupported schema type at ${path}:`, schema);
  return 'any'; // Fallback to 'any' type
}
```

---

## Caching & Performance

### Schema Caching
```javascript
class SchemaCache {
  constructor() {
    this.cache = new Map();
    this.checksums = new Map();
  }

  shouldRegenerate(schemaPath: string, currentChecksum: string): boolean {
    const lastChecksum = this.checksums.get(schemaPath);
    return lastChecksum !== currentChecksum;
  }

  updateCache(schemaPath: string, schema: any, checksum: string) {
    this.cache.set(schemaPath, schema);
    this.checksums.set(schemaPath, checksum);
  }
}
```

### Incremental Generation
```typescript
// Only regenerate changed types, not entire type system
function generateIncrementalTypes(
  previousSchema: OpenAPISchema,
  currentSchema: OpenAPISchema
): GenerationResult {
  const changedModels = findChangedModels(previousSchema, currentSchema);
  const changedPaths = findChangedPaths(previousSchema, currentSchema);
  
  return {
    modelsToRegenerate: changedModels,
    clientMethodsToRegenerate: changedPaths,
    fullRegeneration: false
  };
}
```

---

## Integration Points

### Development Server Integration
```python
# apps/api/src/main.py
from fastapi import FastAPI
from farm.codegen import enable_auto_generation

app = FastAPI()

# Enable automatic type generation in development
if os.getenv('FARM_ENV') == 'development':
    enable_auto_generation(app, output_dir='../web/src/types')
```

### Build System Integration
```javascript
// package.json scripts
{
  "scripts": {
    "dev": "farm dev",
    "build": "farm generate types && farm build",
    "type-check": "farm generate types && tsc --noEmit"
  }
}
```

---

*Status: ✅ Completed - Ready for implementation*