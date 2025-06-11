import { TypeSyncOrchestrator } from "@farm-framework/type-sync";
import type { SyncOptions, SyncResult } from "@farm-framework/type-sync";
import type { FarmConfig } from "../config/types";
import { performance } from "perf_hooks";
import chalk from "chalk";

/** Enhanced wrapper orchestrator that hooks framework specifics into type-sync. */
export interface CodegenOptions extends SyncOptions {
  verbose?: boolean;
  dryRun?: boolean;
  profile?: boolean;
  progressCallback?: (progress: ProgressInfo) => void;
}

export interface ProgressInfo {
  stage:
    | "initialization"
    | "extraction"
    | "generation"
    | "caching"
    | "completion";
  message: string;
  progress: number; // 0-100
  details?: any;
}

/**
 * Framework-aware orchestrator that integrates type-sync with FARM configuration
 * and provides enhanced CLI features like progress reporting and profiling.
 */
export class CodegenOrchestrator {
  private typeSync = new TypeSyncOrchestrator();
  private startTime = 0;
  private progressCallback?: (progress: ProgressInfo) => void;
  private isVerbose = false;

  constructor(private farmConfig?: FarmConfig) {}

  async initialize(config: CodegenOptions) {
    this.progressCallback = config.progressCallback;
    this.isVerbose = config.verbose || false;
    this.reportProgress("initialization", "Initializing code generation...", 0);

    // Merge farm config with codegen options
    const enhancedConfig = this.mergeWithFarmConfig(config);

    await this.typeSync.initialize(enhancedConfig);
    this.reportProgress("initialization", "Initialization complete", 20);
  }

  async run(
    options: { watch?: boolean; dryRun?: boolean } = {}
  ): Promise<SyncResult> {
    this.startTime = performance.now();

    try {
      if (options.watch) {
        return await this.runWatch();
      } else {
        return await this.runOnce(options);
      }
    } catch (error) {
      this.reportProgress("completion", `Error: ${error}`, 100, { error });
      throw error;
    }
  }

  private async runOnce(
    options: { dryRun?: boolean } = {}
  ): Promise<SyncResult> {
    this.reportProgress("extraction", "Extracting API schema...", 30);

    if (options.dryRun) {
      this.reportProgress(
        "completion",
        "Dry run complete - no files generated",
        100
      );
      return {
        filesGenerated: 0,
        fromCache: false,
        artifacts: [],
        performance: {
          totalTime: performance.now() - this.startTime,
          extractionTime: 0,
          generationTime: 0,
          cacheTime: 0,
          parallelJobs: 0,
        },
      };
    }

    this.reportProgress("generation", "Generating TypeScript artifacts...", 60);
    const result = await this.typeSync.syncOnce();

    this.reportProgress("completion", "Code generation complete", 100, result); // Enhance result with framework-specific data
    return {
      ...result,
      performance: {
        totalTime: performance.now() - this.startTime,
        extractionTime: result.performance?.extractionTime || 0,
        generationTime: result.performance?.generationTime || 0,
        cacheTime: result.performance?.cacheTime || 0,
        parallelJobs: result.performance?.parallelJobs || 0,
      },
    };
  }

  private async runWatch(): Promise<SyncResult> {
    this.reportProgress("initialization", "Starting watch mode...", 0);

    // Start watching - this doesn't return immediately
    const config = {
      apiUrl: "http://localhost:8000",
      outputDir: ".farm/types/generated",
      features: {
        client: true,
        hooks: true,
        streaming: true,
        aiHooks: true,
      },
    };

    await this.typeSync.watch(config);

    // This won't actually be reached since watch() doesn't return
    return {
      filesGenerated: 0,
      fromCache: false,
      artifacts: [],
    };
  }

  private mergeWithFarmConfig(config: CodegenOptions): SyncOptions {
    // Merge with farm.config.ts settings if available
    const defaultConfig: SyncOptions = {
      apiUrl: this.farmConfig?.development?.api?.url || "http://localhost:8000",
      outputDir: config.outputDir || ".farm/types/generated",
      features: {
        client: true,
        hooks: true,
        streaming: true,
        aiHooks: this.farmConfig?.ai?.enabled || false,
      },
      performance: {
        enableMonitoring: config.verbose || false,
        enableIncrementalGeneration: true,
        maxConcurrency: 4,
        cacheTimeout: 300000,
      },
    };

    return {
      ...defaultConfig,
      ...config,
      features: {
        ...defaultConfig.features,
        ...config.features,
      },
      performance: {
        enableMonitoring:
          config.performance?.enableMonitoring ?? (config.verbose || false),
        enableIncrementalGeneration:
          config.performance?.enableIncrementalGeneration ?? true,
        maxConcurrency: config.performance?.maxConcurrency ?? 4,
        cacheTimeout: config.performance?.cacheTimeout ?? 300000,
      },
    };
  }
  private reportProgress(
    stage: ProgressInfo["stage"],
    message: string,
    progress: number,
    details?: any
  ) {
    const progressInfo: ProgressInfo = { stage, message, progress, details };

    // Only log if verbose mode is enabled
    if (this.isVerbose || process.env.NODE_ENV === "development") {
      console.log(chalk.blue(`[${stage}]`), message, `(${progress}%)`);
    }

    if (this.progressCallback) {
      this.progressCallback(progressInfo);
    }
  }

  /**
   * Get performance metrics from the last run.
   */
  getMetrics() {
    return this.typeSync.getLastMetrics?.();
  }

  /**
   * Register custom generator.
   */
  registerGenerator(type: string, generator: any) {
    this.typeSync.registerGenerator?.(type, generator);
  }
}
