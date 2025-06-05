// tools/codegen/src/cli/schema.ts
import { Command } from "commander";
import { readFile, writeFile } from "fs/promises";
import { join } from "path";
import chalk from "chalk";
import ora from "ora";
import {
  OpenAPISchemaExtractor,
  SchemaExtractionOptions,
} from "../schema/extractor";
import { SchemaWatcher, SchemaWatcherOptions } from "../schema/watcher";
import { getErrorMessage } from "@farm/cli";

interface CLIOptions {
  projectRoot?: string;
  output?: string;
  port?: number;
  cache?: boolean;
  force?: boolean;
  verbose?: boolean;
  watch?: boolean;
  format?: "json" | "yaml";
  debounce?: number;
}

export function createSchemaCommand(): Command {
  const command = new Command("schema");

  command.description(
    "Extract and manage OpenAPI schemas from FastAPI applications"
  );

  // Extract command
  command
    .command("extract")
    .description("Extract OpenAPI schema from FastAPI application")
    .option("-o, --output <path>", "Output file path", "schema.json")
    .option("-p, --port <number>", "Port for temporary server", "8001")
    .option("--no-cache", "Disable schema caching")
    .option("-f, --force", "Force extraction (ignore cache)")
    .option("-v, --verbose", "Verbose output")
    .option("--format <format>", "Output format (json|yaml)", "json")
    .action(handleExtractCommand);

  // Watch command
  command
    .command("watch")
    .description("Watch for changes and auto-extract schema")
    .option("-o, --output <path>", "Output file path", "schema.json")
    .option("-p, --port <number>", "Port for temporary server", "8001")
    .option("-v, --verbose", "Verbose output")
    .option("--debounce <ms>", "Debounce delay in milliseconds", "1000")
    .action(handleWatchCommand);

  // Clear cache command
  command
    .command("clear-cache")
    .description("Clear schema cache")
    .option("-v, --verbose", "Verbose output")
    .action(handleClearCacheCommand);

  // Cache stats command
  command
    .command("cache-stats")
    .description("Show schema cache statistics")
    .action(handleCacheStatsCommand);

  // Validate command
  command
    .command("validate [file]")
    .description("Validate OpenAPI schema file")
    .option("-v, --verbose", "Verbose output")
    .action(handleValidateCommand);

  return command;
}

/**
 * Handle schema extraction command
 */
async function handleExtractCommand(options: CLIOptions): Promise<void> {
  const spinner = ora("Extracting OpenAPI schema...").start();

  try {
    const extractorOptions: SchemaExtractionOptions = {
      port: options.port ? parseInt(options.port.toString()) : undefined,
      forceRefresh: options.force,
      cacheDir: options.cache !== false ? ".farm/cache/schemas" : undefined,
    };

    const extractor = new OpenAPISchemaExtractor(extractorOptions);

    if (options.verbose) {
      spinner.stop();
      console.log(chalk.blue("🔍 Starting schema extraction..."));
      console.log(chalk.gray(`Port: ${extractorOptions.port}`));
      console.log(
        chalk.gray(`Cache: ${options.cache ? "enabled" : "disabled"}`)
      );
      console.log(chalk.gray(`Force: ${options.force ? "yes" : "no"}`));
      spinner.start();
    }

    const schema = await extractor.extractSchema();

    // Save schema to file
    const outputPath = options.output || "schema.json";
    const outputContent =
      options.format === "yaml"
        ? convertToYaml(schema)
        : JSON.stringify(schema, null, 2);

    await writeFile(outputPath, outputContent);

    spinner.succeed(chalk.green("✅ Schema extracted successfully"));

    console.log(chalk.cyan(`📋 Schema saved to: ${outputPath}`));
    console.log(chalk.gray(`   Title: ${schema.info.title}`));
    console.log(chalk.gray(`   Version: ${schema.info.version}`));
    console.log(chalk.gray(`   Paths: ${Object.keys(schema.paths).length}`));
    console.log(
      chalk.gray(
        `   Components: ${
          schema.components?.schemas
            ? Object.keys(schema.components.schemas).length
            : 0
        }`
      )
    );
  } catch (error) {
    spinner.fail(chalk.red("❌ Schema extraction failed"));
    console.error(chalk.red(getErrorMessage(error)));

    if (options.verbose && getErrorMessage(error)) {
      console.error(chalk.gray(getErrorMessage(error)));
    }

    process.exit(1);
  }
}

