import fs from "fs-extra";
import path from "path";
import type { OpenAPISchema } from "../types";

/** Options for the {@link TypeScriptGenerator}. */
export interface TypeScriptGenerationOptions {
  outputDir: string;
}

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
  async generate(
    _schema: OpenAPISchema,
    opts: TypeScriptGenerationOptions
  ): Promise<{ path: string }> {
    await fs.ensureDir(opts.outputDir);
    const outPath = path.join(opts.outputDir, "types.ts");
    await fs.writeFile(outPath, "// generated types");
    return { path: outPath };
  }
}
