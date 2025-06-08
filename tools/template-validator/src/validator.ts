// tools/template-validator/src/validator.ts
import { spawn } from "child_process";
import { promises as fs } from "fs";
import path from "path";
import type { TemplateConfig, ValidationResult, TestResult } from "@farm/types";
import type { ProviderConfig } from "./types";

export class TemplateValidator {
  private tempDir: string;
  private results: ValidationResult[] = [];

  constructor() {
    this.tempDir = path.join(process.cwd(), ".temp-validation");
  }

  async validateTemplate(
    templateName: string,
    configurations: TemplateConfig[]
  ): Promise<ValidationResult[]> {
    console.log(`🧪 Validating template: ${templateName}`);

    for (const config of configurations) {
      console.log(`  📋 Testing configuration: ${config.name}`);

      try {
        const result = await this.runValidationTest(templateName, config);
        this.results.push(result);

        if (result.success) {
          console.log(`  ✅ ${config.name} - PASSED`);
        } else {
          console.log(`  ❌ ${config.name} - FAILED: ${result.error}`);
        }
      } catch (error) {
        console.log(`  💥 ${config.name} - ERROR: ${error.message}`);
        this.results.push({
          templateName,
          configName: config.name,
          success: false,
          error: error.message,
          duration: 0,
          tests: [],
        });
      }
    }

    return this.results;
  }

  private async runValidationTest(
    templateName: string,
    config: TemplateConfig
  ): Promise<ValidationResult> {
    const startTime = Date.now();
    const projectDir = path.join(
      this.tempDir,
      `${templateName}-${config.name}`
    );

    try {
      // 1. Generate project from template
      await this.generateProject(templateName, config, projectDir);

      // 2. Install dependencies
      await this.installDependencies(projectDir);

      // 3. Start services (if needed)
      const services = await this.startServices(projectDir, config);

      // 4. Run validation tests
      const testResults = await this.runTests(projectDir, config);

      // 5. Cleanup services
      await this.stopServices(services);

      const duration = Date.now() - startTime;

      return {
        templateName,
        configName: config.name,
        success: testResults.every((t) => t.passed),
        duration,
        tests: testResults,
        error: testResults.find((t) => !t.passed)?.error,
      };
    } catch (error) {
      return {
        templateName,
        configName: config.name,
        success: false,
        error: error.message,
        duration: Date.now() - startTime,
        tests: [],
      };
    } finally {
      // Cleanup
      await this.cleanup(projectDir);
    }
  }

  private async generateProject(
    templateName: string,
    config: TemplateConfig,
    projectDir: string
  ): Promise<void> {
    console.log(`    🏗️  Generating project...`);

    // Ensure temp directory exists
    await fs.mkdir(this.tempDir, { recursive: true });

    // Build CLI command
    const args = [
      "create",
      path.basename(projectDir),
      "--template",
      templateName,
      "--no-interactive",
      "--no-install", // We'll install separately for better control
      "--output",
      path.dirname(projectDir),
    ];

    // Add features
    if (config.features.length > 0) {
      args.push("--features", config.features.join(","));
    }

    // Add database
    if (config.database) {
      args.push("--database", config.database);
    }

    // Add AI providers
    if (config.ai) {
      args.push("--ai-providers", config.ai.providers.join(","));
    }

    // Run farm CLI
    await this.runCommand("farm", args);
  }

  private async installDependencies(projectDir: string): Promise<void> {
    console.log(`    📦 Installing dependencies...`);

    // Install frontend dependencies
    const frontendDir = path.join(projectDir, "apps", "web");
    if (await this.directoryExists(frontendDir)) {
      await this.runCommand("pnpm", ["install"], { cwd: frontendDir });
    }

    // Install backend dependencies
    const backendDir = path.join(projectDir, "apps", "api");
    if (await this.directoryExists(backendDir)) {
      await this.runCommand("pip", ["install", "-r", "requirements.txt"], {
        cwd: backendDir,
      });
    }
  }

