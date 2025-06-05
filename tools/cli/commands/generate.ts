// tools/cli/commands/generate.ts
import { Command } from "commander";
import { readFile } from "fs-extra";
import { join } from "path";

// Type definitions for command options
interface GenerateAllOptions {
  watch?: boolean;
  config?: string;
}

interface GenerateHooksOptions {
  schema?: string;
  output?: string;
  ai?: boolean;
}

interface GenerateTypesOptions {
  schema?: string;
  output?: string;
}

interface GenerateClientOptions {
  schema?: string;
  output?: string;
  ai?: boolean;
}

export function createGenerateCommand(): Command {
  const generate = new Command("generate")
    .alias("gen")
    .description("Generate code from API definitions");

  // Generate all (types, client, hooks)
  generate
    .command("all")
    .description("Generate all TypeScript types, API client, and React hooks")
    .option("-w, --watch", "Watch for changes and regenerate automatically")
    .option(
      "-c, --config <path>",
      "Path to configuration file",
      "./farm.config.ts"
    )
    .action(async (options: GenerateAllOptions) => {
      try {
        console.log("🏗️  Starting full code generation...");

        const configPath = options.config || "./farm.config.ts";

        // Dynamic import to avoid circular dependencies
        const { runCodeGeneration, startCodeGenerationWatcher } = await import(
          "@farm/codegen"
        );

        if (options.watch) {
          await startCodeGenerationWatcher(configPath);
        } else {
          await runCodeGeneration(configPath);
        }
      } catch (error) {
        console.error("❌ Code generation failed:", error);
        process.exit(1);
      }
    });

  // Generate hooks only
  generate
    .command("hooks")
    .description("Generate React hooks from OpenAPI schema")
    .option(
      "-s, --schema <path>",
      "Path to OpenAPI schema file",
      "./apps/web/src/schemas/openapi.json"
    )
    .option(
      "-o, --output <path>",
      "Output directory for hooks",
      "./apps/web/src/hooks"
    )
    .option("--ai", "Include AI-specific hooks")
    .action(async (options: GenerateHooksOptions) => {
      try {
        console.log("⚡ Generating React hooks...");

        const schemaPath =
          options.schema || "./apps/web/src/schemas/openapi.json";
        const outputPath = options.output || "./apps/web/src/hooks";

        // Dynamic import to avoid circular dependencies
        const { generateReactHooks } = await import("@farm/codegen");

        await generateReactHooks(schemaPath, outputPath, {
          enableAI: options.ai,
        });

        console.log("✅ React hooks generated successfully!");
      } catch (error) {
        console.error("❌ Hook generation failed:", error);
        process.exit(1);
      }
    });

  // Generate types only
  generate
    .command("types")
    .description("Generate TypeScript types from OpenAPI schema")
    .option(
      "-s, --schema <path>",
      "Path to OpenAPI schema file",
      "./apps/web/src/schemas/openapi.json"
    )
    .option(
      "-o, --output <path>",
      "Output directory for types",
      "./apps/web/src/types"
    )
    .action(async (options: GenerateTypesOptions) => {
      try {
        console.log("🔧 Generating TypeScript types...");

        const schemaPath =
          options.schema || "./apps/web/src/schemas/openapi.json";
        const outputPath = options.output || "./apps/web/src/types";

        // Dynamic import to avoid circular dependencies
        const { TypeScriptGenerator } = await import("@farm/codegen");
        const { readFile } = await import("fs-extra");

        // Read and parse the OpenAPI schema
        const schemaContent = await readFile(schemaPath, "utf-8");
        const schema = JSON.parse(schemaContent);

        // Create generator with proper constructor arguments
        const generator = new TypeScriptGenerator(schema, {
          outputDir: outputPath,
        });

        // Use the correct method name
        await generator.generateTypes();

        console.log("✅ TypeScript types generated successfully!");
      } catch (error) {
        console.error("❌ Type generation failed:", error);
        process.exit(1);
      }
    });

  // Generate API client only
  generate
    .command("client")
    .description("Generate API client from OpenAPI schema")
    .option(
      "-s, --schema <path>",
      "Path to OpenAPI schema file",
      "./apps/web/src/schemas/openapi.json"
    )
    .option(
      "-o, --output <path>",
      "Output directory for client",
      "./apps/web/src/services"
    )
    .option("--ai", "Include AI-specific client methods")
    .action(async (options: GenerateClientOptions) => {
      try {
        console.log("🌐 Generating API client...");

        const schemaPath =
          options.schema || "./apps/web/src/schemas/openapi.json";
        const outputPath = options.output || "./apps/web/src/services";

        // Dynamic import to avoid circular dependencies
        const { APIClientGenerator } = await import("@farm/codegen");

        // Create generator with proper constructor arguments
        const generator = new APIClientGenerator({
          enableAI: options.ai,
        });

        // Use the correct method signature
        await generator.generateFromSchema(schemaPath, outputPath, {
          enableAI: options.ai,
        });

        console.log("✅ API client generated successfully!");
      } catch (error) {
        console.error("❌ API client generation failed:", error);
        process.exit(1);
      }
    });

  return generate;
}

// Main CLI integration
export function registerGenerateCommands(program: Command): void {
  program.addCommand(createGenerateCommand());
}
