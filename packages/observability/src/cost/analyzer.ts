import { CostCalculator } from "./calculator";
import type {
  AIMetrics,
  CostAnalysis,
  CostBreakdown,
  ModelUsageStats,
  ProviderCostSummary,
  TimeSeriesDataPoint,
  OptimizationSuggestion,
} from "@farm-framework/types";

export interface AnalysisOptions {
  timeRange: {
    start: Date;
    end: Date;
  };
  groupBy?: "hour" | "day" | "week" | "month";
  includeProjections?: boolean;
  includeSuggestions?: boolean;
}

export class CostAnalyzer {
  private metricsCache: Map<string, AIMetrics[]> = new Map();
  private analysisCache: Map<string, CostAnalysis> = new Map();
  private cacheTimeout = 300000; // 5 minutes

  constructor(private calculator: CostCalculator = new CostCalculator()) {}

  async analyze(
    metrics: AIMetrics[],
    options: AnalysisOptions
  ): Promise<CostAnalysis> {
    const cacheKey = this.getCacheKey(options);

    // Check cache
    const cached = this.analysisCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached;
    }

    // Filter metrics by time range
    const filteredMetrics = metrics.filter(
      (m) =>
        m.timestamp >= options.timeRange.start.getTime() &&
        m.timestamp <= options.timeRange.end.getTime()
    );

    // Perform analysis
    const analysis: CostAnalysis = {
      timeRange: options.timeRange,
      totalCost: this.calculateTotalCost(filteredMetrics),
      breakdown: this.generateBreakdown(filteredMetrics),
      trend: this.analyzeTrend(filteredMetrics),
      providers: this.analyzeProviders(filteredMetrics),
      models: this.analyzeModels(filteredMetrics),
      operations: this.analyzeOperations(filteredMetrics),
      timeSeries: this.generateTimeSeries(
        filteredMetrics,
        options.groupBy || "hour"
      ),
      timestamp: Date.now(),
    };

    // Add projections if requested
    if (options.includeProjections) {
      analysis.projections = this.generateProjections(analysis);
    }

    // Add suggestions if requested
    if (options.includeSuggestions) {
      analysis.suggestions = this.generateSuggestions(analysis);
    }

    // Cache result
    this.analysisCache.set(cacheKey, analysis);

