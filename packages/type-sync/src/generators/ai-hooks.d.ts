import type { OpenAPISchema } from "../types";
/** Options for the {@link AIHookGenerator}. */
export interface AIHookGeneratorOptions {
    outputDir: string;
}
/**
 * Generates custom React hooks for interacting with AI endpoints.
 */
export declare class AIHookGenerator {
    /**
     * Generate AI hook source files from an OpenAPI schema.
     *
     * @param _schema - Parsed OpenAPI schema
     * @param opts - Generation options
     * @returns Path to the generated file
     */
    generate(_schema: OpenAPISchema, opts: AIHookGeneratorOptions): Promise<{
        path: string;
    }>;
}
//# sourceMappingURL=ai-hooks.d.ts.map