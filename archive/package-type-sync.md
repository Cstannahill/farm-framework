# Type Audit Report for package: type-sync

## 📦 Target
- **Type:** package
- **Name:** type-sync

## 📁 Local Types Summary
- `packages/type-sync/src/cache.ts`
  - `interface CacheEntry`
  - `interface CacheOptions`
  - `interface CacheMetrics`
  - `class GenerationCache`
- `packages/type-sync/src/differ.ts`
  - `class TypeDiffer`
- `packages/type-sync/src/type-sync.ts`
  - `class TypeDiffer` (duplicate of `differ.ts`)
- `packages/type-sync/src/errors.ts`
  - `class TypeSyncError`
- `packages/type-sync/src/orchestrator.ts`
  - `interface SyncOptions`
  - `interface SyncResult`
  - `interface PerformanceMetrics`
  - `class TypeSyncOrchestrator`
- `packages/type-sync/src/watcher.ts`
  - `class TypeSyncWatcher`
- `packages/type-sync/src/extractors/openapi.ts`
  - `interface OpenAPIExtractionOptions`
  - `interface ExtractionResult`
  - `class OpenAPIExtractor`
- `packages/type-sync/src/generators/ai-hooks.ts`
  - `interface AIHookGeneratorOptions`
  - `interface AIGenerationResult`
  - `class AIHookGenerator`
- `packages/type-sync/src/generators/api-client.ts`
  - `interface APIClientGeneratorOptions`
  - `interface GenerationResult`
  - `class APIClientGenerator`
- `packages/type-sync/src/generators/react-hooks.ts`
  - `interface ReactHookGeneratorOptions`
  - `interface GenerationResult`
  - `interface GeneratedHook`
  - `class ReactHookGenerator`
- `packages/type-sync/src/generators/typescript.ts`
  - `interface TypeScriptGenerationOptions`
  - `interface GenerationResult`
  - `interface PaginatedResponse`
  - `interface ApiError`
  - `type DeepPartial<T>`
  - `class TypeScriptGenerator`
- `packages/type-sync/src/types.ts`
  - `type OpenAPISchema`
  - `type OpenAPIOperation`
  - `type OpenAPIType`
  - `type OpenAPIParameter`
  - `type OpenAPIRequestBody`
  - `type OpenAPIResponse`
  - `type OpenAPIHeader`
  - `type OpenAPILink`
  - `type OpenAPISecurityScheme`
  - `type OpenAPIReference`
  - `type TypeSyncGeneratorContext`
  - `type TypeSyncOrchestratorOptions`
  - `type TypeSyncWatcherOptions`
  - `type TypeSyncCacheEntry`
  - `type DeepPartial<T>`

## 🔁 Shared Type Cross-Reference
- No matching types found in `packages/types`.
- `PaginatedResponse` and `ApiError` duplicate interfaces in `packages/api-client`.
- `DeepPartial` is defined both in `types.ts` and `generators/typescript.ts`.
- `TypeDiffer` is defined twice locally (`differ.ts` and `type-sync.ts`).
- `GenerationResult` interface repeated across multiple generator files.

## 🚫 Violations
- ❌ Duplicate `TypeDiffer` class definitions may drift over time.
- ❌ `PaginatedResponse` and `ApiError` exist in multiple packages without a centralized version.
- ❌ Repeated `GenerationResult` and `DeepPartial` definitions indicate missing shared types.

## ✅ Suggestions for Sync
- Centralize common result and utility types (`GenerationResult`, `PaginatedResponse`, `ApiError`, `DeepPartial`) in `packages/types`.
- Remove duplicate `TypeDiffer` implementation and export a single class.
- Update generators to import shared types from `@farm/types` once centralized.
