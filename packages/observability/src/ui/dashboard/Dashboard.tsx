// packages/observability/ui/dashboard/Dashboard.tsx
import { useObservability } from "../hooks/useObservability";
import { CostOverview } from "../components/CostOverview";
import { ProviderBreakdown } from "../components/ProviderBreakdown";
import { OptimizationSuggestions } from "../components/OptimizationSuggestions";
import { RealTimeMetrics } from "../components/RealTimeMetrics";

export function ObservabilityDashboard() {
  const { metrics, isLoading } = useObservability();

  // Auto-detect dark mode preference
  const isDark = useMediaQuery("(prefers-color-scheme: dark)");

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className={`farm-dashboard ${isDark ? "dark" : "light"}`}>
      {/_ Real-time cost ticker _/}
      <CostTicker
        current={metrics.currentCost}
        projection={metrics.projection}
      />

      {/* Main grid layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
        {/* Overview cards */}
        <div className="lg:col-span-3">
          <CostOverview
            today={metrics.today}
            week={metrics.week}
            month={metrics.month}
            trend={metrics.trend}
          />
        </div>

        {/* Provider breakdown */}
        <div className="lg:col-span-2">
          <ProviderBreakdown
            data={metrics.providerCosts}
            showLocalCosts={metrics.hasOllama}
          />
        </div>

        {/* Smart suggestions */}
        <div>
          <OptimizationSuggestions
            suggestions={metrics.optimizations}
            onImplement={handleImplementSuggestion}
          />
        </div>

        {/* Real-time metrics */}
        <div className="lg:col-span-3">
          <RealTimeMetrics
            requests={metrics.realtimeRequests}
            latency={metrics.realtimeLatency}
            errors={metrics.realtimeErrors}
          />
        </div>
      </div>

      {/* Export button */}
      <ExportButton metrics={metrics} />
    </div>
  );
}

// Auto-mount dashboard at /dashboard
export function installDashboard(app: FastAPI) {
  app.mount(
    "/dashboard",
    StaticFiles(
      (directory = pkg_resources.resource_filename(
        "farm.observability",
        "ui/dist"
      )),
      (html = True)
    )
  );
}
