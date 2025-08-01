/**
 * Performance monitoring and optimization for @farm-framework/type-sync
 * Tracks metrics, identifies bottlenecks, and provides optimization suggestions
 */

import { performance } from "perf_hooks";
import fs from "fs-extra";
import path from "path";

export interface PerformanceMetrics {
  // Timing metrics
  totalExecutionTime: number;
  extractionTime: number;
  generationTime: number;
  cacheTime: number;
  validationTime: number;
  fileIOTime: number;

  // Count metrics
  totalFiles: number;
  generatedFiles: number;
  cachedFiles: number;
  skippedFiles: number;
  errorCount: number;

  // Size metrics
  totalOutputSize: number;
  averageFileSize: number;
  largestFileSize: number;
  schemaSize: number;

  // Cache metrics
  cacheHitRate: number;
  cacheSize: number;
  cacheEntries: number;

  // Memory metrics
  peakMemoryUsage: number;
  averageMemoryUsage: number;
  memoryLeaks: boolean;

  // Generator-specific metrics
  generatorMetrics: Record<string, GeneratorMetrics>;

  // Timestamps
  startTime: number;
  endTime: number;
  timestamp: Date;
}

export interface GeneratorMetrics {
  name: string;
  executionTime: number;
  filesGenerated: number;
  outputSize: number;
  cacheHits: number;
  cacheMisses: number;
  errorCount: number;
  averageGenerationTime: number;
}

export interface PerformanceAlert {
  type: "warning" | "error" | "info";
  category: "performance" | "memory" | "cache" | "generation";
  message: string;
  suggestion: string;
  severity: number; // 1-10
  metrics: Record<string, number>;
}

export interface OptimizationSuggestion {
  category: "cache" | "parallelization" | "memory" | "generation" | "io";
  title: string;
  description: string;
  impact: "low" | "medium" | "high";
  effort: "low" | "medium" | "high";
  estimatedImprovement: string;
  implementation: string[];
}

/**
 * Performance monitor with real-time tracking and optimization suggestions
 */
export class PerformanceMonitor {
  private startTimes = new Map<string, number>();
  private memorySnapshots: number[] = [];
  private metrics: Partial<PerformanceMetrics> = {};
  private alerts: PerformanceAlert[] = [];
  private enabled: boolean = true;

  constructor(enabled: boolean = true) {
    this.enabled = enabled;
    this.reset();
  }

  /**
   * Start timing a specific operation
   */
  startTimer(operation: string): void {
    if (!this.enabled) return;
    this.startTimes.set(operation, performance.now());
  }

  /**
   * End timing and record the duration
   */
  endTimer(operation: string): number {
    if (!this.enabled) return 0;

    const startTime = this.startTimes.get(operation);
    if (!startTime) {
      console.warn(`Timer for operation '${operation}' was not started`);
      return 0;
    }

    const duration = performance.now() - startTime;
    this.recordTiming(operation, duration);
    this.startTimes.delete(operation);
    return duration;
  }

  /**
   * Record memory usage snapshot
   */
  recordMemoryUsage(): void {
    if (!this.enabled) return;

    const memUsage = process.memoryUsage();
    this.memorySnapshots.push(memUsage.heapUsed);

    // Keep only last 100 snapshots
    if (this.memorySnapshots.length > 100) {
      this.memorySnapshots.shift();
    }
  }

  /**
   * Record generator-specific metrics
   */
  recordGeneratorMetrics(
    generatorName: string,
    metrics: Partial<GeneratorMetrics>
  ): void {
    if (!this.enabled) return;

    if (!this.metrics.generatorMetrics) {
      this.metrics.generatorMetrics = {};
    }

    const existing = this.metrics.generatorMetrics[generatorName] || {
      name: generatorName,
      executionTime: 0,
      filesGenerated: 0,
      outputSize: 0,
      cacheHits: 0,
      cacheMisses: 0,
      errorCount: 0,
      averageGenerationTime: 0,
    };

    this.metrics.generatorMetrics[generatorName] = {
      ...existing,
      ...metrics,
    };
  }

