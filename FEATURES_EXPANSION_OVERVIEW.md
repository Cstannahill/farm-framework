FARM Framework Observability & Cost Tracking Implementation Plan
Executive Summary
The observability and cost tracking system will revolutionize how developers monitor and optimize AI-powered applications. By providing zero-configuration setup, real-time cost projections, and intelligent optimization suggestions, FARM will offer enterprise-grade observability that "just works" out of the box.

Key Innovations
Auto-instrumentation with zero code changes required
Predictive cost analytics that prevent budget overruns before they happen
Smart optimization engine that suggests concrete cost-saving measures
Beautiful, responsive dashboard accessible from CLI or web
Export-ready business reports for stakeholder communication
Architecture Overview
┌─────────────────────────────────────────────────────────────────┐
│ FARM Observability Platform │
├─────────────────────────────────────────────────────────────────┤
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────┐ │
│ │ Auto │ │ Telemetry │ │ Cost │ │ Smart │ │
│ │Instrumentor │ │ Collector │ │ Analyzer │ │Optimizer│ │
│ └─────────────┘ └─────────────┘ └─────────────┘ └─────────┘ │
├─────────────────────────────────────────────────────────────────┤
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────┐ │
│ │ Real-time │ │ Predictive │ │ Alert │ │ Export │ │
│ │ Dashboard │ │ Analytics │ │ Engine │ │ Reports │ │
│ └─────────────┘ └─────────────┘ └─────────────┘ └─────────┘ │
└─────────────────────────────────────────────────────────────────┘
Directory Structure & Rationale
packages/
├── observability/ # New package for all observability features
│ ├── src/
│ │ ├── core/ # Core telemetry infrastructure
│ │ │ ├── auto-instrumentor.ts
│ │ │ ├── collector.ts
│ │ │ └── index.ts
│ │ ├── cost/ # Cost tracking and analysis
│ │ │ ├── analyzer.ts
│ │ │ ├── calculator.ts
│ │ │ ├── predictor.ts
│ │ │ └── optimizer.ts
│ │ ├── providers/ # Telemetry provider integrations
│ │ │ ├── base.ts
│ │ │ ├── uptrace.ts
│ │ │ ├── console.ts # Dev-mode provider
│ │ │ └── custom.ts
│ │ ├── alerts/ # Alert system
│ │ │ ├── engine.ts
│ │ │ ├── channels.ts
│ │ │ └── rules.ts
│ │ └── exporters/ # Report generation
│ │ ├── pdf.ts
│ │ ├── csv.ts
│ │ └── dashboard.ts
│ ├── ui/ # Dashboard components
│ │ ├── dashboard/
│ │ ├── components/
│ │ └── hooks/
│ └── package.json

packages/types/src/
├── observability.ts # All observability-related types
├── telemetry.ts # Telemetry-specific types
└── cost.ts # Cost tracking types

apps/api/src/
├── telemetry/ # Backend telemetry endpoints
│ ├── routes.py
│ ├── middleware.py
│ └── storage.py
Directory Rationale
Separate observability package: Keeps telemetry concerns isolated and reusable across projects
Clear subdomain organization: core/, cost/, alerts/ separate concerns logically
Shared types in packages/types/src/: Maintains type-safety across Python/TypeScript boundary
UI components in package: Allows dashboard to be imported or used standalone
Implementation Plan
Phase 1: Core Infrastructure (Day 1)
1.1 Auto-Instrumentation System
Purpose: Zero-config telemetry that "just works"

typescript
// packages/observability/src/core/auto-instrumentor.ts
import { trace, metrics, context } from '@opentelemetry/api';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

