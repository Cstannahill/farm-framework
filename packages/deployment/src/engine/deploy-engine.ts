import { EventEmitter } from "events";
import type {
  DeploymentPlan,
  DeploymentResult,
  DeployOptions,
  DeployContext,
  Platform,
  FarmConfig,
  ProgressUpdate,
  DeploymentError,
} from "@farm-framework/types";

import { PlatformDetector } from "../detector/platform-detector.js";
import { RecipeRegistry } from "../recipes/registry.js";
import { RollbackManager } from "../rollback/manager.js";
import { HealthMonitor } from "../health/monitor.js";
import { DeploymentAnalytics } from "../analytics/deployment-analytics.js";
import { DeployErrorHandler } from "../errors/deploy-error-handler.js";
import { GitInfo } from "../utils/git.js";
import { generateId } from "../utils/id.js";

/**
 * Main deployment engine that orchestrates the entire deployment process
 */
export class DeployEngine extends EventEmitter {
  private config: FarmConfig;
  private workingDir: string;
  private plan?: DeploymentPlan;
  private rollbackManager: RollbackManager;
  private healthMonitor: HealthMonitor;
  private analytics: DeploymentAnalytics;
  private errorHandler: DeployErrorHandler;
  private gitInfo: GitInfo;

  constructor(config: FarmConfig, workingDir: string = process.cwd()) {
    super();
    this.config = config;
    this.workingDir = workingDir;
    this.rollbackManager = new RollbackManager();
    this.healthMonitor = new HealthMonitor(config);
    this.analytics = new DeploymentAnalytics();
    this.errorHandler = new DeployErrorHandler();
    this.gitInfo = new GitInfo(workingDir);
  }

  /**
   * Main deployment method
   */
  async deploy(options: DeployOptions = {}): Promise<DeploymentResult> {
    const startTime = Date.now();
    let result: DeploymentResult;

    try {
      // Phase 1: Detection and Planning
      this.emit("status", {
        phase: "detection",
        message: "🔍 Analyzing project and detecting optimal platform...",
        percent: 0,
      } as ProgressUpdate);

      const platform = await this.detectPlatform(options);

      this.emit("status", {
        phase: "detection",
        message: `🎯 Selected platform: ${platform}`,
        percent: 10,
        platform,
      } as ProgressUpdate);

      // Phase 2: Generate deployment plan
      this.emit("status", {
        phase: "planning",
        message: "📋 Generating deployment plan...",
        percent: 20,
      } as ProgressUpdate);

      this.plan = await this.generatePlan(platform, options);

      // Phase 3: Show confirmation (if not auto-confirmed)
      if (!options.yes && !options.dryRun) {
        const confirmed = await this.showDeploymentPlan(this.plan);
        if (!confirmed) {
          return {
            success: false,
            cancelled: true,
            platform,
            environment: options.environment || "production",
            id: this.plan.id,
            services: [],
            duration: Date.now() - startTime,
            region: this.plan.region,
          };
        }
      }

      // Phase 4: Create deployment context
      const context = await this.createDeployContext(options);

      // Phase 5: Execute deployment
      this.emit("status", {
        phase: "execution",
        message: "🚀 Starting deployment...",
        percent: 30,
      } as ProgressUpdate);

      if (options.dryRun) {
        result = await this.executeDryRun(this.plan, context);
      } else {
        result = await this.executeDeployment(this.plan, context);
      }

      // Phase 6: Post-deployment
      if (result.success && !options.dryRun) {
        await this.postDeployment(result, context);
      }

      // Analytics
      await this.analytics.trackDeployment(result);

      return result;
    } catch (error) {
      const deployError = this.errorHandler.handle(error as Error);

      result = {
        success: false,
        platform: options.platform || "railway",
        environment: options.environment || "production",
        id: this.plan?.id || generateId(),
        services: [],
        duration: Date.now() - startTime,
        region: this.plan?.region || "us-east-1",
        errors: [deployError],
      };

      // Attempt rollback if deployment started
      if (this.plan && !options.dryRun) {
        await this.handleDeploymentFailure(result, deployError);
      }

      await this.analytics.trackDeployment(result);
      throw error;
    }
  }

