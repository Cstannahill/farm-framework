import fs from "fs-extra";
import path from "path";
/**
 * Generates custom React hooks for interacting with AI endpoints.
 */
export class AIHookGenerator {
    /**
     * Generate AI hook source files from an OpenAPI schema.
     *
     * @param _schema - Parsed OpenAPI schema
     * @param opts - Generation options
     * @returns Path to the generated file
     */
    async generate(_schema, opts) {
        await fs.ensureDir(opts.outputDir);
        const outPath = path.join(opts.outputDir, "ai-hooks.ts");
        await fs.writeFile(outPath, "// generated ai hooks");
        return { path: outPath };
    }
}
//# sourceMappingURL=ai-hooks.js.map