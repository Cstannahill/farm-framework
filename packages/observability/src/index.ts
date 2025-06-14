// Main exports for the observability package
export * from "./core/index.js";
export * from "./cost/index.js";
export * from "./providers/index.js";
export * from "./alerts/index.js";
export * from "./exporters/index.js";

// Re-export common types
export type {
  ObservabilityConfig,
  CostTrackingConfig,
  AIMetrics,
  CostPrediction,
  OptimizationSuggestion,
  AlertConfig,
  AlertRule,
  TelemetryProvider,
  CustomTelemetryProviderConfig,
  CollectorOptions,
  PredictorConfig,
  AnalysisOptions,
  CostDataPoint,
  GrowthFactor,
  TraceData,
} from "@farm-framework/types";

// Main initialization function
export { FarmAutoInstrumentor } from "./core/auto-instrumentor.js";
export { ZeroConfigObservability } from "./core/zero-config.js";

// Import for legacy function
import { FarmAutoInstrumentor } from "./core/auto-instrumentor.js";

// Cost tracking exports
export { CostCalculator } from "./cost/calculator.js";
export { CostPredictor } from "./cost/predictor.js";
export { CostOptimizer } from "./cost/optimizer.js";

// Alert system exports
export { SmartAlertEngine } from "./alerts/engine.js";

// Provider exports
export { ConsoleProvider } from "./providers/console.js";
export { UptraceProvider } from "./providers/uptrace.js";

// Dashboard exports (conditional)
// export { ObservabilityDashboard } from "./ui/dashboard/Dashboard.js";

// Legacy initialization function (for backward compatibility)
export async function initializeObservability(config?: any) {
  const instrumentor = FarmAutoInstrumentor.getInstance();
  instrumentor.setup(config || {});
  return instrumentor;
}

// Auto-initialize if not explicitly disabled
if (
  typeof process !== "undefined" &&
  process.env?.FARM_OBSERVABILITY !== "disabled"
) {
  import("./core/zero-config.js")
    .then(({ ZeroConfigObservability }) => {
      ZeroConfigObservability.setup().catch((error) => {
        console.warn(
          "Failed to auto-initialize FARM observability:",
          error.message
        );
      });
    })
    .catch(() => {
      // Silently fail if auto-initialization is not available
    });
}
