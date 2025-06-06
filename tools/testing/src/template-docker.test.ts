// tools/testing/src/template-docker.test.ts
import { spawn } from "child_process";
import { mkdtemp, rm } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { describe, it, expect, beforeEach, afterEach } from "vitest";

describe("Template Docker Generation", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), "farm-test-"));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe("Basic Template", () => {
    it("should generate working docker-compose.yml", async () => {
      // Generate project using CLI
      await runCLI(
        ["create", "test-app", "--template", "basic", "--no-install"],
        tempDir
      );

      // Validate docker-compose.yml exists and is valid
      const dockerComposePath = path.join(
        tempDir,
        "test-app/docker-compose.yml"
      );
      expect(await pathExists(dockerComposePath)).toBe(true);

      // Validate Docker Compose syntax
      const { stdout } = await exec(`docker-compose config`, {
        cwd: path.join(tempDir, "test-app"),
      });
      expect(stdout).toContain("services:");
      expect(stdout).toContain("mongodb:");
      expect(stdout).toContain("api:");
      expect(stdout).toContain("web:");
    });

    it("should build Docker images successfully", async () => {
      await runCLI(["create", "test-app", "--template", "basic"], tempDir);

      // Build images
      await exec("docker-compose build", {
        cwd: path.join(tempDir, "test-app"),
      });

      // Verify images were built
      const { stdout } = await exec("docker images test-app*");
      expect(stdout).toContain("test-app-api");
      expect(stdout).toContain("test-app-web");
    });
  });

  describe("AI Chat Template", () => {
    it("should include Ollama service in docker-compose.yml", async () => {
      await runCLI(["create", "ai-app", "--template", "ai-chat"], tempDir);

      const dockerComposePath = path.join(tempDir, "ai-app/docker-compose.yml");
      const content = await readFile(dockerComposePath, "utf8");

      expect(content).toContain("ollama:");
      expect(content).toContain("ollama/ollama:latest");
      expect(content).toContain("11434:11434");
    });
  });
});
