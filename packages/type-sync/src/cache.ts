// @farm/type-sync cache
import fs from "fs-extra";
import path from "path";
import crypto from "crypto";
import zlib from "zlib";
import { promisify } from "util";

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

interface CacheEntry {
  schema: any;
  results: any;
  timestamp: number;
  version: string;
  metadata?: {
    generationTime: number;
    fileCount: number;
    totalSize: number;
  };
}

interface CacheOptions {
  timeout?: number; // Cache timeout in milliseconds
  enableCompression?: boolean;
  enableMetrics?: boolean;
  maxSize?: number; // Maximum cache size in bytes
  cleanupInterval?: number; // Auto-cleanup interval in milliseconds
}

interface CacheMetrics {
  hits: number;
  misses: number;
  evictions: number;
  totalSize: number;
  entryCount: number;
}

/**
 * Enhanced file system based cache for generated artifacts.
 * Features compression, metrics, TTL, and size limits.
 */
export class GenerationCache {
  private options: Required<CacheOptions>;
  private metrics: CacheMetrics;
  private metadataPath: string;
  private cleanupTimer?: NodeJS.Timeout;
  private logger = console;

  constructor(
    private baseDir: string,
    options?: CacheOptions
  ) {
    this.options = {
      timeout: 300000, // 5 minutes default
      enableCompression: true,
      enableMetrics: true,
      maxSize: 100 * 1024 * 1024, // 100MB default
      cleanupInterval: 600000, // 10 minutes default
      ...options,
    };

    this.metrics = {
      hits: 0,
      misses: 0,
      evictions: 0,
      totalSize: 0,
      entryCount: 0,
    };

    this.metadataPath = path.join(this.baseDir, ".cache-metadata.json");
  }

  /**
   * Initialize the cache system.
   */ async initialize(options?: CacheOptions): Promise<void> {
    if (options) {
      this.options = { ...this.options, ...options };
    }

    await fs.ensureDir(this.baseDir);
    await this.loadMetrics();

    // Clean up expired entries on initialization
    await this.cleanup();

    // Start periodic cleanup timer
    if (this.options.cleanupInterval > 0) {
      this.cleanupTimer = setInterval(() => {
        this.cleanup().catch(console.error);
      }, this.options.cleanupInterval);
    }
  }

  private entryPath(hash: string): string {
    return path.join(
      this.baseDir,
      `${hash}${this.options.enableCompression ? ".gz" : ".json"}`
    );
  }

  private metricPath(hash: string): string {
    return path.join(this.baseDir, `${hash}.meta.json`);
  }

  private async readAndDecompress(file: string): Promise<Buffer> {
    const data = await fs.readFile(file);
    if (this.options.enableCompression) {
      return gunzip(data);
    }
    return Buffer.isBuffer(data) ? data : Buffer.from(data);
  }

  /**
   * Compute a stable hash for an OpenAPI schema object.
   */
  hashSchema(schema: any): string {
    const normalizedSchema = this.normalizeSchema(schema);
    return crypto
      .createHash("sha256")
      .update(JSON.stringify(normalizedSchema))
      .digest("hex")
      .slice(0, 16);
  }

  /**
   * Normalize schema for consistent hashing.
   */
  private normalizeSchema(schema: any): any {
    // Remove volatile fields that shouldn't affect cache key
    const normalized = { ...schema };

    // Remove timestamps, server URLs, etc.
    if (normalized.info) {
      delete normalized.info.version;
      delete normalized.info["x-generated-at"];
    }

    if (normalized.servers) {
      // Normalize server URLs to avoid cache misses due to port changes
      normalized.servers = normalized.servers.map((server: any) => ({
        ...server,
        url: server.url?.replace(/:\d+/, ":{{PORT}}"),
      }));
    }

    return normalized;
  }
  /**
   * Get a cache entry by hash, handling decompression errors as cache-miss.
   */
  public async get(hash: string): Promise<CacheEntry | null> {
    const file = this.entryPath(hash);
    if (!(await fs.pathExists(file))) return null;

    try {
      const raw = await this.readAndDecompress(file);
      return JSON.parse(raw.toString()) as CacheEntry;
    } catch (err: any) {
      // Log the error if logger is available
      if (this.logger && typeof this.logger.warn === "function") {
        this.logger.warn(
          `Cache read failed for ${hash}: ${err.message}. Treating as miss.`
        );
      }

      // Remove corrupted cache file
      await fs.unlink(file).catch(() => {});

      // Return null to treat as cache miss instead of throwing
      return null;
    }
  }

