# FARM CLI Tools

## Overview

This directory contains command-line helpers and code generation modules used internally by the FARM Stack Framework monorepo. The CLI provides commands for generating types, API clients, and React hooks from OpenAPI schemas, and is used by the main FARM CLI and test automation.

## ✅ Completed Implementation

### Core Components

1. **Generate Command** (`commands/generate.ts`)

   - Implements the `generate` subcommands for generating TypeScript types, API clients, and React hooks from OpenAPI schemas.
   - Supports options for watching files, specifying config paths, and toggling features.
   - Integrates with the `@farm/type-sync` orchestrator for code generation.

2. **Type Definitions** (`commands/types.ts`)

   - TypeScript interfaces describing command options for code generation and CLI commands.
   - Used for type safety and option validation.

3. **CLI Entrypoint** (`index.ts`)

   - Wires up the CLI using Commander.js, adds colorized output, and registers all commands.
   - Handles error output and help formatting.

4. **Build Metadata** (`package.json`, `tsconfig.json`)
   - Configuration for building and bundling the CLI tools.

## Structure

```
cli/
  commands/
    generate.ts      # Implements code generation commands
    types.ts         # Type definitions for CLI options
  index.ts           # CLI entrypoint
  package.json       # Build and dependency metadata
  tsconfig.json      # TypeScript configuration
```
