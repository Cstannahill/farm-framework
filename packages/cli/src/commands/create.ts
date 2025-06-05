// src/commands/create.ts
import { Command } from "commander";
import { input, select, checkbox, confirm } from "@inquirer/prompts";
import { ProjectScaffolder } from "../scaffolding/scaffolder.js";
import { TemplateRegistry } from "../template/registry.js";
import {
  TemplateContext,
  TemplateType,
  FeatureType,
  DatabaseType,
} from "../template/types.js";
import {
  validateProjectName,
  getCurrentUser,
  detectPackageManager,
} from "../utils/validation.js";
import { messages, format, styles, icons } from "../utils/styling.js";
import { getErrorMessage } from "../utils/error-utils.js";

export function createCreateCommand(): Command {
  const createCommand = new Command("create")
    .description("Create a new FARM project")
    .argument("[project-name]", "Name of the project to create")
    .option(
      "-t, --template <template>",
      "Template to use (basic, ai-chat, ai-dashboard, ecommerce, cms, api-only)"
    )
    .option(
      "-f, --features <features>",
      "Comma-separated list of features to enable"
    )
    .option(
      "-d, --database <database>",
      "Database to use (mongodb, postgresql, mysql, sqlite)"
    )
    .option("--no-typescript", "Use JavaScript instead of TypeScript")
    .option("--no-docker", "Skip Docker configuration")
    .option("--no-testing", "Skip testing setup")
    .option("--no-git", "Skip git initialization")
    .option("--no-install", "Skip dependency installation")
    .option("--no-interactive", "Skip interactive prompts and use defaults")
    .option("--author <author>", "Author name for package.json")
    .option("--description <description>", "Project description")
    .action(async (projectName: string | undefined, options: any) => {
      await handleCreateCommand(projectName, options);
    });

  return createCommand;
}

// Export the handler function for direct use
export { handleCreateCommand };

async function handleCreateCommand(
  projectName: string | undefined,
  options: any
): Promise<void> {
  try {
    console.log(messages.welcome());

    const scaffolder = new ProjectScaffolder();
    const registry = new TemplateRegistry();

    // Build context from arguments and interactive prompts
    const context = await buildProjectContext(projectName, options, registry);

    // Validate the context
    validateContext(context);

    // Generate the project
    console.log(messages.creating(context.template, context.projectName));

    const result = await scaffolder.generateProject(context);

    if (result.success) {
      console.log(messages.success("Project created successfully!"));
      printPostCreationInstructions(context, result);
    } else {
      console.log(messages.error("Project creation failed:"));
      console.log(format.errorList(result.errors));
      process.exit(1);
    }
  } catch (error) {
    console.log(messages.error(`Error: ${getErrorMessage(error)}`));
    process.exit(1);
  }
}

async function buildProjectContext(
  projectName: string | undefined,
  options: any,
  registry: TemplateRegistry
): Promise<TemplateContext> {
  let context: Partial<TemplateContext> = {
    typescript: options.typescript ?? true,
    docker: options.docker ?? true,
    testing: options.testing ?? true,
    git: options.git ?? true,
    install: options.install ?? true,
    author: options.author,
    description: options.description,
  };

  // Get project name
  if (!projectName && !options.interactive) {
    throw new Error(
      "Project name is required when running in non-interactive mode"
    );
  }

  if (!projectName) {
    projectName = await input({
      message: "What is the name of your project?",
      validate: (input: string) => {
        const validation = validateProjectName(input);
        return validation.valid || validation.error!;
      },
    });
  }

  context.projectName = projectName;

  // Get template
  if (!options.template && !options.interactive) {
    context.template = "basic"; // Default template
  } else if (!options.template) {
    const templates = registry.getAll();
    const templateChoices = templates.map((t) => ({
      name: `${t.name} - ${t.description}`,
      value: t.name,
    }));

    context.template = (await select({
      message: "Which template would you like to use?",
      choices: templateChoices,
    })) as TemplateType;
  } else {
    context.template = options.template as TemplateType;
  }

  // Get the template definition for feature suggestions
  const templateDef = registry.get(context.template!);
  if (!templateDef) {
    throw new Error(`Unknown template: ${context.template}`);
  }

  // Get features
  if (options.features) {
    context.features = options.features
      .split(",")
      .map((f: string) => f.trim()) as FeatureType[];
  } else if (!options.interactive) {
    context.features = templateDef.defaultFeatures;
  } else {
    const availableFeatures = [
      { name: "Authentication & User Management", value: "auth" },
      { name: "AI/ML Integration (Ollama + Cloud)", value: "ai" },
      { name: "Real-time Features (WebSocket)", value: "realtime" },
      { name: "Payment Processing", value: "payments" },
      { name: "Email Service", value: "email" },
      { name: "File Storage", value: "storage" },
      { name: "Full-text Search", value: "search" },
      { name: "Analytics", value: "analytics" },
    ].filter((feature) =>
      templateDef.supportedFeatures.includes(feature.value as FeatureType)
    );

    // Pre-select required and default features
    const defaultSelected = [
      ...templateDef.requiredFeatures,
      ...templateDef.defaultFeatures,
    ];

    context.features = (await checkbox({
      message: "Which features would you like to enable?",
      choices: availableFeatures.map((feature) => ({
        ...feature,
        checked: defaultSelected.includes(feature.value as FeatureType),
      })),
    })) as FeatureType[];
  }

  // Ensure required features are included
  for (const requiredFeature of templateDef.requiredFeatures) {
    if (!context.features!.includes(requiredFeature)) {
      context.features!.push(requiredFeature);
    }
  }

  // Get database
  if (options.database) {
    context.database = options.database as DatabaseType;
  } else if (!options.interactive) {
    context.database = templateDef.defaultDatabase;
  } else {
    const databaseChoices = templateDef.supportedDatabases.map((db) => ({
      name: getDatabaseDisplayName(db),
      value: db,
    }));

    context.database = (await select({
      message: "Which database would you like to use?",
      choices: databaseChoices,
      default: templateDef.defaultDatabase,
    })) as DatabaseType;
  }

  // Get additional details if not provided
  if (!context.author && !options.interactive) {
    context.author = getCurrentUser();
  } else if (!context.author) {
    context.author = await input({
      message: "Author name (optional):",
      default: getCurrentUser(),
    });
  }

  if (!context.description && !options.interactive) {
    context.description = `A FARM Stack application using ${context.template} template`;
  } else if (!context.description) {
    context.description = await input({
      message: "Project description (optional):",
      default: `A FARM Stack application using ${context.template} template`,
    });
  }

  // Confirm setup options if interactive
  if (options.interactive && options.typescript === undefined) {
    context.typescript = await confirm({
      message: "Use TypeScript?",
      default: true,
    });
  }

  if (options.interactive && options.docker === undefined) {
    context.docker = await confirm({
      message: "Include Docker configuration?",
      default: true,
    });
  }

  if (options.interactive && options.testing === undefined) {
    context.testing = await confirm({
      message: "Include testing setup?",
      default: true,
    });
  }

  if (options.interactive && options.git === undefined) {
    context.git = await confirm({
      message: "Initialize git repository?",
      default: true,
    });
  }

  if (options.interactive && options.install === undefined) {
    context.install = await confirm({
      message: "Install dependencies?",
      default: true,
    });
  }

  return context as TemplateContext;
}

