import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "fs";
import path from "path";
import { TypeSyncOrchestrator } from "../../src/orchestrator";
import { TypeSyncConfigManager } from "../../src/config/validation";
import { PerformanceMonitor } from "../../src/monitoring/performance";
import type { TypeSyncConfig, OpenAPISpec } from "../../src/types";

describe("Full Workflow Integration Tests", () => {
  const testDir = path.join(__dirname, "..", "fixtures", "integration");
  const tempDir = path.join(testDir, "temp");

  beforeEach(async () => {
    // Create test directories
    await fs.mkdir(testDir, { recursive: true });
    await fs.mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    // Clean up temporary files
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe("End-to-End Type Generation", () => {
    it("should generate TypeScript types from OpenAPI spec", async () => {
      // Create a sample OpenAPI spec
      const openApiSpec: OpenAPISpec = {
        openapi: "3.0.0",
        info: {
          title: "Test API",
          version: "1.0.0",
        },
        paths: {
          "/users": {
            get: {
              operationId: "getUsers",
              responses: {
                "200": {
                  description: "Success",
                  content: {
                    "application/json": {
                      schema: {
                        type: "array",
                        items: {
                          $ref: "#/components/schemas/User",
                        },
                      },
                    },
                  },
                },
              },
            },
            post: {
              operationId: "createUser",
              requestBody: {
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
                  description: "Created",
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
        },
        components: {
          schemas: {
            User: {
              type: "object",
              required: ["id", "email", "name"],
              properties: {
                id: {
                  type: "integer",
                  format: "int64",
                },
                email: {
                  type: "string",
                  format: "email",
                },
                name: {
                  type: "string",
                },
                createdAt: {
                  type: "string",
                  format: "date-time",
                },
                profile: {
                  $ref: "#/components/schemas/UserProfile",
                },
              },
            },
            UserProfile: {
              type: "object",
              properties: {
                bio: {
                  type: "string",
                },
                avatar: {
                  type: "string",
                  format: "uri",
                },
                settings: {
                  type: "object",
                  additionalProperties: true,
                },
              },
            },
            CreateUserRequest: {
              type: "object",
              required: ["email", "name"],
              properties: {
                email: {
                  type: "string",
                  format: "email",
                },
                name: {
                  type: "string",
                },
                profile: {
                  $ref: "#/components/schemas/UserProfile",
                },
              },
            },
          },
        },
      };

      // Write OpenAPI spec to file
      const specPath = path.join(tempDir, "openapi.json");
      await fs.writeFile(specPath, JSON.stringify(openApiSpec, null, 2));

      // Create configuration
      const config: TypeSyncConfig = {
        input: {
          type: "openapi",
          source: specPath,
        },
        output: {
          directory: tempDir,
          generators: [
            {
              type: "typescript",
              options: {
                filename: "types.ts",
                exportStyle: "named",
                includeComments: true,
                strictTypes: true,
              },
            },
            {
              type: "api-client",
              options: {
                filename: "api-client.ts",
                clientName: "TestApiClient",
                includeTypes: true,
              },
            },
            {
              type: "react-hooks",
              options: {
                filename: "hooks.ts",
                hookPrefix: "use",
                includeTypes: true,
              },
            },
          ],
        },
        cache: {
          enabled: true,
          directory: path.join(tempDir, ".cache"),
        },
      };

      // Initialize orchestrator with performance monitoring
      const performanceMonitor = new PerformanceMonitor();
      const orchestrator = new TypeSyncOrchestrator(config, {
        performanceMonitor,
      });

      // Execute type synchronization
      const result = await orchestrator.sync();

      // Verify results
      expect(result.success).toBe(true);
      expect(result.generatedFiles).toHaveLength(3);

      // Check generated files exist
      const expectedFiles = [
        path.join(tempDir, "types.ts"),
        path.join(tempDir, "api-client.ts"),
        path.join(tempDir, "hooks.ts"),
      ];

      for (const filePath of expectedFiles) {
        expect(
          await fs
            .access(filePath)
            .then(() => true)
            .catch(() => false)
        ).toBe(true);
      }

      // Verify TypeScript types content
      const typesContent = await fs.readFile(
        path.join(tempDir, "types.ts"),
        "utf-8"
      );
      expect(typesContent).toContain("export interface User");
      expect(typesContent).toContain("export interface UserProfile");
      expect(typesContent).toContain("export interface CreateUserRequest");
      expect(typesContent).toContain("id: number");
      expect(typesContent).toContain("email: string");
      expect(typesContent).toContain("createdAt?: string");

      // Verify API client content
      const apiClientContent = await fs.readFile(
        path.join(tempDir, "api-client.ts"),
        "utf-8"
      );
      expect(apiClientContent).toContain("export class TestApiClient");
      expect(apiClientContent).toContain("async getUsers()");
      expect(apiClientContent).toContain("async createUser(");

      // Verify React hooks content
      const hooksContent = await fs.readFile(
        path.join(tempDir, "hooks.ts"),
        "utf-8"
      );
      expect(hooksContent).toContain("export function useGetUsers");
      expect(hooksContent).toContain("export function useCreateUser");

      // Verify performance metrics were collected
      const metrics = performanceMonitor.getMetrics();
      expect(metrics.totalOperations).toBeGreaterThan(0);
      expect(metrics.timings.extraction).toBeGreaterThan(0);
      expect(metrics.timings.generation).toBeGreaterThan(0);
    });

    it("should handle cache correctly on subsequent runs", async () => {
      // Create a simple OpenAPI spec
      const openApiSpec: OpenAPISpec = {
        openapi: "3.0.0",
        info: { title: "Cache Test API", version: "1.0.0" },
        paths: {
          "/items": {
            get: {
              operationId: "getItems",
              responses: {
                "200": {
                  description: "Success",
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
          },
        },
        components: {
          schemas: {
            Item: {
              type: "object",
              required: ["id", "name"],
              properties: {
                id: { type: "integer" },
                name: { type: "string" },
              },
            },
          },
        },
      };

      const specPath = path.join(tempDir, "cache-test-openapi.json");
      await fs.writeFile(specPath, JSON.stringify(openApiSpec, null, 2));

      const config: TypeSyncConfig = {
        input: { type: "openapi", source: specPath },
        output: {
          directory: tempDir,
          generators: [
            {
              type: "typescript",
              options: { filename: "cache-test-types.ts" },
            },
          ],
        },
        cache: {
          enabled: true,
          directory: path.join(tempDir, ".cache"),
        },
      };

      const performanceMonitor1 = new PerformanceMonitor();
      const orchestrator1 = new TypeSyncOrchestrator(config, {
        performanceMonitor: performanceMonitor1,
      });

      // First run - should extract and generate
      const result1 = await orchestrator1.sync();
      expect(result1.success).toBe(true);

      const metrics1 = performanceMonitor1.getMetrics();
      const firstRunTime = metrics1.timings.total;

      // Second run - should use cache
      const performanceMonitor2 = new PerformanceMonitor();
      const orchestrator2 = new TypeSyncOrchestrator(config, {
        performanceMonitor: performanceMonitor2,
      });

      const result2 = await orchestrator2.sync();
      expect(result2.success).toBe(true);

      const metrics2 = performanceMonitor2.getMetrics();
      const secondRunTime = metrics2.timings.total;

      // Second run should be faster due to caching
      expect(secondRunTime).toBeLessThan(firstRunTime);
      expect(metrics2.cache.hits).toBeGreaterThan(0);
    });

    it("should handle configuration validation errors gracefully", async () => {
      const invalidConfig = {
        input: {
          type: "invalid-type", // Invalid input type
          source: "nonexistent.json",
        },
        output: {
          directory: tempDir,
          generators: [],
        },
      } as any;

      const configManager = new TypeSyncConfigManager();

      await expect(configManager.validateConfig(invalidConfig)).rejects.toThrow(
        /Invalid input type/
      );
    });

    it("should recover from extraction errors", async () => {
      // Create an invalid OpenAPI spec
      const invalidSpec = {
        openapi: "3.0.0",
        info: { title: "Invalid API" },
        // Missing required fields
      };

      const specPath = path.join(tempDir, "invalid-openapi.json");
      await fs.writeFile(specPath, JSON.stringify(invalidSpec, null, 2));

      const config: TypeSyncConfig = {
        input: { type: "openapi", source: specPath },
        output: {
          directory: tempDir,
          generators: [
            {
              type: "typescript",
              options: { filename: "error-test-types.ts" },
            },
          ],
        },
        errorHandling: {
          continueOnError: true,
          maxRetries: 2,
        },
      };

      const orchestrator = new TypeSyncOrchestrator(config);
      const result = await orchestrator.sync();

      // Should fail gracefully
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
    });
  });

  describe("Multi-Generator Workflow", () => {
    it("should generate all requested output types", async () => {
      const openApiSpec: OpenAPISpec = {
        openapi: "3.0.0",
        info: { title: "Multi-Gen API", version: "1.0.0" },
        paths: {
          "/products": {
            get: {
              operationId: "getProducts",
              parameters: [
                {
                  name: "category",
                  in: "query",
                  schema: { type: "string" },
                },
                {
                  name: "limit",
                  in: "query",
                  schema: { type: "integer", minimum: 1, maximum: 100 },
                },
              ],
              responses: {
                "200": {
                  description: "Success",
                  content: {
                    "application/json": {
                      schema: {
                        type: "object",
                        properties: {
                          products: {
                            type: "array",
                            items: { $ref: "#/components/schemas/Product" },
                          },
                          total: { type: "integer" },
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
          schemas: {
            Product: {
              type: "object",
              required: ["id", "name", "price"],
              properties: {
                id: { type: "string" },
                name: { type: "string" },
                price: { type: "number", minimum: 0 },
                category: { type: "string" },
                tags: {
                  type: "array",
                  items: { type: "string" },
                },
              },
            },
          },
        },
      };

      const specPath = path.join(tempDir, "multi-gen-openapi.json");
      await fs.writeFile(specPath, JSON.stringify(openApiSpec, null, 2));

      const config: TypeSyncConfig = {
        input: { type: "openapi", source: specPath },
        output: {
          directory: tempDir,
          generators: [
            {
              type: "typescript",
              options: {
                filename: "product-types.ts",
                exportStyle: "named",
                includeComments: true,
              },
            },
            {
              type: "api-client",
              options: {
                filename: "product-client.ts",
                clientName: "ProductClient",
                includeTypes: true,
                baseUrl: "https://api.example.com",
              },
            },
            {
              type: "react-hooks",
              options: {
                filename: "product-hooks.ts",
                hookPrefix: "useProduct",
                includeTypes: true,
                queryKeyPrefix: "product",
              },
            },
          ],
        },
      };

      const orchestrator = new TypeSyncOrchestrator(config);
      const result = await orchestrator.sync();

      expect(result.success).toBe(true);
      expect(result.generatedFiles).toHaveLength(3);

      // Verify each generated file has expected content
      const typesContent = await fs.readFile(
        path.join(tempDir, "product-types.ts"),
        "utf-8"
      );
      expect(typesContent).toContain("export interface Product");
      expect(typesContent).toContain("price: number");
      expect(typesContent).toContain("tags?: string[]");

      const clientContent = await fs.readFile(
        path.join(tempDir, "product-client.ts"),
        "utf-8"
      );
      expect(clientContent).toContain("export class ProductClient");
      expect(clientContent).toContain("async getProducts(");
      expect(clientContent).toContain("category?: string");
      expect(clientContent).toContain("limit?: number");

      const hooksContent = await fs.readFile(
        path.join(tempDir, "product-hooks.ts"),
        "utf-8"
      );
      expect(hooksContent).toContain("export function useProductGetProducts");
      expect(hooksContent).toContain("queryKey: ['product'");
    });
  });

  describe("Error Handling and Recovery", () => {
    it("should handle file system errors gracefully", async () => {
      const config: TypeSyncConfig = {
        input: { type: "openapi", source: "/nonexistent/path/spec.json" },
        output: {
          directory: tempDir,
          generators: [
            {
              type: "typescript",
              options: { filename: "types.ts" },
            },
          ],
        },
        errorHandling: {
          continueOnError: true,
          maxRetries: 1,
        },
      };

      const orchestrator = new TypeSyncOrchestrator(config);
      const result = await orchestrator.sync();

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors![0]).toMatch(/Failed to read OpenAPI specification/);
    });

    it("should handle generation errors and continue with other generators", async () => {
      const openApiSpec: OpenAPISpec = {
        openapi: "3.0.0",
        info: { title: "Test API", version: "1.0.0" },
        paths: {},
        components: {
          schemas: {
            TestType: {
              type: "object",
              properties: {
                id: { type: "integer" },
              },
            },
          },
        },
      };

      const specPath = path.join(tempDir, "partial-fail-openapi.json");
      await fs.writeFile(specPath, JSON.stringify(openApiSpec, null, 2));

      const config: TypeSyncConfig = {
        input: { type: "openapi", source: specPath },
        output: {
          directory: "/invalid/readonly/path", // This should cause write errors
          generators: [
            {
              type: "typescript",
              options: { filename: "types.ts" },
            },
            {
              type: "api-client",
              options: { filename: "client.ts", clientName: "TestClient" },
            },
          ],
        },
        errorHandling: {
          continueOnError: true,
          maxRetries: 1,
        },
      };

      const orchestrator = new TypeSyncOrchestrator(config);
      const result = await orchestrator.sync();

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
    });
  });
});