  /**
   * Persist a cache entry to disk.
   */
  async set(hash: string, entry: CacheEntry): Promise<void> {
    try {
      await fs.ensureDir(this.baseDir);

      // Add timestamp and version
      const enhancedEntry: CacheEntry = {
        ...entry,
        timestamp: Date.now(),
        version: "1.0",
      };

      // Serialize and optionally compress
      const serialized = JSON.stringify(enhancedEntry);
      let content: Buffer | string = serialized;

      if (this.options.enableCompression) {
        content = await gzip(Buffer.from(serialized));
      }

      // Write entry
      const file = this.entryPath(hash);
      if (this.options.enableCompression) {
        await fs.writeFile(file, content as Buffer);
      } else {
        await fs.writeFile(file, content as string);
      }

      // Write metadata
      const metaFile = this.metricPath(hash);
      const metadata = {
        timestamp: enhancedEntry.timestamp,
        size: Buffer.byteLength(serialized),
        compressed: this.options.enableCompression,
        hash,
      };
      await fs.writeJson(metaFile, metadata);

      // Update metrics
      this.updateMetrics(metadata.size);

      // Check cache size limits
      if (
        this.options.enableMetrics &&
        this.metrics.totalSize > this.options.maxSize
      ) {
        await this.evictOldEntries();
      }
    } catch (error) {
      console.warn(`Cache write failed for ${hash}:`, error);
      throw error;
    }
  }

  /**
   * Remove a specific cache entry.
   */
  async remove(hash: string): Promise<void> {
    const file = this.entryPath(hash);
    const metaFile = this.metricPath(hash);

    try {
      // Get size before removal for metrics
      let size = 0;
      if (await fs.pathExists(metaFile)) {
        const meta = await fs.readJson(metaFile);
        size = meta.size || 0;
      }

      // Remove files
      await Promise.all([
        fs.remove(file).catch(() => {}),
        fs.remove(metaFile).catch(() => {}),
      ]);

      // Update metrics
      this.metrics.totalSize -= size;
      this.metrics.entryCount = Math.max(0, this.metrics.entryCount - 1);
    } catch (error) {
      console.warn(`Cache removal failed for ${hash}:`, error);
    }
  }

  /**
   * Clear all cache entries.
   */
  async clear(): Promise<void> {
    try {
      await fs.remove(this.baseDir);
      await fs.ensureDir(this.baseDir);

      this.metrics = {
        hits: 0,
        misses: 0,
        evictions: 0,
        totalSize: 0,
        entryCount: 0,
      };

      await this.saveMetrics();
    } catch (error) {
      console.warn("Cache clear failed:", error);
    }
  }

