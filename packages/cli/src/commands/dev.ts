import { Command } from "commander";
import { existsSync } from "fs";
import { join } from "path";
import { FarmDevServer, Logger } from "@farm-framework/dev-server";

// Create logger instance that will be updated with verbose setting
let logger: Logger;

export interface DevCommandOptions {
  port?: number;
  "frontend-only"?: boolean;
  "backend-only"?: boolean;
  verbose?: boolean;
  config?: string;
  "skip-health-check"?: boolean;
  services?: string;
}

export function createDevCommand(): Command {
  return new Command("dev")
    .description("Start the FARM development server")
    .option("-p, --port <port>", "Port for the proxy server", "4000")
    .option("--frontend-only", "Start only the frontend (React/Vite)")
    .option(
      "--backend-only",
      "Start only the backend (FastAPI) and dependencies"
    )
    .option("-v, --verbose", "Enable verbose logging")
    .option(
      "-c, --config <path>",
      "Path to configuration file",
      "farm.config.ts"
    )
    .option("--skip-health-check", "Skip health checks for faster startup")
    .option(
      "--services <services>",
      "Comma-separated list of specific services to start"
    )
    .action(async (options: DevCommandOptions) => {
      await devCommand(options);
    });
}

export async function devCommand(options: DevCommandOptions): Promise<void> {
  try {
    // Initialize logger with verbose setting
    logger = new Logger("info", options.verbose || false);

    // Validate we're in a FARM project
    const projectPath = process.cwd();
    const isValid = await checkProjectValid(projectPath);

    if (!isValid) {
      logger.error("Not a valid FARM project directory");
      logger.info('Run "farm create <project-name>" to create a new project');
      process.exit(1);
    }

    // Parse services option
    const services = options.services
      ? options.services.split(",").map((s) => s.trim())
      : [];

    // Create dev server options
    const devServerOptions = {
      port: options.port ? parseInt(options.port.toString(), 10) : 4000,
      frontendOnly: options["frontend-only"] || false,
      backendOnly: options["backend-only"] || false,
      verbose: options.verbose || false,
      configPath: options.config || "farm.config.ts",
      skipHealthCheck: options["skip-health-check"] || false,
      services,
    };

    // Validate port
    if (
      isNaN(devServerOptions.port) ||
      devServerOptions.port < 1 ||
      devServerOptions.port > 65535
    ) {
      logger.error("Invalid port number. Must be between 1 and 65535");
      process.exit(1);
    }

    // Check for conflicting options
    if (devServerOptions.frontendOnly && devServerOptions.backendOnly) {
      logger.error("Cannot use --frontend-only and --backend-only together");
      process.exit(1);
    }

    // Show startup message
    if (devServerOptions.verbose) {
      logger.info(
        "Starting FARM development server with options:",
        devServerOptions
      );
    }

    // Start the development server
    const devServer = new FarmDevServer(devServerOptions);

    // Setup event handlers for better CLI feedback
    setupDevServerEventHandlers(devServer, logger);

    // Start the server
    await devServer.start(projectPath);

    // Keep the process alive
    await waitForShutdown();
  } catch (error) {
    logger.error("Failed to start development server:", error);

    if (options.verbose && error instanceof Error) {
      logger.error("Stack trace:", error.stack);
    }

    // Provide helpful error messages
    if (error instanceof Error) {
      if (error.message.includes("EADDRINUSE")) {
        logger.info(
          `💡 Port ${
            options.port || 4000
          } is already in use. Try a different port with --port <number>`
        );
      } else if (error.message.includes("ENOENT")) {
        logger.info(
          '💡 Make sure all dependencies are installed. Try running "npm install" in your project.'
        );
      } else if (error.message.includes("docker")) {
        logger.info(
          "💡 Docker is required for database and AI services. Please install Docker and make sure it's running."
        );
      } else if (error.message.includes("Configuration")) {
        logger.info(
          "💡 Check your farm.config.ts file for syntax errors or invalid configuration."
        );
      }
    }

    process.exit(1);
  }
}

