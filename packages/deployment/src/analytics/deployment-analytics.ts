import type {
  DeploymentResult,
  DeploymentMetrics,
  Platform,
} from "@farm-framework/types";

/**
 * Analytics for tracking deployment metrics and success rates
 */
export class DeploymentAnalytics {
  private metrics: DeploymentMetrics[] = [];

  /**
   * Track a deployment event
   */
  async trackDeployment(result: DeploymentResult): Promise<void> {
    const metrics: DeploymentMetrics = {
      platform: result.platform,
      duration: result.duration,
      success: result.success,
      services: result.services.length,
      hasAI: result.services.some((s) => s.type === "ai"),
      region: result.region as any,
      cost: result.estimatedCost || 0,
      errors: result.errors?.length || 0,
      rollbacks: result.rollback?.available ? 1 : 0,
    };

    // Store metrics (in production, this would send to analytics service)
    this.metrics.push(metrics);

    // Send to analytics provider if configured
    await this.sendToProvider(metrics);

    // Show success summary
    if (result.success) {
      this.showSuccessSummary(result);
    }
  }

  /**
   * Get deployment statistics
   */
  async getStatistics(): Promise<{
    totalDeployments: number;
    successRate: number;
    averageDuration: number;
    platformBreakdown: Record<Platform, number>;
    errorBreakdown: Record<string, number>;
  }> {
    const total = this.metrics.length;
    const successful = this.metrics.filter((m) => m.success).length;
    const avgDuration =
      total > 0
        ? this.metrics.reduce((sum, m) => sum + m.duration, 0) / total
        : 0;

    const platformBreakdown = this.metrics.reduce(
      (acc, m) => {
        acc[m.platform] = (acc[m.platform] || 0) + 1;
        return acc;
      },
      {} as Record<Platform, number>
    );

    return {
      totalDeployments: total,
      successRate: total > 0 ? (successful / total) * 100 : 0,
      averageDuration: avgDuration,
      platformBreakdown,
      errorBreakdown: {}, // Would be populated from error tracking
    };
  }

  /**
   * Send metrics to analytics provider
   */
  private async sendToProvider(metrics: DeploymentMetrics): Promise<void> {
    // In production, this would send to services like:
    // - Mixpanel
    // - PostHog
    // - Google Analytics
    // - Custom analytics endpoint

    const analyticsUrl = process.env.FARM_ANALYTICS_URL;
    if (!analyticsUrl) {
      return; // Analytics not configured
    }

    try {
      await fetch(analyticsUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.FARM_ANALYTICS_TOKEN}`,
        },
        body: JSON.stringify({
          event: "deployment",
          properties: metrics,
          timestamp: Date.now(),
        }),
      });
    } catch (error) {
      // Silently fail analytics - don't block deployment
      console.debug("Analytics tracking failed:", error);
    }
  }

  /**
   * Show deployment success summary
   */
  private showSuccessSummary(result: DeploymentResult): void {
    console.log("\n🎉 Deployment successful!\n");

    console.log("📊 Summary:");
    console.log(`  Platform: ${result.platform}`);
    console.log(`  URL: ${this.formatUrl(result.url)}`);
    console.log(`  Duration: ${this.formatDuration(result.duration)}`);
    console.log(`  Services: ${result.services.map((s) => s.name).join(", ")}`);
    console.log(`  Region: ${result.region}`);

    if (result.estimatedCost) {
      console.log(`  Estimated cost: $${result.estimatedCost}/month`);
    }

    if (result.preview) {
      console.log(`  Preview: ${this.formatUrl(result.preview)}`);
    }

    console.log("\n📝 Next steps:");
    console.log(`  1. Check deployment: farm deploy status ${result.id}`);
    console.log(`  2. View logs: farm deploy logs ${result.id}`);
    console.log(`  3. Monitor costs: farm deploy cost current`);

    if (result.services.some((s) => s.type === "ai")) {
      console.log(`  4. Test AI endpoints: farm ai test --production`);
    }

    // Show platform-specific next steps
    this.showPlatformSpecificSteps(result);
  }

  /**
   * Show platform-specific next steps
   */
  private showPlatformSpecificSteps(result: DeploymentResult): void {
    console.log("\n🎯 Platform-specific tips:");

    switch (result.platform) {
      case "railway":
        console.log(
          "  • View Railway dashboard: https://railway.app/dashboard"
        );
        console.log("  • Scale services: railway service scale");
        console.log("  • Check metrics: railway metrics");
        break;

      case "vercel":
        console.log("  • View Vercel dashboard: https://vercel.com/dashboard");
        console.log("  • Setup custom domain: vercel domains add");
        console.log("  • Check analytics: vercel analytics");
        break;

      case "fly":
        console.log("  • View Fly dashboard: https://fly.io/dashboard");
        console.log("  • Scale globally: fly scale count 3");
        console.log("  • Check metrics: fly metrics");
        break;

      case "aws":
        console.log("  • View AWS Console: https://console.aws.amazon.com");
        console.log("  • Setup monitoring: aws cloudwatch");
        console.log("  • Check costs: aws billing");
        break;

      case "gcp":
        console.log("  • View GCP Console: https://console.cloud.google.com");
        console.log("  • Setup monitoring: gcloud monitoring");
        console.log("  • Check costs: gcloud billing");
        break;
    }
  }

  /**
   * Format URL for display
   */
  private formatUrl(url?: string): string {
    if (!url) return "Not available";

    // Use colors if available (would use chalk in real implementation)
    return url;
  }

  /**
   * Format duration for display
   */
  private formatDuration(duration: number): string {
    const seconds = Math.floor(duration / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }

    return `${remainingSeconds}s`;
  }

  /**
   * Track deployment failure
   */
  async trackFailure(result: DeploymentResult, error: Error): Promise<void> {
    const metrics: DeploymentMetrics = {
      platform: result.platform,
      duration: result.duration,
      success: false,
      services: result.services.length,
      hasAI: result.services.some((s) => s.type === "ai"),
      region: result.region as any,
      cost: 0,
      errors: 1,
    };

    this.metrics.push(metrics);

    // Send failure event to analytics
    await this.sendFailureEvent(metrics, error);
  }

  /**
   * Send failure event to analytics
   */
  private async sendFailureEvent(
    metrics: DeploymentMetrics,
    error: Error
  ): Promise<void> {
    const analyticsUrl = process.env.FARM_ANALYTICS_URL;
    if (!analyticsUrl) return;

    try {
      await fetch(analyticsUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.FARM_ANALYTICS_TOKEN}`,
        },
        body: JSON.stringify({
          event: "deployment_failure",
          properties: {
            ...metrics,
            errorMessage: error.message,
            errorStack: error.stack,
          },
          timestamp: Date.now(),
        }),
      });
    } catch {
      // Silently fail
    }
  }

  /**
   * Generate deployment report
   */
  async generateReport(): Promise<string> {
    const stats = await this.getStatistics();

    const report = `
# Deployment Analytics Report

## Summary
- Total Deployments: ${stats.totalDeployments}
- Success Rate: ${stats.successRate.toFixed(1)}%
- Average Duration: ${this.formatDuration(stats.averageDuration)}

## Platform Breakdown
${Object.entries(stats.platformBreakdown)
  .map(([platform, count]) => `- ${platform}: ${count} deployments`)
  .join("\n")}

Generated at: ${new Date().toISOString()}
    `.trim();

    return report;
  }
}
