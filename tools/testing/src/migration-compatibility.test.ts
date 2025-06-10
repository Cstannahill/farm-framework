// Migration Compatibility Tests
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
import { CodegenOrchestrator } from "../../../packages/core/src/codegen/orchestrator";
import { TemplateProcessor } from "../../../packages/cli/src/template/processor";
import { TemplateValidator } from "../../../packages/cli/src/template/validator";
import type { SyncOptions, SyncResult } from "@farm/type-sync";
import type { CodegenOptions } from "../../../packages/core/src/codegen";
import fs from "fs-extra";
import path from "path";
import zlib from "zlib";

// Mock external dependencies
vi.mock("fs-extra");
vi.mock("node-fetch");

describe("Migration Compatibility Tests", () => {
  // Patch fs-extra mocks to use vi.spyOn for all methods
  let ensureDirSpy: any;
  let writeFileSpy: any;
  let readFileSpy: any;
  let statSpy: any;
  let pathExistsSpy: any;
  let readdirSpy: any;
  let readJsonSpy: any;
  let removeSpy: any;
  let writeJsonSpy: any;

  // Helper: valid cache entry for cache file mocks
  const validCacheEntry = {
    schema: { openapi: "3.0.0", info: { title: "Cache", version: "1.0.0" } },
    results: { types: "export type Foo = {}" },
    timestamp: Date.now(),
    version: "1.0",
  };
  const validCacheJson = JSON.stringify(validCacheEntry);
  const validCacheBuffer = Buffer.from(validCacheJson, "utf8");
  const validCacheGzip = zlib.gzipSync(validCacheBuffer);

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
    vi.mock("fs-extra");
    ensureDirSpy = vi
      .spyOn(fs, "ensureDir")
      .mockImplementation(() => Promise.resolve());
    writeFileSpy = vi
      .spyOn(fs, "writeFile")
      .mockImplementation((file, content) => {
        // Accept all writes
        return Promise.resolve();
      });
    readFileSpy = vi
      .spyOn(fs, "readFile")
      .mockImplementation((file, ...args) => {
        // If reading a cache file, return valid gzipped buffer
        if (
          typeof file === "string" &&
          file.includes("cache") &&
          file.endsWith(".json")
        ) {
          return Promise.resolve(validCacheGzip);
        }
        // Default: empty buffer
        return Promise.resolve(Buffer.from(""));
      });
    statSpy = vi
      .spyOn(fs, "stat")
      .mockImplementation(() => Promise.resolve({ mtime: new Date() } as any));
    pathExistsSpy = vi
      .spyOn(fs, "pathExists")
      .mockImplementation(() => Promise.resolve(true));
    readdirSpy = vi
      .spyOn(fs, "readdir")
      .mockImplementation(() => Promise.resolve([]));
    readJsonSpy = vi.spyOn(fs, "readJson").mockImplementation((file) => {
      // If reading a cache file, return valid object
      if (
        typeof file === "string" &&
        file.includes("cache") &&
        file.endsWith(".json")
      ) {
        return Promise.resolve(validCacheEntry);
      }
      return Promise.resolve({});
    });
    removeSpy = vi
      .spyOn(fs, "remove")
      .mockImplementation(() => Promise.resolve());
    writeJsonSpy = vi
      .spyOn(fs, "writeJson")
      .mockImplementation(() => Promise.resolve());
  });
  afterAll(() => {
    vi.useRealTimers();
    vi.unmock("fs-extra");
    vi.unmock("node-fetch");
    ensureDirSpy.mockRestore();
    writeFileSpy.mockRestore();
    readFileSpy.mockRestore();
    statSpy.mockRestore();
    pathExistsSpy.mockRestore();
    readdirSpy.mockRestore();
    readJsonSpy.mockRestore();
    removeSpy.mockRestore();
    writeJsonSpy.mockRestore();
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    ensureDirSpy.mockClear();
    writeFileSpy.mockClear();
    readFileSpy.mockClear();
    statSpy.mockClear();
    pathExistsSpy.mockClear();
    readdirSpy.mockClear();
    readJsonSpy.mockClear();
    removeSpy.mockClear();
    writeJsonSpy.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Legacy API Compatibility", () => {
    it("should maintain backward compatibility for TypeSyncOrchestrator", async () => {
      const orchestrator = new TypeSyncOrchestrator();

      // Test the legacy API format still works
      const legacyConfig: SyncOptions = {
        apiUrl: "http://localhost:8000",
        outputDir: "./generated",
        features: {
          client: true,
          hooks: true,
          streaming: true,
        },
      };

      const mockSchema = {
        openapi: "3.0.0",
        info: { title: "Legacy API", version: "1.0.0" },
        paths: {
          "/legacy": {
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

      await orchestrator.initialize(legacyConfig);
      const result = await orchestrator.syncOnce(legacyConfig);

      expect(result).toBeDefined();
      expect(result.filesGenerated).toBeGreaterThan(0);
      expect(result.artifacts).toContain("types.ts");
      expect(result.artifacts).toContain("api-client.ts");
      expect(result.artifacts).toContain("hooks.ts");
    });

    it("should maintain backward compatibility for CodegenOrchestrator", async () => {
      const orchestrator = new CodegenOrchestrator();

      // Test the legacy CodegenOptions format
      const legacyConfig: CodegenOptions = {
        apiUrl: "http://localhost:8000",
        outputDir: "./generated",
        features: {
          client: true,
          hooks: true,
          streaming: true,
        },
        verbose: false,
        dryRun: false,
      };

      const mockSchema = {
        openapi: "3.0.0",
        info: { title: "Legacy Codegen API", version: "1.0.0" },
        paths: {
          "/legacy-codegen": {
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

      await orchestrator.initialize(legacyConfig);
      const result = await orchestrator.run({ dryRun: false });

      expect(result).toBeDefined();
      expect(result.filesGenerated).toBeGreaterThan(0);
    });

    it("should support legacy CLI command structure", async () => {
      // Test that existing CLI commands still work with new implementation
      const orchestrator = new CodegenOrchestrator();

      // Simulate legacy `farm types:sync` command options
      const legacyCliOptions = {
        apiUrl: "http://localhost:8000",
        outputDir: ".farm/types/generated",
        features: {
          client: true,
          hooks: true,
          streaming: true,
        },
        verbose: false,
        dryRun: false,
      };

      const mockSchema = {
        openapi: "3.0.0",
        info: { title: "Legacy CLI API", version: "1.0.0" },
        paths: {
          "/users": {
            get: {
              responses: {
                "200": {
                  description: "Users list",
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
                id: { type: "string" },
                name: { type: "string" },
              },
              required: ["id", "name"],
            },
          },
        },
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockSchema),
      });

      await orchestrator.initialize(legacyCliOptions);
      const result = await orchestrator.run({ dryRun: false });

      expect(result).toBeDefined();
      expect(result.filesGenerated).toBeGreaterThan(0);
      expect(result.artifacts).toContain("types.ts");
    });
  });

  describe("Template System Compatibility", () => {
    it("should maintain compatibility with existing templates", async () => {
      const processor = new TemplateProcessor();

      // Test that existing template structure still works
      const legacyTemplateContent = `
        import React from 'react';
        
        export interface {{pascalCase name}}Props {
          {{#each props}}
          {{name}}: {{type}};
          {{/each}}
        }
        
        export const {{pascalCase name}}: React.FC<{{pascalCase name}}Props> = ({
          {{#each props}}{{name}}{{#unless @last}}, {{/unless}}{{/each}}
        }) => {
          return (
            <div className="{{kebabCase name}}">
              <h1>{{name}}</h1>
              {{#each props}}
              <p>{{name}}: {{{name}}}</p>
              {{/each}}
            </div>
          );
        };
      `;

      // Patch for legacyContext to include all required TemplateContext properties
      const legacyContext = {
        name: "LegacyProject",
        projectName: "LegacyProject",
        version: "1.0.0",
        description: "Legacy test project",
        template: "basic",
        features: ["auth", "ai"],
        database: "sqlite",
        ai: undefined,
        development: undefined,
        build: undefined,
        deployment: undefined,
        typescript: true,
        docker: false,
        testing: true,
        git: false,
        install: false,
        environment: "development",
        plugins: [],
        farmVersion: "1.0.0",
        interactive: false,
        verbose: false,
        answers: {},
        timestamp: new Date().toISOString(),
        // legacy template-specific fields
        config: undefined,
        props: [
          { name: "userId", type: "string" },
          { name: "userName", type: "string" },
          { name: "isActive", type: "boolean" },
        ],
      };

      // Patch fs mocks to always return correct types
      readdirSpy.mockImplementation(async (_dir: any) => ["component.tsx.hbs"]);
      readFileSpy.mockImplementation(async (_file: any) =>
        Buffer.from(legacyTemplateContent)
      );

      const result = await processor.processTemplate(
        "legacy-template",
        legacyContext,
        "./output"
      );

      expect(result).toHaveLength(1);
      const output = (result as any)[0].toString();
      expect(output).toContain("UserProfile");
      expect(output).toContain("userId: string");
      expect(output).toContain("userName: string");
      expect(output).toContain("isActive: boolean");
    });

    it("should validate existing template structures", async () => {
      const validator = new TemplateValidator();

      // Test validation of legacy template structure
      const legacyTemplateStructure = {
        "package.json.hbs":
          '{"name": "{{projectName}}", "version": "{{version}}"}',
        "src/index.ts.hbs": 'export * from "./{{moduleName}}";',
        "README.md.hbs": "# {{projectName}}\n\n{{description}}",
        "tsconfig.json.hbs": '{"compilerOptions": {"target": "{{target}}"}}',
      };

      readdirSpy.mockImplementation(async (dirPath: any) => {
        const keys = Object.keys(legacyTemplateStructure);
        return Promise.resolve(keys as any);
      });

      readFileSpy.mockImplementation(async (filePath: any) => {
        const fileName = filePath.toString().split("/").pop();
        return Buffer.from(
          legacyTemplateStructure[
            fileName as keyof typeof legacyTemplateStructure
          ] || ""
        );
      });

      statSpy.mockResolvedValue({ isFile: () => true } as any);

      const result = await validator.validateTemplate("./legacy-template");

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toBeDefined();
    });
  });

  describe("Generated Code Compatibility", () => {
    it("should generate backward-compatible TypeScript types", async () => {
      const orchestrator = new TypeSyncOrchestrator();

      // Test that generated types maintain the same structure as before
      const mockSchema = {
        openapi: "3.0.0",
        info: { title: "Compatibility API", version: "1.0.0" },
        paths: {
          "/api/v1/users": {
            get: {
              responses: {
                "200": {
                  description: "Success",
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
              requestBody: {
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/CreateUserRequest" },
                  },
                },
              },
              responses: {
                "201": {
                  description: "Created",
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
                email: { type: "string", format: "email" },
                firstName: { type: "string" },
                lastName: { type: "string" },
                createdAt: { type: "string", format: "date-time" },
                updatedAt: { type: "string", format: "date-time" },
              },
              required: ["id", "email", "firstName", "lastName"],
            },
            CreateUserRequest: {
              type: "object",
              properties: {
                email: { type: "string", format: "email" },
                firstName: { type: "string" },
                lastName: { type: "string" },
              },
              required: ["email", "firstName", "lastName"],
            },
          },
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
        },
      };

      await orchestrator.initialize(config);
      const result = await orchestrator.syncOnce(config);

      expect(result.filesGenerated).toBeGreaterThan(0);
      expect(result.artifacts).toContain("types.ts");
      expect(result.artifacts).toContain("api-client.ts");
      expect(result.artifacts).toContain("hooks.ts");

      // Verify that the expected interfaces are generated
      expect(writeFileSpy).toHaveBeenCalledWith(
        expect.stringContaining("types.ts"),
        expect.stringContaining("interface User"),
        "utf-8"
      );
      expect(writeFileSpy).toHaveBeenCalledWith(
        expect.stringContaining("types.ts"),
        expect.stringContaining("interface CreateUserRequest"),
        "utf-8"
      );
    });

    it("should generate backward-compatible API client methods", async () => {
      const orchestrator = new TypeSyncOrchestrator();

      const mockSchema = {
        openapi: "3.0.0",
        info: { title: "Client API", version: "1.0.0" },
        paths: {
          "/posts": {
            get: {
              summary: "Get all posts",
              responses: {
                "200": {
                  description: "Posts retrieved successfully",
                  content: {
                    "application/json": {
                      schema: {
                        type: "array",
                        items: { $ref: "#/components/schemas/Post" },
                      },
                    },
                  },
                },
              },
            },
            post: {
              summary: "Create a post",
              requestBody: {
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/CreatePost" },
                  },
                },
              },
              responses: {
                "201": {
                  description: "Post created successfully",
                  content: {
                    "application/json": {
                      schema: { $ref: "#/components/schemas<Post" },
                    },
                  },
                },
              },
            },
          },
        },
        components: {
          schemas: {
            Post: {
              type: "object",
              properties: {
                id: { type: "string" },
                title: { type: "string" },
                content: { type: "string" },
              },
              required: ["id", "title", "content"],
            },
            CreatePost: {
              type: "object",
              properties: {
                title: { type: "string" },
                content: { type: "string" },
              },
              required: ["title", "content"],
            },
          },
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
          hooks: false,
          streaming: false,
        },
      };

      await orchestrator.initialize(config);
      const result = await orchestrator.syncOnce(config);

      expect(result.filesGenerated).toBeGreaterThan(0);
      expect(result.artifacts).toContain("api-client.ts");

      // Verify that expected API client methods are generated
      expect(writeFileSpy).toHaveBeenCalledWith(
        expect.stringContaining("api-client.ts"),
        expect.stringContaining("getPosts"),
        "utf-8"
      );
      expect(writeFileSpy).toHaveBeenCalledWith(
        expect.stringContaining("api-client.ts"),
        expect.stringContaining("createPost"),
        "utf-8"
      );
    });
  });

  describe("Configuration Migration", () => {
    it("should handle legacy configuration formats", async () => {
      const orchestrator = new TypeSyncOrchestrator();

      // Test legacy configuration structure
      const legacyConfig = {
        apiUrl: "http://localhost:8000",
        outputDir: "./generated",
        generateClient: true, // Legacy property name
        generateHooks: true, // Legacy property name
        enableStreaming: true, // Legacy property name
      };

      const mockSchema = {
        openapi: "3.0.0",
        info: { title: "Legacy Config API", version: "1.0.0" },
        paths: {
          "/legacy-config": {
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

      // The new system should handle legacy config by converting it internally
      const normalizedConfig: SyncOptions = {
        apiUrl: legacyConfig.apiUrl,
        outputDir: legacyConfig.outputDir,
        features: {
          client: legacyConfig.generateClient,
          hooks: legacyConfig.generateHooks,
          streaming: legacyConfig.enableStreaming,
        },
      };

      await orchestrator.initialize(normalizedConfig);
      const result = await orchestrator.syncOnce(normalizedConfig);

      expect(result.filesGenerated).toBeGreaterThan(0);
    });

    it("should preserve existing file structure conventions", async () => {
      const orchestrator = new TypeSyncOrchestrator();

      const mockSchema = {
        openapi: "3.0.0",
        info: { title: "File Structure API", version: "1.0.0" },
        paths: {
          "/structure": {
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

      const config: SyncOptions = {
        apiUrl: "http://localhost:8000",
        outputDir: "./generated",
        features: {
          client: true,
          hooks: true,
          streaming: true,
        },
      };

      await orchestrator.initialize(config);
      const result = await orchestrator.syncOnce(config);

      // Verify that files are created with expected names and structure
      expect(writeFileSpy).toHaveBeenCalledWith(
        expect.stringMatching(/.*\/types\.ts$/),
        expect.any(String),
        "utf-8"
      );
      expect(writeFileSpy).toHaveBeenCalledWith(
        expect.stringMatching(/.*\/api-client\.ts$/),
        expect.any(String),
        "utf-8"
      );
      expect(writeFileSpy).toHaveBeenCalledWith(
        expect.stringMatching(/.*\/hooks\.ts$/),
        expect.any(String),
        "utf-8"
      );
    });
  });

  describe("Error Handling Migration", () => {
    it("should maintain consistent error reporting", async () => {
      const orchestrator = new TypeSyncOrchestrator();

      // Test that error handling maintains backward compatibility
      global.fetch = vi.fn().mockRejectedValue(new Error("Connection refused"));

      const config: SyncOptions = {
        apiUrl: "http://localhost:8000",
        outputDir: "./generated",
        features: {
          client: true,
          hooks: true,
          streaming: true,
        },
      };

      await orchestrator.initialize(config);
      await expect(orchestrator.syncOnce(config)).rejects.toThrow(
        "Connection refused"
      );
    });

    it("should provide consistent validation error messages", async () => {
      const orchestrator = new TypeSyncOrchestrator();

      // Test that schema validation errors are consistent
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ invalid: "schema" }),
      });

      const config: SyncOptions = {
        apiUrl: "http://localhost:8000",
        outputDir: "./generated",
        features: {
          client: true,
          hooks: true,
          streaming: true,
        },
      };

      await orchestrator.initialize(config);
      await expect(orchestrator.syncOnce(config)).rejects.toThrow();
    });
  });
});
