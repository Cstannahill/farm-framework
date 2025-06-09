// tools/codegen/src/cli/generate.ts
import { Command } from "commander";
import { join } from "path";
import chalk from "chalk";
import ora from "ora";
import {
  TypeGenerationManager,
  IncrementalGenerationOptions,
} from "../generators/manager";
import { GeneratedFile } from "../generators/typescript";
import { OpenAPISchemaExtractor } from "../schema/extractor";
import { wrapError } from "@farm/cli";

interface GenerateCLIOptions {
  output?: string;
  watch?: boolean;
  force?: boolean;
  clean?: boolean;
  enumType?: "union" | "enum";
  dateType?: "string" | "Date";
  fileNaming?: "camelCase" | "kebab-case" | "PascalCase";
  noComments?: boolean;
  verbose?: boolean;
  schemaFile?: string;
  apiPath?: string;
  port?: number;
}

export function createGenerateCommand(): Command {
  const command = new Command("generate");

  command.description("Generate TypeScript types from OpenAPI schemas");

  // Main generate command
  command
    .command("types")
    .description("Generate TypeScript types from FastAPI application")
    .option("-o, --output <dir>", "Output directory", "apps/web/src/types")
    .option("-w, --watch", "Watch for changes and auto-regenerate")
    .option("-f, --force", "Force complete regeneration")
    .option("--clean", "Clean orphaned files", true)
    .option("--enum-type <type>", "Enum generation type (union|enum)", "union")
    .option("--date-type <type>", "Date type (string|Date)", "string")
    .option(
      "--file-naming <style>",
      "File naming style (camelCase|kebab-case|PascalCase)",
      "camelCase"
    )
    .option("--no-comments", "Skip generating JSDoc comments")
    .option("-v, --verbose", "Verbose output")
    .option(
      "--schema-file <file>",
      "Use existing schema file instead of extracting"
    )
    .option(
      "--api-path <path>",
      "Path to FastAPI main file",
      "apps/api/src/main.py"
    )
    .option("-p, --port <number>", "Port for schema extraction", "8001")
    .action(handleGenerateTypesCommand);

  // Watch command (alias for --watch)
  command
    .command("watch")
    .description("Watch for schema changes and auto-regenerate types")
    .option("-o, --output <dir>", "Output directory", "apps/web/src/types")
    .option("--enum-type <type>", "Enum generation type (union|enum)", "union")
    .option("--date-type <type>", "Date type (string|Date)", "string")
    .option("--file-naming <style>", "File naming style", "camelCase")
    .option("--no-comments", "Skip generating JSDoc comments")
    .option("-v, --verbose", "Verbose output")
    .option(
      "--api-path <path>",
      "Path to FastAPI main file",
      "apps/api/src/main.py"
    )
    .option("-p, --port <number>", "Port for schema extraction", "8001")
    .action((options) =>
      handleGenerateTypesCommand({ ...options, watch: true })
    );

  // Stats command
  command
    .command("stats")
    .description("Show type generation statistics")
    .option("-o, --output <dir>", "Output directory", "apps/web/src/types")
    .action(handleStatsCommand);

  // Clear command
  command
    .command("clear")
    .description("Clear generation cache and metadata")
    .option("-o, --output <dir>", "Output directory", "apps/web/src/types")
    .option("--cache", "Also clear schema cache")
    .action(handleClearCommand);

  return command;
}

/**
 * Handle types generation command
 */
