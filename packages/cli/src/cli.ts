#!/usr/bin/env node

import { Command } from "commander";
import chalk from "chalk";
import { FARM_VERSION } from "@farm/core";

const program = new Command();

program
  .name("farm")
  .description("AI-first full-stack development framework")
  .version(FARM_VERSION);

program
  .command("create <project-name>")
  .description("Create a new FARM project")
  .option("-t, --template <template>", "project template")
  .option("-f, --features <features>", "comma-separated features")
  .option("-d, --database <database>", "database type")
  .option("--no-typescript", "use JavaScript instead of TypeScript")
  .option("--no-docker", "skip Docker configuration")
  .option("--no-testing", "skip testing setup")
  .option("--no-git", "skip git initialization")
  .option("--no-install", "skip dependency installation")
  .option("--no-interactive", "skip interactive prompts")
  .action(async (projectName, options) => {
    const { createCommand } = await import("./commands/create");
    await createCommand(projectName, options);
  });

program
  .command("dev")
  .description("Start development server")
  .option("--frontend-only", "start only frontend")
  .option("--backend-only", "start only backend")
  .option("--port <port>", "port number")
  .option("--verbose", "verbose logging")
  .action(async (options) => {
    console.log(chalk.yellow("Development server command coming soon!"));
    console.log("Options:", options);
  });

program
  .command("build")
  .description("Build for production")
  .option("--analyze", "analyze bundle size")
  .action(async (options) => {
    console.log(chalk.yellow("Build command coming soon!"));
    console.log("Options:", options);
  });

// Error handling
program.on("command:*", () => {
  console.error(chalk.red(`Invalid command: ${program.args.join(" ")}`));
  console.log(chalk.yellow("See --help for a list of available commands."));
  process.exit(1);
});

program.parse();
