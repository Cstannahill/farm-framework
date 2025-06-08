import fs from 'fs-extra';
import path from 'path';
import type { OpenAPISchema } from '@farm/types';

export interface ReactHookGeneratorOptions {
  outputDir: string;
}

export class ReactHookGenerator {
  async generate(_schema: OpenAPISchema, opts: ReactHookGeneratorOptions): Promise<{ path: string }> {
    await fs.ensureDir(opts.outputDir);
    const outPath = path.join(opts.outputDir, 'hooks.ts');
    await fs.writeFile(outPath, '// generated hooks');
    return { path: outPath };
  }
}
