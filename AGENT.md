# Implementation Directives for AI Agent

## Goal

Use the accompanying FFFIP.md to implement all described features in a **production-grade** manner across the FARM monorepo. This work must reflect high engineering standards, be modular, scalable, and maintainable. Every change should align with modern TypeScript and Python practices and be written as if it were intended for long-term use in a public framework.

---

## Critical Quality Expectations

### ✅ Type Safety

- All TypeScript code must use **strict type checking** (`strict: true` in tsconfig).
- No `any` or `unknown` unless deeply justified with comments.
- Infer types from OpenAPI wherever possible, and validate schema structures accordingly.

### ✅ Error Handling

- All async operations must use `try/catch` blocks.
- Propagate meaningful error messages.
- Use descriptive logging (with chalk, colors, etc.) for CLI output.
- Ensure failures do not silently continue or corrupt files.

### ✅ Modular Design

- New modules (like `type-sync`) should be completely encapsulated.
- Avoid coupling; use dependency injection or interface abstraction where appropriate.

### ✅ File System Interaction

- Use **atomic writes** and avoid race conditions.
- Do not overwrite generated files unless diffing confirms changes.
- Cache schema hashes and artifacts using checksum logic.

### ✅ CLI Tooling

- All CLI commands must:
  - Support help output (`--help`)
  - Validate inputs
  - Provide rich feedback (logs, warnings, success states)

### ✅ Dev Ergonomics

- Watchers must debounce rebuilds.
- Notify frontend automatically after generation (e.g., via file touch).
- Include DX flags like `--no-client`, `--output`, `--dry-run`.

### ✅ Testing & Validation

- Include placeholder unit tests or testable utilities.
- Include a `types:check` command in CI pipelines.
- Ensure output files match expectations by comparing against committed outputs.

---

## Implementation Scope

1. **Directory Restructuring**

   - Move files into proposed `codegen/` and `.farm/` structure.
   - Refactor imports and exports cleanly with barrel files.

2. **Type Sync System**

   - Implement `TypeSyncOrchestrator` per spec.
   - Implement file watching, diffing, caching, and OpenAPI parsing.
   - Use extensible pipeline for types, hooks, clients, AI hooks.

3. **Streaming-Aware Support**

   - Generate interfaces for streaming endpoints.
   - Include AI-aware behavior in React hooks.

4. **CLI Integration**

   - Create `types:sync`, `types:check` commands.
   - Ensure reusable logic between one-time and watch-based sync.

5. **CI Readiness**
   - Add `check.ts` to validate out-of-sync types.
   - Ensure proper exit codes and log formatting.

---

## Coding Standards

- TypeScript: Use ES modules, modern syntax, and `strict` type mode.
- Python (if edited): Use PEP8, type hints, `pydantic` for schemas, and async-friendly APIs.
- File I/O: Use `fs/promises` API. Avoid callbacks or legacy `fs`.

---

## Output Expectations

- Each module should be properly exported and documented.
- All commands must be functional and discoverable via `--help`.
- Output directories must match the `.farm/types/generated/` structure.

---

## DO NOT

- Hardcode environment values—use config where possible.
- Skip features due to complexity—log `TODO:` or create stub with comments.
- Leave behind dead or unused code.

---

## Review Criteria

At the end, the project must:

- Fully support real-time type sync.
- Be easily extensible (e.g., adding GraphQL support).
- Have consistent, traceable logs and well-organized outputs.
- Be ready for CI usage in real projects.