  /**
   * Detect optimal platform or use specified platform
   */
  private async detectPlatform(options: DeployOptions): Promise<Platform> {
    if (options.platform) {
      return options.platform;
    }

    const detector = new PlatformDetector(this.config, this.workingDir);
    const recommendation = await detector.detectOptimalPlatform();

    this.emit("recommendation", recommendation);
    return recommendation.recommended;
  }

  /**
   * Generate deployment plan using the selected platform recipe
   */
  private async generatePlan(
    platform: Platform,
    options: DeployOptions
  ): Promise<DeploymentPlan> {
    const recipe = RecipeRegistry.getRecipe(platform);
    if (!recipe) {
      throw new Error(`No recipe found for platform: ${platform}`);
    }

    const plan = await recipe.generatePlan(this.config, options);

    // Add deployment metadata
    plan.id = generateId();
    plan.startTime = Date.now();

    this.emit("plan", plan);
    return plan;
  }

  /**
   * Show deployment plan to user for confirmation
   */
  private async showDeploymentPlan(plan: DeploymentPlan): Promise<boolean> {
    // This will be implemented with actual CLI prompts
    // For now, emit event for UI to handle
    this.emit("planConfirmation", plan);

    // Simulate confirmation for now
    return true;
  }

  /**
   * Create deployment context
   */
  private async createDeployContext(
    options: DeployOptions
  ): Promise<DeployContext> {
    return {
      workingDir: this.workingDir,
      gitBranch: await this.gitInfo.getBranch(),
      gitCommit: await this.gitInfo.getCommit(),
      buildId: generateId(),
      timestamp: Date.now(),
      user: process.env.USER || process.env.USERNAME,
      ci: !!(process.env.CI || process.env.GITHUB_ACTIONS),
      // Legacy compatibility
      cwd: this.workingDir,
      config: this.config,
      options,
    };
  }

