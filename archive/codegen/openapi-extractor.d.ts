export interface OpenAPIExtractionOptions {
    include?: string[];
    exclude?: string[];
    host?: string;
    port?: number;
    timeout?: number;
}
export declare class OpenAPIExtractor {
    private options;
    constructor(options?: OpenAPIExtractionOptions);
    /**
     * Extract OpenAPI schema from a running FastAPI application
     */
    extractFromFastAPI(apiPath: string, outputPath: string, options?: OpenAPIExtractionOptions): Promise<void>;
    /**
     * Try to fetch schema from already running server
     */
    private fetchSchemaFromServer;
    /**
     * Generate schema by temporarily starting the FastAPI server
     */
    private generateSchemaWithTempServer;
    /**
     * Extract schema from a static OpenAPI JSON/YAML file
     */
    extractFromFile(filePath: string, outputPath: string): Promise<void>;
    /**
     * Validate OpenAPI schema structure
     */
    validateSchema(schema: any): boolean;
}
//# sourceMappingURL=openapi-extractor.d.ts.map