function setupDevServerEventHandlers(
  devServer: FarmDevServer,
  logger: Logger
): void {
  // Service lifecycle events
  devServer.on("service-starting", (name: string) => {
    if (process.env.FARM_VERBOSE) {
      logger.info(`🚀 Starting ${name}...`);
    }
  });

  devServer.on("service-ready", (name: string) => {
    if (process.env.FARM_VERBOSE) {
      logger.success(`✅ ${name} is ready`);
    }
  });

  devServer.on("service-error", (name: string, error: Error) => {
    logger.error(`❌ ${name} error:`, error.message);

    // Provide service-specific help
    if (name === "MongoDB" || name === "database") {
      logger.info(
        "💡 Make sure Docker is running and MongoDB container can be started"
      );
    } else if (name === "Ollama AI") {
      logger.info(
        "💡 Ollama is optional. The app will work without local AI models."
      );
    } else if (name === "FastAPI") {
      logger.info(
        "💡 Check if Python dependencies are installed and FastAPI can start"
      );
    } else if (name === "Vite (React)") {
      logger.info(
        "💡 Check if Node.js dependencies are installed and Vite can start"
      );
    }
  });

  devServer.on(
    "service-exit",
    (name: string, code: number | null, signal: string | null) => {
      if (code !== null && code !== 0) {
        logger.warn(
          `⚠️ ${name} exited with code ${code}${signal ? ` (${signal})` : ""}`
        );
      }
    }
  );

  devServer.on("all-services-ready", () => {
    // All services are now ready
    console.log(); // newLine equivalent
    logger.success("🎉 All services are ready! Happy coding!");
    console.log(); // newLine equivalent

    // Show helpful commands
    logger.info("💡 Helpful commands:");
    logger.info("  • Press Ctrl+C to stop all services");
    logger.info("  • Check logs in your terminal");
    logger.info("  • Edit files to see hot-reload in action");
    console.log(); // newLine equivalent
  });

  devServer.on("shutdown-started", () => {
    logger.info("🛑 Shutting down development server...");
  });

  devServer.on("shutdown-complete", () => {
    logger.success("✅ Development server stopped");
  });
}

async function waitForShutdown(): Promise<void> {
  return new Promise((resolve) => {
    const shutdown = () => {
      resolve();
    };

    // Handle various shutdown signals
    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
    process.on("SIGUSR1", shutdown);
    process.on("SIGUSR2", shutdown);

    // Keep the process alive
    const keepAlive = setInterval(() => {}, 1000);

    // Clean up interval when shutting down
    process.once("exit", () => {
      clearInterval(keepAlive);
    });
  });
}

// Local validation logic for project
async function checkProjectValid(projectPath: string): Promise<boolean> {
  const configPath = join(projectPath, "farm.config.ts");
  return existsSync(configPath);
}

// Additional utility functions for the dev command

export async function checkDependencies(projectPath: string): Promise<boolean> {
  try {
    // Check if package.json exists in frontend
    const frontendPackageJson = join(
      projectPath,
      "apps",
      "web",
      "package.json"
    );
    if (!existsSync(frontendPackageJson)) {
      logger.warn("Frontend package.json not found");
      return false;
    }

    // Check if requirements.txt or pyproject.toml exists in backend
    const backendRequirements = join(
      projectPath,
      "apps",
      "api",
      "requirements.txt"
    );
    const backendPyproject = join(projectPath, "apps", "api", "pyproject.toml");

    if (!existsSync(backendRequirements) && !existsSync(backendPyproject)) {
      logger.warn("Backend dependencies file not found");
      return false;
    }

    return true;
  } catch (error) {
    logger.error("Error checking dependencies:", error);
    return false;
  }
}

export function getDevServerHelp(): string {
  return `
FARM Development Server Commands:

Basic Usage:
  farm dev                           Start all services (recommended)
  farm dev --verbose                 Start with detailed logging
  farm dev --port 3001              Use different proxy port

Service Control:
  farm dev --frontend-only           Start only React frontend
  farm dev --backend-only            Start backend + dependencies
  farm dev --services database,api   Start specific services only

Configuration:
  farm dev --config custom.config.ts  Use custom config file
  farm dev --skip-health-check        Skip health checks for faster startup

Examples:
  # Full stack development (default)
  farm dev

  # Frontend development only (uses existing backend)
  farm dev --frontend-only --port 3000

  # Backend + AI development
  farm dev --backend-only --verbose

  # Quick startup without health checks
  farm dev --skip-health-check

  # Database + API only
  farm dev --services database,backend

For more information, visit: https://farmstack.dev/docs/development
`;
}

// Export the help function for use in CLI help system
export { getDevServerHelp as devHelp };
