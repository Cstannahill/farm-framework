# @farm/type-sync

## Overview

`@farm/type-sync` provides automated TypeScript type generation and API client code for FARM applications. It extracts an OpenAPI schema from your FastAPI backend and generates strongly typed artifacts that keep your front‑end and back‑end in sync. The package can run incrementally, cache generated files, and watch for changes during development.

## ✅ Completed Implementation

### Core Components

1. **OpenAPI Extractor** (`extractors/openapi.ts`)
   - Pulls the OpenAPI schema from a running or temporary FastAPI server
   - Falls back to cached or static schemas when extraction fails
   - Supports retries, health checks and startup timeouts

2. **TypeSync Orchestrator** (`orchestrator.ts`)
   - Coordinates the full sync cycle
   - Manages generators, caching and performance metrics
   - Runs generators in parallel when possible

3. **Generation Cache** (`cache.ts`)
   - Stores generated artifacts keyed by schema hash
   - Supports compression, expiration and cache metrics

4. **Generators** (`generators/*`)
   - **TypeScriptGenerator** – emits raw TypeScript types
   - **APIClientGenerator** – creates an axios based API client
   - **ReactHookGenerator** – builds typed React Query hooks
   - **AIHookGenerator** – optional hooks for AI endpoints

5. **TypeSync Watcher** (`watcher.ts`)
   - Watches Python source files and regenerates types on change
   - Touches a timestamp file so the frontend dev server reloads

6. **Type Differ** (`type-sync.ts`)
   - Detects changes between previously generated schemas
   - Provides simple diff utilities for debugging

## Architecture

```
┌─────────────────────────────┐
│     TypeSync Orchestrator    │
├─────────────────────────────┤
│  ┌───────────────┐          │
│  │ OpenAPI       │          │
│  │ Extractor     │          │
│  └───────────────┘          │
│  ┌───────────────┐          │
│  │ Generation    │          │
│  │ Cache         │          │
│  └───────────────┘          │
│  ┌───────────────┐          │
│  │  Generators   │─ Types   │
│  │               │─ Client  │
│  │               │─ Hooks   │
│  │               │─ AIHooks │
│  └───────────────┘          │
│  ┌───────────────┐          │
│  │   Watcher     │          │
│  └───────────────┘          │
└─────────────────────────────┘
```

## Features Implemented

### ✅ Schema Extraction
- Uses running server or temporary Uvicorn instance
- Supports caching and static files as fallback
- Health checks and retry logic

### ✅ Artifact Generation
- Emits TypeScript types, API client, React hooks and AI hooks
- Parallel generation with configurable concurrency
- Incremental generation by comparing file checksums

### ✅ Caching
- Disk based cache with optional compression
- Automatic cleanup of expired entries
- Metrics for hit ratio and total size

### ✅ Watch Mode
- Watches Python sources for changes
- Regenerates artifacts and notifies the frontend

### ✅ Error Handling & Recovery
- Graceful fallback to cached schema on failures
- Detailed logging of extraction and generation stages

## Usage

### Programmatic API
```ts
import { TypeSyncOrchestrator } from '@farm/type-sync';

const orchestrator = new TypeSyncOrchestrator();
await orchestrator.initialize({
  apiUrl: 'http://localhost:8000',
  features: { client: true, hooks: true, streaming: true, aiHooks: false },
});

const result = await orchestrator.syncOnce();
console.log(`Generated ${result.filesGenerated} files`);
```

### Watcher
```ts
const watcher = new TypeSyncWatcher(orchestrator);
await watcher.start();
```
Press `Ctrl+C` to stop watching.

### Scripts
Run the provided npm scripts to build the package:

```bash
pnpm run build:bundle     # Build ESM/CJS bundles
pnpm run build:watch      # Build in watch mode
pnpm run type-check       # Run TypeScript type checker
```

## Configuration Example

```ts
await orchestrator.initialize({
  apiUrl: 'http://localhost:8000',
  outputDir: 'generated/types',
  features: {
    client: true,
    hooks: true,
    streaming: true,
    aiHooks: true,
  },
  performance: {
    enableMonitoring: true,
    enableIncrementalGeneration: true,
    maxConcurrency: 4,
    cacheTimeout: 300000,
  },
  generators: {
    typescript: { exportStyle: 'named' },
    apiClient: { baseURL: 'http://localhost:8000' },
    reactHooks: { enableInfiniteQueries: true },
    aiHooks: { defaultProvider: 'ollama' },
  },
});
```

## File Structure

```
packages/type-sync/
├── src/
│   ├── cache.ts                # Generation cache implementation
│   ├── orchestrator.ts         # Main orchestrator
│   ├── watcher.ts              # File watcher for dev mode
│   ├── type-sync.ts            # Type differ utilities
│   ├── extractors/
│   │   └── openapi.ts          # FastAPI OpenAPI extractor
│   ├── generators/
│   │   ├── typescript.ts       # TS type generator
│   │   ├── api-client.ts       # API client generator
│   │   ├── react-hooks.ts      # React hook generator
│   │   └── ai-hooks.ts         # AI hook generator
│   ├── utils/
│   │   └── fetchWithRetry.ts   # Helper for fetch with retries
│   └── types.ts                # Shared type definitions
├── tsup.config.ts              # Build configuration
├── tsconfig.json               # TypeScript config
├── package.json                # Package metadata
└── README.md                   # This guide
```

## Integration

- Used by the FARM CLI for `farm sync-types`
- Works with the development server to regenerate types on the fly
- Produced artifacts live in `generated/` by default

## Next Steps

Future improvements could include:
1. Smarter schema diffing and selective regeneration
2. Additional generators (e.g., Python client)
3. Improved error messaging and IDE integration

