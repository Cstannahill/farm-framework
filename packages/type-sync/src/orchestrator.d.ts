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
    };
}
/**
 * Result summary returned after running a synchronization cycle.
 */
export interface SyncResult {
    filesGenerated: number;
    fromCache: boolean;
    artifacts?: string[];
}
/**
 * Coordinates extraction of OpenAPI schemas and generation of TypeScript
 * artifacts used by the framework.
 */
export declare class TypeSyncOrchestrator {
    private extractor;
    private cache;
    private differ;
    private generators;
    private config;
    /**
     * Instantiate the orchestrator with default generators.
     */
    constructor();
    /**
     * Register built-in generator implementations.
     */
    private initializeGenerators;
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
     * Generate all artifacts for the provided schema.
     */
    private generateArtifacts;
}
//# sourceMappingURL=orchestrator.d.ts.map