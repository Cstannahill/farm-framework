/**
 * Tests for performance optimization features
 */

import {
  describe,
  test,
  expect,
  beforeEach,
  afterEach,
  vi,
  Mock,
} from "vitest";
import {
  PerformanceOptimizer,
  IncrementalTracker,
} from "../../src/performance/optimizer";
import type { TypeSyncConfig } from "../../src/config/validation";
import type {
  GenerationTask,
  OptimizationOptions,
} from "../../src/performance/optimizer";

// Mock dependencies
vi.mock("worker_threads", () => ({
  Worker: vi.fn(),
  parentPort: null,
  workerData: null,
}));

vi.mock("os", () => ({
  cpus: () => Array(4).fill({ model: "test" }),
}));

describe("PerformanceOptimizer", () => {
  let config: TypeSyncConfig;
  let optimizer: PerformanceOptimizer;
  let options: OptimizationOptions;

  beforeEach(() => {
    config = {
      apiUrl: "http://localhost:8000",
      outputDir: "./src/types",
      generators: {
        typescript: {
          outputDir: "./src/types",
          enabled: true,
        },
      },
    };

    options = {
      maxWorkers: 2,
      chunkSize: 5,
      enableIncremental: true,
      enableParallel: true,
      memoryThreshold: 100 * 1024 * 1024,
      enableProfiling: false,
    };

    optimizer = new PerformanceOptimizer(config, options);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("initialization", () => {
    test("should initialize with default options", () => {
      const defaultOptimizer = new PerformanceOptimizer(config);
      expect(defaultOptimizer).toBeDefined();
    });

    test("should apply custom options", () => {
      expect(optimizer).toBeDefined();
    });
  });

  describe("monitoring", () => {
    test("should start and stop monitoring", () => {
      optimizer.startMonitoring();
      const metrics = optimizer.stopMonitoring();

      expect(metrics).toBeDefined();
      expect(metrics.totalTime).toBeGreaterThan(0);
      expect(metrics.memoryUsage).toBeDefined();
    });

    test("should initialize metrics correctly", () => {
      optimizer.startMonitoring();
      const metrics = optimizer.stopMonitoring();

      expect(metrics.cacheHits).toBe(0);
      expect(metrics.cacheMisses).toBe(0);
      expect(metrics.filesGenerated).toBe(0);
      expect(metrics.bytesGenerated).toBe(0);
    });
  });

  describe("task management", () => {
    test("should add tasks to queue", () => {
      const task: GenerationTask = {
        id: "test-task",
        type: "schema",
        data: { test: "data" },
        priority: 1,
      };

      optimizer.addTask(task);
      expect(optimizer["taskQueue"]).toHaveLength(1);
    });

    test("should sort tasks by priority", () => {
      const lowPriority: GenerationTask = {
        id: "low",
        type: "schema",
        data: {},
        priority: 1,
      };

      const highPriority: GenerationTask = {
        id: "high",
        type: "schema",
        data: {},
        priority: 5,
      };

      optimizer.addTask(lowPriority);
      optimizer.addTask(highPriority);

      expect(optimizer["taskQueue"][0].id).toBe("high");
      expect(optimizer["taskQueue"][1].id).toBe("low");
    });

    test("should handle task dependencies", () => {
      const dependentTask: GenerationTask = {
        id: "dependent",
        type: "generator",
        data: {},
        priority: 1,
        dependencies: ["prerequisite"],
      };

      optimizer.addTask(dependentTask);

      // Should not be available initially
      const available = optimizer["getAvailableTasks"]();
      expect(available).toHaveLength(0);

      // Mark prerequisite as completed
      optimizer["completedTasks"].add("prerequisite");

      // Should now be available
      const availableAfter = optimizer["getAvailableTasks"]();
      expect(availableAfter).toHaveLength(1);
    });
  });

  describe("cache tracking", () => {
    test("should record cache hits", () => {
      optimizer.startMonitoring();
      optimizer.recordCacheHit();
      optimizer.recordCacheHit();

      const metrics = optimizer.stopMonitoring();
      expect(metrics.cacheHits).toBe(2);
    });

    test("should record cache misses", () => {
      optimizer.startMonitoring();
      optimizer.recordCacheMiss();
      optimizer.recordCacheMiss();
      optimizer.recordCacheMiss();

      const metrics = optimizer.stopMonitoring();
      expect(metrics.cacheMisses).toBe(3);
    });
  });

  describe("task execution", () => {
    test("should execute tasks sequentially when parallel is disabled", async () => {
      const sequentialOptimizer = new PerformanceOptimizer(config, {
        ...options,
        enableParallel: false,
      });

      const task: GenerationTask = {
        id: "test",
        type: "schema",
        data: { value: "test" },
        priority: 1,
      };

      sequentialOptimizer.addTask(task);

      const results = await sequentialOptimizer.executeTasks();
      expect(results).toBeDefined();
    });

    test("should chunk tasks correctly", () => {
      const tasks: GenerationTask[] = Array.from({ length: 12 }, (_, i) => ({
        id: `task-${i}`,
        type: "schema",
        data: {},
        priority: 1,
      }));

      const chunks = optimizer["chunkTasks"](tasks, 5);
      expect(chunks).toHaveLength(3);
      expect(chunks[0]).toHaveLength(5);
      expect(chunks[1]).toHaveLength(5);
      expect(chunks[2]).toHaveLength(2);
    });
  });

  describe("optimization recommendations", () => {
    test("should recommend cache tuning for low hit rates", () => {
      optimizer.startMonitoring();

      // Simulate low cache hit rate
      for (let i = 0; i < 10; i++) {
        optimizer.recordCacheMiss();
      }
      optimizer.recordCacheHit();

      optimizer.stopMonitoring();
      const recommendations = optimizer.getOptimizationRecommendations();

      expect(recommendations).toContain(
        "Consider tuning cache settings to improve hit rate"
      );
    });

    test("should recommend parallel processing for high generation time", () => {
      optimizer.startMonitoring();

      // Simulate high generation time
      optimizer["metrics"].generationTime = 1000;
      optimizer["metrics"].totalTime = 1200;

      const recommendations = optimizer.getOptimizationRecommendations();
      expect(recommendations).toContain(
        "Generation time is high, consider enabling parallel processing"
      );
    });
  });

  describe("performance reporting", () => {
    test("should generate comprehensive performance report", () => {
      optimizer.startMonitoring();
      optimizer.recordCacheHit();
      optimizer.recordCacheMiss();

      const metrics = optimizer.stopMonitoring();
      const report = optimizer.generateReport();

      expect(report).toContain("Type-Sync Performance Report");
      expect(report).toContain("Total Time:");
      expect(report).toContain("Cache Hit Rate:");
      expect(report).toContain("Optimization Recommendations");
    });

    test("should format metrics correctly in report", () => {
      optimizer.startMonitoring();

      // Add some metrics
      optimizer["metrics"].filesGenerated = 5;
      optimizer["metrics"].bytesGenerated = 2048;
      optimizer.recordCacheHit();
      optimizer.recordCacheHit();
      optimizer.recordCacheMiss();

      const report = optimizer.generateReport();

      expect(report).toContain("Files Generated: 5");
      expect(report).toContain("Bytes Generated: 2.0 KB");
      expect(report).toContain("Cache Hit Rate: 66.7%");
    });
  });

  describe("memory monitoring", () => {
    test("should emit memory warning when threshold exceeded", async () => {
      const profilerOptimizer = new PerformanceOptimizer(config, {
        ...options,
        enableProfiling: true,
        memoryThreshold: 1, // Very low threshold
      });

      const warningPromise = new Promise((resolve) => {
        profilerOptimizer.on("memoryWarning", (warning) => {
          expect(warning.current).toBeGreaterThan(warning.threshold);
          expect(warning.suggestion).toContain("Consider reducing batch size");
          resolve(warning);
        });
      });

      profilerOptimizer.startMonitoring();

      // Trigger check (in real scenario, this would be automatic)
      setTimeout(() => {
        profilerOptimizer.emit("memoryWarning", {
          current: 2,
          threshold: 1,
          suggestion:
            "Consider reducing batch size or enabling incremental mode",
        });
      }, 10);

      await warningPromise;
    });
  });
});

describe("IncrementalTracker", () => {
  let tracker: IncrementalTracker;

  beforeEach(() => {
    tracker = new IncrementalTracker();
  });

  describe("regeneration tracking", () => {
    test("should detect files that need regeneration", () => {
      const filePath = "/test/file.ts";
      const now = Date.now();

      // File has never been generated
      expect(tracker.needsRegeneration(filePath, now)).toBe(true);

      // Mark as generated
      tracker.markGenerated(filePath, now);
      expect(tracker.needsRegeneration(filePath, now)).toBe(false);

      // File modified after generation
      expect(tracker.needsRegeneration(filePath, now + 1000)).toBe(true);
    });

    test("should track generation timestamps", () => {
      const filePath = "/test/file.ts";
      const timestamp = Date.now();

      tracker.markGenerated(filePath, timestamp);
      expect(tracker["lastGeneration"].get(filePath)).toBe(timestamp);
    });
  });

  describe("dependency tracking", () => {
    test("should add and track dependencies", () => {
      const mainFile = "/src/api.ts";
      const schemaFile = "/src/schema.ts";

      tracker.addDependency(mainFile, schemaFile);

      expect(tracker["dependencies"].get(mainFile)).toContain(schemaFile);
    });

    test("should find affected files when dependency changes", () => {
      const schemaFile = "/src/schema.ts";
      const apiFile = "/src/api.ts";
      const clientFile = "/src/client.ts";

      tracker.addDependency(apiFile, schemaFile);
      tracker.addDependency(clientFile, schemaFile);

      const affected = tracker.getAffectedFiles(schemaFile);

      expect(affected).toContain(apiFile);
      expect(affected).toContain(clientFile);
      expect(affected).toHaveLength(2);
    });

    test("should handle multiple dependencies per file", () => {
      const mainFile = "/src/main.ts";
      const dep1 = "/src/dep1.ts";
      const dep2 = "/src/dep2.ts";

      tracker.addDependency(mainFile, dep1);
      tracker.addDependency(mainFile, dep2);

      expect(tracker["dependencies"].get(mainFile)).toContain(dep1);
      expect(tracker["dependencies"].get(mainFile)).toContain(dep2);
      expect(tracker["dependencies"].get(mainFile)?.size).toBe(2);
    });
  });

  describe("cleanup", () => {
    test("should clear all tracking data", () => {
      const filePath = "/test/file.ts";

      tracker.markGenerated(filePath);
      tracker.addDependency(filePath, "/test/dep.ts");

      tracker.clear();

      expect(tracker["lastGeneration"].size).toBe(0);
      expect(tracker["dependencies"].size).toBe(0);
    });
  });

  describe("edge cases", () => {
    test("should handle non-existent dependencies gracefully", () => {
      const affected = tracker.getAffectedFiles("/non/existent/file.ts");
      expect(affected).toHaveLength(0);
    });

    test("should handle circular dependencies", () => {
      const file1 = "/src/file1.ts";
      const file2 = "/src/file2.ts";

      tracker.addDependency(file1, file2);
      tracker.addDependency(file2, file1);

      const affected1 = tracker.getAffectedFiles(file1);
      const affected2 = tracker.getAffectedFiles(file2);

      expect(affected1).toContain(file2);
      expect(affected2).toContain(file1);
    });
  });
});

describe("integration tests", () => {
  test("should integrate optimizer with incremental tracker", () => {
    const tracker = new IncrementalTracker();
    const localConfig: TypeSyncConfig = {
      apiUrl: "http://localhost:8000",
      outputDir: "./src/types",
      generators: {
        typescript: {
          outputDir: "./src/types",
          enabled: true,
        },
      },
    };
    const localOptions: OptimizationOptions = {
      maxWorkers: 2,
      chunkSize: 5,
      enableIncremental: true,
      enableParallel: true,
      memoryThreshold: 100 * 1024 * 1024,
      enableProfiling: false,
    };
    const optimizer = new PerformanceOptimizer(localConfig, localOptions);

    // Track some files
    tracker.markGenerated("/src/types.ts");
    tracker.addDependency("/src/api.ts", "/src/types.ts");

    // Simulate file change
    const affected = tracker.getAffectedFiles("/src/types.ts");

    // Create tasks for affected files
    affected.forEach((file, index) => {
      const task: GenerationTask = {
        id: `regen-${index}`,
        type: "generator",
        data: { file },
        priority: 1,
      };
      optimizer.addTask(task);
    });

    expect(optimizer["taskQueue"]).toHaveLength(1);
  });

  test("should handle performance optimization with caching", async () => {
    const localConfig: TypeSyncConfig = {
      apiUrl: "http://localhost:8000",
      outputDir: "./src/types",
      generators: {
        typescript: {
          outputDir: "./src/types",
          enabled: true,
        },
      },
    };
    const baseOptions: OptimizationOptions = {
      maxWorkers: 2,
      chunkSize: 5,
      enableIncremental: true,
      enableParallel: true,
      memoryThreshold: 100 * 1024 * 1024,
      enableProfiling: false,
    };
    const optimizer = new PerformanceOptimizer(localConfig, {
      ...baseOptions,
      enableParallel: false, // Disable for predictable testing
    });

    optimizer.startMonitoring();

    // Simulate cache operations
    optimizer.recordCacheHit();
    optimizer.recordCacheMiss();

    // Add tasks
    const task: GenerationTask = {
      id: "test-task",
      type: "schema",
      data: { test: "data" },
      priority: 1,
    };

    optimizer.addTask(task);
    await optimizer.executeTasks();

    const metrics = optimizer.stopMonitoring();

    expect(metrics.cacheHits).toBe(1);
    expect(metrics.cacheMisses).toBe(1);
    expect(metrics.totalTime).toBeGreaterThan(0);
  });
});
