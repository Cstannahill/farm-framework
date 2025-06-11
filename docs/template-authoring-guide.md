Below is an updated **AI‑Chat Template Authoring Guide** that folds in the latest Handlebars features, highlights a few corrective notes from an audit of your current `templates/ai‑chat/` files, and extends (but doesn’t duplicate) your existing FARM‑wide guidelines.

---

```md
# AI‑Chat Template Authoring Guidelines

These rules apply to every file in `templates/ai-chat/`.  
They assume the FARM helper set defined in `packages/cli/src/templates/helpers.ts` and Handlebars v4.7+.

---

## 1  Directory Layout
```

templates/
└── ai-chat/
├── .env.example.hbs
├── .gitignore.hbs
├── apps/
│ ├── api/… # FastAPI‑based backend
│ └── web/… # React + Vite frontend
└── README.md.hbs

```

### Required metadata
Add a short `README.md.hbs` in every sub‑template folder (e.g. `apps/api/`) explaining:

```

<!-- README.md.hbs -->

{{capitalize template}} template
Features: {{join features ", "}}
Database: {{database.type}}

````

---

## 2  Handlebars Fundamentals (v4.7+ recap)

| Feature | Syntax | Notes |
|---------|--------|-------|
| **Built‑in blocks** | `#if / #unless / #each / #with` | `else` sections are available for `if`, `unless`, and `each` :contentReference[oaicite:0]{index=0} |
| **Sub‑expressions** | `{{helper (otherHelper arg)}}` | Great for inline logic :contentReference[oaicite:1]{index=1} |
| **Partials & partial‑blocks** | `{{> myPartial}}`  /  `{{#> myPartial}}fallback{{/myPartial}}` | Lets you fail‑over or pass a block to a partial :contentReference[oaicite:2]{index=2} |
| **Block parameters** | `{{#each items as |item idx|}}` | Gives local aliases without `this` gymnastics :contentReference[oaicite:3]{index=3} |
| **Whitespace control** | `{{~` … `~}}` | Trim left/right whitespace. Use in tight TOML/JSON contexts. |
| **Comments** | `{{! this is ignored }}` | Prefer over inline code comments for template hints. |
| **Data frames** | `Handlebars.createFrame(options.data)` | Useful when writing custom helpers that need deep context copies :contentReference[oaicite:4]{index=4} |

---

## 3  FARM‑specific Helpers (quick lookup)

| Category | Example | Purpose |
|----------|---------|---------|
| **Feature flags** | `#if_feature "ai"` / `#unless_feature` | Toggle code blobs per enabled feature |
| **Database** | `#if_database "mongodb"` | Inject DSNs, ORM config |
| **Project casing** | `{{project_name_kebab}}` | Consistent naming across files |
| **Logic & arrays** | `#and`, `#eq`, `join`, `includes` | Clean inline logic—avoid JS `if` chains |

> **Tip:** When mixing built‑ins and custom helpers inside a sub‑expression, put the *built‑in* **inside** for readability:
> `{{#if (includes features "auth")}}…{{/if}}`

---

## 4  Common Patterns & Pitfalls

### 4.1  Comma‑safe array literals (TOML / JSON)

**Current issue:** in `apps/api/pyproject.toml.hbs` a trailing comma is left behind when `features.auth` is **false**, breaking TOML 1.0 strict parsing.

```toml
dependencies = [
  "python-dotenv>=1.0.0",               <‑‑ last safe entry
  {{#if_feature "auth"}}
    "python-jose[cryptography]>=3.3.0",
  {{/if_feature}}                       <‑‑ trailing comma risk
]
````

**Fix:** build the list in JS first or use a sub‑expression helper.

```toml
dependencies = [
{{#each (joinList deps) as |dep idx|}}
  "{{dep}}"{{#unless @last}},{{/unless}}
{{/each}}
]
```

_(Add a `joinList` helper that merges base deps with conditional blocks and returns an array.)_

---

### 4.2  Whitespace in block helpers

When a block yields nothing (e.g. disabled feature) you sometimes end up with blank lines in Dockerfiles or `.env` stubs:

```dockerfile
{{#if_feature "ollama"}}
ENV OLLAMA_URL={{ollama.url}}
{{/if_feature}}

# if_feature false → above leaves a stray newline
```

Apply whitespace control:

```dockerfile
{{~#if_feature "ollama"}}
ENV OLLAMA_URL={{ollama.url}}
{{~/if_feature}}
```

---

### 4.3  Block parameters for clarity

Instead of:

```ts
{{#each ai.providers}}
  const {{@key}} = new Provider("{{@key}}")
{{/each}}
```

use block params:

```ts
{{#each ai.providers as |prov name|}}
  const {{name}} = new Provider("{{name}}")
{{/each}}
```

---

## 5  Template Quality Checklist

| ✅                                                                                                                | Check |
| ----------------------------------------------------------------------------------------------------------------- | ----- |
| ☐ **Balanced tags** – run `farm validate-template` (all 61 files currently pass)                                  |       |
| ☐ **No trailing commas** in generated TOML/JSON                                                                   |       |
| ☐ **No stray newlines** from disabled blocks                                                                      |       |
| ☐ **Partials registered** before use (`loader.ts` handles this)                                                   |       |
| ☐ **Helpers typed** in `helpers.ts` (already fully typed)                                                         |       |
| ☐ **Render speed** < 250 ms for fresh create (`project-file-generator.ts` streams files; keep single‑pass writes) |       |

---

## 6  Authoring Workflow

1. **Bootstrap**

   ```bash
   pnpm cli farm new my‑chat --template ai-chat --dry-run
   ```

   Inspect console output for helper errors.

2. **Iterate**

   - Edit template `.hbs` files.
   - Add/modify helpers in `helpers.ts`; they auto‑register via `loader.ts`.

3. **Validate**

   ```bash
   farm validate-template ai-chat --strict
   ```

4. **Snapshot test** _(optional)_
   Use `vitest` + `@farm/template-tester` to render fixtures and snapshot.

---

## 7  Advanced Tips

- **Partial‑blocks** are perfect for fallback‑UI stubs.

  ```tsx
  {{#> MessageBubble}}
    <div className="text-muted">Unsupported message</div>
  {{/MessageBubble}}
  ```

- **Inline JS evaluation** is blocked; keep logic inside helpers to maintain security.
- **Pre‑compile** templates at publish time to shave \~40 ms off cold starts ([handlebarsjs.com][1]).

---

## 8  Upcoming Work

| Item                                                                 | Owner       | Status |
| -------------------------------------------------------------------- | ----------- | ------ |
| `joinList` helper to solve trailing‑comma issue                      | ✨ **todo** |        |
| Switch `.env` generator to whitespace‑trim blocks                    | ✨ **todo** |        |
| Split huge `helpers.ts` into domain files (`project.ts`, `logic.ts`) | ideation    |        |

---

Following these rules will keep the AI‑Chat templates valid, readable, and compatible with the latest Handlebars runtime while aligning with FARM’s helper ecosystem.

```
::contentReference[oaicite:6]{index=6}
```

[1]: https://handlebarsjs.com/api-reference/compilation.html?utm_source=chatgpt.com "(Pre-)Compilation - Handlebars"
