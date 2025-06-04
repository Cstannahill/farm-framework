import { Command, program } from "commander";
import chalk from "chalk";
import { getVersion, checkCompatibility } from "./version.js";
import { FarmError, handleError } from "./errors.js";
import { loadConfig } from "./config.js";
import { createCommand } from "../commands/create.js";
import { devCommand } from "../commands/dev.js";
import { generateCommand } from "../commands/generate.js";
import { buildCommand } from "../commands/build.js";
import type { CLIOptions } from "@farm/types";

export class FarmCLI {
  private program: Command;

  constructor() {
    this.program = new Command();
    this.setupProgram();
    this.registerCommands();
  }

  private setupProgram(): void {
    const version = getVersion();

    this.program
      .name("farm")
      .description("🌾 FARM Stack Framework - AI-First Full-Stack Development")
      .version(version, "-v, --version", "Display version number")
      .helpOption("-h, --help", "Display help for command")
      .configureHelp({
        sortSubcommands: true,
        showGlobalOptions: true,
      });

    // Global options
    this.program
      .option("-c, --config <path>", "Path to configuration file")
      .option("--verbose", "Enable verbose logging")
      .option("--silent", "Suppress all output except errors")
      .option("--no-color", "Disable colored output");
  }

  private registerCommands(): void {
    // farm create <project-name> [options]
    this.program
      .command("create")
      .description("Create a new FARM project")
      .argument("<project-name>", "Name of the project to create")
      .option("-t, --template <template>", "Project template", "basic")
      .option("-f, --features <features>", "Comma-separated list of features")
      .option("-d, --database <database>", "Database type", "mongodb")
      .option("--typescript", "Enable TypeScript (default: true)")
      .option("--no-typescript", "Use JavaScript instead")
      .option("--docker", "Include Docker setup (default: true)")
      .option("--no-docker", "Skip Docker configuration")
      .option("--testing", "Include test setup (default: true)")
      .option("--no-testing", "Skip testing configuration")
      .option("--git", "Initialize git repo (default: true)")
      .option("--no-git", "Skip git initialization")
      .option("--install", "Install dependencies (default: true)")
      .option("--no-install", "Skip dependency installation")
      .option("--interactive", "Force interactive mode")
      .option("--no-interactive", "Skip all prompts")
      .action(createCommand);

    // farm dev [options]
    this.program
      .command("dev")
      .description("Start the development server")
      .option("-p, --port <port>", "Port for proxy server", "4000")
      .option("--frontend-only", "Start frontend only")
      .option("--backend-only", "Start backend only")
      .option("--verbose", "Enable verbose logging")
      .action(devCommand);

    // farm generate <type> <name> [options]
    this.program
      .command("generate")
      .alias("g")
      .description("Generate code components")
      .argument("<type>", "Type to generate (model, route, page, component)")
      .argument("<name>", "Name of the component")
      .option("-f, --fields <fields>", "Model fields (for model generation)")
      .option("-m, --methods <methods>", "HTTP methods (for route generation)")
      .option("--crud", "Generate CRUD operations")
      .action(generateCommand);

    // farm build [options]
    this.program
      .command("build")
      .description("Build the project for production")
      .option("--production", "Production build")
      .option("--analyze", "Analyze bundle size")
      .action(buildCommand);

    // Help customization
    this.program.on("--help", () => {
      console.log("");
      console.log("Examples:");
      console.log("  $ farm create my-app --template ai-chat");
      console.log("  $ farm dev --verbose");
      console.log('  $ farm generate model User --fields "name:str email:str"');
      console.log("  $ farm build --production");
      console.log("");
      console.log("For more information, visit: https://farm-stack.dev");
    });
  }

  async run(argv: string[]): Promise<void> {
    try {
      // Check Node.js version compatibility
      await checkCompatibility();

      // Parse and execute commands
      await this.program.parseAsync(argv);
    } catch (error) {
      handleError(error);
      throw error;
    }
  }
}
