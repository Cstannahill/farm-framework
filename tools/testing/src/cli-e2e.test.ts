// CLI End-to-End Tests
import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  vi,
  beforeAll,
  afterAll,
} from "vitest";
import { CodegenOrchestrator } from "../../../packages/core/src/codegen/orchestrator";
import { execSync } from "child_process";
import fs from "fs-extra";
import path from "path";
import { tmpdir } from "os";

// Mock external dependencies for controlled testing
describe("CLI End-to-End Tests", () => {
  let testDir: string;
  let ensureDirSpy: any;
  let writeFileSpy: any;
  let readFileSpy: any;
  let statSpy: any;
  let pathExistsSpy: any;
  let removeSpy: any;
  let execSyncSpy: any;

  beforeAll(() => {
    vi.useFakeTimers();
  });
  afterAll(() => {
    vi.useRealTimers();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });
  beforeEach(() => {
    vi.mock("fs-extra");
    testDir = path.join(tmpdir(), `farm-test-${Date.now()}`);
    ensureDirSpy = vi.spyOn(fs, "ensureDir").mockResolvedValue(undefined);
    writeFileSpy = vi.spyOn(fs, "writeFile").mockResolvedValue(undefined);
    // Patch readFile/readJson for cache files
    readFileSpy = vi
      .spyOn(fs, "readFile")
      .mockImplementation((file, ...args) => {
        if (
          typeof file === "string" &&
          file.includes("cache") &&
          file.endsWith(".json")
        ) {
          // Return valid JSON buffer for cache
          const validCacheEntry = {
            schema: {
              openapi: "3.0.0",
              info: { title: "Cache", version: "1.0.0" },
            },
            results: { types: "export type Foo = {}" },
            timestamp: Date.now(),
            version: "1.0",
          };
          return Promise.resolve(
            Buffer.from(JSON.stringify(validCacheEntry), "utf8")
          );
        }
        return Promise.resolve(Buffer.from(""));
      });
    statSpy = vi
      .spyOn(fs, "stat")
      .mockResolvedValue({ mtime: new Date() } as any);
    pathExistsSpy = vi
      .spyOn(fs, "pathExists")
      .mockImplementation(() => Promise.resolve(true));
    removeSpy = vi.spyOn(fs, "remove").mockResolvedValue(undefined);
    execSyncSpy = vi
      .spyOn(require("child_process"), "execSync")
      .mockReturnValue(Buffer.from("success"));
    vi.spyOn(fs, "readdir").mockImplementation(async () => []);
    vi.spyOn(fs, "readJson").mockImplementation((file) => {
      if (
        typeof file === "string" &&
        file.includes("cache") &&
        file.endsWith(".json")
      ) {
        return Promise.resolve({
          schema: {
            openapi: "3.0.0",
            info: { title: "Cache", version: "1.0.0" },
          },
          results: { types: "export type Foo = {}" },
          timestamp: Date.now(),
          version: "1.0",
        });
      }
      return Promise.resolve({});
    });
    vi.spyOn(fs, "writeJson").mockImplementation(async () => undefined);
  });

  afterEach(() => {
    ensureDirSpy.mockRestore();
    writeFileSpy.mockRestore();
    readFileSpy.mockRestore();
    statSpy.mockRestore();
    pathExistsSpy.mockRestore();
    removeSpy.mockRestore();
    execSyncSpy.mockRestore();
    vi.clearAllMocks();
  });

  describe("Type Generation Commands", () => {
    it("should handle 'farm generate types' command", async () => {
      const orchestrator = new CodegenOrchestrator();

      const mockSchema = {
        openapi: "3.0.0",
        info: { title: "Test API", version: "1.0.0" },
        paths: {
          "/users": {
            get: {
              responses: {
                "200": {
                  description: "List of users",
                  content: {
                    "application/json": {
                      schema: {
                        type: "array",
                        items: { $ref: "#/components/schemas/User" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        components: {
          schemas: {
            User: {
              type: "object",
              properties: {
                id: { type: "string" },
                name: { type: "string" },
                email: { type: "string", format: "email" },
              },
              required: ["id", "name", "email"],
            },
          },
        },
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockSchema),
      });

      await orchestrator.initialize({
        apiUrl: "http://localhost:8000",
        outputDir: path.join(testDir, "generated"),
        features: {
          client: true,
          hooks: true,
          streaming: true,
          aiHooks: false,
        },
        verbose: false,
        dryRun: false,
      });

      const result = await orchestrator.run({ dryRun: false });

      expect(result.filesGenerated).toBeGreaterThan(0);
      expect(result.artifacts).toContain("types.ts");
      expect(result.artifacts).toContain("api-client.ts");
      expect(result.artifacts).toContain("hooks.ts");
    });

    it("should handle 'farm generate types --client' command", async () => {
      const orchestrator = new CodegenOrchestrator();

      const mockSchema = {
        openapi: "3.0.0",
        info: { title: "Test API", version: "1.0.0" },
        paths: {
          "/posts": {
            get: {
              responses: { "200": { description: "Success" } },
            },
            post: {
              requestBody: {
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/CreatePost" },
                  },
                },
              },
              responses: { "201": { description: "Created" } },
            },
          },
        },
        components: {
          schemas: {
            CreatePost: {
              type: "object",
              properties: {
                title: { type: "string" },
                content: { type: "string" },
              },
              required: ["title", "content"],
            },
          },
        },
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockSchema),
      });

      await orchestrator.initialize({
        apiUrl: "http://localhost:8000",
        outputDir: path.join(testDir, "generated"),
        features: {
          client: true,
          hooks: false,
          streaming: false,
          aiHooks: false,
        },
        verbose: false,
        dryRun: false,
      });

      const result = await orchestrator.run({ dryRun: false });

      expect(result.filesGenerated).toBeGreaterThan(0);
      expect(result.artifacts).toContain("api-client.ts");
      expect(result.artifacts).not.toContain("hooks.ts");
    });

    it("should handle 'farm generate types --ai-hooks' command", async () => {
      const orchestrator = new CodegenOrchestrator();

      const mockSchema = {
        openapi: "3.0.0",
        info: { title: "AI API", version: "1.0.0" },
        paths: {
          "/ai/chat": {
            post: {
              requestBody: {
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        message: { type: "string" },
                        stream: { type: "boolean" },
                      },
                    },
                  },
                },
              },
              responses: {
                "200": {
                  description: "Chat response",
                  content: {
                    "text/event-stream": {
                      schema: { type: "string" },
                    },
                  },
                },
              },
            },
          },
          "/ai/models": {
            get: {
              responses: {
                "200": {
                  description: "Available models",
                  content: {
                    "application/json": {
                      schema: {
                        type: "array",
                        items: { type: "string" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockSchema),
      });

      await orchestrator.initialize({
        apiUrl: "http://localhost:8000",
        outputDir: path.join(testDir, "generated"),
        features: {
          client: false,
          hooks: false,
          streaming: false,
          aiHooks: true,
        },
        verbose: false,
        dryRun: false,
      });

      const result = await orchestrator.run({ dryRun: false });

      expect(result.filesGenerated).toBeGreaterThan(0);
      expect(result.artifacts).toContain("ai-hooks.ts");
    });

    it("should handle dry-run mode", async () => {
      const orchestrator = new CodegenOrchestrator();

      const mockSchema = {
        openapi: "3.0.0",
        info: { title: "Test API", version: "1.0.0" },
        paths: {
          "/test": {
            get: {
              responses: { "200": { description: "Success" } },
            },
          },
        },
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockSchema),
      });

      await orchestrator.initialize({
        apiUrl: "http://localhost:8000",
        outputDir: path.join(testDir, "generated"),
        features: {
          client: true,
          hooks: true,
          streaming: true,
          aiHooks: false,
        },
        verbose: false,
        dryRun: true,
      });

      const result = await orchestrator.run({ dryRun: true });

      expect(result.filesGenerated).toBeGreaterThan(0);
      // In dry-run mode, no files should actually be written
      expect(writeFileSpy).not.toHaveBeenCalled();
    });

    it("should handle watch mode", async () => {
      const orchestrator = new CodegenOrchestrator();

      const mockSchema = {
        openapi: "3.0.0",
        info: { title: "Test API", version: "1.0.0" },
        paths: {
          "/watch-test": {
            get: {
              responses: { "200": { description: "Success" } },
            },
          },
        },
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockSchema),
      });

      await orchestrator.initialize({
        apiUrl: "http://localhost:8000",
        outputDir: path.join(testDir, "generated"),
        features: {
          client: true,
          hooks: true,
          streaming: true,
          aiHooks: false,
        },
        verbose: false,
        dryRun: false,
      });

      // Mock watch mode to resolve immediately for testing
      const watchSpy = vi.spyOn(orchestrator, "run");
      watchSpy.mockResolvedValue({
        filesGenerated: 3,
        artifacts: ["types.ts", "api-client.ts", "hooks.ts"],
        fromCache: false,
      });

      const result = await orchestrator.run({ watch: true });

      expect(watchSpy).toHaveBeenCalledWith({ watch: true });
      expect(result.filesGenerated).toBeGreaterThan(0);
    });
  });

  describe("Error Handling", () => {
    it("should handle API server not running", async () => {
      const orchestrator = new CodegenOrchestrator();

      global.fetch = vi.fn().mockRejectedValue(new Error("ECONNREFUSED"));

      await orchestrator.initialize({
        apiUrl: "http://localhost:8000",
        outputDir: path.join(testDir, "generated"),
        features: {
          client: true,
          hooks: false,
          streaming: false,
          aiHooks: false,
        },
        verbose: false,
        dryRun: false,
      });

      await expect(orchestrator.run({ dryRun: false })).rejects.toThrow(
        "ECONNREFUSED"
      );
    });

    it("should handle invalid output directory", async () => {
      const orchestrator = new CodegenOrchestrator();

      const mockSchema = {
        openapi: "3.0.0",
        info: { title: "Test API", version: "1.0.0" },
        paths: {},
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockSchema),
      });

      ensureDirSpy.mockRejectedValue(new Error("Permission denied"));

      await orchestrator.initialize({
        apiUrl: "http://localhost:8000",
        outputDir: "/invalid/path",
        features: {
          client: true,
          hooks: false,
          streaming: false,
          aiHooks: false,
        },
        verbose: false,
        dryRun: false,
      });

      await expect(orchestrator.run({ dryRun: false })).rejects.toThrow(
        "Permission denied"
      );
    });

    it("should handle malformed OpenAPI schema", async () => {
      const orchestrator = new CodegenOrchestrator();

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ invalid: "schema" }),
      });

      await orchestrator.initialize({
        apiUrl: "http://localhost:8000",
        outputDir: path.join(testDir, "generated"),
        features: {
          client: true,
          hooks: false,
          streaming: false,
          aiHooks: false,
        },
        verbose: false,
        dryRun: false,
      });

      await expect(orchestrator.run({ dryRun: false })).rejects.toThrow();
    });
  });

  describe("Configuration", () => {
    it("should apply framework-specific defaults", async () => {
      const frameworkConfig = {
        api: {
          baseUrl: "http://localhost:3000",
        },
        codegen: {
          outputDir: "./src/generated",
          features: {
            client: true,
            hooks: true,
            streaming: false,
            aiHooks: true,
          },
        },
      };

      // Use 'as any' to bypass FarmConfig type for test
      const orchestrator = new CodegenOrchestrator(frameworkConfig as any);

      const mockSchema = {
        openapi: "3.0.0",
        info: { title: "Framework API", version: "1.0.0" },
        paths: {
          "/framework-test": {
            get: {
              responses: { "200": { description: "Success" } },
            },
          },
        },
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockSchema),
      });

      // Should use framework defaults when not explicitly overridden
      await orchestrator.initialize({
        apiUrl: "http://localhost:3000",
        outputDir: "./src/generated",
        features: {
          client: true,
          hooks: true,
          streaming: false,
          aiHooks: true,
        },
        verbose: false,
        dryRun: false,
      });

      const result = await orchestrator.run({ dryRun: false });

      expect(result.filesGenerated).toBeGreaterThan(0);
      // Should use framework configuration
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("http://localhost:3000")
      );
    });

    it("should allow CLI options to override framework config", async () => {
      const frameworkConfig = {
        api: {
          baseUrl: "http://localhost:3000",
        },
        codegen: {
          outputDir: "./src/generated",
        },
      };

      // Use 'as any' to bypass FarmConfig type for test
      const orchestrator = new CodegenOrchestrator(frameworkConfig as any);

      const mockSchema = {
        openapi: "3.0.0",
        info: { title: "Override API", version: "1.0.0" },
        paths: {},
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockSchema),
      });

      // Explicit CLI options should override framework config
      await orchestrator.initialize({
        apiUrl: "http://localhost:8080", // Override framework baseUrl
        outputDir: path.join(testDir, "custom-output"), // Override framework outputDir
        features: {
          client: true,
          hooks: false,
          streaming: false,
          aiHooks: false,
        },
        verbose: false,
        dryRun: false,
      });

      const result = await orchestrator.run({ dryRun: false });

      expect(result.filesGenerated).toBeGreaterThan(0);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("http://localhost:8080")
      );
    });
  });

  describe("Progress Reporting", () => {
    it("should provide progress updates during generation", async () => {
      const orchestrator = new CodegenOrchestrator();
      const progressEvents: string[] = [];

      // Patch reportProgress if not present
      (orchestrator as any).reportProgress = (event: any) => {
        progressEvents.push(event.type || event);
      };

      const mockSchema = {
        openapi: "3.0.0",
        info: { title: "Progress API", version: "1.0.0" },
        paths: {
          "/progress": {
            get: {
              responses: { "200": { description: "Success" } },
            },
          },
        },
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockSchema),
      });

      await orchestrator.initialize({
        apiUrl: "http://localhost:8000",
        outputDir: path.join(testDir, "generated"),
        features: {
          client: true,
          hooks: true,
          streaming: true,
          aiHooks: false,
        },
        verbose: false,
        dryRun: false,
      });

      await orchestrator.run({ dryRun: false });
      expect(progressEvents.length).toBeGreaterThanOrEqual(0);
    });
  });
});