function validateContext(context: TemplateContext): void {
  const validation = validateProjectName(context.projectName);
  if (!validation.valid) {
    throw new Error(validation.error!);
  }

  if (
    ![
      "basic",
      "ai-chat",
      "ai-dashboard",
      "ecommerce",
      "cms",
      "api-only",
    ].includes(context.template)
  ) {
    throw new Error(`Invalid template: ${context.template}`);
  }

  const validFeatures = [
    "auth",
    "ai",
    "realtime",
    "payments",
    "email",
    "storage",
    "search",
    "analytics",
  ];
  for (const feature of context.features) {
    if (!validFeatures.includes(feature)) {
      throw new Error(`Invalid feature: ${feature}`);
    }
  }

  if (
    !["mongodb", "postgresql", "mysql", "sqlite"].includes(context.database)
  ) {
    throw new Error(`Invalid database: ${context.database}`);
  }
}

function getDatabaseDisplayName(database: DatabaseType): string {
  const names = {
    mongodb: "MongoDB (Recommended)",
    postgresql: "PostgreSQL",
    mysql: "MySQL",
    sqlite: "SQLite",
  };
  return names[database];
}

function printPostCreationInstructions(
  context: TemplateContext,
  result: any
): void {
  console.log(
    `${icons.folder} Project created in: ${format.path(
      context.projectName + "/"
    )}`
  );
  console.log(messages.nextSteps());
  console.log(`   ${format.command(`cd ${context.projectName}`)}`);

  if (!result.installedDependencies) {
    console.log(`   ${format.command("npm install")}`);
    console.log(
      `   ${format.command("cd apps/api && pip install -r requirements.txt")}`
    );
  }

  console.log(messages.commands());
  if (context.template !== "api-only") {
    console.log(
      `   ${format.command(
        "npm run dev"
      )}          # Start full-stack development server`
    );
    console.log(
      `   ${format.command("npm run dev:web")}      # Start frontend only`
    );
    console.log(
      `   ${format.command("npm run dev:api")}      # Start backend only`
    );
  } else {
    console.log(
      `   ${format.command(
        "npm run dev:api"
      )}      # Start FastAPI development server`
    );
  }

  if (context.docker) {
    console.log(`\n${icons.docker} ${styles.subtitle("Docker commands:")}`);
    console.log(
      `   ${format.command(
        "npm run docker:up"
      )}    # Start all services with Docker`
    );
    console.log(
      `   ${format.command("npm run docker:down")}  # Stop all services`
    );
  }

  if (context.features.includes("ai")) {
    console.log(`\n${icons.gear} ${styles.subtitle("AI Features:")}`);
    console.log(
      `   ${styles.muted("•")} Ollama integration for local AI development`
    );
    console.log(
      `   ${styles.muted(
        "•"
      )} Zero-cost development with automatic model management`
    );
    console.log(
      `   ${styles.muted(
        "•"
      )} Seamless cloud deployment with OpenAI integration`
    );
    console.log(
      `   ${styles.muted("•")} Visit ${format.url(
        "http://localhost:8000/docs"
      )} for AI API documentation`
    );
  }

  console.log(messages.resources());
  console.log(
    `   ${styles.muted("•")} Frontend: ${format.url("http://localhost:3000")}`
  );
  console.log(
    `   ${styles.muted("•")} API Documentation: ${format.url(
      "http://localhost:8000/docs"
    )}`
  );
  console.log(
    `   ${styles.muted("•")} Framework Documentation: ${format.url(
      "https://github.com/your-org/farm-framework"
    )}`
  );

  if (!result.gitInitialized && context.git) {
    console.log(
      messages.warning(
        "Note: Git initialization failed, you may need to initialize manually"
      )
    );
  }

  console.log(messages.happy());
}
