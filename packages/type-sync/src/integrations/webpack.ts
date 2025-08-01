// import type { Configuration } from "webpack";
// Commented out to avoid missing dependency error
type Configuration = {
  plugins?: any[];
};
import type { TypeSyncConfig } from "../config/validation";
import { TypeSyncOrchestrator } from "../orchestrator";
import { PerformanceMonitor } from "../monitoring/performance";
import { promises as fs } from "fs";
import path from "path";

export interface WebpackTypeSyncOptions
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
   * Configuration file path
   */
  configFile?: string;

  /**
   * Custom hook to run after type generation
   */
  onGenerated?: (results: any) => void;
}

/**
 * Webpack plugin for type-sync integration
 */
export class TypeSyncWebpackPlugin {
  private options: WebpackTypeSyncOptions;
  private orchestrator?: TypeSyncOrchestrator;
  private config?: TypeSyncConfig;
  private performanceMonitor?: PerformanceMonitor;

  constructor(options: WebpackTypeSyncOptions = {}) {
    this.options = {
      enabled: true,
      watch: true,
      verbose: false,
      ...options,
    };
  }

  apply(compiler: any) {
    if (this.options.enabled === false) {
      return;
    }

    const pluginName = "TypeSyncWebpackPlugin";

    compiler.hooks.initialize.tap(pluginName, async () => {
      await this.initialize(compiler.context);
    });

    compiler.hooks.beforeCompile.tapAsync(
      pluginName,
      async (params: any, callback: Function) => {
        try {
          await this.runSync();
          callback();
        } catch (error) {
          callback(error);
        }
      }
    );

    if (this.options.watch) {
      compiler.hooks.watchRun.tapAsync(
        pluginName,
        async (compiler: any, callback: Function) => {
          try {
            if (this.shouldRegenerate(compiler)) {
              await this.runSync();
            }
            callback();
          } catch (error) {
            callback(error);
          }
        }
      );
    }

    compiler.hooks.emit.tapAsync(
      pluginName,
      async (compilation: any, callback: Function) => {
        try {
          // Add generated files to compilation assets
          if (this.config && this.orchestrator) {
            const outputDir = this.config.output?.directory || "./dist";
            const files = await fs.readdir(outputDir);

            for (const file of files) {
              if (file.endsWith(".ts") || file.endsWith(".js")) {
                const filePath = path.join(outputDir, file);
                const content = await fs.readFile(filePath, "utf-8");

                compilation.assets[file] = {
                  source: () => content,
                  size: () => content.length,
                };
              }
            }
          }

          callback();
        } catch (error) {
          callback(error);
        }
      }
    );
  }

  private async initialize(context: string): Promise<void> {
    try {
      // Load configuration
      if (this.options.configFile) {
        const configContent = await fs.readFile(
          this.options.configFile,
          "utf-8"
        );
        this.config = JSON.parse(configContent);
      } else {
        this.config =
          (await this.findAndLoadConfig(context)) || this.createDefaultConfig();
      }

      // Merge with inline options
      const syncOptions = {
        apiUrl:
          this.options.apiUrl || this.config?.apiUrl || "http://localhost:8000",
        outputDir:
          this.options.outputDir ||
          this.config?.output?.directory ||
          "./src/generated",
        features: {
          client: true,
          hooks: true,
          streaming: false,
          aiHooks: false,
        },
        performance: {
          enableMonitoring: this.options.verbose || false,
          enableIncrementalGeneration: true,
          maxConcurrency: 4,
          cacheTimeout: 300000,
        },
      };

      // Initialize orchestrator
      this.performanceMonitor = new PerformanceMonitor();
      this.orchestrator = new TypeSyncOrchestrator();

      // Initialize with SyncOptions, not TypeSyncConfig
      await this.orchestrator.initialize(syncOptions);

      if (this.options.verbose) {
        console.log("🔄 TypeSync Webpack plugin initialized");
      }
    } catch (error) {
      console.error("❌ Failed to initialize TypeSync Webpack plugin:", error);
      throw error;
    }
  }

  private async runSync(): Promise<void> {
    if (!this.orchestrator) {
      throw new Error("Orchestrator not initialized");
    }

    try {
      if (this.options.verbose) {
        console.log("🚀 Running type synchronization...");
      }

      const result = await this.orchestrator.syncOnce();

      if (this.options.verbose) {
        console.log(`✅ Generated ${result.filesGenerated} type files`);
      }

      if (this.options.onGenerated) {
        this.options.onGenerated(result);
      }
    } catch (error) {
      console.error("❌ Type synchronization failed:", error);
      throw error;
    }
  }

  private shouldRegenerate(compiler: any): boolean {
    if (!this.config) return false;

    const changedFiles = Object.keys(compiler.modifiedFiles || {});
    const specPath = path.resolve(
      compiler.context,
      this.config.input?.source || "/openapi.json"
    );

    return changedFiles.includes(specPath);
  }

  private async findAndLoadConfig(
    root: string
  ): Promise<TypeSyncConfig | null> {
    const configFiles = ["type-sync.config.json", ".type-sync.json"];

    for (const configFile of configFiles) {
      const configPath = path.join(root, configFile);

      try {
        await fs.access(configPath);
        const content = await fs.readFile(configPath, "utf-8");
        return JSON.parse(content);
      } catch {
        // File doesn't exist, continue
      }
    }

    return null;
  }

  private createDefaultConfig(): TypeSyncConfig {
    return {
      apiUrl: this.options.apiUrl || "http://localhost:8000",
      outputDir: this.options.outputDir || "./src/types",
      input: {
        type: "openapi",
        source: this.options.input?.source || "./openapi.json",
      },
      output: {
        directory: this.options.output?.directory || "./src/types",
        baseDir: this.options.output?.directory || "./src/types",
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
}

export default TypeSyncWebpackPlugin;
