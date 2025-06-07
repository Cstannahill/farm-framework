// packages/cli/src/commands/validate.ts
import { Command } from "commander";
import { spawn } from "child_process";
import path from "path";
import chalk from "chalk";

export function createValidateCommands(): Command {
  const validate = new Command("validate");
  validate.description("Validate FARM templates and configurations");

  // Main validate command
  validate
    .argument("[template]", "Template to validate (optional)")
    .option("-c, --config <config>", "Specific configuration to test")
    .option("--skip-ai", "Skip AI provider tests")
    .option("--parallel", "Run validations in parallel")
    .option("-v, --verbose", "Verbose output")
    .action(async (template, options) => {
      console.log(chalk.blue("🧪 Running FARM template validation...\n"));

      try {
        await runValidator("validate", { template, ...options });
      } catch (error: any) {
        console.error(
          chalk.red("❌ Validation failed:"),
          (error as Error).message
        );
        process.exit(1);
      }
    });

  // Provider testing subcommand
  validate
    .command("providers")
    .description("Test AI provider connectivity")
    .option("-p, --provider <provider>", "Test specific provider")
    .action(async (options) => {
      console.log(chalk.blue("🤖 Testing AI provider connectivity...\n"));

      try {
        await runValidator("test-providers", options);
      } catch (error: any) {
        console.error(
          chalk.red("❌ Provider test failed:"),
          (error as Error).message
        );
        process.exit(1);
      }
    });

  // Performance benchmarking
  validate
    .command("performance")
    .description("Run performance benchmarks")
    .option("-t, --template <template>", "Template to benchmark")
    .action(async (options) => {
      console.log(chalk.blue("⚡ Running performance benchmarks...\n"));

      try {
        await runValidator("benchmark", options);
      } catch (error: any) {
        console.error(
          chalk.red("❌ Benchmark failed:"),
          (error as Error).message
        );
        process.exit(1);
      }
    });

  return validate;
}

async function runValidator(command: string, options: any): Promise<void> {
  const validatorPath = path.join(
    __dirname,
    "../../../tools/template-validator/dist/cli.js"
  );

  const args = [validatorPath, command];

  // Add options as arguments
  Object.entries(options).forEach(([key, value]) => {
    if (value === true) {
      args.push(`--${key}`);
    } else if (value && value !== false) {
      args.push(`--${key}`, value.toString());
    }
  });

  return new Promise((resolve, reject) => {
    const childProcess = spawn("node", args, {
      stdio: "inherit",
      env: { ...process.env },
    });

    childProcess.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Validation process exited with code ${code}`));
      }
    });

    childProcess.on("error", reject);
  });
}
