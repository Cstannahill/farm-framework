import { SpanExporter, ReadableSpan } from "@opentelemetry/sdk-trace-base";
import {
  PushMetricExporter,
  ResourceMetrics,
} from "@opentelemetry/sdk-metrics";
import { ExportResult, ExportResultCode } from "@opentelemetry/core";
import type {
  ObservabilityConfig,
  TelemetryData,
  MetricData,
  ProviderCapabilities,
  ProviderHealth,
} from "@farm-framework/types";

export interface ProviderOptions {
  name: string;
  endpoint?: string;
  apiKey?: string;
  headers?: Record<string, string>;
  timeout?: number;
  retryConfig?: {
    maxRetries: number;
    backoffMultiplier: number;
    maxBackoffMs: number;
  };
  batchConfig?: {
    maxBatchSize: number;
    maxQueueSize: number;
    scheduledDelayMs: number;
  };
}

export abstract class BaseTelemetryProvider
  implements SpanExporter, PushMetricExporter
{
  protected readonly name: string;
  protected readonly options: Required<ProviderOptions>;
  protected isHealthy: boolean = true;
  protected lastHealthCheck: Date = new Date();
  protected capabilities: ProviderCapabilities;

  constructor(options: ProviderOptions) {
    this.name = options.name;
    this.options = {
      name: options.name,
      endpoint: options.endpoint || "",
      apiKey: options.apiKey || "",
      headers: options.headers || {},
      timeout: options.timeout || 30000,
      retryConfig: {
        maxRetries: 3,
        backoffMultiplier: 2,
        maxBackoffMs: 30000,
        ...options.retryConfig,
      },
      batchConfig: {
        maxBatchSize: 100,
        maxQueueSize: 2048,
        scheduledDelayMs: 5000,
        ...options.batchConfig,
      },
    };

    this.capabilities = this.defineCapabilities();
  }

  /**
   * Define provider capabilities
   */
  protected abstract defineCapabilities(): ProviderCapabilities;

  /**
   * Export spans to the provider (SpanExporter interface)
   */
  abstract export(
    spans: ReadableSpan[],
    resultCallback: (result: ExportResult) => void
  ): void;

  /**
   * Export metrics to the provider (PushMetricExporter interface)
   */
  abstract export(
    metrics: ResourceMetrics,
    resultCallback: (result: ExportResult) => void
  ): void;

  /**
   * Export metrics to the provider (helper method)
   */
  abstract exportMetrics(
    metrics: ResourceMetrics,
    resultCallback: (result: ExportResult) => void
  ): void;

  /**
   * Send custom telemetry data
   */
  abstract sendTelemetry(data: TelemetryData[]): Promise<void>;

  /**
   * Send cost data to provider
   */
  abstract sendCostData(data: MetricData[]): Promise<void>;

  /**
   * Get provider-specific dashboard URL
   */
  abstract getDashboardUrl(): string | null;

  /**
   * Perform health check
   */

  // export interface ProviderHealth {
  //   status: "healthy" | "degraded" | "unhealthy";
  //   providerName: string;
  //   lastCheck: string;
  //   latency?: number;
  //   errorRate?: number;
  //   message?: string;
  // }
  async checkHealth(): Promise<ProviderHealth> {
    try {
      const startTime = Date.now();
      const isHealthy = await this.performHealthCheck();
      const latency = Date.now() - startTime;

      this.isHealthy = isHealthy;
      this.lastHealthCheck = new Date();

      return {
        status: isHealthy ? "healthy" : "unhealthy",
        lastCheck: this.lastHealthCheck,
        latency,
        capabilities: this.capabilities,
      };
    } catch (error) {
      this.isHealthy = false;
      return {
        status: "unhealthy",
        lastCheck: new Date(),
        error: error instanceof Error ? error.message : "Unknown error",
        capabilities: this.capabilities,
      };
    }
  }

  /**
   * Provider-specific health check implementation
   */
  protected abstract performHealthCheck(): Promise<boolean>;

  /**
   * Shutdown the provider
   */
  async shutdown(): Promise<void> {
    // Base implementation - can be overridden
    return Promise.resolve();
  }

  /**
   * Force flush any pending data
   */
  async forceFlush(): Promise<void> {
    // Base implementation - can be overridden
    return Promise.resolve();
  }

  /**
   * Helper method for retrying failed requests
   */
  protected async retryWithBackoff<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    let lastError: Error;
    let backoffMs = 1000;

    for (
      let attempt = 0;
      attempt <= this.options.retryConfig.maxRetries;
      attempt++
    ) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt === this.options.retryConfig.maxRetries) {
          throw new Error(
            `${operationName} failed after ${attempt + 1} attempts: ${lastError.message}`
          );
        }

        // Calculate backoff
        await this.sleep(backoffMs);
        backoffMs = Math.min(
          backoffMs * this.options.retryConfig.backoffMultiplier,
          this.options.retryConfig.maxBackoffMs
        );
      }
    }

    throw lastError!;
  }

  /**
   * Sleep helper for backoff
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Format telemetry data for the specific provider
   */
  protected abstract formatTelemetryData(data: TelemetryData[]): any;

  /**
   * Common HTTP request helper
   */
  protected async sendHttpRequest(
    path: string,
    data: any,
    method: "POST" | "PUT" = "POST"
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      this.options.timeout
    );

    try {
      const response = await fetch(`${this.options.endpoint}${path}`, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...this.options.headers,
          ...(this.options.apiKey && {
            Authorization: `Bearer ${this.options.apiKey}`,
          }),
        },
        body: JSON.stringify(data),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return response;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Get provider name
   */
  getName(): string {
    return this.name;
  }

  /**
   * Get provider capabilities
   */
  getCapabilities(): ProviderCapabilities {
    return this.capabilities;
  }

  /**
   * Check if provider is healthy
   */
  getIsHealthy(): boolean {
    return this.isHealthy;
  }
}
