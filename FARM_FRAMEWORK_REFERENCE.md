# FARM Framework - Complete Package & Template Reference

## Framework Overview

FARM is an AI-first full-stack development platform combining:

- **F**astAPI (Python backend)
- **A**I/ML (Ollama local + cloud providers)
- **R**eact (TypeScript frontend)
- **M**ongoDB (default database)

## Package Architecture

### Core Framework Packages

#### `@farm-framework/core` ✅

**Purpose:** Framework foundation & utilities  
**Location:** `packages/core/`  
**Dependencies:**

- `@farm-framework/type-sync`: "workspace:\*"
- `@farm-framework/types`: "workspace:\*"
- `chalk`, `lodash`

**Exports:**

- `defineConfig<T>(config: T): T` - Type-safe configuration helper
- All types from `@farm-framework/types`
- Type-sync utilities for code generation
- Version information

**Key Features:**

- Configuration management and validation
- Code generation orchestrator
- File watching & hot reload coordination
- AI provider interfaces and Ollama integration

#### `@farm-framework/types` ✅

**Purpose:** Shared TypeScript types  
**Location:** `packages/types/`  
**Dependencies:** `chokidar`

**Key Type Exports:**

- `FarmConfig` - Main configuration interface
- `FeatureType`: `"auth" | "ai" | "realtime" | "payments" | "email" | "storage" | "search" | "analytics"`
- `TemplateType`: `"basic" | "ai-chat" | "ai-dashboard" | "ecommerce" | "cms" | "api-only"`
- `AIConfig`, `DatabaseConfig`, `DevelopmentConfig`
- CLI, template, plugin, and observability types

#### `@farm-framework/ai` ✅

**Purpose:** AI orchestration layer  
**Location:** `packages/ai/`  
**Dependencies:** None (pure interfaces)

**Exports:**

- `BaseAIProvider` - Base class for all AI providers
- `ProviderRegistry` - Singleton registry for AI providers
- `AIConfigManager` - Configuration validation & normalization

#### `@farm-framework/cli` ✅ (Published as `farm-framework`)

**Purpose:** Command-line interface  
**Location:** `packages/cli/`  
**Bin:** `farm`  
**Dependencies:**

- `@farm-framework/core`: "^0.1.0"
- `@farm-framework/types`: "^0.1.0"
- `@farm-framework/dev-server`: "^0.1.0"
- `commander`, `inquirer`, `handlebars`, `chalk`, etc.

### Supporting Packages

#### `@farm-framework/type-sync` ✅

**Purpose:** Type synchronization between FastAPI and TypeScript  
**Location:** `packages/type-sync/`  
**Dependencies:** `openapi-types`, `fs-extra`, `lodash-es`, `change-case`

#### `@farm-framework/api-client` ✅

**Purpose:** HTTP client utilities  
**Location:** `packages/api-client/`  
**Dependencies:** `axios`

#### `@farm-framework/ui-components` ✅

**Purpose:** Reusable React components  
**Location:** `packages/ui-components/`  
**Dependencies:** `@farm-framework/types`  
**Peer Dependencies:** `react`, `react-dom`

#### `@farm-framework/observability` ✅

**Purpose:** Telemetry, monitoring, cost tracking  
**Location:** `packages/observability/`  
**Dependencies:** OpenTelemetry suite, `chalk`, `fs-extra`

### Development Tools

#### `@farm-framework/dev-server` ✅

**Purpose:** Development server orchestration  
**Location:** `tools/dev-server/`  
**Dependencies:** `@farm-framework/type-sync`, `chalk`

**Features:**

- Multi-service process management (MongoDB, FastAPI, React, Ollama)
- Health monitoring and automatic restart
- Unified logging with color coding
- Hot reload coordination
- Configuration-driven service startup

## Template Structure & Dependencies

### Base Template (`packages/cli/templates/base/`)

**Purpose:** Foundation for all other templates  
**Key Files:**

- `package.json.hbs` - Core dependencies
- `farm.config.ts.hbs` - Configuration template
- `.gitignore`, `README.md.hbs`

### Template Types

#### 1. `basic` Template (`packages/cli/templates/basic/`)

**Purpose:** Full-stack foundation  
**Structure:** Monorepo with `apps/web` and `apps/api`

#### 2. `ai-chat` Template (`packages/cli/templates/ai-chat/`)

**Purpose:** AI chat application  
**Features:** Ollama + OpenAI integration, streaming chat

#### 3. `ai-dashboard` Template (`packages/cli/templates/ai-dashboard/`)

**Purpose:** AI analytics/monitoring dashboard

#### 4. `api-only` Template (`packages/cli/templates/api-only/`)

**Purpose:** Backend-only FastAPI service

#### 5. `ecommerce`, `cms` Templates

**Purpose:** Specialized application types

## Package Dependencies by Template

### Base Dependencies (All Templates)

```json
{
  "dependencies": {
    "@farm-framework/core": "^0.1.0",
    "@farm-framework/types": "^0.1.0"
  },
  "devDependencies": {
    "@farm-framework/dev-server": "workspace:*",
    "typescript": "^5.0.0",
    "eslint": "^8.0.0",
    "vitest": "^3.2.2"
  }
}
```

### Feature-Based Dependencies

#### AI Feature (`--features ai`)

**Runtime Dependencies:**

- Third-party packages: `openai`, `ollama` (Node.js)
- Python: `openai`, `httpx`, `websockets`

**NO dedicated `@farm-framework/ai` runtime package** - AI functionality is provided through:

