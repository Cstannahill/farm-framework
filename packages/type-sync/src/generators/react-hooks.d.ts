import type { OpenAPISchema } from "../types";
/** Options for the {@link ReactHookGenerator}. */
export interface ReactHookGeneratorOptions {
    outputDir: string;
}
/**
 * Generates typed React hooks for interacting with the generated API client.
 */
export declare class ReactHookGenerator {
    /**
     * Generate hook source files.
     *
     * @param _schema - Parsed OpenAPI schema
     * @param opts - Generation options
     * @returns Path to the generated file
     */
    generate(_schema: OpenAPISchema, opts: ReactHookGeneratorOptions): Promise<{
        path: string;
    }>;
}
//# sourceMappingURL=react-hooks.d.ts.map