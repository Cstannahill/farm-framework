import chalk from "chalk";
import { Logger } from "@farm/core";
import type { CreateProjectOptions } from "@farm/types";

const logger = new Logger("CREATE");

export async function createCommand(
  projectName: string,
  options: CreateProjectOptions
): Promise<void> {
  logger.info(`Creating FARM project: ${chalk.bold(projectName)}`);

  // Validate project name
  if (!isValidProjectName(projectName)) {
    logger.error(`Invalid project name: ${projectName}`);
    process.exit(1);
  }

  // TODO: Implement project creation logic
  logger.warn("Project creation not yet implemented");

  console.log("\nProject configuration:");
  console.log(`  Name: ${chalk.cyan(projectName)}`);
  console.log(`  Template: ${chalk.cyan(options.template || "basic")}`);
  console.log(
    `  Features: ${chalk.cyan(options.features?.join(", ") || "none")}`
  );
  console.log(`  Database: ${chalk.cyan(options.database || "mongodb")}`);
  console.log(`  TypeScript: ${chalk.cyan(options.typescript !== false)}`);
  console.log(`  Docker: ${chalk.cyan(options.docker !== false)}`);
  console.log(`  Testing: ${chalk.cyan(options.testing !== false)}`);
  console.log(`  Git: ${chalk.cyan(options.git !== false)}`);
  console.log(`  Install deps: ${chalk.cyan(options.install !== false)}`);

  logger.success("Project creation completed (placeholder)");
}

function isValidProjectName(name: string): boolean {
  // Basic validation - can be enhanced later
  return /^[a-zA-Z0-9-_]+$/.test(name) && name.length > 0 && name.length < 100;
}
