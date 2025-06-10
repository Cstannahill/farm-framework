// packages/core/src/codegen/type-sync/orchestrator.ts
import { OpenAPIExtractor } from "./extractors/openapi";
import { TypeScriptGenerator } from "./generators/typescript";
import { APIClientGenerator } from "./generators/api-client";
import { ReactHookGenerator } from "./generators/react-hooks";
import { AIHookGenerator } from "./generators/ai-hooks";
import { GenerationCache } from "./cache";
import { TypeDiffer } from "./type-sync";
import fsExtra from "fs-extra";
import path from "path";
import crypto from "crypto";
import { performance } from "perf_hooks";
import type { OpenAPISchema } from "./types";
const fs = fsExtra;
const { ensureDir } = fsExtra;

/**
 * Configuration options controlling the type synchronization process.
 */
export interface SyncOptions {
  apiUrl: string;
  outputDir: string;
  features: {
    client: boolean;
    hooks: boolean;
    streaming: boolean;
    aiHooks: boolean;
  };
  performance?: {
    enableMonitoring: boolean;
    enableIncrementalGeneration: boolean;
    maxConcurrency: number;
    cacheTimeout: number;
  };
  generators?: {
    typescript?: any;
    apiClient?: any;
    reactHooks?: any;
    aiHooks?: any;
  };
}

/**
 * Result summary returned after running a synchronization cycle.
 */
export interface SyncResult {
  filesGenerated: number;
  fromCache: boolean;
  artifacts?: string[];
  performance?: {
    totalTime: number;
    extractionTime: number;
    generationTime: number;
    cacheTime: number;
    parallelJobs: number;
  };
  generationDetails?: {
    generator: string;
    file: string;
    time: number;
    fromCache: boolean;
    size: number;
  }[];
}

/**
 * Performance metrics for monitoring generation cycles
 */
export interface PerformanceMetrics {
  cycleStart: number;
  extractionStart?: number;
  extractionEnd?: number;
  generationStart?: number;
  generationEnd?: number;
  cacheStart?: number;
  cacheEnd?: number;
  totalFiles: number;
  cachedFiles: number;
  generatedFiles: number;
}

interface Generator {
  generate: (
    schema: OpenAPISchema,
    opts: any
  ) => Promise<{ path: string; checksum?: string; size?: number }>; // enhanced
}

/**
 * Coordinates extraction of OpenAPI schemas and generation of TypeScript
 * artifacts used by the framework. Enhanced with performance monitoring,
 * incremental generation, and parallel processing.
 */
export class TypeSyncOrchestrator {
  private extractor = new OpenAPIExtractor();
  private cache = new GenerationCache(".farm/cache/types");
  private differ = new TypeDiffer();
  private generators = new Map<string, Generator>();
  private config: SyncOptions | null = null;
  private metrics: PerformanceMetrics | null = null;
  private fileChecksums = new Map<string, string>();

  /**
   * Instantiate the orchestrator with default generators.
   */
  constructor() {
    this.initializeGenerators();
  }

  /**
   * Register built-in generator implementations.
   */
  private initializeGenerators() {
    this.generators.set(
      "types",
      new TypeScriptGenerator() as unknown as Generator
    );
    this.generators.set(
      "client",
      new APIClientGenerator() as unknown as Generator
    );
    this.generators.set(
      "hooks",
      new ReactHookGenerator() as unknown as Generator
    );
    this.generators.set(
      "ai-hooks",
      new AIHookGenerator() as unknown as Generator
    );
  }

  /**
   * Register a custom generator for a specific type.
   */
  registerGenerator(type: string, generator: Generator) {
    this.generators.set(type, generator);
  }

  /**
   * Prepare the orchestrator for operation.
   */
  async initialize(config: SyncOptions) {
    this.config = {
      ...config,
      performance: {
        enableMonitoring: true,
        enableIncrementalGeneration: true,
        maxConcurrency: 4,
        cacheTimeout: 300000, // 5 minutes
        ...config.performance,
      },
    };
    await ensureDir(config.outputDir);

    // Initialize cache with enhanced settings
    await this.cache.initialize({
      timeout: this.config.performance?.cacheTimeout || 300000,
      enableCompression: true,
      enableMetrics: this.config.performance?.enableMonitoring || true,
    });

    // Load existing file checksums for incremental generation
    if (this.config.performance?.enableIncrementalGeneration) {
      await this.loadFileChecksums();
    }
  }

