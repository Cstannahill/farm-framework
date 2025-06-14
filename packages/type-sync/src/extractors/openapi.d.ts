export interface OpenAPIExtractionOptions {
    include?: string[];
    exclude?: string[];
    host?: string;
    port?: number;
    timeout?: number;
    retries?: number;
    retryDelay?: number;
    enableCache?: boolean;
    cacheTimeout?: number;
    serverStartupTime?: number;
    healthCheckEndpoint?: string;
    /** Custom sleep function for retry delays */
    sleepFn?: (ms: number) => Promise<void>;
}
export interface ExtractionResult {
    schema: any;
    source: "running-server" | "temp-server" | "cache" | "static-file";
    extractionTime: number;
    serverStartupTime?: number;
    retryCount?: number;
}
export declare class OpenAPIExtractor {
    private options;
    private runningServer?;
    private lastSchemaCache?;
    constructor(options?: OpenAPIExtractionOptions);
    extractFromFastAPI(apiPath: string, outputPath: string, options?: OpenAPIExtractionOptions): Promise<ExtractionResult>;
    /**
     * Try to fetch schema from already running server
     */
    private tryRunningServer;
    /**
     * Try to load schema from static file (like openapi.json in repo)
     */
    private tryStaticFile;
    /**
     * Try to use cached schema if recent enough
     */
    private tryCachedSchema;
    /**
     * Check if server is healthy before attempting schema extraction
     */
    private checkServerHealth;
    /**
     * Fetch schema from running server with retries
     */
    private fetchSchemaFromServer;
    /**
     * Generate schema by starting temporary server
     */
    private generateSchemaWithTempServer;
    /**
     * Find available Python executable
     */
    private findPythonExecutable;
    /**
     * Clean up server process
     */
    private cleanupServer;
    /**
     * Delay utility
     */
    private delay;
    /**
     * Cleanup any running servers
     */
    cleanup(): Promise<void>;
    /**
     * Clear cached schema
     */
    clearCache(): void;
}
//# sourceMappingURL=openapi.d.ts.map