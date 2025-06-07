// tools/template-validator/src/cli.ts
import { Command } from "commander";
import { TemplateValidator } from "./validator";
import { ALL_CONFIGURATIONS } from "./configurations";

const program = new Command();

program
  .name("farm-template-validator")
  .description("Validate FARM templates")
  .version("1.0.0");

program
  .command("validate")
  .description("Validate all templates")
  .option("-t, --template <template>", "Validate specific template")
  .option("-c, --config <config>", "Validate specific configuration")
  .option("--skip-ai", "Skip AI provider tests")
  .option("--parallel", "Run validations in parallel")
  .action(async (options) => {
    const validator = new TemplateValidator();

    let templates = Object.keys(ALL_CONFIGURATIONS);

    if (options.template) {
      templates = [options.template];
    }

    const results = [];

    for (const template of templates) {
      const configurations = ALL_CONFIGURATIONS[template];
      let configs = configurations;

      if (options.config) {
        configs = configurations.filter((c) => c.name === options.config);
      }

      if (options.skipAi) {
        configs = configs.filter((c) => !c.ai || c.ai.providers.length === 0);
      }

      const templateResults = await validator.validateTemplate(
        template,
        configs
      );
      results.push(...templateResults);
    }

    // Generate report
    generateReport(results);
  });

program
  .command("test-providers")
  .description("Test AI provider connectivity")
  .option("-p, --provider <provider>", "Test specific provider")
  .action(async (options) => {
    await testProviders(options.provider);
  });

function generateReport(results: ValidationResult[]): void {
  console.log("\n📊 VALIDATION REPORT");
  console.log("=".repeat(50));

  const passed = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;
  const total = results.length;

  console.log(`\n📈 Summary:`);
  console.log(`  Total: ${total}`);
  console.log(`  Passed: ${passed} (${((passed / total) * 100).toFixed(1)}%)`);
  console.log(`  Failed: ${failed} (${((failed / total) * 100).toFixed(1)}%)`);

  if (failed > 0) {
    console.log(`\n❌ Failed Validations:`);
    results
      .filter((r) => !r.success)
      .forEach((result) => {
        console.log(
          `  • ${result.templateName}/${result.configName}: ${result.error}`
        );
      });
  }

  console.log(`\n⏱️  Performance:`);
  const avgDuration =
    results.reduce((sum, r) => sum + r.duration, 0) / results.length;
  console.log(`  Average duration: ${(avgDuration / 1000).toFixed(1)}s`);

  const slowest = results.reduce((max, r) =>
    r.duration > max.duration ? r : max
  );
  console.log(
    `  Slowest: ${slowest.templateName}/${slowest.configName} (${(slowest.duration / 1000).toFixed(1)}s)`
  );
}

async function testProviders(provider?: string): Promise<void> {
  console.log("🧪 Testing AI Provider Connectivity\n");

  const providers = provider ? [provider] : ["ollama", "openai", "huggingface"];

  for (const providerName of providers) {
    console.log(`Testing ${providerName}...`);

    try {
      switch (providerName) {
        case "ollama":
          await testOllama();
          break;
        case "openai":
          await testOpenAI();
          break;
        case "huggingface":
          await testHuggingFace();
          break;
      }
      console.log(`✅ ${providerName} - OK\n`);
    } catch (error) {
      console.log(`❌ ${providerName} - FAILED: ${error.message}\n`);
    }
  }
}

async function testOllama(): Promise<void> {
  // Test Ollama connectivity
  const response = await fetch("http://localhost:11434/api/tags");
  if (!response.ok) {
    throw new Error(`Ollama not accessible: ${response.statusText}`);
  }

  const data = await response.json();
  console.log(`  Models available: ${data.models?.length || 0}`);
}

async function testOpenAI(): Promise<void> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY environment variable not set");
  }

  const response = await fetch("https://api.openai.com/v1/models", {
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.statusText}`);
  }

  console.log(`  OpenAI API accessible`);
}

async function testHuggingFace(): Promise<void> {
  // Test HuggingFace inference API
  const response = await fetch("https://huggingface.co/api/models?limit=1");
  if (!response.ok) {
    throw new Error(`HuggingFace API error: ${response.statusText}`);
  }

  console.log(`  HuggingFace API accessible`);
}

program.parse();
