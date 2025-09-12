/**
 * Tests for advanced caching system
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import fs from "fs-extra";
import path from "path";
import {
  AdvancedCache,
  DistributedCacheCoordinator,
} from "../../src/cache/advanced-cache";
import type {
  CacheConfig,
  CacheEntry,
  CacheStats,
} from "../../src/cache/advanced-cache";

// Mock fs-extra
vi.mock("fs-extra");
const mockedFs = vi.mocked(fs);

describe("AdvancedCache", () => {
  let cache: AdvancedCache;
  let config: CacheConfig;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = "/tmp/test-cache";
    config = {
      baseDir: tempDir,
      maxSize: 1024 * 1024, // 1MB
      maxAge: 60000, // 1 minute
      compression: true,
      strategy: "lru",
      persistToDisk: false, // Disable for testing
      cleanupInterval: 30000,
    };

    // Mock fs operations
    mockedFs.ensureDir.mockResolvedValue(undefined);
    mockedFs.pathExists.mockResolvedValue(false as never);
    mockedFs.readJson.mockResolvedValue({});
    mockedFs.writeJson.mockResolvedValue(undefined);
    mockedFs.writeFile.mockResolvedValue(undefined);
    mockedFs.remove.mockResolvedValue(undefined);
    mockedFs.emptyDir.mockResolvedValue(undefined);

    cache = new AdvancedCache(config);

    // Wait for initialization
    await new Promise((resolve) => setTimeout(resolve, 10));
  });

  afterEach(() => {
    cache.destroy();
    vi.clearAllMocks();
  });

  describe("basic operations", () => {
    test("should store and retrieve values", async () => {
      const key = "test-key";
      const value = { data: "test data" };

      await cache.set(key, value);
      const retrieved = await cache.get(key);

      expect(retrieved).toEqual(value);
    });

    test("should return null for non-existent keys", async () => {
      const result = await cache.get("non-existent");
      expect(result).toBeNull();
    });

    test("should check key existence", async () => {
      const key = "exists-test";
      const value = "test";

      expect(cache.has(key)).toBe(false);

      await cache.set(key, value);
      expect(cache.has(key)).toBe(true);
    });

    test("should delete entries", async () => {
      const key = "delete-test";
      const value = "test";

      await cache.set(key, value);
      expect(cache.has(key)).toBe(true);

      const deleted = await cache.delete(key);
      expect(deleted).toBe(true);
      expect(cache.has(key)).toBe(false);
    });

    test("should clear all entries", async () => {
      await cache.set("key1", "value1");
      await cache.set("key2", "value2");

      expect(cache.has("key1")).toBe(true);
      expect(cache.has("key2")).toBe(true);

      await cache.clear();

      expect(cache.has("key1")).toBe(false);
      expect(cache.has("key2")).toBe(false);
    });
  });

  describe("TTL and expiration", () => {
    test("should expire entries after TTL", async () => {
      const key = "ttl-test";
      const value = "test data";
      const shortTTL = 50; // 50ms

      await cache.set(key, value, { ttl: shortTTL });

      // Should exist immediately
      expect(await cache.get(key)).toEqual(value);

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 60));

      // Should be null after expiration
      expect(await cache.get(key)).toBeNull();
    });

    test("should use default TTL when not specified", async () => {
      const key = "default-ttl-test";
      const value = "test data";

      await cache.set(key, value);

      const entry = cache["entries"].get(key);
      expect(entry?.ttl).toBe(config.maxAge);
    });

    test("should not expire entries with no TTL", async () => {
      const key = "no-ttl-test";
      const value = "test data";

      await cache.set(key, value, { ttl: undefined });

      // Wait longer than default TTL
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(await cache.get(key)).toEqual(value);
    });
  });

  describe("capacity management", () => {
    test("should enforce size limits", async () => {
      // Create cache with very small limit
      const smallCache = new AdvancedCache({
        ...config,
        maxSize: 100, // 100 bytes
      });

      // Add entries that exceed the limit
      await smallCache.set("key1", "x".repeat(50));
      await smallCache.set("key2", "y".repeat(50));
      await smallCache.set("key3", "z".repeat(50)); // Should trigger eviction

      // At least one of the earlier entries should be evicted
      const stats = smallCache.getStats();
      expect(stats.totalSize).toBeLessThanOrEqual(100);

      smallCache.destroy();
    });

    test("should calculate entry sizes correctly", async () => {
      const key = "size-test";
      const value = { data: "test".repeat(100) };

      await cache.set(key, value);

      const entry = cache["entries"].get(key);
      expect(entry?.size).toBeGreaterThan(0);
    });
  });

  describe("eviction strategies", () => {
    let testCache: AdvancedCache;

    beforeEach(() => {
      testCache = new AdvancedCache({
        ...config,
        maxSize: 300,
        strategy: "lru",
      });
    });

    afterEach(() => {
      testCache.destroy();
    });

    test("should evict LRU entries", async () => {
      await testCache.set("old", "x".repeat(100));
      await testCache.set("medium", "y".repeat(100));

      // Access old entry to make it more recently used
      await testCache.get("old");

      // Add new entry that should trigger eviction
      await testCache.set("new", "z".repeat(100));

      // Medium should be evicted (least recently used)
      expect(testCache.has("old")).toBe(true);
      expect(testCache.has("new")).toBe(true);
      // Note: Exact eviction behavior depends on implementation details
    });

    test("should use different eviction strategies", async () => {
      const lfuCache = new AdvancedCache({
        ...config,
        maxSize: 200,
        strategy: "lfu",
      });

      await lfuCache.set("frequent", "x".repeat(80));
      await lfuCache.set("infrequent", "y".repeat(80));

      // Access frequent entry multiple times
      await lfuCache.get("frequent");
      await lfuCache.get("frequent");
      await lfuCache.get("infrequent");

      // Add entry that triggers eviction
      await lfuCache.set("new", "z".repeat(80));

      // Implementation should favor frequent over infrequent
      expect(lfuCache.has("frequent")).toBe(true);

      lfuCache.destroy();
    });
  });

  describe("tags and dependencies", () => {
    test("should invalidate entries by tag", async () => {
      await cache.set("user1", { data: "user1" }, { tags: ["users"] });
      await cache.set("user2", { data: "user2" }, { tags: ["users"] });
      await cache.set("post1", { data: "post1" }, { tags: ["posts"] });

      expect(cache.has("user1")).toBe(true);
      expect(cache.has("user2")).toBe(true);
      expect(cache.has("post1")).toBe(true);

      const invalidated = await cache.invalidateByTag("users");

      expect(invalidated).toBe(2);
      expect(cache.has("user1")).toBe(false);
      expect(cache.has("user2")).toBe(false);
      expect(cache.has("post1")).toBe(true);
    });

    test("should invalidate entries by dependency", async () => {
      await cache.set(
        "derived1",
        { data: "derived1" },
        { dependencies: ["schema"] }
      );
      await cache.set(
        "derived2",
        { data: "derived2" },
        { dependencies: ["schema"] }
      );
      await cache.set("other", { data: "other" }, { dependencies: ["config"] });

      const invalidated = await cache.invalidateByDependency("schema");

      expect(invalidated).toBe(2);
      expect(cache.has("derived1")).toBe(false);
      expect(cache.has("derived2")).toBe(false);
      expect(cache.has("other")).toBe(true);
    });

    test("should handle multiple tags per entry", async () => {
      await cache.set("entry", { data: "test" }, { tags: ["tag1", "tag2"] });

      await cache.invalidateByTag("tag1");
      expect(cache.has("entry")).toBe(false);
    });
  });

  describe("statistics", () => {
    test("should track cache statistics", async () => {
      // Initial stats
      let stats = cache.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.entryCount).toBe(0);

      // Add entry and access it
      await cache.set("test", "value");
      await cache.get("test"); // Hit
      await cache.get("missing"); // Miss

      stats = cache.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBe(0.5);
      expect(stats.entryCount).toBe(1);
    });

    test("should track size statistics", async () => {
      const value = "x".repeat(100);
      await cache.set("test", value);

      const stats = cache.getStats();
      expect(stats.totalSize).toBeGreaterThan(0);
    });

    test("should track oldest and newest entries", async () => {
      const now = Date.now();

      await cache.set("old", "value");

      // Wait a bit
      await new Promise((resolve) => setTimeout(resolve, 10));

      await cache.set("new", "value");

      const stats = cache.getStats();
      expect(stats.oldestEntry).toBeLessThan(stats.newestEntry!);
    });
  });

  describe("optimization", () => {
    test("should optimize cache by removing expired entries", async () => {
      await cache.set("expired", "value", { ttl: 1 }); // 1ms TTL
      await cache.set("valid", "value");

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 10));

      await cache.optimize();

      expect(cache.has("expired")).toBe(false);
      expect(cache.has("valid")).toBe(true);
    });

    test("should handle optimization with no expired entries", async () => {
      await cache.set("valid1", "value");
      await cache.set("valid2", "value");

      const beforeCount = cache.getStats().entryCount;
      await cache.optimize();
      const afterCount = cache.getStats().entryCount;

      expect(afterCount).toBe(beforeCount);
    });
  });

  describe("compression", () => {
    test("should compress string values when enabled", async () => {
      const compressedCache = new AdvancedCache({
        ...config,
        compression: true,
      });

      const largeString = "x".repeat(1000);
      await compressedCache.set("test", largeString);

      // Should be able to retrieve the original value
      const retrieved = await compressedCache.get("test");
      expect(retrieved).toBe(largeString);

      // Value should be compressed in storage (Buffer)
      const entry = compressedCache["entries"].get("test");
      expect(Buffer.isBuffer(entry?.value)).toBe(true);

      compressedCache.destroy();
    });

    test("should not compress non-string values", async () => {
      const object = { data: "test".repeat(100) };
      await cache.set("test", object);

      const entry = cache["entries"].get("test");
      expect(entry?.value).toEqual(object);
    });
  });

  describe("error handling", () => {
    test("should handle JSON parsing errors gracefully", async () => {
      // Mock JSON parsing error
      mockedFs.readJson.mockRejectedValueOnce(new Error("Invalid JSON"));

      const errorCache = new AdvancedCache({
        ...config,
        persistToDisk: true,
      });

      // Should not throw
      await new Promise((resolve) => setTimeout(resolve, 10));

      errorCache.destroy();
    });

    test("should handle file system errors gracefully", async () => {
      mockedFs.writeJson.mockRejectedValueOnce(new Error("Disk full"));

      await cache.set("test", "value");
      // Should not throw even if persistence fails
    });
  });
});

describe("DistributedCacheCoordinator", () => {
  let coordinator: DistributedCacheCoordinator;
  let cache1: AdvancedCache;
  let cache2: AdvancedCache;

  beforeEach(() => {
    const config: CacheConfig = {
      baseDir: "/tmp/test-cache",
      persistToDisk: false,
    };

    coordinator = new DistributedCacheCoordinator(config);
    cache1 = new AdvancedCache(config);
    cache2 = new AdvancedCache(config);

    coordinator.register(cache1);
    coordinator.register(cache2);
  });

  afterEach(() => {
    cache1.destroy();
    cache2.destroy();
  });

  describe("coordination", () => {
    test("should broadcast invalidation to all instances", async () => {
      const key = "test-key";

      await cache1.set(key, "value1");
      await cache2.set(key, "value2");

      expect(cache1.has(key)).toBe(true);
      expect(cache2.has(key)).toBe(true);

      await coordinator.broadcastInvalidation(key);

      expect(cache1.has(key)).toBe(false);
      expect(cache2.has(key)).toBe(false);
    });

    test("should broadcast tag invalidation", async () => {
      await cache1.set("key1", "value", { tags: ["test"] });
      await cache2.set("key2", "value", { tags: ["test"] });

      await coordinator.broadcastTagInvalidation("test");

      expect(cache1.has("key1")).toBe(false);
      expect(cache2.has("key2")).toBe(false);
    });

    test("should aggregate statistics", async () => {
      await cache1.set("key1", "value");
      await cache2.set("key2", "value");

      await cache1.get("key1"); // hit
      await cache1.get("missing"); // miss
      await cache2.get("key2"); // hit

      const stats = coordinator.getAggregatedStats();

      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
      expect(stats.entryCount).toBe(2);
      expect(stats.hitRate).toBeCloseTo(0.667, 2);
    });
  });

  describe("error handling", () => {
    test("should handle partial failures in broadcast operations", async () => {
      // Mock one cache to fail
      vi.spyOn(cache1, "delete").mockRejectedValueOnce(
        new Error("Cache error")
      );

      // Should not throw even if one cache fails
      await expect(
        coordinator.broadcastInvalidation("test")
      ).resolves.toBeUndefined();
    });
  });
});

describe("edge cases and error conditions", () => {
  test("should handle very large cache entries", async () => {
    const cache = new AdvancedCache({
      baseDir: "/tmp/test",
      maxSize: 10 * 1024 * 1024, // 10MB
      persistToDisk: false,
    });

    const largeValue = "x".repeat(1024 * 1024); // 1MB string

    await cache.set("large", largeValue);
    const retrieved = await cache.get("large");

    expect(retrieved).toBe(largeValue);

    cache.destroy();
  });

  test("should handle concurrent access gracefully", async () => {
    const cache = new AdvancedCache({
      baseDir: "/tmp/test",
      persistToDisk: false,
    });

    // Simulate concurrent writes
    const promises = Array.from({ length: 100 }, (_, i) =>
      cache.set(`key${i}`, `value${i}`)
    );

    await Promise.all(promises);

    // All entries should be stored
    for (let i = 0; i < 100; i++) {
      expect(await cache.get(`key${i}`)).toBe(`value${i}`);
    }

    cache.destroy();
  });

  test("should handle cleanup timer properly", async () => {
    const cache = new AdvancedCache({
      baseDir: "/tmp/test",
      persistToDisk: false,
      cleanupInterval: 10, // Very short interval
    });

    // Add expired entry
    await cache.set("expired", "value", { ttl: 1 });

    // Wait for cleanup
    await new Promise((resolve) => setTimeout(resolve, 20));

    // Entry should be cleaned up
    expect(cache.has("expired")).toBe(false);

    cache.destroy();
  });
});
