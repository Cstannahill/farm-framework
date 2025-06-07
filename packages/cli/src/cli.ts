// packages/cli/src/cli.ts
import { Command } from "commander";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { createCreateCommand } from "./commands/create.js";
import { createDevCommand } from "./commands/dev.js";
import { createBuildCommand } from "./commands/build.js";
import { createGenerateCommand } from "./commands/generate.js";
import { createValidateCommands } from "./commands/validate";
const __dirname = process.cwd();
const packageJson = JSON.parse(
  readFileSync(join(__dirname, "packages/cli/package.json"), "utf-8")
);

export function createCLI(): Command {
  const program = new Command();

  program
    .name("farm")
    .description("FARM Stack Framework - AI-first full-stack development")
    .version(packageJson.version)
    .helpOption("-h, --help", "Display help for command")
    .addHelpCommand("help [command]", "Display help for command");

  // Global options
  program
    .option("-v, --verbose", "Enable verbose logging")
    .option("--no-color", "Disable colored output")
    .option("--config <path>", "Path to configuration file");

  // Add your existing commands
  program.addCommand(createCreateCommand()); // We need to create this
  program.addCommand(createDevCommand()); // From your dev.ts
  program.addCommand(createBuildCommand()); // We need to update this
  program.addCommand(createGenerateCommand()); // We need to update this
  program.addCommand(createValidateCommands()); // We need to update this

  // Add version command as alias
  program
    .command("version")
    .description("Show version information")
    .action(() => {
      console.log(`FARM CLI v${packageJson.version}`);
    });

  // Handle unknown commands
  program.on("command:*", (operands) => {
    console.error(`\n❌ Unknown command: ${operands[0]}`);
    console.log('\nRun "farm --help" to see available commands.\n');
    process.exit(1);
  });

  return program;
}

export function setupErrorHandling() {
  process.on("unhandledRejection", (reason, promise) => {
    console.error("❌ Unhandled Rejection at:", promise, "reason:", reason);
    process.exit(1);
  });

  process.on("uncaughtException", (error) => {
    console.error("❌ Uncaught Exception:", error);
    process.exit(1);
  });
}
