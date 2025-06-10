// Performance Benchmarking Tests
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
import { TypeSyncOrchestrator } from "@farm/type-sync";
import { TemplateProcessor } from "../../../packages/cli/src/template/processor";
import { TemplateValidator } from "../../../packages/cli/src/template/validator";
import type { SyncOptions, OpenAPISchema } from "@farm/type-sync";
import fs from "fs-extra";
import path from "path";
import { performance } from "perf_hooks";

// Mock external dependencies
vi.mock("fs-extra");
vi.mock("node-fetch");

describe("Performance Benchmarks", () => {
  let ensureDirSpy: any;
  let writeFileSpy: any;
  let readFileSpy: any;
  let statSpy: any;
  let pathExistsSpy: any;
  let readdirSpy: any;

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
    ensureDirSpy = vi.spyOn(fs, "ensureDir").mockResolvedValue(undefined);
    writeFileSpy = vi.spyOn(fs, "writeFile").mockResolvedValue(undefined);
    readFileSpy = vi
      .spyOn(fs, "readFile")
      .mockImplementation(() => Promise.resolve(Buffer.from("")));
    statSpy = vi
      .spyOn(fs, "stat")
      .mockResolvedValue({ mtime: new Date() } as any);
    pathExistsSpy = vi
      .spyOn(fs, "pathExists")
      .mockImplementation(() => Promise.resolve(true));
    readdirSpy = vi.spyOn(fs, "readdir");
  });

  describe("Type Generation Performance", () => {
    it("should complete generation within performance targets", async () => {
      const orchestrator = new TypeSyncOrchestrator();

      // Create a moderately complex schema
      const mockSchema: OpenAPISchema = {
        openapi: "3.0.0",
        info: { title: "Performance Test API", version: "1.0.0" },
        paths: generateLargePaths(50), // 50 endpoints
        components: {
          schemas: generateLargeSchemas(25), // 25 models
        },
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockSchema),
      });

      const config: SyncOptions = {
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

      const startTime = performance.now();
      const result = await orchestrator.syncOnce(config);
      const endTime = performance.now();

      const totalTime = endTime - startTime;

      // Performance targets
      expect(totalTime).toBeLessThan(5000); // Should complete in under 5 seconds
      expect(result.performance?.extractionTime).toBeLessThan(1000); // Extraction under 1s
      expect(result.performance?.generationTime).toBeLessThan(3000); // Generation under 3s
      expect(result.filesGenerated).toBeGreaterThan(0);
    });

    it("should handle large schemas efficiently", async () => {
      const orchestrator = new TypeSyncOrchestrator();

      // Create a large schema
      const mockSchema: OpenAPISchema = {
        openapi: "3.0.0",
        info: { title: "Large Schema Test", version: "1.0.0" },
        paths: generateLargePaths(200), // 200 endpoints
        components: {
          schemas: generateLargeSchemas(100), // 100 models
        },
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockSchema),
      });

      const config: SyncOptions = {
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
          maxConcurrency: 8, // Higher concurrency for large schemas
          cacheTimeout: 300000,
        },
      };

      const startTime = performance.now();
      const result = await orchestrator.syncOnce(config);
      const endTime = performance.now();

      const totalTime = endTime - startTime;

      // Relaxed targets for large schemas
      expect(totalTime).toBeLessThan(15000); // Should complete in under 15 seconds
      expect(result.performance?.parallelJobs).toBeGreaterThan(1); // Should use parallel processing
      expect(result.filesGenerated).toBeGreaterThan(0);
    });

    it("should show performance improvement with caching", async () => {
      const orchestrator = new TypeSyncOrchestrator();

      const mockSchema: OpenAPISchema = {
        openapi: "3.0.0",
        info: { title: "Cache Test API", version: "1.0.0" },
        paths: generateLargePaths(30),
        components: {
          schemas: generateLargeSchemas(15),
        },
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockSchema),
      });

      const config: SyncOptions = {
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

      // First run (no cache)
      const startTime1 = performance.now();
      const result1 = await orchestrator.syncOnce(config);
      const endTime1 = performance.now();
      const firstRunTime = endTime1 - startTime1;

      // Second run (with cache)
      const startTime2 = performance.now();
      const result2 = await orchestrator.syncOnce(config);
      const endTime2 = performance.now();
      const secondRunTime = endTime2 - startTime2;

      expect(result1.fromCache).toBe(false);
      expect(result2.fromCache).toBe(true);
      expect(secondRunTime).toBeLessThan(firstRunTime * 0.5); // Should be at least 50% faster
    });
  });

  describe("Template Processing Performance", () => {
    it("should process templates efficiently", async () => {
      const processor = new TemplateProcessor();

      // Mock template files
      const templateFiles = Array.from({ length: 20 }, (_, i) => ({
        name: `template-${i}.hbs`,
        content: `
          {{#each items}}
          export interface {{capitalize name}}Model {
            id: string;
            {{#each properties}}
            {{name}}: {{type}};
            {{/each}}
          }
          {{/each}}
        `,
      }));

      const mockContext = {
        projectName: "test-project",
        name: "TestProject",
        template: "test-template",
        features: [],
        database: "sqlite",
        answers: {},
        timestamp: new Date().toISOString(),
        environment: "test",
        plugins: [],
        farmVersion: "1.0.0",
        items: Array.from({ length: 10 }, (_, i) => ({
          name: `item${i}`,
          properties: [
            { name: "prop1", type: "string" },
            { name: "prop2", type: "number" },
            { name: "prop3", type: "boolean" },
          ],
        })),
      };

      readdirSpy.mockResolvedValue(templateFiles.map((f) => f.name) as any);
      readFileSpy.mockImplementation((path: string) => {
        const fileName = path.toString().split("/").pop();
        const file = templateFiles.find((f) => f.name === fileName);
        return Promise.resolve(file?.content || "");
      });

      const startTime = performance.now();
      const result = await processor.processTemplate(
        "test-template",
        mockContext,
        "./output"
      );
      const endTime = performance.now();

      const totalTime = endTime - startTime;

      expect(totalTime).toBeLessThan(2000); // Should complete in under 2 seconds
      expect(result).toHaveLength(templateFiles.length);
    });

    it("should benefit from template caching", async () => {
      const processor = new TemplateProcessor();

      const templateContent = `
        {{#each items}}
        export const {{name}} = "{{value}}";
        {{/each}}
      `;

      const mockContext = {
        projectName: "test-project",
        name: "TestProject",
        template: "test-template",
        features: [],
        database: "sqlite",
        answers: {},
        timestamp: new Date().toISOString(),
        environment: "test",
        plugins: [],
        farmVersion: "1.0.0",
        items: Array.from({ length: 50 }, (_, i) => ({
          name: `CONSTANT_${i}`,
          value: `value-${i}`,
        })),
      };

      readdirSpy.mockResolvedValue(["template.hbs"] as any);
      readFileSpy.mockResolvedValue(templateContent);

      // First processing (no cache)
      const startTime1 = performance.now();
      await processor.processTemplate("test-template", mockContext, "./output");
      const endTime1 = performance.now();
      const firstTime = endTime1 - startTime1;

      // Second processing (with cache)
      const startTime2 = performance.now();
      await processor.processTemplate("test-template", mockContext, "./output");
      const endTime2 = performance.now();
      const secondTime = endTime2 - startTime2;

      expect(secondTime).toBeLessThan(firstTime * 0.8); // Should be at least 20% faster
    });
  });

  describe("Template Validation Performance", () => {
    it("should validate templates quickly", async () => {
      const validator = new TemplateValidator();

      // Mock a complex template structure
      const templateStructure = {
        "package.json.hbs": '{"name": "{{projectName}}"}',
        "src/index.ts.hbs": 'export * from "./{{moduleName}}";',
        "src/components/{{componentName}}.tsx.hbs": `
          import React from 'react';
          export const {{componentName}} = () => <div>{{componentName}}</div>;
        `,
        "README.md.hbs": "# {{projectName}}\n{{description}}",
      };

      readdirSpy.mockImplementation((path: string) => {
        return Promise.resolve(Object.keys(templateStructure) as any);
      });

      readFileSpy.mockImplementation((path: string) => {
        const fileName = path.toString().split("/").pop();
        return Promise.resolve(
          templateStructure[fileName as keyof typeof templateStructure] || ""
        );
      });

      statSpy.mockResolvedValue({ isFile: () => true } as any);

      const startTime = performance.now();
      const result = await validator.validateTemplate("./test-template");
      const endTime = performance.now();

      const totalTime = endTime - startTime;

      expect(totalTime).toBeLessThan(1000); // Should complete in under 1 second
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe("Memory Usage", () => {
    it("should not exceed memory limits during large operations", async () => {
      const orchestrator = new TypeSyncOrchestrator();

      // Create a very large schema
      const mockSchema: OpenAPISchema = {
        openapi: "3.0.0",
        info: { title: "Memory Test API", version: "1.0.0" },
        paths: generateLargePaths(500), // 500 endpoints
        components: {
          schemas: generateLargeSchemas(250), // 250 models
        },
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockSchema),
      });

      const config: SyncOptions = {
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

      const initialMemory = process.memoryUsage().heapUsed;

      await orchestrator.syncOnce(config);

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be reasonable (less than 100MB for this test)
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024);
    });
  });
});

