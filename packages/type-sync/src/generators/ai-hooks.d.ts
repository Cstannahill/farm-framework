import type { OpenAPISchema } from "../types";
/** Options for the {@link AIHookGenerator}. */
export interface AIHookGeneratorOptions {
    outputDir: string;
    generateComments?: boolean;
    includeSessionManagement?: boolean;
    includeBatchInference?: boolean;
    includeAdvancedFeatures?: boolean;
    supportedProviders?: Array<"ollama" | "openai" | "huggingface">;
    defaultProvider?: "ollama" | "openai" | "huggingface";
    enableErrorHandling?: boolean;
    enableOptimisticUpdates?: boolean;
}
export interface AIGenerationResult {
    path: string;
    content?: string;
    size?: number;
    checksum?: string;
    generatedAt?: Date;
    type?: string;
    hooks?: string[];
}
/**
 * Generates comprehensive React hooks for interacting with AI endpoints.
 * Provides streaming chat, model management, health monitoring, and session persistence.
 */
export declare class AIHookGenerator {
    private options;
    constructor(options?: Partial<AIHookGeneratorOptions>);
    /**
     * Generate AI hook source files from an OpenAPI schema.
     *
     * @param schema - Parsed OpenAPI schema
     * @param opts - Generation options
     * @returns Path to the generated file
     */
    generate(schema: OpenAPISchema, opts: AIHookGeneratorOptions): Promise<AIGenerationResult>;
    private generateAIHooksContent;
    private generateFileHeader;
    private generateStreamingChatHook;
    private generateAIModelsHook;
    private generateAIHealthHook;
    private generateAIProviderHook;
    private generateAIInferenceHook;
    private generateChatSessionHook;
    private generateModelLoaderHook;
    private generateAIConfigHook;
    private generateTokenCounterHook;
    private generateCustomEndpointHook;
    private generateExports;
    private detectAIEndpoints;
    private generateHookName;
    private extractHookNames;
    private generateChecksum;
}
//# sourceMappingURL=ai-hooks.d.ts.map