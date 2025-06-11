// tools/cli/index.ts
import { createGenerateCommand } from "./commands/generate.js";
import { Command } from "commander";
import chalk from "chalk";

const program = new Command();

// Colorize the description and version output
program
  .name("farm")
  .description(
    chalk.greenBright("FARM Stack Framework - AI-first full-stack development")
  )
  .version("0.1.0", "-V, --version", chalk.cyan("output the version number"));

// Colorize error output globally
program.configureOutput({
  outputError: (str, write) => write(chalk.redBright(str)),
});

program.addCommand(createGenerateCommand());
program.parse(process.argv);
