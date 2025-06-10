// Enhanced Type-Sync Integration Tests
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
import {
  TypeSyncOrchestrator,
  GenerationCache,
  OpenAPIExtractor,
  AIHookGenerator,
} from "@farm/type-sync";
import type { SyncOptions, SyncResult, OpenAPISchema } from "@farm/type-sync";
import fs from "fs-extra";
import path from "path";

// Mock external dependencies
vi.mock("fs-extra");
vi.mock("node-fetch");

const mockFs = vi.mocked(fs);

describe("Enhanced Type-Sync Integration", () => {
  let orchestrator: TypeSyncOrchestrator;
  let mockConfig: SyncOptions;

  beforeAll(() => {
    vi.useFakeTimers();
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  beforeEach(async () => {
    vi.mock("fs-extra");
    vi.spyOn(fs, "readFile").mockImplementation(() =>
      Promise.resolve(Buffer.from(""))
    );
    vi.spyOn(fs, "pathExists").mockImplementation(() => Promise.resolve(true));

    orchestrator = new TypeSyncOrchestrator();
    mockConfig = {
      apiUrl: "http://localhost:8000",
      outputDir: "./generated",
      features: {
        client: true,
        hooks: true,
        streaming: true,
        aiHooks: true,
      },
      performance: {
        enableMonitoring: true,
        enableIncrementalGeneration: true,
        maxConcurrency: 4,
        cacheTimeout: 300000,
      },
    };

    // Setup mocks
    mockFs.ensureDir.mockResolvedValue(undefined);
    mockFs.writeFile.mockResolvedValue(undefined);
    mockFs.stat.mockResolvedValue({ mtime: new Date() } as any);

    // Initialize orchestrator
    await orchestrator.initialize(mockConfig);
  });

  describe("Performance Monitoring", () => {
    it("should track extraction timing", async () => {
      const mockSchema: OpenAPISchema = {
        openapi: "3.0.0",
        info: { title: "Test API", version: "1.0.0" },
        paths: {},
      };

      // Mock fetch to return schema
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockSchema),
      });

      const result = await orchestrator.syncOnce(mockConfig);

      expect(result.performance).toBeDefined();
      expect(result.performance?.extractionTime).toBeGreaterThan(0);
      expect(result.performance?.generationTime).toBeGreaterThan(0);
      expect(result.performance?.cacheTime).toBeGreaterThanOrEqual(0);
    });

    it("should track parallel job execution", async () => {
      const mockSchema: OpenAPISchema = {
        openapi: "3.0.0",
        info: { title: "Test API", version: "1.0.0" },
        paths: {
          "/users": {
            get: {
              responses: { "200": { description: "Success" } },
            },
          },
          "/posts": {
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

      const result = await orchestrator.syncOnce(mockConfig);

      expect(result.performance?.parallelJobs).toBeGreaterThan(0);
    });
  });

  describe("Incremental Generation", () => {
    it("should detect unchanged schema and skip generation", async () => {
      const mockSchema: OpenAPISchema = {
        openapi: "3.0.0",
        info: { title: "Test API", version: "1.0.0" },
        paths: {},
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockSchema),
      });

      // First run
      const result1 = await orchestrator.syncOnce(mockConfig);
      expect(result1.fromCache).toBe(false);

      // Second run with same schema should use cache
      const result2 = await orchestrator.syncOnce(mockConfig);
      expect(result2.fromCache).toBe(true);
    });

    it("should regenerate when schema changes", async () => {
      const mockSchema1: OpenAPISchema = {
        openapi: "3.0.0",
        info: { title: "Test API", version: "1.0.0" },
        paths: {},
      };

      const mockSchema2: OpenAPISchema = {
        openapi: "3.0.0",
        info: { title: "Test API", version: "1.0.0" },
        paths: {
          "/users": {
            get: {
              responses: { "200": { description: "Success" } },
            },
          },
        },
      };

      // First run
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockSchema1),
      });

      const result1 = await orchestrator.syncOnce(mockConfig);
      expect(result1.fromCache).toBe(false);

      // Second run with different schema should regenerate
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockSchema2),
      });

      const result2 = await orchestrator.syncOnce(mockConfig);
      expect(result2.fromCache).toBe(false);
    });
  });

  describe("AI Hook Generation", () => {
    it("should generate AI hooks for detected endpoints", async () => {
      const mockSchema: OpenAPISchema = {
        openapi: "3.0.0",
        info: { title: "Test API", version: "1.0.0" },
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

      const result = await orchestrator.syncOnce(mockConfig);

      expect(result.filesGenerated).toBeGreaterThan(0);
      expect(result.artifacts).toContain("ai-hooks.ts");
    });
  });

  describe("Error Handling and Recovery", () => {
    it("should handle network errors gracefully", async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

      await expect(orchestrator.syncOnce(mockConfig)).rejects.toThrow(
        "Network error"
      );
    });

    it("should handle invalid schema gracefully", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ invalid: "schema" }),
      });

      await expect(orchestrator.syncOnce(mockConfig)).rejects.toThrow();
    });

    it("should handle file system errors gracefully", async () => {
      const mockSchema: OpenAPISchema = {
        openapi: "3.0.0",
        info: { title: "Test API", version: "1.0.0" },
        paths: {},
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockSchema),
      });

      mockFs.writeFile.mockRejectedValue(new Error("Permission denied"));

      await expect(orchestrator.syncOnce(mockConfig)).rejects.toThrow(
        "Permission denied"
      );
    });
  });

  // Watch mode tests removed - startWatchMode method does not exist in current API
});

