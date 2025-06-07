# @farm/ai

This package implements the AI orchestration layer for FARM.  It provides a registry
for AI providers, configuration management and utilities for running inference or
streaming responses.

## Structure

- **index.ts** – re-exports the main classes from `src`.
- **src/providers/base.ts** – abstract base class used by all AI providers and
  type definitions for messages, generation requests, models and provider status.
- **src/config/ai-config.ts** – Zod based schema definitions and the
  `AIConfigManager` class that loads, validates and normalises AI configuration.
- **src/errors/error-handler.ts** – rich `AIError` hierarchy and a global
  `AIErrorHandler` with retry and metrics support.
- **src/health/health-checker.ts** – performs periodic health checks on
  registered providers and aggregates metrics.
- **src/registry/provider-registry.ts** – manages provider instances and handles
  creation, removal and recovery.
- **src/index.ts** – high level `AISystem` which ties together the registry,
  configuration manager, health checker and error handler.

Use this package to integrate local (Ollama) or cloud providers (OpenAI,
HuggingFace) and to route requests between them at runtime.
