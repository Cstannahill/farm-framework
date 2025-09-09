# FARM Database Support Overview

This document summarizes the database layer within FARM and how to work with both MongoDB (Beanie) and PostgreSQL (SQLModel).

## Supported Databases

- **MongoDB** using **Beanie** ODM.
- **PostgreSQL** using **SQLModel** ORM with Alembic migrations.
- **MySQL** using **SQLModel** ORM with Alembic migrations.
- **SQLite** using **SQLModel** ORM with Alembic migrations.
- **SQL Server** using **SQLModel** ORM with Alembic migrations.

Configuration is stored in `farm.config.ts` under the `database` key. The structure matches `DatabaseConfig` from `@farm/types`.

## CLI Commands

FARM exposes database utilities under the `farm db` namespace:

| Command                                    | Description                                                                       |
| ------------------------------------------ | --------------------------------------------------------------------------------- | ------------------- | ------------------------------- | ----------- | ------------------------------------------------- |
| `farm db add --type <mongodb               | postgresql                                                                        | mysql               | sqlite                          | sqlserver>` | Scaffold database files and Docker configuration. |
| `farm db switch --type <type> [--migrate]` | Switch between database providers. Optional migration step runs Alembic upgrades. |
| `farm db info`                             | Display current database configuration from `farm.config.ts`.                     |
| `farm db migrate [--create <name>          | --upgrade                                                                         | --downgrade <rev>]` | Manage SQL database migrations. |

All commands provide helpful `--help` output and colorised logs.

## Templates

Database templates live under `templates/base/database/` and include:

- `database.py` – connection utilities.
- `base.py` – base model classes.
- Alembic files (`alembic.ini`, `env.py`) for PostgreSQL.
- `docker-compose.database.yml` – service definitions merged into your project.

Generation is idempotent and will not overwrite existing files.

## Runtime Integration

The dev server detects the configured database and automatically starts the proper Docker service using `docker compose`. Health checks ensure the service is ready before the API boots.

## Type Safety

Shared interfaces live in `packages/types/src/database.ts`. Both the CLI and runtime import these types directly to avoid duplication.

---

# Audit Details

The current implementation aligns with the high level architecture in `database_integration_architecture.md` by providing a unified selector, generator and CLI tooling. Areas still to finish include automatic data migration between engines and deeper runtime metrics.

**To better align with the original vision**

1. Implement the advanced `DatabaseManager` with connection pooling and health metrics.
2. Provide seamless data migration utilities when switching providers.

**To exceed the original vision**

1. Add first‑class support for additional engines (e.g. SQLite) through the same abstraction.
2. Integrate realtime monitoring dashboards for query performance and connection health.