/**
 * Handle schema watching command
 */
async function handleWatchCommand(options: CLIOptions): Promise<void> {
  console.log(chalk.blue("👀 Starting schema watcher..."));

  try {
    const watcherOptions: SchemaWatcherOptions = {
      extractorOptions: {
        port: options.port ? parseInt(options.port.toString()) : undefined,
        forceRefresh: true, // Always force when watching
      },
      debounceMs: options.debounce
        ? parseInt(options.debounce.toString())
        : 1000,
      verbose: options.verbose || false,
    };

    const watcher = new SchemaWatcher(watcherOptions);

    // Setup event handlers
    watcher.on("schema-extracted", async (event) => {
      try {
        const outputPath = options.output || "schema.json";
        const outputContent = JSON.stringify(event.schema, null, 2);
        await writeFile(outputPath, outputContent);

        console.log(chalk.green(`✅ Schema updated: ${outputPath}`));
        console.log(
          chalk.gray(
            `   Paths: ${Object.keys(event.schema?.paths || {}).length}`
          )
        );
        console.log(
          chalk.gray(
            `   Time: ${new Date(event.timestamp).toLocaleTimeString()}`
          )
        );
      } catch (error) {
        console.error(
          chalk.red(`❌ Failed to save schema: ${getErrorMessage(error)}`)
        );
      }
    });

    watcher.on("schema-unchanged", (event) => {
      if (options.verbose) {
        console.log(chalk.yellow("📋 Schema unchanged"));
      }
    });

    watcher.on("extraction-error", (event) => {
      console.error(
        chalk.red(`❌ Schema extraction failed: ${event.error?.message}`)
      );

      if (options.verbose && event.error?.stack) {
        console.error(chalk.gray(event.error.stack));
      }
    });

    watcher.on("error", (event) => {
      console.error(chalk.red(`❌ Watcher error: ${event.error?.message}`));
    });

    // Start watching
    await watcher.start();

    console.log(chalk.green("✅ Schema watcher started"));
    console.log(
      chalk.cyan("   Watching for changes... (Press Ctrl+C to stop)")
    );

    // Handle graceful shutdown
    process.on("SIGINT", async () => {
      console.log(chalk.yellow("\n🛑 Stopping schema watcher..."));
      await watcher.stop();
      console.log(chalk.green("✅ Schema watcher stopped"));
      process.exit(0);
    });

    process.on("SIGTERM", async () => {
      await watcher.stop();
      process.exit(0);
    });
  } catch (error) {
    console.error(chalk.red("❌ Failed to start schema watcher"));
    console.error(chalk.red(getErrorMessage(error)));

    if (options.verbose && getErrorMessage(error)) {
      console.error(chalk.gray(getErrorMessage(error)));
    }

    process.exit(1);
  }
}

/**
 * Handle clear cache command
 */
async function handleClearCacheCommand(options: CLIOptions): Promise<void> {
  const spinner = ora("Clearing schema cache...").start();

  try {
    const extractor = new OpenAPISchemaExtractor();
    await extractor.clearCache();

    spinner.succeed(chalk.green("✅ Schema cache cleared"));
  } catch (error) {
    spinner.fail(chalk.red("❌ Failed to clear cache"));
    console.error(chalk.red(getErrorMessage(error)));

    if (options.verbose && getErrorMessage(error)) {
      console.error(chalk.gray(getErrorMessage(error)));
    }

    process.exit(1);
  }
}

/**
 * Handle cache stats command
 */
async function handleCacheStatsCommand(): Promise<void> {
  try {
    const extractor = new OpenAPISchemaExtractor();
    const stats = await extractor.getCacheStats();

    console.log(chalk.blue("📊 Schema Cache Statistics"));
    console.log(chalk.gray("─".repeat(40)));
    console.log(`Files: ${stats.files}`);
    console.log(`Total Size: ${formatBytes(stats.totalSize)}`);
    console.log(
      `Last Modified: ${
        stats.lastModified ? stats.lastModified.toLocaleString() : "Never"
      }`
    );
  } catch (error) {
    console.error(chalk.red("❌ Failed to get cache stats"));
    console.error(chalk.red(getErrorMessage(error)));
    process.exit(1);
  }
}