async function handleGenerateTypesCommand(
  options: GenerateCLIOptions
): Promise<void> {
  const spinner = ora("Setting up type generation...").start();

  try {
    // Setup generation options
    const generationOptions: IncrementalGenerationOptions = {
      outputDir: options.output || "apps/web/src/types",
      enumType: options.enumType || "union",
      dateType: options.dateType || "string",
      fileNaming: options.fileNaming || "camelCase",
      generateComments: !options.noComments,
      cleanOrphans: options.clean !== false,
      watchForChanges: options.watch || false,
      metadataFile: join(
        options.output || "apps/web/src/types",
        ".farm/metadata/generation.json"
      ),

      onGenerated: (result) => {
        console.log(
          chalk.green(
            `✅ Generated ${result.stats.totalFiles} TypeScript files`
          )
        );
        console.log(chalk.gray(`   Interfaces: ${result.stats.interfaces}`));
        console.log(chalk.gray(`   Enums: ${result.stats.enums}`));
        console.log(chalk.gray(`   Types: ${result.stats.types}`));
      },

      onError: (error) => {
        console.error(chalk.red(`❌ Generation error: ${error.message}`));
        if (options.verbose) {
          console.error(chalk.gray(error.stack));
        }
      },
    };

    spinner.succeed("Generation setup complete");

    // Create manager
    const manager = new TypeGenerationManager(generationOptions);

    // Setup event handlers for verbose output
    if (options.verbose) {
      manager.on("generation-complete", (result) => {
        console.log(chalk.blue("\n📊 Generation Details:"));
        result.files.forEach((file: GeneratedFile) => {
          console.log(chalk.gray(`   ${file.type}: ${file.path}`));
        });
      });

      manager.on("auto-generated", (result) => {
        console.log(
          chalk.cyan(`🔄 Auto-regenerated ${result.stats.totalFiles} files`)
        );
      });

      manager.on("auto-generation-error", (error) => {
        console.error(chalk.red(`❌ Auto-generation failed: ${error.message}`));
      });
    }

    // Get schema
    let schema;
    if (options.schemaFile) {
      // Load schema from file
      spinner.start("Loading schema from file...");
      const { readFile } = await import("fs/promises");
      const schemaContent = await readFile(options.schemaFile, "utf-8");
      schema = JSON.parse(schemaContent);
      spinner.succeed(`Schema loaded from ${options.schemaFile}`);
    } else {
      // Extract schema from FastAPI
      spinner.start("Extracting schema from FastAPI...");
      const extractor = new OpenAPISchemaExtractor({
        apiPath: options.apiPath,
        port: options.port ? parseInt(options.port.toString()) : undefined,
        forceRefresh: options.force,
      });
      schema = await extractor.extractSchema();
      spinner.succeed("Schema extracted successfully");
    }

    // Generate types
    console.log(chalk.blue("🔧 Generating TypeScript types..."));

    const result = options.force
      ? await manager.forceRegeneration()
      : await manager.start(schema);

    if (options.watch) {
      console.log(
        chalk.cyan("\n👀 Watching for changes... (Press Ctrl+C to stop)")
      );

      // Handle graceful shutdown
      process.on("SIGINT", async () => {
        console.log(chalk.yellow("\n🛑 Stopping type generation watcher..."));
        await manager.stop();
        console.log(chalk.green("✅ Type generation stopped"));
        process.exit(0);
      });

      process.on("SIGTERM", async () => {
        await manager.stop();
        process.exit(0);
      });

      // Keep process alive
      await new Promise(() => {}); // Wait indefinitely
    }
  } catch (error) {
    spinner.fail("Type generation failed");
    console.error(chalk.red(wrapError(error)));

    if (options.verbose && wrapError(error).includes("stack")) {
      console.error(chalk.gray(wrapError(error) || "No stack trace available"));
    }

    process.exit(1);
  }
}

/**
 * Handle stats command
 */