// Helper functions for generating large test data
function generateLargePaths(count: number): Record<string, any> {
  const paths: Record<string, any> = {};

  for (let i = 0; i < count; i++) {
    const pathName = `/api/resource${i}`;
    paths[pathName] = {
      get: {
        summary: `Get resource ${i}`,
        responses: {
          "200": {
            description: "Success",
            content: {
              "application/json": {
                schema: {
                  $ref: `#/components/schemas/Resource${i}`,
                },
              },
            },
          },
        },
      },
      post: {
        summary: `Create resource ${i}`,
        requestBody: {
          content: {
            "application/json": {
              schema: {
                $ref: `#/components/schemas/CreateResource${i}`,
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
                  $ref: `#/components/schemas/Resource${i}`,
                },
              },
            },
          },
        },
      },
    };
  }

  return paths;
}

function generateLargeSchemas(count: number): Record<string, any> {
  const schemas: Record<string, any> = {};

  for (let i = 0; i < count; i++) {
    schemas[`Resource${i}`] = {
      type: "object",
      properties: {
        id: { type: "string" },
        name: { type: "string" },
        description: { type: "string" },
        createdAt: { type: "string", format: "date-time" },
        updatedAt: { type: "string", format: "date-time" },
        metadata: {
          type: "object",
          additionalProperties: true,
        },
        tags: {
          type: "array",
          items: { type: "string" },
        },
        status: {
          type: "string",
          enum: ["active", "inactive", "pending"],
        },
      },
      required: ["id", "name"],
    };

    schemas[`CreateResource${i}`] = {
      type: "object",
      properties: {
        name: { type: "string" },
        description: { type: "string" },
        metadata: {
          type: "object",
          additionalProperties: true,
        },
        tags: {
          type: "array",
          items: { type: "string" },
        },
      },
      required: ["name"],
    };
  }

  return schemas;
}