  /**
   * Record file generation metrics
   */
  recordFileGeneration(
    filePath: string,
    size: number,
    generationTime: number,
    fromCache: boolean = false
  ): void {
    if (!this.enabled) return;

    this.metrics.totalFiles = (this.metrics.totalFiles || 0) + 1;
    this.metrics.totalOutputSize = (this.metrics.totalOutputSize || 0) + size;

    if (fromCache) {
      this.metrics.cachedFiles = (this.metrics.cachedFiles || 0) + 1;
    } else {
      this.metrics.generatedFiles = (this.metrics.generatedFiles || 0) + 1;
    }

    // Track largest file
    if (!this.metrics.largestFileSize || size > this.metrics.largestFileSize) {
      this.metrics.largestFileSize = size;
    }

    // Update average file size
    if (this.metrics.totalFiles > 0) {
      this.metrics.averageFileSize =
        this.metrics.totalOutputSize / this.metrics.totalFiles;
    }
  }

  /**
   * Finalize metrics and generate report
   */
  finalize(): PerformanceMetrics {
    if (!this.enabled) {
      return this.getEmptyMetrics();
    }

    this.metrics.endTime = performance.now();
    this.metrics.totalExecutionTime =
      this.metrics.endTime - (this.metrics.startTime || 0);

    // Calculate memory metrics
    if (this.memorySnapshots.length > 0) {
      this.metrics.peakMemoryUsage = Math.max(...this.memorySnapshots);
      this.metrics.averageMemoryUsage =
        this.memorySnapshots.reduce((a, b) => a + b, 0) /
        this.memorySnapshots.length;
      this.metrics.memoryLeaks = this.detectMemoryLeaks();
    }

    // Calculate cache hit rate
    if (this.metrics.totalFiles && this.metrics.cachedFiles) {
      this.metrics.cacheHitRate =
        this.metrics.cachedFiles / this.metrics.totalFiles;
    }

    // Generate performance alerts
    this.generateAlerts();

    this.metrics.timestamp = new Date();

    return this.metrics as PerformanceMetrics;
  }

