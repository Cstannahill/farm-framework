// Optional Next.js integration - only works when Next.js is installed
// We'll use dynamic imports to avoid build-time dependencies
import type { TypeSyncConfig } from "../config/validation";
import { TypeSyncOrchestrator } from "../orchestrator";
import { PerformanceMonitor } from "../monitoring/performance";
import type { SyncOptions, SyncResult } from "@farm-framework/types";
import { promises as fs } from "fs";
import path from "path";

export interface NextJSTypeSyncOptions {
  /**
   * Enable/disable the plugin
   */
  enabled?: boolean;

  /**
   * API URL for type synchronization
   */
  apiUrl?: string;

  /**
   * Output directory for generated types
   */
  outputDir?: string;

  /**
   * Input configuration
   */
  input?: {
    source?: string;
    type?: string;
  };

  /**
   * Watch for changes (simplified as boolean for Next.js integration)
   */
  watch?: boolean;

  /**
   * Verbose logging
   */
  verbose?: boolean;

  /**
   * Output configuration
   */
  output?: {
    directory?: string;
    generators?: any[];
  };

  /**
   * Configuration file path
   */
  configFile?: string;

  /**
   * Run during development only
   */
  devOnly?: boolean;

  /**
   * Custom hook to run after type generation
   */
  onGenerated?: (results: any) => void;
}

// Simple stub for NextConfig since we don't have next dependency
type NextConfigType = Record<string, any>;

/**
 * Next.js plugin for type-sync integration
 */
export function withTypeSync(options: NextJSTypeSyncOptions = {}) {
  return async (nextConfig: NextConfigType = {}): Promise<NextConfigType> => {
    if (options.enabled === false) {
      return nextConfig;
    }

    // Try to load Next.js types dynamically
    let NextConfig: any = {};
    try {
      // Use dynamic import with type assertion to avoid TypeScript resolution
      const nextModule = await import("next" as any);
      NextConfig = nextModule.NextConfig;
    } catch {
      // Next.js not available - use basic interface
      NextConfig = {};
    }

    const typeSyncConfig = {
      enabled: true,
      watch: true,
      verbose: false,
      devOnly: false,
      ...options,
    };

    return {
      ...nextConfig,
      webpack: (
        config: any,
        { buildId, dev, isServer, defaultLoaders, webpack }: any
      ) => {
        // Skip in production if devOnly is true
        if (typeSyncConfig.devOnly && !dev) {
          return typeof nextConfig.webpack === "function"
            ? nextConfig.webpack(config, {
              buildId,
              dev,
              isServer,
              defaultLoaders,
              webpack,
            })
            : config;
        }

        // Add TypeSync plugin
        config.plugins = config.plugins || [];
        config.plugins.push(
          new TypeSyncNextPlugin(typeSyncConfig, { dev, isServer })
        );

        // Call the original webpack config function if it exists
        if (typeof nextConfig.webpack === "function") {
          return nextConfig.webpack(config, {
            buildId,
            dev,
            isServer,
            defaultLoaders,
            webpack,
          });
        }

        return config;
      },
    };
  };
}

/**
 * Internal Next.js plugin implementation
 */
class TypeSyncNextPlugin {
  private options: NextJSTypeSyncOptions;
  private nextContext: { dev: boolean; isServer: boolean };
  private orchestrator?: TypeSyncOrchestrator;
  private config?: TypeSyncConfig;
  private performanceMonitor?: PerformanceMonitor;
  private initialized = false;

  constructor(
    options: NextJSTypeSyncOptions,
    nextContext: { dev: boolean; isServer: boolean }
  ) {
    this.options = options;
    this.nextContext = nextContext;
  }

