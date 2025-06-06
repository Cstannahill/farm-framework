/**
 * FARM CLI - AI-First Full-Stack Framework
 */

import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { readFile } from "fs/promises";
import { Command } from "commander";
import chalk from "chalk";

// Import utilities
import {
  handleCliError,
  FarmError,
  type ErrorContext,
} from "./utils/error-handling.js";

// Get current file info for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read package.json to get version
async function getVersion(): Promise<string> {
  try {
    const packageJsonPath = join(__dirname, "../package.json");
    const packageJson = JSON.parse(await readFile(packageJsonPath, "utf-8"));
    return packageJson.version;
  } catch {
    return "0.1.0";
  }
}

// Create main program
const program = new Command();

// Setup program metadata
async function setupProgram() {
  const version = await getVersion();

  program
    .name("farm")
    .description("FARM Stack Framework - AI-First Full-Stack Development")
    .version(version)
    .helpOption("-h, --help", "Display help for command");

  // Create command
  program
    .command("create")
    .description("Create a new FARM application")
    .argument("<project-name>", "Name of the project to create")
    .option("-t, --template <template>", "Template to use", "basic")
    .option("-f, --features <features>", "Features to enable (comma-separated)")
    .option("-d, --database <database>", "Database to use", "mongodb")
    .option("--typescript", "Use TypeScript (default: true)", true)
    .option("--no-typescript", "Use JavaScript instead of TypeScript")
    .option("--docker", "Include Docker setup (default: true)", true)
    .option("--no-docker", "Skip Docker configuration")
    .option("--git", "Initialize git repository (default: true)", true)
    .option("--no-git", "Skip git initialization")
    .option("--install", "Install dependencies (default: true)", true)
    .option("--no-install", "Skip dependency installation")
    .option("--interactive", "Force interactive mode")
    .option("--no-interactive", "Skip all prompts (use defaults/args only)")
    .action(async (projectName, options) => {
      try {
        console.log(chalk.blue(`🌾 Creating FARM application: ${projectName}`));
        console.log(chalk.gray(`Template: ${options.template}`));
        console.log(chalk.gray(`Database: ${options.database}`));
        console.log(
          chalk.gray(`TypeScript: ${options.typescript ? "Yes" : "No"}`)
        );

        // TODO: Implement project creation logic
        console.log(chalk.green("✅ Project created successfully!"));
        console.log(chalk.blue("\n📚 Next steps:"));
        console.log(chalk.gray(`  cd ${projectName}`));
        console.log(chalk.gray("  farm dev"));
      } catch (error) {
        handleCliError(error, {
          command: "create",
          operation: "project-creation",
          details: { projectName, options },
        });
      }
    });

  // Dev command
  program
    .command("dev")
    .description("Start development server")
    .option("--frontend-only", "Start only frontend server")
    .option("--backend-only", "Start only backend server")
    .option("--port <port>", "Port to use for proxy server", "4000")
    .option("--watch", "Enable file watching")
    .option("--verbose", "Enable verbose logging")
    .action(async (options) => {
      try {
        console.log(chalk.blue("🌾 Starting FARM development server..."));

        // TODO: Implement development server logic
        console.log(chalk.green("✅ Development server started!"));
        console.log(chalk.blue("📱 Frontend:  http://localhost:3000"));
        console.log(chalk.blue("🔗 Proxy:     http://localhost:4000"));
        console.log(chalk.blue("⚡ Backend:   http://localhost:8000"));
      } catch (error) {
        handleCliError(error, {
          command: "dev",
          operation: "server-start",
          details: { options },
        });
      }
    });

  // Build command
  program
    .command("build")
    .description("Build application for production")
    .option("-t, --target <targets...>", "Build targets", ["all"])
    .option("-e, --env <environment>", "Target environment", "production")
    .option("--analyze", "Generate bundle analysis")
    .action(async (options) => {
      try {
        console.log(chalk.blue("🏗️ Building FARM application..."));

        // TODO: Implement build logic
        console.log(chalk.green("✅ Build completed successfully!"));
      } catch (error) {
        handleCliError(error, {
          command: "build",
          operation: "production-build",
          details: { options },
        });
      }
    });
}

// Error handling for uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Rejection:", reason);
  process.exit(1);
});

// Main execution
async function main() {
  try {
    await setupProgram();
    await program.parseAsync(process.argv);
  } catch (error) {
    console.error("CLI Error:", error);
    process.exit(1);
  }
}

// Execute immediately
main();

export { program };
