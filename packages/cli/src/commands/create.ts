// packages/cli/src/commands/create.ts
import { Command } from "commander";
import path from "path";
import fs from "fs-extra";
import chalk from "chalk";
import { ProjectFileGenerator } from "../generators/project-file-generator.js";
import { FileGeneratorAdapter } from "../generators/file-generator-adapter.js";
import { PackageInstaller } from "../utils/package-installer.js";
import { GitInitializer } from "../utils/git-initializer.js";
import {
  createTemplateContext,
  type CreateCommandOptions,
  type TemplateName,
  type FeatureName,
  type DatabaseType,
  isTemplateName,
  isFeatureName,
  isDatabaseType,
} from "../template/types.js";

export function createCreateCommand(): Command {
  const createCmd = new Command("create");

  createCmd
    .description("Create a new FARM application")
    .argument("<project-name>", "Name of the project")
    .option("-t, --template <template>", "Project template", "basic")
    .option("-f, --features <features>", "Comma-separated list of features")
    .option("-d, --database <database>", "Database type", "mongodb")
    .option("--no-typescript", "Disable TypeScript")
    .option("--no-docker", "Disable Docker configuration")
    .option("--no-testing", "Disable testing setup")
    .option("--no-git", "Skip git initialization")
    .option("--no-install", "Skip dependency installation")
    .option("--no-interactive", "Skip interactive prompts")
    .option("-v, --verbose", "Verbose output")
    .action(createProject);

  return createCmd;
}

async function createProject(
  projectName: string,
  options: CreateCommandOptions
): Promise<void> {
  try {
    // Validate project name
    if (!isValidProjectName(projectName)) {
      console.error(
        chalk.red(
          "❌ Invalid project name. Use alphanumeric characters, hyphens, and underscores only."
        )
      );
      process.exit(1);
    }

    // Validate and normalize options
    const normalizedOptions = await validateAndNormalizeOptions(
      options,
      projectName
    );

    // Check if directory already exists
    const projectPath = path.resolve(projectName);
    if (await fs.pathExists(projectPath)) {
      console.error(chalk.red(`❌ Directory "${projectName}" already exists.`));
      process.exit(1);
    }

    // Create template context
    const context = createTemplateContext(projectName, normalizedOptions);

    // Log configuration if verbose
    if (normalizedOptions.verbose) {
      console.log(chalk.blue("ℹ️  📋 Configuration:"));
      console.log(chalk.blue(`ℹ️     Template: ${context.template}`));
      console.log(
        chalk.blue(
          `ℹ️     Database: ${typeof context.database === "object" ? context.database.type : context.database}`
        )
      );
      console.log(
        chalk.blue(
          `ℹ️     Features: ${context.features.length > 0 ? context.features.join(", ") : "none"}`
        )
      );
      console.log(
        chalk.blue(`ℹ️     TypeScript: ${context.typescript ? "Yes" : "No"}`)
      );
      console.log(chalk.blue("ℹ️"));
    }

    console.log(chalk.blue(`ℹ️  🌾 Creating FARM application: ${projectName}`));

    // Generate project structure
    console.log(chalk.blue("ℹ️  🏗️  Generating project structure..."));
    const projectGenerator = new ProjectFileGenerator();
    const adapter = new FileGeneratorAdapter(projectGenerator as any);
    // Pass a dummy template definition for new generator signature compatibility
    const dummyTemplate = {
      name: context.template,
      description: "",
      features: context.features,
      structure: { files: [], directories: [] },
      dependencies: {},
      prompts: [],
    };
    await adapter.generate(projectPath, context, dummyTemplate);

    // Initialize git repository
    if (normalizedOptions.git) {
      console.log(chalk.blue("ℹ️  📦 Initializing git repository..."));
      const gitInitializer = new GitInitializer();
      await gitInitializer.initialize(projectPath);
    }

    // Install dependencies
    if (normalizedOptions.install) {
      console.log(chalk.blue("ℹ️  📦 Installing dependencies..."));
      const packageInstaller = new PackageInstaller();
      await packageInstaller.installAll(projectPath, {
        verbose: normalizedOptions.verbose,
      });
    }

    // Success message
    console.log(chalk.green("\n🎉 Project created successfully!\n"));
    console.log(chalk.blue("📁 Next steps:"));
    console.log(chalk.blue(`   cd ${projectName}`));

    if (!normalizedOptions.install) {
      console.log(chalk.blue("   pnpm install"));
    }

    console.log(chalk.blue("   farm dev"));
    console.log(chalk.blue("\n📚 Documentation: https://farm-stack.dev"));
    console.log(chalk.blue("💬 Community: https://discord.gg/farm-stack\n"));
  } catch (error) {
    console.error(
      chalk.red("❌ Project creation failed:"),
      error instanceof Error ? error.message : String(error)
    );

    if (options.verbose && error instanceof Error) {
      console.error(chalk.gray("\nStack trace:"));
      console.error(chalk.gray(error.stack));
    }

    process.exit(1);
  }
}

function isValidProjectName(name: string): boolean {
  // Allow alphanumeric characters, hyphens, underscores, and dots
  // Must start with a letter or number
  const regex = /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/;
  return regex.test(name) && name.length <= 214; // npm package name limit
}

async function validateAndNormalizeOptions(
  options: CreateCommandOptions,
  projectName: string
): Promise<CreateCommandOptions> {
  const normalized: CreateCommandOptions = { ...options };

  // Handle interactive mode
  if (normalized.interactive !== false) {
    // TODO: Implement interactive prompts
    // For now, we'll use the provided options or defaults
  }

  // Validate template
  if (normalized.template && !isTemplateName(normalized.template)) {
    console.error(chalk.red(`❌ Invalid template: ${normalized.template}`));
    console.error(
      chalk.gray(
        "Valid templates: basic, ai-chat, ai-dashboard, ecommerce, cms, api-only"
      )
    );
    process.exit(1);
  }

  // Validate database
  if (normalized.database && !isDatabaseType(normalized.database)) {
    console.error(chalk.red(`❌ Invalid database: ${normalized.database}`));
    console.error(
      chalk.gray("Valid databases: mongodb, postgresql, mysql, sqlite")
    );
    process.exit(1);
  }

  // Parse and validate features
  if (
    typeof normalized.features === "string" &&
    (normalized.features as string).length > 0
  ) {
    const featureList = (normalized.features as string)
      .split(",")
      .map((f: string) => f.trim());
    const invalidFeatures = featureList.filter(
      (f: string) => !isFeatureName(f)
    );

    if (invalidFeatures.length > 0) {
      console.error(
        chalk.red(`❌ Invalid features: ${invalidFeatures.join(", ")}`)
      );
      console.error(
        chalk.gray(
          "Valid features: auth, ai, realtime, payments, email, storage, search, analytics"
        )
      );
      process.exit(1);
    }

    normalized.features = featureList as FeatureName[];
  }

  // Auto-enable AI feature for AI templates
  if (normalized.template?.includes("ai") && normalized.features) {
    if (!normalized.features.includes("ai")) {
      normalized.features.push("ai");
    }
  }

  // Auto-enable auth for ecommerce
  if (normalized.template === "ecommerce" && normalized.features) {
    if (!normalized.features.includes("auth")) {
      normalized.features.push("auth");
    }
    if (!normalized.features.includes("payments")) {
      normalized.features.push("payments");
    }
  }

  return normalized;
}

export { createProject };