  /**
   * Determine whether a generator should run based on current feature flags.
   */
  private isFeatureEnabled(genType: string): boolean {
    if (!this.config) return false;
    if (genType === "client") return this.config.features.client;
    if (genType === "hooks") return this.config.features.hooks;
    if (genType === "ai-hooks") return this.config.features.aiHooks;
    return true;
  }

  /**
   * Run a single synchronization cycle, generating any necessary artifacts.
   * Enhanced with performance monitoring and incremental generation.
   */
  async syncOnce(opts?: Partial<SyncOptions>): Promise<SyncResult> {
    if (!this.config) throw new Error("Orchestrator not initialized");
    const config = { ...this.config, ...opts } as SyncOptions;

    // Initialize performance tracking
    this.metrics = {
      cycleStart: performance.now(),
      totalFiles: 0,
      cachedFiles: 0,
      generatedFiles: 0,
    };

    try {
      // Phase 1: Schema Extraction
      this.metrics.extractionStart = performance.now();
      const schema = await this.extractSchema(config);
      this.metrics.extractionEnd = performance.now();

      // Phase 2: Cache Check
      this.metrics.cacheStart = performance.now();
      const schemaHash = this.cache.hashSchema(schema);
      const cached = await this.cache.get(schemaHash);

      // Check if we can use cached results
      if (cached && !this.differ.hasSchemaChanges(cached.schema, schema)) {
        this.metrics.cacheEnd = performance.now();

        // Verify cached files still exist and are valid
        if (
          config.performance?.enableIncrementalGeneration &&
          (await this.validateCachedFiles(cached.results))
        ) {
          return this.buildCacheResult(cached.results);
        }
      }
      this.metrics.cacheEnd = performance.now();

      // Phase 3: Generation
      this.metrics.generationStart = performance.now();
      const results = await this.generateArtifacts(
        schema,
        config.outputDir,
        config
      );
      this.metrics.generationEnd = performance.now();

      // Phase 4: Cache Update
      await this.cache.set(schemaHash, {
        schema,
        results,
        timestamp: Date.now(),
        version: "1.0",
      });

      // Update file checksums for incremental generation
      if (config.performance?.enableIncrementalGeneration) {
        await this.updateFileChecksums(results);
      }

      return this.buildGenerationResult(results);
    } catch (error) {
      console.error("Sync cycle failed:", error);
      throw error;
    }
  }
  /**
   * Extract schema with error handling and performance tracking.
   */
  private async extractSchema(config: SyncOptions): Promise<OpenAPISchema> {
    const outputPath = path.join(config.outputDir, "openapi.json");

    try {
      const result = await this.extractor.extractFromFastAPI(".", outputPath, {
        timeout: config.performance?.cacheTimeout || 30000,
        enableCache: config.performance?.enableIncrementalGeneration !== false,
        retries: 2,
        healthCheckEndpoint: "/health",
      });

      // Log extraction details if monitoring enabled
      if (config.performance?.enableMonitoring) {
        console.log(
          `📄 Schema extracted via ${result.source} in ${Math.round(result.extractionTime)}ms`
        );
        if (result.serverStartupTime) {
          console.log(
            `🚀 Server startup took ${Math.round(result.serverStartupTime)}ms`
          );
        }
      }

      return result.schema;
    } catch (error) {
      console.error("Schema extraction failed:", error);

      // Try to use existing schema as fallback
      if (await fs.pathExists(outputPath)) {
        console.warn("Using existing schema as fallback");
        return await fs.readJson(outputPath);
      }

      throw new Error("Schema extraction failed and no fallback available");
    }
  }