async function handleStatsCommand(options: { output?: string }): Promise<void> {
  try {
    const manager = new TypeGenerationManager({
      outputDir: options.output || "apps/web/src/types",
      metadataFile: join(
        options.output || "apps/web/src/types",
        ".farm/metadata/generation.json"
      ),
    });

    const stats = manager.getStats();

    console.log(chalk.blue("📊 Type Generation Statistics"));
    console.log(chalk.gray("─".repeat(40)));
    console.log(`Total Generations: ${stats.totalGeneration}`);
    console.log(`Incremental Skips: ${stats.incrementalSkips}`);
    console.log(`Files Created: ${stats.filesCreated}`);
    console.log(`Files Updated: ${stats.filesUpdated}`);
    console.log(`Files Deleted: ${stats.filesDeleted}`);
    console.log(
      `Last Generation: ${
        stats.lastGeneration ? stats.lastGeneration.toLocaleString() : "Never"
      }`
    );
    console.log(`Average Time: ${Math.round(stats.averageGenerationTime)}ms`);
  } catch (error) {
    console.error(chalk.red("❌ Failed to get stats:", wrapError(error)));
    process.exit(1);
  }
}

/**
 * Handle clear command
 */
async function handleClearCommand(options: {
  output?: string;
  cache?: boolean;
}): Promise<void> {
  const spinner = ora("Clearing generation data...").start();

  try {
    const outputDir = options.output || "apps/web/src/types";
    const metadataFile = join(outputDir, ".farm/metadata/generation.json");

    // Clear generation metadata
    const { unlink } = await import("fs/promises");
    try {
      await unlink(metadataFile);
      spinner.text = "Generation metadata cleared";
    } catch (error) {
      // File doesn't exist, that's fine
    }

    // Clear schema cache if requested
    if (options.cache) {
      const { OpenAPISchemaExtractor } = await import("../schema/extractor");
      const extractor = new OpenAPISchemaExtractor();
      await extractor.clearCache();
      spinner.text = "Schema cache cleared";
    }

    spinner.succeed("Clear operation completed");
  } catch (error) {
    spinner.fail("Clear operation failed");
    console.error(chalk.red(wrapError(error)));
    process.exit(1);
  }
}

// Integration example function
export async function demonstrateIntegration(): Promise<void> {
  console.log(chalk.bold.blue("🔧 FARM Type Generation Integration Demo"));
  console.log(chalk.gray("=".repeat(50)));

  try {
    // 1. Extract schema
    console.log(chalk.blue("\n1. Extracting OpenAPI schema..."));
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

    // 2. Generate types
    console.log(chalk.blue("\n2. Generating TypeScript types..."));
    const manager = new TypeGenerationManager({
      outputDir: "demo-output/types",
      generateComments: true,
      enumType: "union",
      dateType: "string",

      onGenerated: (result) => {
        console.log(
          chalk.green(`   ✅ Generated ${result.stats.totalFiles} files`)
        );
      },
    });

    const result = await manager.start(schema);

    // 3. Show generated files
    console.log(chalk.blue("\n3. Generated files:"));
    result.files.forEach((file: GeneratedFile) => {
      console.log(chalk.cyan(`   ${file.type}: ${file.path}`));
    });

    // 4. Demonstrate incremental generation
    console.log(chalk.blue("\n4. Testing incremental generation..."));
    const incrementalResult = await manager.start(schema);

    if (incrementalResult.stats.totalFiles === 0) {
      console.log(chalk.yellow("   ✅ Incremental skip - no changes detected"));
    }

    // 5. Show statistics
    console.log(chalk.blue("\n5. Generation statistics:"));
    const stats = manager.getStats();
    console.log(`   Total generations: ${stats.totalGeneration}`);
    console.log(
      `   Average time: ${Math.round(stats.averageGenerationTime)}ms`
    );

    console.log(chalk.green("\n🎉 Integration demo completed successfully!"));
  } catch (error) {
    console.error(chalk.red("\n❌ Integration demo failed:"), wrapError(error));
    throw error;
  }
}

