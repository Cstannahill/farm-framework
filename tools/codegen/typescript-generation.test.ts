// tools/codegen/src/__tests__/typescript-generation.test.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { join } from "path";
import { ensureDir, remove, writeFile, readFile } from "fs-extra";
import { TypeScriptGenerator } from "../generators/typescript-generator.js";
import { OpenAPISchemaExtractor } from "../schema/extractor.js";

// Mock OpenAPI schema for testing
const mockOpenAPISchema = {
  openapi: "3.0.0",
  info: {
    title: "Test API",
    version: "1.0.0",
  },
  components: {
    schemas: {
      User: {
        type: "object",
        required: ["id", "name", "email"],
        properties: {
          id: {
            type: "string",
            description: "User ID",
          },
          name: {
            type: "string",
            description: "User full name",
          },
          email: {
            type: "string",
            format: "email",
            description: "User email address",
          },
          age: {
            type: "integer",
            minimum: 0,
            description: "User age",
          },
          preferences: {
            type: "object",
            additionalProperties: true,
            description: "User preferences",
          },
          tags: {
            type: "array",
            items: {
              type: "string",
            },
            description: "User tags",
          },
          status: {
            type: "string",
            enum: ["active", "inactive", "pending"],
            description: "User status",
          },
        },
      },
      CreateUserRequest: {
        type: "object",
        required: ["name", "email"],
        properties: {
          name: {
            type: "string",
          },
          email: {
            type: "string",
            format: "email",
          },
          age: {
            type: "integer",
            minimum: 0,
          },
        },
      },
      PaginatedResponse: {
        type: "object",
        required: ["items", "total", "page", "limit"],
        properties: {
          items: {
            type: "array",
            items: {
              $ref: "#/components/schemas/User",
            },
          },
          total: {
            type: "integer",
          },
          page: {
            type: "integer",
          },
          limit: {
            type: "integer",
          },
        },
      },
    },
  },
  paths: {
    "/api/users": {
      get: {
        operationId: "listUsers",
        summary: "List users",
        parameters: [
          {
            name: "page",
            in: "query",
            schema: {
              type: "integer",
              default: 1,
            },
          },
          {
            name: "limit",
            in: "query",
            schema: {
              type: "integer",
              default: 10,
            },
          },
        ],
        responses: {
          "200": {
            description: "List of users",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/PaginatedResponse",
                },
              },
            },
          },
        },
      },
      post: {
        operationId: "createUser",
        summary: "Create user",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/CreateUserRequest",
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Created user",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/User",
                },
              },
            },
          },
        },
      },
    },
    "/api/users/{id}": {
      get: {
        operationId: "getUserById",
        summary: "Get user by ID",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: {
              type: "string",
            },
          },
        ],
        responses: {
          "200": {
            description: "User details",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/User",
                },
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
};

