# Type Audit Report for package: observability

## \U0001F4E6 Target
- **Type:** package
- **Name:** observability

## \U0001F4C1 Local Types Summary
- `packages/observability/src/exporters/dashboard.ts`
  - `DashboardTemplate`
- `packages/observability/src/core/collector.ts`
  - `TraceData`
  - `CollectorOptions`
- `packages/observability/src/cost/predictor.ts`
  - `CostDataPoint`
  - `CostPrediction`
  - `GrowthFactor`
  - `PredictorConfig`
  - `TrendAnalysis`
  - `ModelUsageAnalysis`
  - `TrafficPattern`
- `packages/observability/src/cost/analyzer.ts`
  - `AnalysisOptions`
- `packages/observability/src/providers/base.ts`
  - `ProviderOptions`
- `packages/observability/src/providers/console.ts`
  - `ConsoleProviderOptions`
- `packages/observability/src/providers/custom.ts`
  - `CustomProviderConfig`
- `packages/observability/src/providers/uptrace.ts`
  - `UptraceConfig`
- `packages/observability/src/alerts/rules.ts`
  - `RuleEvaluationResult`
  - `RuleContext`

## \U0001F501 Shared Type Cross-Reference
- **Matches in `@farm-framework/types`:**
  - `TraceData`【F:packages/types/src/telemetry.ts†L240-L250】
  - `CostDataPoint`【F:packages/types/src/telemetry.ts†L219-L226】
  - `CostPrediction` and `GrowthFactor`【F:packages/types/src/cost.ts†L40-L46】【F:packages/types/src/cost.ts†L125-L139】
- **No match found:** `CollectorOptions`, `PredictorConfig`, `TrendAnalysis`, `ModelUsageAnalysis`, `TrafficPattern`, `AnalysisOptions`, `ProviderOptions`, `ConsoleProviderOptions`, `CustomProviderConfig`, `UptraceConfig`, `DashboardTemplate`, `RuleEvaluationResult`, `RuleContext`

## \u274c Violations
- `TraceData` locally differs from the shared definition and should be imported instead【F:packages/observability/src/core/collector.ts†L20-L24】.
- Duplicate definitions for cost prediction types exist locally despite being exported from `@farm-framework/types`【F:packages/observability/src/cost/predictor.ts†L3-L34】.
- The AI package also defines a `CustomProviderConfig` type leading to potential divergence【F:packages/ai/src/config/ai-config.ts†L70-L84】.

## \u2705 Suggestions for Sync
- Replace local `TraceData` with the version from `@farm-framework/types/telemetry`.
- Import `CostDataPoint`, `CostPrediction`, and `GrowthFactor` from `@farm-framework/types/cost`.
- Consider moving `CollectorOptions`, provider configs, and alert rule types to `packages/types/observability.ts` if they are part of the public API.

- `CustomProviderConfig` duplicates an AI configuration type and should be consolidated.