  private async startServices(
    projectDir: string,
    config: TemplateConfig
  ): Promise<ServiceProcess[]> {
    console.log(`    🚀 Starting services...`);

    const services: ServiceProcess[] = [];

    // Start database if needed
    if (config.database === "mongodb") {
      const mongoProcess = await this.startMongoDB();
      services.push(mongoProcess);
    }

    // Start AI providers if configured
    if (config.ai?.providers.includes("ollama")) {
      const ollamaProcess = await this.startOllama(config.ai.models);
      services.push(ollamaProcess);
    }

    // Start backend
    const backendProcess = await this.startBackend(projectDir);
    services.push(backendProcess);

    // Start frontend (if exists)
    const frontendDir = path.join(projectDir, "apps", "web");
    if (await this.directoryExists(frontendDir)) {
      const frontendProcess = await this.startFrontend(projectDir);
      services.push(frontendProcess);
    }

    // Wait for services to be ready
    await this.waitForServices(services);

    return services;
  }

  private async runTests(
    projectDir: string,
    config: TemplateConfig
  ): Promise<TestResult[]> {
    console.log(`    🧪 Running validation tests...`);

    const tests: TestResult[] = [];

    // 1. Health check tests
    tests.push(await this.testHealthEndpoints());

    // 2. AI provider tests
    if (config.ai) {
      for (const provider of config.ai.providers) {
        tests.push(await this.testAIProvider(provider, config.ai.models));
      }
    }

    // 3. Feature-specific tests
    for (const feature of config.features) {
      tests.push(await this.testFeature(feature));
    }

    // 4. Integration tests
    tests.push(await this.testFullWorkflow(config));

    // 5. Performance tests
    tests.push(await this.testPerformance(config));

    return tests;
  }

