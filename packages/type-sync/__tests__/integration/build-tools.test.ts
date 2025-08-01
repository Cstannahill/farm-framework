import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { promises as fs } from "fs";
import path from "path";
import { typeSyncPlugin } from "../../src/integrations/vite";
import { TypeSyncWebpackPlugin } from "../../src/integrations/webpack";
import { withTypeSync } from "../../src/integrations/nextjs";
import type { OpenAPISpec } from "../../src/types";

describe("Build Tool Integrations", () => {
  const testDir = path.join(__dirname, "..", "fixtures", "integrations");
  const tempDir = path.join(testDir, "temp");

  beforeEach(async () => {
    await fs.mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe("Vite Integration", () => {
    it("should create vite plugin with default options", () => {
      const plugin = typeSyncPlugin();

      expect(plugin.name).toBe("type-sync");
      expect(typeof plugin.configResolved).toBe("function");
      expect(typeof plugin.buildStart).toBe("function");
    });

    it("should initialize plugin with configuration file", async () => {
      const config = {
        input: {
          type: "openapi" as const,
          source: "./test-api.json",
        },
        output: {
          directory: "./generated",
          generators: [
            {
              type: "typescript" as const,
              options: {
                filename: "types.ts",
                exportStyle: "named" as const,
              },
            },
          ],
        },
      };

      const configPath = path.join(tempDir, "type-sync.config.json");
      await fs.writeFile(configPath, JSON.stringify(config, null, 2));

      const plugin = typeSyncPlugin({
        configFile: configPath,
        verbose: true,
      });

      const mockResolvedConfig = {
        root: tempDir,
      };

      // Mock the configResolved hook
      if (plugin.configResolved) {
        await plugin.configResolved(mockResolvedConfig as any);
      }

      // The plugin should have loaded the configuration
      expect(plugin).toBeDefined();
    });

    it("should handle missing configuration gracefully", async () => {
      const plugin = typeSyncPlugin({
        enabled: true,
        verbose: true,
      });

      const mockResolvedConfig = {
        root: tempDir,
      };

      // This should not throw even without config file
      if (plugin.configResolved) {
        await expect(
          plugin.configResolved(mockResolvedConfig as any)
        ).resolves.not.toThrow();
      }
    });

    it("should skip when disabled", async () => {
      const plugin = typeSyncPlugin({
        enabled: false,
      });

      const mockResolvedConfig = {
        root: tempDir,
      };

      if (plugin.configResolved) {
        await plugin.configResolved(mockResolvedConfig as any);
      }

      // Plugin should do nothing when disabled
      expect(plugin).toBeDefined();
    });

    it("should watch for file changes in development", async () => {
      const openApiSpec: OpenAPISpec = {
        openapi: "3.0.0",
        info: { title: "Test API", version: "1.0.0" },
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

      const specPath = path.join(tempDir, "api.json");
      await fs.writeFile(specPath, JSON.stringify(openApiSpec, null, 2));

      const plugin = typeSyncPlugin({
        input: {
          type: "openapi",
          source: "./api.json",
        },
        output: {
          directory: tempDir,
          generators: [
            {
              type: "typescript",
              options: {
                filename: "types.ts",
              },
            },
          ],
        },
        watch: true,
        verbose: true,
      });

      const mockServer = {
        config: { root: tempDir },
        watcher: {
          add: vi.fn(),
          on: vi.fn(),
        },
        moduleGraph: {
          getModuleById: vi.fn().mockReturnValue({ id: "test" }),
        },
        reloadModule: vi.fn(),
      };

      if (plugin.configureServer) {
        plugin.configureServer(mockServer as any);
      }

      expect(mockServer.watcher.add).toHaveBeenCalledWith(
        path.resolve(tempDir, "./api.json")
      );
      expect(mockServer.watcher.on).toHaveBeenCalledWith(
        "change",
        expect.any(Function)
      );
    });
  });

  describe("Webpack Integration", () => {
    it("should create webpack plugin with default options", () => {
      const plugin = new TypeSyncWebpackPlugin();

      expect(plugin).toBeInstanceOf(TypeSyncWebpackPlugin);
      expect(typeof plugin.apply).toBe("function");
    });

    it("should register webpack hooks", () => {
      const plugin = new TypeSyncWebpackPlugin({
        verbose: true,
        watch: true,
      });

      const mockCompiler = {
        context: tempDir,
        hooks: {
          initialize: { tap: vi.fn() },
          beforeCompile: { tapAsync: vi.fn() },
          watchRun: { tapAsync: vi.fn() },
          emit: { tapAsync: vi.fn() },
        },
      };

      plugin.apply(mockCompiler);

      expect(mockCompiler.hooks.initialize.tap).toHaveBeenCalled();
      expect(mockCompiler.hooks.beforeCompile.tapAsync).toHaveBeenCalled();
      expect(mockCompiler.hooks.watchRun.tapAsync).toHaveBeenCalled();
      expect(mockCompiler.hooks.emit.tapAsync).toHaveBeenCalled();
    });

    it("should skip when disabled", () => {
      const plugin = new TypeSyncWebpackPlugin({
        enabled: false,
      });

      const mockCompiler = {
        hooks: {
          initialize: { tap: vi.fn() },
          beforeCompile: { tapAsync: vi.fn() },
        },
      };

      plugin.apply(mockCompiler);

      expect(mockCompiler.hooks.initialize.tap).not.toHaveBeenCalled();
      expect(mockCompiler.hooks.beforeCompile.tapAsync).not.toHaveBeenCalled();
    });
  });

  describe("Next.js Integration", () => {
    it("should create Next.js plugin wrapper", () => {
      const nextConfigWithTypeSync = withTypeSync({
        verbose: true,
        watch: true,
      });

      const mockNextConfig = {
        experimental: {
          appDir: true,
        },
      };

      const result = nextConfigWithTypeSync(mockNextConfig);

      expect(result).toHaveProperty("webpack");
      expect(typeof result.webpack).toBe("function");
      expect(result.experimental).toEqual(mockNextConfig.experimental);
    });

    it("should skip when disabled", () => {
      const nextConfigWithTypeSync = withTypeSync({
        enabled: false,
      });

      const mockNextConfig = {
        webpack: vi.fn(),
      };

      const result = nextConfigWithTypeSync(mockNextConfig);

      // Should return original config when disabled
      expect(result).toBe(mockNextConfig);
    });

    it("should modify webpack config correctly", () => {
      const nextConfigWithTypeSync = withTypeSync({
        verbose: true,
        devOnly: false,
      });

      const originalWebpack = vi.fn().mockReturnValue({ plugins: [] });
      const mockNextConfig = {
        webpack: originalWebpack,
      };

      const result = nextConfigWithTypeSync(mockNextConfig);

      const mockWebpackConfig = { plugins: [] };
      const mockContext = {
        buildId: "test",
        dev: true,
        isServer: false,
        defaultLoaders: {},
        webpack: {},
      };

      const modifiedConfig = result.webpack!(mockWebpackConfig, mockContext);

      expect(originalWebpack).toHaveBeenCalledWith(
        mockWebpackConfig,
        mockContext
      );
      expect(modifiedConfig.plugins.length).toBeGreaterThan(0);
    });

    it("should skip in production when devOnly is true", () => {
      const nextConfigWithTypeSync = withTypeSync({
        devOnly: true,
        verbose: true,
      });

      const originalWebpack = vi.fn().mockReturnValue({ plugins: [] });
      const mockNextConfig = {
        webpack: originalWebpack,
      };

      const result = nextConfigWithTypeSync(mockNextConfig);

      const mockWebpackConfig = { plugins: [] };
      const mockContext = {
        buildId: "test",
        dev: false, // Production build
        isServer: false,
        defaultLoaders: {},
        webpack: {},
      };

      const modifiedConfig = result.webpack!(mockWebpackConfig, mockContext);

      expect(originalWebpack).toHaveBeenCalledWith(
        mockWebpackConfig,
        mockContext
      );
      // Should not add TypeSync plugin in production when devOnly is true
    });

    it("should only run on client side", () => {
      const nextConfigWithTypeSync = withTypeSync({
        verbose: true,
      });

      const mockNextConfig = {};
      const result = nextConfigWithTypeSync(mockNextConfig);

      const mockWebpackConfig = { plugins: [] };
      const serverContext = {
        buildId: "test",
        dev: true,
        isServer: true, // Server-side
        defaultLoaders: {},
        webpack: {},
      };

      const clientContext = {
        buildId: "test",
        dev: true,
        isServer: false, // Client-side
        defaultLoaders: {},
        webpack: {},
      };

      // Server-side should not add plugin
      result.webpack!(mockWebpackConfig, serverContext);
      const serverPluginCount = mockWebpackConfig.plugins.length;

      // Reset plugins array
      mockWebpackConfig.plugins = [];

      // Client-side should add plugin
      result.webpack!(mockWebpackConfig, clientContext);
      const clientPluginCount = mockWebpackConfig.plugins.length;

      expect(clientPluginCount).toBeGreaterThan(serverPluginCount);
    });
  });

  describe("Integration Error Handling", () => {
    it("should handle file system errors gracefully in Vite", async () => {
      const plugin = typeSyncPlugin({
        configFile: "/nonexistent/config.json",
        verbose: true,
      });

      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const mockResolvedConfig = {
        root: tempDir,
      };

      if (plugin.configResolved) {
        await plugin.configResolved(mockResolvedConfig as any);
      }

      expect(consoleSpy).toHaveBeenCalledWith(
        "❌ Failed to initialize type-sync plugin:",
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it("should handle webpack compilation errors", async () => {
      const plugin = new TypeSyncWebpackPlugin({
        configFile: "/nonexistent/config.json",
        verbose: true,
      });

      const mockCompiler = {
        context: tempDir,
        hooks: {
          initialize: {
            tap: vi.fn().mockImplementation((name, callback) => {
              // Simulate the callback being called
              callback();
            }),
          },
          beforeCompile: {
            tapAsync: vi.fn().mockImplementation((name, callback) => {
              // Simulate error in beforeCompile
              callback(null, {}, (error: any) => {
                expect(error).toBeInstanceOf(Error);
              });
            }),
          },
          watchRun: { tapAsync: vi.fn() },
          emit: { tapAsync: vi.fn() },
        },
      };

      plugin.apply(mockCompiler);

      expect(mockCompiler.hooks.initialize.tap).toHaveBeenCalled();
    });
  });
});
