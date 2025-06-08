// packages/core/src/codegen/type-sync/cache.ts
import fs from 'fs-extra';
import path from 'path';
import crypto from 'crypto';

interface CacheEntry {
  schema: any;
  results: any;
}

export class GenerationCache {
  constructor(private baseDir: string) {}

  private entryPath(hash: string) {
    return path.join(this.baseDir, `${hash}.json`);
  }

  hashSchema(schema: any): string {
    return crypto.createHash('sha256').update(JSON.stringify(schema)).digest('hex');
  }

  async get(hash: string): Promise<CacheEntry | null> {
    const file = this.entryPath(hash);
    try {
      return await fs.readJson(file);
    } catch {
      return null;
    }
  }

  async set(hash: string, entry: CacheEntry): Promise<void> {
    await fs.ensureDir(this.baseDir);
    await fs.writeJson(this.entryPath(hash), entry);
  }
}
