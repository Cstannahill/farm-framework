# FARM Framework Type Definitions Map

## 1. Visual Map of Type Definitions

| Type Name / Interface     | Defined In                               | Exported from `@farm/types`? | Used by (Packages)              | Notes / Local-Only Reason         |
| ------------------------- | ---------------------------------------- | ---------------------------- | ------------------------------- | --------------------------------- |
| `TemplateConfig`          | packages/types/src/templates.ts          | ✅ Yes                       | cli, template-validator, others |                                   |
| `TemplateSpec`            | packages/types/src/templates.ts          | ✅ Yes                       | cli, template-validator, others |                                   |
| `ValidationResult`        | tools/template-validator/src/types.ts    | ❌ No                        | template-validator              | DUPLICATE: Should use shared type |
| `TestResult`              | tools/testing/types.ts                   | ❌ No                        | testing                         | DUPLICATE: Should use shared type |
| `TemplateTestResult`      | tools/testing/types.ts                   | ❌ No                        | testing                         | DUPLICATE: Should use shared type |
| `TemplateTestCase`        | tools/testing/types.ts                   | ❌ No                        | testing                         | DUPLICATE: Should use shared type |
| `CLITemplateType`         | packages/cli/src/template/types.ts       | ❌ No                        | cli                             | DUPLICATE: Should use shared type |
| `AIConfig`                | packages/types/src/ai.ts                 | ✅ Yes                       | ai, cli, others                 |                                   |
| `DatabaseConfig`          | packages/types/src/database.ts           | ✅ Yes                       | database, cli, others           |                                   |
| `FarmError`               | packages/types/src/errors.ts             | ✅ Yes                       | core, cli, others               |                                   |
| `CoreConfig`              | packages/types/src/core.ts               | ✅ Yes                       | core, cli, others               |                                   |
| `LocalValidatorOptions`   | tools/template-validator/src/types.ts    | ❌ No                        | template-validator              | TOOL-SPECIFIC: Keep local         |
| `InternalTestRunnerState` | tools/testing/types.ts                   | ❌ No                        | testing                         | TOOL-SPECIFIC: Keep local         |
| ... (other shared types)  | packages/types/src/index.ts (re-exports) | ✅ Yes                       | various                         |                                   |

**Legend:**

- ✅ Yes: Exported from `@farm/types` (shared)
- ❌ No: Local-only (should refactor or keep local)

### Diagram

```
@farm/types
├── templates.ts: TemplateConfig, TemplateSpec, ...
├── ai.ts: AIConfig, ...
├── database.ts: DatabaseConfig, ...
├── errors.ts: FarmError, ...
├── core.ts: CoreConfig, ...
└── index.ts (re-exports)

Other Packages:
- tools/template-validator/src/types.ts: ValidationResult (DUPLICATE), LocalValidatorOptions (LOCAL)
- tools/testing/types.ts: TestResult, TemplateTestResult, TemplateTestCase (DUPLICATE), InternalTestRunnerState (LOCAL)
- packages/cli/src/template/types.ts: CLITemplateType (DUPLICATE)
```

## 2. Refactor Plan for Local Types

### tools/template-validator/src/types.ts

- **ValidationResult**:
  - Check if an equivalent exists in `@farm/types` (e.g., `TemplateValidationResult`).
  - If yes, refactor all imports/usages to use the shared type.
  - If not, move the type to `@farm/types` and export it, then update imports.
- **LocalValidatorOptions**:
  - Keep local, as it is tool-specific and not used elsewhere.

### tools/testing/types.ts

- **TestResult, TemplateTestResult, TemplateTestCase**:
  - Check for equivalents in `@farm/types`.
  - If present, refactor imports/usages to use shared types.
  - If not, move these types to `@farm/types` and export them, then update imports.
- **InternalTestRunnerState**:
  - Keep local, as it is internal to the test runner logic.

### packages/cli/src/template/types.ts

- **CLITemplateType**:
  - Check for equivalent in `@farm/types` (e.g., `TemplateConfig` or similar).
  - If present, refactor to use shared type.
  - If not, move to `@farm/types` and update imports.

## 3. Steps to Refactor Local Types to Shared Types

1. **Identify Duplicates:**

   - Compare local type definitions with those in `@farm/types`.
   - If a type is a duplicate or can be generalized, prefer the shared type.

2. **Move or Replace:**

   - If a type is missing from `@farm/types` but is used in multiple places, move it to `@farm/types` and export it.
   - If a type already exists in `@farm/types`, update all local usages to import from `@farm/types`.

3. **Update Imports:**

   - Refactor all files in the monorepo that use the local type to import from `@farm/types` instead.

4. **Remove Local Duplicates:**

   - Once all usages are updated, delete the local type definition.

5. **Document Local-Only Types:**

   - For any type that is tool-specific and not shared, document in `types.md` with a reason for being local.

6. **Test and Validate:**
   - Run type-check and tests to ensure all imports and usages are correct.

---

**This document should be updated whenever new types are added or refactored.**