describe("FARM TypeScript Generation System", () => {
  const testOutputDir = join(__dirname, "../../../__test-output__/types");
  let generator: TypeScriptGenerator;

  beforeEach(async () => {
    await ensureDir(testOutputDir);
    generator = new TypeScriptGenerator();
  });

  afterEach(async () => {
    try {
      await remove(testOutputDir);
    } catch (error) {
      console.warn("Failed to cleanup test output:", error);
    }
  });

  describe("TypeScriptGenerator", () => {
    it("should generate TypeScript interfaces from OpenAPI schema", async () => {
      const result = await generator.generateFromSchema(mockOpenAPISchema, {
        outputDir: testOutputDir,
        generateApiClient: false,
        generateHooks: false,
      });

      expect(result.success).toBe(true);
      expect(result.generatedFiles).toContain(
        join(testOutputDir, "models", "index.ts")
      );

      // Check that User interface was generated
      const userTypesPath = join(testOutputDir, "models", "User.ts");
      expect(result.generatedFiles).toContain(userTypesPath);

      const userTypesContent = await readFile(userTypesPath, "utf-8");
      expect(userTypesContent).toContain("export interface User");
      expect(userTypesContent).toContain("id: string");
      expect(userTypesContent).toContain("name: string");
      expect(userTypesContent).toContain("email: string");
      expect(userTypesContent).toContain("age?: number");
      expect(userTypesContent).toContain("preferences?: Record<string, any>");
      expect(userTypesContent).toContain("tags?: string[]");
      expect(userTypesContent).toContain(
        'status?: "active" | "inactive" | "pending"'
      );
    });

    it("should handle optional and required properties correctly", async () => {
      const result = await generator.generateFromSchema(mockOpenAPISchema, {
        outputDir: testOutputDir,
        generateApiClient: false,
        generateHooks: false,
      });

      expect(result.success).toBe(true);

      const userTypesContent = await readFile(
        join(testOutputDir, "models", "User.ts"),
        "utf-8"
      );

      // Required properties should not have ?
      expect(userTypesContent).toContain("id: string");
      expect(userTypesContent).toContain("name: string");
      expect(userTypesContent).toContain("email: string");

      // Optional properties should have ?
      expect(userTypesContent).toContain("age?: number");
      expect(userTypesContent).toContain("preferences?: Record<string, any>");
    });

    it("should generate enum types correctly", async () => {
      const result = await generator.generateFromSchema(mockOpenAPISchema, {
        outputDir: testOutputDir,
        generateApiClient: false,
        generateHooks: false,
      });

      const userTypesContent = await readFile(
        join(testOutputDir, "models", "User.ts"),
        "utf-8"
      );
      expect(userTypesContent).toContain(
        'status?: "active" | "inactive" | "pending"'
      );
    });

    it("should generate API client when requested", async () => {
      const result = await generator.generateFromSchema(mockOpenAPISchema, {
        outputDir: testOutputDir,
        generateApiClient: true,
        generateHooks: false,
      });

      expect(result.success).toBe(true);
      expect(result.generatedFiles).toContain(
        join(testOutputDir, "api", "client.ts")
      );

      const clientContent = await readFile(
        join(testOutputDir, "api", "client.ts"),
        "utf-8"
      );
      expect(clientContent).toContain("export const api = {");
      expect(clientContent).toContain("listUsers:");
      expect(clientContent).toContain("createUser:");
      expect(clientContent).toContain("getUserById:");
    });

    it("should generate React hooks when requested", async () => {
      const result = await generator.generateFromSchema(mockOpenAPISchema, {
        outputDir: testOutputDir,
        generateApiClient: true,
        generateHooks: true,
      });

      expect(result.success).toBe(true);
      expect(result.generatedFiles).toContain(
        join(testOutputDir, "hooks", "index.ts")
      );

      const hooksContent = await readFile(
        join(testOutputDir, "hooks", "index.ts"),
        "utf-8"
      );
      expect(hooksContent).toContain("useListUsers");
      expect(hooksContent).toContain("useCreateUser");
      expect(hooksContent).toContain("useGetUserById");
    });

    it("should handle references correctly", async () => {
      const result = await generator.generateFromSchema(mockOpenAPISchema, {
        outputDir: testOutputDir,
        generateApiClient: false,
        generateHooks: false,
      });

      const paginatedContent = await readFile(
        join(testOutputDir, "models", "PaginatedResponse.ts"),
        "utf-8"
      );
      expect(paginatedContent).toContain("import { User } from './User.js'");
      expect(paginatedContent).toContain("items: User[]");
    });

    it("should generate proper imports and exports", async () => {
      const result = await generator.generateFromSchema(mockOpenAPISchema, {
        outputDir: testOutputDir,
        generateApiClient: true,
        generateHooks: true,
      });

      // Check main index file
      const indexContent = await readFile(
        join(testOutputDir, "index.ts"),
        "utf-8"
      );
      expect(indexContent).toContain("export * from './models/index.js'");
      expect(indexContent).toContain("export * from './api/index.js'");
      expect(indexContent).toContain("export * from './hooks/index.js'");
    });

    it("should handle generation errors gracefully", async () => {
      const invalidSchema = { ...mockOpenAPISchema };
      delete (invalidSchema as any).components;

      const result = await generator.generateFromSchema(invalidSchema, {
        outputDir: testOutputDir,
        generateApiClient: true,
        generateHooks: true,
      });

      // Should still succeed but with warnings
      expect(result.success).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it("should support incremental generation", async () => {
      // First generation
      const result1 = await generator.generateFromSchema(mockOpenAPISchema, {
        outputDir: testOutputDir,
        generateApiClient: true,
        generateHooks: false,
      });

      expect(result1.success).toBe(true);
      const initialFiles = result1.generatedFiles.length;

      // Second generation with hooks enabled
      const result2 = await generator.generateFromSchema(mockOpenAPISchema, {
        outputDir: testOutputDir,
        generateApiClient: true,
        generateHooks: true,
      });

      expect(result2.success).toBe(true);
      expect(result2.generatedFiles.length).toBeGreaterThan(initialFiles);
    });
  });

  describe("Integration with Schema Extractor", () => {
    it("should work end-to-end with schema extraction", async () => {
      // This test would require a running FastAPI app
      // For now, we'll test with a mock schema
      const result = await generator.generateFromSchema(mockOpenAPISchema, {
        outputDir: testOutputDir,
        generateApiClient: true,
        generateHooks: true,
      });

      expect(result.success).toBe(true);
      expect(result.generatedFiles.length).toBeGreaterThan(5);

      // Verify all major files exist
      const expectedFiles = [
        "index.ts",
        "models/index.ts",
        "models/User.ts",
        "api/index.ts",
        "api/client.ts",
        "hooks/index.ts",
      ];

      for (const file of expectedFiles) {
        expect(result.generatedFiles).toContain(join(testOutputDir, file));
      }
    });
  });
});
