interface CacheEntry {
    schema: any;
    results: any;
    timestamp: number;
    version: string;
    metadata?: {
        generationTime: number;
        fileCount: number;
        totalSize: number;
    };
}
interface CacheOptions {
    timeout?: number;
    enableCompression?: boolean;
    enableMetrics?: boolean;
    maxSize?: number;
    cleanupInterval?: number;
}
interface CacheMetrics {
    hits: number;
    misses: number;
    evictions: number;
    totalSize: number;
    entryCount: number;
}
/**
 * Enhanced file system based cache for generated artifacts.
 * Features compression, metrics, TTL, and size limits.
 */
export declare class GenerationCache {
    private baseDir;
    private options;
    private metrics;
    private metadataPath;
    private cleanupTimer?;
    private logger;
    constructor(baseDir: string, options?: CacheOptions);
    /**
     * Initialize the cache system.
     */ initialize(options?: CacheOptions): Promise<void>;
    private entryPath;
    private metricPath;
    private readAndDecompress;
    /**
     * Compute a stable hash for an OpenAPI schema object.
     */
    hashSchema(schema: any): string;
    /**
     * Normalize schema for consistent hashing.
     */
    private normalizeSchema;
    /**
     * Get a cache entry by hash, handling decompression errors as cache-miss.
     */
    get(hash: string): Promise<CacheEntry | null>;
    /**
     * Persist a cache entry to disk.
     */
    set(hash: string, entry: CacheEntry): Promise<void>;
    /**
     * Remove a specific cache entry.
     */
    remove(hash: string): Promise<void>;
    /**
     * Clear all cache entries.
     */
    clear(): Promise<void>;
    /**
     * Clean up expired entries.
     */
    cleanup(): Promise<void>;
    /**
     * Evict oldest entries to stay within size limit.
     */
    private evictOldEntries;
    /**
     * Get cache statistics.
     */
    getMetrics(): CacheMetrics;
    /**
     * Get cache hit ratio.
     */
    getHitRatio(): number;
    private recordHit;
    private recordMiss;
    private updateMetrics;
    /**
     * Load metrics from disk.
     */
    private loadMetrics;
    /**
     * Save metrics to disk.
     */
    private saveMetrics;
    /**
     * Recalculate metrics from existing cache files.
     */
    private recalculateMetrics;
    /**
     * Periodically save metrics (call this in a background task).
     */
    persistMetrics(): Promise<void>;
    /**
     * Clean up resources and stop timers.
     */
    destroy(): void;
}
export {};
//# sourceMappingURL=cache.d.ts.map