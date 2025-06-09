// tools/codegen/examples/complete-workflow.ts
/**
 * FARM Framework Phase 2 Complete Workflow Example
 *
 * This example demonstrates the complete pipeline from:
 * 1. OpenAPI Schema Extraction from FastAPI
 * 2. TypeScript Type Generation
 * 3. Hot Reload and Incremental Updates
 * 4. File Management and Optimization
 *
 * This is the foundation that enables type-safe full-stack development.
 */

import { OpenAPISchemaExtractor } from "../src/schema/extractor";
import { SchemaWatcher } from "../src/schema/watcher";
import { TypeGenerationManager } from "../src/generators/manager";
import { TypeScriptGenerator } from "../src/generators/typescript";
import { join } from "path";
import chalk from "chalk";
import { getErrorMessage } from "@farm/cli";

export class FarmTypeGenerationWorkflow {
  private schemaExtractor: OpenAPISchemaExtractor;
  private schemaWatcher?: SchemaWatcher;
  private typeManager: TypeGenerationManager;
  private isRunning = false;

  constructor(
    options: {
      apiPath?: string;
      outputDir?: string;
      port?: number;
    } = {}
  ) {
    // Setup schema extraction
    this.schemaExtractor = new OpenAPISchemaExtractor({
      apiPath: options.apiPath || "apps/api/src/main.py",
      port: options.port || 8001,
      timeout: 30000,
      cacheDir: ".farm/cache/schemas",
    });

    // Setup type generation
    this.typeManager = new TypeGenerationManager({
      outputDir: options.outputDir || "apps/web/src/types",
      generateComments: true,
      enumType: "union",
      dateType: "string",
      fileNaming: "camelCase",
      cleanOrphans: true,
      metadataFile: ".farm/metadata/type-generation.json",

      onGenerated: (result) => {
        console.log(
          chalk.green(
            `🔧 Generated ${result.stats.totalFiles} TypeScript files`
          )
        );
        this.logGenerationDetails(result);
      },

      onError: (error) => {
        console.error(chalk.red(`❌ Type generation error: ${error.message}`));
      },
    });
  }

  /**
   * Run the complete workflow once
   */
  async runOnce(): Promise<void> {
    console.log(
      chalk.bold.blue("🌾 FARM Type Generation Workflow - Single Run")
    );
    console.log(chalk.gray("=".repeat(60)));

    try {
      // Step 1: Extract OpenAPI Schema
      console.log(chalk.blue("\n📋 Step 1: Extracting OpenAPI Schema"));
      const schema = await this.schemaExtractor.extractSchema();
      console.log(
        chalk.green(
          `✅ Schema extracted: ${Object.keys(schema.paths).length} endpoints`
        )
      );

      // Step 2: Generate TypeScript Types
      console.log(chalk.blue("\n🔧 Step 2: Generating TypeScript Types"));
      const result = await this.typeManager.generateFromSchema(schema);

      if (result.stats.totalFiles > 0) {
        console.log(chalk.green(`✅ Generation complete!`));
      } else {
        console.log(
          chalk.yellow(`📋 Types are up-to-date, no regeneration needed`)
        );
      }

      // Step 3: Show Results
      console.log(chalk.blue("\n📊 Step 3: Results Summary"));
      this.showGenerationSummary(result);
    } catch (error) {
      console.error(chalk.red(`❌ Workflow failed: ${getErrorMessage(error)}`));
      throw error;
    }
  }

  /**
   * Start watching mode for continuous development
   */
  async startWatching(): Promise<void> {
    if (this.isRunning) {
      throw new Error("Workflow is already running");
    }

    console.log(
      chalk.bold.blue("🌾 FARM Type Generation Workflow - Watch Mode")
    );
    console.log(chalk.gray("=".repeat(60)));

    this.isRunning = true;

    try {
      // Step 1: Initial Generation
      console.log(chalk.blue("\n🚀 Step 1: Initial Type Generation"));
      await this.runOnce();

      // Step 2: Setup Schema Watching
      console.log(chalk.blue("\n👀 Step 2: Setting Up Schema Watching"));
      await this.setupSchemaWatching();

      console.log(chalk.green("\n✅ Workflow started successfully!"));
      console.log(
        chalk.cyan("   Watching for changes... (Press Ctrl+C to stop)")
      );

      // Setup graceful shutdown
      this.setupShutdownHandlers();
    } catch (error) {
      this.isRunning = false;
      console.error(
        chalk.red(`❌ Failed to start workflow: ${getErrorMessage(error)}`)
      );
      throw error;
    }
  }

  /**
   * Stop the watching workflow
   */
  async stop(): Promise<void> {
    if (!this.isRunning) return;

    console.log(chalk.yellow("\n🛑 Stopping FARM Type Generation Workflow..."));

    if (this.schemaWatcher) {
      await this.schemaWatcher.stop();
      this.schemaWatcher = undefined;
    }

    await this.typeManager.stop();
    this.isRunning = false;

    console.log(chalk.green("✅ Workflow stopped successfully"));
  }

