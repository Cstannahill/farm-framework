#!/usr/bin/env node
// Demo script for AI-powered code explanation feature
import * as fs from "fs/promises";
import { CodeExplanationEngine } from "../explanation/engine";
import { TypeScriptParser } from "../explanation/parser";
import { MockProvider, OllamaProvider } from "../providers";

console.log(`
🧠 FARM Framework - AI Code Intelligence Demo
═══════════════════════════════════════════════

Welcome to the AI-powered code explanation feature!
This demonstrates our simplistic AI-driven capability.
`);

async function runDemo() {
  const projectRoot = "S:/Code/farm-framework";

  console.log("🔍 Step 1: File Discovery & Parsing");
  console.log("──────────────────────────────────");

  const parser = new TypeScriptParser();
  const testFile = `${projectRoot}/packages/code-intelligence/src/providers/mock.ts`;

  try {
    const content = await fs.readFile(testFile, "utf-8");
    const entities = await parser.parseFile(testFile, content);

    console.log(`✅ Successfully parsed ${testFile.split("/").pop()}`);
    console.log(`📊 Found ${entities.length} code entities:`);

    entities.slice(0, 5).forEach((entity, i) => {
      console.log(`   ${i + 1}. ${entity.entityType}: ${entity.name}`);
    });

    console.log("\n🤖 Step 2: AI Explanation Generation");
    console.log("────────────────────────────────────");

    // Check if Ollama is available
    const ollamaProvider = new OllamaProvider({ model: "codegemma:7b" });
    const isOllamaAvailable = await ollamaProvider.isAvailable();

    let aiProvider;
    if (isOllamaAvailable) {
      console.log("🚀 Using Ollama AI (CodeGemma 7B model)");
      aiProvider = ollamaProvider;
    } else {
      console.log("🎭 Using Mock AI Provider (Ollama not available)");
      aiProvider = new MockProvider(800);
    }

    const engine = new CodeExplanationEngine(aiProvider, parser, projectRoot);

    console.log("\n⚡ Generating explanation for 'MockProvider' class...");
    const startTime = Date.now();

    const explanation = await engine.explainEntity("MockProvider", {
      includeExamples: true,
      includeContext: true,
    });

    const duration = Date.now() - startTime;

    console.log(`✅ Generated in ${duration}ms\n`);
    console.log("📋 EXPLANATION RESULT:");
    console.log("═".repeat(50));

    if (explanation.entity) {
      console.log(
        `🏷️  Entity: ${explanation.entity.name} (${explanation.entity.entityType})`
      );
      console.log(
        `📍 Location: ${explanation.entity.filePath?.split("/").pop()}\n`
      );
    }

    if (explanation.explanation) {
      // Truncate long explanations for demo
      const truncated =
        explanation.explanation.length > 500
          ? explanation.explanation.substring(0, 500) +
            "...\n\n[Explanation truncated for demo]"
          : explanation.explanation;
      console.log(truncated);
    }

    console.log("\n🎯 DEMO COMPLETE!");
    console.log("═".repeat(50));
    console.log(`
Key Features Demonstrated:
✅ TypeScript/JavaScript AST parsing
✅ Entity discovery and classification  
✅ AI provider abstraction (Mock + Ollama)
✅ Intelligent code explanation generation
✅ Real-time processing with performance metrics

Next Steps:
- Try: npm run test:explanation MockProvider --ollama
- Try: npm run test:explanation generateExplanation
- Install more models: ollama pull codellama:13b
- Explore other entities in the codebase
`);
  } catch (error) {
    console.error(
      "❌ Demo failed:",
      error instanceof Error ? error.message : error
    );
    console.log("\n🔧 Troubleshooting:");
    console.log(
      "- Make sure you're running from the code-intelligence package directory"
    );
    console.log("- Run 'npm run build' to compile the package");
    console.log("- Install Ollama for AI features: https://ollama.ai/");
  }
}

// Run demo
runDemo().catch(console.error);
