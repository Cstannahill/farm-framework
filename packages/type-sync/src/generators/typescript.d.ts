import type { OpenAPISchema } from "../types";
/** Options for the {@link TypeScriptGenerator}. */
export interface TypeScriptGenerationOptions {
    outputDir: string;
}
/**
 * Generates raw TypeScript type declarations from an OpenAPI schema.
 */
export declare class TypeScriptGenerator {
    /**
     * Generate the type declaration file.
     *
     * @param _schema - Parsed OpenAPI schema
     * @param opts - Generation options
     * @returns Path to the generated file
     */
    generate(_schema: OpenAPISchema, opts: TypeScriptGenerationOptions): Promise<{
        path: string;
    }>;
}
//# sourceMappingURL=typescript.d.ts.map