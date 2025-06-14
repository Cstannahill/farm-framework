import type {
  CostEstimate,
  CostItem,
  DeploymentPlan,
  Platform,
  FarmConfig,
} from "@farm-framework/types";

/**
 * Cost estimation engine for deployment planning
 */
export class CostEstimator {
  /**
   * Estimate deployment costs
   */
  async estimate(plan: DeploymentPlan): Promise<CostEstimate> {
    const costs = {
      compute: this.estimateCompute(plan),
      storage: this.estimateStorage(plan),
      bandwidth: this.estimateBandwidth(plan),
      ai: this.estimateAICosts(plan),
      addons: this.estimateAddons(plan),
    };

    const total = Object.values(costs).reduce(
      (sum, cost) => sum + cost.monthly,
      0
    );

    return {
      monthly: total,
      formatted: this.formatCost(total),
      breakdown: costs,
      comparison: await this.compareWithOtherPlatforms(plan, total),
      optimization: this.suggestOptimizations(costs),
    };
  }

  /**
   * Estimate compute costs
   */
  private estimateCompute(plan: DeploymentPlan): CostItem {
    let cost = 0;

    switch (plan.platform) {
      case "railway":
        // Railway pricing: $5/month starter, $20/month pro
        cost = plan.services.length <= 1 ? 5 : 20;
        break;
      case "vercel":
        // Vercel is free for personal projects
        cost = 0;
        break;
      case "fly":
        // Fly.io: ~$10/month for basic app
        cost = 10 + (plan.services.length - 1) * 5;
        break;
      case "aws":
        // AWS: Variable, estimate $50/month minimum
        cost = 50 + plan.services.length * 20;
        break;
      case "gcp":
        // GCP: Similar to AWS
        cost = 40 + plan.services.length * 15;
        break;
    }

    return {
      monthly: cost,
      description: "Computing resources and runtime",
      optimizable: true,
    };
  }

  /**
   * Estimate storage costs
   */
  private estimateStorage(plan: DeploymentPlan): CostItem {
    let cost = 0;

    // Database storage
    if (plan.services.some((s) => s.type === "database")) {
      switch (plan.platform) {
        case "railway":
          cost += 10; // PostgreSQL addon
          break;
        case "vercel":
          cost += 0; // Usually external database
          break;
        case "fly":
          cost += 15; // Persistent volumes
          break;
        case "aws":
          cost += 25; // RDS
          break;
        case "gcp":
          cost += 20; // Cloud SQL
          break;
      }
    }

    // AI model storage
    if (plan.services.some((s) => s.type === "ai")) {
      cost += 5; // Model storage
    }

    return {
      monthly: cost,
      description: "Database and file storage",
      optimizable: true,
    };
  }

  /**
   * Estimate bandwidth costs
   */
  private estimateBandwidth(plan: DeploymentPlan): CostItem {
    // Most platforms include generous bandwidth allowances
    let cost = 0;

    // Only AWS/GCP typically charge for bandwidth
    if (plan.platform === "aws" || plan.platform === "gcp") {
      cost = 5; // Estimate for moderate traffic
    }

    return {
      monthly: cost,
      description: "Data transfer and CDN",
      optimizable: false,
    };
  }

  /**
   * Estimate AI-specific costs
   */
  private estimateAICosts(plan: DeploymentPlan): CostItem {
    let cost = 0;

    // Ollama hosting costs (additional compute for AI workloads)
    if (plan.services.some((s) => s.type === "ai")) {
      switch (plan.platform) {
        case "railway":
          cost += 20; // Higher resource usage
          break;
        case "fly":
          cost += 25; // GPU instances
          break;
        case "aws":
          cost += 100; // GPU instances are expensive
          break;
        case "gcp":
          cost += 80; // GPU instances
          break;
      }
    }

    // OpenAI API costs (estimated)
    if (plan.config.ai?.providers?.openai?.enabled) {
      cost += 10; // Conservative estimate for API usage
    }

    return {
      monthly: cost,
      description: "AI/ML inference and GPU compute",
      optimizable: true,
    };
  }

