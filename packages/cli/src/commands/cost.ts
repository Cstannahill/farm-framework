/**
 * FARM CLI Cost Management Commands
 * Implements full cost analysis, estimation, and optimization functionality
 */

import { Command } from "commander";
import chalk from "chalk";
import {
  CostAnalyzer,
  CostCalculator,
  CostOptimizer,
  CostPredictor,
} from "@farm-framework/observability";
import { CostEstimator } from "@farm-framework/deployment";
import type {
  DeployCommandOptions,
  CostAnalysis,
  CostData,
  OptimizationPlan,
  CostPrediction,
  DeploymentPlan,
  AIMetrics,
  AnalysisOptions,
  FarmConfig,
  CostEstimate,
  CostItem,
  AlertSummary,
} from "@farm-framework/types";
import { styles, icons } from "../utils/styling.js";
import { handleCommandError, logVerbose } from "../core/cli.js";
import { loadFarmConfig } from "../utils/config.js";

/**
 * Cost estimation command implementation
 */
export async function estimateCostCommand(options: {
  platform?: string;
  region?: string;
  verbose?: boolean;
}): Promise<void> {
  try {
    console.log(styles.title(`\n${icons.money} FARM Cost Estimation`));
    console.log(styles.muted("Calculate deployment costs before you deploy\n"));

    logVerbose("Loading project configuration...", options);
    const config = await loadFarmConfig();

    logVerbose("Initializing cost estimator...", options);
    const costEstimator = new CostEstimator();

    // Create a mock deployment plan for estimation
    const mockPlan: DeploymentPlan = {
      id: `estimate_${Date.now()}`,
      platform:
        (options.platform as any) ||
        config.deployment?.defaultPlatform ||
        "railway",
      region: options.region || config.deployment?.defaultRegion || "us-east-1",
      environment: "production",
      strategy: "rolling",
      services: generateServicesFromConfig(config),
      estimatedCost: {
        monthly: 0,
        formatted: "$0",
        breakdown: {
          compute: { monthly: 0, description: "", optimizable: false },
          storage: { monthly: 0, description: "", optimizable: false },
          bandwidth: { monthly: 0, description: "", optimizable: false },
          ai: { monthly: 0, description: "", optimizable: false },
          addons: { monthly: 0, description: "", optimizable: false },
        },
      },
      estimatedTime: 5,
      startTime: Date.now(),
      config,
      steps: [],
    };

    console.log(styles.info("📊 Analyzing project requirements..."));

    // Estimate costs
    const costEstimate = await costEstimator.estimate(mockPlan);

    // Display results
    console.log(styles.success(`\n✅ Cost estimation complete!\n`));

    console.log(styles.subtitle("💰 Estimated Monthly Costs:"));
    console.log(styles.muted("─".repeat(50)));
    console.log(styles.success(`Total: ${costEstimate.formatted}`));

    console.log("\n📋 Cost Breakdown:");
    Object.entries(costEstimate.breakdown).forEach(([category, cost]) => {
      const costItem = cost as CostItem;
      if (costItem.monthly > 0) {
        const optimizable = costItem.optimizable
          ? chalk.yellow(" (optimizable)")
          : "";
        console.log(
          `  ${category.padEnd(12)}: $${costItem.monthly.toFixed(2).padStart(8)} - ${costItem.description}${optimizable}`
        );
      }
    });

    // Platform comparison if available
    if (costEstimate.comparison && costEstimate.comparison.length > 0) {
      console.log("\n🔍 Platform Comparison:");
      console.log(styles.muted("─".repeat(50)));
      costEstimate.comparison.forEach((comp: any) => {
        const savings = comp.savings
          ? ` (saves $${comp.savings.toFixed(2)}/month)`
          : "";
        const color =
          comp.savings && comp.savings > 0 ? chalk.green : chalk.white;
        console.log(
          `  ${comp.platform.padEnd(12)}: ${color(`$${comp.cost.toFixed(2)}/month${savings}`)}`
        );
      });
    }

    // Optimization suggestions
    if (costEstimate.optimization && costEstimate.optimization.length > 0) {
      console.log("\n💡 Cost Optimization Suggestions:");
      console.log(styles.muted("─".repeat(50)));
      costEstimate.optimization.forEach((suggestion: any) => {
        console.log(`  • ${suggestion}`);
      });
    }

    console.log(styles.subtitle("\n🎯 Next Steps:"));
    console.log(styles.muted("─".repeat(30)));
    console.log("  1. Review cost breakdown above");
    console.log(
      '  2. Run "farm deploy cost optimize" for detailed savings recommendations'
    );
    console.log('  3. Deploy with "farm deploy" when ready');
  } catch (error) {
    handleCommandError(error as Error, "deploy cost estimate");
  }
}

