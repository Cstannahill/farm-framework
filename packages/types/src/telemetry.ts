// packages/types/src/telemetry.ts
// Core telemetry and instrumentation types

// Basic Telemetry Data
export interface BasicTelemetryData {
  timestamp: number;
  provider: string;
  operationType: string;
  metadata?: Record<string, any>;
}

export interface MetricData {
  name: string;
  type: "counter" | "gauge" | "histogram" | "summary";
  value: number;
  timestamp: number;
  unit?: string;
  labels?: Record<string, string>;
}

export interface AIMetrics {
  provider: string;
  model: string;
  operation: string;
  requestCount: number;
  totalCost: number;
  avgLatency: number;
  errorRate: number;
  timestamp: number;
  duration: number;
  cost: {
    amount: number;
    currency: string;
  };
  tokens: {
    prompt: number;
    completion: number;
    total: number;
    input: number;
    output: number;
  };
}

export interface TelemetryProvider {
  name: string;
  initialize(config: TelemetryProviderConfig): Promise<void>;
  record(metric: TelemetryMetric): Promise<void>;
  flush(): Promise<void>;
  shutdown(): Promise<void>;
}

export interface TelemetryProviderConfig {
  serviceName: string;
  serviceVersion?: string;
  environment?: string;
  endpoint?: string;
  apiKey?: string;
  headers?: Record<string, string>;
  batchSize?: number;
  timeout?: number;
}

export interface TelemetryMetric {
  name: string;
  type: "counter" | "gauge" | "histogram" | "summary";
  value: number;
  labels?: Record<string, string>;
  timestamp?: number;
  unit?: string;
}

export interface TelemetryTrace {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  operationName: string;
  startTime: number;
  endTime?: number;
  tags?: Record<string, any>;
  logs?: TelemetryLog[];
  status?: "ok" | "error" | "timeout";
}

export interface TelemetryLog {
  timestamp: number;
  level: "debug" | "info" | "warn" | "error";
  message: string;
  fields?: Record<string, any>;
}

export interface InstrumentationConfig {
  http?: {
    enabled: boolean;
    ignoreUrls?: string[];
    recordBody?: boolean;
  };
  database?: {
    enabled: boolean;
    recordQueries?: boolean;
    sanitizeQueries?: boolean;
  };
  ai?: {
    enabled: boolean;
    recordPrompts?: boolean;
    recordResponses?: boolean;
    trackCosts?: boolean;
  };
  custom?: {
    enabled: boolean;
    instruments?: string[];
  };
}

export interface TelemetryData {
  service: {
    name: string;
    version: string;
    environment: string;
  };
  type?: "trace" | "metric" | "log";
  name?: string;
  attributes?: Record<string, any>;
  operationType?: string;
  duration?: number;
  error?: string;
  traceId?: string;
  spanId?: string;
  metrics: TelemetryMetric[];
  traces: TelemetryTrace[];
  logs: TelemetryLog[];
  timestamp: number;
}

export interface MetricValue {
  name: string;
  value: number;
  labels: Record<string, string>;
  timestamp: number;
}

// OpenTelemetry specific types
export interface OpenTelemetryConfig {
  resource: {
    serviceName: string;
    serviceVersion?: string;
    serviceNamespace?: string;
  };
  tracing: {
    endpoint?: string;
    headers?: Record<string, string>;
    compression?: "gzip" | "none";
  };
  metrics: {
    endpoint?: string;
    interval?: number;
    headers?: Record<string, string>;
  };
  logs: {
    endpoint?: string;
    headers?: Record<string, string>;
  };
}

// Provider-specific configs
export interface ConsoleProviderConfig extends TelemetryProviderConfig {
  pretty?: boolean;
  colors?: boolean;
  logLevel?: "debug" | "info" | "warn" | "error";
}

export interface UptraceProviderConfig extends TelemetryProviderConfig {
  dsn: string;
  projectId?: string;
  compression?: "gzip" | "none";
}

export interface DatadogProviderConfig extends TelemetryProviderConfig {
  site?: string;
  agentHost?: string;
  agentPort?: number;
  tags?: Record<string, string>;
}

// Additional provider and data types
export interface ProviderCapabilities {
  traces: boolean;
  metrics: boolean;
  logs: boolean;
  realtime: boolean;
  costTracking: boolean;
  dashboardUrl: boolean | string;
  alerts: boolean;
  export: boolean;
}

export interface ProviderConfig {
  name: string;
  type: "console" | "uptrace" | "custom" | "jaeger" | "zipkin";
  endpoint?: string;
  apiKey?: string;
  headers?: Record<string, string>;
  timeout?: number;
  retries?: number;
  enabled: boolean;
}

export interface ProviderHealth {
  status: "healthy" | "degraded" | "unhealthy" | "unknown";
  lastCheck: Date;
  responseTime?: number;
  latency?: number;
  errorRate?: number;
  message?: string;
  capabilities?: ProviderCapabilities;
  error?: string;
}

// Cost Data Point for predictions
export interface CostDataPoint {
  timestamp: number;
  cost: number;
  provider: string;
  model: string;
  requestCount: number;
  tokenCount: number;
}

// Time Series Analysis
export interface TimeSeries {
  data: CostDataPoint[];
  trend: "increasing" | "decreasing" | "stable";
  seasonality?: {
    detected: boolean;
    period?: number;
    strength?: number;
  };
}

// Trace Data Types
export interface TraceData {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  operationName: string;
  startTime: number;
  endTime?: number;
  attributes?: Record<string, any>;
  events?: TelemetryLog[];
  status?: "ok" | "error" | "timeout";
}
