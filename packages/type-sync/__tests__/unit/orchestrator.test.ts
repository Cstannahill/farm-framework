import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { TypeSyncOrchestrator } from "../../src/orchestrator";
import { OpenAPIExtractor } from "../../src/extractors/openapi";
import { GenerationCache } from "../../src/cache";
import type { SyncOptions } from "@farm-framework/types";

// Mock dependencies
vi.mock("../../src/extractors/openapi");
vi.mock("../../src/cache");
vi.mock("../../src/generators/typescript");
vi.mock("../../src/generators/api-client");
vi.mock("../../src/generators/react-hooks");
vi.mock("../../src/generators/ai-hooks");

describe("TypeSyncOrchestrator", () => {
  let orchestrator: TypeSyncOrchestrator;
  let mockExtractor: jest.Mocked<OpenAPIExtractor>;
  let mockCache: jest.Mocked<GenerationCache>;

  beforeEach(() => {
    orchestrator = new TypeSyncOrchestrator();
    mockExtractor = vi.mocked(new OpenAPIExtractor());
    mockCache = vi.mocked(new GenerationCache(""));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("initialization", () => {
    it("should initialize with default generators", () => {
      expect(orchestrator).toBeDefined();
      // Test that default generators are registered
    });

    it("should accept custom configuration", async () => {
      const config: SyncOptions = {
        apiUrl: "http://test-api:8000",
        outputDir: "./test-output",
        features: {
          client: true,
          hooks: true,
          streaming: false,
          aiHooks: false,
        },
      };

      await expect(orchestrator.initialize(config)).resolves.not.toThrow();
    });

    it("should validate configuration", async () => {
      const invalidConfig = {
        apiUrl: "", // Invalid empty URL
        outputDir: "/invalid/path",
      } as SyncOptions;

      await expect(orchestrator.initialize(invalidConfig)).rejects.toThrow();
    });
  });

  describe("schema extraction", () => {
    it("should extract schema successfully", async () => {
      const mockSchema = {
        openapi: "3.0.0",
        info: { title: "Test API", version: "1.0.0" },
        paths: {},
      };

      mockExtractor.extractFromFastAPI.mockResolvedValue({
        schema: mockSchema,
        source: "running-server",
        extractionTime: 100,
      });

      const config: SyncOptions = {
        apiUrl: "http://localhost:8000",
        outputDir: "./output",
      };

      await orchestrator.initialize(config);
      const result = await orchestrator.syncOnce();

      expect(result.success).toBe(true);
      expect(result.extractionTime).toBeDefined();
    });

    it("should handle extraction failures gracefully", async () => {
      mockExtractor.extractFromFastAPI.mockRejectedValue(
        new Error("API server not available")
      );

      const config: SyncOptions = {
        apiUrl: "http://localhost:8000",
        outputDir: "./output",
      };

      await orchestrator.initialize(config);
      const result = await orchestrator.syncOnce();

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe("caching", () => {
    it("should use cached results when available", async () => {
      const mockCachedResult = {
        /* cached generation result */
      };
      mockCache.get.mockResolvedValue(mockCachedResult);

      const config: SyncOptions = {
        apiUrl: "http://localhost:8000",
        outputDir: "./output",
        cache: { enabled: true },
      };

      await orchestrator.initialize(config);
      const result = await orchestrator.syncOnce();

      expect(mockCache.get).toHaveBeenCalled();
      expect(result.fromCache).toBe(true);
    });

    it("should store results in cache after generation", async () => {
      mockCache.get.mockResolvedValue(null); // No cached result
      mockCache.set.mockResolvedValue(undefined);

      const mockSchema = {
        openapi: "3.0.0",
        info: { title: "Test API", version: "1.0.0" },
        paths: {},
      };

      mockExtractor.extractFromFastAPI.mockResolvedValue({
        schema: mockSchema,
        source: "running-server",
        extractionTime: 100,
      });

      const config: SyncOptions = {
        apiUrl: "http://localhost:8000",
        outputDir: "./output",
        cache: { enabled: true },
      };

      await orchestrator.initialize(config);
      await orchestrator.syncOnce();

      expect(mockCache.set).toHaveBeenCalled();
    });
  });

  describe("error handling", () => {
    it("should provide detailed error information", async () => {
      const extractionError = new Error("Network timeout");
      mockExtractor.extractFromFastAPI.mockRejectedValue(extractionError);

      const config: SyncOptions = {
        apiUrl: "http://localhost:8000",
        outputDir: "./output",
      };

      await orchestrator.initialize(config);
      const result = await orchestrator.syncOnce();

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain("Network timeout");
      expect(result.metrics).toBeDefined();
    });

    it("should attempt fallback strategies on failure", async () => {
      // Test fallback to cached schema when extraction fails
      mockExtractor.extractFromFastAPI
        .mockRejectedValueOnce(new Error("Primary extraction failed"))
        .mockResolvedValueOnce({
          schema: {
            /* fallback schema */
          },
          source: "cache",
          extractionTime: 50,
        });

      const config: SyncOptions = {
        apiUrl: "http://localhost:8000",
        outputDir: "./output",
        fallback: { useCache: true },
      };

      await orchestrator.initialize(config);
      const result = await orchestrator.syncOnce();

      expect(result.success).toBe(true);
      expect(result.source).toBe("cache");
    });
  });

  describe("performance monitoring", () => {
    it("should track performance metrics", async () => {
      const mockSchema = {
        openapi: "3.0.0",
        info: { title: "Test API", version: "1.0.0" },
        paths: {},
      };

      mockExtractor.extractFromFastAPI.mockResolvedValue({
        schema: mockSchema,
        source: "running-server",
        extractionTime: 150,
      });

      const config: SyncOptions = {
        apiUrl: "http://localhost:8000",
        outputDir: "./output",
        performance: { enableMonitoring: true },
      };

      await orchestrator.initialize(config);
      const result = await orchestrator.syncOnce();

      expect(result.metrics).toBeDefined();
      expect(result.metrics?.extractionTime).toBeGreaterThan(0);
      expect(result.metrics?.totalFiles).toBeGreaterThanOrEqual(0);
    });
  });

  describe("generator management", () => {
    it("should register custom generators", () => {
      const customGenerator = {
        generate: vi.fn().mockResolvedValue({
          path: "./custom-output.ts",
          checksum: "abc123",
        }),
      };

      orchestrator.registerGenerator("custom", customGenerator);

      // Test that custom generator is registered and can be used
      expect(() =>
        orchestrator.registerGenerator("custom", customGenerator)
      ).not.toThrow();
    });

    it("should execute generators in parallel when possible", async () => {
      const mockSchema = {
        openapi: "3.0.0",
        info: { title: "Test API", version: "1.0.0" },
        paths: {},
      };

      mockExtractor.extractFromFastAPI.mockResolvedValue({
        schema: mockSchema,
        source: "running-server",
        extractionTime: 100,
      });

      const config: SyncOptions = {
        apiUrl: "http://localhost:8000",
        outputDir: "./output",
        features: {
          client: true,
          hooks: true,
          streaming: false,
          aiHooks: false,
        },
        performance: { maxConcurrency: 2 },
      };

      const startTime = Date.now();
      await orchestrator.initialize(config);
      const result = await orchestrator.syncOnce();
      const endTime = Date.now();

      expect(result.success).toBe(true);
      // Parallel execution should be faster than sequential
      expect(endTime - startTime).toBeLessThan(1000);
    });
  });
});
