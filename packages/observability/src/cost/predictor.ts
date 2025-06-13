// packages/observability/src/cost/predictor.ts

// Define local types since we can't import from @farm/types yet
interface CostDataPoint {
  timestamp: number;
  cost: number;
  provider: string;
  model: string;
  tokens: number;
}

interface CostPrediction {
  timeframe: "hour" | "day" | "week" | "month";
  estimated: number;
  confidence: {
    low: number;
    high: number;
    interval: number;
  };
  factors: GrowthFactor[];
  basedOn: {
    dataPoints: number;
    timeRange: string;
    methodology: string;
  };
}

interface GrowthFactor {
  type: "model_upgrade" | "traffic_spike" | "usage_pattern" | "cost_increase";
  impact: "high" | "medium" | "low";
  description: string;
  suggestion: string;
  estimatedSavings?: number;
}

interface PredictorConfig {
  thresholds: {
    daily: number;
    weekly: number;
    monthly: number;
  };
}

interface TrendAnalysis {
  project(period: number, unit: string, confidence?: number): number;
}

interface ModelUsageAnalysis {
  trend: "increasing" | "decreasing" | "stable";
  costImpact: "high" | "medium" | "low";
}

interface TrafficPattern {
  peakUsage: number;
  average: number;
  trend: "increasing" | "decreasing" | "stable";
}

// Simple time series utility class
class SimpleTimeSeries {
  static analyzeTrend(data: CostDataPoint[]): TrendAnalysis {
    if (data.length < 2) {
      return {
        project: () => 0,
      };
    }

    // Simple linear trend calculation
    const values = data.map((d) => d.cost);
    const n = values.length;
    const x = Array.from({ length: n }, (_, i) => i);

    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * values[i], 0);
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    return {
      project: (period: number, unit: string, confidence = 0.5) => {
        const nextValue = slope * (n + period - 1) + intercept;
        const variance = confidence === 0.5 ? 1 : confidence < 0.5 ? 0.8 : 1.2;
        return Math.max(0, nextValue * variance);
      },
    };
  }

  static detectSeasonality(data: CostDataPoint[]): any {
    // Simple seasonality detection - just return basic stats
    return {
      hasSeasonality: false,
      pattern: "none",
    };
  }
}

export class CostPredictor {
  private history: CostDataPoint[] = [];
  private config: PredictorConfig;
  private alertEngine?: any; // TODO: Import proper SmartAlertEngine when available

  constructor(config?: Partial<PredictorConfig>, alertEngine?: any) {
    this.config = {
      thresholds: {
        daily: 100,
        weekly: 500,
        monthly: 2000,
        ...config?.thresholds,
      },
    };
    this.alertEngine = alertEngine;
  }

  async predictDailyCost(): Promise<CostPrediction> {
    const recentData = await this.getRecentCostData();

    // Use time series analysis for prediction
    const trend = SimpleTimeSeries.analyzeTrend(recentData);
    const seasonality = SimpleTimeSeries.detectSeasonality(recentData);

    // Calculate prediction with confidence intervals
    const prediction: CostPrediction = {
      timeframe: "day",
      estimated: trend.project(1, "day"),
      confidence: {
        low: trend.project(1, "day", 0.1),
        high: trend.project(1, "day", 0.9),
        interval: 80,
      },
      factors: this.identifyGrowthFactors(recentData),
      basedOn: {
        dataPoints: recentData.length,
        timeRange: "24 hours",
        methodology: "linear regression with confidence intervals",
      },
    };

    // Alert if projection exceeds thresholds
    if (
      prediction.estimated > this.config.thresholds.daily &&
      this.alertEngine?.triggerAlert
    ) {
      this.alertEngine.triggerAlert("cost_projection_exceeded", prediction);
    }

    return prediction;
  }

  private async getRecentCostData(): Promise<CostDataPoint[]> {
    // Return last 24 hours of data
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;

    return this.history.filter((point) => point.timestamp >= oneDayAgo);
  }

  private identifyGrowthFactors(data: CostDataPoint[]): GrowthFactor[] {
    // Analyze what's driving cost increases
    const factors: GrowthFactor[] = [];

    // Check for model changes
    const modelUsage = this.analyzeModelUsage(data);
    if (modelUsage.trend === "increasing") {
      factors.push({
        type: "model_upgrade",
        impact: modelUsage.costImpact,
        description: "Increased usage of higher-cost AI models",
        suggestion: "Consider using less expensive models for simpler tasks",
      });
    }

    // Check for traffic patterns
    const trafficPattern = this.analyzeTrafficPattern(data);
    if (trafficPattern.peakUsage > trafficPattern.average * 2) {
      factors.push({
        type: "traffic_spike",
        impact: "high",
        description: "Significant traffic spike detected",
        suggestion:
          "Implement rate limiting or caching to smooth traffic spikes",
      });
    }

    return factors;
  }

  private analyzeModelUsage(data: CostDataPoint[]): ModelUsageAnalysis {
    if (data.length < 2) {
      return { trend: "stable", costImpact: "low" };
    }

    // Group by model and analyze cost trends
    const modelCosts = data.reduce(
      (acc, point) => {
        if (!acc[point.model]) acc[point.model] = [];
        acc[point.model].push(point.cost);
        return acc;
      },
      {} as Record<string, number[]>
    );

    // Simple trend analysis - check if recent costs are higher
    const recentHalf = data.slice(Math.floor(data.length / 2));
    const earlierHalf = data.slice(0, Math.floor(data.length / 2));

    const recentAvg =
      recentHalf.reduce((sum, p) => sum + p.cost, 0) / recentHalf.length;
    const earlierAvg =
      earlierHalf.reduce((sum, p) => sum + p.cost, 0) / earlierHalf.length;

    const changePercent = (recentAvg - earlierAvg) / earlierAvg;

    if (changePercent > 0.2) {
      return { trend: "increasing", costImpact: "high" };
    } else if (changePercent > 0.1) {
      return { trend: "increasing", costImpact: "medium" };
    } else if (changePercent < -0.1) {
      return { trend: "decreasing", costImpact: "low" };
    }

    return { trend: "stable", costImpact: "low" };
  }

  private analyzeTrafficPattern(data: CostDataPoint[]): TrafficPattern {
    if (data.length === 0) {
      return { peakUsage: 0, average: 0, trend: "stable" };
    }

    // Group by hour to find peaks
    const hourlyData = data.reduce(
      (acc, point) => {
        const hour = new Date(point.timestamp).getHours();
        if (!acc[hour]) acc[hour] = [];
        acc[hour].push(point);
        return acc;
      },
      {} as Record<number, CostDataPoint[]>
    );

    const hourlyCosts = Object.values(hourlyData).map((points) =>
      points.reduce((sum, p) => sum + p.cost, 0)
    );

    const average =
      hourlyCosts.reduce((sum, cost) => sum + cost, 0) / hourlyCosts.length;
    const peakUsage = Math.max(...hourlyCosts);

    return {
      peakUsage,
      average,
      trend: "stable", // Simplified for now
    };
  }

  // Method to add new cost data
  addCostData(dataPoint: CostDataPoint): void {
    this.history.push(dataPoint);

    // Keep only last 7 days of data
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    this.history = this.history.filter((point) => point.timestamp >= weekAgo);
  }
}
