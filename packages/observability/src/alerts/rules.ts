import type {
  AlertRule,
  AlertCondition,
  AlertContext,
  Alert,
  CostMetrics,
} from "@farm-framework/types";

export type RuleEvaluationResult = {
  triggered: boolean;
  alert?: Alert;
  nextEvaluation?: Date;
};

export interface RuleContext {
  metrics: AlertContext;
  previousValue?: number;
  trend?: "increasing" | "decreasing" | "stable";
  baseline?: number;
}

/**
 * Built-in alert rules that ship with FARM
 */
export const BUILT_IN_RULES: AlertRule[] = [
  {
    id: "cost_spike_detection",
    name: "Cost Spike Detection",
    description: "Alerts when costs spike above normal baseline",
    category: "cost",
    severity: "warning",
    enabled: true,
    channels: [],
    conditions: [
      {
        type: "threshold_dynamic",
        metric: "cost.total",
        operator: ">",
        multiplier: 1.5,
        timeWindow: 300000, // 5 minutes
        sustainedFor: 300000, // Must be sustained for 5 minutes
      },
    ],
    actions: [
      { label: "View Dashboard", url: "/dashboard" },
      { label: "Apply Optimizations", action: "optimize", primary: true },
    ],
  },
  {
    id: "daily_budget_exceeded",
    name: "Daily Budget Exceeded",
    description: "Alerts when daily spending exceeds configured budget",
    category: "cost",
    severity: "error",
    enabled: true,
    channels: [],
    conditions: [
      {
        type: "threshold_static",
        metric: "cost.daily",
        operator: ">",
        value: 25, // Default $25/day, overridden by config
      },
    ],
    actions: [
      { label: "View Cost Breakdown", url: "/dashboard/costs" },
      { label: "Configure Budget", action: "configure_budget" },
    ],
  },
  {
    id: "monthly_quota_warning",
    name: "Monthly Quota Warning",
    description: "Warns when approaching monthly quota",
    category: "cost",
    severity: "warning",
    enabled: true,
    channels: [],
    conditions: [
      {
        type: "percentage",
        metric: "cost.monthly",
        operator: ">",
        percentage: 80,
        of: "quota.monthly",
      },
    ],
  },
  {
    id: "error_rate_high",
    name: "High Error Rate",
    description: "Alerts when AI API error rate is abnormally high",
    category: "performance",
    severity: "error",
    enabled: true,
    channels: [],
    conditions: [
      {
        type: "rate",
        metric: "ai.errors",
        operator: ">",
        value: 0.05, // 5% error rate
        timeWindow: 600000, // 10 minutes
      },
    ],
  },
  {
    id: "latency_degradation",
    name: "Latency Degradation",
    description: "Alerts when AI response times degrade",
    category: "performance",
    severity: "warning",
    enabled: true,
    channels: [],
    conditions: [
      {
        type: "percentile",
        metric: "ai.latency",
        percentile: 95,
        operator: ">",
        value: 5000, // 5 seconds
        timeWindow: 300000,
      },
    ],
  },
  {
    id: "provider_down",
    name: "AI Provider Down",
    description: "Alerts when an AI provider becomes unavailable",
    category: "availability",
    severity: "critical",
    enabled: true,
    channels: ["email", "slack"],
    conditions: [
      {
        type: "health",
        metric: "provider.health",
        operator: "==",
        value: 0, // 0 = unhealthy, 1 = healthy
        service: "ai.provider",
        status: "unhealthy",
        consecutiveChecks: 3,
      },
    ],
  },
  {
    id: "token_limit_approaching",
    name: "Token Limit Approaching",
    description: "Warns when approaching token limits",
    category: "limits",
    enabled: true,
    severity: "info",
    channels: [],
    conditions: [
      {
        type: "percentage",
        metric: "ai.tokens.used",
        operator: ">",
        percentage: 90,
        of: "ai.tokens.limit",
      },
    ],
  },
  {
    id: "unusual_model_usage",
    name: "Unusual Model Usage Pattern",
    description: "Detects anomalous model usage patterns",
    category: "security",
    severity: "warning",
    enabled: true,
    channels: [],
    conditions: [
      {
        type: "anomaly",
        metric: "ai.model.usage",
        operator: ">",
        sensitivity: "medium",
        method: "isolation_forest",
      },
    ],
  },
];

/**
 * Alert Rule Evaluator
 */
