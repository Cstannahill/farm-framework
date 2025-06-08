# Implementation Directives for AI Agent (Database Flexibility)

## Goal

Use the accompanying `database.md` to implement all described features for **PostgreSQL + MongoDB support** in a **production-grade** manner across the FARM monorepo. This work must reflect high engineering standards, support extensibility, and maintain FARM's type-safe, AI-first architecture.

---

## Critical Quality Expectations

### ✅ Type Safety

- All TypeScript code must use **strict type checking**.
- No `any` or `unknown` unless deeply justified with comments.
- Shared database types (`DatabaseConfig`, `DatabaseFeature`, `ModelDefinition`) must be centrally defined and reused.
- If you encounter types that aren't currently shared and should be, or if you notice duplicated types across the codebase, extract and consolidate them into a single file under `types/src/{entityName}.ts` and import them properly from `@farm/types`.
- No `any` or `unknown` unless deeply justified with comments.
- Shared database types (`DatabaseConfig`, `DatabaseFeature`, `ModelDefinition`) must be centrally defined and reused.

### ✅ Error Handling

- Wrap all async operations in `try/catch`.
- Log CLI and system errors with developer-friendly output.
- Ensure Docker config updates and file writes fail clearly and never partially apply.

### ✅ Modular Design

- Encapsulate:

  - `DatabaseSelector`
  - `DatabaseGenerator`
  - CLI `add`, `switch`, `migrate` flows

- Ensure that each database (MongoDB, PostgreSQL) can be dropped in or swapped with minimal coupling.

### ✅ File System & CLI

- CLI commands:

  - Must support `--help`, `--type`, `--yes`
  - Clearly validate input types

- File generation:

  - Atomic and idempotent
  - Detect existing configs and update instead of overwriting

### ✅ Dev Ergonomics

- `farm db add` should:

  - Scaffold config and base model
  - Update `farm.config.ts`
  - Install all dependencies
  - Patch Docker services
  - Recommend next steps clearly

### ✅ Testing & Validation

- Add CLI unit tests for:

  - `add`, `switch`, `info`, `migrate`

- Ensure PostgreSQL migrations generate correctly with Alembic
- Verify Docker healthchecks per provider
- Validate generated models and types per DB engine

---

## Implementation Scope

1. **Shared Types**

   - `packages/types/src/database.ts` and `config.ts`
   - Define interfaces: `DatabaseConfig`, `ModelDefinition`, `FieldConstraints`, etc.

2. **Selector + Generator**

   - `DatabaseSelector` handles DB choice, metadata, validation
   - `DatabaseGenerator` builds config, base models, migration support

3. **CLI Integration**

   - Add `farm db` namespace:

     - `farm db add`
     - `farm db switch`
     - `farm db migrate`
     - `farm db info`

4. **Template Support**

   - Add `templates/base/database/*.hbs`
   - Render into target project structure (`/src/core`, `/src/models`)

5. **Migration Support**

   - PostgreSQL: Generate Alembic base config and env
   - Scaffold model auto-discovery and SQLModel reflection

6. **Model Generator**

   - Adapt model template generation per DB type
   - Maintain MongoDB + PostgreSQL generation logic in single orchestrator

7. **Dev Server Support**

   - Patch Docker Compose + runtime config for local DB boot
   - Validate ports, volumes, and healthcheck logic

---

## Coding Standards

- TypeScript: `strict`, modern module syntax, CLI-safe flags
- Python: PEP8, async-first DB clients, docstring-complete
- Docker: Clean, namespace-safe service definitions

---

## Output Expectations

- `src/core/database.py` and `models/base.py` for both DBs
- Alembic migrations initialized if PostgreSQL
- `docker-compose.yml` patched with correct volumes/ports
- Config file (`farm.config.ts`) correctly updated with connection + options

---

## DO NOT

- Hardcode paths or credentials (use ENV vars and config)
- Omit validation for DB types or connection strings
- Overwrite user changes without a backup or prompt
- Skip adding model registry updates

---

## Review Criteria

- [ ] `farm db add --type postgresql` works cleanly end-to-end
- [ ] Switching from one DB to another is safe, reversible, and well logged
- [ ] Model generation respects target DB syntax and patterns
- [ ] Alembic migrations can be created and upgraded from CLI
- [ ] Template files are reused, isolated, and extensible

---

_“Choose your database, not your framework.”_
