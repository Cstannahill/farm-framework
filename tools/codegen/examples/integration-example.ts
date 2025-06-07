// tools/codegen/examples/integration-example.ts
/**
 * FARM Framework Schema Integration Example
 *
 * This example demonstrates the complete workflow of:
 * 1. Extracting OpenAPI schemas from FastAPI applications
 * 2. Watching for changes and auto-regeneration
 * 3. Caching and performance optimization
 * 4. Error handling and recovery
 */

import { OpenAPISchemaExtractor } from "../src/schema/extractor";
import { SchemaWatcher, SchemaWatcherManager } from "../src/schema/watcher";
import { join } from "path";
import chalk from "chalk";
import { getErrorMessage } from "@farm/cli";

// Example 1: Basic Schema Extraction
async function basicSchemaExtraction() {
  console.log(chalk.blue("\n📋 Example 1: Basic Schema Extraction"));
  console.log(chalk.gray("─".repeat(50)));

  try {
    const extractor = new OpenAPISchemaExtractor({
      apiPath: "apps/api/src/main.py",
      port: 8001,
      timeout: 30000,
      cacheDir: ".farm/cache/schemas",
    });

    console.log("🔍 Extracting schema...");
    const schema = await extractor.extractSchema();

    console.log(chalk.green("✅ Schema extracted successfully!"));
    console.log(`   Title: ${schema.info.title}`);
    console.log(`   Version: ${schema.info.version}`);
    console.log(`   Paths: ${Object.keys(schema.paths).length}`);

    if (schema.components?.schemas) {
      console.log(
        `   Components: ${Object.keys(schema.components.schemas).length}`
      );
    }

    // Example: Accessing specific path information
    console.log("\n📍 Available API Endpoints:");
    for (const [path, methods] of Object.entries(schema.paths)) {
      const methodList = Object.keys(methods).join(", ").toUpperCase();
      console.log(`   ${chalk.cyan(path)} - ${chalk.yellow(methodList)}`);
    }
  } catch (error) {
    console.error(
      chalk.red("❌ Schema extraction failed:"),
      getErrorMessage(error)
    );
  }
}

// Example 2: Schema Watching with Hot Reload
async function schemaWatchingExample() {
  console.log(chalk.blue("\n👀 Example 2: Schema Watching with Hot Reload"));
  console.log(chalk.gray("─".repeat(50)));

  try {
    const watcher = new SchemaWatcher({
      projectRoot: process.cwd(),
      extractorOptions: {
        apiPath: "apps/api/src/main.py",
        port: 8002,
        forceRefresh: true,
      },
      debounceMs: 1000,
      verbose: true,
    });

    // Setup event handlers
    watcher.on("schema-extracted", (event) => {
      console.log(chalk.green("🔄 Schema updated!"));
      console.log(
        `   Timestamp: ${new Date(event.timestamp).toLocaleTimeString()}`
      );
      console.log(`   Paths: ${Object.keys(event.schema?.paths || {}).length}`);

      // In a real application, this would trigger TypeScript generation
      triggerTypeScriptGeneration(event.schema!);
    });

    watcher.on("schema-unchanged", (event) => {
      console.log(chalk.yellow("📋 Schema unchanged (no regeneration needed)"));
    });

    watcher.on("extraction-error", (event) => {
      console.error(
        chalk.red("❌ Schema extraction error:"),
        event.error?.message
      );

      // In a real application, you might want to retry or fallback
      console.log(chalk.yellow("🔄 Will retry on next change..."));
    });

    console.log("🚀 Starting schema watcher...");
    await watcher.start();

    console.log(chalk.green("✅ Schema watcher started successfully!"));
    console.log("   Watching for changes in:");
    console.log("   - apps/api/src/**/*.py");
    console.log("   - farm.config.ts");
    console.log("   - requirements.txt");

    // Simulate running for a short time
    console.log(
      chalk.cyan(
        "\n   Try modifying your FastAPI routes to see hot reload in action!"
      )
    );
    console.log(
      chalk.gray("   (This example will stop automatically after 30 seconds)")
    );

    // Auto-stop after 30 seconds for demo purposes
    setTimeout(async () => {
      console.log(chalk.yellow("\n🛑 Stopping watcher (demo complete)..."));
      await watcher.stop();
      console.log(chalk.green("✅ Watcher stopped"));
    }, 30000);
  } catch (error) {
    console.error(
      chalk.red("❌ Watcher setup failed:"),
      getErrorMessage(error)
    );
  }
}

