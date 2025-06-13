# Code Intelligence Integration Plan

This document outlines how to adapt the `designplan.md` proposal to the current FARM framework.  The goal is to build a package `@farm/code-intelligence` that provides semantic search, natural language querying and IDE/CLI integrations.

## 1. Package Layout

```
packages/
  code-intelligence/
    src/
      ingestion/
      analyzer/
      embeddings/
      query/
      api/
      cli/
      ide/
    integration-notes.md (this file)
```

* `ingestion` – file crawler and multi‑language parser written in Python.
* `analyzer` – semantic analysis and graph construction (Python).
* `embeddings` – embedding engine and vector storage adapters (Python).
* `query` – query planner/executor and response synthesiser (Python).
* `api` – FastAPI router exposing query endpoints.
* `cli` – thin TypeScript wrapper registering the `farm intel` command.
* `ide` – VSCode extension entry point.

Python sources live under `packages/code-intelligence/src` so they can be imported by the API service in `apps/api`.

## 2. Integration with Existing Framework

### File Watching & Indexing

The design plan describes a `File System Watcher` that incrementally indexes the codebase.  FARM already has a `FarmFileWatcher` in `packages/core/src/watcher`.  The code‑intelligence crawler should reuse this infrastructure:

1. Extend `FarmFileWatcher` with events for `code-intel` updates.
2. On file change, trigger Python indexing via a small Node bridge (spawn a Python process that runs the incremental parser).
3. Store parsed entities and embeddings in a local ChromaDB instance under `.farm/intel`.

### API Service

`apps/api/src` hosts the FastAPI application.  A new router `code_intel.py` will be placed in `apps/api/src/routes` and included in `main.py`.  Endpoints follow the design plan (`/api/code-intelligence/query`, `/explain`, `/status`, `/reindex`, `/stream`).  The router imports the Python modules from `packages/code-intelligence/src`.

### CLI Command

A command file `packages/cli/src/commands/intelligence.ts` will register `farm intel`.  It will call the API through a new client package `@farm/code-intelligence-client` (similar to `@farm/api-client`).  Output and options mirror the examples in the design plan but rely on the existing logger and spinner utilities from the CLI package.

### IDE Extension

`packages/vscode-extension` will import the same client to provide hover and code‑lens features.  The extension activates only when a FARM project is detected (presence of `farm.config.ts`).

### Shared Types

New TypeScript types required by the client and CLI will be defined once in `packages/types/src/code-intelligence.ts`:

```ts
export interface CodeEntitySummary {
  id: string;
  file: string;
  line: number;
  name: string;
  type: string;
  preview?: string;
}

export interface QueryRequest {
  query: string;
  maxResults?: number;
  includeContext?: boolean;
  useAiSynthesis?: boolean;
}

export interface QueryResponse {
  results: CodeEntitySummary[];
  synthesis?: string;
}
```

`packages/types/src/index.ts` will export these via `export * from './code-intelligence.js'`.

## 3. Runtime Considerations

* **Local‑first** – the parser and embedding engine run locally using the existing Python environment in `apps/api`.  Optional remote vector stores can be configured via `farm.config.ts`.
* **Incremental Updates** – the watcher sends changed file paths to the Python indexer which updates the vector store without full reindexing.
* **Security** – the API router sanitises paths and strips secrets before returning code snippets as suggested in the design plan.
* **Testing** – unit tests for the CLI and API live beside their packages.  End‑to‑end tests can reuse `tools/testing` infrastructure.

## 4. Implementation Phases

1. **Bootstrap Package** – create module skeletons in `packages/code-intelligence`.  Add shared types and update barrel exports.
2. **Indexer & Storage** – implement the Python ingestion pipeline and hybrid vector store.  Integrate with `FarmFileWatcher`.
3. **Query Engine** – build query planner/executor and expose API endpoints.
4. **CLI/IDE Clients** – generate TypeScript client, add CLI command and VSCode integration.
5. **Observability Hooks** – use `@farm/observability` to track indexing performance and query metrics.

This staged approach allows incremental adoption while reusing much of the existing FARM infrastructure.
