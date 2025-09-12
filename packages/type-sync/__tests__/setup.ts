/**
 * Test setup file for @farm-framework/type-sync
 * Configures global test utilities, mocks, and environment
 */

import { vi, beforeEach, afterEach } from "vitest";
import fs from "fs-extra";
import path from "path";
import os from "os";

// Global test utilities
declare global {
  var testUtils: {
    createTempDir: () => Promise<string>;
    cleanupTempDir: (dir: string) => Promise<void>;
    createMockSchema: () => object;
    createMockConfig: () => object;
  };
}

// Create temporary directory for tests
async function createTempDir(): Promise<string> {
  const tmpDir = await fs.mkdtemp(
    path.join(os.tmpdir(), "farm-type-sync-test-")
  );
  return tmpDir;
}

// Cleanup temporary directory
async function cleanupTempDir(dir: string): Promise<void> {
  try {
    await fs.remove(dir);
  } catch (error) {
    console.warn(`Failed to cleanup temp dir ${dir}:`, error);
  }
}

// Create mock OpenAPI schema
function createMockSchema() {
  return {
    openapi: "3.0.0",
    info: {
      title: "Test API",
      version: "1.0.0",
      description: "A test API for unit testing",
    },
    servers: [{ url: "http://localhost:8000", description: "Local server" }],
    paths: {
      "/users": {
        get: {
          operationId: "getUsers",
          summary: "Get all users",
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
          required: ["id", "email", "name"],
          properties: {
            id: {
              type: "string",
              description: "Unique user identifier",
            },
            email: {
              type: "string",
              format: "email",
              description: "User email address",
            },
            name: {
              type: "string",
              description: "User display name",
            },
          },
        },
      },
    },
  };
}

// Create mock configuration
function createMockConfig() {
  return {
    apiUrl: "http://localhost:8000",
    outputDir: "./test-output",
    features: {
      client: true,
      hooks: true,
      streaming: false,
      aiHooks: false,
    },
    performance: {
      enableMonitoring: true,
      enableIncrementalGeneration: true,
      maxConcurrency: 4,
      cacheTimeout: 300000,
    },
    generators: {
      typescript: {
        enumType: "union",
        strict: true,
        generateComments: true,
      },
      apiClient: {
        httpClient: "fetch",
        baseURL: "http://localhost:8000",
      },
    },
  };
}

// Mock fs-extra with proper default export
vi.mock("fs-extra", () => {
  const actualFs = {
    ensureDir: vi.fn().mockResolvedValue(undefined),
    pathExists: vi.fn().mockResolvedValue(false),
    readFile: vi.fn().mockResolvedValue(""),
    writeFile: vi.fn().mockResolvedValue(undefined),
    readJson: vi.fn().mockResolvedValue({}),
    writeJson: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
    emptyDir: vi.fn().mockResolvedValue(undefined),
    mkdtemp: vi.fn().mockImplementation(() => Promise.resolve("/tmp/test-dir")),
  };

  return {
    default: actualFs,
    ...actualFs,
  };
});

// Set up global utilities
(globalThis as any).testUtils = {
  createTempDir,
  cleanupTempDir,
  createMockSchema,
  createMockConfig,
};

// Mock fs-extra with proper default export
vi.mock("fs-extra", () => {
  const actualFs = {
    ensureDir: vi.fn().mockResolvedValue(undefined),
    pathExists: vi.fn().mockResolvedValue(false),
    readFile: vi.fn().mockResolvedValue(""),
    writeFile: vi.fn().mockResolvedValue(undefined),
    readJson: vi.fn().mockResolvedValue({}),
    writeJson: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
    emptyDir: vi.fn().mockResolvedValue(undefined),
    mkdtemp: vi.fn().mockImplementation(() => Promise.resolve("/tmp/test-dir")),
    stat: vi.fn().mockResolvedValue({ size: 0, mtime: new Date() } as any),
  };

  return {
    default: actualFs,
    ...actualFs,
  };
});

// Mock the zlib module for cache compression tests
vi.mock("zlib", () => ({
  default: {
    gzip: vi.fn((data, callback) => {
      // Check if input is already compressed
      if (Buffer.isBuffer(data) && data.toString().startsWith("compressed:")) {
        callback(null, data); // Return as-is if already compressed
        return;
      }

      const originalContent = Buffer.isBuffer(data) ? data.toString() : data;
      const compressedBuffer = Buffer.from(`compressed:${originalContent}`);
      callback(null, compressedBuffer);
    }),
    gunzip: vi.fn((data, callback) => {
      try {
        const dataStr = Buffer.isBuffer(data) ? data.toString() : String(data);
        if (dataStr.startsWith("compressed:")) {
          const original = dataStr.replace("compressed:", "");
          callback(null, Buffer.from(original));
        } else {
          // If not compressed format, return original
          callback(
            null,
            Buffer.isBuffer(data) ? data : Buffer.from(String(data))
          );
        }
      } catch (error) {
        callback(error, null);
      }
    }),
  },
  gzip: vi.fn((data, callback) => {
    const originalContent = Buffer.isBuffer(data) ? data.toString() : data;
    const compressedBuffer = Buffer.from(`compressed:${originalContent}`);
    callback(null, compressedBuffer);
  }),
  gunzip: vi.fn((data, callback) => {
    try {
      const dataStr = Buffer.isBuffer(data) ? data.toString() : String(data);
      if (dataStr.startsWith("compressed:")) {
        const original = dataStr.replace("compressed:", "");
        callback(null, Buffer.from(original));
      } else {
        callback(
          null,
          Buffer.isBuffer(data) ? data : Buffer.from(String(data))
        );
      }
    } catch (error) {
      callback(error, null);
    }
  }),
}));

// Mock chokidar
vi.mock("chokidar", () => ({
  watch: vi.fn(() => ({
    on: vi.fn(),
    close: vi.fn(),
  })),
}));

// Performance monitoring global
const mockPerformanceNow = vi.fn(() => Date.now());
vi.stubGlobal("performance", {
  now: mockPerformanceNow,
  mark: vi.fn(),
  measure: vi.fn(),
  getEntriesByName: vi.fn(() => []),
  getEntriesByType: vi.fn(() => []),
  clearMarks: vi.fn(),
  clearMeasures: vi.fn(),
});

// Mock process.memoryUsage
vi.spyOn(process, "memoryUsage").mockReturnValue({
  rss: 50 * 1024 * 1024,
  heapTotal: 30 * 1024 * 1024,
  heapUsed: 20 * 1024 * 1024,
  external: 5 * 1024 * 1024,
  arrayBuffers: 1 * 1024 * 1024,
});

// Global setup and cleanup hooks
beforeEach(async () => {
  vi.clearAllMocks();

  // Reset performance mocks
  mockPerformanceNow.mockReturnValue(Date.now());
});

afterEach(async () => {
  vi.restoreAllMocks();
});

// Increase test timeout for longer operations
vi.setConfig({
  testTimeout: 10000,
  hookTimeout: 5000,
});
