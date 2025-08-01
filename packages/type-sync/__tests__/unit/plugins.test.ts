import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  PluginManager,
  TypeSyncPlugin,
  customHeaderPlugin,
  prettierPlugin,
} from "../../src/plugins/manager";
import type {
  PluginContext,
  GenerationResult,
} from "../../src/plugins/manager";
import type { TypeSyncConfig, OpenAPISchema } from "../../src/types";

describe("Plugin System", () => {
  let pluginManager: PluginManager;
  let mockContext: PluginContext;
  let mockConfig: TypeSyncConfig;
  let mockSchema: OpenAPISchema;

  beforeEach(() => {
    mockConfig = {
      input: {
        type: "openapi",
        source: "./test-api.json",
      },
      output: {
        directory: "./generated",
        generators: [
          {
            type: "typescript",
            options: {
              filename: "types.ts",
            },
          },
        ],
      },
    };

    mockSchema = {
      openapi: "3.0.0",
      info: {
        title: "Test API",
        version: "1.0.0",
      },
      paths: {},
      components: {
        schemas: {
          User: {
            type: "object",
            properties: {
              id: { type: "integer" },
              name: { type: "string" },
            },
          },
        },
      },
    };

    mockContext = {
      config: mockConfig,
      schema: mockSchema,
      outputDirectory: "./generated",
      cacheDirectory: "./.cache",
    };

    pluginManager = new PluginManager(mockContext);
  });

  afterEach(async () => {
    await pluginManager.cleanup();
  });

  describe("PluginManager", () => {
    it("should register plugins correctly", () => {
      const testPlugin: TypeSyncPlugin = {
        meta: {
          name: "test-plugin",
          version: "1.0.0",
          description: "Test plugin",
        },
      };

      pluginManager.register(testPlugin);

      expect(pluginManager.getPlugin("test-plugin")).toBe(testPlugin);
      expect(pluginManager.getEnabledPlugins()).toContain(testPlugin);
    });

    it("should validate plugin options", () => {
      const testPlugin: TypeSyncPlugin = {
        meta: {
          name: "test-plugin",
          version: "1.0.0",
        },
        validateOptions(options: any): boolean | string {
          if (!options.requiredOption) {
            return "requiredOption is required";
          }
          return true;
        },
      };

      expect(() => {
        pluginManager.register(testPlugin, {});
      }).toThrow("requiredOption is required");

      expect(() => {
        pluginManager.register(testPlugin, { requiredOption: "value" });
      }).not.toThrow();
    });

    it("should initialize plugins with options", () => {
      const initSpy = vi.fn();
      const testPlugin: TypeSyncPlugin = {
        meta: {
          name: "test-plugin",
          version: "1.0.0",
        },
        init: initSpy,
      };

      const options = { testOption: "value" };
      pluginManager.register(testPlugin, options);

      expect(initSpy).toHaveBeenCalledWith(options, mockContext);
    });

    it("should execute hooks on all enabled plugins", async () => {
      const hook1 = vi.fn().mockResolvedValue("result1");
      const hook2 = vi.fn().mockResolvedValue("result2");

      const plugin1: TypeSyncPlugin = {
        meta: { name: "plugin1", version: "1.0.0" },
        beforeGeneration: hook1,
      };

      const plugin2: TypeSyncPlugin = {
        meta: { name: "plugin2", version: "1.0.0" },
        beforeGeneration: hook2,
      };

      pluginManager.register(plugin1);
      pluginManager.register(plugin2);

      await pluginManager.executeHook(
        "beforeGeneration",
        mockSchema,
        mockConfig
      );

      expect(hook1).toHaveBeenCalledWith(mockSchema, mockConfig);
      expect(hook2).toHaveBeenCalledWith(mockSchema, mockConfig);
    });

    it("should handle hook errors gracefully", async () => {
      const errorHook = vi.fn().mockRejectedValue(new Error("Hook failed"));
      const successHook = vi.fn().mockResolvedValue("success");
      const onErrorHook = vi.fn();

      const plugin1: TypeSyncPlugin = {
        meta: { name: "plugin1", version: "1.0.0" },
        beforeGeneration: errorHook,
        onError: onErrorHook,
      };

      const plugin2: TypeSyncPlugin = {
        meta: { name: "plugin2", version: "1.0.0" },
        beforeGeneration: successHook,
      };

      pluginManager.register(plugin1);
      pluginManager.register(plugin2);

      // Should not throw even if one plugin fails
      await expect(
        pluginManager.executeHook("beforeGeneration", mockSchema, mockConfig)
      ).resolves.not.toThrow();

      expect(errorHook).toHaveBeenCalled();
      expect(successHook).toHaveBeenCalled();
      expect(onErrorHook).toHaveBeenCalledWith(expect.any(Error), mockContext);
    });

    it("should execute transform hooks sequentially", async () => {
      const transform1 = vi.fn().mockImplementation((schema: any) => ({
        ...schema,
        info: { ...schema.info, description: "Modified by plugin1" },
      }));

      const transform2 = vi.fn().mockImplementation((schema: any) => ({
        ...schema,
        info: { ...schema.info, version: "2.0.0" },
      }));

      const plugin1: TypeSyncPlugin = {
        meta: { name: "plugin1", version: "1.0.0" },
        afterSchemaLoad: transform1,
      };

      const plugin2: TypeSyncPlugin = {
        meta: { name: "plugin2", version: "1.0.0" },
        afterSchemaLoad: transform2,
      };

      pluginManager.register(plugin1);
      pluginManager.register(plugin2);

      const result = await pluginManager.executeTransformHook(
        "afterSchemaLoad",
        mockSchema
      );

      expect(result.info.description).toBe("Modified by plugin1");
      expect(result.info.version).toBe("2.0.0");
    });

    it("should disable and enable plugins", () => {
      const testPlugin: TypeSyncPlugin = {
        meta: { name: "test-plugin", version: "1.0.0" },
      };

      pluginManager.register(testPlugin);
      expect(pluginManager.getEnabledPlugins()).toContain(testPlugin);

      pluginManager.disable("test-plugin");
      expect(pluginManager.getEnabledPlugins()).not.toContain(testPlugin);

      pluginManager.enable("test-plugin");
      expect(pluginManager.getEnabledPlugins()).toContain(testPlugin);
    });
  });

  describe("Built-in Plugins", () => {
    describe("customHeaderPlugin", () => {
      it("should add custom header to generated files", () => {
        const result: GenerationResult = {
          path: "test.ts",
          content: "export interface User { id: number; }",
          size: 35,
          generatedAt: new Date(),
          type: "typescript",
        };

        customHeaderPlugin.options = { header: "/* Custom Header */" };

        const modifiedResult = customHeaderPlugin.afterGeneration!(
          "typescript",
          result,
          mockSchema
        );

        expect(modifiedResult.content).toContain("/* Custom Header */");
        expect(modifiedResult.content).toContain("export interface User");
        expect(modifiedResult.size).toBeGreaterThan(35);
      });

      it("should use default header when no custom header provided", () => {
        const result: GenerationResult = {
          path: "test.ts",
          content: "export interface User { id: number; }",
          size: 35,
          generatedAt: new Date(),
          type: "typescript",
        };

        customHeaderPlugin.options = {};

        const modifiedResult = customHeaderPlugin.afterGeneration!(
          "typescript",
          result,
          mockSchema
        );

        expect(modifiedResult.content).toContain(
          "/* Generated by type-sync at"
        );
        expect(modifiedResult.content).toContain("export interface User");
      });
    });

    describe("prettierPlugin", () => {
      it("should format TypeScript files", async () => {
        // Mock prettier
        const mockPrettier = {
          format: vi
            .fn()
            .mockResolvedValue("export interface User {\n  id: number;\n}\n"),
        };

        vi.doMock("prettier", () => mockPrettier);

        const result: GenerationResult = {
          path: "test.ts",
          content: "export interface User{id:number;}",
          size: 32,
          generatedAt: new Date(),
          type: "typescript",
        };

        prettierPlugin.options = {};

        const modifiedResult = await prettierPlugin.afterGeneration!(
          "typescript",
          result,
          mockSchema
        );

        expect(mockPrettier.format).toHaveBeenCalledWith(
          "export interface User{id:number;}",
          expect.objectContaining({
            parser: "typescript",
            semi: true,
            singleQuote: true,
            trailingComma: "es5",
          })
        );

        expect(modifiedResult.content).toBe(
          "export interface User {\n  id: number;\n}\n"
        );
      });

      it("should skip non-TypeScript files", async () => {
        const result: GenerationResult = {
          path: "test.json",
          content: '{"test": true}',
          size: 15,
          generatedAt: new Date(),
          type: "json",
        };

        const modifiedResult = await prettierPlugin.afterGeneration!(
          "json",
          result,
          mockSchema
        );

        expect(modifiedResult).toBe(result);
      });

      it("should handle prettier errors gracefully", async () => {
        // Mock prettier to throw error
        const mockPrettier = {
          format: vi.fn().mockRejectedValue(new Error("Prettier error")),
        };

        vi.doMock("prettier", () => mockPrettier);

        const consoleSpy = vi
          .spyOn(console, "warn")
          .mockImplementation(() => {});

        const result: GenerationResult = {
          path: "test.ts",
          content: "invalid typescript",
          size: 18,
          generatedAt: new Date(),
          type: "typescript",
        };

        const modifiedResult = await prettierPlugin.afterGeneration!(
          "typescript",
          result,
          mockSchema
        );

        expect(consoleSpy).toHaveBeenCalledWith(
          "Prettier formatting failed:",
          expect.any(Error)
        );
        expect(modifiedResult).toBe(result);

        consoleSpy.mockRestore();
      });
    });
  });

  describe("Plugin Integration", () => {
    it("should work with multiple plugins in sequence", async () => {
      const headerPlugin: TypeSyncPlugin = {
        meta: { name: "header", version: "1.0.0" },
        afterGeneration: (type, result, schema) => ({
          ...result,
          content: "/* Header */\n" + (result.content || ""),
          size: (result.content || "").length + 13,
        }),
      };

      const footerPlugin: TypeSyncPlugin = {
        meta: { name: "footer", version: "1.0.0" },
        afterGeneration: (type, result, schema) => ({
          ...result,
          content: (result.content || "") + "\n/* Footer */",
          size: (result.content || "").length + 13,
        }),
      };

      pluginManager.register(headerPlugin);
      pluginManager.register(footerPlugin);

      let result: GenerationResult = {
        path: "test.ts",
        content: "export interface User { id: number; }",
        size: 35,
        generatedAt: new Date(),
        type: "typescript",
      };

      // Execute afterGeneration hook for both plugins
      for (const plugin of pluginManager.getEnabledPlugins()) {
        if (plugin.afterGeneration) {
          result = await plugin.afterGeneration(
            "typescript",
            result,
            mockSchema
          );
        }
      }

      expect(result.content).toBe(
        "/* Header */\nexport interface User { id: number; }\n/* Footer */"
      );
    });

    it("should handle plugin loading from configuration", async () => {
      const pluginConfigs = [
        {
          name: "custom-header",
          enabled: true,
          options: { header: "/* Custom */" },
        },
        {
          name: "disabled-plugin",
          enabled: false,
        },
      ];

      // Mock plugin loading
      const mockLoadPlugin = vi
        .fn()
        .mockResolvedValueOnce(customHeaderPlugin)
        .mockResolvedValueOnce({
          meta: { name: "disabled-plugin", version: "1.0.0" },
        });

      // Replace the private loadPlugin method
      (pluginManager as any).loadPlugin = mockLoadPlugin;

      await pluginManager.loadFromConfig(pluginConfigs);

      expect(mockLoadPlugin).toHaveBeenCalledTimes(1);
      expect(mockLoadPlugin).toHaveBeenCalledWith("custom-header");
      expect(pluginManager.getEnabledPlugins()).toHaveLength(1);
      expect(pluginManager.getPlugin("custom-header")).toBeDefined();
      expect(pluginManager.getPlugin("disabled-plugin")).toBeUndefined();
    });
  });
});