  /**
   * Validate that cached files still exist and match expected checksums.
   */
  private async validateCachedFiles(cachedResults: any[]): Promise<boolean> {
    for (const result of cachedResults) {
      if (!(await fs.pathExists(result.path))) {
        return false;
      }

      // Check file checksum if available
      if (result.checksum) {
        const content = await fs.readFile(result.path, "utf8");
        const currentChecksum = this.generateChecksum(content);
        if (currentChecksum !== result.checksum) {
          return false;
        }
      }
    }
    return true;
  }

  /**
   * Generate all artifacts for the provided schema with parallel processing.
   */
  private async generateArtifacts(
    schema: OpenAPISchema,
    outputDir: string,
    config: SyncOptions
  ): Promise<
    Array<{
      path: string;
      checksum?: string;
      size?: number;
      generator?: string;
      time?: number;
    }>
  > {
    const results: Array<{
      path: string;
      checksum?: string;
      size?: number;
      generator?: string;
      time?: number;
    }> = [];
    const order = ["types", "client", "hooks", "ai-hooks"];

    // Determine which generators to run
    const enabledGenerators = order.filter((type) => {
      const generator = this.generators.get(type);
      return generator && this.isFeatureEnabled(type);
    });

    this.metrics!.totalFiles = enabledGenerators.length;

    // Run generators based on concurrency settings
    const maxConcurrency = config.performance?.maxConcurrency || 4;
    const useParallel = enabledGenerators.length > 1 && maxConcurrency > 1;

    if (useParallel) {
      // Parallel generation for non-dependent generators
      const parallelGroups =
        this.groupGeneratorsByDependency(enabledGenerators);

      for (const group of parallelGroups) {
        const groupPromises = group.map((type) =>
          this.runGenerator(type, schema, outputDir, config)
        );
        const groupResults = await Promise.all(groupPromises);
        results.push(...groupResults);
      }
    } else {
      // Sequential generation
      for (const type of enabledGenerators) {
        const result = await this.runGenerator(type, schema, outputDir, config);
        results.push(result);
      }
    }

    return results;
  }

  /**
   * Run a single generator with performance tracking.
   */
  private async runGenerator(
    type: string,
    schema: OpenAPISchema,
    outputDir: string,
    config: SyncOptions
  ): Promise<{
    path: string;
    checksum?: string;
    size?: number;
    generator?: string;
    time?: number;
  }> {
    const generator = this.generators.get(type);
    if (!generator) {
      throw new Error(`Generator '${type}' not found`);
    }

    const startTime = performance.now();

    try {
      // Get generator-specific options
      const generatorOpts = {
        outputDir,
        ...config.generators?.[type as keyof typeof config.generators],
      };

      const result = await generator.generate(schema, generatorOpts);
      const endTime = performance.now();

      // Calculate file size if not provided
      let size = result.size;
      if (!size && (await fs.pathExists(result.path))) {
        const stats = await fs.stat(result.path);
        size = stats.size;
      }

      this.metrics!.generatedFiles++;

      return {
        ...result,
        generator: type,
        time: endTime - startTime,
        size,
      };
    } catch (error) {
      console.error(`Generator '${type}' failed:`, error);
      throw error;
    }
  }

  /**
   * Group generators based on their dependencies for parallel execution.
   */
  private groupGeneratorsByDependency(generators: string[]): string[][] {
    // Types must come first, others can run in parallel
    const groups: string[][] = [];

    if (generators.includes("types")) {
      groups.push(["types"]);
    }

    // Other generators can run in parallel after types
    const remaining = generators.filter((g) => g !== "types");
    if (remaining.length > 0) {
      groups.push(remaining);
    }

    return groups;
  }

  /**
   * Load existing file checksums for incremental generation.
   */ private async loadFileChecksums(): Promise<void> {
    const checksumsPath = path.join(".farm/cache", "file-checksums.json");

    try {
      if (await fs.pathExists(checksumsPath)) {
        const checksums = await fs.readJson(checksumsPath);
        if (checksums && typeof checksums === "object") {
          this.fileChecksums = new Map(Object.entries(checksums));
        }
      }
    } catch (error) {
      console.warn("Failed to load file checksums:", error);
    }
  }

