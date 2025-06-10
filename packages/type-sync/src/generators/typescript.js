import fs from "fs-extra";
import path from "path";
/**
 * Generates raw TypeScript type declarations from an OpenAPI schema.
 */
export class TypeScriptGenerator {
    /**
     * Generate the type declaration file.
     *
     * @param _schema - Parsed OpenAPI schema
     * @param opts - Generation options
     * @returns Path to the generated file
     */
    async generate(_schema, opts) {
        await fs.ensureDir(opts.outputDir);
        const outPath = path.join(opts.outputDir, "types.ts");
        await fs.writeFile(outPath, "// generated types");
        return { path: outPath };
    }
}
//# sourceMappingURL=typescript.js.map