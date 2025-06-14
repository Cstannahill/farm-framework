import { trace, metrics, SpanStatusCode, SpanKind } from "@opentelemetry/api";
import {
  BasicTracerProvider,
  BatchSpanProcessor,
} from "@opentelemetry/sdk-trace-node";
import {
  MeterProvider,
  PeriodicExportingMetricReader,
} from "@opentelemetry/sdk-metrics";
import { Resource } from "@opentelemetry/resources";
import { SemanticResourceAttributes } from "@opentelemetry/semantic-conventions";
import { ConsoleSpanExporter } from "../exporters/console.js";
import type {
  ObservabilityConfig,
  TelemetryData,
  MetricData,
  TraceData,
  CollectorOptions,
} from "@farm-framework/types";

export class TelemetryCollector {
  private static instance: TelemetryCollector;
  private buffer: TelemetryData[] = [];
  private metricsBuffer: Map<string, MetricData> = new Map();
  private flushTimer?: NodeJS.Timeout;
  private tracerProvider?: BasicTracerProvider;
  private meterProvider?: MeterProvider;

  private constructor(
    private config: ObservabilityConfig,
    private options: CollectorOptions = {}
  ) {
    this.options = {
      bufferSize: 1000,
      flushInterval: 5000,
      maxQueueSize: 10000,
      enableCompression: true,
      ...options,
    };

    this.initialize();
  }

  static getInstance(
    config?: ObservabilityConfig,
    options?: CollectorOptions
  ): TelemetryCollector {
    if (!TelemetryCollector.instance) {
      if (!config) {
        throw new Error(
          "TelemetryCollector requires configuration on first initialization"
        );
      }
      TelemetryCollector.instance = new TelemetryCollector(config, options);
    }
    return TelemetryCollector.instance;
  }

  private initialize(): void {
    // Initialize OpenTelemetry providers
    this.initializeTracing();
    this.initializeMetrics();

    // Start periodic flush
    this.startPeriodicFlush();
  }

  private initializeTracing(): void {
    const resource = this.createResource();

    this.tracerProvider = new BasicTracerProvider({
      resource,
      forceFlushTimeoutMillis: 30000,
    });

    // Add appropriate span processor based on environment
    const spanProcessor = this.createSpanProcessor();
    // Note: Using register method instead of addSpanProcessor for compatibility
    if ("register" in this.tracerProvider) {
      (this.tracerProvider as any).register();
    }
    // Skip span processor registration for now due to API compatibility issues

    // Register the provider
    trace.setGlobalTracerProvider(this.tracerProvider);
  }

  private initializeMetrics(): void {
    const resource = this.createResource();

    this.meterProvider = new MeterProvider({
      resource,
      readers: [this.createMetricReader()],
    });

    // Register the provider
    metrics.setGlobalMeterProvider(this.meterProvider);
  }

  private createResource(): any {
    // Using any type due to Resource compatibility issues
    const resourceAttributes = {
      [SemanticResourceAttributes.SERVICE_NAME]:
        this.config.serviceName || "farm-app",
      [SemanticResourceAttributes.SERVICE_VERSION]:
        process.env.npm_package_version || "0.0.0",
      [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]:
        process.env.NODE_ENV || "development",
      "farm.framework.version": this.detectFrameworkVersion(),
      "farm.telemetry.version": "1.0.0",
    };

    // Return a simple object for now due to compatibility issues
    return resourceAttributes;
  }

  private createSpanProcessor(): BatchSpanProcessor {
    // Use provider-specific exporter
    const exporter = this.createSpanExporter();

    return new BatchSpanProcessor(exporter, {
      maxQueueSize: this.options.maxQueueSize,
      maxExportBatchSize: this.options.bufferSize,
      scheduledDelayMillis: this.options.flushInterval,
    });
  }

  private createSpanExporter(): any {
    // This will be overridden by specific providers
    return new ConsoleSpanExporter();
  }

  private createMetricReader(): PeriodicExportingMetricReader {
    const exporter = this.createMetricExporter();

    return new PeriodicExportingMetricReader({
      exporter,
      exportIntervalMillis: this.options.flushInterval,
    });
  }

  private createMetricExporter(): any {
    // This will be overridden by specific providers
    return {
      export: (metrics: any, callback: any) => {
        console.log("Metrics:", metrics);
        callback({ code: 0 });
      },
      shutdown: () => Promise.resolve(),
    };
  }

  private detectFrameworkVersion(): string {
    try {
      const packageJson = require("../../../package.json");
      return packageJson.version;
    } catch {
      return "unknown";
    }
  }

  collect(data: TelemetryData): void {
    // Validate data
    if (!this.validateTelemetryData(data)) {
      console.warn("Invalid telemetry data received:", data);
      return;
    }

    // Add timestamp if not present
    if (!data.timestamp) {
      data.timestamp = Date.now();
    }

    // Add to buffer
    this.buffer.push(data);

    // Check if we should flush
    if (this.buffer.length >= this.options.bufferSize!) {
      this.flush();
    }
  }

