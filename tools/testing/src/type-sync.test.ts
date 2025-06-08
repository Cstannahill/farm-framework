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
import { TypeSyncOrchestrator } from "../../../packages/type-sync/src/orchestrator";
import { TypeSyncWatcher } from "../../../packages/type-sync/src/watcher";
import { GenerationCache } from "../../../packages/type-sync/src/cache";
import { TypeDiffer } from "../../../packages/type-sync/src/type-sync";
import type { OpenAPISchema } from "../../../packages/type-sync/src/types";
import type {
  SyncOptions,
  SyncResult,
} from "../../../packages/type-sync/src/orchestrator";
import fs from "fs-extra";
import path from "path";
import chokidar from "chokidar";
import crypto from "crypto";
import { OpenAPIExtractor } from "../../../packages/type-sync/src/extractors/openapi";
import { TypeScriptGenerator } from "../../../packages/type-sync/src/generators/typescript";

// Mock external dependencies
vi.mock("fs-extra");
vi.mock("chokidar");
vi.mock("child_process");

const mockFs = vi.mocked(fs);
const mockChokidar = vi.mocked(chokidar);

describe("Type-Sync Package", () => {
  // Use fake timers for all tests
  beforeAll(() => {
    vi.useFakeTimers();
  });
  afterAll(() => {
    vi.useRealTimers();
  });

  describe("TypeSyncOrchestrator", () => {
    let orchestrator: TypeSyncOrchestrator;
    let mockConfig: SyncOptions;

    beforeEach(() => {
      orchestrator = new TypeSyncOrchestrator();
      mockConfig = {
        apiUrl: "http://localhost:8000",
        outputDir: ".farm/types",
        features: {
          client: true,
          hooks: true,
          streaming: false,
        },
      };

      // Reset mocks
      mockFs.ensureDir.mockResolvedValue(undefined);
      mockFs.readJson.mockResolvedValue({});
      mockFs.writeFile.mockResolvedValue(undefined);
    });

    afterEach(() => {
      vi.clearAllMocks();
    });

    describe("initialization", () => {
      it("should initialize with valid config", async () => {
        await expect(
          orchestrator.initialize(mockConfig)
        ).resolves.not.toThrow();
        expect(mockFs.ensureDir).toHaveBeenCalledWith(".farm/types");
      });
    });
  });

  describe("GenerationCache", () => {
    let cache: GenerationCache;
    const cacheDir = ".farm/test-cache";

    beforeEach(() => {
      cache = new GenerationCache(cacheDir);

      // reset & prime the fs mocks
      mockFs.readJson.mockReset();
      mockFs.writeJson.mockReset();
      mockFs.ensureDir.mockResolvedValue(undefined);
    });

    /* ––––––––––––– schema‑hashing ––––––––––––– */

    describe("schema hashing", () => {
      it("generates the same hash for identical schemas", () => {
        const schema = {
          openapi: "3.0.0",
          info: { title: "Test", version: "1.0.0" },
        };

        const hash1 = cache.hashSchema(schema);
        const hash2 = cache.hashSchema({ ...schema });

        expect(hash1).toBe(hash2);
        expect(hash1).toMatch(/^[a-f0-9]{64}$/); // SHA‑256 hex
      });
    });

    /* ––––––––––––– read / write ––––––––––––– */

    describe("cache read/write", () => {
      it("writes a cache file and reads it back", async () => {
        const schema = {
          openapi: "3.0.0",
          info: { title: "Test", version: "1.0.0" },
        };
        const hash = cache.hashSchema(schema);
        const data = { schema, results: { types: "export type Foo = {}" } };

        /* 1️⃣  allow cache.set() to run – we don’t care how many readJson
               calls it makes; by default the mock returns undefined */
        mockFs.writeJson.mockResolvedValue(undefined);

        await cache.set(hash, data);

        /* path check (tolerates absolute or relative form) */
        expect(mockFs.writeJson).toHaveBeenCalledWith(
          expect.stringContaining(`${hash}.json`),
          data
        );

        /* 2️⃣  every subsequent readJson (used by cache.get) returns the data */
        mockFs.readJson.mockResolvedValue(data);

        const result = await cache.get(hash);
        expect(result).toEqual(data);
      });
    });
  });

  describe("TypeDiffer", () => {
    let differ: TypeDiffer;

    beforeEach(() => {
      differ = new TypeDiffer();
    });

    describe("schema comparison", () => {
      it("should detect identical schemas", () => {
        const schema1 = { openapi: "3.0.0", info: { title: "Test" } };
        const schema2 = { openapi: "3.0.0", info: { title: "Test" } };
      });
    });

    beforeEach(() => {
      differ = new TypeDiffer();
    });

    describe("schema comparison", () => {
      it("should detect identical schemas", () => {
        const schema1 = { openapi: "3.0.0", info: { title: "Test" } };
        const schema2 = { openapi: "3.0.0", info: { title: "Test" } };

        const hasChanges = differ.hasSchemaChanges(schema1, schema2);
        expect(hasChanges).toBe(false);
      });

      it("should detect schema differences", () => {
        const schema1 = { openapi: "3.0.0", info: { title: "Test1" } };
        const schema2 = { openapi: "3.0.0", info: { title: "Test2" } };

        const hasChanges = differ.hasSchemaChanges(schema1, schema2);
        expect(hasChanges).toBe(true);
      });

      it("should handle nested object changes", () => {
        const schema1 = {
          openapi: "3.0.0",
          components: {
            schemas: {
              User: {
                type: "object",
                properties: { name: { type: "string" } },
              },
            },
          },
        };
        const schema2 = {
          openapi: "3.0.0",
          components: {
            schemas: {
              User: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  age: { type: "number" },
                },
              },
            },
          },
        };

        const hasChanges = differ.hasSchemaChanges(schema1, schema2);
        expect(hasChanges).toBe(true);
      });
    });

    describe("directory comparison", () => {
      it("should detect missing files", async () => {
        mockFs.readdir.mockImplementation(async () => ["file1.ts", "file2.ts"]);
        mockFs.existsSync.mockReturnValueOnce(true).mockReturnValueOnce(false);
        mockFs.readFile.mockImplementation(async () => "content");

        const diffs = await differ.compareDirectories("/dirA", "/dirB");

        expect(diffs).toContainEqual({
          file: "file2.ts",
          message: "missing in B",
        });
      });

      it("should detect content differences", async () => {
        mockFs.readdir.mockImplementation(async () => ["file1.ts"]);
        mockFs.existsSync.mockReturnValue(true);
        let call = 0;
        mockFs.readFile.mockImplementation(async () => {
          call++;
          return call === 1 ? "original content" : "modified content";
        });

        const diffs = await differ.compareDirectories("/dirA", "/dirB");

        expect(diffs).toContainEqual({
          file: "file1.ts",
          message: "content differs",
        });
      });

      it("should return empty array for identical directories", async () => {
        mockFs.readdir.mockImplementation(async () => ["file1.ts"]);
        mockFs.existsSync.mockReturnValue(true);
        mockFs.readFile.mockImplementation(async () => "same content");

        const diffs = await differ.compareDirectories("/dirA", "/dirB");

        expect(diffs).toEqual([]);
      });
    });
  });

  //   describe("OpenAPIExtractor", () => {
  //     let extractor: OpenAPIExtractor;

  //     beforeEach(() => {
  //       extractor = new OpenAPIExtractor();
  //     });

  //     describe("FastAPI extraction", () => {
  //       it("should extract OpenAPI schema with default options", async () => {
  //         mockFs.ensureDir.mockResolvedValue(undefined);

  //         // Mock successful extraction (would need proper spawn mocking)
  //         await expect(
  //           extractor.extractFromFastAPI(".", "output.json")
  //         ).resolves.not.toThrow();

  //         expect(mockFs.ensureDir).toHaveBeenCalled();
  //       });

  //       it("should handle extraction with custom options", async () => {
  //         const options = {
  //           host: "custom-host",
  //           port: 9000,
  //           timeout: 60000,
  //         };

  //         await expect(
  //           extractor.extractFromFastAPI(".", "output.json", options)
  //         ).resolves.not.toThrow();
  //       });
  //     });
  //   });

  //   describe("Integration Tests", () => {
  //     describe("end-to-end workflow", () => {
  //       it("should perform complete type sync workflow", async () => {
  //         const orchestrator = new TypeSyncOrchestrator();
  //         const config: SyncOptions = {
  //           apiUrl: "http://localhost:8000",
  //           outputDir: ".farm/integration-test",
  //           features: {
  //             client: true,
  //             hooks: true,
  //             streaming: false,
  //           },
  //         };

  //         // Mock schema data
  //         const mockSchema = createMockSchema();
  //         mockFs.readJson.mockResolvedValue(mockSchema);
  //         mockFs.ensureDir.mockResolvedValue(undefined);

  //         await orchestrator.initialize(config);
  //         const result = await orchestrator.syncOnce();

  //         expect(result).toMatchObject({
  //           filesGenerated: expect.any(Number),
  //           fromCache: expect.any(Boolean),
  //         });
  //       });

  //       it("should handle watcher integration with orchestrator", async () => {
  //         const orchestrator = new TypeSyncOrchestrator();
  //         const watcher = new TypeSyncWatcher(orchestrator);

  //         const config: SyncOptions = {
  //           apiUrl: "http://localhost:8000",
  //           outputDir: ".farm/watcher-test",
  //           features: { client: true, hooks: true, streaming: false },
  //         };

  //         await orchestrator.initialize(config);
  //         await watcher.start();

  //         expect(mockChokidar.watch).toHaveBeenCalled();

  //         await watcher.stop();
  //         expect(mockWatcherInstance.close).toHaveBeenCalled();
  //       });
  //     });

  //     describe("error handling", () => {
  //       it("should handle schema extraction failures gracefully", async () => {
  //         const orchestrator = new TypeSyncOrchestrator();
  //         await orchestrator.initialize({
  //           apiUrl: "http://invalid-url",
  //           outputDir: ".farm/error-test",
  //           features: { client: true, hooks: true, streaming: false },
  //         });

  //         mockFs.readJson.mockRejectedValue(
  //           new Error("Schema extraction failed")
  //         );

  //         await expect(orchestrator.syncOnce()).rejects.toThrow();
  //       });

  //       it("should handle file system errors", async () => {
  //         const cache = new GenerationCache(".farm/error-cache");
  //         mockFs.writeJson.mockRejectedValue(new Error("Disk full"));

  //         await expect(
  //           cache.set("test-hash", { schema: {}, results: [] })
  //         ).rejects.toThrow("Disk full");
  //       });
  //     });

  //     describe("performance considerations", () => {
  //       it("should handle large schemas efficiently", async () => {
  //         const largeSchema = createLargeSchema(1000); // 1000 endpoints
  //         const cache = new GenerationCache(".farm/perf-cache");

  //         const startTime = Date.now();
  //         const hash = cache.hashSchema(largeSchema);
  //         const duration = Date.now() - startTime;

  //         expect(hash).toBeDefined();
  //         expect(duration).toBeLessThan(1000); // Should complete within 1 second
  //       });

  //       it("should debounce file changes effectively", async () => {
  //         const orchestrator = new TypeSyncOrchestrator();
  //         const watcher = new TypeSyncWatcher(orchestrator);

  //         const syncSpy = vi.spyOn(orchestrator, "syncOnce").mockResolvedValue({
  //           filesGenerated: 1,
  //           fromCache: false,
  //         });

  //         await watcher.start();

  //         // Simulate rapid file changes
  //         const handler = mockWatcherInstance.on.mock.calls[0][1];
  //         for (let i = 0; i < 10; i++) {
  //           handler();
  //         }

  //         // Fast-forward debounce timer
  //         vi.advanceTimersByTime(600);

  //         // Should only sync once due to debouncing
  //         expect(syncSpy).toHaveBeenCalledTimes(1);
  //       });
  //     });
  //   });
});

