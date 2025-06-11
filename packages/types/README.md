# @farm/types

## Overview

Shared TypeScript definitions used across the FARM framework. These
interfaces describe everything from the `farm.config.ts` configuration
file to CLI options, database schemas and plugin hooks. All packages
in the monorepo depend on this library for a single source of truth.

## ✅ Completed Implementation

### Core Modules

1. **Configuration Types** (`config.ts`)
   - Describes the full `FarmConfig` structure including AI, database,
     build and plugin sections.
2. **CLI Types** (`cli.ts`)
   - Option objects and runtime context used by the CLI commands.
3. **AI Types** (`ai.ts`)
   - Provider definitions, chat message formats and model metadata.
4. **Database Types** (`database.ts`)
   - Connection settings and schema helper interfaces.
5. **Template Types** (`templates.ts`)
   - Project template descriptors used by generators and validators.
6. **Build Types** (`build.ts`)
   - Build result objects and bundle analysis structures.
7. **Error Types** (`errors.ts`)
   - Common error shapes shared across tooling.
8. **Auth Types** (`auth.ts`)
   - Roles, permissions, user models and session payloads.
9. **Plugin Types** (`plugins.ts`)
   - Plugin definition, configuration schema and lifecycle hooks.
10. **Core Helpers** (`core.ts`)
    - Minimal interfaces for the framework core.
11. **Barrel Export** (`index.ts`)
    - Re-exports all modules for easy consumption.

## Architecture

```
┌────────────────────────────────────────────┐
│                @farm/types                 │
├────────────────────────────────────────────┤
│  config   ai     database   cli            │
│  auth     templates  build   plugins       │
│  errors   core                                │
└────────────────────────────────────────────┘
```

All modules are compiled to CommonJS and ES modules in `dist/`. Type
Declarations live under `dist/ts` and are generated via `tsc`.

## Features Implemented

- Unified type definitions for all FARM packages
- Strongly typed `farm.config.ts` with database and AI configuration
- Typed interfaces for CLI commands and plugin systems
- Database schema modelling utilities
- AI provider and chat structures
- Template descriptors for project generators
- Build artefact and analysis reporting
- Shared error and authentication models

## Usage

### Build Commands

```bash
# Compile TypeScript and bundle
pnpm run --filter @farm/types build:bundle

# Watch mode for development
pnpm run --filter @farm/types build:watch

# Type checking only
pnpm run --filter @farm/types type-check

# Clean build output
pnpm run --filter @farm/types clean
```

### Installation

This package is consumed internally by other FARM packages. It can also
be installed standalone:

```bash
npm install @farm/types
```

## Next Steps

- Continue refining configuration and plugin schemas
- Add more granular database field types and validations
- Expand build metrics for future tooling

## Files Structure

```text
types
├── README.md
├── package.json
├── package.json.bak
├── src
│   ├── ai.ts
│   ├── auth.ts
│   ├── build.ts
│   ├── cli.ts
│   ├── config.ts
│   ├── core.ts
│   ├── database.ts
│   ├── errors.ts
│   ├── index.ts
│   ├── plugins.ts
│   └── templates.ts
├── tsconfig.json
└── tsup.config.ts
```

## Integration

`@farm/types` is imported by the CLI, core runtime, template validator
and development server packages. Keeping the types here ensures a single
source of truth across the entire framework.

## File Overview

- **src/config.ts** – main `FarmConfig` definition.
- **src/ai.ts** – AI provider and chat message types.
- **src/database.ts** – database schema helpers.
- **src/cli.ts** – CLI option interfaces.
- **src/templates.ts** – template and scaffold structures.
- **src/build.ts** – build artefact reporting.
- **src/errors.ts** – common error shapes.
- **src/auth.ts** – authentication and user models.
- **src/plugins.ts** – plugin system contracts.
- **src/core.ts** – core framework interfaces.
- **src/index.ts** – barrel exports.