// Example usage patterns
export function showUsageExamples(): void {
  console.log(chalk.bold.blue("📖 FARM Type Generation Usage Examples"));
  console.log(chalk.gray("=".repeat(50)));

  console.log(chalk.yellow("\n1. Basic type generation:"));
  console.log(chalk.gray("   farm generate types"));

  console.log(chalk.yellow("\n2. Generate with custom output directory:"));
  console.log(
    chalk.gray("   farm generate types --output src/generated/types")
  );

  console.log(chalk.yellow("\n3. Watch mode for development:"));
  console.log(chalk.gray("   farm generate watch --verbose"));

  console.log(chalk.yellow("\n4. Force complete regeneration:"));
  console.log(chalk.gray("   farm generate types --force"));

  console.log(chalk.yellow("\n5. Custom enum and date types:"));
  console.log(
    chalk.gray("   farm generate types --enum-type enum --date-type Date")
  );

  console.log(chalk.yellow("\n6. Generate from existing schema file:"));
  console.log(chalk.gray("   farm generate types --schema-file schema.json"));

  console.log(chalk.yellow("\n7. Check generation statistics:"));
  console.log(chalk.gray("   farm generate stats"));

  console.log(chalk.yellow("\n8. Clear cache and metadata:"));
  console.log(chalk.gray("   farm generate clear --cache"));

  console.log(
    chalk.cyan(
      "\n💡 Pro tip: Use watch mode during development for automatic regeneration!"
    )
  );
}

// Advanced integration with development server
export class DevServerTypeIntegration {
  private manager?: TypeGenerationManager;

  async setupForDevServer(options: {
    outputDir: string;
    apiPath?: string;
    verbose?: boolean;
  }): Promise<void> {
    console.log(chalk.blue("🔧 Setting up type generation for dev server..."));

    this.manager = new TypeGenerationManager({
      outputDir: options.outputDir,
      watchForChanges: true,
      cleanOrphans: true,
      generateComments: true,

      onGenerated: (result) => {
        if (options.verbose) {
          console.log(
            chalk.green(`🔄 Types updated: ${result.stats.totalFiles} files`)
          );
        }
      },

      onError: (error) => {
        console.error(chalk.red(`❌ Type generation error: ${error.message}`));
      },
    });

    // Setup auto-generation events
    this.manager.on("auto-generated", (result) => {
      console.log(
        chalk.cyan(
          `🔄 Auto-generated ${result.stats.totalFiles} TypeScript files`
        )
      );
    });

    this.manager.on("auto-generation-error", (error) => {
      console.error(chalk.red(`❌ Auto-generation failed: ${error.message}`));
    });

    // Start initial generation
    await this.manager.start();

    console.log(chalk.green("✅ Type generation integrated with dev server"));
  }

  async stop(): Promise<void> {
    if (this.manager) {
      await this.manager.stop();
      this.manager = undefined;
    }
  }

  getStats() {
    return this.manager?.getStats();
  }
}

// Export for use in other modules
export { TypeGenerationManager, type IncrementalGenerationOptions };

/**
 * Handle file validation command
 */
async function handleValidateCommand(
  file: string,
  options?: GenerateCLIOptions
): Promise<void> {
  const spinner = ora(`Validating file ${file}...`).start();

  try {
    // Create manager for validation
    const manager = new TypeGenerationManager({
      outputDir: options?.output || "apps/web/src/types",
      metadataFile: join(
        options?.output || "apps/web/src/types",
        ".farm/metadata/generation.json"
      ),
    });

    // Validate the specified file
    const result = await manager.validateFile(file);

    spinner.succeed("File validation complete");

    // Output validation result
    console.log(chalk.blue("📂 Validation Result:"));
    console.log(chalk.gray("─".repeat(40)));
    console.log(`File: ${result.file}`);
    console.log(
      `Status: ${result.valid ? chalk.green("Valid") : chalk.red("Invalid")}`
    );

    if (!result.valid) {
      console.log(chalk.red("Errors:"));
      result.errors.forEach((error: string) => {
        console.error(chalk.red(`Validation error: ${error}`));
      });
    }
  } catch (error) {
    spinner.fail("File validation failed");
    console.error(chalk.red(wrapError(error)));
    process.exit(1);
  }
}
