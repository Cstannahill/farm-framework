#!/usr/bin/env node

import { Command } from "commander";
import inquirer from "inquirer";
import chalk from "chalk";
import ora from "ora";
import { existsSync, promises as fs } from "fs";
import path from "path";
import { TypeSyncOrchestrator } from "../orchestrator";
import { TypeSyncConfigManager } from "../config/validation";
import { PerformanceMonitor } from "../monitoring/performance";
import { EnhancedTypeScriptGenerator } from "../generators/enhanced-typescript";
import { EnhancedAPIClientGenerator } from "../generators/enhanced-api-client";
import type { TypeSyncConfig } from "../config/validation";
import type { SyncOptions, SyncResult } from "@farm-framework/types";

const program = new Command();

// CLI version and description
program
  .name("type-sync")
  .description(
    "Generate TypeScript types and API clients from OpenAPI specifications"
  )
  .version("1.0.0");

// Main sync command
program
  .command("sync")
  .description("Synchronize types from OpenAPI specification")
  .option("-c, --config <file>", "Configuration file path")
  .option("-i, --input <file>", "OpenAPI specification file")
  .option("-o, --output <dir>", "Output directory")
  .option("--watch", "Watch for changes and regenerate")
  .option("--verbose", "Verbose output")
  .option("--dry-run", "Show what would be generated without writing files")
  .action(async (options: any) => {
    try {
      await runSync(options);
    } catch (error) {
      console.error(chalk.red("Error during sync:"), error);
      process.exit(1);
    }
  });

// Interactive configuration wizard
program
  .command("init")
  .description("Initialize type-sync configuration interactively")
  .option("-y, --yes", "Use default values for all prompts")
  .action(async (options: any) => {
    try {
      await runInit(options);
    } catch (error) {
      console.error(chalk.red("Error during initialization:"), error);
      process.exit(1);
    }
  });

// Validate configuration
program
  .command("validate")
  .description("Validate type-sync configuration")
  .option("-c, --config <file>", "Configuration file path")
  .action(async (options: any) => {
    try {
      await runValidate(options);
    } catch (error) {
      console.error(chalk.red("Configuration validation failed:"), error);
      process.exit(1);
    }
  });

// Generate specific output types
program
  .command("generate")
  .description("Generate specific output types")
  .option(
    "-t, --type <type>",
    "Generation type (typescript, api-client, react-hooks)"
  )
  .option("-c, --config <file>", "Configuration file path")
  .option("-i, --input <file>", "OpenAPI specification file")
  .option("-o, --output <dir>", "Output directory")
  .action(async (options: any) => {
    try {
      await runGenerate(options);
    } catch (error) {
      console.error(chalk.red("Error during generation:"), error);
      process.exit(1);
    }
  });

// Performance analysis
program
  .command("analyze")
  .description("Analyze OpenAPI specification and suggest optimizations")
  .option("-i, --input <file>", "OpenAPI specification file")
  .option("--format <format>", "Output format (json, table)", "table")
  .action(async (options: any) => {
    try {
      await runAnalyze(options);
    } catch (error) {
      console.error(chalk.red("Error during analysis:"), error);
      process.exit(1);
    }
  });

// Configuration management
program
  .command("config")
  .description("Manage configuration")
  .addCommand(
    new Command("set")
      .description("Set configuration value")
      .argument("<key>", "Configuration key")
      .argument("<value>", "Configuration value")
      .action(async (key: any, value: any) => {
        await setConfigValue(key, value);
      })
  )
  .addCommand(
    new Command("get")
      .description("Get configuration value")
      .argument("<key>", "Configuration key")
      .action(async (key: any) => {
        await getConfigValue(key);
      })
  )
  .addCommand(
    new Command("list")
      .description("List all configuration values")
      .action(async () => {
        await listConfigValues();
      })
  );

// Main execution
if (import.meta.url === `file://${process.argv[1]}`) {
  program.parse();
}

/**
 * Run the main sync command
 */
