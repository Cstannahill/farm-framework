/**
 * Advanced caching system with multiple strategies
 * Provides intelligent caching, distributed cache support, and cache optimization
 */

import fs from "fs-extra";
import path from "path";
import crypto from "crypto";
import { promisify } from "util";
import { gzip, gunzip } from "zlib";
import type { TypeSyncConfig } from "../config/validation";

const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);

export interface CacheEntry<T = any> {
  key: string;
  value: T;
  timestamp: number;
  size: number;
  ttl?: number;
  tags?: string[];
  dependencies?: string[];
  metadata?: Record<string, any>;
}

export interface CacheConfig {
  baseDir: string;
  maxSize?: number; // in bytes
  maxAge?: number; // in milliseconds
  compression?: boolean;
  distributed?: boolean;
  strategy?: "lru" | "lfu" | "ttl" | "adaptive";
  persistToDisk?: boolean;
  cleanupInterval?: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  totalSize: number;
  entryCount: number;
  oldestEntry?: number;
  newestEntry?: number;
}

/**
 * Advanced cache implementation with multiple strategies
 */
export class AdvancedCache<T = any> {
  private entries = new Map<string, CacheEntry<T>>();
  private accessCount = new Map<string, number>();
  private accessTime = new Map<string, number>();
  private config: Required<CacheConfig>;
  private stats: CacheStats;
  private cleanupTimer?: NodeJS.Timeout;

  constructor(config: CacheConfig) {
    this.config = {
      maxSize: 100 * 1024 * 1024, // 100MB default
      maxAge: 24 * 60 * 60 * 1000, // 24 hours default
      compression: true,
      distributed: false,
      strategy: "adaptive",
      persistToDisk: true,
      cleanupInterval: 60 * 1000, // 1 minute
      ...config,
    };

    this.stats = {
      hits: 0,
      misses: 0,
      hitRate: 0,
      totalSize: 0,
      entryCount: 0,
    };

    this.initialize();
  }

  /**
   * Initialize cache system
   */
  private async initialize(): Promise<void> {
    await fs.ensureDir(this.config.baseDir);

    if (this.config.persistToDisk) {
      await this.loadFromDisk();
    }

    this.startCleanupTimer();
  }

  /**
   * Get value from cache
   */
  async get(key: string): Promise<T | null> {
    const entry = this.entries.get(key);

    if (!entry) {
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }

    // Check TTL
    if (this.isExpired(entry)) {
      await this.delete(key);
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }

    // Update access patterns
    this.updateAccessPatterns(key);

    this.stats.hits++;
    this.updateHitRate();

    // If compression is enabled and stored value is a Buffer representing compressed data,
    // transparently decompress before returning to the caller for string payloads.
    if (this.config.compression && Buffer.isBuffer(entry.value)) {
      try {
        const decompressed = await gunzipAsync(entry.value as any);
        return decompressed.toString() as unknown as T;
      } catch {
        // If decompression fails, fall back to raw value
        return entry.value;
      }
    }

    return entry.value;
  }

  /**
   * Set value in cache
   */
  async set(
    key: string,
    value: T,
    options: Partial<CacheEntry> = {}
  ): Promise<void> {
    const entry: CacheEntry<T> = {
      key,
      value,
      timestamp: Date.now(),
      size: this.calculateSize(value),
      ttl: options.ttl || this.config.maxAge,
      tags: options.tags || [],
      dependencies: options.dependencies || [],
      metadata: options.metadata || {},
    };

    // Compress if enabled
    if (this.config.compression && typeof value === "string") {
      const compressed = await gzipAsync(Buffer.from(value));
      entry.value = compressed as any;
      entry.size = compressed.length;
    }

    // Check if we need to evict entries
    await this.ensureCapacity(entry.size);

    this.entries.set(key, entry);
    this.updateAccessPatterns(key);

    this.stats.entryCount = this.entries.size;
    this.stats.totalSize += entry.size;

    if (this.config.persistToDisk) {
      await this.persistEntry(entry);
    }
  }

  /**
   * Delete entry from cache
   */
  async delete(key: string): Promise<boolean> {
    const entry = this.entries.get(key);
    if (!entry) return false;

    this.entries.delete(key);
    this.accessCount.delete(key);
    this.accessTime.delete(key);

    this.stats.entryCount = this.entries.size;
    this.stats.totalSize -= entry.size;

    if (this.config.persistToDisk) {
      await this.deletePersistentEntry(key);
    }

    return true;
  }

