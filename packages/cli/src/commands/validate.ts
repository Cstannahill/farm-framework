// packages/cli/src/commands/validate.ts
import { Command } from "commander";
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
  // Import and run validation directly instead of spawning a new process
  const { validateTemplate } = await import("../template/validator");

  if (command === "validate") {
    const template = options.template || "base";
    console.log(chalk.green(`✅ Validating template: ${template}`));

    try {
      await validateTemplate(template, {
        strict: options.verbose || false,
        checkPerformance: true,
        checkBestPractices: true,
      });
      console.log(chalk.green("✅ Template validation completed successfully!"));
    } catch (error: any) {
      console.error(chalk.red("❌ Template validation failed:"), error.message);
      throw error;
    }
  } else {
    console.log(chalk.yellow(`⚠️  Command '${command}' not yet implemented`));
  }
}
