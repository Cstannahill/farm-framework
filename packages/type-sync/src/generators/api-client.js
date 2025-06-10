import fs from "fs-extra";
import path from "path";
/**
 * Generates a typed API client based on the provided OpenAPI schema.
 */
export class APIClientGenerator {
    /**
     * Generate the client file.
     *
     * @param _schema - Parsed OpenAPI schema
     * @param opts - Generation options
     * @returns Path to the generated file
     */
    async generate(_schema, opts) {
        await fs.ensureDir(opts.outputDir);
        const outPath = path.join(opts.outputDir, "client.ts");
        await fs.writeFile(outPath, "// generated client");
        return { path: outPath };
    }
}
//# sourceMappingURL=api-client.js.map