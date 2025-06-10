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
    extractFromFastAPI(apiPath: string, outputPath: string, options?: OpenAPIExtractionOptions): Promise<void>;
    private fetchSchemaFromServer;
    private generateSchemaWithTempServer;
}
//# sourceMappingURL=openapi.d.ts.map