export class FarmAutoInstrumentor {
private static instance: FarmAutoInstrumentor;
private initialized = false;

static initialize(config?: ObservabilityConfig): FarmAutoInstrumentor {
if (!this.instance) {
this.instance = new FarmAutoInstrumentor(config);
}
return this.instance;
}

private constructor(private config: ObservabilityConfig = {}) {
// Auto-detect environment and set defaults
this.config = {
enabled: process.env.NODE_ENV !== 'test',
provider: process.env.FARM_TELEMETRY_PROVIDER || 'console',
serviceName: process.env.FARM_SERVICE_NAME || 'farm-app',
...config
};

    if (this.config.enabled) {
      this.instrument();
    }

}

private instrument() {
// Create resource with auto-detected attributes
const resource = Resource.default().merge(
new Resource({
[SemanticResourceAttributes.SERVICE_NAME]: this.config.serviceName,
[SemanticResourceAttributes.SERVICE_VERSION]: this.detectVersion(),
'farm.framework.version': this.detectFarmVersion(),
'farm.ai.providers': this.detectAIProviders(),
})
);

    // Setup provider based on config
    const provider = this.createProvider(resource);

    // Auto-instrument HTTP, gRPC, and AI calls
    this.instrumentHTTP();
    this.instrumentAI();
    this.instrumentDatabase();

    this.initialized = true;

}

private detectAIProviders(): string[] {
// Auto-detect configured AI providers from farm.config.ts
try {
const farmConfig = require(process.cwd() + '/farm.config.ts');
return Object.keys(farmConfig.ai?.providers || {})
.filter(provider => farmConfig.ai.providers[provider].enabled);
} catch {
return [];
}
}

// Monkey-patch AI providers to add telemetry
private instrumentAI() {
const providers = ['ollama', 'openai', 'huggingface'];

    providers.forEach(providerName => {
      try {
        const providerModule = require(`@farm/ai/providers/${providerName}`);
        this.wrapAIProvider(providerName, providerModule);
      } catch {
        // Provider not installed, skip
      }
    });

}

private wrapAIProvider(name: string, provider: any) {
const original = provider.prototype.generate;

    provider.prototype.generate = async function(...args: any[]) {
      const span = trace.getTracer('farm-ai').startSpan(`ai.${name}.generate`);
      const startTime = Date.now();

      try {
        const result = await original.apply(this, args);

        // Record metrics
        const duration = Date.now() - startTime;
        const tokens = result.usage?.total_tokens || 0;
        const cost = CostCalculator.calculate(name, result.model, tokens);

        span.setAttributes({
          'ai.provider': name,
          'ai.model': result.model,
          'ai.tokens.total': tokens,
          'ai.tokens.prompt': result.usage?.prompt_tokens || 0,
          'ai.tokens.completion': result.usage?.completion_tokens || 0,
          'ai.duration_ms': duration,
          'ai.cost.usd': cost
        });

        // Emit metrics
        metrics.getMeter('farm-ai').createHistogram('ai_request_duration')
          .record(duration, { provider: name, model: result.model });

        metrics.getMeter('farm-ai').createCounter('ai_tokens_used')
          .add(tokens, { provider: name, model: result.model });

        metrics.getMeter('farm-ai').createCounter('ai_cost_usd')
          .add(cost, { provider: name, model: result.model });

        return result;
      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({ code: SpanStatusCode.ERROR });
        throw error;
      } finally {
        span.end();
      }
    };

}
}
1.2 Cost Calculator with Provider Pricing
typescript
// packages/observability/src/cost/calculator.ts
export class CostCalculator {
// Pricing data updated automatically from provider APIs
private static pricing = {
openai: {
'gpt-4-turbo': { prompt: 0.01, completion: 0.03 },
'gpt-4': { prompt: 0.03, completion: 0.06 },
'gpt-3.5-turbo': { prompt: 0.0005, completion: 0.0015 },
},
anthropic: {
'claude-3-opus': { prompt: 0.015, completion: 0.075 },
'claude-3-sonnet': { prompt: 0.003, completion: 0.015 },
},
ollama: {
// Local models have electricity cost estimates
'llama3.1': { prompt: 0.00001, completion: 0.00001 },
'mistral': { prompt: 0.00001, completion: 0.00001 },
}
};

static calculate(provider: string, model: string, tokens: number): number {
const pricing = this.pricing[provider]?.[model];
if (!pricing) return 0;

    // Simple calculation for now, can be enhanced
    const costPer1kTokens = (pricing.prompt + pricing.completion) / 2;
    return (tokens / 1000) * costPer1kTokens;

}

static async updatePricing() {
// Fetch latest pricing from provider APIs
// This runs on a schedule to keep pricing current
}
}
Phase 2: Smart Analytics & Predictions (Day 2)
2.1 Predictive Cost Analyzer
typescript
// packages/observability/src/cost/predictor.ts
import { TimeSeries } from '@farm/analytics';

