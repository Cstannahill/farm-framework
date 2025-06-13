import { Command } from "commander";
import { DatabaseSelector } from "../scaffolding/database-selector.js";
import { DatabaseGenerator } from "../generators/database-generator.js";
import { logger } from "../utils/logger.js";
import { configLoader } from "../core/config.js";
import { execAsync } from "../utils/exec.js";
import type { DatabaseType } from "@farm-framework/types";

interface MigrateOptions {
  create?: string;
  upgrade?: boolean;
  downgrade?: string;
}

export function createDatabaseCommands(): Command {
  const database = new Command("database");
  database.alias("db");
  database.description("Database management commands");
  database
    .command("add")
    .description("Add database support to existing project")
    .option(
      "-t, --type <type>",
      "Database type (mongodb, postgresql, mysql, sqlite, sqlserver)"
    )
    .action(async (opts) => {
      await addDatabase(opts.type);
    });

  database
    .command("switch")
    .description("Switch database type")
    .option("-t, --type <type>", "Target database type")
    .option("--migrate", "Migrate existing data")
    .action(async (opts) => {
      await switchDatabase(opts.type, opts.migrate);
    });

  database
    .command("info")
    .description("Show current database configuration")
    .action(async () => {
      await showDatabaseInfo();
    });

  database
    .command("migrate")
    .description("Run database migrations (PostgreSQL)")
    .option("--create <name>", "Create new migration")
    .option("--upgrade", "Apply pending migrations")
    .option("--downgrade <rev>", "Downgrade to revision")
    .action(async (opts) => {
      await handleMigrate(opts);
    });

  return database;
}

async function addDatabase(type: string): Promise<void> {
  const selector = new DatabaseSelector();
  const dbType = (type as DatabaseType) || "mongodb";

  try {
    const provider = await selector.selectDatabase(dbType);
    const generator = new DatabaseGenerator(provider);
    await generator.generateDatabaseConfig(process.cwd());
    logger.success(`Added ${dbType} support`);
  } catch (err) {
    logger.error(`Failed to add database: ${(err as Error).message}`);
  }
}

async function switchDatabase(type: string, migrate: boolean): Promise<void> {
  const selector = new DatabaseSelector();
  const dbType = (type as DatabaseType) || "mongodb";

  try {
    const provider = await selector.selectDatabase(dbType);
    const generator = new DatabaseGenerator(provider);
    await generator.generateDatabaseConfig(process.cwd());
    logger.info(`Switched to ${dbType}`);

    if (migrate) {
      await handleMigrate({ upgrade: true });
    }
  } catch (err) {
    logger.error(`Failed to switch database: ${(err as Error).message}`);
  }
}

async function showDatabaseInfo(): Promise<void> {
  const config = await configLoader.loadConfig();
  if (!config?.database) {
    logger.warn("No database configuration found");
    return;
  }

  const { type, url } = config.database;
  logger.info(`Type: ${type}`);
  if (url) {
    logger.info(`URL: ${url.replace(/\/\/[^:]+:[^@]+@/, "//***:***@")}`);
  }
}

async function handleMigrate(options: MigrateOptions): Promise<void> {
  const config = await configLoader.loadConfig();
  const sqlDatabases = ["postgresql", "mysql", "sqlite", "sqlserver"];

  if (!config?.database?.type || !sqlDatabases.includes(config.database.type)) {
    logger.error(
      `Migrations are supported for SQL databases: ${sqlDatabases.join(", ")}`
    );
    return;
  }

  try {
    if (options.create) {
      await execAsync("alembic", [
        "revision",
        "--autogenerate",
        "-m",
        options.create,
      ]);
    } else if (options.upgrade) {
      await execAsync("alembic", ["upgrade", "head"]);
    } else if (options.downgrade) {
      await execAsync("alembic", ["downgrade", options.downgrade]);
    } else {
      logger.error("No migration option provided");
    }
  } catch (err) {
    logger.error(`Migration failed: ${(err as Error).message}`);
  }
}
