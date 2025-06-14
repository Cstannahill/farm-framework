// packages/types/src/cost.ts
// Cost tracking and analysis types

export interface CostData {
  provider: string;
  model: string;
  operation: string;
  tokens: {
    prompt: number;
    completion: number;
    total: number;
  };
  cost: {
    amount: number;
    currency: string;
  };
  timestamp: number;
  duration: number;
  requestId?: string;
  userId?: string;
  sessionId?: string;
}

export interface CostBreakdown {
  total: number;
  currency: string;
  byProvider: Record<string, number>;
  byModel: Record<string, number>;
  byOperation: Record<string, number>;
  byHour: Record<number, number>;
  byDay: Record<number, number>;
  byTimeRange: {
    hourly: number[];
    daily: number[];
    weekly: number[];
    monthly: number[];
  };
}

export interface GrowthFactor {
  type: "model_upgrade" | "traffic_spike" | "usage_pattern" | "cost_increase";
  impact: "high" | "medium" | "low";
  description: string;
  suggestion: string;
  estimatedSavings?: number;
  implementation?: {
    difficulty: "easy" | "medium" | "hard";
    timeEstimate: string;
    codeExample?: string;
  };
}

export interface CostAnalysisResult {
  totalCost: number;
  projectedMonthlyCost: number;
  costTrends: {
    direction: "increasing" | "decreasing" | "stable";
    rate: number;
    confidence: number;
  };
  breakdown: CostBreakdown;
  growthFactors: GrowthFactor[];
  recommendations: string[];
}

export interface CostThreshold {
  type: "hourly" | "daily" | "weekly" | "monthly";
  amount: number;
  currency: string;
  action: "alert" | "throttle" | "block";
  notificationChannels?: string[];
}

export interface CostQuota {
  period: "daily" | "weekly" | "monthly";
  limit: number;
  currency: string;
  resetDay?: number; // For weekly/monthly quotas
  warningThresholds?: number[]; // Array of percentages (e.g., [50, 80, 95])
  enforced: boolean;
}

export interface OptimizationSuggestion {
  type:
    | "model_downgrade"
    | "caching"
    | "batching"
    | "rate_limiting"
    | "model_upgrade"
    | "provider_switch";
  impact: "high" | "medium" | "low";
  estimatedSavings: number;
  implementation: {
    current?: string;
    suggested: string;
    description: string;
    codeExample?: string;
  };
  difficulty: "easy" | "medium" | "hard";
  timeEstimate: string;
}

export interface Optimization {
  type: "model_downgrade" | "caching" | "batching" | "rate_limiting";
  description: string;
  estimatedSavings: number;
  difficulty: "easy" | "medium" | "hard";
  impact: "low" | "medium" | "high";
  implementation?: {
    timeEstimate: string;
    codeExample?: string;
  };
}

export interface OptimizationPlan {
  currentMonthlyCost: number;
  optimizedMonthlyCost: number;
  potentialSavings: number;
  currency: string;
  suggestions: Optimization[];
  implementationPriority: "high" | "medium" | "low";
  estimatedImplementationTime: string;
}

export interface CostPrediction {
  timeframe: "hour" | "day" | "week" | "month";
  estimated: number;
  confidence: {
    low: number;
    high: number;
    interval: number; // confidence interval percentage
  };
  factors: GrowthFactor[];
  basedOn: {
    dataPoints: number;
    timeRange: string;
    methodology: string;
  };
}

// Pricing data structures
export interface ModelPricing {
  provider: string;
  model: string;
  pricing: {
    prompt: number; // per 1k tokens
    completion: number; // per 1k tokens
    embedding?: number; // per 1k tokens
    image?: number; // per image
    audio?: number; // per minute
  };
  currency: string;
  effectiveDate: string;
  deprecated?: boolean;
}

export interface ProviderPricing {
  provider: string;
  models: Record<string, ModelPricing>;
  lastUpdated: string;
  updateFrequency: string;
  source: string;
}

