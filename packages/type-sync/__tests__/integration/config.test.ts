import { describe, it, expect, beforeEach } from "vitest";
import { promises as fs } from "fs";
import path from "path";
import { TypeSyncConfigManager } from "../../src/config/validation";
import type { TypeSyncConfig } from "../../src/types";

describe("Configuration Integration Tests", () => {
  const testDir = path.join(__dirname, "..", "fixtures", "config");
  const tempDir = path.join(testDir, "temp");

  beforeEach(async () => {
    await fs.mkdir(tempDir, { recursive: true });
  });

  describe("Configuration File Loading", () => {
    it("should load and merge multiple configuration sources", async () => {
      // Create base config file
      const baseConfig = {
        input: {
          type: "openapi" as const,
          source: "./api.json",
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
        cache: {
          enabled: true,
          directory: "./.cache",
        },
      };

      const envConfig = {
        output: {
          directory: "./dist/generated", // Override base config
          generators: [
            {
              type: "typescript" as const,
              options: {
                filename: "types.ts",
                exportStyle: "named" as const,
                strictTypes: true, // Add new option
              },
            },
            {
              type: "api-client" as const, // Add new generator
              options: {
                filename: "client.ts",
                clientName: "ApiClient",
              },
            },
          ],
        },
        performance: {
          enableMonitoring: true,
          metricsExport: {
            enabled: true,
            format: "json" as const,
          },
        },
      };

      // Write config files
      await fs.writeFile(
        path.join(tempDir, "type-sync.config.json"),
        JSON.stringify(baseConfig, null, 2)
      );

      await fs.writeFile(
        path.join(tempDir, "type-sync.prod.config.json"),
        JSON.stringify(envConfig, null, 2)
      );

      const configManager = new TypeSyncConfigManager();

      // Load base configuration
      const loadedBaseConfig = await configManager.loadConfigFromFile(
        path.join(tempDir, "type-sync.config.json")
      );

      // Load environment-specific configuration
      const loadedEnvConfig = await configManager.loadConfigFromFile(
        path.join(tempDir, "type-sync.prod.config.json")
      );

      // Merge configurations
      const mergedConfig = configManager.mergeConfigurations(
        loadedBaseConfig,
        loadedEnvConfig
      );

      // Validate merged configuration
      const validatedConfig = await configManager.validateConfig(mergedConfig);

      expect(validatedConfig.input.type).toBe("openapi");
      expect(validatedConfig.input.source).toBe("./api.json");
      expect(validatedConfig.output.directory).toBe("./dist/generated"); // Overridden
      expect(validatedConfig.output.generators).toHaveLength(2); // Merged
      expect(validatedConfig.cache?.enabled).toBe(true);
      expect(validatedConfig.performance?.enableMonitoring).toBe(true);
    });

    it("should handle JavaScript configuration files", async () => {
      const jsConfigContent = `
module.exports = {
  input: {
    type: 'openapi',
    source: process.env.API_SPEC_PATH || './openapi.json'
  },
  output: {
    directory: './src/types',
    generators: [
      {
        type: 'typescript',
        options: {
          filename: 'api-types.ts',
          exportStyle: 'named',
          includeComments: true,
          strictTypes: process.env.NODE_ENV === 'production'
        }
      }
    ]
  },
  cache: {
    enabled: process.env.NODE_ENV !== 'development',
    directory: './node_modules/.cache/type-sync'
  },
  errorHandling: {
    continueOnError: process.env.NODE_ENV === 'development',
    maxRetries: 3
  }
};
`;

      await fs.writeFile(
        path.join(tempDir, "type-sync.config.js"),
        jsConfigContent
      );

      // Set environment variables for testing
      process.env.API_SPEC_PATH = "./custom-api.json";
      process.env.NODE_ENV = "production";

      const configManager = new TypeSyncConfigManager();
      const config = await configManager.loadConfigFromFile(
        path.join(tempDir, "type-sync.config.js")
      );

      expect(config.input.source).toBe("./custom-api.json");
      expect(config.output.generators[0].options.strictTypes).toBe(true);
      expect(config.cache?.enabled).toBe(true);
      expect(config.errorHandling?.continueOnError).toBe(false);

      // Clean up
      delete process.env.API_SPEC_PATH;
      delete process.env.NODE_ENV;
    });

    it("should validate configuration and provide helpful error messages", async () => {
      const invalidConfigs = [
        {
          name: "missing input",
          config: {
            output: {
              directory: "./generated",
              generators: [],
            },
          },
        },
        {
          name: "invalid generator type",
          config: {
            input: { type: "openapi", source: "./api.json" },
            output: {
              directory: "./generated",
              generators: [
                {
                  type: "invalid-generator",
                  options: {},
                },
              ],
            },
          },
        },
        {
          name: "missing required generator options",
          config: {
            input: { type: "openapi", source: "./api.json" },
            output: {
              directory: "./generated",
              generators: [
                {
                  type: "typescript",
                  options: {}, // Missing filename
                },
              ],
            },
          },
        },
      ];

      const configManager = new TypeSyncConfigManager();

      for (const { name, config } of invalidConfigs) {
        await expect(
          configManager.validateConfig(config as any)
        ).rejects.toThrow();
      }
    });
  });

  describe("Environment-specific Configuration", () => {
    it("should load different configs based on environment", async () => {
      const developmentConfig = {
        input: { type: "openapi" as const, source: "./api-dev.json" },
        output: {
          directory: "./src/types",
          generators: [
            {
              type: "typescript" as const,
              options: {
                filename: "types.ts",
                exportStyle: "named" as const,
                includeComments: true,
                strictTypes: false,
              },
            },
          ],
        },
        cache: { enabled: false },
        errorHandling: {
          continueOnError: true,
          maxRetries: 1,
        },
      };

      const productionConfig = {
        input: { type: "openapi" as const, source: "./api-prod.json" },
        output: {
          directory: "./dist/types",
          generators: [
            {
              type: "typescript" as const,
              options: {
                filename: "types.ts",
                exportStyle: "named" as const,
                includeComments: false,
                strictTypes: true,
              },
            },
            {
              type: "api-client" as const,
              options: {
                filename: "client.ts",
                clientName: "ProductionApiClient",
              },
            },
          ],
        },
        cache: { enabled: true, directory: "./node_modules/.cache" },
        errorHandling: {
          continueOnError: false,
          maxRetries: 5,
        },
        performance: {
          enableMonitoring: true,
          optimizations: {
            parallelGeneration: true,
            incrementalGeneration: true,
          },
        },
      };

      await fs.writeFile(
        path.join(tempDir, "type-sync.development.json"),
        JSON.stringify(developmentConfig, null, 2)
      );

      await fs.writeFile(
        path.join(tempDir, "type-sync.production.json"),
        JSON.stringify(productionConfig, null, 2)
      );

      const configManager = new TypeSyncConfigManager();

      // Test development config
      const devConfig = await configManager.loadConfigFromFile(
        path.join(tempDir, "type-sync.development.json")
      );
      expect(devConfig.input.source).toBe("./api-dev.json");
      expect(devConfig.cache?.enabled).toBe(false);
      expect(devConfig.errorHandling?.continueOnError).toBe(true);

      // Test production config
      const prodConfig = await configManager.loadConfigFromFile(
        path.join(tempDir, "type-sync.production.json")
      );
      expect(prodConfig.input.source).toBe("./api-prod.json");
      expect(prodConfig.cache?.enabled).toBe(true);
      expect(prodConfig.output.generators).toHaveLength(2);
      expect(prodConfig.performance?.enableMonitoring).toBe(true);
    });
  });

  describe("Advanced Configuration Features", () => {
    it("should support configuration with custom transforms and plugins", async () => {
      const advancedConfig = {
        input: {
          type: "openapi" as const,
          source: "./api.json",
          transforms: [
            {
              name: "removeDeprecated",
              enabled: true,
            },
            {
              name: "addCustomHeaders",
              enabled: true,
              options: {
                headers: ["X-Custom-Header"],
              },
            },
          ],
        },
        output: {
          directory: "./generated",
          generators: [
            {
              type: "typescript" as const,
              options: {
                filename: "types.ts",
                exportStyle: "named" as const,
                customTypes: {
                  "date-time": "Date",
                  uuid: "string",
                },
                enumStyle: "union" as const,
              },
            },
          ],
          postProcessors: [
            {
              name: "prettier",
              enabled: true,
              options: {
                semi: true,
                singleQuote: true,
                trailingComma: "es5" as const,
              },
            },
            {
              name: "eslint",
              enabled: true,
              options: {
                fix: true,
              },
            },
          ],
        },
        plugins: [
          {
            name: "custom-validator",
            enabled: true,
            options: {
              strict: true,
            },
          },
        ],
        hooks: {
          beforeGeneration: ["validateSchema", "backupExisting"],
          afterGeneration: ["runTests", "updateDocs"],
        },
      };

      await fs.writeFile(
        path.join(tempDir, "advanced-config.json"),
        JSON.stringify(advancedConfig, null, 2)
      );

      const configManager = new TypeSyncConfigManager();
      const config = await configManager.loadConfigFromFile(
        path.join(tempDir, "advanced-config.json")
      );

      expect(config.input.transforms).toHaveLength(2);
      expect(config.output.postProcessors).toHaveLength(2);
      expect(config.plugins).toHaveLength(1);
      expect(config.hooks?.beforeGeneration).toContain("validateSchema");
      expect(config.hooks?.afterGeneration).toContain("runTests");
    });

    it("should validate complex nested configurations", async () => {
      const complexConfig: TypeSyncConfig = {
        input: {
          type: "openapi",
          source: "./api.json",
        },
        output: {
          directory: "./generated",
          generators: [
            {
              type: "typescript",
              options: {
                filename: "types.ts",
                exportStyle: "named",
                interfaces: {
                  prefix: "I",
                  suffix: "Interface",
                },
                enums: {
                  style: "const",
                  casing: "UPPER_CASE",
                },
                arrays: {
                  readonly: true,
                },
                optionalProperties: {
                  style: "question-mark",
                },
              },
            },
            {
              type: "api-client",
              options: {
                filename: "client.ts",
                clientName: "ApiClient",
                httpClient: "fetch",
                authentication: {
                  type: "bearer",
                  tokenProperty: "token",
                },
                errorHandling: {
                  throwOnError: true,
                  retryStrategy: {
                    maxRetries: 3,
                    backoffStrategy: "exponential",
                  },
                },
              },
            },
          ],
        },
        cache: {
          enabled: true,
          directory: "./.cache",
          strategy: "content-hash",
          ttl: 3600000, // 1 hour
        },
        performance: {
          enableMonitoring: true,
          optimizations: {
            parallelGeneration: true,
            incrementalGeneration: true,
            memoryLimit: 512,
          },
          alerts: {
            slowGeneration: 5000,
            highMemoryUsage: 256,
          },
        },
      };

      const configManager = new TypeSyncConfigManager();
      const validatedConfig = await configManager.validateConfig(complexConfig);

      expect(validatedConfig).toBeDefined();
      expect(
        validatedConfig.output.generators[0].options.interfaces?.prefix
      ).toBe("I");
      expect(
        validatedConfig.output.generators[1].options.authentication?.type
      ).toBe("bearer");
      expect(validatedConfig.cache?.strategy).toBe("content-hash");
      expect(validatedConfig.performance?.optimizations?.memoryLimit).toBe(512);
    });
  });
});
