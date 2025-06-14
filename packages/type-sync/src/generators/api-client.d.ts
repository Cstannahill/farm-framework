import type { OpenAPISchema } from "../types";
export interface APIClientGeneratorOptions {
    outputDir: string;
    enableAI?: boolean;
    outputFormat?: "typescript" | "javascript";
    includeTypes?: boolean;
    baseURL?: string;
    authentication?: "bearer" | "cookie" | "custom";
    enableInterceptors?: boolean;
    enableStreaming?: boolean;
}
export interface GenerationResult {
    path: string;
    content?: string;
    size?: number;
    checksum?: string;
    generatedAt?: Date;
    type?: string;
}
/**
 * Generates a typed API client based on the provided OpenAPI schema.
 */
export declare class APIClientGenerator {
    private options;
    constructor(options?: Partial<APIClientGeneratorOptions>);
    /**
     * Generate the client file.
     *
     * @param schema - Parsed OpenAPI schema
     * @param opts - Generation options
     * @returns Path to the generated file
     */
    generate(schema: OpenAPISchema, opts: APIClientGeneratorOptions): Promise<GenerationResult>;
    private generateClientCode;
    private generateImports;
    private generateClassDefinition;
    private generateInterceptors;
    private generateMethods;
    private generateUtilityMethods;
    private generateStreamingMethods;
    private generatePathMethods;
    private generateMethodName;
    private generateMethodParameters;
    private generateReturnType;
    private generateMethodCall;
    private isAIEndpoint;
    private generateExports;
    private generateChecksum;
}
//# sourceMappingURL=api-client.d.ts.map