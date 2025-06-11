# FARM Command Line Interface

## Overview

The FARM CLI provides project scaffolding, development tooling and utilities for the FARM stack. It is the main entrypoint for creating new applications and running the local development server. Commands are built with [commander](https://github.com/tj/commander.js) and make use of modular utilities for logging, prompting and template generation.

## ✅ Completed Implementation

### Core Components

1. **CLI Entry** (`src/index.ts`, `src/cli.ts`)
   - Parses global options and registers all subcommands
   - Provides unified error handling and environment setup
2. **Command Modules** (`src/commands`)
   - `create` – scaffold new FARM projects from templates
   - `dev` – start the development server
   - `build` – production build placeholder
   - `generate` – code generation utilities
   - Additional helpers: `add-ui`, `database`, `auth`, `validate`
3. **Template & Generation System** (`src/generators`, `src/template`)
   - Handlebars based project file generator
   - Database and config generators
   - Post processors for formatting (e.g. Python via bundled Ruff)
4. **Utilities** (`src/utils`)
   - Interactive prompts and styling helpers
   - Package installation & git initialization
   - Logger with colourised output

## Architecture

```
┌───────────────────────────┐
│        FARM CLI           │
├───────────────────────────┤
│ Commands                  │
│ ├─ create                 │
│ ├─ dev                    │
│ ├─ build                  │
│ ├─ generate               │
│ ├─ add ui                 │
│ ├─ database               │
│ ├─ auth                   │
│ └─ validate               │
├───────────────────────────┤
│ Generators                │
│ ├─ project-file-generator │
│ ├─ database-generator     │
│ └─ helpers & post process │
├───────────────────────────┤
│ Utilities                 │
│ ├─ logger                 │
│ ├─ prompts                │
│ ├─ package-installer      │
│ └─ git-initializer        │
└───────────────────────────┘
```

## Features Implemented

- Interactive project creation with template, feature and database selection
- Bundled Ruff binaries for Python formatting on all platforms
- Development server integration via `farm dev`
- Modular code generation (`farm generate`) for types, models and pages
- Database management helpers (`farm database` commands)
- Authentication utilities for token inspection and scaffolding
- Rich logging with verbose and colour options

## Usage

### Installation

```bash
npm install -g @farm/cli
```

### Common Commands

```bash
# Create a new project
farm create my-app --template ai-chat

# Start development server
cd my-app
farm dev

# Build for production
farm build

# Generate TypeScript types and hooks
farm generate types --api-url http://localhost:8000
```

Run `farm --help` to see all available commands and options.

## Files Structure

```
packages/cli/
├── src/
│   ├── cli.ts            # Program setup
│   ├── commands/         # Command implementations
│   ├── core/             # Shared CLI helpers
│   ├── generators/       # Project scaffolding utilities
│   ├── template/         # Template definitions & helpers
│   ├── utils/            # Logger, prompts, installers
│   └── index.ts          # CLI entrypoint
├── bin/                  # Bundled Ruff binaries
├── package.json
└── tsup.config.ts
```

## Integration

The CLI works in concert with other FARM packages:

- **@farm/core** – development server and code generation engine
- **@farm/types** – shared type definitions
- **Templates** – project blueprints used by `farm create`

## File Overview

- **src/cli.ts** – creates the `farm` program and registers commands
- **src/commands/** – individual command modules (create, dev, build, etc.)
- **src/generators/** – helpers for scaffolding new projects
- **src/utils/** – logging, prompts and package management utilities
- **bin/** – platform specific Ruff binaries used for formatting