// Helper functions for creating test data
function createMockSchema(): OpenAPISchema {
  return {
    openapi: "3.0.0",
    info: {
      title: "Test API",
      version: "1.0.0",
      description: "Test API for type-sync tests",
    },
    paths: {
      "/users": {
        get: {
          summary: "Get users",
          operationId: "getUsers",
          responses: {
            "200": {
              description: "Successful response",
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
            id: { type: "integer" },
            name: { type: "string" },
            email: { type: "string", format: "email" },
          },
          required: ["id", "name", "email"],
        },
      },
    },
  };
}

function createLargeSchema(endpointCount: number): OpenAPISchema {
  const paths: Record<string, any> = {};
  const schemas: Record<string, any> = {};

  for (let i = 0; i < endpointCount; i++) {
    paths[`/endpoint${i}`] = {
      get: {
        summary: `Endpoint ${i}`,
        operationId: `getEndpoint${i}`,
        responses: {
          "200": {
            description: "Success",
            content: {
              "application/json": {
                schema: { $ref: `#/components/schemas/Model${i}` },
              },
            },
          },
        },
      },
    };

    schemas[`Model${i}`] = {
      type: "object",
      properties: {
        id: { type: "integer" },
        name: { type: "string" },
        value: { type: "number" },
      },
    };
  }

  return {
    openapi: "3.0.0",
    info: { title: "Large API", version: "1.0.0" },
    paths,
    components: { schemas },
  };
}
