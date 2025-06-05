// packages/cli/src/core/cli.ts
import { Command, Option } from "commander";
import chalk from "chalk";
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { createRequire } from "module";
import { createCreateCommand } from "../commands/create.js";
import { getErrorMessage } from "../utils/error-utils.js";
import { styles, icons, messages } from "../utils/styling.js";

// Handle __dirname for both CommonJS and ESM
const __dirname = process.cwd();

/**
 * Get package.json information
 */
export function getPackageInfo() {
  // Try multiple possible package.json locations
  const possiblePaths = [
    // When running from built CLI in monorepo context
    join(process.cwd(), "packages", "cli", "package.json"),
    // When running built CLI from its own directory
    join(__dirname, "..", "package.json"),
    // When running from source
    join(__dirname, "..", "..", "package.json"),
    // Fallback: relative to current file location
    join(__dirname, "package.json"),
  ];

  for (const packagePath of possiblePaths) {
    try {
      if (existsSync(packagePath)) {
        const packageJson = JSON.parse(readFileSync(packagePath, "utf-8"));
        // Verify this is the CLI package
        if (packageJson.name === "@farm/cli") {
          return {
            name: packageJson.name,
            version: packageJson.version,
            description: packageJson.description,
          };
        }
      }
    } catch {
      continue;
    }
  }

  // Fallback to default values if package.json not found
  return {
    name: "@farm/cli",
    version: "1.0.0",
    description: "FARM Stack Framework CLI",
  };
}

/**
 * Create a command with common configuration
 */
export function createCommand(name: string, description: string): Command {
  const command = new Command(name);
  command.description(description);

  // Add common options
  addCommonOptions(command);

  return command;
}

/**
 * Add common options to a command
 */
export function addCommonOptions(command: Command): Command {
  return command
    .option("-v, --verbose", "Enable verbose output")
    .option("--no-color", "Disable colored output")
    .option("--dry-run", "Show what would be done without executing");
}

/**
 * Add template selection option
 */
export function addTemplateOption(command: Command): Command {
  return command.addOption(
    new Option("-t, --template <template>", "Template to use")
      .choices([
        "basic",
        "ai-chat",
        "ai-dashboard",
        "ecommerce",
        "cms",
        "api-only",
      ])
      .default("basic")
  );
}

/**
 * Add feature selection option
 */
export function addFeaturesOption(command: Command): Command {
  return command.addOption(
    new Option(
      "-f, --features <features>",
      "Comma-separated list of features"
    ).argParser((value) => value.split(",").map((f) => f.trim()))
  );
}

/**
 * Add database selection option
 */
export function addDatabaseOption(command: Command): Command {
  return command.addOption(
    new Option("-d, --database <database>", "Database to use")
      .choices(["mongodb", "postgresql", "mysql", "sqlite"])
      .default("mongodb")
  );
}

/**
 * Handle command errors consistently
 */
export function handleCommandError(error: Error, command?: string): never {
  if (command) {
    console.error(chalk.red(`\n❌ Error in ${command} command:`));
  } else {
    console.error(chalk.red("\n❌ Error:"));
  }

  console.error(chalk.red(error.message));

  if (process.env.DEBUG) {
    console.error("\nStack trace:");
    console.error(error.stack);
  }

  process.exit(1);
}

/**
 * Log verbose message if verbose mode is enabled
 */
export function logVerbose(
  message: string,
  options?: { verbose?: boolean }
): void {
  if (options?.verbose || process.env.FARM_VERBOSE) {
    console.log(chalk.gray(`[VERBOSE] ${message}`));
  }
}

/**
 * Log info message
 */
export function logInfo(message: string): void {
  console.log(chalk.blue(`ℹ ${message}`));
}

/**
 * Log success message
 */
export function logSuccess(message: string): void {
  console.log(chalk.green(`✅ ${message}`));
}

/**
 * Log warning message
 */
export function logWarning(message: string): void {
  console.log(chalk.yellow(`⚠️ ${message}`));
}

/**
 * Log error message
 */
export function logError(message: string): void {
  console.error(chalk.red(`❌ ${message}`));
}

/**
 * Create a spinner-like progress indicator
 */
export class ProgressIndicator {
  private message: string;
  private spinner: string[] = [
    "⠋",
    "⠙",
    "⠹",
    "⠸",
    "⠼",
    "⠴",
    "⠦",
    "⠧",
    "⠇",
    "⠏",
  ];
  private currentIndex = 0;
  private interval?: NodeJS.Timeout;

  constructor(message: string) {
    this.message = message;
  }

  start(): void {
    this.currentIndex = 0;
    this.interval = setInterval(() => {
      process.stdout.write(
        `\r${this.spinner[this.currentIndex]} ${this.message}`
      );
      this.currentIndex = (this.currentIndex + 1) % this.spinner.length;
    }, 100);
  }

  update(message: string): void {
    this.message = message;
  }

  succeed(message?: string): void {
    this.stop();
    console.log(`✅ ${message || this.message}`);
  }

  fail(message?: string): void {
    this.stop();
    console.log(`❌ ${message || this.message}`);
  }

  warn(message?: string): void {
    this.stop();
    console.log(`⚠️ ${message || this.message}`);
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = undefined;
    }
    process.stdout.write("\r\x1b[K"); // Clear current line
  }
}

/**
 * Validate CLI arguments
 */
