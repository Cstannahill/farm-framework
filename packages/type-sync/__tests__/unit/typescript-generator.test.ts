import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { TypeScriptGenerator } from "../../src/generators/typescript";
import type { OpenAPISchema } from "@farm-framework/types";

describe("TypeScriptGenerator", () => {
  let generator: TypeScriptGenerator;
  const mockOutputDir = "./test-output";

  beforeEach(() => {
    generator = new TypeScriptGenerator({
      outputDir: mockOutputDir,
      generateComments: true,
      enumType: "union",
      strict: true,
    });
  });

  describe("interface generation", () => {
    it("should generate basic interfaces from OpenAPI schemas", async () => {
      const schema: OpenAPISchema = {
        openapi: "3.0.0",
        info: { title: "Test API", version: "1.0.0" },
        paths: {},
        components: {
          schemas: {
            User: {
              type: "object",
              properties: {
                id: { type: "string" },
                name: { type: "string" },
                email: { type: "string", format: "email" },
                age: { type: "integer", minimum: 0 },
              },
              required: ["id", "name", "email"],
            },
          },
        },
      };

      const result = await generator.generate(schema, {
        outputDir: mockOutputDir,
        generateComments: true,
      });

      expect(result.content).toContain("export interface User");
      expect(result.content).toContain("id: string;");
      expect(result.content).toContain("name: string;");
      expect(result.content).toContain("email: string;");
      expect(result.content).toContain("age?: number;"); // Optional field
      expect(result.checksum).toBeDefined();
    });

    it("should handle nested objects", async () => {
      const schema: OpenAPISchema = {
        openapi: "3.0.0",
        info: { title: "Test API", version: "1.0.0" },
        paths: {},
        components: {
          schemas: {
            Address: {
              type: "object",
              properties: {
                street: { type: "string" },
                city: { type: "string" },
                zipCode: { type: "string" },
              },
            },
            User: {
              type: "object",
              properties: {
                id: { type: "string" },
                address: { $ref: "#/components/schemas/Address" },
              },
            },
          },
        },
      };

      const result = await generator.generate(schema, {
        outputDir: mockOutputDir,
      });

      expect(result.content).toContain("export interface Address");
      expect(result.content).toContain("export interface User");
      expect(result.content).toContain("address?: Address;");
    });

    it("should generate union types for enums", async () => {
      const schema: OpenAPISchema = {
        openapi: "3.0.0",
        info: { title: "Test API", version: "1.0.0" },
        paths: {},
        components: {
          schemas: {
            Status: {
              type: "string",
              enum: ["active", "inactive", "pending"],
            },
          },
        },
      };

      const result = await generator.generate(schema, {
        outputDir: mockOutputDir,
        enumType: "union",
      });

      expect(result.content).toContain(
        'export type Status = "active" | "inactive" | "pending";'
      );
    });

    it("should handle arrays and optional properties", async () => {
      const schema: OpenAPISchema = {
        openapi: "3.0.0",
        info: { title: "Test API", version: "1.0.0" },
        paths: {},
        components: {
          schemas: {
            User: {
              type: "object",
              properties: {
                id: { type: "string" },
                tags: {
                  type: "array",
                  items: { type: "string" },
                },
                metadata: {
                  type: "object",
                  additionalProperties: { type: "string" },
                },
              },
              required: ["id"],
            },
          },
        },
      };

      const result = await generator.generate(schema, {
        outputDir: mockOutputDir,
      });

      expect(result.content).toContain("id: string;");
      expect(result.content).toContain("tags?: string[];");
      expect(result.content).toContain("metadata?: Record<string, string>;");
    });
  });

  describe("API operation types", () => {
    it("should generate request and response types for API operations", async () => {
      const schema: OpenAPISchema = {
        openapi: "3.0.0",
        info: { title: "Test API", version: "1.0.0" },
        paths: {
          "/users/{id}": {
            get: {
              operationId: "getUser",
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
                  description: "User found",
                  content: {
                    "application/json": {
                      schema: { $ref: "#/components/schemas/User" },
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
              },
            },
          },
        },
      };

      const result = await generator.generate(schema, {
        outputDir: mockOutputDir,
      });

      expect(result.content).toContain("GetUserRequest");
      expect(result.content).toContain("GetUserResponse");
      expect(result.content).toContain("id: string;");
    });
  });

  describe("error handling", () => {
    it("should handle invalid schemas gracefully", async () => {
      const invalidSchema = {
        // Missing required OpenAPI fields
        paths: null,
      } as any;

      await expect(
        generator.generate(invalidSchema, {
          outputDir: mockOutputDir,
        })
      ).rejects.toThrow();
    });

    it("should validate output directory", async () => {
      const schema: OpenAPISchema = {
        openapi: "3.0.0",
        info: { title: "Test API", version: "1.0.0" },
        paths: {},
      };

      await expect(
        generator.generate(schema, {
          outputDir: "", // Invalid empty path
        })
      ).rejects.toThrow();
    });
  });

  describe("configuration options", () => {
    it("should respect different enum generation strategies", async () => {
      const schema: OpenAPISchema = {
        openapi: "3.0.0",
        info: { title: "Test API", version: "1.0.0" },
        paths: {},
        components: {
          schemas: {
            Status: {
              type: "string",
              enum: ["active", "inactive"],
            },
          },
        },
      };

      // Test union type generation
      const unionResult = await generator.generate(schema, {
        outputDir: mockOutputDir,
        enumType: "union",
      });
      expect(unionResult.content).toContain(
        'export type Status = "active" | "inactive";'
      );

      // Test const assertion generation
      const constResult = await generator.generate(schema, {
        outputDir: mockOutputDir,
        enumType: "const",
      });
      expect(constResult.content).toContain("as const");
    });

    it("should include/exclude comments based on configuration", async () => {
      const schema: OpenAPISchema = {
        openapi: "3.0.0",
        info: { title: "Test API", version: "1.0.0" },
        paths: {},
        components: {
          schemas: {
            User: {
              type: "object",
              description: "A user in the system",
              properties: {
                id: { type: "string", description: "Unique identifier" },
              },
            },
          },
        },
      };

      // With comments
      const withComments = await generator.generate(schema, {
        outputDir: mockOutputDir,
        generateComments: true,
      });
      expect(withComments.content).toContain("/**");
      expect(withComments.content).toContain("A user in the system");

      // Without comments
      const withoutComments = await generator.generate(schema, {
        outputDir: mockOutputDir,
        generateComments: false,
      });
      expect(withoutComments.content).not.toContain("/**");
    });
  });

  describe("checksum generation", () => {
    it("should generate consistent checksums for identical content", async () => {
      const schema: OpenAPISchema = {
        openapi: "3.0.0",
        info: { title: "Test API", version: "1.0.0" },
        paths: {},
      };

      const result1 = await generator.generate(schema, {
        outputDir: mockOutputDir,
      });

      const result2 = await generator.generate(schema, {
        outputDir: mockOutputDir,
      });

      expect(result1.checksum).toBe(result2.checksum);
    });

    it("should generate different checksums for different content", async () => {
      const schema1: OpenAPISchema = {
        openapi: "3.0.0",
        info: { title: "Test API", version: "1.0.0" },
        paths: {},
      };

      const schema2: OpenAPISchema = {
        openapi: "3.0.0",
        info: { title: "Different API", version: "2.0.0" },
        paths: {},
      };

      const result1 = await generator.generate(schema1, {
        outputDir: mockOutputDir,
      });

      const result2 = await generator.generate(schema2, {
        outputDir: mockOutputDir,
      });

      expect(result1.checksum).not.toBe(result2.checksum);
    });
  });
});
