// tools/codegen/src/__tests__/test-utils.ts

import { OpenAPISchema } from "../schema/extractor";

/**
 * Create a test FastAPI application with sample endpoints for testing
 */
export function createTestFastAPIApp(): any {
  // Mock FastAPI app for testing
  const app = {
    title: "Test API",
    version: "1.0.0",
    openapi: "3.0.0",
    paths: {
      "/users": {
        get: {
          summary: "Get users",
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
        post: {
          summary: "Create user",
          requestBody: {
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/CreateUserRequest" },
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
      "/users/{userId}": {
        get: {
          summary: "Get user by ID",
          parameters: [
            {
              name: "userId",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: {
            "200": {
              description: "User found",
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
          properties: {
            id: { type: "string" },
            name: { type: "string" },
            email: { type: "string", format: "email" },
            created_at: { type: "string", format: "date-time" },
            is_active: { type: "boolean", default: true },
          },
          required: ["id", "name", "email"],
        },
        CreateUserRequest: {
          type: "object",
          properties: {
            name: { type: "string" },
            email: { type: "string", format: "email" },
            is_active: { type: "boolean", default: true },
          },
          required: ["name", "email"],
        },
      },
    },
  };

  return app;
}

/**
 * Sample OpenAPI schema for testing
 */
export const sampleSchema: OpenAPISchema = {
  openapi: "3.0.0",
  info: {
    title: "Sample API",
    version: "1.0.0",
    description: "A sample API for testing type generation",
  },
  paths: {
    "/items": {
      get: {
        summary: "List items",
        responses: {
          "200": {
            description: "Successful response",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/Item" },
                },
              },
            },
          },
        },
      },
      post: {
        summary: "Create item",
        requestBody: {
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateItemRequest" },
            },
          },
        },
        responses: {
          "201": {
            description: "Item created",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Item" },
              },
            },
          },
        },
      },
    },
    "/items/{itemId}": {
      get: {
        summary: "Get item by ID",
        parameters: [
          {
            name: "itemId",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": {
            description: "Item found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Item" },
              },
            },
          },
        },
      },
    },
  },
  components: {
    schemas: {
      Item: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          description: { type: "string" },
          price: { type: "number", format: "float" },
          category: { $ref: "#/components/schemas/Category" },
          tags: {
            type: "array",
            items: { type: "string" },
          },
          metadata: {
            type: "object",
            additionalProperties: true,
          },
          created_at: { type: "string", format: "date-time" },
          updated_at: { type: "string", format: "date-time" },
        },
        required: ["id", "name", "price"],
      },
      CreateItemRequest: {
        type: "object",
        properties: {
          name: { type: "string" },
          description: { type: "string" },
          price: { type: "number", format: "float" },
          category_id: { type: "string" },
          tags: {
            type: "array",
            items: { type: "string" },
          },
          metadata: {
            type: "object",
            additionalProperties: true,
          },
        },
        required: ["name", "price"],
      },
      Category: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          slug: { type: "string" },
          parent_id: { type: "string" },
        },
        required: ["id", "name", "slug"],
      },
    },
  },
};

/**
 * Create a minimal test schema for basic testing
 */
export function createMinimalTestSchema(): OpenAPISchema {
  return {
    openapi: "3.0.0",
    info: {
      title: "Minimal Test API",
      version: "1.0.0",
    },
    paths: {
      "/health": {
        get: {
          summary: "Health check",
          responses: {
            "200": {
              description: "OK",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      status: { type: "string" },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    components: {
      schemas: {},
    },
  };
}

/**
 * Helper to create test output directory
 */
export async function createTestOutputDir(name: string): Promise<string> {
  const { mkdtemp, mkdir } = await import("fs/promises");
  const { join } = await import("path");
  const { tmpdir } = await import("os");

  const tempDir = await mkdtemp(join(tmpdir(), `codegen-test-${name}-`));
  await mkdir(join(tempDir, "generated"), { recursive: true });

  return tempDir;
}

/**
 * Helper to clean up test files
 */
export async function cleanupTestDir(dirPath: string): Promise<void> {
  const { rm } = await import("fs/promises");

  try {
    await rm(dirPath, { recursive: true, force: true });
  } catch (error) {
    // Ignore cleanup errors
    console.warn(`Failed to cleanup test directory: ${dirPath}`);
  }
}