  /**
   * Update and persist file checksums.
   */
  private async updateFileChecksums(results: any[]): Promise<void> {
    for (const result of results) {
      if (result.checksum) {
        this.fileChecksums.set(result.path, result.checksum);
      }
    }

    const checksumsPath = path.join(".farm/cache", "file-checksums.json");

    try {
      await fs.ensureDir(path.dirname(checksumsPath));
      await fs.writeJson(checksumsPath, Object.fromEntries(this.fileChecksums));
    } catch (error) {
      console.warn("Failed to save file checksums:", error);
    }
  }

  /**
   * Build result object for cached artifacts.
   */
  private buildCacheResult(cachedResults: any[]): SyncResult {
    const result: SyncResult = {
      filesGenerated: cachedResults.length,
      fromCache: true,
      artifacts: cachedResults.map((r: any) => r.path),
    };

    if (this.config?.performance?.enableMonitoring && this.metrics) {
      result.performance = {
        totalTime: performance.now() - this.metrics.cycleStart,
        extractionTime:
          this.metrics.extractionEnd! - this.metrics.extractionStart!,
        generationTime: 0, // No generation needed
        cacheTime: this.metrics.cacheEnd! - this.metrics.cacheStart!,
        parallelJobs: 0,
      };
    }

    return result;
  }

  /**
   * Build result object for newly generated artifacts.
   */
  private buildGenerationResult(results: any[]): SyncResult {
    const result: SyncResult = {
      filesGenerated: results.length,
      fromCache: false,
      artifacts: results.map((r: any) => r.path),
    };
    if (this.config?.performance?.enableMonitoring && this.metrics) {
      result.performance = {
        totalTime: performance.now() - this.metrics.cycleStart,
        extractionTime:
          (this.metrics.extractionEnd || 0) -
          (this.metrics.extractionStart || 0),
        generationTime:
          (this.metrics.generationEnd || 0) -
          (this.metrics.generationStart || 0),
        cacheTime:
          (this.metrics.cacheEnd || 0) - (this.metrics.cacheStart || 0),
        parallelJobs: this.metrics.generatedFiles,
      };

      result.generationDetails = results.map((r) => ({
        generator: r.generator || "unknown",
        file: r.path,
        time: r.time || 0,
        fromCache: false,
        size: r.size || 0,
      }));
    }

    return result;
  }

  /**
   * Get performance metrics for the last sync cycle.
   */
  getLastMetrics(): PerformanceMetrics | null {
    return this.metrics;
  }

  /**
   * Generate MD5 checksum for content.
   */
  private generateChecksum(content: string): string {
    return crypto.createHash("md5").update(content).digest("hex").slice(0, 8);
  }

  /**
   * Watch for schema changes and automatically regenerate.
   */
  async watch(config: SyncOptions): Promise<void> {
    const chokidar = await import("chokidar");

    const watchPaths = [
      "apps/api/**/*.py",
      "packages/*/src/**/*.py",
      ".farm/config/**/*.json",
    ];

    console.log("🔍 Watching for changes...");

    const watcher = chokidar.watch(watchPaths, {
      ignored: /(^|[\/\\])\../, // ignore dotfiles
      persistent: true,
      ignoreInitial: true,
    });

    let isGenerating = false;

    const regenerate = async () => {
      if (isGenerating) return;

      isGenerating = true;
      console.log("🔄 Schema changes detected, regenerating...");

      try {
        const result = await this.syncOnce(config);
        console.log(
          `✅ Generated ${result.filesGenerated} files${result.fromCache ? " (from cache)" : ""}`
        );

        if (result.performance) {
          console.log(
            `📊 Total time: ${Math.round(result.performance.totalTime)}ms`
          );
        }
      } catch (error) {
        console.error("❌ Regeneration failed:", error);
      } finally {
        isGenerating = false;
      }
    };

    watcher
      .on("change", regenerate)
      .on("add", regenerate)
      .on("unlink", regenerate);

    // Keep the process alive
    process.on("SIGINT", () => {
      console.log("\n👋 Stopping watcher...");
      watcher.close();
      process.exit(0);
    });
  }
}
// No changes needed in this file for the cache decompression error fix.
