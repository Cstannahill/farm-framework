import fs from "fs-extra";
import path from "path";
/**
 * Generates typed React hooks for interacting with the generated API client.
 */
export class ReactHookGenerator {
    /**
     * Generate hook source files.
     *
     * @param _schema - Parsed OpenAPI schema
     * @param opts - Generation options
     * @returns Path to the generated file
     */
    async generate(_schema, opts) {
        await fs.ensureDir(opts.outputDir);
        const outPath = path.join(opts.outputDir, "hooks.ts");
        await fs.writeFile(outPath, "// generated hooks");
        return { path: outPath };
    }
}
//# sourceMappingURL=react-hooks.js.map