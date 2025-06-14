// packages/cli/src/commands/generate.ts
import { Command } from "commander";
import chalk from "chalk";
import {
  CodegenOrchestrator,
  type CodegenOptions,
  type SyncOptions,
} from "@farm-framework/core";
import { performance } from "perf_hooks";
import type { GenerateCommandOptions } from "@farm-framework/types";

// Mock logger for now
const logger = {
  info: (message: string, ...args: any[]) =>
    console.log(chalk.blue(message), ...args),
  success: (message: string, ...args: any[]) =>
    console.log(chalk.green(message), ...args),
  warn: (message: string, ...args: any[]) =>
    console.warn(chalk.yellow(message), ...args),
  error: (message: string, ...args: any[]) =>
    console.error(chalk.red(message), ...args),
};

export function createGenerateCommand(): Command {
  const generateCmd = new Command("generate");
  generateCmd.alias("g");
  generateCmd.description("Generate code and components");

  // Add subcommands
  generateCmd.addCommand(createGenerateTypesCommand());
  generateCmd.addCommand(createGenerateModelCommand());
  generateCmd.addCommand(createGeneratePageCommand());
  generateCmd.addCommand(createGenerateApiCommand());

  return generateCmd;
}

function createGenerateTypesCommand(): Command {
  return new Command("types")
    .description(
      "Generate TypeScript types, API clients, and hooks from OpenAPI schema"
    )
    .option("--client", "Generate API client only")
    .option("--hooks", "Generate React hooks only")
    .option("--ai-hooks", "Generate AI hooks only")
    .option("--types", "Generate TypeScript types only")
    .option("--no-cache", "Skip cache and regenerate all files")
    .option("--dry-run", "Show what would be generated without creating files")
    .option("-w, --watch", "Watch for changes and auto-regenerate")
    .option("-v, --verbose", "Enable verbose output with performance metrics")
    .option("--profile", "Enable detailed performance profiling")
    .option(
      "--output <path>",
      "Custom output directory",
      ".farm/types/generated"
    )
    .option("--api-url <url>", "FastAPI server URL", "http://localhost:8000")
    .action(async (options) => {
      await generateTypes(options);
    });
}

function createGenerateModelCommand(): Command {
  return new Command("model")
    .description("Generate a new model")
    .argument("<name>", "Name of the model")
    .option("--fields <fields>", "Model fields (comma-separated)")
    .option("--crud", "Generate CRUD operations")
    .option("-v, --verbose", "Enable verbose logging")
    .action(async (name: string, options: GenerateCommandOptions) => {
      await generateModel(name, options);
    });
}

function createGeneratePageCommand(): Command {
  return new Command("page")
    .description("Generate a new page")
    .argument("<name>", "Name of the page")
    .option("--crud", "Generate CRUD operations")
    .option("-v, --verbose", "Enable verbose logging")
    .action(async (name: string, options: GenerateCommandOptions) => {
      await generatePage(name, options);
    });
}

function createGenerateApiCommand(): Command {
  return new Command("api")
    .description("Generate API endpoints")
    .argument("<name>", "Name of the API")
    .option("--methods <methods>", "HTTP methods (comma-separated)")
    .option("-v, --verbose", "Enable verbose logging")
    .action(async (name: string, options: GenerateCommandOptions) => {
      await generateApi(name, options);
    });
}