  /**
   * Execute dry run deployment
   */
  private async executeDryRun(
    plan: DeploymentPlan,
    context: DeployContext
  ): Promise<DeploymentResult> {
    this.emit("status", {
      phase: "dry-run",
      message: "🔍 Dry run - no actual deployment will occur",
      percent: 50,
    } as ProgressUpdate);

    // Simulate deployment steps
    for (let i = 0; i < plan.steps.length; i++) {
      const step = plan.steps[i];
      this.emit("status", {
        phase: "dry-run",
        message: `Would execute: ${step.name}`,
        percent: 50 + (i / plan.steps.length) * 40,
      } as ProgressUpdate);

      // Simulate processing time
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    return {
      success: true,
      platform: plan.platform,
      environment: plan.environment,
      id: plan.id,
      url: `https://farm-app-${plan.id}.${plan.platform}.com`,
      services: plan.services.map((s) => ({
        name: s.name,
        type: s.type,
        status: "running" as const,
      })),
      duration: Date.now() - plan.startTime,
      region: plan.region,
      estimatedCost: plan.estimatedCost.monthly,
    };
  }

  /**
   * Execute actual deployment
   */
  private async executeDeployment(
    plan: DeploymentPlan,
    context: DeployContext
  ): Promise<DeploymentResult> {
    const recipe = RecipeRegistry.getRecipe(plan.platform);
    if (!recipe) {
      throw new Error(`Recipe not found for platform: ${plan.platform}`);
    }

    // Execute preflight checks
    await this.preflightChecks(plan, context);

    // Execute deployment via recipe
    this.emit("status", {
      phase: "execution",
      message: "⚡ Executing deployment...",
      percent: 40,
    } as ProgressUpdate);

    const result = await recipe.execute(plan, context);

    this.emit("status", {
      phase: "execution",
      message: "✅ Deployment completed successfully!",
      percent: 90,
    } as ProgressUpdate);

    return result;
  }

  /**
   * Post-deployment tasks
   */
  private async postDeployment(
    result: DeploymentResult,
    context: DeployContext
  ): Promise<void> {
    this.emit("status", {
      phase: "post-deployment",
      message: "🔍 Running health checks...",
      percent: 95,
    } as ProgressUpdate);

    // Health checks
    const healthStatus = await this.healthMonitor.checkDeployment(result);

    if (!healthStatus.healthy) {
      this.emit("warning", {
        message: `Health checks failed: ${healthStatus.recommendation}`,
        details: healthStatus,
      });
    }

    // Create snapshot for rollback
    if (this.config.deployment?.rollback?.enabled !== false) {
      await this.rollbackManager.createSnapshot({
        id: generateId(),
        timestamp: Date.now(),
        deployment: result.id,
        environment: result.environment,
        platform: result.platform,
        healthy: healthStatus.healthy,
        state: {
          containers: {},
          environment: context.options.secrets || {},
          config: this.config,
        },
        metadata: {
          gitCommit: context.gitCommit,
          buildId: context.buildId,
          user: context.user,
        },
      });
    }

    this.emit("status", {
      phase: "complete",
      message: "🎉 Deployment completed successfully!",
      percent: 100,
    } as ProgressUpdate);
  }

  /**
   * Preflight checks before deployment
   */
  private async preflightChecks(
    plan: DeploymentPlan,
    context: DeployContext
  ): Promise<void> {
    this.emit("status", {
      phase: "preflight",
      message: "🔍 Running preflight checks...",
      percent: 25,
    } as ProgressUpdate);

    // Check git status
    if (!(await this.gitInfo.isClean()) && !context.options.force) {
      throw new Error(
        "Working directory has uncommitted changes. Use --force to override."
      );
    }

    // Check required environment variables
    const requiredEnvVars = this.getRequiredEnvVars(plan);
    const missingVars = requiredEnvVars.filter(
      (varName) => !process.env[varName]
    );

    if (missingVars.length > 0) {
      throw new Error(
        `Missing required environment variables: ${missingVars.join(", ")}`
      );
    }

    this.emit("status", {
      phase: "preflight",
      message: "✅ Preflight checks passed",
      percent: 30,
    } as ProgressUpdate);
  }

  /**
   * Handle deployment failure and attempt rollback
   */
  private async handleDeploymentFailure(
    result: DeploymentResult,
    error: DeploymentError
  ): Promise<void> {
    if (
      error.recoverable &&
      this.config.deployment?.rollback?.enabled !== false
    ) {
      try {
        this.emit("status", {
          phase: "rollback",
          message: "🔄 Deployment failed, attempting rollback...",
          percent: 0,
        } as ProgressUpdate);

        await this.rollbackManager.rollback(result.id);

        this.emit("status", {
          phase: "rollback",
          message: "✅ Rollback completed successfully",
          percent: 100,
        } as ProgressUpdate);
      } catch (rollbackError) {
        this.emit("error", {
          message: "Rollback failed",
          error: rollbackError,
        });
      }
    }
  }

  /**
   * Get required environment variables for deployment
   */
  private getRequiredEnvVars(plan: DeploymentPlan): string[] {
    const required: string[] = [];

    // Platform-specific requirements
    switch (plan.platform) {
      case "railway":
        if (!process.env.RAILWAY_TOKEN) required.push("RAILWAY_TOKEN");
        break;
      case "vercel":
        if (!process.env.VERCEL_TOKEN) required.push("VERCEL_TOKEN");
        break;
      case "fly":
        if (!process.env.FLY_TOKEN) required.push("FLY_TOKEN");
        break;
    }

    // Database requirements
    if (plan.services.some((s) => s.type === "database")) {
      if (!process.env.DATABASE_URL) required.push("DATABASE_URL");
    }

    return required;
  }
}
