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
    createMockSchema: () => any;
    createMockConfig: () => any;
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
        post: {
          operationId: "createUser",
          summary: "Create a new user",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/UserCreate" },
              },
            },
          },
          responses: {
            "201": {
              description: "User created",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/User" },
                },
              },
            },
          },
        },
      },
      "/users/{id}": {
        get: {
          operationId: "getUser",
          summary: "Get user by ID",
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: {
            "200": {
              description: "User details",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/User" },
                },
              },
            },
            "404": {
              description: "User not found",
            },
          },
        },
      },
    },
    components: {
      schemas: {
        User: {
          type: "object",
          required: ["id", "email"],
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
              description: "User full name",
            },
            age: {
              type: "integer",
              minimum: 0,
              maximum: 120,
              description: "User age",
            },
            profile: {
              $ref: "#/components/schemas/UserProfile",
            },
            status: {
              $ref: "#/components/schemas/UserStatus",
            },
            createdAt: {
              type: "string",
              format: "date-time",
              description: "Account creation timestamp",
            },
          },
        },
        UserCreate: {
          type: "object",
          required: ["email"],
          properties: {
            email: {
              type: "string",
              format: "email",
            },
            name: {
              type: "string",
            },
            age: {
              type: "integer",
              minimum: 0,
              maximum: 120,
            },
          },
        },
        UserProfile: {
          type: "object",
          properties: {
            bio: {
              type: "string",
              description: "User biography",
            },
            avatar: {
              type: "string",
              format: "uri",
              description: "Avatar image URL",
            },
            preferences: {
              type: "object",
              additionalProperties: { type: "string" },
            },
          },
        },
        UserStatus: {
          type: "string",
          enum: ["active", "inactive", "suspended", "pending"],
          description: "User account status",
        },
      },
    },
  };
}

// Create mock configuration
function createMockConfig() {
  return {
    apiUrl: "http://localhost:8000",
    outputDir: "./src/generated",
    features: {
      client: true,
      hooks: true,
      streaming: false,
      aiHooks: false,
      types: true,
    },
    extraction: {
      timeout: 10000,
      retries: 2,
      enableCache: true,
    },
    cache: {
      enabled: true,
      timeout: 300000,
      enableCompression: true,
    },
    performance: {
      enableMonitoring: true,
      maxConcurrency: 2,
    },
    generators: {
      typescript: {
        outputDir: "./src/generated",
        enabled: true,
        options: {
          generateComments: true,
          enumType: "union",
        },
      },
      "api-client": {
        outputDir: "./src/generated",
        enabled: true,
        options: {
          enableAI: false,
          authentication: "bearer",
        },
      },
      "react-hooks": {
        outputDir: "./src/generated",
        enabled: true,
        options: {
          enableInfiniteQueries: true,
        },
      },
    },
  };
}

// Make utilities available globally
globalThis.testUtils = {
  createTempDir,
  cleanupTempDir,
  createMockSchema,
  createMockConfig,
};

// Mock filesystem operations by default
vi.mock("fs-extra", () => ({
  ensureDir: vi.fn().mockResolvedValue(undefined),
  writeFile: vi.fn().mockResolvedValue(undefined),
  readFile: vi.fn().mockResolvedValue(""),
  pathExists: vi.fn().mockResolvedValue(true),
  remove: vi.fn().mockResolvedValue(undefined),
  mkdtemp: vi
    .fn()
    .mockImplementation(() =>
      Promise.resolve("/tmp/test-" + Math.random().toString(36).substring(7))
    ),
}));

// Mock performance API
const mockPerformanceNow = vi.fn(() => Date.now());
vi.stubGlobal("performance", {
  now: mockPerformanceNow,
});

// Mock process.memoryUsage
vi.spyOn(process, "memoryUsage").mockReturnValue({
  rss: 50 * 1024 * 1024,
  heapTotal: 30 * 1024 * 1024,
  heapUsed: 20 * 1024 * 1024,
  external: 5 * 1024 * 1024,
  arrayBuffers: 1 * 1024 * 1024,
});

// Reset mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
  mockPerformanceNow.mockImplementation(() => Date.now());
});

// Cleanup after each test
afterEach(() => {
  vi.restoreAllMocks();
});

// Increase test timeout for longer operations
vi.setConfig({
  testTimeout: 10000,
  hookTimeout: 5000,
});
