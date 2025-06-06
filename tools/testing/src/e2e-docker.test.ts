// tools/testing/src/e2e-docker.test.ts
describe("End-to-End Docker Development Workflow", () => {
  it("should complete full development cycle with Docker", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "farm-e2e-"));

    try {
      // 1. Create project
      await runCLI(["create", "e2e-test", "--template", "ai-chat"], tempDir);

      const projectDir = path.join(tempDir, "e2e-test");

      // 2. Start development server
      const devProcess = spawn("farm", ["dev"], {
        cwd: projectDir,
        detached: true,
      });

      // 3. Wait for all services to be ready
      await waitForService("http://localhost:27017", 30000); // MongoDB
      await waitForService("http://localhost:11434/api/tags", 60000); // Ollama
      await waitForService("http://localhost:8000/health", 60000); // API
      await waitForService("http://localhost:3000", 60000); // Frontend

      // 4. Test AI functionality
      const chatResponse = await fetch("http://localhost:8000/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: "Hello" }],
          model: "llama3.1",
          provider: "ollama",
        }),
      });

      expect(chatResponse.status).toBe(200);

      // 5. Test hot reload by modifying a file
      // 6. Verify frontend updates
    } finally {
      // Cleanup
      process.kill(-devProcess.pid); // Kill process group
      await exec("docker-compose down -v", { cwd: projectDir }).catch(() => {});
      await rm(tempDir, { recursive: true, force: true });
    }
  }, 300000); // 5 minute timeout
});
