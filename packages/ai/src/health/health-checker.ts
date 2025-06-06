// packages/ai/src/health/health-checker.ts
import { EventEmitter } from "events";
import { BaseAIProvider, ProviderStatus } from "../providers/base.js";
import { ProviderRegistry } from "../registry/provider-registry.js";

export interface HealthMetrics {
  responseTime: number;
  successRate: number;
  errorRate: number;
  totalRequests: number;
  lastSuccess?: Date;
  lastFailure?: Date;
  consecutiveFailures: number;
  uptime: number;
}

export interface HealthCheckOptions {
  timeout?: number;
  retries?: number;
  interval?: number;
  enableMetrics?: boolean;
  customChecks?: HealthCheck[];
}

export interface HealthCheck {
  name: string;
  description: string;
  check: (provider: BaseAIProvider) => Promise<HealthCheckResult>;
  critical?: boolean;
  timeout?: number;
}

export interface HealthCheckResult {
  passed: boolean;
  message?: string;
  metadata?: Record<string, any>;
  duration?: number;
}

export interface ProviderHealthReport {
  provider: string;
  status: "healthy" | "unhealthy" | "degraded" | "unknown";
  overall: HealthCheckResult;
  checks: Record<string, HealthCheckResult>;
  metrics: HealthMetrics;
  lastChecked: Date;
  nextCheck?: Date;
}

export interface SystemHealthReport {
  status: "healthy" | "unhealthy" | "degraded";
  providers: Record<string, ProviderHealthReport>;
  summary: {
    total: number;
    healthy: number;
    unhealthy: number;
    degraded: number;
    unknown: number;
  };
  generatedAt: Date;
}

export class HealthChecker extends EventEmitter {
  private registry: ProviderRegistry;
  private options: Required<HealthCheckOptions>;
  private metrics: Map<string, HealthMetrics> = new Map();
  private intervals: Map<string, NodeJS.Timeout> = new Map();
  private builtInChecks: HealthCheck[] = [];
  private customChecks: HealthCheck[] = [];

  constructor(registry: ProviderRegistry, options: HealthCheckOptions = {}) {
    super();
    this.registry = registry;
    this.options = {
      timeout: 5000,
      retries: 2,
      interval: 30000,
      enableMetrics: true,
      customChecks: [],
      ...options,
    };

    this.setupBuiltInChecks();
    this.setupRegistryEventHandlers();
  }

  // Health check management
  public startMonitoring(): void {
    const providers = this.registry.getAllProviders();

    for (const [name, provider] of providers) {
      this.startProviderMonitoring(name, provider);
    }

    this.emit("monitoring-started", {
      providers: Array.from(providers.keys()),
      interval: this.options.interval,
    });
  }

  public stopMonitoring(): void {
    for (const [name, interval] of this.intervals) {
      clearInterval(interval);
      this.intervals.delete(name);
    }

    this.emit("monitoring-stopped");
  }

  public startProviderMonitoring(name: string, provider: BaseAIProvider): void {
    // Stop existing monitoring if any
    this.stopProviderMonitoring(name);

    // Initialize metrics
    if (this.options.enableMetrics && !this.metrics.has(name)) {
      this.initializeMetrics(name);
    }

    // Start periodic health checks
    const interval = setInterval(async () => {
      try {
        await this.checkProviderHealth(name, provider);
      } catch (error) {
        this.emit("monitoring-error", { provider: name, error });
      }
    }, this.options.interval);

    this.intervals.set(name, interval);

    // Perform initial check
    setImmediate(() => this.checkProviderHealth(name, provider));
  }

  public stopProviderMonitoring(name: string): void {
    const interval = this.intervals.get(name);
    if (interval) {
      clearInterval(interval);
      this.intervals.delete(name);
    }
  }