  private async testAIProvider(
    provider: string,
    models: string[]
  ): Promise<TestResult> {
    console.log(`      🤖 Testing AI provider: ${provider}`);

    try {
      // Test provider health
      const healthResponse = await fetch(`http://localhost:8000/api/ai/health`);
      const healthData = await healthResponse.json();

      if (!healthData[provider] || healthData[provider].status !== "healthy") {
        return {
          name: `ai-provider-${provider}`,
          passed: false,
          error: `Provider ${provider} is not healthy: ${healthData[provider]?.status}`,
        };
      }

      // Test model availability
      for (const model of models) {
        const modelResponse = await fetch(
          `http://localhost:8000/api/ai/models?provider=${provider}`
        );
        const modelData = await modelResponse.json();

        const hasModel = modelData.some((m: any) => m.name === model);
        if (!hasModel) {
          return {
            name: `ai-model-${provider}-${model}`,
            passed: false,
            error: `Model ${model} not available for provider ${provider}`,
          };
        }
      }

      // Test basic chat completion
      const chatResponse = await fetch(`http://localhost:8000/api/ai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: "Hello, this is a test." }],
          model: models[0],
          provider,
          max_tokens: 50,
        }),
      });

      if (!chatResponse.ok) {
        return {
          name: `ai-chat-${provider}`,
          passed: false,
          error: `Chat completion failed: ${chatResponse.statusText}`,
        };
      }

      const chatData = await chatResponse.json();
      if (!chatData.response || chatData.response.length === 0) {
        return {
          name: `ai-chat-${provider}`,
          passed: false,
          error: "Chat completion returned empty response",
        };
      }

      // Test streaming (if supported)
      if (provider === "ollama" || provider === "openai") {
        const streamTest = await this.testStreamingChat(provider, models[0]);
        if (!streamTest.passed) {
          return streamTest;
        }
      }

      return {
        name: `ai-provider-${provider}`,
        passed: true,
      };
    } catch (error) {
      return {
        name: `ai-provider-${provider}`,
        passed: false,
        error: error.message,
      };
    }
  }

  private async testStreamingChat(
    provider: string,
    model: string
  ): Promise<TestResult> {
    console.log(`      📡 Testing streaming for ${provider}...`);

    return new Promise((resolve) => {
      const eventSource = new EventSource(
        `http://localhost:8000/api/ai/chat/stream?provider=${provider}&model=${model}`
      );

      let receivedChunks = 0;
      let timeout: NodeJS.Timeout;

      const cleanup = () => {
        eventSource.close();
        clearTimeout(timeout);
      };

      // Set timeout for test
      timeout = setTimeout(() => {
        cleanup();
        resolve({
          name: `ai-streaming-${provider}`,
          passed: false,
          error: "Streaming test timed out",
        });
      }, 30000); // 30 second timeout

      // Send initial message
      fetch(`http://localhost:8000/api/ai/chat/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "Count to 5 slowly.",
          provider,
          model,
          stream: true,
        }),
      }).catch((error) => {
        cleanup();
        resolve({
          name: `ai-streaming-${provider}`,
          passed: false,
          error: `Failed to start streaming: ${error.message}`,
        });
      });

      eventSource.onmessage = (event) => {
        if (event.data === "[DONE]") {
          cleanup();
          resolve({
            name: `ai-streaming-${provider}`,
            passed: receivedChunks > 0,
            error:
              receivedChunks === 0 ? "No streaming chunks received" : undefined,
          });
          return;
        }

        try {
          const data = JSON.parse(event.data);
          if (data.content) {
            receivedChunks++;
          }
        } catch (e) {
          // Ignore parsing errors for now
        }
      };

      eventSource.onerror = () => {
        cleanup();
        resolve({
          name: `ai-streaming-${provider}`,
          passed: false,
          error: "Streaming connection failed",
        });
      };
    });
  }

  private async testFeature(feature: string): Promise<TestResult> {
    console.log(`      🔧 Testing feature: ${feature}`);

    switch (feature) {
      case "auth":
        return await this.testAuthFeature();
      case "realtime":
        return await this.testRealtimeFeature();
      default:
        return {
          name: `feature-${feature}`,
          passed: true, // Skip unknown features
        };
    }
  }

  private async testAuthFeature(): Promise<TestResult> {
    try {
      // Test registration endpoint
      const registerResponse = await fetch(
        "http://localhost:8000/api/auth/register",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: "test@example.com",
            password: "testpassword123",
            name: "Test User",
          }),
        }
      );

      if (!registerResponse.ok) {
        return {
          name: "auth-register",
          passed: false,
          error: `Registration failed: ${registerResponse.statusText}`,
        };
      }

      // Test login endpoint
      const loginResponse = await fetch(
        "http://localhost:8000/api/auth/login",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: "test@example.com",
            password: "testpassword123",
          }),
        }
      );

      if (!loginResponse.ok) {
        return {
          name: "auth-login",
          passed: false,
          error: `Login failed: ${loginResponse.statusText}`,
        };
      }

      const loginData = await loginResponse.json();
      if (!loginData.access_token) {
        return {
          name: "auth-token",
          passed: false,
          error: "No access token returned from login",
        };
      }

      // Test protected endpoint
      const protectedResponse = await fetch(
        "http://localhost:8000/api/users/me",
        {
          headers: {
            Authorization: `Bearer ${loginData.access_token}`,
          },
        }
      );

      if (!protectedResponse.ok) {
        return {
          name: "auth-protected",
          passed: false,
          error: `Protected endpoint failed: ${protectedResponse.statusText}`,
        };
      }

      return {
        name: "feature-auth",
        passed: true,
      };
    } catch (error) {
      return {
        name: "feature-auth",
        passed: false,
        error: error.message,
      };
    }
  }

  private async testFullWorkflow(config: TemplateConfig): Promise<TestResult> {
    console.log(`      🔄 Testing full workflow...`);

    try {
      // Test the complete user journey for AI chat template
      if (config.template === "ai-chat") {
        return await this.testChatWorkflow(config);
      }

      // Test dashboard workflow for AI dashboard template
      if (config.template === "ai-dashboard") {
        return await this.testDashboardWorkflow(config);
      }

      return {
        name: "full-workflow",
        passed: true, // No specific workflow test
      };
    } catch (error) {
      return {
        name: "full-workflow",
        passed: false,
        error: error.message,
      };
    }
  }

  private async testChatWorkflow(config: TemplateConfig): Promise<TestResult> {
    try {
      // 1. Create a conversation
      const conversationResponse = await fetch(
        "http://localhost:8000/api/conversations",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: "Test Conversation",
          }),
        }
      );

      if (!conversationResponse.ok) {
        return {
          name: "chat-workflow-conversation",
          passed: false,
          error: "Failed to create conversation",
        };
      }

      const conversation = await conversationResponse.json();

      // 2. Send a message
      const chatResponse = await fetch("http://localhost:8000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "What is the capital of France?",
          conversation_id: conversation.id,
          provider: config.ai.providers[0],
          model: config.ai.models[0],
        }),
      });

      if (!chatResponse.ok) {
        return {
          name: "chat-workflow-message",
          passed: false,
          error: "Failed to send chat message",
        };
      }

      const chatData = await chatResponse.json();
      if (!chatData.message || chatData.message.length === 0) {
        return {
          name: "chat-workflow-response",
          passed: false,
          error: "Empty response from chat",
        };
      }

      // 3. Retrieve conversation history
      const historyResponse = await fetch(
        `http://localhost:8000/api/conversations/${conversation.id}/messages`
      );

      if (!historyResponse.ok) {
        return {
          name: "chat-workflow-history",
          passed: false,
          error: "Failed to retrieve conversation history",
        };
      }

      const history = await historyResponse.json();
      if (history.length < 2) {
        // Should have user message + AI response
        return {
          name: "chat-workflow-history-count",
          passed: false,
          error: "Insufficient messages in conversation history",
        };
      }

      return {
        name: "chat-workflow",
        passed: true,
      };
    } catch (error) {
      return {
        name: "chat-workflow",
        passed: false,
        error: error.message,
      };
    }
  }

