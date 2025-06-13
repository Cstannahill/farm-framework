// packages/observability/src/providers/console.ts
import { ReadableSpan } from "@opentelemetry/sdk-trace-base";
import { ResourceMetrics } from "@opentelemetry/sdk-metrics";
import { ExportResult, ExportResultCode } from "@opentelemetry/core";
import chalk from "chalk";
import { BaseTelemetryProvider } from "./base.js";
import type { ProviderCapabilities, AIMetrics } from "@farm-framework/types";

interface ConsoleProviderOptions {
  pretty?: boolean;
  showTimestamps?: boolean;
  showCosts?: boolean;
  colors?: boolean;
  verbosity?: "minimal" | "normal" | "verbose";
  costThreshold?: number; // Highlight costs above this amount
}

export class ConsoleProvider extends BaseTelemetryProvider {
  private readonly consoleOptions: ConsoleProviderOptions;
  private costAccumulator: number = 0;
  private requestCount: number = 0;
  private errorCount: number = 0;

  constructor(options: ConsoleProviderOptions = {}) {
    super({
      name: "console",
      // Console provider doesn't need endpoint/apiKey
    });

    this.consoleOptions = {
      pretty: true,
      showTimestamps: true,
      showCosts: true,
      colors: process.stdout.isTTY,
      verbosity: "normal",
      costThreshold: 0.01,
      ...options,
    };

    // Start cost ticker if enabled
    if (this.consoleOptions.showCosts) {
      this.startCostTicker();
    }
  }