// Usage pattern analysis
export interface UsagePattern {
  timeframe: string;
  requestCount: number;
  peakHour: number;
  averageRequestsPerHour: number;
  modelDistribution: Record<string, number>;
  operationDistribution: Record<string, number>;
  costDistribution: Record<string, number>;
  anomalies: UsageAnomaly[];
  requestPattern?: "sequential" | "parallel" | "mixed";
  avgRequestsPerMinute?: number;
  projectedMonthlyCost?: number;
}

export interface UsageAnomaly {
  type: "spike" | "drop" | "unusual_pattern";
  severity: "low" | "medium" | "high";
  timestamp: number;
  description: string;
  impactOnCost: number;
  suggestedAction?: string;
}

// Real-time cost tracking
export interface CostTicker {
  current: {
    cost: number;
    rate: number; // cost per hour
    currency: string;
  };
  projection: {
    daily: number;
    weekly: number;
    monthly: number;
  };
  comparison: {
    yesterday: number;
    lastWeek: number;
    lastMonth: number;
  };
  alerts: CostAlert[];
}

export interface CostAlert {
  id: string;
  type: "threshold" | "spike" | "quota" | "anomaly";
  severity: "info" | "warning" | "error" | "critical";
  message: string;
  timestamp: number;
  cost: number;
  currency: string;
  acknowledged: boolean;
  resolvedAt?: number;
}

// Additional Cost Metrics and Analysis Types
export interface CostMetrics {
  totalCost: number;
  costPerHour: number;
  costPerRequest: number;
  providers: Record<string, number>;
  models: Record<string, number>;
  timeRange: {
    start: Date;
    end: Date;
  };
}

export interface AlertMetrics {
  cost: CostMetrics;
  performance: {
    avgLatency: number;
    errorRate: number;
    requestCount: number;
  };
  usage: {
    totalRequests: number;
    uniqueUsers: number;
    peakConcurrency: number;
  };
}

export interface ModelUsageStats {
  modelName: string;
  model: string;
  provider: string;
  requestCount: number;
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
  totalCost: number;
  averageCost: number;
  costPerToken: number;
  avgLatency: number;
  averageLatency: number;
  errorRate: number;
  costEfficiency: number;
  lastUsed: Date;
  operations: Record<string, number>;
}

export interface ProviderCostSummary {
  provider: string;
  totalCost: number;
  requestCount: number;
  avgCostPerRequest: number;
  averageCostPerRequest: number;
  averageCost: number;
  totalTokens: number;
  costPerToken: number;
  topModels: string[];
  models: ModelUsageStats[];
  costTrend: "increasing" | "decreasing" | "stable";
}

export interface TimeSeriesDataPoint {
  timestamp: number;
  value: number;
  label?: string;
  metadata?: Record<string, any>;
  count: number;
  providers: string[];
}

export interface CostAnalysis {
  timeRange: {
    start: Date;
    end: Date;
  };
  totalCost: number;
  breakdown: CostBreakdown;
  trend: {
    direction: "increasing" | "decreasing" | "stable";
    rate: number;
    confidence: number;
    percentageChange: number;
    averageDaily: number;
    averageHourly: number;
    peakHour: number;
    peakHourCost: number;
  };
  providers: ProviderCostSummary[];
  models: ModelUsageStats[];
  operations: Record<string, number>;
  timeSeries: TimeSeriesDataPoint[];
  timestamp: number;
  projections?: {
    nextDay: number;
    nextWeek: number;
    nextMonth: number;
    confidence: number;
  };
  suggestions?: OptimizationSuggestion[];
}

// Cost Analysis Types
export interface AnalysisOptions {
  timeRange: {
    start: Date;
    end: Date;
  };
  groupBy?: "hour" | "day" | "week" | "month";
  includeProjections?: boolean;
  includeSuggestions?: boolean;
}
