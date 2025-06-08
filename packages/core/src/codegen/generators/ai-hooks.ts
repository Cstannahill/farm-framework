import fs from "fs-extra";
import path from "path";
import type { OpenAPISchema } from "../types/openapi";

export interface AIHookGeneratorOptions {
  outputDir: string;
}

export class AIHookGenerator {
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