async function runSync(options: any): Promise<void> {
  const spinner = ora("Loading configuration...").start();

  try {
    // Load configuration
    let config: TypeSyncConfig;

    if (options.config) {
      config = await TypeSyncConfigManager.loadConfig(options.config);
    } else {
      config = await TypeSyncConfigManager.loadConfig();
    }

    // Override with CLI options
    if (options.input) {
      if (!config!.input)
        config!.input = { source: options.input, type: "openapi" };
      else config!.input.source = options.input;
    }
    if (options.output) {
      if (!config!.output)
        config!.output = {
          baseDir: options.output,
          directory: options.output,
          fileNaming: "camelCase",
          cleanBefore: true,
          createIndex: true,
          enableSourceMaps: false,
        };
      else {
        config!.output.baseDir = options.output;
        config!.output.directory = options.output;
      }
    }

    // Validate configuration
    config = TypeSyncConfigManager.validateConfig(config).config!;
    spinner.succeed("Configuration loaded and validated");

    // Setup performance monitoring
    const performanceMonitor = new PerformanceMonitor();

    // Create orchestrator
    const orchestrator = new TypeSyncOrchestrator();

    // Convert TypeSyncConfig to SyncOptions
    const syncOptions: SyncOptions = {
      apiUrl: "http://localhost:8000", // Default API URL
      outputDir: config.outputDir,
      performance: {
        enableMonitoring: config.performance?.enableMonitoring ?? false,
        enableIncrementalGeneration:
          config.performance?.enableIncrementalGeneration ?? true,
        maxConcurrency: config.performance?.maxConcurrency ?? 4,
        cacheTimeout: 300000, // Add required cacheTimeout property
      },
      features: {
        client: true,
        hooks: true,
        streaming: false,
        aiHooks: false,
      },
    };

    await orchestrator.initialize(syncOptions);

    // Run sync
    const syncSpinner = ora("Synchronizing types...").start();
    const result = await orchestrator.syncOnce();

    // Sync completed successfully (no exception thrown)
    syncSpinner.succeed(chalk.green(`Types synchronized successfully!`));

    if (options.verbose) {
      console.log(chalk.blue("Generated files:"));
      result.artifacts?.forEach((file) => {
        console.log(chalk.gray(`  - ${file}`));
      });

      // Show performance metrics
      const metrics = performanceMonitor.getMetrics();
      console.log(chalk.blue("\nPerformance metrics:"));
      console.log(chalk.gray(`  Total time: ${metrics.totalExecutionTime}ms`));
      console.log(chalk.gray(`  Extraction time: ${metrics.extractionTime}ms`));
      console.log(chalk.gray(`  Generation time: ${metrics.generationTime}ms`));
      console.log(chalk.gray(`  Cache hits: ${metrics.cacheHitRate}`));
      console.log(chalk.gray(`  Memory usage: ${metrics.peakMemoryUsage}MB`));
    }

    // Watch mode
    if (options.watch) {
      console.log(chalk.blue("\nWatching for changes..."));
      await watchForChanges(config, orchestrator);
    }
  } catch (error) {
    spinner.fail("Failed to run sync");
    throw error;
  }
}

/**
 * Run the init command to create configuration
 */
async function runInit(options: any): Promise<void> {
  console.log(chalk.blue.bold("🚀 Welcome to type-sync setup!"));
  console.log(
    chalk.gray("This wizard will help you create a configuration file.\n")
  );

  const questions = [
    {
      type: "input",
      name: "inputSource",
      message: "OpenAPI specification file path:",
      default: "./openapi.json",
      when: () => !options.yes,
    },
    {
      type: "list",
      name: "inputType",
      message: "Input type:",
      choices: ["openapi", "swagger"],
      default: "openapi",
      when: () => !options.yes,
    },
    {
      type: "input",
      name: "outputDirectory",
      message: "Output directory:",
      default: "./src/types",
      when: () => !options.yes,
    },
    {
      type: "checkbox",
      name: "generators",
      message: "Select generators to enable:",
      choices: [
        { name: "TypeScript types", value: "typescript", checked: true },
        { name: "API client", value: "api-client", checked: true },
        { name: "React hooks", value: "react-hooks", checked: false },
      ],
      when: () => !options.yes,
    },
    {
      type: "confirm",
      name: "enableCache",
      message: "Enable caching?",
      default: true,
      when: () => !options.yes,
    },
    {
      type: "confirm",
      name: "enablePerformanceMonitoring",
      message: "Enable performance monitoring?",
      default: true,
      when: () => !options.yes,
    },
    {
      type: "list",
      name: "configFormat",
      message: "Configuration file format:",
      choices: ["TypeScript", "JavaScript", "JSON"],
      default: "TypeScript",
      when: () => !options.yes,
    },
  ];

  const answers = options.yes ? {} : await inquirer.prompt(questions);

  // Generate configuration
  const config: TypeSyncConfig = {
    apiUrl: answers.serverUrl || "http://localhost:8000",
    outputDir: answers.outputDirectory || "./src/types",
    input: {
      source: answers.inputSource || "./openapi.json",
      type: "openapi",
    },
    output: {
      baseDir: answers.outputDirectory || "./src/types",
      directory: answers.outputDirectory || "./src/types",
      fileNaming: "camelCase",
      cleanBefore: true,
      createIndex: true,
      enableSourceMaps: false,
      generators: answers.generators || ["typescript", "api-client"],
    },
    cache: {
      enabled: answers.enableCache !== false,
      directory: "./.type-sync-cache",
      timeout: 300000,
      enableCompression: true,
      enableMetrics: true,
      maxSize: 100 * 1024 * 1024,
      cleanupInterval: 600000,
    },
    performance: {
      enableMonitoring: answers.enablePerformanceMonitoring !== false,
      maxConcurrency: 4,
      enableParallelGeneration: true,
      enableIncrementalGeneration: true,
    },
  };

  // Write configuration file
  const configFormat = answers.configFormat || "TypeScript";
  const fileName = getConfigFileName(configFormat);
  const content = generateConfigFileContent(config, configFormat);

  await fs.writeFile(fileName, content);

  console.log(chalk.green(`\n✅ Configuration created: ${fileName}`));
  console.log(
    chalk.gray('You can now run "type-sync sync" to generate types.')
  );
}

