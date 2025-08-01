import { Command } from "commander";
import chalk from "chalk";
import {
  CodeIntelligenceServer,
  createCodeIntelligenceConfig,
  validateConfig,
} from "@farm-framework/code-intelligence";
import { logger } from "./utils/logger.js";

export function createIntelCommand(): Command {
  const intel = new Command("intel")
    .description("Code intelligence and AI-powered code assistance")
    .option("-p, --port <port>", "Server port", "8001")
    .option("-h, --host <host>", "Server host", "localhost")
    .option("--no-watch", "Disable file watching")
    .option("--reset", "Reset vector database")
    .option("-v, --verbose", "Verbose logging");

  intel
    .command("start")
    .description("Start the code intelligence server")
    .action(async (options) => {
      try {
        const config = createCodeIntelligenceConfig({
          api: {
            port: parseInt(options.port || "8001"),
            host: options.host || "localhost",
          },
          indexing: {
            watch: options.watch !== false,
          },
        });

        const errors = validateConfig(config);
        if (errors.length > 0) {
          logger.error("Configuration validation failed:");
          errors.forEach((error) => logger.error(`  - ${error}`));
          process.exit(1);
        }

        logger.info("Starting Code Intelligence server...");
        logger.info(`Server will run on ${config.api.host}:${config.api.port}`);

        const server = new CodeIntelligenceServer(config, process.cwd());
        
        if (options.reset) {
          logger.info("Resetting vector database...");
          await server.reset();
        }

        await server.start();
        
        logger.success("✅ Code Intelligence server started successfully!");
        logger.info(`🔍 Query endpoint: http://${config.api.host}:${config.api.port}/query`);
        logger.info(`📖 Explain endpoint: http://${config.api.host}:${config.api.port}/explain`);
        
        // Keep the process running
        process.on("SIGINT", async () => {
          logger.info("Shutting down Code Intelligence server...");
          await server.stop();
          process.exit(0);
        });

      } catch (error) {
        logger.error("Failed to start Code Intelligence server:");
        logger.error(error instanceof Error ? error.message : String(error));
        if (options.verbose) {
          console.error(error);
        }
        process.exit(1);
      }
    });

  intel
    .command("query <query>")
    .description("Query your codebase using natural language")
    .option("-f, --format <format>", "Output format (json|table|markdown)", "table")
    .option("-n, --limit <limit>", "Maximum results", "10")
    .action(async (query, options) => {
      try {
        // For now, just show what would be queried
        // In the future, this would connect to a running server
        logger.info(`🔍 Querying codebase: "${query}"`);
        logger.info(`📊 Format: ${options.format}`);
        logger.info(`🔢 Limit: ${options.limit}`);
        
        logger.warn("⚠️  Code Intelligence server integration coming soon!");
        logger.info("💡 To get started, run: farm intel start");
        
      } catch (error) {
        logger.error("Query failed:");
        logger.error(error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });

  intel
    .command("explain <file> [line]")
    .description("Get AI explanation for code in a file")
    .option("-c, --context <lines>", "Context lines around the target", "5")
    .action(async (file, line, options) => {
      try {
        logger.info(`📖 Explaining code in: ${chalk.blue(file)}`);
        if (line) {
          logger.info(`📍 Line: ${line} (±${options.context} context)`);
        }
        
        logger.warn("⚠️  Code explanation integration coming soon!");
        logger.info("💡 To get started, run: farm intel start");
        
      } catch (error) {
        logger.error("Explanation failed:");
        logger.error(error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });

  intel
    .command("status")
    .description("Show code intelligence server status")
    .action(async () => {
      try {
        logger.info("📊 Code Intelligence Status");
        logger.warn("⚠️  Status check integration coming soon!");
        logger.info("💡 To get started, run: farm intel start");
        
      } catch (error) {
        logger.error("Status check failed:");
        logger.error(error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });

  return intel;
}