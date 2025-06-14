// Core observability exports
export { FarmAutoInstrumentor } from "./auto-instrumentor.js";
export { TelemetryCollector } from "./collector.js";
export { ZeroConfigObservability } from "./zero-config.js";

// Re-export types for convenience
export type {
  ObservabilityConfig,
  TelemetryData,
  AIMetrics,
  CostPrediction,
  OptimizationSuggestion,
  CollectorOptions,
} from "@farm-framework/types";

// Import necessary types for local usage
import type { ObservabilityConfig } from "@farm-framework/types";
import { FarmAutoInstrumentor } from "./auto-instrumentor.js";
import { ZeroConfigObservability } from "./zero-config.js";

// Version info
export const OBSERVABILITY_VERSION = "1.0.0";

// Quick setup function for zero-config initialization
export async function setupObservability(
  config?: Partial<ObservabilityConfig>
): Promise<void> {
  return ZeroConfigObservability.setup(config);
}

// Factory function for creating instrumented clients
export function createInstrumentedClient<T>(client: T, clientName: string): T {
  const instrumentor = FarmAutoInstrumentor.getInstance();
  return instrumentor.wrapClient(client, clientName);
}
