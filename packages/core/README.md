# FARM Core Framework

## Overview

The `@farm/core` package provides foundational utilities and building blocks used throughout the FARM stack. It exposes the configuration helper, code generation tools, file watching utilities, and the AI provider interfaces that power local and cloud based AI services. Both TypeScript and Python modules live here so the rest of the framework can share common logic.

## ✅ Completed Implementation

### Core Components

1. **Configuration Utilities** (`src/index.ts`, `src/config/types.ts`)
   - `defineConfig` helper for strongly typed `farm.config.ts` files
   - Version information and basic initialization routine

2. **Type Generation Tools** (`src/codegen`)
   - Wrapper around `@farm/type-sync` with progress reporting
   - Supports incremental generation and watch mode
   - Legacy `CodeGenerator` adapter for backwards compatibility

3. **File Watcher & Hot Reload** (`src/watcher`)
   - Watches Python models/routes and configuration files
   - Triggers code generation and notifies the frontend for HMR
   - Coordinates hot reload of AI models and configuration changes

4. **AI Integration Layer** (`src/ai`)
   - Abstract `AIProvider` and `ChatMessage` definitions
   - Advanced Ollama integration (Docker management, model handling, streaming)
   - GPU detection utilities and provider configuration classes

## Architecture

```
packages/core
├── src
│   ├── index.ts             # Core exports and helpers
│   ├── config/              # Type definitions for farm.config
│   ├── codegen/             # Code generation orchestrator
│   ├── watcher/             # File watching & hot reload logic
│   └── ai/                  # AI provider implementations
│       ├── providers/       # Base provider interfaces
│       └── ollama/          # Local Ollama integration
└── package.json
```

## Usage

### Basic Commands

```bash
# Build the package
pnpm --filter @farm/core build:bundle

# Watch and rebuild on change
pnpm --filter @farm/core build:watch

# Clean generated output
pnpm --filter @farm/core clean

# Type-check sources
pnpm --filter @farm/core type-check
```

### Code Generation Example

```typescript
import { CodegenOrchestrator } from "@farm/core";

const orchestrator = new CodegenOrchestrator();
await orchestrator.initialize({
  apiUrl: "http://localhost:8000",
  outputDir: ".farm/types/generated",
});

await orchestrator.run();
```

## Integration

- **CLI & Dev Server** – consumed by the `@farm/cli` package for commands like `farm dev` and `farm codegen`
- **AI Providers** – Ollama modules are used by the dev server to launch local models
- **Type Generation** – other packages rely on the orchestrator to produce API clients and React hooks

## File Overview

- **src/index.ts** – re-exports framework types and exposes `defineConfig` & `initialize`
- **src/config/types.ts** – configuration interfaces for projects
- **src/codegen/orchestrator.ts** – enhanced wrapper around `@farm/type-sync`
- **src/watcher/file-watcher.ts** – monitors files and triggers regeneration
- **src/watcher/hot-reload-coordinator.ts** – coordinates frontend and AI hot reload
- **src/ai/ollama/** – Docker & API helpers for running Ollama locally