export class AlertRuleEvaluator {
  private ruleHistory: Map<
    string,
    {
      lastTriggered?: Date;
      consecutiveTriggers: number;
      lastValue?: number;
    }
  > = new Map();

  evaluate(rule: AlertRule, context: RuleContext): RuleEvaluationResult {
    const history = this.ruleHistory.get(rule.id) || {
      consecutiveTriggers: 0,
    };

    const triggered = this.evaluateCondition(rule.conditions[0], context);

    if (triggered) {
      history.consecutiveTriggers++;
      history.lastTriggered = new Date();

      // Check if we should actually fire the alert
      if (this.shouldFireAlert(rule, history)) {
        const alert = this.createAlert(rule, context);
        this.ruleHistory.set(rule.id, history);

        return {
          triggered: true,
          alert,
          nextEvaluation: this.calculateNextEvaluation(rule),
        };
      }
    } else {
      history.consecutiveTriggers = 0;
    }

    this.ruleHistory.set(rule.id, history);

    return {
      triggered: false,
      nextEvaluation: this.calculateNextEvaluation(rule),
    };
  }

  private evaluateCondition(
    condition: AlertCondition,
    context: RuleContext
  ): boolean {
    switch (condition.type) {
      case "threshold_static":
        return this.evaluateStaticThreshold(
          condition as AlertCondition & { type: "threshold_static" },
          context
        );

      case "threshold_dynamic":
        return this.evaluateDynamicThreshold(
          condition as AlertCondition & { type: "threshold_dynamic" },
          context
        );

      case "percentage":
        return this.evaluatePercentage(
          condition as AlertCondition & { type: "percentage" },
          context
        );

      case "rate":
        return this.evaluateRate(
          condition as AlertCondition & { type: "rate" },
          context
        );

      case "percentile":
        return this.evaluatePercentile(
          condition as AlertCondition & { type: "percentile" },
          context
        );

      case "health":
        return this.evaluateHealth(
          condition as AlertCondition & { type: "health" },
          context
        );

      case "anomaly":
        return this.evaluateAnomaly(
          condition as AlertCondition & { type: "anomaly" },
          context
        );

      case "custom":
        return this.evaluateCustom(
          condition as AlertCondition & { type: "custom" },
          context
        );

      default:
        console.warn(`Unknown condition type: ${(condition as any).type}`);
        return false;
    }
  }

  private evaluateStaticThreshold(
    condition: AlertCondition & { type: "threshold_static" },
    context: RuleContext
  ): boolean {
    const value = this.getMetricValue(condition.metric, context);
    return this.compareValues(value, condition.operator, condition.value);
  }

  private evaluateDynamicThreshold(
    condition: AlertCondition & { type: "threshold_dynamic" },
    context: RuleContext
  ): boolean {
    const current = this.getMetricValue(condition.metric, context);
    const baseline = context.baseline || 0;
    const threshold = baseline * (condition.multiplier || 1.5);

    const exceeded = this.compareValues(current, condition.operator, threshold);

    // Check if sustained
    if (exceeded && condition.sustainedFor) {
      // This would need to track state over time
      // Simplified for this implementation
      return true;
    }

    return exceeded;
  }

  private evaluatePercentage(
    condition: AlertCondition & { type: "percentage" },
    context: RuleContext
  ): boolean {
    const current = this.getMetricValue(condition.metric, context);
    const total = this.getMetricValue(condition.of || "", context);

    if (total === 0) return false;

    const percentage = (current / total) * 100;
    return this.compareValues(
      percentage,
      condition.operator,
      condition.percentage || 0
    );
  }

  private evaluateRate(
    condition: AlertCondition & { type: "rate" },
    context: RuleContext
  ): boolean {
    // Calculate rate from metrics
    const errors = context.metrics.errors || 0;
    const total = context.metrics.requests || 1;
    const rate = errors / total;

    return this.compareValues(rate, condition.operator, condition.threshold);
  }

  private evaluatePercentile(
    condition: AlertCondition & { type: "percentile" },
    context: RuleContext
  ): boolean {
    // This would need historical data to calculate percentiles
    // Simplified for this implementation
    const value = this.getMetricValue(condition.metric, context);
    return this.compareValues(value, condition.operator, condition.value || 0);
  }

  private evaluateHealth(
    condition: AlertCondition & { type: "health" },
    context: RuleContext
  ): boolean {
    const health = context.metrics.health?.[condition.service || ""];
    return health === condition.status;
  }