/**
 * Current cost analysis command implementation
 */
export async function currentCostCommand(options: {
  period?: "daily" | "weekly" | "monthly";
  verbose?: boolean;
}): Promise<void> {
  try {
    console.log(styles.title(`\n${icons.chart} FARM Current Costs`));
    console.log(styles.muted("Real-time cost analysis and breakdown\n"));

    const period = options.period || "monthly";
    logVerbose(`Analyzing ${period} costs...`, options);

    // Initialize cost analysis system
    const costAnalyzer = new CostAnalyzer();
    const costCalculator = new CostCalculator();

    console.log(styles.info("📊 Fetching cost data..."));

    // Get real metrics data from observability system
    const metrics = await getRealAIMetrics(period);

    if (metrics.length === 0) {
      console.log(
        styles.warning(
          "⚠️  No cost data found. Using sample data for demonstration."
        )
      );
      // Fall back to mock data if no real data available
      const mockMetrics = await getMockAIMetrics(period);
      const analysis = await costAnalyzer.analyze(mockMetrics, {
        timeRange: getTimeRangeForPeriod(period),
        groupBy:
          period === "daily" ? "hour" : period === "weekly" ? "day" : "week",
        includeProjections: true,
        includeSuggestions: true,
      });
      await displayCostAnalysis(analysis, period);
      return;
    }

    const analysisOptions: AnalysisOptions = {
      timeRange: getTimeRangeForPeriod(period),
      groupBy:
        period === "daily" ? "hour" : period === "weekly" ? "day" : "week",
      includeProjections: true,
      includeSuggestions: true,
    };

    // Analyze current costs
    const analysis = await costAnalyzer.analyze(metrics, analysisOptions);
    await displayCostAnalysis(analysis, period);

    await displayCostAnalysis(analysis, period);

    console.log(styles.subtitle("\n🎯 Next Steps:"));
    console.log(styles.muted("─".repeat(30)));
    console.log(
      '  1. Run "farm deploy cost optimize" for detailed optimization plan'
    );
    console.log('  2. Set up cost alerts with "farm config cost-alerts"');
    console.log(
      '  3. Monitor trends with "farm deploy cost current --period weekly"'
    );
  } catch (error) {
    handleCommandError(error as Error, "deploy cost current");
  }
}

/**
 * Cost optimization command implementation
 */
