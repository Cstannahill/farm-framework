interface CacheEntry {
    schema: any;
    results: any;
}
/**
 * Simple file system based cache for generated artifacts.
 */
export declare class GenerationCache {
    private baseDir;
    constructor(baseDir: string);
    private entryPath;
    /**
     * Compute a stable hash for an OpenAPI schema object.
     */
    hashSchema(schema: any): string;
    /**
     * Retrieve a cached entry by hash.
     */
    get(hash: string): Promise<CacheEntry | null>;
    /**
     * Persist a cache entry to disk.
     */
    set(hash: string, entry: CacheEntry): Promise<void>;
}
export {};
//# sourceMappingURL=cache.d.ts.map