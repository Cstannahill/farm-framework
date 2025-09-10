// import type { Plugin } from "vite";
// Commented out to avoid missing dependency error
type Plugin = {
  name: string;
  configResolved?: (config: any) => Promise<void> | void;
  configureServer?: (server: any) => void;
  buildStart?: () => Promise<void> | void;
  generateBundle?: () => Promise<void> | void;
};
import type { TypeSyncConfig } from "../config/validation";
import { TypeSyncOrchestrator } from "../orchestrator";
import { PerformanceMonitor } from "../monitoring/performance";
import type { SyncOptions, SyncResult } from "@farm-framework/types";
import { promises as fs } from "fs";
import path from "path";

export interface ViteTypeSyncOptions
  extends Omit<Partial<TypeSyncConfig>, "watch"> {
  /**
   * Enable/disable the plugin
   */
  enabled?: boolean;

  /**
   * Watch for changes and regenerate types
   */
  watch?: boolean;

  /**
   * Show detailed logs
   */
  verbose?: boolean;

  /**
   * Run type generation on build
   */
  buildTime?: boolean;

  /**
   * Configuration file path
   */
  configFile?: string;

  /**
   * Custom hook to run after type generation
   */
  onGenerated?: (results: any) => void;
}

/**
 * Vite plugin for type-sync integration
 */
export function typeSyncPlugin(options: ViteTypeSyncOptions = {}): Plugin {
  let orchestrator: TypeSyncOrchestrator;
  let config: TypeSyncConfig;
  let performanceMonitor: PerformanceMonitor;

  return {
    name: "type-sync",

    async configResolved(resolvedConfig) {
      if (options.enabled === false) {
        return;
      }

      try {
        // Load configuration
        if (options.configFile) {
          const configContent = await fs.readFile(options.configFile, "utf-8");
          config = JSON.parse(configContent);
        } else {
          // Use inline options or find config file
          config =
            (await findAndLoadConfig(resolvedConfig.root)) ||
            createDefaultConfig(options);
        }

        // Merge with inline options
        config = {
          ...config,
          ...options,
          watch: options.watch
            ? {
              enabled: true,
              patterns: ["**/*.py"],
              ignorePatterns: ["**/node_modules/**"],
              debounceMs: 1000,
              enablePolling: false,
              pollingInterval: 1000,
            }
            : config.watch,
        };

        // Initialize orchestrator
        performanceMonitor = new PerformanceMonitor();
        orchestrator = new TypeSyncOrchestrator();

        if (options.verbose) {
          console.log("🔄 type-sync plugin initialized");
        }
      } catch (error) {
        console.error("❌ Failed to initialize type-sync plugin:", error);
      }
    },

    async buildStart() {
      if (!orchestrator) return;

      try {
        if (options.verbose) {
          console.log("🚀 Running type synchronization...");
        }

        const result = await orchestrator.sync();

        // Success is determined by no exception being thrown
        if (options.verbose) {
          console.log(`✅ Generated ${result.filesGenerated} type files`);
        }

        if (options.onGenerated) {
          options.onGenerated(result);
        }
      } catch (error) {
        console.error("❌ Type synchronization failed:", error);
      }
    },

    configureServer(server) {
      if (!options.watch || !orchestrator) return;

      // Watch OpenAPI specification file
      if (config.input?.source) {
        const watchPath = path.resolve(
          server.config.root,
          config.input?.source
        );

        server.watcher.add(watchPath);

        server.watcher.on("change", async (filePath: string) => {
          if (filePath === watchPath) {
            if (options.verbose) {
              console.log("🔄 OpenAPI spec changed, regenerating types...");
            }

            try {
              const result = await orchestrator.sync();

              if (result.success) {
                console.log("✅ Types regenerated successfully");

                // Trigger HMR for generated files
                result.generatedFiles?.forEach((file: any) => {
                  server.reloadModule(server.moduleGraph.getModuleById(file)!);
                });

                if (options.onGenerated) {
                  options.onGenerated(result);
                }
              } else {
                console.warn("⚠️  Type regeneration completed with errors");
              }
            } catch (error) {
              console.error("❌ Type regeneration failed:", error);
            }
          }
        });
      }
    },

    generateBundle() {
      if (options.buildTime && orchestrator) {
        // Run type generation during build
        orchestrator.sync().catch(console.error);
      }
    },
  };
}

/**
 * Find and load configuration file
 */
async function findAndLoadConfig(root: string): Promise<TypeSyncConfig | null> {
  const configFiles = [
    "type-sync.config.ts",
    "type-sync.config.js",
    "type-sync.config.json",
    ".type-sync.json",
  ];

  for (const configFile of configFiles) {
    const configPath = path.join(root, configFile);

    try {
      await fs.access(configPath);

      if (configFile.endsWith(".json")) {
        const content = await fs.readFile(configPath, "utf-8");
        return JSON.parse(content);
      } else {
        // For .ts and .js files, we'd need to use dynamic import
        // This is simplified for the example
        console.warn(
          `Configuration file ${configFile} found but loading TypeScript/JavaScript configs is not implemented in this example`
        );
      }
    } catch {
      // File doesn't exist, continue
    }
  }

  return null;
}

/**
 * Create default configuration
 */
function createDefaultConfig(options: ViteTypeSyncOptions): TypeSyncConfig {
  return {
    apiUrl: options.apiUrl || "http://localhost:8000",
    outputDir: options.outputDir || "./src/types",
    input: {
      type: "openapi",
      source: options.input?.source || "./openapi.json",
    },
    output: {
      directory: options.output?.directory || "./src/types",
      baseDir: options.output?.directory || "./src/types",
      fileNaming: "camelCase" as const,
      cleanBefore: true,
      createIndex: true,
      enableSourceMaps: false,
      generators: ["typescript", "api-client"],
    },
    cache: {
      enabled: true,
      directory: "./node_modules/.cache/type-sync",
      timeout: 300000,
      enableCompression: true,
      enableMetrics: true,
      maxSize: 100 * 1024 * 1024,
      cleanupInterval: 3600000,
    },
  };
}

export default typeSyncPlugin;
