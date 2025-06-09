# Type Sync Consolidation Plan

This document outlines a cautious step-by-step strategy to consolidate the type synchronization logic into a dedicated `@farm/type-sync` package while preserving existing functionality.

## Goals
- **Single source of truth** for all type synchronization logic
- **Clean public API** through `@farm/core` re-exports
- **Minimal breaking changes** for existing users and CLI commands

## Current State Overview
- `packages/core/src/codegen/type-sync/` contains orchestration, cache, differ and watcher logic.
- `packages/type-sync/` mirrors this implementation.
- `tools/codegen/` has older generator implementations.
- CLI commands import from `@farm/core`.

## Phase 1 – Consolidate Core Logic
1. **Choose `packages/type-sync` as the primary implementation**.
   - Keep the existing code in `packages/core/src/codegen/type-sync/` until the new package is verified.
   - Ensure `packages/type-sync` exports:
     - `TypeSyncOrchestrator`
     - `TypescriptGenerator`
     - `APIClientGenerator`
     - `TypeSyncWatcher`
     - supporting types (e.g. `SyncOptions`)
2. **Update build configuration** so `@farm/type-sync` compiles independently.
3. **Refactor `packages/core/src/codegen/`** to become a thin wrapper:
   - Re-export the orchestration and watcher classes from `@farm/type-sync`.
   - Provide a `CodegenOrchestrator` that composes framework‑specific behaviour.
4. **Run unit tests and CLI commands** to confirm that existing `types:sync` works using the wrapper.
5. Once verified, **delete the duplicated code** under `packages/core/src/codegen/type-sync/`.

## Phase 2 – CLI Integration
1. **Adjust CLI imports** in `packages/cli/src/commands/types/`:
   - `import { TypeSyncOrchestrator } from '@farm/core';`
   - Remove any direct references to the old paths.
2. Confirm that `pnpm cli types:sync` continues to operate as before.
3. Provide clear deprecation notes if any flags change.

## Phase 3 – Archive Old Codegen Utilities
1. Review `tools/codegen/` for any features not yet ported.
2. Migrate needed generator logic to `packages/type-sync`.
3. When everything is covered, move `tools/codegen/` to an `archive/` folder to avoid accidental usage.

## Validation Steps
- Run `pnpm build` to ensure packages compile.
- Run `pnpm test` and `pnpm lint` if available.
- Manually execute `pnpm cli types:sync` inside an example project to confirm runtime behaviour.

## Safe Deletion Checklist
- [ ] All imports in the monorepo point to `@farm/type-sync` or `@farm/core` wrappers.
- [ ] Unit tests pass after switching to the consolidated package.
- [ ] CLI commands work as expected.
- [ ] No remaining references to deleted files in `tsconfig` paths or build configs.

Proceed with deletion of `packages/core/src/codegen/type-sync/*` and archiving `tools/codegen/` **only after** the above checks succeed.
=======
# FARM Code Generation Consolidation Plan

This document outlines a cautious approach for merging the existing code generation implementations inside the repository. The goal is to unify the logic from `packages/type-sync`, `packages/core/src/codegen`, and `tools/codegen` without breaking existing functionality.

## Overview of Current State

- **packages/type-sync** – Contains a `TypeSyncOrchestrator` with caching, diffing, and watching logic. Generator implementations are largely placeholders.
- **packages/core/src/codegen** – Mirrors the orchestrator and generators found in `type-sync` but lacks caching. Also includes a duplicated `type-sync` folder.
- **tools/codegen** – An older, more complete pipeline with full generator implementations and CLI helpers.

## Objectives

1. Establish `packages/type-sync` as the single source of truth for type synchronization logic.
2. Port real generator implementations from `tools/codegen` into `packages/type-sync`.
3. Reduce `packages/core/src/codegen` to a thin wrapper that re-exports features from `packages/type-sync` and handles framework-specific orchestration.
4. Integrate CLI commands to use the consolidated implementation.
5. Remove or archive outdated directories only after confirming functionality.

## Step-by-Step Approach

### 1. Prepare a Temporary Workspace

- Work on a new Git branch locally to test the migration without affecting `main`.
- Ensure all existing tests pass before starting.

### 2. Migrate Generators from `tools/codegen`

1. Copy the concrete generator logic from `tools/codegen` into `packages/type-sync/src/generators`.
2. Replace the placeholder generator implementations in `packages/type-sync` with these real versions.
3. Update any import paths or TypeScript configurations as needed.
4. Run unit tests (or add new ones) to verify the generators produce expected files.

### 3. Remove Duplicate Logic from `packages/core/src/codegen/type-sync`

1. Confirm that no other modules import from `packages/core/src/codegen/type-sync`.
2. If safe, delete the duplicated folder `packages/core/src/codegen/type-sync`.
3. Update internal imports in `packages/core/src/codegen` to reference `@farm/type-sync` instead.
4. Add re-export statements in `packages/core/src/codegen/index.ts` to expose the orchestrator and watcher from `@farm/type-sync`.

### 4. Thin the Core Orchestrator

1. Modify `packages/core/src/codegen/orchestrator.ts` so that it internally instantiates `TypeSyncOrchestrator` from `@farm/type-sync`.
2. Keep any framework-specific behaviour (e.g., custom output paths) in this wrapper class.
3. Ensure the public API of `@farm/core` remains stable for CLI consumers.

### 5. Update CLI Commands

1. Point the `types:sync` commands in `packages/cli` to use the consolidated implementation exported from `@farm/core`.
2. Test `farm types:sync` (and watch mode if available) in a sample project to confirm end-to-end behaviour.

### 6. Validate and Clean Up

1. Run the entire code generation flow using the new setup and confirm artifacts are created correctly.
2. Search the repository for any remaining imports from `tools/codegen` or the removed `type-sync` folder.
3. Once confirmed, move `tools/codegen` to an `archive/` directory or delete it.
4. Commit the changes with clear messages summarizing the migration.

### 7. Document the Final Architecture

- Update README files to explain the new structure:
  - `packages/type-sync` – core implementation with generators and watcher.
  - `packages/core` – framework integration layer.
  - CLI commands referencing `@farm/core`.
- Provide migration notes for anyone who previously used `tools/codegen` directly.

## Cautious Practices

- **Incremental removal:** Keep old directories until the new logic is verified in multiple scenarios.
- **Tests first:** Each step should be accompanied by unit or integration tests to catch regressions.
- **Backups:** Tag the repository before deleting large directories so they can be restored if needed.

Following this plan should consolidate the code generation logic without breaking existing workflows.