  // Health checking
  public async checkProviderHealth(
    name: string,
    provider: BaseAIProvider
  ): Promise<ProviderHealthReport> {
    const startTime = Date.now();
    const allChecks = [
      ...this.builtInChecks,
      ...this.customChecks,
      ...this.options.customChecks,
    ];
    const checkResults: Record<string, HealthCheckResult> = {};
    let overallPassed = true;
    let criticalFailure = false;

    // Run all health checks
    for (const healthCheck of allChecks) {
      try {
        const result = await this.runHealthCheck(provider, healthCheck);
        checkResults[healthCheck.name] = result;

        if (!result.passed) {
          overallPassed = false;
          if (healthCheck.critical) {
            criticalFailure = true;
          }
        }
      } catch (error: any) {
        checkResults[healthCheck.name] = {
          passed: false,
          message: `Health check failed: ${error.message}`,
          duration: Date.now() - startTime,
        };
        overallPassed = false;
        if (healthCheck.critical) {
          criticalFailure = true;
        }
      }
    }

    // Determine overall status
    let status: ProviderHealthReport["status"];
    if (criticalFailure) {
      status = "unhealthy";
    } else if (!overallPassed) {
      status = "degraded";
    } else {
      status = "healthy";
    }

    // Update metrics
    const duration = Date.now() - startTime;
    if (this.options.enableMetrics) {
      this.updateMetrics(name, overallPassed, duration);
    }

    // Create health report
    const report: ProviderHealthReport = {
      provider: name,
      status,
      overall: {
        passed: overallPassed,
        message: this.generateOverallMessage(checkResults),
        duration,
      },
      checks: checkResults,
      metrics: this.metrics.get(name) || this.createEmptyMetrics(),
      lastChecked: new Date(),
      nextCheck: new Date(Date.now() + this.options.interval),
    };

    // Emit events
    this.emit("health-check-complete", report);

    if (status !== "healthy") {
      this.emit("provider-unhealthy", report);
    }

    return report;
  }

  public async checkAllProviders(): Promise<SystemHealthReport> {
    const providers = this.registry.getAllProviders();
    const reports: Record<string, ProviderHealthReport> = {};
    const summary = {
      total: 0,
      healthy: 0,
      unhealthy: 0,
      degraded: 0,
      unknown: 0,
    };

    // Check each provider
    for (const [name, provider] of providers) {
      try {
        const report = await this.checkProviderHealth(name, provider);
        reports[name] = report;
        summary.total++;
        summary[report.status]++;
      } catch (error: any) {
        // Create error report for failed checks
        reports[name] = {
          provider: name,
          status: "unknown",
          overall: { passed: false, message: error.message },
          checks: {},
          metrics: this.createEmptyMetrics(),
          lastChecked: new Date(),
        };
        summary.total++;
        summary.unknown++;
      }
    }

    // Determine overall system status
    let systemStatus: SystemHealthReport["status"];
    if (summary.unhealthy > 0 || summary.total === 0) {
      systemStatus = "unhealthy";
    } else if (summary.degraded > 0 || summary.unknown > 0) {
      systemStatus = "degraded";
    } else {
      systemStatus = "healthy";
    }

    const systemReport: SystemHealthReport = {
      status: systemStatus,
      providers: reports,
      summary,
      generatedAt: new Date(),
    };

    this.emit("system-health-check-complete", systemReport);
    return systemReport;
  }

  // Health check execution
  private async runHealthCheck(
    provider: BaseAIProvider,
    healthCheck: HealthCheck
  ): Promise<HealthCheckResult> {
    const timeout = healthCheck.timeout || this.options.timeout;
    const startTime = Date.now();

    try {
      const result = await this.withTimeout(
        healthCheck.check(provider),
        timeout,
        `Health check "${healthCheck.name}" timed out`
      );

      return {
        ...result,
        duration: Date.now() - startTime,
      };
    } catch (error: any) {
      return {
        passed: false,
        message: error.message,
        duration: Date.now() - startTime,
      };
    }
  }

  // Metrics management
  private initializeMetrics(providerName: string): void {
    this.metrics.set(providerName, {
      responseTime: 0,
      successRate: 100,
      errorRate: 0,
      totalRequests: 0,
      consecutiveFailures: 0,
      uptime: 100,
    });
  }

  private updateMetrics(
    providerName: string,
    success: boolean,
    duration: number
  ): void {
    const metrics = this.metrics.get(providerName);
    if (!metrics) return;

    metrics.totalRequests++;
    metrics.responseTime =
      (metrics.responseTime * (metrics.totalRequests - 1) + duration) /
      metrics.totalRequests;

    if (success) {
      metrics.lastSuccess = new Date();
      metrics.consecutiveFailures = 0;
    } else {
      metrics.lastFailure = new Date();
      metrics.consecutiveFailures++;
    }

    // Calculate success/error rates (last 100 requests or total if less)
    const totalForRate = Math.min(metrics.totalRequests, 100);
    const successCount = success ? 1 : 0;
    const errorCount = success ? 0 : 1;

    metrics.successRate =
      (metrics.successRate * (totalForRate - 1) + successCount * 100) /
      totalForRate;
    metrics.errorRate =
      (metrics.errorRate * (totalForRate - 1) + errorCount * 100) /
      totalForRate;

    // Update uptime based on consecutive failures
    if (metrics.consecutiveFailures === 0) {
      metrics.uptime = Math.min(100, metrics.uptime + 0.1);
    } else {
      metrics.uptime = Math.max(
        0,
        metrics.uptime - metrics.consecutiveFailures * 5
      );
    }
  }