  private evaluateAnomaly(
    condition: AlertCondition & { type: "anomaly" },
    context: RuleContext
  ): boolean {
    // Simplified anomaly detection
    const value = this.getMetricValue(condition.metric, context);
    const baseline = context.baseline || value;
    const deviation = Math.abs(value - baseline) / baseline;

    const thresholds = {
      low: 0.5,
      medium: 0.3,
      high: 0.2,
    };

    return deviation > thresholds[condition.sensitivity || "medium"];
  }

  private evaluateCustom(
    condition: AlertCondition & { type: "custom" },
    context: RuleContext
  ): boolean {
    // Custom function evaluation
    if (typeof condition.function === "function") {
      return condition.function(context);
    }
    return false;
  }

  private getMetricValue(metric: string, context: RuleContext): number {
    const parts = metric.split(".");
    let value: any = context.metrics;

    for (const part of parts) {
      value = value?.[part];
      if (value === undefined) return 0;
    }

    return typeof value === "number" ? value : 0;
  }

  private compareValues(
    value: number,
    operator: AlertCondition["operator"],
    threshold: number
  ): boolean {
    switch (operator) {
      case ">":
        return value > threshold;
      case ">=":
        return value >= threshold;
      case "<":
        return value < threshold;
      case "<=":
        return value <= threshold;
      case "==":
        return value === threshold;
      case "!=":
        return value !== threshold;
      default:
        return false;
    }
  }

  private shouldFireAlert(
    rule: AlertRule,
    history: { consecutiveTriggers: number; lastTriggered?: Date }
  ): boolean {
    // Debouncing logic
    if (history.lastTriggered) {
      const timeSinceLastAlert = Date.now() - history.lastTriggered.getTime();
      const minInterval = rule.debounce || 300000; // 5 minutes default

      if (timeSinceLastAlert < minInterval) {
        return false;
      }
    }

    // Require consecutive triggers for stability
    const requiredTriggers = rule.consecutiveTriggers || 1;
    return history.consecutiveTriggers >= requiredTriggers;
  }

  private createAlert(rule: AlertRule, context: RuleContext): Alert {
    const alert: Alert = {
      id: `${rule.id}_${Date.now()}`,
      rule: rule.id,
      title: rule.name,
      message: this.generateMessage(rule, context),
      severity: rule.severity,
      timestamp: new Date(),
      metadata: this.extractMetadata(context),
      actions: rule.actions,
    };

    // Add analysis if available
    if (rule.analyze) {
      alert.analysis = this.generateAnalysis(rule, context);
    }

    // Add recommendations
    alert.recommendations = this.generateRecommendations(rule, context);

    return alert;
  }

  private generateMessage(rule: AlertRule, context: RuleContext): string {
    // Generate contextual message based on rule and current values
    const templates: Record<string, string> = {
      cost_spike_detection: `Cost has spiked to $${context.metrics.cost?.current.toFixed(2)}/hr (${(((context.metrics.cost?.current || 0) / (context.baseline || 1)) * 100).toFixed(0)}% of normal)`,
      daily_budget_exceeded: `Daily spending has reached $${context.metrics.cost?.daily.toFixed(2)}`,
      monthly_quota_warning: `Monthly usage at ${(((context.metrics.cost?.monthly || 0) / (context.metrics.quota?.monthly || 1)) * 100).toFixed(0)}% of quota`,
      error_rate_high: `Error rate at ${(((context.metrics.errors || 0) / (context.metrics.requests || 1)) * 100).toFixed(1)}%`,
      latency_degradation: `95th percentile latency at ${context.metrics.latency?.p95}ms`,
      provider_down: `${context.metrics.provider} is not responding`,
    };

    return templates[rule.id] || rule.description;
  }

  private generateAnalysis(rule: AlertRule, context: RuleContext): string {
    // Generate intelligent analysis based on metrics
    const analyses: Record<string, () => string> = {
      cost_spike_detection: () => {
        const topProvider = this.findTopCostProvider(context);
        const topModel = this.findTopCostModel(context);
        return `Primary cost driver: ${topProvider} using ${topModel}. Consider switching to a cheaper model or implementing caching.`;
      },
      error_rate_high: () => {
        const failingProvider = this.findFailingProvider(context);
        return `Errors primarily from ${failingProvider}. Check provider status and consider failover.`;
      },
    };

    const analysisFn = analyses[rule.id];
    return analysisFn ? analysisFn() : "";
  }

