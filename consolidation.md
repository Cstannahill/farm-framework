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