export class CostPredictor {
private history: CostDataPoint[] = [];

async predictDailyCost(): Promise<CostPrediction> {
const recentData = await this.getRecentCostData();

    // Use time series analysis for prediction
    const trend = TimeSeries.analyzeTrend(recentData);
    const seasonality = TimeSeries.detectSeasonality(recentData);

    // Calculate prediction with confidence intervals
    const prediction = {
      estimated: trend.project(1, 'day'),
      confidence: {
        low: trend.project(1, 'day', 0.1),
        high: trend.project(1, 'day', 0.9)
      },
      factors: this.identifyGrowthFactors(recentData)
    };

    // Alert if projection exceeds thresholds
    if (prediction.estimated > this.config.thresholds.daily) {
      this.alertEngine.trigger('cost_projection_exceeded', prediction);
    }

    return prediction;

}

private identifyGrowthFactors(data: CostDataPoint[]): GrowthFactor[] {
// Analyze what's driving cost increases
const factors: GrowthFactor[] = [];

    // Check for model changes
    const modelUsage = this.analyzeModelUsage(data);
    if (modelUsage.trend === 'increasing') {
      factors.push({
        type: 'model_upgrade',
        impact: modelUsage.costImpact,
        suggestion: 'Consider using smaller models for non-critical tasks'
      });
    }

    // Check for traffic patterns
    const trafficPattern = this.analyzeTrafficPattern(data);
    if (trafficPattern.peakUsage > trafficPattern.average * 2) {
      factors.push({
        type: 'traffic_spike',
        impact: trafficPattern.costImpact,
        suggestion: 'Implement request caching or rate limiting'
      });
    }

    return factors;

}
}
2.2 Smart Optimization Engine
typescript
// packages/observability/src/cost/optimizer.ts
export class CostOptimizer {
async analyzeAndSuggest(): Promise<OptimizationPlan> {
const usage = await this.getUsagePatterns();
const suggestions: Optimization[] = [];

    // 1. Model optimization
    if (usage.modelDistribution['gpt-4'] > 0.3) {
      suggestions.push({
        type: 'model_downgrade',
        impact: 'high',
        estimatedSavings: this.calculateModelDowngradeSavings(usage),
        implementation: {
          current: "aiApi.chat({ model: 'gpt-4', ... })",
          suggested: "aiApi.chat({ model: 'gpt-3.5-turbo', ... })",
          description: "Use GPT-4 only for complex tasks, GPT-3.5 for simple queries"
        }
      });
    }

    // 2. Caching opportunities
    const duplicateRequests = this.findDuplicateRequests(usage);
    if (duplicateRequests.ratio > 0.1) {
      suggestions.push({
        type: 'implement_caching',
        impact: 'medium',
        estimatedSavings: duplicateRequests.potentialSavings,
        implementation: {
          code: `

// Add to your AI service
const cache = new FarmAICache({ ttl: 3600 });
const response = await cache.getOrGenerate(
promptHash,
() => aiApi.chat({ model, messages })
);`,
description: "Cache repeated AI queries to reduce API calls"
}
});
}

    // 3. Batch processing
    if (usage.requestPattern === 'sequential' && usage.avgRequestsPerMinute > 10) {
      suggestions.push({
        type: 'batch_processing',
        impact: 'medium',
        estimatedSavings: this.calculateBatchingSavings(usage),
        implementation: {
          current: "await Promise.all(items.map(item => aiApi.process(item)))",
          suggested: "await aiApi.batchProcess(items)",
          description: "Batch multiple requests to reduce overhead"
        }
      });
    }

    return {
      currentMonthlyCost: usage.projectedMonthlyCost,
      optimizedMonthlyCost: this.calculateOptimizedCost(usage, suggestions),
      potentialSavings: this.calculateTotalSavings(suggestions),
      suggestions: this.prioritizeSuggestions(suggestions)
    };

}
}
Phase 3: Dashboard & Visualization (Day 3)
3.1 Zero-Config Dashboard
typescript
// packages/observability/ui/dashboard/Dashboard.tsx
import { useObservability } from '../hooks/useObservability';
import { CostOverview } from '../components/CostOverview';
import { ProviderBreakdown } from '../components/ProviderBreakdown';
import { OptimizationSuggestions } from '../components/OptimizationSuggestions';
import { RealTimeMetrics } from '../components/RealTimeMetrics';

