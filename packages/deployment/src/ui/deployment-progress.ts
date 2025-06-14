import type { DeploymentPlan, ProgressUpdate } from "@farm-framework/types";

/**
 * Beautiful CLI progress visualization for deployments
 */
export class DeploymentProgress {
  private plan: DeploymentPlan;
  private currentStep: number = 0;

  constructor(plan: DeploymentPlan) {
    this.plan = plan;
  }

  /**
   * Start tracking deployment progress
   */
  start(): void {
    this.renderHeader();
    this.renderStepList();
  }

  /**
   * Update progress based on status
   */
  updateProgress(update: ProgressUpdate): void {
    // Clear previous output and re-render
    process.stdout.write("\x1b[2J\x1b[0f"); // Clear screen

    this.renderHeader();
    this.renderProgressBar(update.percent);
    this.renderCurrentStatus(update);
    this.renderStepList();
  }

  /**
   * Mark deployment as complete
   */
  complete(): void {
    console.log("\n🎉 Deployment completed successfully!");
  }

  /**
   * Mark deployment as failed
   */
  failed(error: string): void {
    console.log(`\n❌ Deployment failed: ${error}`);
  }

  /**
   * Render deployment header
   */
  private renderHeader(): void {
    console.log("\n🚀 FARM Deployment\n");
    console.log(`Platform: ${this.plan.platform}`);
    console.log(`Environment: ${this.plan.environment}`);
    console.log(`Region: ${this.plan.region}`);
    console.log("─".repeat(50));
  }

  /**
   * Render progress bar
   */
  private renderProgressBar(percent: number): void {
    const width = 40;
    const filled = Math.floor((percent / 100) * width);
    const empty = width - filled;

    const bar = "█".repeat(filled) + "░".repeat(empty);
    console.log(`\nProgress: [${bar}] ${percent.toFixed(1)}%`);
  }

  /**
   * Render current status
   */
  private renderCurrentStatus(update: ProgressUpdate): void {
    console.log(`\nCurrent: ${update.message}`);
    if (update.step) {
      console.log(`Step: ${update.step}`);
    }
  }

  /**
   * Render step list
   */
  private renderStepList(): void {
    console.log("\n📋 Steps:");

    this.plan.steps.forEach((step, index) => {
      const icon = this.getStepIcon(step.status);
      const status = step.status.charAt(0).toUpperCase() + step.status.slice(1);

      console.log(`  ${icon} ${step.name} - ${status}`);

      if (step.error) {
        console.log(`    ❌ ${step.error}`);
      }
    });
  }

  /**
   * Get icon for step status
   */
  private getStepIcon(status: string): string {
    switch (status) {
      case "completed":
        return "✅";
      case "running":
        return "🔄";
      case "failed":
        return "❌";
      case "pending":
      default:
        return "⏳";
    }
  }

  /**
   * Create a simple progress tracker (non-interactive)
   */
  static createSimple(): {
    log: (message: string) => void;
    error: (message: string) => void;
    success: (message: string) => void;
  } {
    return {
      log: (message: string) => console.log(`  ${message}`),
      error: (message: string) => console.error(`  ❌ ${message}`),
      success: (message: string) => console.log(`  ✅ ${message}`),
    };
  }
}
