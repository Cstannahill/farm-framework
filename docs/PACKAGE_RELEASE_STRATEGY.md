# FARM Framework Package Release Strategy

This document explains which packages are included in releases and why.

## Package Categories

### 🚀 **Public Packages** (Included in Changesets)

These packages are published to npm and used directly by developers:

#### Core Framework

- **`@farm-framework/cli`** - Main CLI tool (`farm` command)

  - _Users install this globally_
  - _Breaking changes affect all users_

- **`@farm-framework/core`** - Core framework functionality

  - _Used by generated projects_
  - _API changes affect project structure_

- **`@farm-framework/types`** - TypeScript definitions

  - _Used by all TypeScript projects_
  - _Type changes can break compilation_

- **`@farm-framework/type-sync`** - Python ↔ TypeScript sync
  - _Core feature for full-stack development_
  - _Used in generated projects_

#### Developer Libraries

- **`@farm-framework/api-client`** - HTTP client library

  - _Used in frontend applications_
  - _API changes affect user code_

- **`@farm-framework/ui-components`** - React components
  - _Used in React applications_
  - _Component API changes affect UI_

### 🔧 **Internal Packages** (Excluded from Changesets)

These are development tools and infrastructure:

#### Build & Development Tools

- **`@farm-framework/dev-server`** (`tools/dev-server`)

  - _Internal development server_
  - _Changes don't affect end users directly_

- **`@farm-framework/cli-tools`** (`tools/cli`)

  - _Internal CLI utilities_
  - _Used only during development_

- **`@farm-framework/template-validator`** (`tools/template-validator`)

  - _Template validation tool_
  - _Internal quality assurance_

- **`@farm-framework/testing`** (`tools/testing`)
  - _Testing utilities and fixtures_
  - _Internal development aid_

#### Example Applications

- **`farm-stack-web`** (`apps/web`)
  - _Demo/example application_
  - _Not published to npm_

## Release Impact

### When Public Packages Change

- ✅ **Triggers changeset requirement**
- ✅ **Version bump in release**
- ✅ **Published to npm**
- ✅ **Appears in changelog**
- ✅ **Breaking changes documented**

### When Internal Packages Change

- ❌ **No changeset required**
- ❌ **No version bump**
- ❌ **Not published to npm**
- ❌ **Not in user-facing changelog**
- ✅ **Can still have internal documentation**

## Configuration

The package exclusion is configured in `.changeset/config.json`:

```json
{
  "ignore": [
    "farm-stack-web",
    "@farm-framework/dev-server",
    "@farm-framework/cli-tools",
    "@farm-framework/template-validator",
    "@farm-framework/testing"
  ]
}
```

## Workflow Examples

### Scenario 1: CLI Feature Addition

```bash
# Edit packages/cli/src/commands/new-feature.ts
pnpm changeset
# Select: @farm-framework/cli (minor)
# Describe: "Add new-feature command"
```

### Scenario 2: Internal Tool Update

```bash
# Edit tools/dev-server/src/docker-manager.ts
# No changeset needed!
# Just commit and push
```

### Scenario 3: Breaking API Change

```bash
# Edit packages/core/src/config.ts (breaking change)
pnpm changeset
# Select: @farm-framework/core (major)
# Select: @farm-framework/cli (patch) - if CLI needs updates
# Describe: "BREAKING: Restructure config API"
```

## Benefits

1. **Cleaner Releases**: Users only see changes that affect them
2. **Faster Development**: Internal tools can evolve without ceremony
3. **Better Versioning**: Semantic versioning applies to user-facing APIs
4. **Focused Changelogs**: Release notes highlight user impact

## When to Reconsider

Consider making an internal package public if:

- External developers want to extend it
- It becomes part of the plugin ecosystem
- It's useful as a standalone tool

---

_Last updated: June 11, 2025_
