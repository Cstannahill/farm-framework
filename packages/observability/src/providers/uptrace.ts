import { ReadableSpan } from "@opentelemetry/sdk-trace-base";
import { ResourceMetrics } from "@opentelemetry/sdk-metrics";
import { ExportResult, ExportResultCode } from "@opentelemetry/core";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import { BaseTelemetryProvider } from "./base";
import type {
  TelemetryData,
  MetricData,
  ProviderCapabilities,
} from "@farm-framework/types";

interface UptraceConfig {
  dsn: string;
  serviceName?: string;
  deploymentEnvironment?: string;
  resourceAttributes?: Record<string, string>;
}

export class UptraceProvider extends BaseTelemetryProvider {
  private traceExporter: OTLPTraceExporter;
  private metricExporter: OTLPMetricExporter;
  private projectId: string;
  private baseUrl: string;

  constructor(config: UptraceConfig) {
    const { endpoint, headers, projectId } = UptraceProvider.parseDSN(
      config.dsn
    );

    super({
      name: "uptrace",
      endpoint,
      headers,
    });

    this.projectId = projectId;
    this.baseUrl = endpoint.replace("/otlp", "");

    // Initialize OTLP exporters
    this.traceExporter = new OTLPTraceExporter({
      url: `${endpoint}/v1/traces`,
      headers: this.options.headers,
      timeoutMillis: this.options.timeout,
    });

    this.metricExporter = new OTLPMetricExporter({
      url: `${endpoint}/v1/metrics`,
      headers: this.options.headers,
      timeoutMillis: this.options.timeout,
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
      alerts: true,
      export: true,
    };
  }

  private static parseDSN(dsn: string): {
    endpoint: string;
    headers: Record<string, string>;
    projectId: string;
  } {
    const url = new URL(dsn);
    const token = url.username || "";
    const projectId = url.pathname.slice(1);

    return {
      endpoint: `${url.protocol}//${url.host}/otlp`,
      headers: {
        "uptrace-dsn": dsn,
        Authorization: `Bearer ${token}`,
      },
      projectId,
    };
  }

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
    if (Array.isArray(data)) {
      this.traceExporter.export(data, resultCallback);
    } else {
      this.metricExporter.export(data, resultCallback);
    }
  }

  exportMetrics(
    metrics: ResourceMetrics,
    resultCallback: (result: ExportResult) => void
  ): void {
    this.metricExporter.export(metrics, resultCallback);
  }

  async sendTelemetry(data: TelemetryData[]): Promise<void> {
    const formatted = this.formatTelemetryData(data);

    await this.retryWithBackoff(async () => {
      const response = await this.sendHttpRequest("/v1/events", {
        resourceSpans: [
          {
            resource: {
              attributes: this.createResourceAttributes(),
            },
            scopeSpans: formatted,
          },
        ],
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Uptrace API error: ${text}`);
      }
    }, "sendTelemetry");
  }

  async sendCostData(data: MetricData[]): Promise<void> {
    // Convert cost metrics to OTLP format
    const metrics = data.map((metric) => ({
      name: `farm.ai.${metric.name}`,
      unit: metric.name.includes("cost") ? "USD" : metric.unit || "1",
      data: {
        dataPoints: [
          {
            timeUnixNano: metric.timestamp! * 1000000,
            value: metric.value,
            attributes: this.formatAttributes(metric.labels || {}),
          },
        ],
      },
    }));

    await this.retryWithBackoff(async () => {
      const response = await this.sendHttpRequest("/v1/metrics", {
        resourceMetrics: [
          {
            resource: {
              attributes: this.createResourceAttributes(),
            },
            scopeMetrics: [
              {
                scope: {
                  name: "farm.observability",
                  version: "1.0.0",
                },
                metrics,
              },
            ],
          },
        ],
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Uptrace metrics error: ${text}`);
      }
    }, "sendCostData");
  }

  getDashboardUrl(): string | null {
    return `${this.baseUrl}/projects/${this.projectId}`;
  }

  protected async performHealthCheck(): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/v1/projects/${this.projectId}`,
        {
          headers: this.options.headers!,
          signal: AbortSignal.timeout(5000),
        }
      );

      return response.ok;
    } catch {
      return false;
    }
  }

  protected formatTelemetryData(data: TelemetryData[]): any {
    return data.map((item) => {
      const span: any = {
        traceId: item.traceId || this.generateTraceId(),
        spanId: item.spanId || this.generateSpanId(),
        name: item.name,
        startTimeUnixNano: (item.timestamp! - (item.duration || 0)) * 1000000,
        endTimeUnixNano: item.timestamp! * 1000000,
        attributes: this.formatAttributes(item.attributes || {}),
      };

      // Add status if error
      if (item.error) {
        span.status = {
          code: 2, // ERROR
          message: item.error,
        };
      }

      return span;
    });
  }

  private formatAttributes(
    attributes: Record<string, any>
  ): Array<{ key: string; value: any }> {
    return Object.entries(attributes).map(([key, value]) => ({
      key,
      value: {
        stringValue: String(value),
      },
    }));
  }

  private createResourceAttributes(): Array<{ key: string; value: any }> {
    return [
      { key: "service.name", value: { stringValue: this.options.name } },
      {
        key: "deployment.environment",
        value: { stringValue: process.env.NODE_ENV || "development" },
      },
      { key: "farm.version", value: { stringValue: "1.0.0" } },
    ];
  }

  private generateTraceId(): string {
    // Generate 128-bit trace ID (32 hex chars)
    return Array.from({ length: 32 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join("");
  }

  private generateSpanId(): string {
    // Generate 64-bit span ID (16 hex chars)
    return Array.from({ length: 16 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join("");
  }

  async shutdown(): Promise<void> {
    await Promise.all([
      this.traceExporter.shutdown(),
      this.metricExporter.shutdown(),
    ]);
  }

  // Uptrace-specific features
  async createAlert(alert: {
    name: string;
    condition: string;
    threshold: number;
    channels: string[];
  }): Promise<void> {
    await this.sendHttpRequest(
      `/api/v1/projects/${this.projectId}/alerts`,
      alert
    );
  }

  async queryMetrics(query: {
    metric: string;
    timeRange: { start: Date; end: Date };
    groupBy?: string[];
  }): Promise<any> {
    const params = new URLSearchParams({
      metric: query.metric,
      start: query.timeRange.start.toISOString(),
      end: query.timeRange.end.toISOString(),
      ...(query.groupBy && { groupBy: query.groupBy.join(",") }),
    });

    const response = await fetch(
      `${this.baseUrl}/api/v1/projects/${this.projectId}/metrics/query?${params}`,
      { headers: this.options.headers }
    );

    if (!response.ok) {
      throw new Error(`Failed to query metrics: ${response.statusText}`);
    }

    return response.json();
  }
}