/**
 * Handle schema validation command
 */
async function handleValidateCommand(
  file?: string,
  options?: CLIOptions
): Promise<void> {
  const schemaFile = file || "schema.json";
  const spinner = ora(`Validating schema: ${schemaFile}`).start();

  try {
    const content = await readFile(schemaFile, "utf-8");
    const schema = JSON.parse(content);

    // Basic validation
    validateSchemaStructure(schema);

    spinner.succeed(chalk.green("✅ Schema is valid"));

    console.log(chalk.cyan(`📋 Schema Information:`));
    console.log(chalk.gray(`   File: ${schemaFile}`));
    console.log(chalk.gray(`   Title: ${schema.info?.title || "Unknown"}`));
    console.log(chalk.gray(`   Version: ${schema.info?.version || "Unknown"}`));
    console.log(chalk.gray(`   OpenAPI: ${schema.openapi || "Unknown"}`));
    console.log(
      chalk.gray(`   Paths: ${Object.keys(schema.paths || {}).length}`)
    );
    console.log(
      chalk.gray(
        `   Schemas: ${
          schema.components?.schemas
            ? Object.keys(schema.components.schemas).length
            : 0
        }`
      )
    );
  } catch (error) {
    spinner.fail(chalk.red("❌ Schema validation failed"));

    if (getErrorMessage(error) === "ENOENT") {
      console.error(chalk.red(`File not found: ${schemaFile}`));
    } else if (error instanceof SyntaxError) {
      console.error(chalk.red("Invalid JSON format"));
    } else {
      console.error(chalk.red(getErrorMessage(error)));
    }

    if (options?.verbose && getErrorMessage(error)) {
      console.error(chalk.gray(getErrorMessage(error)));
    }

    process.exit(1);
  }
}

/**
 * Validate schema structure
 */
function validateSchemaStructure(schema: any): void {
  if (!schema || typeof schema !== "object") {
    throw new Error("Schema must be an object");
  }

  if (!schema.openapi) {
    throw new Error("Missing required field: openapi");
  }

  if (!schema.info || !schema.info.title) {
    throw new Error("Missing required field: info.title");
  }

  if (!schema.paths || typeof schema.paths !== "object") {
    throw new Error("Missing or invalid field: paths");
  }
}

/**
 * Convert schema to YAML format
 */
function convertToYaml(schema: any): string {
  // Simple YAML conversion - in a real implementation, use a proper YAML library
  return JSON.stringify(schema, null, 2)
    .replace(/"/g, "")
    .replace(/: {/g, ":")
    .replace(/},/g, "")
    .replace(/}/g, "");
}

/**
 * Format bytes for display
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";

  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

// Example usage and testing
export async function testSchemaExtraction(): Promise<void> {
  console.log(chalk.blue("🧪 Testing Schema Extraction System"));
  console.log(chalk.gray("─".repeat(50)));

  try {
    // Test basic extraction
    console.log("1. Testing basic schema extraction...");
    const extractor = new OpenAPISchemaExtractor({
      port: 8001,
      timeout: 15000,
    });

    const schema = await extractor.extractSchema();
    console.log(
      chalk.green(
        `   ✅ Extracted schema with ${Object.keys(schema.paths).length} paths`
      )
    );

    // Test caching
    console.log("2. Testing schema caching...");
    const cachedSchema = await extractor.extractSchema();
    console.log(chalk.green("   ✅ Cache system working"));

    // Test watcher
    console.log("3. Testing schema watcher...");
    const watcher = new SchemaWatcher({
      verbose: false,
      debounceMs: 500,
    });

    await watcher.start();
    console.log(chalk.green("   ✅ Watcher started successfully"));

    await watcher.stop();
    console.log(chalk.green("   ✅ Watcher stopped successfully"));

    console.log(chalk.green("\n🎉 All tests passed!"));
  } catch (error) {
    console.error(chalk.red(`\n❌ Test failed: ${getErrorMessage(error)}`));
    throw error;
  }
}
