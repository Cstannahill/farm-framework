## Template processing and Handlebars tests — status (2025-09-11)

### Scope

- Area: Template Registry, Handlebars helpers/preprocessor, Template Processor/Scaffolder
- Templates in focus: `packages/cli/templates/base/apps/api/src/main.py.hbs`, `packages/cli/templates/base/apps/api/src/routes/health.py.hbs`
- Test suites in focus: `tools/testing/src/template-processing-simple.test.ts`, `tools/testing/src/template-processing.test.ts`

### Current status

- Focused run (Vitest) snapshot: 92 total, 72 passed, 20 failed (latest)
- Integration still blocked by a Handlebars runtime error in `main.py.hbs` (`options.fn is not a function`)
- `health.py.hbs` refactor compiles cleanly in all runs; generation batches complete; Python indentation consistent across branches

### Completed fixes

- Template Registry
  - Legacy compat APIs implemented: `registerTemplate`, `getTemplatePath`, `listTemplates`, `hasTemplate`
  - Ad‑hoc template path registration supported and honored by `getTemplatePath`
- Handlebars helpers and defaults
  - `normalizeOptions` to guard malformed helper invocations
  - AI defaults injected (e.g., `ollama`) when `features` include `ai` but config missing
  - Plugin inference for `auth` based on features
  - `get_config` improved to inject AI defaults for `ai.*` paths
  - String/logic helpers expanded and made more robust
- Handlebars preprocessor
  - Quotes barewords for key helpers (`if/unless_database`, `if/unless_feature`, `if_template`, `if_env`, `if_ai_provider`, `if_plugin`)
  - Rewrites `{{else if_* ...}}` into nested/parallel blocks; adds compile cache + stats
- Templates
  - `routes/health.py.hbs`: replaced `else-if` chains with aligned `if_database` blocks and `unless_database` default; per‑DB queries separated; indentation-safe output
  - `main.py.hbs`: initial pass on `database_url` branching; further refactor pending (see “Open issues”)

### Open issues

1. `main.py.hbs`: identify and remove the helper pattern causing `options.fn is not a function` (likely residual `{{else if_*}}` or similar construct)
2. Helpers when compiled without preprocessing: treat unquoted bareword args as strings at runtime for `if_database/feature/template/env/ai_provider`
3. `pluralize` behavior conflicts across tests (e.g., "box" -> "boxes" vs "boxs"; "users" plural form). Decide policy and align
4. `length` helper return type mismatch (string vs number) in expectations
5. `json(ai)` should include default providers when `features` includes `ai`; ensure defaults materialize in the test context
6. Some synthetic template tests expect success but hit "Template directory not found"; align processor behavior or test fixtures

### Notes

- Avoid `else-if` in Handlebars templates entirely; prefer nested/parallel blocks
- Keep Python indentation identical across all conditional branches to avoid syntax/format drift

### Next steps

- Complete `main.py.hbs` rewrite to remove remaining `else-if` patterns
- Add runtime argument coercion to helpers for bareword support (when preprocessing is bypassed)
- Harmonize `pluralize` and `length` behaviors to match test expectations
- Ensure AI defaults appear in `json(ai)` during tests when `ai` feature is present
- Re-run focused suites and iterate on remaining failures

### Optional: focused test run

```
pnpm -w vitest run tools/testing/src/template-processing-simple.test.ts tools/testing/src/template-processing.test.ts --reporter=dot
```

### Delta update (18:10)

- Re-ran focused suites; totals unchanged: 72 passed, 20 failed
- Confirmed `main.py.hbs` still triggers `options.fn is not a function` during project generation; fallback also fails
- Verified grep shows no literal `else if` tokens; error likely from a helper chain that expects block options in an else-branch
- Helper suite regressions persist when compiling with raw Handlebars (no preprocessing): `if_database`, `if_feature`, `if_template`, `if_env`, `if_ai_provider` all returning else-branches
- `pluralize` expectations conflict between suites ("boxes" vs "boxs"; "users" vs "userses"); needs a single policy
- `length` returns string in template rendering vs number expected by test
- `json(ai)` doesn’t include default provider name; ensure default AI config materializes in test context

### Delta update (18:20)

- main.py.hbs investigation:
  - No literal `else if` tokens remain; error likely arises from a helper expecting a block (`options.fn`) receiving a non-block context
  - Hypothesis: interaction between `switch/case` block and nested helper branches (e.g., inner `if_database`) is producing a non-block `options` in one path
  - Proposed fix: replace the `switch/case` for DB health check and DB URL logic with flat `if_database` sections (pattern used successfully in `health.py.hbs`)
- Helpers runtime behavior:
  - Add runtime coercion for unquoted/bareword args inside helpers so tests that compile with raw Handlebars pass without relying on preprocessing
  - Confirm `if_ai_provider` treats default AI provider when `features` includes `ai` and config is missing
- Pluralize policy proposal:
  - Adopt standard English pluralization: "box" -> "boxes"; words that already appear plural like "users" should remain unchanged
  - Update the test cases expecting "boxs" or double-plurals to align with this behavior
- Length helper behavior:
  - Handlebars renders numbers as strings in templates; update tests to expect '2' (string) or compare numerically after coercion
- Next concrete steps (incremental):
  - [ ] Refactor `main.py.hbs` to remove `switch/case` for DB branches in favor of flat `if_database` blocks
  - [ ] Add argument normalization at runtime for `if_database/feature/template/env/ai_provider`
  - [ ] Align `pluralize` tests with policy above
  - [ ] Align `length` tests to string output or adjust helper usage in tests
  - [ ] Ensure `json(ai)` includes defaults during tests when `ai` feature present