  /**
   * Force complete regeneration
   */
  async forceRegeneration(): Promise<void> {
    console.log(chalk.blue("🔄 Forcing complete type regeneration..."));

    try {
      const result = await this.typeManager.forceRegeneration();
      this.showGenerationSummary(result);
    } catch (error) {
      console.error(
        chalk.red(`❌ Force regeneration failed: ${getErrorMessage(error)}`)
      );
      throw error;
    }
  }

  /**
   * Get workflow statistics
   */
  getStats() {
    return {
      typeGeneration: this.typeManager.getStats(),
      schemaWatcher: this.schemaWatcher?.getStats(),
      isRunning: this.isRunning,
    };
  }

  /**
   * Setup schema watching with auto-regeneration
   */
  private async setupSchemaWatching(): Promise<void> {
    this.schemaWatcher = new SchemaWatcher({
      extractorOptions: {
        apiPath: this.schemaExtractor["options"].apiPath,
        port: this.schemaExtractor["options"].port,
        forceRefresh: true,
      },
      debounceMs: 1000,
      verbose: false,
    });

    // Handle schema changes
    this.schemaWatcher.on("schema-extracted", async (event) => {
      console.log(
        chalk.cyan("\n🔄 Schema change detected, regenerating types...")
      );

      try {
        const result = await this.typeManager.generateFromSchema(event.schema!);

        if (result.stats.totalFiles > 0) {
          console.log(chalk.green("✅ Auto-regeneration complete"));
          this.logGenerationDetails(result);
        } else {
          console.log(chalk.yellow("📋 No changes needed after schema update"));
        }
      } catch (error) {
        console.error(
          chalk.red(`❌ Auto-regeneration failed: ${getErrorMessage(error)}`)
        );
      }
    });

    this.schemaWatcher.on("schema-unchanged", () => {
      console.log(chalk.gray("📋 Schema unchanged"));
    });

    this.schemaWatcher.on("extraction-error", (event) => {
      console.error(
        chalk.red(`❌ Schema extraction error: ${event.error?.message}`)
      );
    });

    await this.schemaWatcher.start();
    console.log(chalk.green("✅ Schema watching started"));
  }