  private async testPerformance(config: TemplateConfig): Promise<TestResult> {
    console.log(`      ⚡ Testing performance...`);

    try {
      const results = [];

      // Test API response times
      for (let i = 0; i < 5; i++) {
        const start = Date.now();

        const response = await fetch("http://localhost:8000/api/health");

        const duration = Date.now() - start;
        results.push(duration);

        if (!response.ok) {
          return {
            name: "performance-health",
            passed: false,
            error: `Health check failed on iteration ${i + 1}`,
          };
        }
      }

      const avgResponseTime =
        results.reduce((a, b) => a + b, 0) / results.length;

      // Performance thresholds
      const maxResponseTime = 2000; // 2 seconds

      if (avgResponseTime > maxResponseTime) {
        return {
          name: "performance-response-time",
          passed: false,
          error: `Average response time (${avgResponseTime}ms) exceeds threshold (${maxResponseTime}ms)`,
        };
      }

      // Test AI response performance (if AI is configured)
      if (config.ai && config.ai.providers.length > 0) {
        const aiStart = Date.now();

        const aiResponse = await fetch("http://localhost:8000/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [{ role: "user", content: "Hi" }],
            model: config.ai.models[0],
            provider: config.ai.providers[0],
            max_tokens: 10,
          }),
        });

        const aiDuration = Date.now() - aiStart;
        const maxAIResponseTime = 30000; // 30 seconds

        if (aiDuration > maxAIResponseTime) {
          return {
            name: "performance-ai-response",
            passed: false,
            error: `AI response time (${aiDuration}ms) exceeds threshold (${maxAIResponseTime}ms)`,
          };
        }
      }

      return {
        name: "performance",
        passed: true,
        metadata: {
          avgResponseTime,
          aiResponseTime: config.ai ? "tested" : "skipped",
        },
      };
    } catch (error) {
      return {
        name: "performance",
        passed: false,
        error: error.message,
      };
    }
  }

  private async runCommand(
    command: string,
    args: string[],
    options: { cwd?: string } = {}
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const process = spawn(command, args, {
        cwd: options.cwd || process.cwd(),
        stdio: "pipe",
      });

      let stdout = "";
      let stderr = "";

      process.stdout.on("data", (data) => {
        stdout += data.toString();
      });

      process.stderr.on("data", (data) => {
        stderr += data.toString();
      });

      process.on("close", (code) => {
        if (code === 0) {
          resolve(stdout);
        } else {
          reject(new Error(`Command failed with code ${code}: ${stderr}`));
        }
      });

      process.on("error", reject);
    });
  }
}
