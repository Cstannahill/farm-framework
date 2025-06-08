import fs from "fs-extra";
import path from "path";
import type { OpenAPISchema } from "../types/openapi";

export interface APIClientGeneratorOptions {
  outputDir: string;
}

export class APIClientGenerator {
  async generate(
    _schema: OpenAPISchema,
    opts: APIClientGeneratorOptions
  ): Promise<{ path: string }> {
    await fs.ensureDir(opts.outputDir);
    const outPath = path.join(opts.outputDir, "client.ts");
    await fs.writeFile(outPath, "// generated client");
    return { path: outPath };
  }
}
