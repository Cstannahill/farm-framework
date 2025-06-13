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

### Configuration

Projects may opt into code intelligence with sensible defaults.  The feature is
enabled automatically when `farm dev` detects `codeIntelligence` settings in
`farm.config.ts`:

```ts
export default defineConfig({
  codeIntelligence: {
    indexing: {
      include: ["src/**/*", "packages/**/*"],
      exclude: ["**/test/**", "**/*.test.*"],
      watch: true,
      incremental: true,
    },
    privacy: {
      sanitizeSecrets: true,
      excludeSensitive: true,
    },
    vectorPath: ".farm/intel",
    ai: {
      provider: "local",
      model: "codellama",
    },
    performance: {
      parallelism: 4,
      cacheSize: "500MB",
    },
  },
});
```

To skip indexing in CI environments set `FARM_INTEL_DISABLE_WATCH=1` or
`codeIntelligence.indexing.watch = false`.  The vector store path can be
overridden with `FARM_INTEL_PATH` if a project needs a custom location.

## 2. Integration with Existing Framework

### File Watching & Indexing

The design plan describes a `File System Watcher` that incrementally indexes the codebase.  FARM already has a `FarmFileWatcher` in `packages/core/src/watcher`.  The code‑intelligence crawler should reuse this infrastructure:

1. Extend `FarmFileWatcher` with events for `code-intel` updates.
2. On file change, trigger Python indexing via a small Node bridge (spawn a Python process that runs the incremental parser).
3. Store parsed entities and embeddings in a local ChromaDB instance under `.farm/intel`.
4. Ignore heavy directories like `node_modules`, `dist`, and `.git` to keep indexing fast.
5. Emit progress events so the CLI can display indexing status.
6. Honour `FARM_INTEL_DISABLE_WATCH` so indexing can be skipped during CI runs.

### API Service

`apps/api/src` hosts the FastAPI application.  A new router `code_intel.py` will be placed in `apps/api/src/routes` and included in `main.py`.  Endpoints follow the design plan (`/api/code-intelligence/query`, `/explain`, `/status`, `/reindex`, `/stream`).  The router imports the Python modules from `packages/code-intelligence/src`.

### CLI Command

A command file `packages/cli/src/commands/intelligence.ts` will register `farm intel`.  It will call the API through a new client package `@farm/code-intelligence-client` (similar to `@farm/api-client`).  Output and options mirror the examples in the design plan but rely on the existing logger and spinner utilities from the CLI package.  Indexing progress events from the watcher can be displayed using these spinners.

Planned subcommands:

* `search <query>` – semantic search across the codebase.
* `explain <entity>` – detailed explanation with examples.
* `ask` – interactive assistant mode.
* `index` – manage the local index.  `--watch` starts the watcher, `--force` triggers a full rebuild, and `--stats` prints current index metrics.
* `visualize` – generates an architecture graph.  Passing `--open` opens the HTML output.
* `review` – run AI-driven code review on staged changes.
* `status` – print index statistics using the `/status` API.

### IDE Extension

`packages/vscode-extension` will import the same client to provide hover and code‑lens features.  The extension activates only when a FARM project is detected (presence of `farm.config.ts`).

### Web Dashboard

A lightweight React dashboard under `packages/web-dashboard` visualises the semantic graph.  It consumes the same API endpoints and can be opened via `farm intel visualize --open`.

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
* **Privacy** – a Python `PrivacyManager` filters gitignored or sensitive files and sanitises content before embedding.
* **Caching** – the query engine uses an LRU cache to speed up repeated searches and persists large results to disk.
* **Security** – the API router sanitises paths and strips secrets before returning code snippets.
* **Testing** – unit tests for the CLI and API live beside their packages.  End‑to‑end tests can reuse `tools/testing` infrastructure.

## 4. Implementation Phases

1. **Bootstrap Package** – create module skeletons in `packages/code-intelligence`.  Add shared types and update barrel exports.
2. **Indexer & Storage** – implement the Python ingestion pipeline and hybrid vector store.  Integrate with `FarmFileWatcher`.
   * Respect `FARM_INTEL_DISABLE_WATCH` during watcher setup.
3. **Query Engine** – build query planner/executor and expose API endpoints.
4. **CLI/IDE Clients** – generate TypeScript client, add CLI command and VSCode integration.
   * Add `intel index --stats` and `visualize --open` options.
5. **Web Dashboard** – ship the React dashboard for exploring relationships.
6. **Observability Hooks** – use `@farm/observability` to track indexing performance and query metrics.

This staged approach allows incremental adoption while reusing much of the existing FARM infrastructure.
