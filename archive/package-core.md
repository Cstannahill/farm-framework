# Type Audit Report for package: core

## \U1F4E6 Target
- **Type:** package
- **Name:** core

## \U1F4C1 Local Types Summary
- `packages/core/src/codegen/orchestrator.ts`
  - `interface CodegenOptions`
  - `interface ProgressInfo`
- `packages/core/src/config/types.ts`
  - `interface FarmConfig`
- `packages/core/src/watcher/file-watcher.ts`
  - `interface FileChangeEvent`
  - `interface RegenerationResult`
  - `interface RegenerationPlan`
  - `interface WatcherStatus`
- `packages/core/src/watcher/hot-reload-coordinator.ts`
  - `interface HotReloadStatus`

## \U1F501 Shared Type Cross-Reference
- ❌ `FarmConfig` is also defined in `packages/types/src/config.ts` with a different structure.
- ❌ `FileChangeEvent` is independently defined in `tools/dev-server/src/types.ts`.
- ⚠️ `CodegenOptions` and `ProgressInfo` are referenced by multiple packages but not present in `packages/types`.
- ⚠️ Watcher-related types (`RegenerationResult`, `RegenerationPlan`, `WatcherStatus`, `HotReloadStatus`) are local only and may be useful for other tools.

## \u274c Violations
- Local `FarmConfig` duplicates a shared type but omits many fields.
- `FileChangeEvent` exists in multiple packages without a centralized definition.
- No imports from `@farm/types` for these shared or reusable structures.

## \u2705 Suggestions for Sync
- Import `FarmConfig` from `@farm/types/config` and remove the local copy.
- Move `CodegenOptions` and `ProgressInfo` to `packages/types` for reuse by the CLI and other packages.
- Centralize watcher-related types in `packages/types` (e.g., `watcher.ts`) and refactor packages to import them.
- Ensure all packages consume these definitions via `@farm/types` to avoid drift.