- `@farm-framework/core` (AI provider interfaces)
- `@farm-framework/ai` (configuration & registry)
- Third-party AI SDKs

#### Auth Feature (`--features auth`)

**Runtime Dependencies:**

- `jsonwebtoken`, `bcryptjs` (Node.js)
- `python-jose[cryptography]`, `passlib[bcrypt]` (Python)

#### Realtime Feature (`--features realtime`)

**Runtime Dependencies:**

- `socket.io`, `socket.io-client` (Node.js)
- `python-socketio`, `redis` (Python)

#### Storage Feature (`--features storage`)

**Runtime Dependencies:**

- `multer`, `aws-sdk` (Node.js)
- `boto3`, `python-multipart`, `Pillow` (Python)

#### Other Features

- **Payments:** `stripe`
- **Email:** `nodemailer` / `fastapi-mail`
- **Search:** `elasticsearch`
- **Analytics:** `mixpanel`

## Configuration System

### Farm Config Structure

```typescript
interface FarmConfig {
  name: string;
  template: TemplateType;
  features: FeatureType[];
  database: DatabaseConfig;
  ai?: AIConfig;
  development?: DevelopmentConfig;
  build?: BuildConfig;
  deployment?: DeploymentConfig;
  plugins?: PluginConfig[];
}
```

### AI Configuration

```typescript
interface AIConfig {
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
```

### Development Configuration

```typescript
interface DevelopmentConfig {
  ports: {
    frontend?: number; // Default: 3000
    backend?: number; // Default: 8000
    proxy?: number; // Default: 4000
    database?: number; // Default: 27017
    ollama?: number; // Default: 11434
  };
  hotReload: {
    enabled?: boolean;
    typeGeneration?: boolean;
    aiModels?: boolean;
  };
}
```

## Framework Scripts & Commands

### CLI Commands

- `farm create <name>` - Create new project
- `farm dev` - Start development server
- `farm build` - Build for production
- `farm generate` - Generate types/clients
- `farm database` - Database utilities

### Dev Server Options

- `farm dev --frontend-only` - Frontend only
- `farm dev --backend-only` - Backend + dependencies
- `farm dev --verbose` - Detailed logging
- `farm dev --services database,backend` - Specific services

### Standard Package Scripts

```json
{
  "scripts": {
    "dev": "farm dev",
    "build": "farm build",
    "start": "farm start",
    "test": "vitest",
    "lint": "eslint . --ext ts,tsx",
    "type-check": "tsc --noEmit"
  }
}
```

## Key Architecture Principles

### 1. **Feature-Driven Dependencies**

- Features like `ai`, `auth`, `realtime` add specific third-party packages
- No monolithic `@farm-framework/[feature]` packages (except core AI interfaces)
- Use battle-tested libraries (OpenAI SDK, Socket.IO, etc.)

### 2. **Development vs Runtime Separation**

- `@farm-framework/dev-server` is dev-only (workspace dependency)
- `@farm-framework/core` provides runtime utilities
- Templates include appropriate runtime dependencies

### 3. **Configuration-Driven**

- Single `farm.config.ts` controls all framework behavior
- Type-safe configuration via `defineConfig()`
- Feature flags control dependency inclusion

### 4. **Provider Abstraction**

- AI providers abstracted through `@farm-framework/ai`
- Database providers through standard ORMs
- Deployment providers through configuration

### 5. **Template Composition**

- Base template provides foundation
- Feature templates add capabilities
- Modular backend/frontend components for reuse

## Package Relationships

```mermaid
graph TD
    CLI[farm-framework CLI] --> Core[@farm-framework/core]
    CLI --> DevServer[@farm-framework/dev-server]
    CLI --> Types[@farm-framework/types]

    Core --> Types
    Core --> TypeSync[@farm-framework/type-sync]

    Templates --> Core
    Templates --> AI[@farm-framework/ai]
    Templates --> UIComponents[@farm-framework/ui-components]

    AI --> Types
    UIComponents --> Types

    DevServer --> TypeSync

    Generated[Generated Apps] --> Core
    Generated --> APIClient[@farm-framework/api-client]
    Generated --> Observability[@farm-framework/observability]
```

## Template Package.json Patterns

### Full-Stack Templates (basic, ai-chat, ai-dashboard)

```json
{
  "type": "module",
  "workspaces": ["apps/*"],
  "dependencies": {
    "@farm-framework/core": "^0.1.0",
    "@farm-framework/types": "^0.1.0"
  }
}
```

### API-Only Template

```json
{
  "type": "module",
  "dependencies": {
    "@farm-framework/core": "^0.1.0",
    "@farm-framework/types": "^0.1.0"
  }
}
```

### Feature-Specific Additions

Features add runtime dependencies as needed, not framework packages.

## Missing Packages (Design Intended)

The following are **intentionally missing** as they're handled through existing packages:

- `@farm-framework/auth` ❌ (use `jsonwebtoken`, `python-jose`)
- `@farm-framework/realtime` ❌ (use `socket.io`)
- `@farm-framework/storage` ❌ (use `aws-sdk`, `boto3`)
- `@farm-framework/payments` ❌ (use `stripe`)
- `@farm-framework/email` ❌ (use `nodemailer`)
- `@farm-framework/search` ❌ (use `elasticsearch`)
- `@farm-framework/analytics` ❌ (use `mixpanel`)

Only core framework concerns get dedicated packages. Features use best-in-class third-party libraries.
