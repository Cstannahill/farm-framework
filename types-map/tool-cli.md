# Type Audit Report for tool: cli

## \U1F4E6 Target
- **Type:** tool
- **Name:** cli

## \U1F4C1 Local Types Summary
- `tools/cli/commands/generate.ts`
  - `GenerateAllOptions`
  - `GenerateHooksOptions`
  - `GenerateTypesOptions`
  - `GenerateClientOptions`
- `tools/cli/commands/types.ts`
  - `GenerateOptions`
  - `GenerateAllOptions`
  - `GenerateHooksOptions`
  - `GenerateTypesOptions`
  - `GenerateClientOptions`

## \U1F501 Shared Type Cross-Reference
- ❌ `GenerateOptions` conflicts with a different definition in `packages/types/src/cli.ts`.
- ⚠️ `GenerateAllOptions`, `GenerateHooksOptions`, `GenerateTypesOptions`, and `GenerateClientOptions` are not found in `packages/types`.

## \u274c Violations
- Local `GenerateOptions` duplicates the name of a shared type but has a different structure.
- No shared imports from `@farm/types` for these option interfaces.

## \u2705 Suggestions for Sync
- Replace local `GenerateOptions` with the version exported from `@farm/types/cli` or rename to avoid confusion.
- Evaluate moving the specialized option interfaces (`GenerateAllOptions`, `GenerateHooksOptions`, `GenerateTypesOptions`, `GenerateClientOptions`) to `packages/types` if they will be reused by other packages or tools.
