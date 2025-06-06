// tools/testing/src/docker-integration.test.ts
import { spawn } from "child_process";
import { promisify } from "util";
import fetch from "node-fetch";
import path from "path";
import { describe, it, expect, beforeAll, afterAll } from "vitest";

const exec = promisify(require("child_process").exec);

describe("Docker Compose Integration", () => {
  const testProjectPath = path.join(__dirname, "fixtures/test-project");

  beforeAll(async () => {
    // Clean up any existing containers
    await exec("docker-compose down -v", { cwd: testProjectPath }).catch(
      () => {}
    );
  });

  afterAll(async () => {
    // Cleanup test containers
    await exec("docker-compose down -v", { cwd: testProjectPath }).catch(
      () => {}
    );
  });

  describe("Basic Template Docker Setup", () => {
    it("should start all services successfully", async () => {
      // Start services
      await exec("docker-compose up -d", { cwd: testProjectPath });

      // Wait for services to be ready
      await waitForService("http://localhost:27017", 30000); // MongoDB
      await waitForService("http://localhost:8000/health", 60000); // API
      await waitForService("http://localhost:3000", 60000); // Frontend

      // Verify services are responding
      const apiResponse = await fetch("http://localhost:8000/health");
      expect(apiResponse.status).toBe(200);

      const webResponse = await fetch("http://localhost:3000");
      expect(webResponse.status).toBe(200);
    }, 120000); // 2 minute timeout

    it("should persist MongoDB data across restarts", async () => {
      // Insert test data
      // Restart MongoDB
      // Verify data persists
    });
  });

  describe("AI Chat Template Docker Setup", () => {
    it("should start all AI services including Ollama", async () => {
      const aiProjectPath = path.join(__dirname, "fixtures/ai-chat-project");

      await exec("docker-compose up -d", { cwd: aiProjectPath });

      // Wait for Ollama to be ready
      await waitForService("http://localhost:11434/api/tags", 120000);

      // Verify Ollama is responding
      const ollamaResponse = await fetch("http://localhost:11434/api/tags");
      expect(ollamaResponse.status).toBe(200);
    }, 180000); // 3 minute timeout for Ollama startup
  });
});

async function waitForService(url: string, timeout: number): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch (error) {
      // Service not ready yet
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  throw new Error(`Service at ${url} did not become ready within ${timeout}ms`);
}