describe("Enhanced Cache System", () => {
  let cache: GenerationCache;
  const tempDir = path.join(process.cwd(), "temp-cache");

  beforeEach(() => {
    cache = new GenerationCache(tempDir);
    // No need to call await cache.initialize();
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  it("should store and retrieve cached results", async () => {
    const key = "test-schema";
    const data = {
      schema: { openapi: "3.0.0" },
      results: { generated: "code" },
      timestamp: Date.now(),
      version: "1.0",
    };

    await cache.set(key, data);
    const retrieved = await cache.get(key);

    expect(retrieved).toEqual(data);
  });

  it("should handle cache expiration", async () => {
    const cache = new GenerationCache(tempDir, { timeout: 100 }); // 100ms TTL
    // No need to call await cache.initialize();

    const key = "test-key";
    const data = {
      schema: { openapi: "3.0.0" },
      results: { test: "data" },
      timestamp: Date.now(),
      version: "1.0",
    };

    await cache.set(key, data);
    expect(await cache.get(key)).toEqual(expect.objectContaining(data));

    // Advance fake timers instead of real delay
    vi.advanceTimersByTime(150);
    await vi.runOnlyPendingTimersAsync();

    expect(await cache.get(key)).toBeNull();
  });
});

describe("Enhanced OpenAPI Extractor", () => {
  let extractor: OpenAPIExtractor;

  beforeEach(() => {
    extractor = new OpenAPIExtractor();
  });

  it("should retry on network failures", async () => {
    let attempts = 0;
    global.fetch = vi.fn().mockImplementation(() => {
      attempts++;
      if (attempts < 3) {
        return Promise.reject(new Error("Network error"));
      }
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            openapi: "3.0.0",
            info: { title: "Test API", version: "1.0.0" },
            paths: {},
          }),
      });
    });

    const result = await extractor.extractFromFastAPI(
      "http://localhost:8000",
      "/tmp/openapi.json"
    );

    expect(attempts).toBe(3);
    expect(result).toBeDefined();
    expect(result.schema).toBeDefined();
    expect(result.schema.info.title).toBe("Test API");
  });

  it("should validate extracted schema", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          invalid: "schema",
        }),
    });

    await expect(
      extractor.extractFromFastAPI("http://localhost:8000", "/tmp/openapi.json")
    ).rejects.toThrow();
  });
});

describe("Enhanced AI Hook Generator", () => {
  let generator: AIHookGenerator;

  beforeEach(() => {
    generator = new AIHookGenerator();
  });

  it("should detect AI endpoints from schema", async () => {
    const mockSchema: OpenAPISchema = {
      openapi: "3.0.0",
      info: { title: "Test API", version: "1.0.0" },
      paths: {
        "/ai/chat": {
          post: {
            responses: { "200": { description: "Success" } },
          },
        },
        "/ai/models": {
          get: {
            responses: { "200": { description: "Success" } },
          },
        },
        "/users": {
          get: {
            responses: { "200": { description: "Success" } },
          },
        },
      },
    };

    const result = await generator.generate(mockSchema, {
      outputDir: "/tmp/hooks",
    });

    expect(result.path).toBe("/tmp/hooks/ai-hooks.ts");
    expect(result.content).toContain("useChatStream");
    expect(result.content).toContain("useAIModels");
    expect(result.content).not.toContain("useUsers");
  });

  it("should generate provider-specific hooks", async () => {
    const mockSchema: OpenAPISchema = {
      openapi: "3.0.0",
      info: { title: "Test API", version: "1.0.0" },
      paths: {
        "/ai/ollama/chat": {
          post: {
            responses: { "200": { description: "Success" } },
          },
        },
      },
    };

    const result = await generator.generate(mockSchema, {
      outputDir: "/tmp/hooks",
      defaultProvider: "ollama",
    });

    expect(result.content).toContain("ollama");
  });
});
