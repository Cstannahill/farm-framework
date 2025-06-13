import { ExportResult, ExportResultCode } from "@opentelemetry/core";
import { ReadableSpan, SpanExporter } from "@opentelemetry/sdk-trace-base";
import {
  ResourceMetrics,
  PushMetricExporter,
} from "@opentelemetry/sdk-metrics";
import chalk from "chalk";

/**
 * Console Span Exporter - outputs traces to console
 */
export class ConsoleSpanExporter implements SpanExporter {
  private _prettify: boolean;

  constructor(options: { prettify?: boolean } = {}) {
    this._prettify = options.prettify ?? true;
  }

  export(
    spans: ReadableSpan[],
    resultCallback: (result: ExportResult) => void
  ): void {
    if (this._prettify) {
      this._exportPretty(spans);
    } else {
      this._exportRaw(spans);
    }

    resultCallback({ code: ExportResultCode.SUCCESS });
  }

  async shutdown(): Promise<void> {
    // No cleanup needed for console exporter
  }

  async forceFlush(): Promise<void> {
    // No buffering, so nothing to flush
  }

  private _exportPretty(spans: ReadableSpan[]): void {
    for (const span of spans) {
      console.log(chalk.cyan("📊 TRACE:"), {
        traceId: span.spanContext().traceId,
        spanId: span.spanContext().spanId,
        name: chalk.yellow(span.name),
        duration: chalk.green(
          `${(span.endTime[0] - span.startTime[0]) * 1000 + (span.endTime[1] - span.startTime[1]) / 1000000}ms`
        ),
        status: span.status,
        attributes: span.attributes,
        events: span.events,
        links: span.links,
      });
    }
  }

  private _exportRaw(spans: ReadableSpan[]): void {
    console.log(JSON.stringify(spans, null, 2));
  }
}

/**
 * Console Metric Exporter - outputs metrics to console
 */
export class ConsoleMetricExporter implements PushMetricExporter {
  private _prettify: boolean;

  constructor(options: { prettify?: boolean } = {}) {
    this._prettify = options.prettify ?? true;
  }

  async export(
    metrics: ResourceMetrics,
    resultCallback: (result: ExportResult) => void
  ): Promise<void> {
    if (this._prettify) {
      this._exportPretty(metrics);
    } else {
      this._exportRaw(metrics);
    }

    resultCallback({ code: ExportResultCode.SUCCESS });
  }

  async shutdown(): Promise<void> {
    // No cleanup needed for console exporter
  }

  async forceFlush(): Promise<void> {
    // No buffering, so nothing to flush
  }

  private _exportPretty(metrics: ResourceMetrics): void {
    console.log(chalk.blue("📈 METRICS:"));

    for (const scopeMetrics of metrics.scopeMetrics) {
      console.log(
        chalk.magenta(
          `  Scope: ${scopeMetrics.scope.name} v${scopeMetrics.scope.version}`
        )
      );

      for (const metric of scopeMetrics.metrics) {
        console.log(chalk.yellow(`    ${metric.descriptor.name}:`), {
          description: metric.descriptor.description,
          unit: metric.descriptor.unit,
          dataPoints: metric.dataPoints.length,
        });

        for (const dataPoint of metric.dataPoints) {
          console.log(chalk.green(`      Value: ${dataPoint.value}`), {
            attributes: dataPoint.attributes,
            startTime: this._convertHrTimeToDate(dataPoint.startTime),
            endTime: this._convertHrTimeToDate(dataPoint.endTime),
          });
        }
      }
    }
  }

  private _exportRaw(metrics: ResourceMetrics): void {
    console.log(JSON.stringify(metrics, null, 2));
  }

  private _convertHrTimeToDate(hrTime: [number, number]): Date {
    // Convert HrTime [seconds, nanoseconds] to milliseconds
    const milliseconds = hrTime[0] * 1000 + hrTime[1] / 1000000;
    return new Date(milliseconds);
  }
}