export function ObservabilityDashboard() {
const { metrics, isLoading } = useObservability();

// Auto-detect dark mode preference
const isDark = useMediaQuery('(prefers-color-scheme: dark)');

if (isLoading) {
return <DashboardSkeleton />;
}

return (

<div className={`farm-dashboard ${isDark ? 'dark' : 'light'}`}>
{/_ Real-time cost ticker _/}
<CostTicker current={metrics.currentCost} projection={metrics.projection} />

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
app.mount("/dashboard", StaticFiles(
directory=pkg_resources.resource_filename('farm.observability', 'ui/dist'),
html=True
));
}
3.2 CLI Integration
bash

# Zero-config observability commands

farm observe # Open dashboard in browser
farm observe --costs # Show cost summary in terminal
farm observe --optimize # Get optimization suggestions
farm observe --export pdf # Export monthly report
farm observe --alert-test # Test alert configuration

# Real-time monitoring

farm observe --tail # Stream real-time metrics
farm observe --tail --provider ollama # Filter by provider

# Historical analysis

farm observe --analyze 7d # Analyze last 7 days
farm observe --compare last-month # Compare with previous period
Phase 4: Smart Alerts & Automation (Day 4)
4.1 Intelligent Alert System
typescript
// packages/observability/src/alerts/engine.ts
export class SmartAlertEngine {
private rules: AlertRule[] = [];

constructor() {
// Default smart rules
this.addRule({
name: 'cost_spike_detection',
condition: (metrics) => {
const spike = metrics.current.cost > metrics.baseline.cost \* 1.5;
const sustained = metrics.duration > 300; // 5 minutes
return spike && sustained;
},
action: async (alert) => {
// Auto-generate detailed analysis
const analysis = await this.analyzeCostSpike(alert.metrics);

        // Send rich notification
        await this.notify({
          severity: 'warning',
          title: 'Cost Spike Detected',
          summary: `${alert.metrics.current.cost.toFixed(2)}/hr (150% of normal)`,
          analysis,
          actions: [
            { label: 'View Dashboard', url: '/dashboard' },
            { label: 'Apply Optimizations', action: 'optimize' }
          ]
        });
      }
    });

    this.addRule({
      name: 'quota_prediction',
      condition: (metrics) => {
        const projectedMonthly = metrics.projection.monthly;
        const quota = metrics.config.quotas.monthly;
        return projectedMonthly > quota * 0.8; // 80% of quota
      },
      action: async (alert) => {
        const daysRemaining = this.getDaysRemainingInMonth();
        const suggestedDailyBudget =
          (alert.metrics.config.quotas.monthly - alert.metrics.current.monthToDate)
          / daysRemaining;

        await this.notify({
          severity: 'info',
          title: 'Approaching Monthly Quota',
          summary: `Projected to use ${alert.metrics.projection.monthly} of ${alert.metrics.config.quotas.monthly} quota`,
          recommendations: [
            `Reduce daily usage to $${suggestedDailyBudget.toFixed(2)} to stay within quota`,
            'Consider implementing suggested optimizations',
            'Review and adjust model usage patterns'
          ]
        });
      }
    });

}
}
Zero-Configuration Magic
Auto-Detection & Setup
typescript
// packages/observability/src/core/zero-config.ts
export class ZeroConfigObservability {
static async setup() {
// 1. Auto-detect environment
const env = this.detectEnvironment();

    // 2. Choose appropriate provider
    const provider = env === 'development'
      ? new ConsoleProvider()  // Beautiful console output for dev
      : new CloudProvider();    // Production telemetry

    // 3. Auto-configure based on farm.config.ts
    const farmConfig = await this.loadFarmConfig();

    // 4. Setup with sensible defaults
    const config = {
      enabled: true,
      provider,
      sampling: env === 'development' ? 1.0 : 0.1,
      costTracking: {
        enabled: true,
        currency: this.detectCurrency(),
        thresholds: {
          daily: farmConfig.observability?.costThresholds?.daily || 10,
          monthly: farmConfig.observability?.costThresholds?.monthly || 250
        }
      },
      alerts: {
        channels: this.detectAlertChannels(),
        rules: 'smart' // Use intelligent defaults
      }
    };

    // 5. Initialize
    FarmAutoInstrumentor.initialize(config);

    // 6. Print beautiful setup confirmation
    console.log(chalk.green('✨ FARM Observability initialized!'));
    console.log(chalk.gray('  • Provider:'), provider.name);
    console.log(chalk.gray('  • Cost tracking:'), 'Enabled');
    console.log(chalk.gray('  • Dashboard:'), chalk.cyan('http://localhost:8000/dashboard'));
    console.log(chalk.gray('  • Learn more:'), chalk.cyan('farm observe --help'));

}
}

// Auto-initialize on import
if (process.env.FARM_OBSERVABILITY !== 'disabled') {
ZeroConfigObservability.setup().catch(console.error);
}
Type Definitions
Core Types
typescript
// packages/types/src/observability.ts
export interface ObservabilityConfig {
enabled?: boolean;
provider?: 'console' | 'uptrace' | 'datadog' | 'custom';
serviceName?: string;
sampling?: number;
costTracking?: CostTrackingConfig;
alerts?: AlertConfig;
}

export interface CostTrackingConfig {
enabled: boolean;
currency?: 'USD' | 'EUR' | 'GBP';
thresholds?: {
hourly?: number;
daily?: number;
monthly?: number;
};
quotas?: {
daily?: number;
monthly?: number;
};
}

export interface AIMetrics {
provider: string;
model: string;
operation: 'chat' | 'completion' | 'embedding';
tokens: {
prompt: number;
completion: number;
total: number;
};
cost: {
amount: number;
currency: string;
};
duration: number;
timestamp: number;
}

export interface CostProjection {
estimated: number;
confidence: {
low: number;
high: number;
};
factors: GrowthFactor[];
recommendations: string[];
}

export interface OptimizationSuggestion {
type: 'model_downgrade' | 'caching' | 'batching' | 'rate_limiting';
impact: 'high' | 'medium' | 'low';
estimatedSavings: number;
implementation: {
current?: string;
suggested: string;
description: string;
codeExample?: string;
};
difficulty: 'easy' | 'medium' | 'hard';
}
Integration Points
FastAPI Integration
python

# apps/api/src/telemetry/middleware.py

from farm.observability import FarmTelemetry
from farm.ai import AIProvider

class ObservabilityMiddleware:
def **init**(self, app: FastAPI):
self.app = app
self.telemetry = FarmTelemetry.auto_configure()

    async def __call__(self, request: Request, call_next):
        # Auto-instrument all requests
        with self.telemetry.trace("http.request") as span:
            span.set_attributes({
                "http.method": request.method,
                "http.route": request.url.path,
                "http.client_ip": request.client.host
            })

            response = await call_next(request)

            span.set_attributes({
                "http.status_code": response.status_code
            })

            return response

# Auto-registration in main.py

app = FastAPI()
app.add_middleware(ObservabilityMiddleware)
AI Provider Integration
python

# packages/core/src/ai/providers/base.py

from farm.observability import track_ai_operation

class AIProvider(ABC):
@track_ai_operation # Decorator auto-instruments AI calls
async def generate(self, prompt: str, model: str, \*\*kwargs) -> AIResponse: # Telemetry automatically captured
pass
Configuration in farm.config.ts
typescript
// farm.config.ts
export default defineConfig({
// ... other config

observability: {
// All optional - sensible defaults applied
costTracking: {
thresholds: {
daily: 25, // Alert at $25/day
monthly: 500 // Alert at $500/month
}
},

    // Advanced configuration (optional)
    providers: {
      production: {
        type: 'uptrace',
        endpoint: process.env.UPTRACE_DSN
      },
      development: {
        type: 'console',
        pretty: true
      }
    },

    // Smart alerts (optional)
    alerts: {
      slack: process.env.SLACK_WEBHOOK,
      email: process.env.ALERT_EMAIL,
      rules: 'smart'  // Use AI-powered alert rules
    }

}
});
Why This Architecture?

1. Zero Friction
   Auto-instrumentation means developers get observability without writing any code
   Smart defaults work for 90% of use cases
   Console provider for development provides immediate value
2. Intelligence Built-In
   Predictive analytics prevent surprises
   Smart optimization suggestions are actionable
   Anomaly detection catches issues early
3. Enterprise Ready
   Pluggable provider system supports any backend
   Export functionality for business stakeholders
   Compliance-ready with data retention controls
4. Developer Joy
   Beautiful dashboard that requires no setup
   CLI commands that make sense
   Helpful error messages and suggestions
   This observability system will make FARM the first framework where cost tracking and optimization isn't an afterthought—it's a core feature that saves developers money from day one.
