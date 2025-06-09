import fs from "fs-extra";
import path from "path";
import type { OpenAPISchema } from "../types";

/** Options for the {@link AIHookGenerator}. */
export interface AIHookGeneratorOptions {
  outputDir: string;
}

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
  async generate(
    _schema: OpenAPISchema,
    opts: AIHookGeneratorOptions
  ): Promise<{ path: string }> {
    await fs.ensureDir(opts.outputDir);
    const outPath = path.join(opts.outputDir, "ai-hooks.ts");
    await fs.writeFile(outPath, "// generated ai hooks");
    return { path: outPath };
  }
}
