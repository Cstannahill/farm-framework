// packages/types/src/observability.ts
import type {
  GrowthFactor,
  OptimizationSuggestion,
  CostBreakdown,
  TimeSeriesDataPoint,
  ProviderCostSummary,
  ModelUsageStats,
  CostMetrics,
  CostAnalysis,
} from "./cost.js";

// Alert Types
export interface Alert {
  id: string;
  title: string;
  message: string;
  severity: AlertSeverity;
  timestamp: Date;
  rule: string;
  metadata?: Record<string, any>;
  analysis?: string;
  recommendations?: string[];
  actions?: AlertAction[];
}

export interface AlertAction {
  label: string;
  url?: string;
  action?: string;
  primary?: boolean;
}

export type AlertSeverity = "info" | "warning" | "error" | "critical";

export interface AlertNotification {
  title: string;
  message: string;
  severity: AlertSeverity;
  timestamp: Date;
  metadata?: Record<string, any>;
  actions?: AlertAction[];
}

export interface NotificationResult {
  success: boolean;
  channel: string;
  error?: string;
  timestamp?: Date;
}

export interface AlertChannelConfig {
  enabled?: boolean;
  rateLimitPerHour?: number;
  minSeverity?: AlertSeverity;
}

export interface AlertChannel {
  name: string;
  type: "email" | "slack" | "webhook" | "console";
  enabled: boolean;
  send(alert: Alert): Promise<NotificationResult>;
}

export interface AlertRule {
  id: string;
  name: string;
  description?: string;
  category?: string;
  enabled: boolean;
  conditions: AlertCondition[];
  severity: AlertSeverity;
  channels: string[];
  debounce?: number;
  consecutiveTriggers?: number;
  actions?: AlertAction[];
  analyze?: boolean;
  evaluationInterval?: number;
}

export interface AlertCondition {
  type:
    | "threshold_static"
    | "threshold_dynamic"
    | "percentage"
    | "rate"
    | "percentile"
    | "health"
    | "anomaly"
    | "custom";
  metric: string;
  operator: ">" | "<" | "==" | ">=" | "<=" | "!=";
  threshold?: number;
  value?: number;
  multiplier?: number;
  sustainedFor?: number;
  of?: string;
  percentage?: number;
  percentile?: number;
  service?: string;
  status?: string;
  sensitivity?: "low" | "medium" | "high";
  function?: (context: any) => boolean;
  timeWindow?: number;
  consecutiveChecks?: number;
  method?: string;
}

export interface AlertConfig {
  enabled: boolean;
  channels: AlertChannel[];
  rules: AlertRule[];
  throttle?: {
    enabled: boolean;
    duration: number; // minutes
  };
}

// Alert Metrics Interface (for alert evaluation context)
export interface AlertContext {
  cost?: {
    current: number;
    daily: number;
    monthly: number;
  };
  errors?: number;
  requests?: number;
  latency?: {
    p95: number;
  };
  provider?: string;
  providers?: Record<string, any>;
  models?: Record<string, any>;
  quota?: {
    monthly: number;
  };
  health?: Record<string, string>;
}

// Export Options
export interface ExportOptions {
  format: ExportFormat;
  timeRange?: {
    start: Date;
    end: Date;
  };
  includeMetadata?: boolean;
  compression?: boolean;
}

export interface CSVExportOptions extends ExportOptions {
  delimiter: string;
  includeHeaders: boolean;
  dateFormat: "iso" | "excel" | "unix";
  columns: string[];
  groupBy: "hour" | "day" | "week" | "month";
}

export interface DashboardExportOptions extends ExportOptions {
  includeWidgets?: boolean;
  includeData?: boolean;
  template?: string;
  title?: string;
  notifyList?: string[];
}

export interface ExportedDashboard {
  id: string;
  name: string;
  title?: string;
  description?: string;
  widgets: DashboardWidget[];
  layout: DashboardLayout;
  exportedAt: Date;
  version: string;
}

export interface DashboardWidgetConfig {
  id?: string;
  type?:
    | "metric"
    | "chart"
    | "table"
    | "gauge"
    | "line"
    | "bar"
    | "pie"
    | "heatmap";
  title?: string;
  position?: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
  config?: {
    metric?: string;
    format?: "currency" | "percentage" | "duration" | "number";
    sparkline?: boolean;
    comparison?: "yesterday" | "last_week" | "last_month";
    chartType?: "line" | "bar" | "area" | "pie";
    showProgress?: boolean;
    groupBy?: "hour" | "day" | "week" | "month";
    buckets?: number[];
    target?: string;
    showForecast?: boolean;
    showLegend?: boolean;
    threshold?: {
      warning: number;
      error: number;
    };
  };
  dataSource: string;
  query?: string;
  visualization: {
    type: "line" | "bar" | "pie" | "table" | "gauge";
    options: Record<string, any>;
  };
  refreshInterval?: number;
}

// Core Config Types
export interface ObservabilityConfig {
  enabled?: boolean;
  provider?: "console" | "uptrace" | "datadog" | "custom";
  serviceName?: string;
  sampling?: number;
  costTracking?: CostTrackingConfig;
  alerts?: AlertConfig;
  telemetry?: TelemetryConfig;
  exporters?: ExporterConfig[];
}

export interface TelemetryConfig {
  enabled: boolean;
  endpoint?: string;
  headers?: Record<string, string>;
  batchSize?: number;
  timeout?: number;
  retryAttempts?: number;
}

export interface ExporterConfig {
  type: "console" | "file" | "http" | "otlp";
  enabled: boolean;
  config: Record<string, any>;
}

export type ExportFormat = "csv" | "json" | "grafana" | "datadog";

// Dashboard Types
export interface DashboardConfig {
  title: string;
  description?: string;
  widgets: DashboardWidget[];
  layout?: DashboardLayout;
  theme?: "light" | "dark" | "auto";
  refreshInterval?: number;
}

export interface DashboardWidget {
  id: string;
  type:
    | "metric"
    | "chart"
    | "table"
    | "alert"
    | "cost"
    | "gauge"
    | "line"
    | "bar"
    | "pie"
    | "heatmap";
  title: string;
  config: Record<string, any>;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface DashboardLayout {
  columns: number;
  gap: number;
  padding: number;
  type?: "grid" | "flex";
  rows?: number;
}

// Health Types
export type HealthStatus = "healthy" | "degraded" | "unhealthy" | "unknown";

export interface HealthCheck {
  name: string;
  status: HealthStatus;
  lastCheck: Date;
  responseTime?: number;
  error?: string;
  metadata?: Record<string, any>;
}

// Data Export Types
export interface DataExport {
  id: string;
  format: ExportFormat;
  status: "pending" | "processing" | "completed" | "failed";
  createdAt: Date;
  completedAt?: Date;
  downloadUrl?: string;
  error?: string;
  options: ExportOptions;
}

// Configuration Types - Fixed
export interface CostTrackingConfig {
  enabled: boolean;
  currency?: string;
  thresholds?: {
    daily?: number;
    monthly?: number;
    hourly?: number;
  };
  alerting?: {
    enabled: boolean;
    channels: string[];
  };
  alerts?: {
    thresholds: {
      daily: number;
      monthly: number;
    };
  };
}

export interface TelemetryConfig {
  enabled: boolean;
  provider?: string;
  endpoint?: string;
  sampling?: number;
}
