// tools/template-validator/test-runner.ts
import { TemplateValidator } from "./src/validator.js";
import { AI_CHAT_CONFIGURATIONS } from "./src/configurations";

async function runTest() {
  const validator = new TemplateValidator();

  console.log("🧪 Testing AI Chat template with Ollama...");

  const results = await validator.validateTemplate("ai-chat", [
    {
      name: "ollama-basic",
      template: "ai-chat",
      features: ["ai"],
      database: "mongodb",
      ai: {
        providers: ["ollama"],
        models: ["llama3.1"],
      },
    },
  ]);

  console.log("\n📊 Results:");
  results.forEach((result) => {
    console.log(
      `${result.success ? "✅" : "❌"} ${result.configName}: ${result.error || "PASSED"}`
    );
  });
}

runTest().catch(console.error);