export async function optimizeCostCommand(options: {
  verbose?: boolean;
}): Promise<void> {
  try {
    console.log(styles.title(`\n${icons.target} FARM Cost Optimization`));
    console.log(styles.muted("AI-powered cost optimization recommendations\n"));

    logVerbose("Initializing cost optimizer...", options);

    const costOptimizer = new CostOptimizer();
    const costPredictor = new CostPredictor();

    console.log(styles.info("🔍 Analyzing usage patterns..."));
    console.log(styles.info("🧠 Generating optimization recommendations..."));

    // Get optimization plan
    const optimizationPlan = await costOptimizer.analyzeAndSuggest();

    // Get predictions
    const predictions = await costPredictor.predictDailyCost();

    // Display results
    console.log(styles.success(`\n✅ Cost optimization analysis complete!\n`));

    console.log(styles.subtitle("💰 Cost Overview:"));
    console.log(styles.muted("─".repeat(50)));
    console.log(
      `Current monthly cost:  ${chalk.red(`$${optimizationPlan.currentMonthlyCost.toFixed(2)}`)}`
    );
    console.log(
      `Optimized cost:        ${chalk.green(`$${optimizationPlan.optimizedMonthlyCost.toFixed(2)}`)}`
    );
    console.log(
      `Potential savings:     ${chalk.yellow(`$${optimizationPlan.potentialSavings.toFixed(2)} (${((optimizationPlan.potentialSavings / optimizationPlan.currentMonthlyCost) * 100).toFixed(1)}%)`)}`
    );

    console.log("\n🎯 Optimization Recommendations:");
    console.log(styles.muted("─".repeat(50)));

    optimizationPlan.suggestions.forEach((suggestion: any, index: number) => {
      const impact =
        suggestion.impact === "high"
          ? chalk.red("HIGH")
          : suggestion.impact === "medium"
            ? chalk.yellow("MED")
            : chalk.green("LOW");
      const difficulty =
        suggestion.difficulty === "hard"
          ? chalk.red("HARD")
          : suggestion.difficulty === "medium"
            ? chalk.yellow("MED")
            : chalk.green("EASY");

      console.log(`\n${index + 1}. ${chalk.bold(suggestion.description)}`);
      console.log(
        `   💰 Savings: $${suggestion.estimatedSavings.toFixed(2)}/month`
      );
      console.log(`   📊 Impact: ${impact} | 🔧 Difficulty: ${difficulty}`);

      if (suggestion.implementation) {
        console.log(
          `   ⏱️  Time estimate: ${suggestion.implementation.timeEstimate}`
        );
        if (suggestion.implementation.codeExample) {
          console.log(
            `   💻 Code example: ${chalk.gray(suggestion.implementation.codeExample)}`
          );
        }
      }
    });

    // Implementation priority
    console.log("\n📋 Implementation Plan:");
    console.log(styles.muted("─".repeat(50)));
    console.log(
      `Priority: ${optimizationPlan.implementationPriority.toUpperCase()}`
    );
    console.log(
      `Estimated implementation time: ${optimizationPlan.estimatedImplementationTime}`
    );

    // Quick wins
    const quickWins = optimizationPlan.suggestions.filter(
      (s: any) => s.difficulty === "easy" && s.impact !== "low"
    );
    if (quickWins.length > 0) {
      console.log("\n⚡ Quick Wins (Start Here):");
      console.log(styles.muted("─".repeat(50)));
      quickWins.forEach((suggestion: any, index: number) => {
        console.log(
          `  ${index + 1}. ${suggestion.description} - $${suggestion.estimatedSavings.toFixed(2)}/month`
        );
      });
    }

    // Predictions
    if (predictions) {
      console.log("\n📈 Cost Predictions:");
      console.log(styles.muted("─".repeat(50)));
      console.log(
        `Without optimization: $${predictions.estimated.toFixed(2)}/day`
      );
      console.log(
        `With optimization:    $${(predictions.estimated * 30 - optimizationPlan.potentialSavings).toFixed(2)}/month`
      );

      if (predictions.confidence) {
        console.log(
          `Confidence range: $${predictions.confidence.low.toFixed(2)} - $${predictions.confidence.high.toFixed(2)}`
        );
      }
    }

    console.log(styles.subtitle("\n🎯 Next Steps:"));
    console.log(styles.muted("─".repeat(30)));
    console.log("  1. Start with the quick wins listed above");
    console.log('  2. Monitor impact with "farm deploy cost current"');
    console.log("  3. Re-run optimization after implementing changes");
    console.log("  4. Set up automated cost alerts");
  } catch (error) {
    handleCommandError(error as Error, "deploy cost optimize");
  }
}

// Helper functions

/**
 * Get real AI metrics from observability system
 */
async function getRealAIMetrics(period: string): Promise<AIMetrics[]> {
  try {
    // In a real implementation, this would query the observability data store
    // For now, return empty array to indicate no real data available
    // This could be enhanced to:
    // 1. Query SQLite/PostgreSQL database where metrics are stored
    // 2. Call observability API endpoints
    // 3. Read from exported CSV/JSON files
    return [];
  } catch (error) {
    console.warn("Failed to fetch real metrics data:", error);
    return [];
  }
}

/**
 * Display comprehensive cost analysis results
 */
