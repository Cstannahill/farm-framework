# FARM Database System

This document outlines the database architecture used in FARM. Both MongoDB and PostgreSQL are supported through a unified provider abstraction.

## Key Components

### Database Providers

- **MongoDBProvider** – Uses Motor and Beanie. Connection pool sizes are configurable via `farm.config.ts` and health metrics are gathered from `serverStatus`.
- **PostgreSQLProvider** – Uses SQLAlchemy async engine. Pooling parameters map directly to SQLAlchemy's engine options.

### DatabaseManager

Located at `apps/api/src/database/manager.py`, this class
handles provider initialization, connection pooling and health metrics. It exposes methods:

- `initialize()` – Connect using the configured provider and create indexes.
- `shutdown()` – Gracefully close connections.
- `register_model(model)` – Register models before initialization.
- `migrate(migrations)` – Apply migrations via the provider.
- `health_check()` – Retrieve current health information.
- `transaction()` – Async context manager for database transactions.

### Monitoring

`apps/api/src/database/monitoring.py` implements a lightweight monitor that collects query metrics and periodic snapshots. Slow queries generate warnings in the logs.

### Migration Utilities

`apps/api/src/database/migrations/manager.py` stores migrations as JSON files. The manager can create and apply migrations, enabling data portability when switching database providers.

## CLI Commands

`farm db` commands are provided through the CLI package:

- `farm db add --type <mongodb|postgresql|mysql|sqlite|sqlserver>` – Scaffold config and templates.
- `farm db switch --type <type> [--migrate]` – Change providers, optionally applying migrations.
- `farm db info` – Show current configuration.
- `farm db migrate` – Run or create migrations (SQL databases).

All commands output colored messages and support `--help`.

## Templates

Database templates live under `templates/base/database/`. They include base model classes, connection utilities and Docker compose snippets. Generation is idempotent and respects existing files.

## Technical Notes

- Connection pooling defaults: MongoDB `maxPoolSize=50`, PostgreSQL `pool_size=20`.
- Health metrics include connection counts and server version.
- Migrations are JSON based for MongoDB and integrate with Alembic for PostgreSQL.

---

# Audit details

The current implementation follows the plan in `database_integration_architecture.md` by adding the advanced `DatabaseManager` and provider abstraction. Migrations are stored as JSON and a monitoring system records basic query metrics.

**Remaining work to hit the original target**

1. Full Alembic integration for PostgreSQL migrations.
2. Richer monitoring dashboards and alerts.

**Areas lacking overall**

- Automatic data migration when switching providers is limited to basic JSON operations.
- Cross-database query abstractions are minimal.

**Improvements to align with the original vision**

1. Implement complete migration generation and rollback via Alembic and Beanie.
2. Expand health metrics to include pool statistics and realtime connection charts.

**Ideas to exceed the original vision**

1. Provide plug‑and‑play support for additional databases like SQLite and PlanetScale.
2. Integrate a web UI displaying live performance metrics and migration history.
