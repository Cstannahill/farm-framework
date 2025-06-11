// packages/cli/src/utils/prompts.ts
import { input, select, checkbox, confirm } from "@inquirer/prompts";
import chalk from "chalk";
import type { CreateCommandOptions } from "../template/types.js";

export interface PromptChoice {
  name: string;
  value: string;
  description?: string;
  checked?: boolean;
}

export interface PromptQuestion {
  type: "input" | "select" | "checkbox" | "confirm";
  name: string;
  message: string;
  choices?: PromptChoice[];
  default?: any;
}

/**
 * Display the FARM welcome message
 */
export function displayWelcome(): void {
  console.log();
  console.log(chalk.green("🌾 Welcome to FARM Stack Framework!"));
  console.log(chalk.gray("   AI-first full-stack development"));
  console.log();
}

/**
 * Prompt for missing options in create command
 */
export async function promptForMissingOptions(
  options: CreateCommandOptions
): Promise<CreateCommandOptions> {
  const answers: Partial<CreateCommandOptions> = { ...options };

  // Template selection
  if (!options.template) {
    const template = await select({
      message: "What template would you like to use?",
      choices: [
        {
          name: "Basic Web App",
          value: "basic",
          description: "Simple React + FastAPI + MongoDB setup",
        },
        {
          name: "AI Chat Application",
          value: "ai-chat",
          description: "Chat interface with AI/ML capabilities",
        },
        {
          name: "AI Dashboard",
          value: "ai-dashboard",
          description: "Analytics dashboard with ML insights",
        },
        {
          name: "E-commerce Platform",
          value: "ecommerce",
          description: "Online store with payment processing",
        },
        {
          name: "Content Management System",
          value: "cms",
          description: "Blog/CMS with admin interface",
        },
        {
          name: "API Only (Backend)",
          value: "api-only",
          description: "FastAPI backend without frontend",
        },
      ],
      default: "basic",
    });
    answers.template = template as any;
  }

  // Features selection
  if (
    !options.features ||
    (Array.isArray(options.features) && options.features.length === 0)
  ) {
    const features = await checkbox({
      message:
        "Which features would you like to enable? (Press space to select)",
      choices: [
        {
          name: "Authentication & User Management",
          value: "auth",
          checked: true,
        },
        {
          name: "AI/ML Integration",
          value: "ai",
          checked: answers.template?.includes("ai") || false,
        },
        {
          name: "Real-time Features (WebSocket)",
          value: "realtime",
          checked: false,
        },
        {
          name: "Payment Processing",
          value: "payments",
          checked: answers.template === "ecommerce",
        },
        {
          name: "Email Service",
          value: "email",
          checked: false,
        },
        {
          name: "File Storage",
          value: "storage",
          checked: false,
        },
        {
          name: "Full-text Search",
          value: "search",
          checked: false,
        },
        {
          name: "Analytics",
          value: "analytics",
          checked: false,
        },
      ],
    });
    answers.features = features as any;
  }

  // Database selection
  if (!options.database) {
    const database = await select({
      message: "Which database would you like to use?",
      choices: [
        {
          name: "MongoDB (Recommended)",
          value: "mongodb",
          description: "Document database, great for rapid development",
        },
        {
          name: "PostgreSQL",
          value: "postgresql",
          description: "Powerful relational database",
        },
        {
          name: "MySQL",
          value: "mysql",
          description: "Popular relational database",
        },
        {
          name: "SQLite",
          value: "sqlite",
          description: "Lightweight database for development",
        },
      ],
      default: "mongodb",
    });
    answers.database = database as any;
  }

  // Setup options
  if (options.typescript === undefined) {
    const typescript = await confirm({
      message: "Use TypeScript?",
      default: true,
    });
    answers.typescript = typescript;
  }

  if (options.docker === undefined) {
    const docker = await confirm({
      message: "Include Docker configuration?",
      default: true,
    });
    answers.docker = docker;
  }

  if (options.testing === undefined) {
    const testing = await confirm({
      message: "Include testing setup?",
      default: true,
    });
    answers.testing = testing;
  }

  if (options.git === undefined) {
    const git = await confirm({
      message: "Initialize git repository?",
      default: true,
    });
    answers.git = git;
  }

  if (options.install === undefined) {
    const install = await confirm({
      message: "Install dependencies now?",
      default: true,
    });
    answers.install = install;
  }

  return answers as CreateCommandOptions;
}

/**
 * Legacy prompt function for backward compatibility
 */
export async function promptUser(
  questions: PromptQuestion[]
): Promise<Record<string, any>> {
  const answers: Record<string, any> = {};

  for (const question of questions) {
    try {
      switch (question.type) {
        case "input":
          answers[question.name] = await input({
            message: question.message,
            default: question.default,
          });
          break;

        case "select":
          answers[question.name] = await select({
            message: question.message,
            choices:
              question.choices?.map((choice) => ({
                name: choice.name,
                value: choice.value,
              })) || [],
            default: question.default,
          });
          break;

        case "checkbox":
          answers[question.name] = await checkbox({
            message: question.message,
            choices:
              question.choices?.map((choice) => ({
                name: choice.name,
                value: choice.value,
                checked: choice.checked || false,
              })) || [],
          });
          break;

        case "confirm":
          answers[question.name] = await confirm({
            message: question.message,
            default: question.default || false,
          });
          break;
      }
    } catch (error: any) {
      throw new Error(`Prompt failed: ${error.message}`);
    }
  }

  return answers;
}