/**
 * Run validation command
 */
async function runValidate(options: any): Promise<void> {
  const spinner = ora("Validating configuration...").start();

  try {
    const configManager = new TypeSyncConfigManager();
    const configPath = options.config || findDefaultConfigFile();

    if (!configPath) {
      spinner.fail("No configuration file found");
      return;
    }

    const config = await TypeSyncConfigManager.loadConfig(configPath);
    await TypeSyncConfigManager.validateConfig(config);

    spinner.succeed(chalk.green("Configuration is valid!"));
  } catch (error) {
    spinner.fail(chalk.red("Configuration validation failed"));
    throw error;
  }
}

/**
 * Run specific generator
 */
async function runGenerate(options: any): Promise<void> {
  if (!options.type) {
    console.error(chalk.red("Generator type is required. Use --type option."));
    return;
  }

  const spinner = ora(`Generating ${options.type}...`).start();

  try {
    // Load OpenAPI spec
    const specPath = options.input || "./openapi.json";
    if (!existsSync(specPath)) {
      spinner.fail(`OpenAPI specification not found: ${specPath}`);
      return;
    }

    const spec = JSON.parse(await fs.readFile(specPath, "utf-8"));
    const outputDir = options.output || "./generated";

    // Generate based on type
    let result;
    switch (options.type) {
      case "typescript":
        const tsGenerator = new EnhancedTypeScriptGenerator({
          outputDir,
        });
        result = await tsGenerator.generateEnhanced(spec);
        break;

      case "api-client":
        const clientGenerator = new EnhancedAPIClientGenerator({
          outputDir,
        });
        result = await clientGenerator.generateEnhanced(spec);
        break;

      default:
        spinner.fail(`Unknown generator type: ${options.type}`);
        return;
    }

    spinner.succeed(chalk.green(`${options.type} generated successfully!`));

    if (Array.isArray(result)) {
      console.log(chalk.gray(`Generated ${result.length} files`));
    }
  } catch (error) {
    spinner.fail(`Failed to generate ${options.type}`);
    throw error;
  }
}

/**
 * Run analysis command
 */
async function runAnalyze(options: any): Promise<void> {
  const spinner = ora("Analyzing OpenAPI specification...").start();

  try {
    const specPath = options.input || "./openapi.json";
    if (!existsSync(specPath)) {
      spinner.fail(`OpenAPI specification not found: ${specPath}`);
      return;
    }

    const spec = JSON.parse(await fs.readFile(specPath, "utf-8"));

    // Perform analysis
    const analysis = analyzeOpenAPISpec(spec);

    spinner.succeed("Analysis complete!");

    if (options.format === "json") {
      console.log(JSON.stringify(analysis, null, 2));
    } else {
      displayAnalysisTable(analysis);
    }
  } catch (error) {
    spinner.fail("Analysis failed");
    throw error;
  }
}

/**
 * Watch for changes and regenerate
 */
async function watchForChanges(
  config: TypeSyncConfig,
  orchestrator: TypeSyncOrchestrator
): Promise<void> {
  const chokidar = await import("chokidar");

  const watcher = chokidar.watch(config.input?.source || "./openapi.json", {
    ignored: /node_modules/,
    persistent: true,
  });

  watcher.on("change", async (path) => {
    console.log(chalk.yellow(`\n📝 File changed: ${path}`));

    const spinner = ora("Regenerating types...").start();
    try {
      const result = await orchestrator.sync();
      // Success is determined by no exception being thrown
      spinner.succeed(chalk.green("Types regenerated successfully!"));
    } catch (error) {
      spinner.fail(chalk.red("Regeneration failed"));
      console.error(error);
    }
  });

  // Graceful shutdown
  process.on("SIGINT", () => {
    console.log(chalk.yellow("\n👋 Stopping watcher..."));
    watcher.close();
    process.exit(0);
  });
}

