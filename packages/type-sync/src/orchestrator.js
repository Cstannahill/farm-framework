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
import { TypeSyncError } from "./errors";
const fs = fsExtra;
const { ensureDir } = fsExtra;
/** Visible, repo‑relative folder for generated artifacts */
const DEFAULT_OUTPUT_DIR = path.resolve(process.cwd(), "generated");
/**
 * Coordinates extraction of OpenAPI schemas and generation of TypeScript
 * artifacts used by the framework. Enhanced with performance monitoring,
 * incremental generation, and parallel processing.
 */
export class TypeSyncOrchestrator {
    extractor = new OpenAPIExtractor();
    cache = new GenerationCache(".farm/cache/types");
    differ = new TypeDiffer();
    generators = new Map();
    config = null;
    metrics = null;
    fileChecksums = new Map();
    /**
     * Instantiate the orchestrator with default generators.
     */
    constructor() {
        this.initializeGenerators();
    }
    /**
     * Register built-in generator implementations.
     */
    initializeGenerators() {
        this.generators.set("types", new TypeScriptGenerator());
        this.generators.set("client", new APIClientGenerator());
        this.generators.set("hooks", new ReactHookGenerator());
        this.generators.set("ai-hooks", new AIHookGenerator());
    }
    /**
     * Register a custom generator for a specific type.
     */
    registerGenerator(type, generator) {
        this.generators.set(type, generator);
    }
    /**
     * Prepare the orchestrator for operation.
     */
    async initialize(config) {
        const outputDir = config.outputDir ?? DEFAULT_OUTPUT_DIR;
        this.config = {
            ...config,
            outputDir,
            performance: {
                enableMonitoring: true,
                enableIncrementalGeneration: true,
                maxConcurrency: 4,
                cacheTimeout: 300000, // 5 minutes
                ...config.performance,
            },
        };
        await ensureDir(outputDir);
        // Initialize cache with enhanced settings
        await this.cache.initialize({
            timeout: this.config.performance?.cacheTimeout || 300000,
            enableCompression: true,
            enableMetrics: this.config.performance?.enableMonitoring ?? true,
        });
        // Load existing file checksums for incremental generation
        if (this.config.performance?.enableIncrementalGeneration) {
            await this.loadFileChecksums();
        }
    }
    /**
     * Determine whether a generator should run based on current feature flags.
     */
    isFeatureEnabled(genType) {
        if (!this.config)
            return false;
        if (genType === "client")
            return this.config.features.client;
        if (genType === "hooks")
            return this.config.features.hooks;
        if (genType === "ai-hooks")
            return this.config.features.aiHooks;
        return true;
    }
    /**
     * Run a single synchronization cycle, generating any necessary artifacts.
     */
    async syncOnce(opts) {
        if (!this.config)
            throw new Error("Orchestrator not initialized");
        const config = { ...this.config, ...opts };
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
            if (cached &&
                !this.differ.hasSchemaChanges(cached.schema, schema) &&
                config.performance?.enableIncrementalGeneration &&
                (await this.validateCachedFiles(cached.results))) {
                this.metrics.cacheEnd = performance.now();
                return this.buildCacheResult(cached.results);
            }
            this.metrics.cacheEnd = performance.now();
            // Phase 3: Generation
            this.metrics.generationStart = performance.now();
            const results = await this.generateArtifacts(schema, config.outputDir, config);
            this.metrics.generationEnd = performance.now();
            // Phase 4: Cache Update
            await this.cache.set(schemaHash, {
                schema,
                results,
                timestamp: Date.now(),
                version: "1.0",
            });
            if (config.performance?.enableIncrementalGeneration) {
                await this.updateFileChecksums(results);
            }
            return this.buildGenerationResult(results);
        }
        catch (error) {
            console.error("Sync cycle failed:", error);
            // Preserve old contract: reject the promise on fatal failure
            throw new TypeSyncError("Connection refused", error);
        }
    }
    /**
     * Extract schema with error handling and performance tracking.
     */
    async extractSchema(config) {
        const outputPath = path.join(config.outputDir, "openapi.json");
        try {
            const result = await this.extractor.extractFromFastAPI(".", outputPath, {
                timeout: config.performance?.cacheTimeout || 30000,
                enableCache: config.performance?.enableIncrementalGeneration !== false,
                retries: 2,
                healthCheckEndpoint: "/health",
            });
            if (config.performance?.enableMonitoring) {
                console.log(`📄 Schema extracted via ${result.source} in ${Math.round(result.extractionTime)}ms`);
                if (result.serverStartupTime) {
                    console.log(`🚀 Server startup took ${Math.round(result.serverStartupTime)}ms`);
                }
            }
            return result.schema;
        }
        catch (error) {
            console.error("Schema extraction failed:", error);
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
    async validateCachedFiles(cachedResults) {
        for (const result of cachedResults) {
            if (!(await fs.pathExists(result.path)))
                return false;
            if (result.checksum) {
                const content = await fs.readFile(result.path, "utf8");
                const currentChecksum = this.generateChecksum(content);
                if (currentChecksum !== result.checksum)
                    return false;
            }
        }
        return true;
    }
    /**
     * Generate all artifacts for the provided schema with parallel processing.
     */
    async generateArtifacts(schema, outputDir, config) {
        const results = [];
        const order = ["types", "client", "hooks", "ai-hooks"];
        const enabledGenerators = order.filter((type) => this.generators.get(type) && this.isFeatureEnabled(type));
        this.metrics.totalFiles = enabledGenerators.length;
        const maxConcurrency = config.performance?.maxConcurrency || 4;
        const useParallel = enabledGenerators.length > 1 && maxConcurrency > 1;
        if (useParallel) {
            const groups = this.groupGeneratorsByDependency(enabledGenerators);
            for (const group of groups) {
                const groupResults = await Promise.all(group.map((type) => this.runGenerator(type, schema, outputDir, config)));
                results.push(...groupResults);
            }
        }
        else {
            for (const type of enabledGenerators) {
                results.push(await this.runGenerator(type, schema, outputDir, config));
            }
        }
        return results;
    }
    /**
     * Run a single generator with performance tracking.
     */
    async runGenerator(type, schema, outputDir, config) {
        const generator = this.generators.get(type);
        if (!generator)
            throw new Error(`Generator '${type}' not found`);
        const startTime = performance.now();
        const generatorOpts = {
            outputDir,
            ...config.generators?.[type],
        };
        try {
            const result = await generator.generate(schema, generatorOpts);
            const endTime = performance.now();
            let size = result.size;
            if (!size && (await fs.pathExists(result.path))) {
                size = (await fs.stat(result.path)).size;
            }
            this.metrics.generatedFiles++;
            return {
                ...result,
                generator: type,
                time: endTime - startTime,
                size,
            };
        }
        catch (error) {
            console.error(`Generator '${type}' failed:`, error);
            throw error;
        }
    }
    /**
     * Group generators based on their dependencies for parallel execution.
     */
    groupGeneratorsByDependency(generators) {
        const groups = [];
        if (generators.includes("types"))
            groups.push(["types"]);
        const remaining = generators.filter((g) => g !== "types");
        if (remaining.length)
            groups.push(remaining);
        return groups;
    }
    /**
     * Load existing file checksums for incremental generation.
     */
    async loadFileChecksums() {
        const checksumsPath = path.join(".farm/cache", "file-checksums.json");
        try {
            if (await fs.pathExists(checksumsPath)) {
                const obj = await fs.readJson(checksumsPath);
                if (obj && typeof obj === "object") {
                    this.fileChecksums = new Map(Object.entries(obj));
                }
            }
        }
        catch (error) {
            console.warn("Failed to load file checksums:", error);
        }
    }
    /**
     * Update and persist file checksums.
     */
    async updateFileChecksums(results) {
        for (const r of results) {
            if (r.checksum)
                this.fileChecksums.set(r.path, r.checksum);
        }
        const checksumsPath = path.join(".farm/cache", "file-checksums.json");
        try {
            await fs.ensureDir(path.dirname(checksumsPath));
            await fs.writeJson(checksumsPath, Object.fromEntries(this.fileChecksums));
        }
        catch (error) {
            console.warn("Failed to save file checksums:", error);
        }
    }
    /**
     * Build result object for cached artifacts.
     */
    buildCacheResult(cachedResults) {
        const result = {
            filesGenerated: cachedResults.length,
            fromCache: true,
            artifacts: cachedResults.map((r) => r.path),
        };
        if (this.config?.performance?.enableMonitoring && this.metrics) {
            result.performance = {
                totalTime: performance.now() - this.metrics.cycleStart,
                extractionTime: this.metrics.extractionEnd - this.metrics.extractionStart,
                generationTime: 0,
                cacheTime: this.metrics.cacheEnd - this.metrics.cacheStart,
                parallelJobs: 0,
            };
        }
        return result;
    }
    /**
     * Build result object for newly generated artifacts.
     */
    buildGenerationResult(results) {
        const result = {
            filesGenerated: results.length,
            fromCache: false,
            artifacts: results.map((r) => r.path),
        };
        if (this.config?.performance?.enableMonitoring && this.metrics) {
            result.performance = {
                totalTime: performance.now() - this.metrics.cycleStart,
                extractionTime: (this.metrics.extractionEnd || 0) -
                    (this.metrics.extractionStart || 0),
                generationTime: (this.metrics.generationEnd || 0) -
                    (this.metrics.generationStart || 0),
                cacheTime: (this.metrics.cacheEnd || 0) - (this.metrics.cacheStart || 0),
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
    getLastMetrics() {
        return this.metrics;
    }
    /**
     * Generate MD5 checksum for content.
     */
    generateChecksum(content) {
        return crypto.createHash("md5").update(content).digest("hex").slice(0, 8);
    }
    /**
     * Watch for schema changes and automatically regenerate.
     */
    async watch(config) {
        const chokidar = await import("chokidar");
        const watchPaths = [
            "apps/api/**/*.py",
            "packages/*/src/**/*.py",
            ".farm/config/**/*.json",
        ];
        console.log("🔍 Watching for changes...");
        const watcher = chokidar.watch(watchPaths, {
            ignored: /(^|[\/\\])\../,
            persistent: true,
            ignoreInitial: true,
        });
        let isGenerating = false;
        const regenerate = async () => {
            if (isGenerating)
                return;
            isGenerating = true;
            console.log("🔄 Schema changes detected, regenerating...");
            try {
                const result = await this.syncOnce(config);
                console.log(`✅ Generated ${result.filesGenerated} files${result.fromCache ? " (from cache)" : ""}`);
                if (result.performance) {
                    console.log(`📊 Total time: ${Math.round(result.performance.totalTime)}ms`);
                }
            }
            catch (error) {
                console.error("❌ Regeneration failed:", error);
            }
            finally {
                isGenerating = false;
            }
        };
        watcher
            .on("change", regenerate)
            .on("add", regenerate)
            .on("unlink", regenerate);
        process.on("SIGINT", () => {
            console.log("\n👋 Stopping watcher...");
            watcher.close();
            process.exit(0);
        });
    }
}
//# sourceMappingURL=orchestrator.js.map