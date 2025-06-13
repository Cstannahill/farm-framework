// packages/observability/src/alerts/engine.ts
import type {
  AlertRule,
  Alert,
  AlertContext,
  AlertAction,
  AlertNotification,
  AlertCondition,
} from "@farm-framework/types";

export class SmartAlertEngine {
  private rules: AlertRule[] = [];

  constructor() {
    // Initialize with default smart rules
    this.initializeDefaultRules();
  }

  private initializeDefaultRules(): void {
    // Cost spike detection rule
    this.addRule({
      id: "cost_spike_detection",
      name: "Cost Spike Detection",
      description: "Detects when costs spike above normal baseline",
      category: "cost",
      enabled: true,
      conditions: [
        {
          type: "threshold_dynamic",
          metric: "cost.current",
          operator: ">",
          multiplier: 1.5,
          timeWindow: 300000, // 5 minutes
        },
      ],
      severity: "warning",
      channels: [],
      analyze: true,
    });

    // Monthly quota warning rule
    this.addRule({
      id: "quota_prediction",
      name: "Monthly Quota Warning",
      description: "Warns when approaching monthly quota limits",
      category: "quota",
      enabled: true,
      conditions: [
        {
          type: "percentage",
          metric: "cost.monthly",
          operator: ">",
          percentage: 80,
          of: "quota.monthly",
        },
      ],
      severity: "info",
      channels: [],
    });
  }

  addRule(rule: AlertRule): void {
    this.rules.push(rule);
  }

  async evaluateRules(metrics: AlertContext): Promise<Alert[]> {
    const triggeredAlerts: Alert[] = [];

    for (const rule of this.rules) {
      if (!rule.enabled) continue;

      if (await this.evaluateRule(rule, metrics)) {
        const alert = await this.createAlert(rule, metrics);
        triggeredAlerts.push(alert);
      }
    }

    return triggeredAlerts;
  }

  private async evaluateRule(
    rule: AlertRule,
    metrics: AlertContext
  ): Promise<boolean> {
    // Evaluate all conditions (for now, just use the first one)
    const condition = rule.conditions[0];
    if (!condition) return false;

    switch (condition.type) {
      case "threshold_dynamic":
        return this.evaluateDynamicThreshold(condition, metrics);
      case "percentage":
        return this.evaluatePercentage(condition, metrics);
      default:
        return false;
    }
  }

  private evaluateDynamicThreshold(
    condition: AlertCondition,
    metrics: AlertContext
  ): boolean {
    const current = this.getMetricValue(condition.metric, metrics);
    const baseline = 1.0; // Simplified baseline
    const threshold = baseline * (condition.multiplier || 1.5);

    return current > threshold;
  }

  private evaluatePercentage(
    condition: AlertCondition,
    metrics: AlertContext
  ): boolean {
    const current = this.getMetricValue(condition.metric, metrics);
    const total = this.getMetricValue(condition.of || "", metrics);

    if (total === 0) return false;

    const percentage = (current / total) * 100;
    return percentage > (condition.percentage || 80);
  }

  private getMetricValue(metricPath: string, metrics: AlertContext): number {
    const parts = metricPath.split(".");
    let value: any = metrics;

    for (const part of parts) {
      value = value?.[part];
      if (value === undefined) return 0;
    }

    return typeof value === "number" ? value : 0;
  }

  private async createAlert(
    rule: AlertRule,
    metrics: AlertContext
  ): Promise<Alert> {
    const alert: Alert = {
      id: `${rule.id}_${Date.now()}`,
      title: rule.name,
      message: rule.description || `Alert triggered for ${rule.name}`,
      severity: rule.severity,
      timestamp: new Date(),
      rule: rule.id,
      metadata: {
        metrics,
        rule: rule,
      },
    };

    if (rule.analyze) {
      alert.analysis = await this.analyzeCostSpike(metrics);
    }

    return alert;
  }

  async analyzeCostSpike(metrics: AlertContext): Promise<string> {
    // Generate analysis based on current metrics
    const currentCost = metrics.cost?.current || 0;
    const analysis =
      `Cost analysis: Current hourly rate is $${currentCost.toFixed(2)}. ` +
      `This represents a significant spike from normal usage patterns.`;

    return analysis;
  }

  async notify(notification: AlertNotification): Promise<void> {
    // Simplified notification - in real implementation would send to configured channels
    console.log(`🚨 Alert: ${notification.title}`);
    console.log(`   ${notification.message}`);
    console.log(`   Severity: ${notification.severity}`);

    if (notification.actions) {
      console.log("   Actions:");
      notification.actions.forEach((action) => {
        console.log(`   - ${action.label}`);
      });
    }
  }

  getDaysRemainingInMonth(): number {
    const now = new Date();
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const msPerDay = 24 * 60 * 60 * 1000;
    return Math.ceil((lastDayOfMonth.getTime() - now.getTime()) / msPerDay);
  }
}