  apply(compiler: any) {
    const pluginName = "TypeSyncNextPlugin";

    // Only run on the client side to avoid duplicate execution
    if (this.nextContext.isServer) {
      return;
    }

    compiler.hooks.beforeCompile.tapAsync(
      pluginName,
      async (params: any, callback: Function) => {
        try {
          if (!this.initialized) {
            await this.initialize(compiler.context);
            this.initialized = true;
          }

          await this.runSync();
          callback();
        } catch (error) {
          if (this.options.verbose) {
            console.error("❌ TypeSync failed:", error);
          }
          // Don't fail the build, just log the error
          callback();
        }
      }
    );

    if (this.options.watch && this.nextContext.dev) {
      compiler.hooks.watchRun.tapAsync(
        pluginName,
        async (compiler: any, callback: Function) => {
          try {
            if (this.shouldRegenerate(compiler)) {
              await this.runSync();
            }
            callback();
          } catch (error) {
            if (this.options.verbose) {
              console.error("❌ TypeSync watch failed:", error);
            }
            callback();
          }
        }
      );
    }
  }

  private async initialize(context: string): Promise<void> {
    try {
      // Load configuration
      if (this.options.configFile) {
        const configPath = path.resolve(context, this.options.configFile);
        const configContent = await fs.readFile(configPath, "utf-8");
        this.config = JSON.parse(configContent);
      } else {
        this.config =
          (await this.findAndLoadConfig(context)) || this.createDefaultConfig();
      }

      // Merge with inline options
      const defaultOutput = {
        directory:
          this.options.outputDir || this.config?.outputDir || "./src/generated",
        baseDir:
          this.options.outputDir || this.config?.outputDir || "./src/generated",
        fileNaming: "camelCase" as const,
        cleanBefore: true,
        createIndex: true,
        enableSourceMaps: false,
        generators: this.options.output?.generators ||
          this.config?.output?.generators || ["typescript"],
      };

      // Convert boolean watch to WatchConfig object
      let watchConfig;
      if (this.options.watch === true) {
        watchConfig = {
          enabled: true,
          patterns: ["**/*.py"],
          ignorePatterns: ["**/__pycache__/**", "**/*.pyc"],
          debounceMs: 300,
          enablePolling: false,
          pollingInterval: 1000,
        };
      } else if (typeof this.config?.watch === "object") {
        watchConfig = this.config.watch;
      } else if (this.config?.watch === true) {
        watchConfig = {
          enabled: true,
          patterns: ["**/*.py"],
          ignorePatterns: ["**/__pycache__/**", "**/*.pyc"],
          debounceMs: 300,
          enablePolling: false,
          pollingInterval: 1000,
        };
      } else {
        watchConfig = undefined;
      }

      this.config = {
        ...this.config,
        ...this.options,
        apiUrl:
          this.options.apiUrl || this.config?.apiUrl || "http://localhost:8000",
        outputDir:
          this.options.outputDir || this.config?.outputDir || "./src/generated",
        input: {
          source:
            this.options.input?.source ||
            this.config?.input?.source ||
            "/openapi.json",
          type:
            this.options.input?.type || this.config?.input?.type || "openapi",
        },
        output: {
          ...defaultOutput,
          ...this.config?.output,
          ...this.options.output,
        },
        watch: watchConfig,
      };

      // Initialize orchestrator
      this.performanceMonitor = new PerformanceMonitor();
      this.orchestrator = new TypeSyncOrchestrator();

      if (this.options.verbose) {
        console.log("🔄 TypeSync Next.js plugin initialized");
      }
    } catch (error) {
      console.error("❌ Failed to initialize TypeSync Next.js plugin:", error);
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

      const result = await this.orchestrator.sync();

      // Success is determined by no exception being thrown
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

    return changedFiles.some((file) => file === specPath);
  }

  private async findAndLoadConfig(
    root: string
  ): Promise<TypeSyncConfig | null> {
    const configFiles = [
      "type-sync.config.json",
      ".type-sync.json",
      "next.type-sync.json",
    ];

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
      apiUrl: "http://localhost:3000",
      outputDir: "./types",
      input: {
        type: "openapi",
        source: this.options.input?.source || "./public/openapi.json",
      },
      output: {
        directory: this.options.output?.directory || "./types",
        baseDir: this.options.output?.directory || "./types",
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