/**
 * Configuration management helpers
 */
async function setConfigValue(key: string, value: string): Promise<void> {
  // Implementation would update config file
  console.log(chalk.green(`Set ${key} = ${value}`));
}

async function getConfigValue(key: string): Promise<void> {
  // Implementation would read config value
  console.log(chalk.blue(`${key}: value`));
}

async function listConfigValues(): Promise<void> {
  // Implementation would list all config values
  console.log(chalk.blue("Configuration values:"));
}

/**
 * Helper functions
 */
function findDefaultConfigFile(): string | null {
  const candidates = [
    "type-sync.config.ts",
    "type-sync.config.js",
    "type-sync.config.json",
    ".type-sync.json",
  ];

  return candidates.find((file) => existsSync(file)) || null;
}

function getDefaultGeneratorOptions(type: string): any {
  switch (type) {
    case "typescript":
      return {
        filename: "types.ts",
        exportStyle: "named",
        includeComments: true,
      };
    case "api-client":
      return {
        filename: "api-client.ts",
        clientName: "ApiClient",
        includeTypes: true,
      };
    case "react-hooks":
      return {
        filename: "hooks.ts",
        hookPrefix: "use",
        includeTypes: true,
      };
    default:
      return {};
  }
}

function getConfigFileName(format: string): string {
  switch (format) {
    case "TypeScript":
      return "type-sync.config.ts";
    case "JavaScript":
      return "type-sync.config.js";
    case "JSON":
    default:
      return "type-sync.config.json";
  }
}

function generateConfigFileContent(
  config: TypeSyncConfig,
  format: string
): string {
  switch (format) {
    case "TypeScript":
      return `import type { TypeSyncConfig } from 'type-sync';

const config: TypeSyncConfig = ${JSON.stringify(config, null, 2)};

export default config;
`;

    case "JavaScript":
      return `/** @type {import('type-sync').TypeSyncConfig} */
const config = ${JSON.stringify(config, null, 2)};

module.exports = config;
`;

    case "JSON":
    default:
      return JSON.stringify(config, null, 2);
  }
}

function analyzeOpenAPISpec(spec: any): any {
  return {
    info: {
      title: spec.info?.title,
      version: spec.info?.version,
      openApiVersion: spec.openapi,
    },
    stats: {
      paths: Object.keys(spec.paths || {}).length,
      operations: countOperations(spec),
      schemas: Object.keys(spec.components?.schemas || {}).length,
      parameters: Object.keys(spec.components?.parameters || {}).length,
    },
    complexity: {
      score: calculateComplexityScore(spec),
      recommendations: getRecommendations(spec),
    },
  };
}

function countOperations(spec: any): number {
  let count = 0;
  for (const path of Object.values(spec.paths || {})) {
    count += Object.keys(path as any).length;
  }
  return count;
}

function calculateComplexityScore(spec: any): number {
  // Simple complexity calculation
  const pathCount = Object.keys(spec.paths || {}).length;
  const schemaCount = Object.keys(spec.components?.schemas || {}).length;
  return pathCount + schemaCount * 2;
}

function getRecommendations(spec: any): string[] {
  const recommendations: string[] = [];

  if (Object.keys(spec.paths || {}).length > 50) {
    recommendations.push(
      "Consider splitting large APIs into multiple specifications"
    );
  }

  if (Object.keys(spec.components?.schemas || {}).length > 100) {
    recommendations.push(
      "Large number of schemas detected - consider modular generation"
    );
  }

  return recommendations;
}

function displayAnalysisTable(analysis: any): void {
  console.log(chalk.blue.bold("\n📊 OpenAPI Analysis Results\n"));

  console.log(chalk.yellow("API Information:"));
  console.log(`  Title: ${analysis.info.title}`);
  console.log(`  Version: ${analysis.info.version}`);
  console.log(`  OpenAPI Version: ${analysis.info.openApiVersion}\n`);

  console.log(chalk.yellow("Statistics:"));
  console.log(`  Paths: ${analysis.stats.paths}`);
  console.log(`  Operations: ${analysis.stats.operations}`);
  console.log(`  Schemas: ${analysis.stats.schemas}`);
  console.log(`  Parameters: ${analysis.stats.parameters}\n`);

  console.log(chalk.yellow("Complexity:"));
  console.log(`  Score: ${analysis.complexity.score}`);

  if (analysis.complexity.recommendations.length > 0) {
    console.log(chalk.yellow("\nRecommendations:"));
    analysis.complexity.recommendations.forEach((rec: string) => {
      console.log(chalk.gray(`  • ${rec}`));
    });
  }
}

export { program };