  /**
   * Check if key exists in cache
   */
  has(key: string): boolean {
    const entry = this.entries.get(key);
    return entry ? !this.isExpired(entry) : false;
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<void> {
    this.entries.clear();
    this.accessCount.clear();
    this.accessTime.clear();

    this.stats = {
      hits: 0,
      misses: 0,
      hitRate: 0,
      totalSize: 0,
      entryCount: 0,
    };

    if (this.config.persistToDisk) {
      await fs.emptyDir(this.config.baseDir);
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const timestamps = Array.from(this.entries.values()).map(
      (e) => e.timestamp
    );
    return {
      ...this.stats,
      oldestEntry: timestamps.length ? Math.min(...timestamps) : undefined,
      newestEntry: timestamps.length ? Math.max(...timestamps) : undefined,
    };
  }

  /**
   * Invalidate entries by tag
   */
  async invalidateByTag(tag: string): Promise<number> {
    let count = 0;
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.entries.entries()) {
      if (entry.tags?.includes(tag)) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      await this.delete(key);
      count++;
    }

    return count;
  }

  /**
   * Invalidate entries by dependency
   */
  async invalidateByDependency(dependency: string): Promise<number> {
    let count = 0;
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.entries.entries()) {
      if (entry.dependencies?.includes(dependency)) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      await this.delete(key);
      count++;
    }

    return count;
  }

  /**
   * Optimize cache by removing expired or least useful entries
   */
  async optimize(): Promise<void> {
    const now = Date.now();
    const keysToDelete: string[] = [];

    // Remove expired entries
    for (const [key, entry] of this.entries.entries()) {
      if (this.isExpired(entry)) {
        keysToDelete.push(key);
      }
    }

    // Apply eviction strategy if over capacity
    if (this.stats.totalSize > this.config.maxSize) {
      const candidates = this.getEvictionCandidates();
      keysToDelete.push(...candidates);
    }

    for (const key of keysToDelete) {
      await this.delete(key);
    }
  }

  /**
   * Ensure cache capacity by evicting entries if necessary
   */
  private async ensureCapacity(newEntrySize: number): Promise<void> {
    if (this.stats.totalSize + newEntrySize <= this.config.maxSize) {
      return;
    }

    const candidates = this.getEvictionCandidates();
    let freedSpace = 0;

    for (const key of candidates) {
      const entry = this.entries.get(key);
      if (entry) {
        await this.delete(key);
        freedSpace += entry.size;

        if (this.stats.totalSize + newEntrySize <= this.config.maxSize) {
          break;
        }
      }
    }
  }

  /**
   * Get eviction candidates based on strategy
   */
  private getEvictionCandidates(): string[] {
    const entries = Array.from(this.entries.entries());

    switch (this.config.strategy) {
      case "lru":
        return this.getLRUCandidates(entries);
      case "lfu":
        return this.getLFUCandidates(entries);
      case "ttl":
        return this.getTTLCandidates(entries);
      case "adaptive":
        return this.getAdaptiveCandidates(entries);
      default:
        return this.getLRUCandidates(entries);
    }
  }

  /**
   * Get LRU (Least Recently Used) candidates
   */
  private getLRUCandidates(entries: [string, CacheEntry<T>][]): string[] {
    return entries
      .sort((a, b) => {
        const timeA = this.accessTime.get(a[0]) || 0;
        const timeB = this.accessTime.get(b[0]) || 0;
        return timeA - timeB;
      })
      .map(([key]) => key);
  }

  /**
   * Get LFU (Least Frequently Used) candidates
   */
  private getLFUCandidates(entries: [string, CacheEntry<T>][]): string[] {
    return entries
      .sort((a, b) => {
        const countA = this.accessCount.get(a[0]) || 0;
        const countB = this.accessCount.get(b[0]) || 0;
        return countA - countB;
      })
      .map(([key]) => key);
  }

  /**
   * Get TTL-based candidates (closest to expiry)
   */
  private getTTLCandidates(entries: [string, CacheEntry<T>][]): string[] {
    const now = Date.now();
    return entries
      .sort((a, b) => {
        const expiryA = a[1].timestamp + (a[1].ttl || this.config.maxAge);
        const expiryB = b[1].timestamp + (b[1].ttl || this.config.maxAge);
        return expiryA - expiryB;
      })
      .map(([key]) => key);
  }

  /**
   * Get adaptive candidates (combines multiple factors)
   */
  private getAdaptiveCandidates(entries: [string, CacheEntry<T>][]): string[] {
    const now = Date.now();

    return entries
      .map(([key, entry]) => {
        const accessCount = this.accessCount.get(key) || 0;
        const accessTime = this.accessTime.get(key) || entry.timestamp;
        const age = now - entry.timestamp;
        const timeToExpiry =
          entry.timestamp + (entry.ttl || this.config.maxAge) - now;

        // Scoring algorithm (lower score = better eviction candidate)
        const score =
          accessCount * 0.3 + // Frequency factor
          (now - accessTime) * 0.0001 + // Recency factor
          (timeToExpiry > 0 ? 0 : 1000) + // Expiry penalty
          entry.size * 0.00001; // Size factor

        return { key, score };
      })
      .sort((a, b) => a.score - b.score)
      .map((item) => item.key);
  }

  /**
   * Update access patterns for cache strategies
   */
  private updateAccessPatterns(key: string): void {
    const now = Date.now();
    this.accessTime.set(key, now);
    this.accessCount.set(key, (this.accessCount.get(key) || 0) + 1);
  }

