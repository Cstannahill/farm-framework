# Type Audit Report for package: api-client

## \U0001F4E6 Target
- **Type:** package
- **Name:** api-client

## \U0001F4C1 Local Types Summary
- `ApiResponse<T>` – `packages/api-client/src/base-client.ts` lines 17-22
- `ApiError` – `packages/api-client/src/base-client.ts` lines 27-33
- `PaginatedResponse<T>` – `packages/api-client/src/base-client.ts` lines 40-48
- `RequestInterceptor` – `packages/api-client/src/base-client.ts` lines 53-59
- `ResponseInterceptor` – `packages/api-client/src/base-client.ts` lines 64-70
- `ApiClientConfig` – `packages/api-client/src/base-client.ts` lines 75-87

## \U0001F501 Shared Type Cross-Reference
- ✅ **None** – this package does not currently import types from `@farm/types`.
- ❌ **Duplicates** – `ApiError` and `PaginatedResponse` are also defined in `packages/type-sync/src/generators/typescript.ts`.
- ⚠️ **Candidates for centralization** – all local interfaces could be moved to `packages/types` for reuse across packages.

## \u274C Violations
- Local definitions of `ApiError` and `PaginatedResponse` duplicate those in `packages/type-sync`.
- No corresponding exports found in `packages/types`.

## \u2705 Suggestions for Sync
- Create a new module in `packages/types` (e.g. `api-client.ts`) exporting `ApiResponse`, `ApiError`, `PaginatedResponse`, `RequestInterceptor`, `ResponseInterceptor`, and `ApiClientConfig`.
- Update `packages/api-client` and `packages/type-sync` to import these types from `@farm/types` instead of defining them locally.
- Remove the duplicated interfaces from `packages/type-sync/src/generators/typescript.ts` once centralized.