  /**
   * Get optimization suggestions based on collected metrics
   */
  getOptimizationSuggestions(): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];
    const metrics = this.metrics;

    // Cache optimization suggestions
    if (metrics.cacheHitRate !== undefined && metrics.cacheHitRate < 0.5) {
      suggestions.push({
        category: "cache",
        title: "Improve Cache Hit Rate",
        description:
          "Your cache hit rate is low, indicating frequent cache misses.",
        impact: "high",
        effort: "medium",
        estimatedImprovement: "30-50% faster generation times",
        implementation: [
          "Increase cache timeout duration",
          "Enable compression to store more entries",
          "Review cache invalidation strategy",
          "Consider warming cache during CI/CD",
        ],
      });
    }

    // Memory optimization
    if (
      metrics.peakMemoryUsage &&
      metrics.peakMemoryUsage > 512 * 1024 * 1024
    ) {
      // 512MB
      suggestions.push({
        category: "memory",
        title: "Optimize Memory Usage",
        description: "High memory usage detected during generation.",
        impact: "medium",
        effort: "medium",
        estimatedImprovement: "20-30% memory reduction",
        implementation: [
          "Enable streaming generation for large schemas",
          "Process generators sequentially instead of parallel",
          "Implement memory-efficient caching",
          "Use worker threads for memory isolation",
        ],
      });
    }

    // Generation time optimization
    if (metrics.generationTime && metrics.generationTime > 10000) {
      // 10 seconds
      suggestions.push({
        category: "generation",
        title: "Reduce Generation Time",
        description: "Code generation is taking longer than expected.",
        impact: "high",
        effort: "low",
        estimatedImprovement: "40-60% faster generation",
        implementation: [
          "Enable parallel generator execution",
          "Use incremental generation for unchanged files",
          "Optimize TypeScript compilation settings",
          "Consider using template-based generation",
        ],
      });
    }

    // I/O optimization
    if (metrics.totalFiles && metrics.totalFiles > 100) {
      suggestions.push({
        category: "io",
        title: "Optimize File I/O",
        description: "Large number of files may benefit from I/O optimization.",
        impact: "medium",
        effort: "low",
        estimatedImprovement: "15-25% faster file operations",
        implementation: [
          "Use batch file writing operations",
          "Enable file compression for large outputs",
          "Optimize file watching patterns",
          "Consider generating fewer, larger files",
        ],
      });
    }

    // Parallelization suggestions
    if (metrics.generatorMetrics) {
      const generators = Object.values(metrics.generatorMetrics);
      const totalGeneratorTime = generators.reduce(
        (sum, g) => sum + g.executionTime,
        0
      );

      if (totalGeneratorTime > (metrics.generationTime || 0) * 0.8) {
        suggestions.push({
          category: "parallelization",
          title: "Increase Parallelization",
          description: "Generators are running mostly sequentially.",
          impact: "high",
          effort: "low",
          estimatedImprovement: "50-70% faster with parallel execution",
          implementation: [
            "Increase maxConcurrency setting",
            "Enable parallel generator execution",
            "Use worker threads for CPU-intensive tasks",
            "Optimize generator dependencies",
          ],
        });
      }
    }

    return suggestions;
  }

  /**
   * Export metrics to file for analysis
   */
  async exportMetrics(outputPath: string): Promise<void> {
    const metrics = this.finalize();
    const suggestions = this.getOptimizationSuggestions();

    const report = {
      metrics,
      alerts: this.alerts,
      suggestions,
      exportTime: new Date().toISOString(),
      version: "1.0.0",
    };

    await fs.ensureDir(path.dirname(outputPath));
    await fs.writeFile(outputPath, JSON.stringify(report, null, 2));
  }

  /**
   * Generate performance report summary
   */
  generateSummary(): string {
    const metrics = this.metrics;
    const suggestions = this.getOptimizationSuggestions();

    return `
📊 Type-Sync Performance Report

⏱️  Execution Time: ${Math.round(metrics.totalExecutionTime || 0)}ms
📁 Files Generated: ${metrics.generatedFiles || 0} (${metrics.cachedFiles || 0} from cache)
📦 Total Output Size: ${this.formatBytes(metrics.totalOutputSize || 0)}
🎯 Cache Hit Rate: ${Math.round((metrics.cacheHitRate || 0) * 100)}%
🧠 Peak Memory: ${this.formatBytes(metrics.peakMemoryUsage || 0)}

${this.alerts.length > 0 ? `⚠️  Performance Alerts: ${this.alerts.length}` : "✅ No performance issues detected"}

${
  suggestions.length > 0
    ? `💡 Optimization Suggestions: ${suggestions.length}
${suggestions
  .slice(0, 3)
  .map((s) => `   • ${s.title} (${s.impact} impact)`)
  .join("\n")}`
    : ""
}
`;
  }

  /**
   * Get current performance metrics
   */
  getMetrics(): PerformanceMetrics {
    return {
      totalExecutionTime: this.metrics.totalExecutionTime || 0,
      extractionTime: this.metrics.extractionTime || 0,
      generationTime: this.metrics.generationTime || 0,
      cacheTime: this.metrics.cacheTime || 0,
      validationTime: this.metrics.validationTime || 0,
      fileIOTime: this.metrics.fileIOTime || 0,
      totalFiles: this.metrics.totalFiles || 0,
      generatedFiles: this.metrics.generatedFiles || 0,
      cachedFiles: this.metrics.cachedFiles || 0,
      skippedFiles: this.metrics.skippedFiles || 0,
      errorCount: this.metrics.errorCount || 0,
      totalOutputSize: this.metrics.totalOutputSize || 0,
      averageFileSize: this.metrics.averageFileSize || 0,
      largestFileSize: this.metrics.largestFileSize || 0,
      schemaSize: this.metrics.schemaSize || 0,
      cacheHitRate: this.metrics.cacheHitRate || 0,
      cacheSize: this.metrics.cacheSize || 0,
      cacheEntries: this.metrics.cacheEntries || 0,
      peakMemoryUsage: this.metrics.peakMemoryUsage || 0,
      averageMemoryUsage: this.metrics.averageMemoryUsage || 0,
      memoryLeaks: this.metrics.memoryLeaks || false,
      generatorMetrics: this.metrics.generatorMetrics || {},
      startTime: this.metrics.startTime || 0,
      endTime: this.metrics.endTime || 0,
      timestamp: this.metrics.timestamp || new Date(),
    };
  }

  private reset(): void {
    this.metrics = {
      startTime: performance.now(),
      totalFiles: 0,
      generatedFiles: 0,
      cachedFiles: 0,
      skippedFiles: 0,
      errorCount: 0,
      totalOutputSize: 0,
      generatorMetrics: {},
    };
    this.alerts = [];
    this.memorySnapshots = [];
    this.startTimes.clear();
  }

  private recordTiming(operation: string, duration: number): void {
    switch (operation) {
      case "extraction":
        this.metrics.extractionTime = duration;
        break;
      case "generation":
        this.metrics.generationTime = duration;
        break;
      case "cache":
        this.metrics.cacheTime = duration;
        break;
      case "validation":
        this.metrics.validationTime = duration;
        break;
      case "fileio":
        this.metrics.fileIOTime = duration;
        break;
    }
  }

  private detectMemoryLeaks(): boolean {
    if (this.memorySnapshots.length < 10) return false;

    // Simple memory leak detection: if memory consistently increases
    const recentSnapshots = this.memorySnapshots.slice(-10);
    const increasing = recentSnapshots.every(
      (val, i) => i === 0 || val >= recentSnapshots[i - 1]
    );

    return increasing && recentSnapshots[9] > recentSnapshots[0] * 1.5;
  }

  private generateAlerts(): void {
    const metrics = this.metrics;

    // Performance alerts
    if (metrics.totalExecutionTime && metrics.totalExecutionTime > 30000) {
      this.alerts.push({
        type: "warning",
        category: "performance",
        message: "Generation time exceeds 30 seconds",
        suggestion: "Consider enabling parallel generation or caching",
        severity: 7,
        metrics: { executionTime: metrics.totalExecutionTime },
      });
    }

    // Memory alerts
    if (
      metrics.peakMemoryUsage &&
      metrics.peakMemoryUsage > 1024 * 1024 * 1024
    ) {
      // 1GB
      this.alerts.push({
        type: "warning",
        category: "memory",
        message: "High memory usage detected",
        suggestion: "Enable streaming generation or reduce concurrency",
        severity: 8,
        metrics: { peakMemory: metrics.peakMemoryUsage },
      });
    }

    // Cache alerts
    if (metrics.cacheHitRate !== undefined && metrics.cacheHitRate < 0.3) {
      this.alerts.push({
        type: "info",
        category: "cache",
        message: "Low cache hit rate",
        suggestion: "Review cache configuration and invalidation strategy",
        severity: 5,
        metrics: { cacheHitRate: metrics.cacheHitRate },
      });
    }

    // Error alerts
    if (metrics.errorCount && metrics.errorCount > 0) {
      this.alerts.push({
        type: "error",
        category: "generation",
        message: `${metrics.errorCount} errors occurred during generation`,
        suggestion: "Review error logs and fix schema issues",
        severity: 9,
        metrics: { errorCount: metrics.errorCount },
      });
    }
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return "0 B";

    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));

    return `${Math.round((bytes / Math.pow(1024, i)) * 100) / 100} ${sizes[i]}`;
  }

  private getEmptyMetrics(): PerformanceMetrics {
    return {
      totalExecutionTime: 0,
      extractionTime: 0,
      generationTime: 0,
      cacheTime: 0,
      validationTime: 0,
      fileIOTime: 0,
      totalFiles: 0,
      generatedFiles: 0,
      cachedFiles: 0,
      skippedFiles: 0,
      errorCount: 0,
      totalOutputSize: 0,
      averageFileSize: 0,
      largestFileSize: 0,
      schemaSize: 0,
      cacheHitRate: 0,
      cacheSize: 0,
      cacheEntries: 0,
      peakMemoryUsage: 0,
      averageMemoryUsage: 0,
      memoryLeaks: false,
      generatorMetrics: {},
      startTime: 0,
      endTime: 0,
      timestamp: new Date(),
    };
  }
}

// Export a default monitor instance
export const performanceMonitor = new PerformanceMonitor();