  private generateRecommendations(
    rule: AlertRule,
    context: RuleContext
  ): string[] {
    const recommendations: Record<string, string[]> = {
      cost_spike_detection: [
        "Review recent changes that might have increased usage",
        "Consider implementing request caching for repeated queries",
        "Evaluate if cheaper models can serve current use cases",
        "Set up rate limiting to prevent runaway costs",
      ],
      daily_budget_exceeded: [
        "Reduce usage of expensive models like GPT-4",
        "Implement daily rate limits",
        "Review and optimize prompts to use fewer tokens",
        "Consider batching requests to reduce overhead",
      ],
      error_rate_high: [
        "Check AI provider status pages",
        "Implement retry logic with exponential backoff",
        "Consider failover to alternative providers",
        "Review error logs for patterns",
      ],
    };

    return recommendations[rule.id] || [];
  }

  private extractMetadata(context: RuleContext): Record<string, any> {
    return {
      current_value: context.metrics.cost?.current,
      baseline: context.baseline,
      trend: context.trend,
      provider_breakdown: context.metrics.providers,
      timestamp: new Date().toISOString(),
    };
  }

  private calculateNextEvaluation(rule: AlertRule): Date {
    const interval = rule.evaluationInterval || 60000; // 1 minute default
    return new Date(Date.now() + interval);
  }

  private findTopCostProvider(context: RuleContext): string {
    const providers = context.metrics.providers || {};
    return Object.entries(providers).reduce(
      (a, b) => (a[1].cost > b[1].cost ? a : b),
      ["unknown", { cost: 0 }]
    )[0];
  }

  private findTopCostModel(context: RuleContext): string {
    const models = context.metrics.models || {};
    return Object.entries(models).reduce(
      (a, b) => (a[1].cost > b[1].cost ? a : b),
      ["unknown", { cost: 0 }]
    )[0];
  }

  private findFailingProvider(context: RuleContext): string {
    const providers = context.metrics.providers || {};
    return Object.entries(providers).reduce(
      (a, b) => (a[1].errors > b[1].errors ? a : b),
      ["unknown", { errors: 0 }]
    )[0];
  }
}

/**
 * Custom Rule Builder for user-defined rules
 */
export class CustomRuleBuilder {
  static createCostThresholdRule(config: {
    name: string;
    threshold: number;
    window?: number;
    severity?: Alert["severity"];
  }): AlertRule {
    return {
      id: `custom_cost_${Date.now()}`,
      name: config.name,
      description: `Alert when cost exceeds $${config.threshold}`,
      category: "cost",
      enabled: true,
      severity: config.severity || "warning",
      channels: [],
      conditions: [
        {
          type: "threshold_static",
          metric: "cost.current",
          operator: ">",
          value: config.threshold,
          timeWindow: config.window,
        },
      ],
    };
  }

  static createModelUsageRule(config: {
    model: string;
    provider: string;
    maxRequests: number;
    window: number;
  }): AlertRule {
    return {
      id: `custom_model_usage_${Date.now()}`,
      name: `${config.model} Usage Limit`,
      description: `Alert when ${config.model} usage exceeds ${config.maxRequests} requests`,
      category: "limits",
      enabled: true,
      severity: "warning",
      channels: [],
      conditions: [
        {
          type: "custom",
          metric: "models.usage",
          operator: ">",
          function: (context: RuleContext) => {
            const usage = context.metrics.models?.[config.model]?.requests || 0;
            return usage > config.maxRequests;
          },
        },
      ],
    };
  }

  static createCompositeRule(config: {
    name: string;
    conditions: AlertCondition[];
    operator: "AND" | "OR";
  }): AlertRule {
    return {
      id: `custom_composite_${Date.now()}`,
      name: config.name,
      description: `Composite rule with ${config.conditions.length} conditions`,
      category: "custom",
      enabled: true,
      severity: "warning",
      channels: [],
      conditions: [
        {
          type: "custom",
          metric: "composite",
          operator: ">",
          function: (context: RuleContext) => {
            const evaluator = new AlertRuleEvaluator();
            const results = config.conditions.map((condition) =>
              evaluator["evaluateCondition"](condition, context)
            );

            return config.operator === "AND"
              ? results.every((r) => r)
              : results.some((r) => r);
          },
        },
      ],
    };
  }
}