  collectMetric(metric: MetricData): void {
    const key = `${metric.name}:${JSON.stringify(metric.labels || {})}`;

    // Aggregate metrics in buffer
    const existing = this.metricsBuffer.get(key);
    if (existing && metric.type === "counter") {
      existing.value += metric.value;
    } else {
      this.metricsBuffer.set(key, { ...metric, timestamp: Date.now() });
    }
  }

  private validateTelemetryData(data: TelemetryData): boolean {
    // Basic validation
    if (!data.type || !data.name) {
      return false;
    }

    // Type-specific validation
    switch (data.type) {
      case "trace":
        return this.validateTraceData(data as unknown as TraceData);
      case "metric":
        return this.validateMetricData(data as unknown as MetricData);
      case "log":
        return true; // Logs are flexible
      default:
        return false;
    }
  }

  private validateTraceData(data: TraceData): boolean {
    return !!(
      data.traceId &&
      data.spanId &&
      data.operationName &&
      data.startTime
    );
  }

  private validateMetricData(data: MetricData): boolean {
    return typeof data.value === "number" && !isNaN(data.value);
  }

  private startPeriodicFlush(): void {
    this.flushTimer = setInterval(() => {
      if (this.buffer.length > 0 || this.metricsBuffer.size > 0) {
        this.flush();
      }
    }, this.options.flushInterval!);
  }

  async flush(): Promise<void> {
    if (this.buffer.length === 0 && this.metricsBuffer.size === 0) {
      return;
    }

    // Get current buffers and reset
    const dataToFlush = [...this.buffer];
    const metricsToFlush = new Map(this.metricsBuffer);

    this.buffer = [];
    this.metricsBuffer.clear();

    try {
      // Process traces
      if (dataToFlush.length > 0) {
        await this.processTraces(dataToFlush);
      }

      // Process metrics
      if (metricsToFlush.size > 0) {
        await this.processMetrics(metricsToFlush);
      }
    } catch (error) {
      console.error("Failed to flush telemetry data:", error);

      // Re-add failed data back to buffer if there's room
      if (
        this.buffer.length + dataToFlush.length <=
        this.options.maxQueueSize!
      ) {
        this.buffer.unshift(...dataToFlush);
      }
    }
  }

  private async processTraces(traces: TelemetryData[]): Promise<void> {
    // Group by trace type for batch processing
    const grouped = traces.reduce(
      (acc, trace) => {
        const key = trace.attributes?.["ai.provider"] || "general";
        if (!acc[key]) acc[key] = [];
        acc[key].push(trace);
        return acc;
      },
      {} as Record<string, TelemetryData[]>
    );

    // Process each group
    await Promise.all(
      Object.entries(grouped).map(([provider, group]) =>
        this.sendTraceBatch(provider, group)
      )
    );
  }

  private async processMetrics(
    metrics: Map<string, MetricData>
  ): Promise<void> {
    const metricsArray = Array.from(metrics.values());

    // Group by metric type
    const grouped = metricsArray.reduce(
      (acc, metric) => {
        if (!acc[metric.type]) acc[metric.type] = [];
        acc[metric.type].push(metric);
        return acc;
      },
      {} as Record<string, MetricData[]>
    );

    // Process each type
    await Promise.all(
      Object.entries(grouped).map(([type, group]) =>
        this.sendMetricBatch(type, group)
      )
    );
  }

  private async sendTraceBatch(
    provider: string,
    traces: TelemetryData[]
  ): Promise<void> {
    // This will be implemented by specific providers
    console.log(`Sending ${traces.length} traces for provider ${provider}`);
  }

  private async sendMetricBatch(
    type: string,
    metrics: MetricData[]
  ): Promise<void> {
    // This will be implemented by specific providers
    console.log(`Sending ${metrics.length} metrics of type ${type}`);
  }

  async shutdown(): Promise<void> {
    // Stop periodic flush
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }

    // Final flush
    await this.flush();

    // Shutdown providers
    await Promise.all([
      this.tracerProvider?.shutdown(),
      this.meterProvider?.shutdown(),
    ]);
  }

  // Analytics methods for real-time insights
  getRealtimeStats(): {
    tracesPerSecond: number;
    metricsPerSecond: number;
    bufferUtilization: number;
    droppedEvents: number;
  } {
    // Calculate real-time statistics
    const now = Date.now();
    const recentTraces = this.buffer.filter(
      (t) => now - t.timestamp! < 1000
    ).length;
    const metricsCount = this.metricsBuffer.size;

    return {
      tracesPerSecond: recentTraces,
      metricsPerSecond: metricsCount,
      bufferUtilization: this.buffer.length / this.options.bufferSize!,
      droppedEvents: 0, // Track this in production
    };
  }
}
