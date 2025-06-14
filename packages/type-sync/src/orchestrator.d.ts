import type { OpenAPISchema } from "./types";
/**
 * Configuration options controlling the type synchronization process.
 */
export interface SyncOptions {
    apiUrl: string;
    outputDir?: string;
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
    generate: (schema: OpenAPISchema, opts: any) => Promise<{
        path: string;
        checksum?: string;
        size?: number;
    }>;
}
/**
 * Coordinates extraction of OpenAPI schemas and generation of TypeScript
 * artifacts used by the framework. Enhanced with performance monitoring,
 * incremental generation, and parallel processing.
 */
export declare class TypeSyncOrchestrator {
    private extractor;
    private cache;
    private differ;
    private generators;
    private config;
    private metrics;
    private fileChecksums;
    /**
     * Instantiate the orchestrator with default generators.
     */
    constructor();
    /**
     * Register built-in generator implementations.
     */
    private initializeGenerators;
    /**
     * Register a custom generator for a specific type.
     */
    registerGenerator(type: string, generator: Generator): void;
    /**
     * Prepare the orchestrator for operation.
     */
    initialize(config: SyncOptions): Promise<void>;
    /**
     * Determine whether a generator should run based on current feature flags.
     */
    private isFeatureEnabled;
    /**
     * Run a single synchronization cycle, generating any necessary artifacts.
     */
    syncOnce(opts?: Partial<SyncOptions>): Promise<SyncResult>;
    /**
     * Extract schema with error handling and performance tracking.
     */
    private extractSchema;
    /**
     * Validate that cached files still exist and match expected checksums.
     */
    private validateCachedFiles;
    /**
     * Generate all artifacts for the provided schema with parallel processing.
     */
    private generateArtifacts;
    /**
     * Run a single generator with performance tracking.
     */
    private runGenerator;
    /**
     * Group generators based on their dependencies for parallel execution.
     */
    private groupGeneratorsByDependency;
    /**
     * Load existing file checksums for incremental generation.
     */
    private loadFileChecksums;
    /**
     * Update and persist file checksums.
     */
    private updateFileChecksums;
    /**
     * Build result object for cached artifacts.
     */
    private buildCacheResult;
    /**
     * Build result object for newly generated artifacts.
     */
    private buildGenerationResult;
    /**
     * Get performance metrics for the last sync cycle.
     */
    getLastMetrics(): PerformanceMetrics | null;
    /**
     * Generate MD5 checksum for content.
     */
    private generateChecksum;
    /**
     * Watch for schema changes and automatically regenerate.
     */
    watch(config: SyncOptions): Promise<void>;
}
export {};
//# sourceMappingURL=orchestrator.d.ts.map