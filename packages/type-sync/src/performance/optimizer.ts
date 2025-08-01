/**
 * Performance optimizer for type-sync operations
 * Provides parallel processing, incremental generation, and optimization strategies
 */

import { EventEmitter } from "events";
import { cpus } from "os";
import { Worker } from "worker_threads";
import path from "path";
import { performance } from "perf_hooks";
import type { TypeSyncConfig } from "../config/validation";

export interface PerformanceMetrics {
  totalTime: number;
  schemaExtractionTime: number;
  generationTime: number;
  writeTime: number;
  cacheHits: number;
  cacheMisses: number;
  filesGenerated: number;
  bytesGenerated: number;
  parallelTasks: number;
  memoryUsage: NodeJS.MemoryUsage;
}

export interface OptimizationOptions {
  maxWorkers?: number;
  chunkSize?: number;
  enableIncremental?: boolean;
  enableParallel?: boolean;
  memoryThreshold?: number;
  enableProfiling?: boolean;
}

export interface GenerationTask {
  id: string;
  type: "schema" | "generator" | "write";
  data: any;
  priority: number;
  dependencies?: string[];
}

export class PerformanceOptimizer extends EventEmitter {
  private config: TypeSyncConfig;
  private options: OptimizationOptions;
  private metrics: PerformanceMetrics;
  private workers: Worker[] = [];
  private taskQueue: GenerationTask[] = [];
  private completedTasks = new Set<string>();
  private startTime: number = 0;

  constructor(config: TypeSyncConfig, options: OptimizationOptions = {}) {
    super();
    this.config = config;
    this.options = {
      maxWorkers: options.maxWorkers || Math.max(1, cpus().length - 1),
      chunkSize: options.chunkSize || 10,
      enableIncremental: options.enableIncremental ?? true,
      enableParallel: options.enableParallel ?? true,
      memoryThreshold: options.memoryThreshold || 500 * 1024 * 1024, // 500MB
      enableProfiling: options.enableProfiling ?? false,
      ...options,
    };
    this.metrics = this.initializeMetrics();
  }

  /**
   * Initialize performance metrics
   */
  private initializeMetrics(): PerformanceMetrics {
    return {
      totalTime: 0,
      schemaExtractionTime: 0,
      generationTime: 0,
      writeTime: 0,
      cacheHits: 0,
      cacheMisses: 0,
      filesGenerated: 0,
      bytesGenerated: 0,
      parallelTasks: 0,
      memoryUsage: process.memoryUsage(),
    };
  }

  /**
   * Start performance monitoring
   */
  startMonitoring(): void {
    this.startTime = performance.now();
    this.metrics = this.initializeMetrics();

    if (this.options.enableProfiling) {
      this.setupMemoryMonitoring();
    }
  }

  /**
   * Stop performance monitoring and return metrics
   */
  stopMonitoring(): PerformanceMetrics {
    this.metrics.totalTime = performance.now() - this.startTime;
    this.metrics.memoryUsage = process.memoryUsage();
    return { ...this.metrics };
  }

  /**
   * Setup memory monitoring for profiling
   */
  private setupMemoryMonitoring(): void {
    const interval = setInterval(() => {
      const usage = process.memoryUsage();
      if (usage.heapUsed > this.options.memoryThreshold!) {
        this.emit("memoryWarning", {
          current: usage.heapUsed,
          threshold: this.options.memoryThreshold,
          suggestion:
            "Consider reducing batch size or enabling incremental mode",
        });
      }
    }, 1000);

    this.once("complete", () => clearInterval(interval));
  }

