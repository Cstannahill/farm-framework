# 🌾 FARM Framework

FARM is an AI‑first full‑stack development platform that combines a React/TypeScript frontend with a Python/FastAPI backend. It ships batteries‑included tooling for running local AI models, generating typed clients and hooks, and orchestrating services during development.

## What is FARM?

- **F**astAPI – modern Python web framework with automatic docs
- **A**I/ML – local Ollama or cloud providers (OpenAI, HuggingFace)
- **R**eact – component based frontend with modern tooling
- **M**ongoDB – default database (other databases supported)

## 🚀 Quick Start

```bash
# Install the CLI
npm install -g @farm/cli

# Scaffold a new project
farm create my-ai-app --template ai-chat

# Start the development server
cd my-ai-app
farm dev
```

## ✨ Key Features

- Zero‑cost AI development with local Ollama integration
- Type‑safe code with automatic client and hook generation
- Hot reload across backend, frontend and AI models
- Seamless provider switching between local and cloud
- Next.js‑quality developer experience for AI applications

## Packages

### `@farm/cli`
Interactive command line interface for scaffolding and managing projects. Provides commands like `create`, `dev`, `build` and `generate`, bundled Ruff binaries for Python formatting and rich logging utilities.

### `@farm/core`
Framework utilities including the `defineConfig` helper, code generation orchestrator, file watcher and AI provider interfaces used by the CLI and dev server.

### `@farm/type-sync`
Synchronises types between the FastAPI backend and TypeScript frontend. Extracts the OpenAPI schema, generates TypeScript types, API clients and React Query hooks, and supports caching and watch mode for instant feedback.

### `@farm/api-client`
Thin wrapper around Axios with retry logic, streaming helpers and file upload support. Underpins the generated clients and React hooks used in FARM apps.

### `@farm/ai`
AI orchestration layer that registers providers, loads configuration, performs health checks and handles errors. Supports running Ollama locally or routing requests to cloud services.

### `@farm/types`
Shared TypeScript definitions for configuration, CLI options, database models, authentication and plugin hooks so that all packages use a single source of truth.

### `@farm/ui-components`
Reusable React components – like the assistant chat UI – that accelerate interface development.

## Development Server

Running `farm dev` starts the entire stack: database containers, local AI models, FastAPI backend and Vite frontend. The process manager performs health checks, aggregates logs and restarts failed services automatically. Service configuration is read from `farm.config.ts`.

Common options:

```bash
farm dev --verbose              # detailed logs
farm dev --frontend-only        # start only the frontend
farm dev --backend-only         # start backend and dependencies
```

## Contributing

We build in the open! Check out the contribution guide for details.

## License

MIT © FARM Framework