// Example 3: Multi-Project Schema Management
async function multiProjectExample() {
  console.log(chalk.blue("\n🏢 Example 3: Multi-Project Schema Management"));
  console.log(chalk.gray("─".repeat(50)));

  const manager = new SchemaWatcherManager();

  try {
    // Setup multiple watchers for different projects/services
    console.log("🚀 Setting up watchers for multiple services...");

    // Main API service
    const mainWatcher = await manager.createWatcher("main-api", {
      projectRoot: join(process.cwd(), "apps/api"),
      extractorOptions: {
        apiPath: "src/main.py",
        port: 8003,
      },
      verbose: false,
    });

    // Microservice example (if you have multiple APIs)
    // const userWatcher = await manager.createWatcher('user-service', {
    //   projectRoot: join(process.cwd(), 'services/user-api'),
    //   extractorOptions: {
    //     apiPath: 'src/app.py',
    //     port: 8004
    //   }
    // });

    console.log(chalk.green("✅ All watchers started!"));
    console.log(`   Active projects: ${manager.getProjectNames().join(", ")}`);

    // Show statistics
    const stats = manager.getAllStats();
    console.log("\n📊 Watcher Statistics:");
    for (const [project, stat] of Object.entries(stats)) {
      console.log(
        `   ${project}: ${stat.isWatching ? "Active" : "Inactive"} (${
          stat.filesWatched
        } files)`
      );
    }

    // Auto-cleanup after demo
    setTimeout(async () => {
      console.log(chalk.yellow("\n🧹 Cleaning up all watchers..."));
      await manager.stopAll();
      console.log(chalk.green("✅ All watchers stopped"));
    }, 15000);
  } catch (error) {
    console.error(
      chalk.red("❌ Multi-project setup failed:"),
      getErrorMessage(error)
    );
    await manager.stopAll();
  }
}

// Example 4: Cache Management and Performance
async function cacheManagementExample() {
  console.log(chalk.blue("\n💾 Example 4: Cache Management and Performance"));
  console.log(chalk.gray("─".repeat(50)));

  try {
    const extractor = new OpenAPISchemaExtractor({
      cacheDir: ".farm/cache/schemas",
      forceRefresh: false, // Enable caching
    });

    // First extraction (will cache)
    console.log("🔍 First extraction (will cache result)...");
    const start1 = Date.now();
    const schema1 = await extractor.extractSchema();
    const time1 = Date.now() - start1;
    console.log(chalk.green(`✅ First extraction: ${time1}ms`));

    // Second extraction (should use cache)
    console.log("🔍 Second extraction (should use cache)...");
    const start2 = Date.now();
    const schema2 = await extractor.extractSchema();
    const time2 = Date.now() - start2;
    console.log(
      chalk.green(
        `✅ Second extraction: ${time2}ms (${
          time2 < time1 ? "cache hit!" : "cache miss"
        })`
      )
    );

    // Show cache statistics
    const cacheStats = await extractor.getCacheStats();
    console.log("\n📊 Cache Statistics:");
    console.log(`   Files: ${cacheStats.files}`);
    console.log(`   Total Size: ${formatBytes(cacheStats.totalSize)}`);
    console.log(
      `   Last Modified: ${
        cacheStats.lastModified?.toLocaleString() || "Never"
      }`
    );

    // Demonstrate cache clearing
    console.log("\n🗑️ Clearing cache...");
    await extractor.clearCache();

    const newCacheStats = await extractor.getCacheStats();
    console.log(`   Cache cleared: ${newCacheStats.files} files remaining`);
  } catch (error) {
    console.error(
      chalk.red("❌ Cache management failed:"),
      getErrorMessage(error)
    );
  }
}

// Simulated TypeScript generation function
function triggerTypeScriptGeneration(schema: any) {
  console.log(chalk.blue("🔧 Triggering TypeScript generation..."));

  // This would be the actual type generation logic
  const pathCount = Object.keys(schema.paths).length;
  const componentCount = schema.components?.schemas
    ? Object.keys(schema.components.schemas).length
    : 0;

  console.log(`   Generated types for ${pathCount} endpoints`);
  console.log(`   Generated interfaces for ${componentCount} models`);
  console.log(chalk.green("   ✅ TypeScript generation complete"));
}

// Utility function for formatting bytes
function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

// Main execution function
async function runAllExamples() {
  console.log(chalk.bold.blue("🌾 FARM Framework Schema Integration Examples"));
  console.log(chalk.gray("=".repeat(60)));

  try {
    await basicSchemaExtraction();
    await cacheManagementExample();
    await schemaWatchingExample();
    await multiProjectExample();

    console.log(chalk.bold.green("\n🎉 All examples completed successfully!"));
    console.log(chalk.cyan("\nNext steps:"));
    console.log("1. Integrate with TypeScript generation");
    console.log("2. Add React API client generation");
    console.log("3. Setup hot reload in development server");
  } catch (error) {
    console.error(
      chalk.bold.red("\n💥 Example execution failed:"),
      getErrorMessage(error)
    );
    process.exit(1);
  }
}

// CLI integration example
export function createExampleCLI() {
  const { Command } = require("commander");
  const program = new Command();

  program
    .name("farm-schema-examples")
    .description("FARM Framework schema integration examples")
    .version("0.1.0");

  program
    .command("basic")
    .description("Run basic schema extraction example")
    .action(basicSchemaExtraction);

  program
    .command("watch")
    .description("Run schema watching example")
    .action(schemaWatchingExample);

  program
    .command("multi")
    .description("Run multi-project management example")
    .action(multiProjectExample);

  program
    .command("cache")
    .description("Run cache management example")
    .action(cacheManagementExample);

  program.command("all").description("Run all examples").action(runAllExamples);

  return program;
}

// Export everything for use in other modules
export {
  basicSchemaExtraction,
  schemaWatchingExample,
  multiProjectExample,
  cacheManagementExample,
  runAllExamples,
};

// If run directly, execute all examples
if (require.main === module) {
  runAllExamples().catch(console.error);
}
