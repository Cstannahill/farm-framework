import fs from 'fs-extra';
import path from 'path';
import type { OpenAPISchema } from '@farm/types';

export interface TypeScriptGenerationOptions {
  outputDir: string;
}

export class TypeScriptGenerator {
  async generate(_schema: OpenAPISchema, opts: TypeScriptGenerationOptions): Promise<{ path: string }> {
    await fs.ensureDir(opts.outputDir);
    const outPath = path.join(opts.outputDir, 'types.ts');
    await fs.writeFile(outPath, '// generated types');
    return { path: outPath };
  }
}
