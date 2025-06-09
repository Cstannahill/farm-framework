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