export function validateArgs(args: any, required: string[]): void {
  const missing = required.filter((arg) => !args[arg]);

  if (missing.length > 0) {
    throw new Error(`Missing required arguments: ${missing.join(", ")}`);
  }
}

/**
 * Parse feature flags from command line
 */
export function parseFeatures(featuresInput?: string | string[]): string[] {
  if (!featuresInput) return [];

  if (Array.isArray(featuresInput)) {
    return featuresInput;
  }

  return featuresInput
    .split(",")
    .map((f) => f.trim())
    .filter((f) => f.length > 0);
}

/**
 * Get configuration from various sources
 */
export function getConfiguration(configPath?: string) {
  // This would load configuration from:
  // 1. Command line arguments
  // 2. Configuration file (farm.config.ts)
  // 3. Environment variables
  // 4. Defaults

  return {
    // Placeholder for configuration loading
    configPath,
    environment: process.env.NODE_ENV || "development",
  };
}

/**
 * Check if we're in a FARM project directory
 */
export function isInFarmProject(): boolean {
  try {
    const fs = require("fs");
    return fs.existsSync("farm.config.ts") || fs.existsSync("farm.config.js");
  } catch {
    return false;
  }
}

/**
 * Format duration in human readable format
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3600000) return `${(ms / 60000).toFixed(1)}m`;
  return `${(ms / 3600000).toFixed(1)}h`;
}

/**
 * Format file size in human readable format
 */
export function formatBytes(bytes: number): string {
  const sizes = ["B", "KB", "MB", "GB"];
  if (bytes === 0) return "0 B";
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + " " + sizes[i];
}

/**
 * Banner for CLI startup
 */
export function showBanner(): void {
  const { version } = getPackageInfo();
  console.log(
    chalk.green(`
🌾 FARM Stack Framework CLI v${version}
   FastAPI + AI/ML + React + MongoDB
   
   AI-first full-stack development platform
  `)
  );
}

/**
 * Show help for a specific topic
 */
export function showHelp(topic?: string): void {
  switch (topic) {
    case "templates":
      console.log(
        chalk.blue(`
📋 Available Templates:

• basic       - Simple React + FastAPI + MongoDB setup
• ai-chat     - Chat application with streaming AI responses  
• ai-dashboard- Data dashboard with ML insights
• ecommerce   - E-commerce platform with payments
• cms         - Content management system
• api-only    - FastAPI backend only, no React frontend

Use: farm create my-app --template <template-name>
      `)
      );
      break;

    case "features":
      console.log(
        chalk.blue(`
🎛️ Available Features:

• auth        - Authentication & user management
• ai          - AI/ML integration (Ollama + cloud providers)
• realtime    - Real-time features (WebSocket)
• payments    - Payment processing (Stripe, PayPal)
• email       - Email service integration
• storage     - File upload and cloud storage
• search      - Full-text search capabilities
• analytics   - User analytics and tracking

Use: farm create my-app --features auth,ai,realtime
      `)
      );
      break;

    default:
      console.log(
        chalk.blue(`
📚 FARM CLI Help Topics:

farm help templates  - Show available project templates
farm help features   - Show available feature options
farm create --help   - Create command options
farm dev --help      - Development server options

For more help: https://github.com/your-org/farm-framework/docs
      `)
      );
  }
}

/**
 * Main CLI class
 */
export class FarmCLI {
  private program: Command;

  constructor() {
    this.program = new Command();
    this.setupProgram();
    this.registerCommands();
  }

  private setupProgram(): void {
    const packageInfo = getPackageInfo();

    this.program
      .name("farm")
      .description(packageInfo.description || "FARM Stack Framework CLI")
      .version(packageInfo.version || "1.0.0")
      .helpOption("-h, --help", "Display help information")
      .option("-v, --verbose", "Enable verbose output")
      .option("--no-color", "Disable colored output")
      .hook("preAction", (thisCommand) => {
        // Set global options
        const opts = thisCommand.opts();
        if (opts.noColor) {
          process.env.FORCE_COLOR = "0";
        }
        if (opts.verbose) {
          process.env.FARM_VERBOSE = "true";
        }
      });
  }

  private registerCommands(): void {
    try {
      // Register create command
      const createCommand = createCreateCommand();
      this.program.addCommand(createCommand);

      // Register help command
      this.program
        .command("help")
        .description("Show help information")
        .argument("[topic]", "Help topic (templates, features)")
        .action((topic) => {
          showHelp(topic);
        });

      // Register dev command placeholder
      this.program
        .command("dev")
        .description("Start development server")
        .option("-p, --port <port>", "Port to run on", "3000")
        .option("--host <host>", "Host to bind to", "localhost")
        .action((options) => {
          console.log(messages.info("Development server starting..."));
          console.log(
            `${icons.box} Server: http://${options.host}:${options.port}`
          );
          // TODO: Implement dev server
        });

      // Register build command placeholder
      this.program
        .command("build")
        .description("Build the project")
        .option("--mode <mode>", "Build mode", "production")
        .action((options) => {
          console.log(messages.info("Building project..."));
          // TODO: Implement build
        });
    } catch (error) {
      console.error(
        messages.error(`Failed to register commands: ${getErrorMessage(error)}`)
      );
      process.exit(1);
    }
  }

  public async run(argv: string[]): Promise<void> {
    try {
      await this.program.parseAsync(argv);
    } catch (error) {
      console.error(messages.error(`CLI Error: ${getErrorMessage(error)}`));
      process.exit(1);
    }
  }

  public getProgram(): Command {
    return this.program;
  }
}