  /**
   * Check if entry is expired
   */
  private isExpired(entry: CacheEntry<T>): boolean {
    if (!entry.ttl) return false;
    return Date.now() > entry.timestamp + entry.ttl;
  }

  /**
   * Calculate size of value
   */
  private calculateSize(value: T): number {
    return Buffer.byteLength(JSON.stringify(value), "utf8");
  }

  /**
   * Update hit rate statistics
   */
  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;
  }

  /**
   * Load cache from disk
   */
  private async loadFromDisk(): Promise<void> {
    try {
      const indexPath = path.join(this.config.baseDir, "index.json");
      if (await fs.pathExists(indexPath)) {
        const index = await fs.readJson(indexPath);

        for (const key of index.keys || []) {
          const entryPath = path.join(
            this.config.baseDir,
            `${this.hashKey(key)}.json`
          );
          if (await fs.pathExists(entryPath)) {
            const entry = await fs.readJson(entryPath);

            // Decompress if needed
            if (this.config.compression && Buffer.isBuffer(entry.value)) {
              entry.value = (await gunzipAsync(entry.value)).toString();
            }

            this.entries.set(key, entry);
          }
        }

        this.stats.entryCount = this.entries.size;
        this.stats.totalSize = Array.from(this.entries.values()).reduce(
          (sum, entry) => sum + entry.size,
          0
        );
      }
    } catch (error) {
      console.warn("Failed to load cache from disk:", error);
    }
  }

  /**
   * Persist entry to disk
   */
  private async persistEntry(entry: CacheEntry<T>): Promise<void> {
    try {
      const entryPath = path.join(
        this.config.baseDir,
        `${this.hashKey(entry.key)}.json`
      );
      await fs.writeJson(entryPath, entry);

      // Update index
      const indexPath = path.join(this.config.baseDir, "index.json");
      let index = { keys: [] as string[] };

      if (await fs.pathExists(indexPath)) {
        index = await fs.readJson(indexPath);
      }

      if (!index.keys.includes(entry.key)) {
        index.keys.push(entry.key);
        await fs.writeJson(indexPath, index);
      }
    } catch (error) {
      console.warn("Failed to persist cache entry:", error);
    }
  }

  /**
   * Delete persistent entry
   */
  private async deletePersistentEntry(key: string): Promise<void> {
    try {
      const entryPath = path.join(
        this.config.baseDir,
        `${this.hashKey(key)}.json`
      );
      await fs.remove(entryPath);

      // Update index
      const indexPath = path.join(this.config.baseDir, "index.json");
      if (await fs.pathExists(indexPath)) {
        const index = await fs.readJson(indexPath);
        index.keys = index.keys.filter((k: string) => k !== key);
        await fs.writeJson(indexPath, index);
      }
    } catch (error) {
      console.warn("Failed to delete persistent cache entry:", error);
    }
  }

  /**
   * Hash key for filename
   */
  private hashKey(key: string): string {
    return crypto.createHash("sha256").update(key).digest("hex");
  }

  /**
   * Start cleanup timer
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(async () => {
      await this.optimize();
    }, this.config.cleanupInterval);
  }

  /**
   * Stop cleanup timer
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
  }
}

/**
 * Distributed cache coordinator for multi-process scenarios
 */
export class DistributedCacheCoordinator {
  private instances: AdvancedCache[] = [];
  private config: CacheConfig;

  constructor(config: CacheConfig) {
    this.config = config;
  }

  /**
   * Register cache instance
   */
  register(cache: AdvancedCache): void {
    this.instances.push(cache);
  }

  /**
   * Broadcast invalidation to all instances
   */
  async broadcastInvalidation(key: string): Promise<void> {
    // Tolerate partial failures: ensure the broadcast resolves even if one cache rejects
    await Promise.all(
      this.instances.map((cache) => cache.delete(key).catch(() => undefined))
    );
  }

  /**
   * Broadcast tag invalidation to all instances
   */
  async broadcastTagInvalidation(tag: string): Promise<void> {
    await Promise.all(
      this.instances.map((cache) => cache.invalidateByTag(tag).catch(() => 0))
    );
  }

  /**
   * Get aggregated statistics
   */
  getAggregatedStats(): CacheStats {
    const stats = this.instances.map((cache) => cache.getStats());

    return stats.reduce(
      (total, current) => ({
        hits: total.hits + current.hits,
        misses: total.misses + current.misses,
        hitRate:
          (total.hits + current.hits) /
          (total.hits + current.hits + total.misses + current.misses),
        totalSize: total.totalSize + current.totalSize,
        entryCount: total.entryCount + current.entryCount,
        oldestEntry: Math.min(
          total.oldestEntry || Infinity,
          current.oldestEntry || Infinity
        ),
        newestEntry: Math.max(total.newestEntry || 0, current.newestEntry || 0),
      }),
      {
        hits: 0,
        misses: 0,
        hitRate: 0,
        totalSize: 0,
        entryCount: 0,
      }
    );
  }
}

export default AdvancedCache;