  private createEmptyMetrics(): HealthMetrics {
    return {
      responseTime: 0,
      successRate: 0,
      errorRate: 0,
      totalRequests: 0,
      consecutiveFailures: 0,
      uptime: 0,
    };
  }

  // Built-in health checks
  private setupBuiltInChecks(): void {
    this.builtInChecks = [
      {
        name: "connectivity",
        description: "Basic connectivity check",
        critical: true,
        check: async (provider: BaseAIProvider) => {
          const health = await provider.healthCheck();
          return {
            passed: health.isHealthy,
            message:
              health.message ||
              (health.isHealthy ? "Connected" : "Connection failed"),
            metadata: {
              latency: health.latency,
              capabilities: health.capabilities,
            },
          };
        },
      },
      {
        name: "model-availability",
        description: "Check if configured models are available",
        critical: false,
        check: async (provider: BaseAIProvider) => {
          const models = await provider.listModels();
          const availableCount = models.length;

          return {
            passed: availableCount > 0,
            message: `${availableCount} models available`,
            metadata: {
              models: models.map((m) => m.name),
              count: availableCount,
            },
          };
        },
      },
      {
        name: "response-test",
        description: "Test basic response generation",
        critical: false,
        timeout: 10000,
        check: async (provider: BaseAIProvider) => {
          try {
            const models = await provider.listModels();
            if (models.length === 0) {
              return {
                passed: false,
                message: "No models available for testing",
              };
            }

            const testModel = models[0].name;
            const response = await provider.generate({
              messages: [{ role: "user", content: "Hello" }],
              model: testModel,
              options: { maxTokens: 10 },
            });

            return {
              passed: response.content.length > 0,
              message:
                response.content.length > 0
                  ? "Response generated successfully"
                  : "Empty response received",
              metadata: {
                model: testModel,
                responseLength: response.content.length,
                usage: response.usage,
              },
            };
          } catch (error: any) {
            return {
              passed: false,
              message: `Response test failed: ${error.message}`,
            };
          }
        },
      },
    ];
  }

  // Registry event handlers
  private setupRegistryEventHandlers(): void {
    this.registry.on("provider-added", ({ name, provider }) => {
      this.startProviderMonitoring(name, provider);
    });

    this.registry.on("provider-removed", ({ name }) => {
      this.stopProviderMonitoring(name);
      this.metrics.delete(name);
    });
  }

  // Utility methods
  private async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    errorMessage: string
  ): Promise<T> {
    const timeout = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs);
    });

    return Promise.race([promise, timeout]);
  }

  private generateOverallMessage(
    checkResults: Record<string, HealthCheckResult>
  ): string {
    const passed = Object.values(checkResults).filter((r) => r.passed).length;
    const total = Object.values(checkResults).length;

    if (passed === total) {
      return "All health checks passed";
    } else if (passed === 0) {
      return "All health checks failed";
    } else {
      return `${passed}/${total} health checks passed`;
    }
  }

  // Public API for custom checks
  public addCustomCheck(check: HealthCheck): void {
    this.customChecks.push(check);
    this.emit("custom-check-added", check);
  }

  public removeCustomCheck(name: string): boolean {
    const index = this.customChecks.findIndex((check) => check.name === name);
    if (index >= 0) {
      const removed = this.customChecks.splice(index, 1)[0];
      this.emit("custom-check-removed", removed);
      return true;
    }
    return false;
  }

  public getMetrics(providerName: string): HealthMetrics | undefined {
    return this.metrics.get(providerName);
  }

  public getAllMetrics(): Map<string, HealthMetrics> {
    return new Map(this.metrics);
  }

  public clearMetrics(providerName?: string): void {
    if (providerName) {
      this.metrics.delete(providerName);
    } else {
      this.metrics.clear();
    }
  }
}

// Utility functions for creating custom health checks
export function createConnectivityCheck(timeout?: number): HealthCheck {
  return {
    name: "custom-connectivity",
    description: "Custom connectivity check",
    critical: true,
    timeout,
    check: async (provider: BaseAIProvider) => {
      const health = await provider.healthCheck();
      return {
        passed: health.isHealthy,
        message: health.message || "Connectivity check",
      };
    },
  };
}

export function createModelLoadCheck(modelName: string): HealthCheck {
  return {
    name: `model-load-${modelName}`,
    description: `Check if model ${modelName} can be loaded`,
    critical: false,
    check: async (provider: BaseAIProvider) => {
      try {
        const loaded = await provider.loadModel(modelName);
        return {
          passed: loaded,
          message: loaded
            ? `Model ${modelName} loaded successfully`
            : `Failed to load model ${modelName}`,
        };
      } catch (error: any) {
        return {
          passed: false,
          message: `Model load error: ${error.message}`,
        };
      }
    },
  };
}
