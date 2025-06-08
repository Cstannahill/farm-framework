# Implementation Directives for AI Agent (Assistant-UI Integration)

## Goal

Use the accompanying `FEATURE_PLAN.md` for **Assistant-UI Integration** to implement all described features in a **production-grade** manner across the FARM monorepo. This work must reflect high engineering standards, be modular, scalable, and maintainable. Every change must align with modern TypeScript and Python practices and be written as if intended for long-term use in a public framework.

---

## Critical Quality Expectations

### ✅ Type Safety

- All TypeScript code must use **strict type checking**.
- No `any` or `unknown` unless deeply justified with comments.
- Properly typed props, return types, hook parameters, and async responses.

### ✅ Error Handling

- Wrap all async operations in `try/catch`.
- Provide user-friendly and developer-meaningful error messages.
- Use styled logging (chalk, colors) for CLI commands.
- Ensure no partial execution or silent failures.

### ✅ Modular Design

- Encapsulate `AssistantProvider`, hooks, pages, and runtime logic.
- CLI logic (`farm add ui assistant`) must use isolated generators and utilities.
- Use DI where extensibility is required.

### ✅ File System & CLI

- CLI commands:

  - Must support `--help`
  - Validate inputs
  - Verbosely log results

- File generation:

  - Atomic
  - Idempotent (no duplicates or overwrites unless intended)
  - Respect Tailwind config format

### ✅ Dev Ergonomics

- `farm add ui assistant` should work out-of-the-box:

  - Install required packages
  - Modify Tailwind config
  - Scaffold files and routes
  - Be dry-run safe and re-runnable

### ✅ Testing & Validation

- Add CLI unit tests for the `add` command
- Add Playwright E2E tests for basic UI chat flow
- Add contract tests for `/chat` proxy route using Schemathesis or similar
- Add performance test via Lighthouse for LCP/CLS

---

## Implementation Scope

1. **CLI Generator**

   - `farm add ui assistant` command in `packages/cli`
   - Uses shared utility methods: `installPackages`, `generateFile`, `modifyConfig`

2. **File Scaffolding**

   - Generate:

     - `apps/web/src/providers/AssistantProvider.tsx`
     - `apps/web/src/hooks/useFarmAssistant.ts`
     - `apps/web/src/pages/AssistantChat.tsx`

   - Create `/api/assistant` proxy with `http-proxy-middleware`

3. **Styling Setup**

   - Inject `@assistant-ui/react-tailwind` plugin into `tailwind.config.ts`
   - Ensure compatibility with ShadCN and existing styles

4. **Playground**

   - Create `examples/assistant-chat` with minimal setup
   - Must work standalone and within `apps/web`

5. **Documentation**

   - Add quickstart guide in `/docs/quickstart/chat-ui.mdx`
   - Update CLI reference and changelog

6. **Testing Integration**

   - `vitest` for CLI
   - `playwright` for UI
   - `schemathesis` for proxy

---

## Coding Standards

- TypeScript: Modern ES syntax, no magic strings, strict mode.
- Python: PEP8, type hints, docstrings, async endpoints.
- Tailwind: Utility-first, theme-aware classes.
- CLI: Colorized output, clear logs, early exits on error.

---

## Output Expectations

- `apps/web/...` contains generated UI components
- `apps/api/...` contains proxy route
- `tailwind.config.ts` updated safely
- `examples/assistant-chat` directory exists
- CLI command is discoverable with `farm --help`

---

## DO NOT

- Hardcode paths—use `project.root`
- Omit required dependencies—install and pin them
- Skip docs or testing—stub if not complete
- Overwrite Tailwind config destructively

---

## Review Criteria

- [ ] Chat UI is usable within 60 seconds after CLI execution
- [ ] Markdown rendering and basic assistant functionality works
- [ ] Proxy is correctly wired and testable
- [ ] Files are correctly placed and scoped
- [ ] CLI is clean, useful, and doesn't crash
- [ ] Docs and playground are committed

---

_“Ship the UI, not just the API.”_
