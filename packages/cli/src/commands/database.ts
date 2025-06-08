import { Command } from "commander";
import { DatabaseSelector } from "../scaffolding/database-selector.js";
import { DatabaseGenerator } from "../generators/database-generator.js";
import { logger } from "../utils/logger.js";

export function createDatabaseCommands(): Command {
  const database = new Command("database");
  database.alias("db");
  database.description("Database management commands");

  database
    .command("add")
    .description("Add database support to existing project")
    .option("-t, --type <type>", "Database type (mongodb, postgresql)")
    .action(async (opts) => {
      await addDatabase(opts.type);
    });

  return database;
}

async function addDatabase(type: string): Promise<void> {
  const selector = new DatabaseSelector();
  const dbType = (type as any) || "mongodb";
  try {
    const provider = await selector.selectDatabase(dbType);
    const generator = new DatabaseGenerator(provider);
    await generator.generateDatabaseConfig(process.cwd());
    logger.success(`Added ${dbType} support`);
  } catch (err) {
    logger.error(`Failed to add database: ${(err as Error).message}`);
  }
}
