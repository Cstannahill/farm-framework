// packages/observability/src/providers/custom.ts
import { ReadableSpan } from "@opentelemetry/sdk-trace-base";
import { ResourceMetrics } from "@opentelemetry/sdk-metrics";
import { ExportResult, ExportResultCode } from "@opentelemetry/core";
import { BaseTelemetryProvider } from "./base.js";
import type {
  ProviderCapabilities,
  TelemetryData,
  MetricData,
  CustomTelemetryProviderConfig,
} from "@farm-framework/types";

export class CustomProvider extends BaseTelemetryProvider {
  private pendingSpans: ReadableSpan[] = [];
  private pendingMetrics: ResourceMetrics[] = [];

  constructor(config: CustomTelemetryProviderConfig) {
    super({
      name: config.name,
      endpoint: config.endpoint,
      apiKey: config.apiKey,
      headers: config.headers,
      timeout: config.timeout,
    });
  }

  protected defineCapabilities(): ProviderCapabilities {
    return {
      traces: true,
      metrics: true,
      logs: true,
      realtime: true,
      costTracking: true,
      dashboardUrl: true,
      alerts: false,
      export: true,
    };
  }

  // Export method overloads to handle both spans and metrics
  export(
    spans: ReadableSpan[],
    resultCallback: (result: ExportResult) => void
  ): void;
  export(
    metrics: ResourceMetrics,
    resultCallback: (result: ExportResult) => void
  ): void;
  export(
    data: ReadableSpan[] | ResourceMetrics,
    resultCallback: (result: ExportResult) => void
  ): void {
    try {
      if (Array.isArray(data)) {
        // Handle spans
        this.pendingSpans.push(...data);
        this.flushSpans()
          .then(() => resultCallback({ code: ExportResultCode.SUCCESS }))
          .catch((error) =>
            resultCallback({
              code: ExportResultCode.FAILED,
              error: error instanceof Error ? error : new Error(String(error)),
            })
          );
      } else {
        // Handle metrics
        this.exportMetrics(data, resultCallback);
      }
    } catch (error) {
      resultCallback({
        code: ExportResultCode.FAILED,
        error: error instanceof Error ? error : new Error(String(error)),
      });
    }
  }

  exportMetrics(
    metrics: ResourceMetrics,
    resultCallback: (result: ExportResult) => void
  ): void {
    try {
      this.pendingMetrics.push(metrics);
      this.flushMetrics()
        .then(() => resultCallback({ code: ExportResultCode.SUCCESS }))
        .catch((error) =>
          resultCallback({
            code: ExportResultCode.FAILED,
            error: error instanceof Error ? error : new Error(String(error)),
          })
        );
    } catch (error) {
      resultCallback({
        code: ExportResultCode.FAILED,
        error: error instanceof Error ? error : new Error(String(error)),
      });
    }
  }

  async sendTelemetry(data: TelemetryData[]): Promise<void> {
    const formatted = this.formatTelemetryData(data);
    await this.sendHttpRequest("/telemetry", {
      events: formatted,
      timestamp: new Date().toISOString(),
      source: "farm-framework",
    });
  }

  async sendCostData(data: MetricData[]): Promise<void> {
    const costEvents = data.map((item) => ({
      timestamp: item.timestamp,
      name: item.name,
      value: item.value,
      type: item.type,
      currency: "USD",
      labels: item.labels || {},
    }));

    await this.sendHttpRequest("/cost", {
      events: costEvents,
      timestamp: new Date().toISOString(),
    });
  }

  getDashboardUrl(): string | null {
    if (!this.options.endpoint) {
      return null;
    }
    return `${this.options.endpoint}/dashboard?source=farm-framework`;
  }

  protected async performHealthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.options.endpoint}/health`, {
        method: "GET",
        headers: {
          ...this.options.headers,
          ...(this.options.apiKey && {
            Authorization: `Bearer ${this.options.apiKey}`,
          }),
        },
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  protected formatTelemetryData(data: TelemetryData[]): any {
    return data.map((item) => ({
      id: this.generateId(),
      timestamp: item.timestamp,
      name: item.name,
      operationType: item.operationType,
      attributes: item.attributes,
      status: item.error ? "error" : "success",
      error: item.error,
      duration: item.duration,
      traceId: item.traceId,
      spanId: item.spanId,
    }));
  }

  private async flushSpans(): Promise<void> {
    if (this.pendingSpans.length === 0) return;

    const spans = [...this.pendingSpans];
    this.pendingSpans = [];

    const formattedSpans = spans.map((span) => ({
      traceId: span.spanContext().traceId,
      spanId: span.spanContext().spanId,
      name: span.name,
      startTime: Number(span.startTime),
      endTime: Number(span.endTime),
      attributes: span.attributes,
      events: span.events,
    }));

    await this.sendHttpRequest("/spans", {
      spans: formattedSpans,
      timestamp: new Date().toISOString(),
    });
  }

  private async flushMetrics(): Promise<void> {
    if (this.pendingMetrics.length === 0) return;

    const metrics = [...this.pendingMetrics];
    this.pendingMetrics = [];

    const formattedMetrics = metrics.flatMap((resourceMetric) =>
      resourceMetric.scopeMetrics.flatMap((scopeMetric: any) =>
        scopeMetric.metrics.map((metric: any) => ({
          name: metric.descriptor.name,
          value: metric.dataPoints[0]?.value || 0,
          timestamp: new Date().toISOString(),
          labels: metric.dataPoints[0]?.attributes || {},
        }))
      )
    );

    await this.sendHttpRequest("/metrics", {
      metrics: formattedMetrics,
      timestamp: new Date().toISOString(),
    });
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  async shutdown(): Promise<void> {
    await Promise.all([this.flushSpans(), this.flushMetrics()]);
    await super.shutdown();
  }

  async forceFlush(): Promise<void> {
    await Promise.all([this.flushSpans(), this.flushMetrics()]);
    await super.forceFlush();
  }
}