async function displayCostAnalysis(
  analysis: CostAnalysis,
  period: string
): Promise<void> {
  // Display results
  console.log(styles.success(`\n✅ Current ${period} cost analysis:\n`));

  console.log(styles.subtitle(`💰 ${capitalizeFirst(period)} Cost Summary:`));
  console.log(styles.muted("─".repeat(50)));
  console.log(styles.success(`Total Cost: $${analysis.totalCost.toFixed(2)}`));

  // Show trend
  if (analysis.trend) {
    const trendIcon =
      analysis.trend.direction === "increasing"
        ? "📈"
        : analysis.trend.direction === "decreasing"
          ? "📉"
          : "➡️";
    const trendColor =
      analysis.trend.direction === "increasing"
        ? chalk.red
        : analysis.trend.direction === "decreasing"
          ? chalk.green
          : chalk.yellow;
    console.log(
      `Trend: ${trendIcon} ${trendColor(`${analysis.trend.percentageChange.toFixed(1)}% ${analysis.trend.direction} from last ${period}`)}`
    );
  }

  // Provider breakdown
  if (analysis.providers && analysis.providers.length > 0) {
    console.log("\n🏢 Cost by Provider:");
    console.log(styles.muted("─".repeat(50)));
    analysis.providers.forEach((providerData) => {
      console.log(
        `  ${providerData.provider.padEnd(12)}: $${providerData.totalCost.toFixed(2).padStart(8)} (${providerData.requestCount.toLocaleString()} requests)`
      );
    });
  }

  // Model breakdown
  if (analysis.models && analysis.models.length > 0) {
    console.log("\n🤖 Cost by AI Model:");
    console.log(styles.muted("─".repeat(50)));
    analysis.models.forEach((modelData) => {
      console.log(
        `  ${modelData.model.padEnd(15)}: $${modelData.totalCost.toFixed(2).padStart(8)} (${modelData.requestCount.toLocaleString()} requests)`
      );
    });
  }

  // Cost projections
  if (analysis.projections) {
    console.log("\n📊 Cost Projections:");
    console.log(styles.muted("─".repeat(50)));
    Object.entries(analysis.projections).forEach(
      ([timeframe, projectionValue]) => {
        const confidence = analysis.projections!.confidence
          ? ` (${(analysis.projections!.confidence * 100).toFixed(0)}% confidence)`
          : "";
        console.log(
          `  ${timeframe.padEnd(12)}: $${(projectionValue as number).toFixed(2)}${confidence}`
        );
      }
    );
  }

  // Optimization suggestions
  if (analysis.suggestions && analysis.suggestions.length > 0) {
    console.log("\n💡 Cost Optimization Opportunities:");
    console.log(styles.muted("─".repeat(50)));
    analysis.suggestions
      .slice(0, 3)
      .forEach((suggestion: any, index: number) => {
        const impact =
          suggestion.impact === "high"
            ? chalk.red("HIGH")
            : suggestion.impact === "medium"
              ? chalk.yellow("MED")
              : chalk.green("LOW");
        console.log(
          `  ${index + 1}. [${impact}] ${suggestion.implementation?.description || suggestion.description}`
        );
        console.log(
          `     💰 Est. savings: $${suggestion.estimatedSavings.toFixed(2)}/month`
        );
      });

    if (analysis.suggestions.length > 3) {
      console.log(
        `     ... and ${analysis.suggestions.length - 3} more suggestions`
      );
    }
  }
}

function generateServicesFromConfig(config: any): any[] {
  const services = [
    {
      name: "farm-app",
      type: "web",
      port: 8000,
      resources: { memory: "1Gi", cpu: "1000m" },
    },
  ];

  // Add AI service if enabled
  if (config.ai?.providers?.ollama?.enabled) {
    services.push({
      name: "farm-ai",
      type: "ai",
      port: 11434,
      resources: {
        memory: config.ai.providers.ollama.gpu ? "4Gi" : "2Gi",
        cpu: config.ai.providers.ollama.gpu ? "2000m" : "1000m",
      },
    });
  }

  // Add database if configured
  if (config.database) {
    services.push({
      name: config.database.type || "postgres",
      type: "database",
      port: 5432,
      resources: { memory: "512Mi", cpu: "500m" },
    });
  }

  return services;
}

async function getMockAIMetrics(period: string): Promise<AIMetrics[]> {
  // In real implementation, this would fetch from observability system
  const now = Date.now();
  const metrics: AIMetrics[] = [];

  const daysToGenerate = period === "daily" ? 1 : period === "weekly" ? 7 : 30;

  for (let i = 0; i < daysToGenerate * 24; i++) {
    const costAmount = Math.random() * 5;
    const requestCount = Math.floor(Math.random() * 100) + 10;

    metrics.push({
      provider: Math.random() > 0.6 ? "openai" : "anthropic",
      model: Math.random() > 0.5 ? "gpt-4" : "gpt-3.5-turbo",
      operation: Math.random() > 0.3 ? "chat" : "completion",
      requestCount,
      totalCost: costAmount,
      avgLatency: Math.random() * 2000 + 500,
      errorRate: Math.random() * 0.05, // 0-5% error rate
      tokens: {
        prompt: Math.floor(Math.random() * 1000) + 100,
        completion: Math.floor(Math.random() * 500) + 50,
        total: 0,
        input: Math.floor(Math.random() * 1000) + 100,
        output: Math.floor(Math.random() * 500) + 50,
      },
      cost: {
        amount: costAmount,
        currency: "USD",
      },
      duration: Math.random() * 2000 + 500,
      timestamp: now - i * 60 * 60 * 1000, // Hourly data
    });
    metrics[metrics.length - 1].tokens.total =
      metrics[metrics.length - 1].tokens.prompt +
      metrics[metrics.length - 1].tokens.completion;
  }

  return metrics;
}

function getTimeRangeForPeriod(period: string): { start: Date; end: Date } {
  const end = new Date();
  const start = new Date();

  switch (period) {
    case "daily":
      start.setDate(start.getDate() - 1);
      break;
    case "weekly":
      start.setDate(start.getDate() - 7);
      break;
    case "monthly":
    default:
      start.setMonth(start.getMonth() - 1);
      break;
  }

  return { start, end };
}

function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
