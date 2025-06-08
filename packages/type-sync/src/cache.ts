// @farm/type-sync cache
import fs from 'fs-extra';
import path from 'path';
import crypto from 'crypto';

interface CacheEntry {
  schema: any;
  results: any;
}

/**
 * Simple file system based cache for generated artifacts.
 */
export class GenerationCache {
  constructor(private baseDir: string) {}

  private entryPath(hash: string) {
    return path.join(this.baseDir, `${hash}.json`);
  }

  /**
   * Compute a stable hash for an OpenAPI schema object.
   */
  hashSchema(schema: any): string {
    return crypto.createHash('sha256').update(JSON.stringify(schema)).digest('hex');
  }

  /**
   * Retrieve a cached entry by hash.
   */
  async get(hash: string): Promise<CacheEntry | null> {
    const file = this.entryPath(hash);
    try {
      return await fs.readJson(file);
    } catch {
      return null;
    }
  }

  /**
   * Persist a cache entry to disk.
   */
  async set(hash: string, entry: CacheEntry): Promise<void> {
    await fs.ensureDir(this.baseDir);
    await fs.writeJson(this.entryPath(hash), entry);
  }
}
