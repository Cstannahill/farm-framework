/**
 * FARM Deployment Package
 * Revolutionary deployment system for FARM applications
 */

// Core deployment engine
export { DeployEngine } from "./engine/deploy-engine.js";

// Platform detection and recommendation
export { PlatformDetector } from "./detector/platform-detector.js";

// Platform-specific recipes
export { RailwayRecipe } from "./recipes/railway/railway-recipe.js";
export { FlyRecipe } from "./recipes/fly/fly-recipe.js";
export { VercelRecipe } from "./recipes/vercel/vercel-recipe.js";

// Cost estimation
export { CostEstimator } from "./cost/estimator.js";

// Health monitoring
export { HealthMonitor } from "./health/monitor.js";

// Rollback management
export { RollbackManager } from "./rollback/manager.js";

// UI components
export { DeploymentProgress } from "./ui/deployment-progress.js";
export { DeployWizard } from "./ui/deploy-wizard.js";

// Analytics
export { DeploymentAnalytics } from "./analytics/deployment-analytics.js";

// Error handling
export { DeployErrorHandler } from "./errors/deploy-error-handler.js";

// Utilities
export { GitInfo } from "./utils/git.js";
export { DockerfileOptimizer } from "./utils/dockerfile-optimizer.js";
export { RegionAnalyzer } from "./utils/region-analyzer.js";

// Recipe registry
export { RecipeRegistry } from "./recipes/registry.js";

// Re-export types for convenience
export type {
  Platform,
  DeployOptions,
  DeploymentPlan,
  DeploymentResult,
  PlatformRecommendation,
  DeploymentConfig,
  DeployRecipe,
  CostEstimate,
  DeploymentHealthStatus,
  DeploymentHealthCheck,
  Snapshot,
  RollbackOptions,
} from "@farm-framework/types";