  protected defineCapabilities(): ProviderCapabilities {
    return {
      traces: true,
      metrics: true,
      logs: true,
      realtime: true,
      costTracking: true,
      dashboardUrl: false,
      alerts: false,
      export: false,
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
    try {
      if (Array.isArray(data)) {
        // Handle spans
        data.forEach((span) => this.logSpan(span));
      } else {
        // Handle metrics
        this.logMetrics(data);
      }
      resultCallback({ code: ExportResultCode.SUCCESS });
    } catch (error) {
      console.error("Failed to export data:", error);
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
      this.logMetrics(metrics);
      resultCallback({ code: ExportResultCode.SUCCESS });
    } catch (error) {
      console.error("Failed to export metrics:", error);
      resultCallback({
        code: ExportResultCode.FAILED,
        error: error instanceof Error ? error : new Error(String(error)),
      });
    }
  }

  private logSpan(span: ReadableSpan): void {
    const { name, spanContext, startTime, endTime, attributes, status } = span;
    const duration = endTime ? Number(endTime) - Number(startTime) : 0; // Convert hrtime to ms
    const durationMs = duration / 1_000_000; // Convert nanoseconds to milliseconds

    this.requestCount++;
    if (status?.code === 2) {
      // ERROR
      this.errorCount++;
    }

    // Extract cost information if available
    const cost = attributes?.["ai.cost.usd"] as number | undefined;
    if (cost) {
      this.costAccumulator += cost;
    }

    if (this.consoleOptions.verbosity === "minimal") {
      return;
    }

    const prefix = this.getSpanPrefix(span);
    const statusIcon = this.getStatusIcon(status?.code);
    const timestamp = this.consoleOptions.showTimestamps
      ? chalk.gray(`[${new Date().toISOString()}]`)
      : "";

    console.log(
      `${timestamp} ${statusIcon} ${prefix} ${chalk.bold(name)} ${chalk.gray(`(${durationMs.toFixed(2)}ms)`)}`
    );

    // Show important attributes
    if (this.consoleOptions.verbosity === "verbose") {
      const importantAttrs = this.filterImportantAttributes(attributes);
      if (Object.keys(importantAttrs).length > 0) {
        console.log(chalk.gray("  └─"), importantAttrs);
      }
    }

    // Highlight high costs
    if (cost && cost > this.consoleOptions.costThreshold!) {
      console.log(chalk.yellow(`  💰 Cost: $${cost.toFixed(4)}`));
    }
  }

  private logMetrics(metrics: ResourceMetrics): void {
    if (this.consoleOptions.verbosity === "minimal") {
      return;
    }

    const timestamp = this.consoleOptions.showTimestamps
      ? chalk.gray(`[${new Date().toISOString()}]`)
      : "";

    console.log(`${timestamp} 📊 ${chalk.blue("Metrics Update")}`);

    metrics.scopeMetrics.forEach((scopeMetric: any) => {
      scopeMetric.metrics.forEach((metric: any) => {
        const metricName = metric.descriptor.name;
        console.log(`  └─ ${chalk.yellow(metricName)}`);

        metric.dataPoints.forEach((dataPoint: any) => {
          const value = this.formatMetricValue(dataPoint);
          const labels = this.formatLabels(dataPoint.attributes || {});
          console.log(`    ${value} ${labels}`);
        });
      });
    });
  }

  private getSpanPrefix(span: ReadableSpan): string {
    const spanName = span.name.toLowerCase();

    if (spanName.includes("ai.") || spanName.includes("llm")) {
      return "🤖";
    } else if (spanName.includes("http")) {
      return "🌐";
    } else if (spanName.includes("db") || spanName.includes("database")) {
      return "🗄️";
    } else if (spanName.includes("cache")) {
      return "⚡";
    }

    return "📋";
  }

  private getStatusIcon(statusCode?: number): string {
    switch (statusCode) {
      case 1: // OK
        return chalk.green("✓");
      case 2: // ERROR
        return chalk.red("✗");
      default:
        return chalk.blue("•");
    }
  }

  private filterImportantAttributes(attributes: any): Record<string, any> {
    const important = {};
    const importantKeys = [
      "ai.provider",
      "ai.model",
      "ai.tokens.total",
      "ai.cost.usd",
      "http.method",
      "http.status_code",
      "http.url",
      "db.operation",
      "error.message",
    ];

    if (attributes) {
      for (const key of importantKeys) {
        if (attributes[key] !== undefined) {
          (important as any)[key] = attributes[key];
        }
      }
    }

    return important;
  }

  private formatMetricValue(dataPoint: any): string {
    if (dataPoint.value !== undefined) {
      return chalk.cyan(dataPoint.value.toString());
    } else if (dataPoint.sum !== undefined) {
      return chalk.cyan(dataPoint.sum.toString());
    } else if (dataPoint.count !== undefined) {
      return chalk.cyan(`count: ${dataPoint.count}`);
    }
    return chalk.gray("no value");
  }

  private formatLabels(attributes: Record<string, any>): string {
    const pairs = Object.entries(attributes).map(([k, v]) => `${k}=${v}`);
    return pairs.length > 0 ? chalk.gray(`{${pairs.join(", ")}}`) : "";
  }

  private startCostTicker(): void {
    setInterval(() => {
      if (this.costAccumulator > 0 || this.requestCount > 0) {
        const hourlyRate = (this.costAccumulator / Date.now()) * 1000 * 60 * 60;
        const errorRate = this.errorCount / Math.max(this.requestCount, 1);

        console.log(
          chalk.blue("💰 Cost Summary:"),
          chalk.cyan(`$${this.costAccumulator.toFixed(4)}`),
          chalk.gray(`(~$${hourlyRate.toFixed(2)}/hr)`),
          chalk.gray(`| Requests: ${this.requestCount}`),
          chalk.gray(`| Errors: ${(errorRate * 100).toFixed(1)}%`)
        );
      }
    }, 30000); // Every 30 seconds
  }

  async recordAIMetrics(metrics: AIMetrics): Promise<void> {
    this.costAccumulator += metrics.cost.amount;
    this.requestCount++;

    if (this.consoleOptions.verbosity !== "minimal") {
      const timestamp = this.consoleOptions.showTimestamps
        ? chalk.gray(`[${new Date().toISOString()}]`)
        : "";

      console.log(
        `${timestamp} 🤖 ${chalk.bold(metrics.provider)} ${chalk.gray("→")} ${metrics.model}`
      );
      console.log(
        `  └─ ${chalk.cyan(metrics.tokens.total + " tokens")} ${chalk.yellow("$" + metrics.cost.amount.toFixed(4))}`
      );
    }
  }

  async shutdown(): Promise<void> {
    // Console provider doesn't need cleanup
    return Promise.resolve();
  }

  forceFlush(): Promise<void> {
    // Console writes are synchronous
    return Promise.resolve();
  }

  // Abstract method implementations
  async sendTelemetry(data: any[]): Promise<void> {
    data.forEach((item) => {
      console.log(chalk.blue("📊 Telemetry:"), item);
    });
  }

  async sendCostData(data: any[]): Promise<void> {
    data.forEach((item) => {
      console.log(chalk.yellow("💰 Cost Data:"), item);
    });
  }

  getDashboardUrl(): string | null {
    return null; // Console provider doesn't have a dashboard
  }

  protected async performHealthCheck(): Promise<boolean> {
    return true; // Console provider is always healthy
  }

  protected formatTelemetryData(data: any[]): any {
    return data; // Console provider uses data as-is
  }
}
