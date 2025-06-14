import type { OpenAPISchema } from "../types";
export interface TypeScriptGenerationOptions {
    outputDir: string;
    generateComments?: boolean;
    enumType?: "string" | "number" | "const" | "union";
    dateType?: "string" | "Date";
    fileNaming?: "camelCase" | "kebab-case" | "snake_case";
    cleanOrphans?: boolean;
    metadataFile?: string;
    strict?: boolean;
    exportStyle?: "named" | "default" | "both";
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
 * Generates raw TypeScript type declarations from an OpenAPI schema.
 */
export declare class TypeScriptGenerator {
    private options;
    constructor(options?: Partial<TypeScriptGenerationOptions>);
    /**
     * Generate the type declaration file.
     *
     * @param schema - Parsed OpenAPI schema
     * @param opts - Generation options
     * @returns Path to the generated file
     */
    generate(schema: OpenAPISchema, opts: TypeScriptGenerationOptions): Promise<GenerationResult>;
    private generateTypesContent;
    private generateInterface;
    private generateApiTypes;
    private generateRequestType;
    private generateResponseType;
    private mapSchemaType;
    private generateCommonTypes;
    private sortSchemasByDependencies;
    private findSchemaDependencies;
    private generateOperationId;
    private capitalize;
    private generateChecksum;
}
//# sourceMappingURL=typescript.d.ts.map