  /**
   * Estimate addon costs
   */
  private estimateAddons(plan: DeploymentPlan): CostItem {
    let cost = 0;

    // Redis cache
    if (plan.services.some((s) => s.type === "cache")) {
      cost += 8;
    }

    // Monitoring/observability
    if (plan.config.observability?.enabled) {
      cost += 5;
    }

    return {
      monthly: cost,
      description: "Additional services and monitoring",
      optimizable: true,
    };
  }

  /**
   * Format cost for display
   */
  private formatCost(cost: number): string {
    if (cost === 0) {
      return "Free";
    }
    return `$${cost}/month`;
  }

  /**
   * Compare costs across platforms
   */
  private async compareWithOtherPlatforms(
    plan: DeploymentPlan,
    currentCost: number
  ): Promise<
    Array<{
      platform: Platform;
      cost: number;
      savings?: number;
    }>
  > {
    const platforms: Platform[] = ["railway", "vercel", "fly", "aws", "gcp"];
    const comparisons = [];

    for (const platform of platforms) {
      if (platform === plan.platform) continue;

      const estimatedCost = await this.estimatePlatformCost(plan, platform);
      comparisons.push({
        platform,
        cost: estimatedCost,
        savings:
          currentCost > estimatedCost ? currentCost - estimatedCost : undefined,
      });
    }

    return comparisons.sort((a, b) => a.cost - b.cost);
  }

  /**
   * Estimate cost for a specific platform
   */
  private async estimatePlatformCost(
    plan: DeploymentPlan,
    platform: Platform
  ): Promise<number> {
    const platformPlan = { ...plan, platform };
    const estimate = await this.estimate(platformPlan);
    return estimate.monthly;
  }

  /**
   * Suggest cost optimizations
   */
  private suggestOptimizations(costs: Record<string, CostItem>): string[] {
    const suggestions: string[] = [];

    // High compute costs
    if (costs.compute.monthly > 50) {
      suggestions.push(
        "Consider using smaller instance sizes or fewer replicas"
      );
    }

    // High AI costs
    if (costs.ai.monthly > 50) {
      suggestions.push(
        "Consider running AI models on CPU instead of GPU for development"
      );
      suggestions.push("Use API-based AI providers for lower volume workloads");
    }

    // High storage costs
    if (costs.storage.monthly > 30) {
      suggestions.push(
        "Consider using external database services or optimize data retention"
      );
    }

    // General suggestions
    if (Object.values(costs).some((c) => c.monthly > 0)) {
      suggestions.push(
        "Use preview deployments for testing to reduce production costs"
      );
      suggestions.push(
        "Monitor usage patterns and scale down during low-traffic periods"
      );
    }

    return suggestions;
  }

  /**
   * Get cost breakdown by service
   */
  async getCostByService(
    plan: DeploymentPlan
  ): Promise<Record<string, number>> {
    const serviceCosts: Record<string, number> = {};

    for (const service of plan.services) {
      serviceCosts[service.name] = this.estimateServiceCost(
        service,
        plan.platform
      );
    }

    return serviceCosts;
  }

  /**
   * Estimate cost for individual service
   */
  private estimateServiceCost(service: any, platform: Platform): number {
    let baseCost = 0;

    switch (service.type) {
      case "web":
      case "api":
        baseCost = 10;
        break;
      case "database":
        baseCost = 15;
        break;
      case "ai":
        baseCost = 25;
        break;
      case "cache":
        baseCost = 8;
        break;
      case "worker":
        baseCost = 12;
        break;
    }

    // Platform multipliers
    switch (platform) {
      case "railway":
        return baseCost * 0.8; // Generally cheaper
      case "vercel":
        return baseCost * 0.5; // Many things are free
      case "fly":
        return baseCost * 1.0; // Baseline
      case "aws":
        return baseCost * 2.0; // More expensive but more features
      case "gcp":
        return baseCost * 1.8; // Similar to AWS
      default:
        return baseCost;
    }
  }
}