  /**
   * Add a generation task to the queue
   */
  addTask(task: GenerationTask): void {
    this.taskQueue.push(task);
    this.taskQueue.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Execute all queued tasks with optimal parallelization
   */
  async executeTasks(): Promise<any[]> {
    if (!this.options.enableParallel) {
      return this.executeSequentially();
    }

    return this.executeInParallel();
  }

  /**
   * Execute tasks sequentially
   */
  private async executeSequentially(): Promise<any[]> {
    const results: any[] = [];

    for (const task of this.taskQueue) {
      if (this.canExecuteTask(task)) {
        const result = await this.executeTask(task);
        results.push(result);
        this.completedTasks.add(task.id);
      }
    }

    return results;
  }

  /**
   * Execute tasks in parallel using worker threads
   */
  private async executeInParallel(): Promise<any[]> {
    const availableTasks = this.getAvailableTasks();
    const chunks = this.chunkTasks(availableTasks, this.options.chunkSize!);

    this.metrics.parallelTasks = Math.min(
      chunks.length,
      this.options.maxWorkers!
    );

    const workerPromises = chunks
      .slice(0, this.options.maxWorkers!)
      .map((chunk, index) => this.createWorker(chunk, index));

    const results = await Promise.all(workerPromises);
    await this.cleanupWorkers();

    return results.flat();
  }

  /**
   * Get tasks that can be executed (dependencies met)
   */
  private getAvailableTasks(): GenerationTask[] {
    return this.taskQueue.filter((task) => this.canExecuteTask(task));
  }

  /**
   * Check if a task can be executed (all dependencies completed)
   */
  private canExecuteTask(task: GenerationTask): boolean {
    if (!task.dependencies || task.dependencies.length === 0) {
      return true;
    }

    return task.dependencies.every((dep) => this.completedTasks.has(dep));
  }

  /**
   * Chunk tasks for parallel processing
   */
  private chunkTasks(
    tasks: GenerationTask[],
    chunkSize: number
  ): GenerationTask[][] {
    const chunks: GenerationTask[][] = [];
    for (let i = 0; i < tasks.length; i += chunkSize) {
      chunks.push(tasks.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * Create a worker thread for task execution
   */
  private async createWorker(
    tasks: GenerationTask[],
    workerId: number
  ): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const workerPath = path.join(__dirname, "worker.js");
      const worker = new Worker(workerPath, {
        workerData: { tasks, config: this.config, workerId },
      });

      this.workers.push(worker);

      worker.on("message", (result) => {
        resolve(result);
      });

      worker.on("error", (error) => {
        reject(error);
      });

      worker.on("exit", (code) => {
        if (code !== 0) {
          reject(new Error(`Worker ${workerId} exited with code ${code}`));
        }
      });
    });
  }

  /**
   * Execute a single task
   */
  private async executeTask(task: GenerationTask): Promise<any> {
    const startTime = performance.now();

    try {
      let result: any;

      switch (task.type) {
        case "schema":
          result = await this.executeSchemaTask(task);
          this.metrics.schemaExtractionTime += performance.now() - startTime;
          break;
        case "generator":
          result = await this.executeGeneratorTask(task);
          this.metrics.generationTime += performance.now() - startTime;
          break;
        case "write":
          result = await this.executeWriteTask(task);
          this.metrics.writeTime += performance.now() - startTime;
          break;
        default:
          throw new Error(`Unknown task type: ${task.type}`);
      }

      return result;
    } catch (error) {
      this.emit("taskError", { task, error });
      throw error;
    }
  }

  /**
   * Execute a schema extraction task
   */
  private async executeSchemaTask(task: GenerationTask): Promise<any> {
    // Implementation would depend on the actual schema extraction logic
    return task.data;
  }

  /**
   * Execute a generator task
   */
  private async executeGeneratorTask(task: GenerationTask): Promise<any> {
    // Implementation would depend on the actual generator logic
    this.metrics.filesGenerated++;
    return task.data;
  }

  /**
   * Execute a write task
   */
  private async executeWriteTask(task: GenerationTask): Promise<any> {
    // Implementation would depend on the actual write logic
    this.metrics.bytesGenerated += JSON.stringify(task.data).length;
    return task.data;
  }

  /**
   * Cleanup worker threads
   */
  private async cleanupWorkers(): Promise<void> {
    await Promise.all(this.workers.map((worker) => worker.terminate()));
    this.workers = [];
  }

  /**
   * Record cache hit
   */
  recordCacheHit(): void {
    this.metrics.cacheHits++;
  }

  /**
   * Record cache miss
   */
  recordCacheMiss(): void {
    this.metrics.cacheMisses++;
  }

  /**
   * Get optimization recommendations based on metrics
   */
  getOptimizationRecommendations(): string[] {
    const recommendations: string[] = [];

    if (
      this.metrics.cacheHits /
        (this.metrics.cacheHits + this.metrics.cacheMisses) <
      0.5
    ) {
      recommendations.push(
        "Consider tuning cache settings to improve hit rate"
      );
    }

    if (
      this.metrics.memoryUsage.heapUsed >
      this.options.memoryThreshold! * 0.8
    ) {
      recommendations.push(
        "High memory usage detected, consider reducing batch size"
      );
    }

    if (this.metrics.generationTime > this.metrics.totalTime * 0.7) {
      recommendations.push(
        "Generation time is high, consider enabling parallel processing"
      );
    }

    if (this.options.enableParallel && this.metrics.parallelTasks < 2) {
      recommendations.push(
        "Parallel processing is enabled but not being utilized effectively"
      );
    }

    return recommendations;
  }

  /**
   * Generate performance report
   */
  generateReport(): string {
    const report = [
      "=== Type-Sync Performance Report ===",
      `Total Time: ${this.metrics.totalTime.toFixed(2)}ms`,
      `Schema Extraction: ${this.metrics.schemaExtractionTime.toFixed(2)}ms`,
      `Generation: ${this.metrics.generationTime.toFixed(2)}ms`,
      `Write Operations: ${this.metrics.writeTime.toFixed(2)}ms`,
      `Cache Hit Rate: ${((this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses)) * 100).toFixed(1)}%`,
      `Files Generated: ${this.metrics.filesGenerated}`,
      `Bytes Generated: ${(this.metrics.bytesGenerated / 1024).toFixed(1)} KB`,
      `Memory Usage: ${(this.metrics.memoryUsage.heapUsed / 1024 / 1024).toFixed(1)} MB`,
      "",
      "=== Optimization Recommendations ===",
      ...this.getOptimizationRecommendations(),
    ];

    return report.join("\n");
  }
}

/**
 * Incremental generation tracker
 */
export class IncrementalTracker {
  private lastGeneration: Map<string, number> = new Map();
  private dependencies: Map<string, Set<string>> = new Map();

  /**
   * Check if a file needs regeneration
   */
  needsRegeneration(filePath: string, lastModified: number): boolean {
    const lastGen = this.lastGeneration.get(filePath);
    if (!lastGen) return true;

    return lastModified > lastGen;
  }

  /**
   * Mark file as generated
   */
  markGenerated(filePath: string, timestamp: number = Date.now()): void {
    this.lastGeneration.set(filePath, timestamp);
  }

  /**
   * Add dependency relationship
   */
  addDependency(file: string, dependency: string): void {
    if (!this.dependencies.has(file)) {
      this.dependencies.set(file, new Set());
    }
    this.dependencies.get(file)!.add(dependency);
  }

  /**
   * Get files that need regeneration due to dependency changes
   */
  getAffectedFiles(changedFile: string): string[] {
    const affected: string[] = [];

    for (const [file, deps] of this.dependencies.entries()) {
      if (deps.has(changedFile)) {
        affected.push(file);
      }
    }

    return affected;
  }

  /**
   * Clear tracking data
   */
  clear(): void {
    this.lastGeneration.clear();
    this.dependencies.clear();
  }
}

export default PerformanceOptimizer;