async function generateTypes(options: any): Promise<void> {
  const startTime = performance.now();

  try {
    logger.info("🔄 Initializing type generation...");

    const orchestrator = new CodegenOrchestrator();

    // Determine what to generate based on options
    const features = {
      client:
        !options.hooks && !options.aiHooks && !options.types
          ? true
          : Boolean(options.client),
      hooks:
        !options.client && !options.aiHooks && !options.types
          ? true
          : Boolean(options.hooks),
      streaming: true,
      aiHooks:
        !options.client && !options.hooks && !options.types
          ? true
          : Boolean(options.aiHooks),
    };

    // If specific type generation requested, only do types
    if (options.types) {
      features.client = false;
      features.hooks = false;
      features.aiHooks = false;
    }

    const config: SyncOptions = {
      apiUrl: options.apiUrl,
      outputDir: options.output,
      features,
      performance: {
        enableMonitoring: options.verbose || options.profile,
        enableIncrementalGeneration: !options.noCache,
        maxConcurrency: 4,
        cacheTimeout: options.noCache ? 0 : 300000,
      },
    };

    // Setup progress reporting
    const progressCallback = (progress: any) => {
      if (options.verbose) {
        logger.info(
          `[${progress.stage.toUpperCase()}] ${progress.message} (${progress.progress}%)`
        );
      }
    };

    await orchestrator.initialize({
      ...config,
      verbose: options.verbose,
      dryRun: options.dryRun,
      profile: options.profile,
      progressCallback,
    } as CodegenOptions);

    if (options.watch) {
      logger.info("🔄 Starting watch mode for type generation...");
      logger.info(`   API URL: ${config.apiUrl}`);
      logger.info(`   Output: ${config.outputDir}`);
      logger.info(
        `   Features: ${Object.entries(features)
          .filter(([, enabled]) => enabled)
          .map(([name]) => name)
          .join(", ")}`
      );
      logger.info("   Press Ctrl+C to stop\n");

      await orchestrator.run({ watch: true });
    } else {
      const result = await orchestrator.run({ dryRun: options.dryRun });

      const totalTime = performance.now() - startTime;
      const timeStr =
        totalTime > 1000
          ? `${(totalTime / 1000).toFixed(2)}s`
          : `${Math.round(totalTime)}ms`;

      if (options.dryRun) {
        logger.warn(`🔍 Dry run completed in ${timeStr}`);
        logger.info(`   Would generate ${result.filesGenerated} files`);
      } else {
        logger.success(
          `✅ Generated ${result.filesGenerated} files in ${timeStr}`
        );

        if (result.fromCache) {
          logger.info("   (loaded from cache)");
        }
      }

      // Show artifacts if verbose
      if (options.verbose && result.artifacts) {
        logger.info("\n📁 Generated files:");
        for (const artifact of result.artifacts) {
          console.log(`   ${artifact}`);
        }
      }

      // Show performance details if profiling
      if (options.profile && result.performance) {
        logger.info("\n📊 Performance Profile:");
        console.log(
          `   Extraction: ${Math.round(result.performance.extractionTime)}ms`
        );
        console.log(
          `   Generation: ${Math.round(result.performance.generationTime)}ms`
        );
        console.log(
          `   Caching: ${Math.round(result.performance.cacheTime)}ms`
        );
        console.log(`   Parallel jobs: ${result.performance.parallelJobs}`);
      }
    }
  } catch (error) {
    logger.error("❌ Type generation failed:");
    if (options.verbose) {
      logger.error(
        error instanceof Error ? error.stack || error.message : String(error)
      );
    } else {
      logger.error(error instanceof Error ? error.message : String(error));
      logger.info("   Use --verbose for detailed error information");
    }

    // Suggest common fixes
    logger.warn("\n💡 Common solutions:");
    console.log("   • Ensure FastAPI server is running on the specified URL");
    console.log("   • Check that the API endpoints are accessible");
    console.log("   • Verify output directory permissions");
    console.log("   • Try clearing the cache with --no-cache");

    process.exit(1);
  }
}

async function generateModel(
  name: string,
  options: GenerateCommandOptions
): Promise<void> {
  try {
    logger.info(`Generating model: ${name}`);

    // TODO: Implement model generation (Phase 2)
    logger.warn("Model generation not implemented yet");

    if (options.fields) {
      logger.info(`Fields: ${options.fields}`);
    }

    if (options.crud) {
      logger.info("CRUD operations enabled");
    }

    logger.info(`This will generate a model named ${name}`);
    logger.success("✅ Model generation completed!");
  } catch (error) {
    logger.error("❌ Model generation failed:", error);
    process.exit(1);
  }
}

async function generatePage(
  name: string,
  options: GenerateCommandOptions
): Promise<void> {
  try {
    logger.info(`Generating page: ${name}`);

    // TODO: Implement page generation (Phase 2)
    logger.warn("Page generation not implemented yet");

    if (options.crud) {
      logger.info("CRUD operations enabled");
    }

    logger.info(`This will generate a page named ${name}`);
    logger.success("✅ Page generation completed!");
  } catch (error) {
    logger.error("❌ Page generation failed:", error);
    process.exit(1);
  }
}

async function generateApi(
  name: string,
  options: GenerateCommandOptions
): Promise<void> {
  try {
    logger.info(`Generating API: ${name}`);

    // TODO: Implement API generation (Phase 2)
    logger.warn("API generation not implemented yet");

    if (options.methods) {
      logger.info(`Methods: ${options.methods}`);
    }

    logger.info(`This will generate an API named ${name}`);
    logger.success("✅ API generation completed!");
  } catch (error) {
    logger.error("❌ API generation failed:", error);
    process.exit(1);
  }
}
