import type { OpenAPISchema } from "../types";
export interface ReactHookGeneratorOptions {
    outputDir: string;
    apiClientImportPath?: string;
    typesImportPath?: string;
    enableAI?: boolean;
    enableInfiniteQueries?: boolean;
    enableOptimisticUpdates?: boolean;
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
 * Generates typed React hooks for interacting with the generated API client.
 */
export declare class ReactHookGenerator {
    private options;
    constructor(options?: Partial<ReactHookGeneratorOptions>);
    /**
     * Generate hook source files.
     *
     * @param schema - Parsed OpenAPI schema
     * @param opts - Generation options
     * @returns Path to the generated file
     */
    generate(schema: OpenAPISchema, opts: ReactHookGeneratorOptions): Promise<GenerationResult>;
    private extractHooksFromSchema;
    private createHookFromOperation;
    private generateHooksContent;
    private generateImports;
    private generateHookImplementation;
    private generateQueryHook;
    private generateInfiniteQueryHook;
    private generateMutationHook;
    private generateHookParameters;
    private generateMutationParameters;
    private generateQueryKey;
    private generateQueryFunction;
    private generateMutationFunction;
    private generateOptimisticUpdates;
    private generateInvalidationLogic;
    private groupHooksByDomain;
    private getDomainFromOperationId;
    private extractPathParameters;
    private extractQueryParameters;
    private generateHookName;
    private generateOperationId;
    private getRequestType;
    private getResponseType;
    private getTypeFromSchema;
    private isInfiniteQueryCandidate;
    private isAIEndpoint;
    private generateChecksum;
}
//# sourceMappingURL=react-hooks.d.ts.map