    return analysis;
  }

  private calculateTotalCost(metrics: AIMetrics[]): number {
    return metrics.reduce(
      (total, metric) => total + (metric.cost?.amount || 0),
      0
    );
  }

  private generateBreakdown(metrics: AIMetrics[]): CostBreakdown {
    const totalCost = this.calculateTotalCost(metrics);
    const byProvider: Record<string, number> = {};
    const byModel: Record<string, number> = {};
    const byOperation: Record<string, number> = {};
    const byHour: Record<number, number> = {};
    const byDay: Record<number, number> = {};

    metrics.forEach((metric) => {
      const cost = metric.cost?.amount || 0;
      const date = new Date(metric.timestamp);
      const hour = date.getHours();
      const day = Math.floor(date.getTime() / (1000 * 60 * 60 * 24));

      byProvider[metric.provider] = (byProvider[metric.provider] || 0) + cost;
      byModel[metric.model] = (byModel[metric.model] || 0) + cost;
      byOperation[metric.operation] =
        (byOperation[metric.operation] || 0) + cost;
      byHour[hour] = (byHour[hour] || 0) + cost;
      byDay[day] = (byDay[day] || 0) + cost;
    });

    return {
      total: totalCost,
      currency: "USD",
      byProvider,
      byModel,
      byOperation,
      byHour,
      byDay,
      byTimeRange: {
        hourly: Object.values(byHour),
        daily: Object.values(byDay),
        weekly: [],
        monthly: [],
      },
    };
  }

  private analyzeTrend(metrics: AIMetrics[]): {
    direction: "increasing" | "decreasing" | "stable";
    rate: number;
    confidence: number;
    percentageChange: number;
    averageDaily: number;
    averageHourly: number;
    peakHour: number;
    peakHourCost: number;
  } {
    if (metrics.length === 0) {
      return {
        direction: "stable",
        rate: 0,
        confidence: 1.0,
        percentageChange: 0,
        averageDaily: 0,
        averageHourly: 0,
        peakHour: 0,
        peakHourCost: 0,
      };
    }

    // Sort by timestamp
    const sorted = [...metrics].sort((a, b) => a.timestamp - b.timestamp);

    // Calculate daily costs
    const dailyCosts = this.groupByDay(sorted);
    const dailyValues = Object.values(dailyCosts);

    if (dailyValues.length < 2) {
      return {
        direction: "stable",
        rate: 0,
        confidence: 0.5,
        percentageChange: 0,
        averageDaily: dailyValues[0] || 0,
        averageHourly: (dailyValues[0] || 0) / 24,
        peakHour: 0,
        peakHourCost: 0,
      };
    }

    // Calculate trend
    const firstHalf = dailyValues.slice(0, Math.floor(dailyValues.length / 2));
    const secondHalf = dailyValues.slice(Math.floor(dailyValues.length / 2));

    const firstHalfAvg = this.average(firstHalf);
    const secondHalfAvg = this.average(secondHalf);

    const percentageChange =
      firstHalfAvg === 0
        ? 0
        : ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100;

    const direction: "increasing" | "decreasing" | "stable" =
      Math.abs(percentageChange) < 5
        ? "stable"
        : percentageChange > 0
          ? "increasing"
          : "decreasing";

    const confidence = Math.min(1.0, dailyValues.length / 7);

    // Calculate hourly breakdown
    const hourlyCosts = this.groupByHour(sorted);
    const hourlyValues = Object.entries(hourlyCosts).map(([hour, cost]) => ({
      hour: parseInt(hour),
      cost,
    }));

    const peakHour = hourlyValues.reduce(
      (max, current) => (current.cost > max.cost ? current : max),
      { hour: 0, cost: 0 }
    );

    return {
      direction,
      rate: Math.abs(percentageChange),
      confidence,
      percentageChange,
      averageDaily: this.average(dailyValues),
      averageHourly: this.average(Object.values(hourlyCosts)),
      peakHour: peakHour.hour,
      peakHourCost: peakHour.cost,
    };
  }

  private analyzeProviders(metrics: AIMetrics[]): ProviderCostSummary[] {
    const providerMap = new Map<
      string,
      {
        totalCost: number;
        requestCount: number;
        models: Set<string>;
        operations: Map<string, number>;
        totalTokens: number;
      }
    >();

    metrics.forEach((metric) => {
      if (!providerMap.has(metric.provider)) {
        providerMap.set(metric.provider, {
          totalCost: 0,
          requestCount: 0,
          models: new Set(),
          operations: new Map(),
          totalTokens: 0,
        });
      }

      const provider = providerMap.get(metric.provider)!;
      provider.totalCost += metric.cost?.amount || 0;
      provider.requestCount++;
      provider.models.add(metric.model);
      provider.totalTokens += (metric.tokens?.total as number) || 0;

      const operationCost = provider.operations.get(metric.operation) || 0;
      provider.operations.set(
        metric.operation,
        operationCost + (metric.cost?.amount || 0)
      );
    });

    return Array.from(providerMap.entries()).map(([name, data]) => ({
      provider: name,
      totalCost: data.totalCost,
      averageCost: data.totalCost / data.requestCount,
      avgCostPerRequest: data.totalCost / data.requestCount,
      averageCostPerRequest: data.totalCost / data.requestCount,
      requestCount: data.requestCount,
      models: [],
      topModels: Array.from(data.models).slice(0, 5),
      operations: Object.fromEntries(data.operations),
      totalTokens: data.totalTokens,
      costPerToken:
        data.totalTokens > 0 ? data.totalCost / data.totalTokens : 0,
      costTrend: "stable" as const,
    }));
  }

  private analyzeModels(metrics: AIMetrics[]): ModelUsageStats[] {
    const modelMap = new Map<
      string,
      {
        provider: string;
        totalCost: number;
        requestCount: number;
        totalTokens: number;
        promptTokens: number;
        completionTokens: number;
        operations: Map<string, number>;
      }
    >();

    metrics.forEach((metric) => {
      const key = `${metric.provider}:${metric.model}`;
      if (!modelMap.has(key)) {
        modelMap.set(key, {
          provider: metric.provider,
          totalCost: 0,
          requestCount: 0,
          totalTokens: 0,
          promptTokens: 0,
          completionTokens: 0,
          operations: new Map(),
        });
      }

      const model = modelMap.get(key)!;
      model.totalCost += metric.cost?.amount || 0;
      model.requestCount++;
      model.totalTokens += (metric.tokens?.total as number) || 0;
      model.promptTokens += (metric.tokens?.prompt as number) || 0;
      model.completionTokens += (metric.tokens?.completion as number) || 0;

      const operationCount = model.operations.get(metric.operation) || 0;
      model.operations.set(metric.operation, operationCount + 1);
    });

    return Array.from(modelMap.entries()).map(([key, data]) => {
      const [provider, model] = key.split(":");
      return {
        model,
        modelName: model,
        provider,
        totalCost: data.totalCost,
        averageCost: data.totalCost / data.requestCount,
        requestCount: data.requestCount,
        totalTokens: data.totalTokens,
        promptTokens: data.promptTokens,
        completionTokens: data.completionTokens,
        costPerToken:
          data.totalTokens > 0 ? data.totalCost / data.totalTokens : 0,
        operations: Object.fromEntries(data.operations),
        avgLatency: 0,
        averageLatency: 0,
        errorRate: 0,
        successRate: 100,
        throughput: data.requestCount,
        costEfficiency: 1.0,
        lastUsed: new Date(Date.now()),
      };
    });
  }

  private analyzeOperations(metrics: AIMetrics[]): Record<string, number> {
    return metrics.reduce(
      (acc, metric) => {
        acc[metric.operation] =
          (acc[metric.operation] || 0) + (metric.cost?.amount || 0);
        return acc;
      },
      {} as Record<string, number>
    );
  }

  private generateTimeSeries(
    metrics: AIMetrics[],
    groupBy: "hour" | "day" | "week" | "month"
  ): TimeSeriesDataPoint[] {
    const grouped = this.groupMetricsByPeriod(metrics, groupBy);

    return Object.entries(grouped).map(([timestamp, metrics]) => ({
      timestamp: parseInt(timestamp),
      value: this.calculateTotalCost(metrics),
      count: metrics.length,
      providers: Array.from(new Set(metrics.map((m) => m.provider))),
    }));
  }

  private generateProjections(analysis: CostAnalysis): {
    nextDay: number;
    nextWeek: number;
    nextMonth: number;
    confidence: number;
  } {
    const dailyAverage = analysis.totalCost / 30;
    const trend = analysis.trend.rate / 100;

    return {
      nextDay: dailyAverage * (1 + trend / 30),
      nextWeek: dailyAverage * 7 * (1 + trend / 4),
      nextMonth: dailyAverage * 30 * (1 + trend),
      confidence: analysis.trend.confidence,
    };
  }

  private generateSuggestions(
    analysis: CostAnalysis
  ): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];

    // Check for expensive models
    const expensiveModels = analysis.models.filter(
      (m) => m.costPerToken > 0.001 && m.requestCount > 10
    );

    if (expensiveModels.length > 0) {
      suggestions.push({
        type: "model_downgrade",
        impact: "high",
        estimatedSavings: expensiveModels[0].costPerToken * 1000,
        implementation: {
          current: expensiveModels[0].model,
          suggested: "gpt-3.5-turbo",
          description: "Switch to more cost-effective model for simple tasks",
          codeExample: "aiApi.chat({ model: 'gpt-3.5-turbo', ... })",
        },
        difficulty: "easy",
        timeEstimate: "1 hour",
      });
    }

    if (analysis.trend.direction === "increasing" && analysis.trend.rate > 20) {
      suggestions.push({
        type: "caching",
        impact: "medium",
        estimatedSavings: analysis.totalCost * 0.1, // Estimate 10% savings
        implementation: {
          suggested: "Implement response caching",
          description:
            "Review recent changes and consider implementing cost controls",
          codeExample: "cache.set(requestKey, response, ttl)",
        },
        difficulty: "medium",
        timeEstimate: "2-4 hours",
      });
    }

    return suggestions;
  }

  private groupByDay(metrics: AIMetrics[]): Record<string, number> {
    const grouped: Record<string, number> = {};

    metrics.forEach((metric) => {
      const date = new Date(metric.timestamp);
      date.setHours(0, 0, 0, 0);
      const key = date.getTime().toString();
      grouped[key] = (grouped[key] || 0) + (metric.cost?.amount || 0);
    });

    return grouped;
  }

  private groupByHour(metrics: AIMetrics[]): Record<string, number> {
    const grouped: Record<string, number> = {};

    metrics.forEach((metric) => {
      const date = new Date(metric.timestamp);
      const hour = date.getHours().toString();
      grouped[hour] = (grouped[hour] || 0) + (metric.cost?.amount || 0);
    });

    return grouped;
  }

  private groupMetricsByPeriod(
    metrics: AIMetrics[],
    period: "hour" | "day" | "week" | "month"
  ): Record<string, AIMetrics[]> {
    const grouped: Record<string, AIMetrics[]> = {};

    metrics.forEach((metric) => {
      const timestamp = this.getPeriodTimestamp(metric.timestamp, period);
      if (!grouped[timestamp]) {
        grouped[timestamp] = [];
      }
      grouped[timestamp].push(metric);
    });

    return grouped;
  }

  private getPeriodTimestamp(
    timestamp: number,
    period: "hour" | "day" | "week" | "month"
  ): string {
    const date = new Date(timestamp);

    switch (period) {
      case "hour":
        date.setMinutes(0, 0, 0);
        break;
      case "day":
        date.setHours(0, 0, 0, 0);
        break;
      case "week":
        const day = date.getDay();
        date.setDate(date.getDate() - day);
        date.setHours(0, 0, 0, 0);
        break;
      case "month":
        date.setDate(1);
        date.setHours(0, 0, 0, 0);
        break;
    }

    return date.getTime().toString();
  }

  private average(numbers: number[]): number {
    return numbers.length > 0
      ? numbers.reduce((a, b) => a + b, 0) / numbers.length
      : 0;
  }

  private getCacheKey(options: AnalysisOptions): string {
    return `${options.timeRange.start.getTime()}-${options.timeRange.end.getTime()}-${options.groupBy}`;
  }
}
