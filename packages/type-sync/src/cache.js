// @farm/type-sync cache
import fs from 'fs-extra';
import path from 'path';
import crypto from 'crypto';
/**
 * Simple file system based cache for generated artifacts.
 */
export class GenerationCache {
    baseDir;
    constructor(baseDir) {
        this.baseDir = baseDir;
    }
    entryPath(hash) {
        return path.join(this.baseDir, `${hash}.json`);
    }
    /**
     * Compute a stable hash for an OpenAPI schema object.
     */
    hashSchema(schema) {
        return crypto.createHash('sha256').update(JSON.stringify(schema)).digest('hex');
    }
    /**
     * Retrieve a cached entry by hash.
     */
    async get(hash) {
        const file = this.entryPath(hash);
        try {
            return await fs.readJson(file);
        }
        catch {
            return null;
        }
    }
    /**
     * Persist a cache entry to disk.
     */
    async set(hash, entry) {
        await fs.ensureDir(this.baseDir);
        await fs.writeJson(this.entryPath(hash), entry);
    }
}
//# sourceMappingURL=cache.js.map