  /**
   * Clean up expired entries.
   */
  async cleanup(): Promise<void> {
    try {
      if (!(await fs.pathExists(this.baseDir))) {
        return;
      }

      const files = await fs.readdir(this.baseDir);
      if (!files || !Array.isArray(files) || files.length === 0) {
        return;
      }

      const metaFiles = files.filter((f) => f.endsWith(".meta.json"));

      for (const metaFile of metaFiles) {
        const metaPath = path.join(this.baseDir, metaFile);
        const meta = await fs.readJson(metaPath);

        if (
          meta.timestamp &&
          Date.now() - meta.timestamp > this.options.timeout
        ) {
          const hash = metaFile.replace(".meta.json", "");
          await this.remove(hash);
        }
      }
    } catch (error) {
      console.warn("Cache cleanup failed:", error);
    }
  }
  /**
   * Evict oldest entries to stay within size limit.
   */
  private async evictOldEntries(): Promise<void> {
    try {
      if (!(await fs.pathExists(this.baseDir))) {
        return;
      }

      const files = await fs.readdir(this.baseDir);
      if (!files) {
        return;
      }

      const metaFiles = files.filter((f) => f.endsWith(".meta.json"));

      // Sort by timestamp (oldest first)
      const entries = await Promise.all(
        metaFiles.map(async (file) => {
          const metaPath = path.join(this.baseDir, file);
          const meta = await fs.readJson(metaPath);
          return {
            hash: file.replace(".meta.json", ""),
            timestamp: meta.timestamp || 0,
            size: meta.size || 0,
          };
        })
      );

      entries.sort((a, b) => a.timestamp - b.timestamp);

      // Remove oldest entries until we're under the size limit
      const targetSize = this.options.maxSize * 0.8; // Remove to 80% of max size
      let currentSize = this.metrics.totalSize;

      for (const entry of entries) {
        if (currentSize <= targetSize) break;

        await this.remove(entry.hash);
        currentSize -= entry.size;
        this.metrics.evictions++;
      }
    } catch (error) {
      console.warn("Cache eviction failed:", error);
    }
  }

  /**
   * Get cache statistics.
   */
  getMetrics(): CacheMetrics {
    return { ...this.metrics };
  }

  /**
   * Get cache hit ratio.
   */
  getHitRatio(): number {
    const total = this.metrics.hits + this.metrics.misses;
    return total > 0 ? this.metrics.hits / total : 0;
  }

  private recordHit(): void {
    if (this.options.enableMetrics) {
      this.metrics.hits++;
    }
  }

  private recordMiss(): void {
    if (this.options.enableMetrics) {
      this.metrics.misses++;
    }
  }

  private updateMetrics(size: number): void {
    if (this.options.enableMetrics) {
      this.metrics.totalSize += size;
      this.metrics.entryCount++;
    }
  }
  /**
   * Load metrics from disk.
   */
  private async loadMetrics(): Promise<void> {
    if (!this.options.enableMetrics) return;

    try {
      if (await fs.pathExists(this.metadataPath)) {
        const saved = await fs.readJson(this.metadataPath);
        if (saved && typeof saved === "object") {
          this.metrics = { ...this.metrics, ...saved };
        }
      } else {
        // Calculate metrics from existing files
        await this.recalculateMetrics();
      }
    } catch (error) {
      console.warn("Failed to load cache metrics:", error);
      await this.recalculateMetrics();
    }
  }

  /**
   * Save metrics to disk.
   */
  private async saveMetrics(): Promise<void> {
    if (!this.options.enableMetrics) return;

    try {
      await fs.writeJson(this.metadataPath, this.metrics);
    } catch (error) {
      console.warn("Failed to save cache metrics:", error);
    }
  }
  /**
   * Recalculate metrics from existing cache files.
   */
  private async recalculateMetrics(): Promise<void> {
    try {
      if (!(await fs.pathExists(this.baseDir))) {
        return;
      }

      const files = await fs.readdir(this.baseDir);
      if (!files) {
        return;
      }

      const metaFiles = files.filter((f) => f.endsWith(".meta.json"));
      let totalSize = 0;
      let entryCount = 0;

      for (const metaFile of metaFiles) {
        const metaPath = path.join(this.baseDir, metaFile);
        try {
          const meta = await fs.readJson(metaPath);
          totalSize += meta.size || 0;
          entryCount++;
        } catch (error) {
          console.warn(`Failed to read meta file ${metaFile}:`, error);
        }
      }

      this.metrics.totalSize = totalSize;
      this.metrics.entryCount = entryCount;
    } catch (error) {
      console.warn("Failed to recalculate cache metrics:", error);
    }
  }
  /**
   * Periodically save metrics (call this in a background task).
   */
  async persistMetrics(): Promise<void> {
    await this.saveMetrics();
  }

  /**
   * Clean up resources and stop timers.
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
  }
}