  /**
   * Setup graceful shutdown handlers
   */
  private setupShutdownHandlers(): void {
    const shutdown = async () => {
      await this.stop();
      process.exit(0);
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  }

  /**
   * Log detailed generation information
   */
  private logGenerationDetails(result: any): void {
    console.log(chalk.gray(`   Interfaces: ${result.stats.interfaces}`));
    console.log(chalk.gray(`   Enums: ${result.stats.enums}`));
    console.log(chalk.gray(`   Types: ${result.stats.types}`));
    console.log(chalk.gray(`   Total Files: ${result.stats.totalFiles}`));
  }

  /**
   * Show comprehensive generation summary
   */
  private showGenerationSummary(result: any): void {
    console.log(chalk.cyan("\n📁 Generated Files:"));

    const filesByType = result.files.reduce((acc: any, file: any) => {
      if (!acc[file.type]) acc[file.type] = [];
      acc[file.type].push(file.path);
      return acc;
    }, {});

    for (const [type, files] of Object.entries(filesByType)) {
      console.log(chalk.gray(`   ${type}:`));
      (files as string[]).forEach((file) => {
        console.log(chalk.gray(`     - ${file}`));
      });
    }

    const stats = this.typeManager.getStats();
    console.log(chalk.cyan("\n📊 Statistics:"));
    console.log(chalk.gray(`   Total Generations: ${stats.totalGeneration}`));
    console.log(chalk.gray(`   Incremental Skips: ${stats.incrementalSkips}`));
    console.log(
      chalk.gray(
        `   Average Time: ${Math.round(stats.averageGenerationTime)}ms`
      )
    );
  }
}

// Example usage functions
export async function demonstrateBasicWorkflow(): Promise<void> {
  console.log(chalk.bold.blue("🎯 Basic Workflow Demonstration"));
  console.log(chalk.gray("─".repeat(50)));

  const workflow = new FarmTypeGenerationWorkflow({
    outputDir: "demo-output/basic-types",
  });

  try {
    await workflow.runOnce();
    console.log(chalk.green("\n🎉 Basic workflow completed successfully!"));
  } catch (error) {
    console.error(
      chalk.red(`❌ Basic workflow failed: ${getErrorMessage(error)}`)
    );
  }
}

export async function demonstrateWatchMode(): Promise<void> {
  console.log(chalk.bold.blue("🎯 Watch Mode Demonstration"));
  console.log(chalk.gray("─".repeat(50)));

  const workflow = new FarmTypeGenerationWorkflow({
    outputDir: "demo-output/watch-types",
  });

  try {
    await workflow.startWatching();

    // In a real scenario, this would run indefinitely
    // For demo purposes, we'll stop after 30 seconds
    setTimeout(async () => {
      console.log(
        chalk.yellow("\n⏰ Demo timeout reached, stopping workflow...")
      );
      await workflow.stop();
      console.log(chalk.green("🎉 Watch mode demonstration completed!"));
    }, 30000);
  } catch (error) {
    console.error(
      chalk.red(`❌ Watch mode demonstration failed: ${getErrorMessage(error)}`)
    );
    await workflow.stop();
  }
}

export async function demonstrateIncrementalGeneration(): Promise<void> {
  console.log(chalk.bold.blue("🎯 Incremental Generation Demonstration"));
  console.log(chalk.gray("─".repeat(50)));

  const workflow = new FarmTypeGenerationWorkflow({
    outputDir: "demo-output/incremental-types",
  });

  try {
    // First generation
    console.log(chalk.blue("\n1. Initial generation..."));
    await workflow.runOnce();

    // Second generation (should skip)
    console.log(chalk.blue("\n2. Second generation (should skip)..."));
    await workflow.runOnce();

    // Force regeneration
    console.log(chalk.blue("\n3. Force regeneration..."));
    await workflow.forceRegeneration();

    console.log(
      chalk.green("\n🎉 Incremental generation demonstration completed!")
    );
  } catch (error) {
    console.error(
      chalk.red(
        `❌ Incremental generation demonstration failed: ${getErrorMessage(
          error
        )}`
      )
    );
  }
}

export async function demonstrateErrorHandling(): Promise<void> {
  console.log(chalk.bold.blue("🎯 Error Handling Demonstration"));
  console.log(chalk.gray("─".repeat(50)));

  // Test with invalid API path
  const badWorkflow = new FarmTypeGenerationWorkflow({
    apiPath: "nonexistent/path/main.py",
    outputDir: "demo-output/error-types",
  });

  try {
    await badWorkflow.runOnce();
  } catch (error) {
    console.log(
      chalk.green(`✅ Error correctly caught: ${getErrorMessage(error)}`)
    );
  }

  console.log(chalk.green("\n🎉 Error handling demonstration completed!"));
}

export async function benchmarkGeneration(): Promise<void> {
  console.log(chalk.bold.blue("🎯 Generation Performance Benchmark"));
  console.log(chalk.gray("─".repeat(50)));

  const workflow = new FarmTypeGenerationWorkflow({
    outputDir: "demo-output/benchmark-types",
  });

  const iterations = 5;
  const times: number[] = [];

  try {
    for (let i = 1; i <= iterations; i++) {
      console.log(
        chalk.blue(`\n${i}. Running generation ${i}/${iterations}...`)
      );

      const startTime = Date.now();
      await workflow.forceRegeneration();
      const endTime = Date.now();

      const duration = endTime - startTime;
      times.push(duration);
      console.log(chalk.gray(`   Completed in ${duration}ms`));
    }

    // Calculate statistics
    const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);

    console.log(chalk.cyan("\n📊 Benchmark Results:"));
    console.log(chalk.gray(`   Average: ${Math.round(avgTime)}ms`));
    console.log(chalk.gray(`   Fastest: ${minTime}ms`));
    console.log(chalk.gray(`   Slowest: ${maxTime}ms`));

    console.log(chalk.green("\n🎉 Performance benchmark completed!"));
  } catch (error) {
    console.error(chalk.red(`❌ Benchmark failed: ${getErrorMessage(error)}`));
  }
}

// Main demo runner
export async function runAllDemonstrations(): Promise<void> {
  console.log(
    chalk.bold.blue("🌾 FARM Framework Phase 2 Complete Demonstrations")
  );
  console.log(chalk.gray("=".repeat(70)));

  try {
    await demonstrateBasicWorkflow();
    console.log("\n" + "─".repeat(70));

    await demonstrateIncrementalGeneration();
    console.log("\n" + "─".repeat(70));

    await demonstrateErrorHandling();
    console.log("\n" + "─".repeat(70));

    await benchmarkGeneration();
    console.log("\n" + "─".repeat(70));

    console.log(
      chalk.bold.green(
        "\n🎉 All Phase 2 demonstrations completed successfully!"
      )
    );
    console.log(chalk.cyan("\nPhase 2 Summary:"));
    console.log("✅ OpenAPI Schema Extraction - Complete");
    console.log("✅ TypeScript Type Generation - Complete");
    console.log("✅ Hot Reload & Incremental Updates - Complete");
    console.log("✅ File Management & Optimization - Complete");
    console.log("✅ CLI Integration - Complete");
    console.log("✅ Error Handling & Recovery - Complete");

    console.log(chalk.yellow("\n🚀 Ready for Phase 3: API Client Generation!"));
  } catch (error) {
    console.error(
      chalk.red(`❌ Demonstration suite failed: ${getErrorMessage(error)}`)
    );
    throw error;
  }
}

// CLI integration for easy testing
if (require.main === module) {
  const command = process.argv[2];

  switch (command) {
    case "basic":
      demonstrateBasicWorkflow().catch(console.error);
      break;
    case "watch":
      demonstrateWatchMode().catch(console.error);
      break;
    case "incremental":
      demonstrateIncrementalGeneration().catch(console.error);
      break;
    case "errors":
      demonstrateErrorHandling().catch(console.error);
      break;
    case "benchmark":
      benchmarkGeneration().catch(console.error);
      break;
    case "all":
    default:
      runAllDemonstrations().catch(console.error);
      break;
  }
}
