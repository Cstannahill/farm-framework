import type { OpenAPISchema } from "../types";
/** Options for the {@link APIClientGenerator}. */
export interface APIClientGeneratorOptions {
    outputDir: string;
}
/**
 * Generates a typed API client based on the provided OpenAPI schema.
 */
export declare class APIClientGenerator {
    /**
     * Generate the client file.
     *
     * @param _schema - Parsed OpenAPI schema
     * @param opts - Generation options
     * @returns Path to the generated file
     */
    generate(_schema: OpenAPISchema, opts: APIClientGeneratorOptions): Promise<{
        path: string;
    }>;
}
//# sourceMappingURL=api-client.d.ts.map