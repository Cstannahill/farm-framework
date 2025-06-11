// packages/cli/src/commands/create.ts
import { Command } from "commander";
import path from "path";
import fs from "fs-extra";
import chalk from "chalk";
import { ProjectFileGenerator } from "../generators/project-file-generator.js";
import { FileGeneratorAdapter } from "../generators/file-generator-adapter.js";
import { PackageInstaller } from "../utils/package-installer.js";
import { GitInitializer } from "../utils/git-initializer.js";
import { displayWelcome, promptForMissingOptions } from "../utils/prompts.js";
import { styles, icons, messages, format } from "../utils/styling.js";
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
    .option(
      "-t, --template <template>",
      "Project template (basic, ai-chat, ai-dashboard, ecommerce, cms, api-only)"
    )
    .option(
      "-f, --features <features>",
      "Comma-separated list of features (auth, ai, realtime, payments, email, storage, search, analytics)"
    )
    .option(
      "-d, --database <database>",
      "Database type (mongodb, postgresql, mysql, sqlite)",
      "mongodb"
    )
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
    // Show welcome message if interactive mode
    if (options.interactive !== false) {
      displayWelcome();
    } // Validate project name
    if (!isValidProjectName(projectName)) {
      console.error(
        messages.error(
          "Invalid project name. Use alphanumeric characters, hyphens, and underscores only."
        )
      );
      process.exit(1);
    }

    // Check if directory already exists
    const projectPath = path.resolve(projectName);
    if (await fs.pathExists(projectPath)) {
      console.error(
        messages.error(`Directory "${projectName}" already exists.`)
      );
      process.exit(1);
    }

    // Validate and normalize options, with interactive prompts if needed
    const normalizedOptions = await validateAndNormalizeOptions(
      options,
      projectName
    );

    // Create template context
    const context = createTemplateContext(projectName, normalizedOptions); // Display configuration summary
    console.log(styles.subtitle("\n📋 Project Configuration:"));
    console.log(styles.muted("─".repeat(50)));
    console.log(styles.info(`Project Name:  ${styles.emphasis(projectName)}`));
    console.log(
      styles.info(`Template:      ${styles.emphasis(context.template)}`)
    );
    console.log(
      styles.info(
        `Database:      ${styles.emphasis(typeof context.database === "object" ? context.database.type : context.database)}`
      )
    );
    console.log(
      styles.info(
        `Features:      ${styles.emphasis(context.features.length > 0 ? context.features.join(", ") : "none")}`
      )
    );
    console.log(
      styles.info(
        `TypeScript:    ${styles.emphasis(context.typescript ? "Yes" : "No")}`
      )
    );
    console.log(
      styles.info(
        `Docker:        ${styles.emphasis(normalizedOptions.docker ? "Yes" : "No")}`
      )
    );
    console.log(
      styles.info(
        `Testing:       ${styles.emphasis(normalizedOptions.testing ? "Yes" : "No")}`
      )
    );
    console.log(
      styles.info(
        `Git:           ${styles.emphasis(normalizedOptions.git ? "Yes" : "No")}`
      )
    );
    console.log(styles.muted("─".repeat(50)));

    console.log(
      styles.brand(
        `\n🌾 Creating FARM application: ${styles.emphasis(projectName)}`
      )
    );

    // Generate project structure
    console.log(messages.step("🏗️  Generating project structure..."));
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
      console.log(messages.step("📦 Initializing git repository..."));
      const gitInitializer = new GitInitializer();
      await gitInitializer.initialize(projectPath);
    }

    // Install dependencies
    if (normalizedOptions.install) {
      console.log(messages.step("📦 Installing dependencies..."));
      const packageInstaller = new PackageInstaller();
      await packageInstaller.installAll(projectPath, {
        verbose: normalizedOptions.verbose,
      });
    }

    // Success message with next steps
    console.log(messages.success("🎉 Project created successfully!"));

    // Next steps
    const nextSteps = [
      `cd ${projectName}`,
      ...(normalizedOptions.install ? [] : ["pnpm install"]),
      "farm dev",
    ];

    console.log(styles.subtitle("\n📁 Next steps:"));
    console.log(styles.muted("─".repeat(30)));
    console.log(format.numberedList(nextSteps, "info"));

    // Resources
    const resources = {
      Documentation: "https://farm-stack.dev",
      Community: "https://discord.gg/farm-stack",
    };

    console.log(styles.subtitle("\n📚 Resources:"));
    console.log(styles.muted("─".repeat(30)));
    Object.entries(resources).forEach(([name, url]) => {
      console.log(styles.info(`   ${name}: ${styles.url(url)}`));
    });

    // Template-specific next steps
    if (context.template === "ai-chat" || context.template === "ai-dashboard") {
      console.log(styles.subtitle("\n🤖 AI Setup:"));
      console.log(styles.muted("─".repeat(30)));
      const aiSteps = [
        "Configure your AI provider in .env",
        "Install Ollama for local AI: https://ollama.ai",
        "Review AI configuration in config/ai.ts",
      ];
      console.log(format.bulletList(aiSteps, "info"));
    }

    if (context.features.includes("auth")) {
      console.log(styles.subtitle("\n🔐 Authentication:"));
      console.log(styles.muted("─".repeat(30)));
      const authSteps = [
        "Configure JWT secrets in .env",
        "Review auth settings in config/auth.ts",
        "Set up user roles and permissions",
      ];
      console.log(format.bulletList(authSteps, "info"));
    }

    if (context.features.includes("payments")) {
      console.log(styles.subtitle("\n💳 Payments:"));
      console.log(styles.muted("─".repeat(30)));
      const paymentSteps = [
        "Configure Stripe keys in .env",
        "Review payment settings in config/payments.ts",
        "Set up webhooks for payment events",
      ];
      console.log(format.bulletList(paymentSteps, "info"));
    }

    console.log();
  } catch (error) {
    console.error(
      messages.error("Project creation failed:"),
      error instanceof Error ? error.message : String(error)
    );

    if (options.verbose && error instanceof Error) {
      console.error(styles.muted("\nStack trace:"));
      console.error(styles.muted(error.stack));
    }

    process.exit(1);
  }
}

function isValidProjectName(name: string): boolean {
  return /^[a-zA-Z0-9_-]+$/.test(name);
}

async function validateAndNormalizeOptions(
  options: CreateCommandOptions,
  projectName: string
): Promise<CreateCommandOptions> {
  let normalized: CreateCommandOptions = { ...options };

  // Handle interactive mode - prompt for missing options
  if (normalized.interactive !== false) {
    normalized = await promptForMissingOptions(normalized);
  }
  // Validate template
  if (normalized.template && !isTemplateName(normalized.template)) {
    console.error(messages.error(`Invalid template: ${normalized.template}`));
    console.error(
      styles.muted(
        "Valid templates: basic, ai-chat, ai-dashboard, ecommerce, cms, api-only"
      )
    );
    process.exit(1);
  }

  // Validate database
  if (normalized.database && !isDatabaseType(normalized.database)) {
    console.error(messages.error(`Invalid database: ${normalized.database}`));
    console.error(
      styles.muted("Valid databases: mongodb, postgresql, mysql, sqlite")
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
        messages.error(`Invalid features: ${invalidFeatures.join(", ")}`)
      );
      console.error(
        styles.muted(
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
