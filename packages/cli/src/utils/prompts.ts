// packages/cli/src/utils/prompts.ts
import inquirer from "inquirer";
import { input, select, checkbox, confirm } from "@inquirer/prompts";
import type { CreateOptions } from "../commands/create.js";

export interface PromptChoice {
  name: string;
  value: string;
  checked?: boolean;
}

export interface PromptQuestion {
  type: "input" | "select" | "checkbox" | "confirm";
  name: string;
  message: string;
  choices?: PromptChoice[];
  default?: any;
}

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

// export async function promptForMissingOptions(
//   options: CreateOptions,
//   currentFeatures: string[]
// ): Promise<CreateOptions & { features: string[] }> {
//   const questions = [];

//   // Template selection
//   if (!options.template) {
//     questions.push({
//       type: "list",
//       name: "template",
//       message: "What template would you like to use?",
//       choices: [
//         { name: "Basic Web App", value: "basic" },
//         { name: "AI Chat Application", value: "ai-chat" },
//         { name: "AI Dashboard", value: "ai-dashboard" },
//         { name: "E-commerce Platform", value: "ecommerce" },
//         { name: "Content Management System", value: "cms" },
//         { name: "API Only (Backend)", value: "api-only" },
//       ],
//       default: "basic",
//     });
//   }

//   // Features selection
//   if (!options.features || currentFeatures.length === 0) {
//     questions.push({
//       type: "checkbox",
//       name: "features",
//       message: "Which features would you like to enable?",
//       choices: [
//         {
//           name: "Authentication & User Management",
//           value: "auth",
//           checked: true,
//         },
//         { name: "AI/ML Integration", value: "ai", checked: true },
//         { name: "Real-time Features (WebSocket)", value: "realtime" },
//         { name: "Payment Processing", value: "payments" },
//         { name: "Email Service", value: "email" },
//         { name: "File Storage", value: "storage" },
//         { name: "Full-text Search", value: "search" },
//         { name: "Analytics", value: "analytics" },
//       ],
//     });
//   }

//   // Database selection
//   if (!options.database) {
//     questions.push({
//       type: "list",
//       name: "database",
//       message: "Which database would you like to use?",
//       choices: [
//         { name: "MongoDB (Recommended)", value: "mongodb" },
//         { name: "PostgreSQL", value: "postgresql" },
//         { name: "MySQL", value: "mysql" },
//         { name: "SQLite", value: "sqlite" },
//       ],
//       default: "mongodb",
//     });
//   }

//   // Setup options
//   if (options.typescript === undefined) {
//     questions.push({
//       type: "confirm",
//       name: "typescript",
//       message: "Use TypeScript?",
//       default: true,
//     });
//   }

//   if (options.docker === undefined) {
//     questions.push({
//       type: "confirm",
//       name: "docker",
//       message: "Include Docker configuration?",
//       default: true,
//     });
//   }

//   if (options.testing === undefined) {
//     questions.push({
//       type: "confirm",
//       name: "testing",
//       message: "Include testing setup?",
//       default: true,
//     });
//   }

//   if (options.git === undefined) {
//     questions.push({
//       type: "confirm",
//       name: "git",
//       message: "Initialize git repository?",
//       default: true,
//     });
//   }

//   if (options.install === undefined) {
//     questions.push({
//       type: "confirm",
//       name: "install",
//       message: "Install dependencies?",
//       default: true,
//     });
//   }

//   if (questions.length === 0) {
//     return { ...options, features: currentFeatures };
//   }

//   const answers = await inquirer.prompt(questions);

//   return {
//     ...options,
//     ...answers,
//     features: answers.features || currentFeatures,
//   };
// }
