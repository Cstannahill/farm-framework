# FARM Observability Package

## Overview

The FARM Observability Package provides enterprise-grade observability, telemetry, and cost tracking for AI-powered applications. With zero-configuration setup, predictive cost analytics, and intelligent optimization suggestions, it makes monitoring and optimizing AI applications effortless and automatic.

## ✅ Completed Implementation

### Core Components

1. **Auto-Instrumentation System** (`core/auto-instrumentor.ts`)

   - Zero-configuration telemetry that "just works" out of the box
   - Auto-detects AI providers and instruments calls automatically
   - Captures request/response data, tokens, costs, and performance metrics
   - Supports HTTP, gRPC, and AI call instrumentation
   - Monkey-patches AI provider libraries for seamless integration

2. **Zero-Config Setup** (`core/zero-config.ts`)

   - Intelligent environment detection (development vs production)
   - Automatic provider selection based on environment
   - Smart defaults that work for 90% of use cases
   - Beautiful console output for development mode
   - Production-ready telemetry configuration

3. **Cost Tracking System** (`cost/`)

   - **Calculator** (`calculator.ts`): Real-time cost calculation for all AI providers
   - **Predictor** (`predictor.ts`): Predictive analytics to prevent budget overruns
   - **Optimizer** (`optimizer.ts`): Intelligent optimization suggestions with concrete savings
   - **Analyzer** (`analyzer.ts`): Historical cost analysis and trend detection

4. **Provider System** (`providers/`)

   - **Base Provider** (`base.ts`): Abstract base class for all telemetry providers
   - **Console Provider** (`console.ts`): Beautiful development-mode output
   - **Uptrace Provider** (`uptrace.ts`): Production OpenTelemetry integration
   - **Custom Provider** (`custom.ts`): Extensible custom provider support

5. **Smart Alert Engine** (`alerts/`)

   - **Engine** (`engine.ts`): Intelligent alert system with AI-powered rules
   - **Rules** (`rules.ts`): Smart detection for cost spikes, quota limits, and anomalies
   - **Channels** (`channels.ts`): Multi-channel notifications (Slack, email, webhooks)

6. **Export System** (`exporters/`)

   - **Console Exporters** (`console.ts`): Beautiful terminal output for spans and metrics
   - **CSV Exporter** (`csv.ts`): Business-ready cost and usage reports
   - **Dashboard Exporter** (`dashboard.ts`): Web dashboard data preparation
   - **PDF Exporter** (`pdf.ts`): Executive summary reports and cost analysis PDFs

7. **UI Components** (`ui/`)
   - **Dashboard** (`dashboard/Dashboard.tsx`): Real-time observability dashboard
   - **Components**: Reusable UI components for metrics visualization
   - **Hooks**: React hooks for observability data integration

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                FARM Observability Platform                     │
├─────────────────────────────────────────────────────────────────┤
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────┐   │
│ │    Auto     │ │ Telemetry   │ │    Cost     │ │  Smart  │   │
│ │Instrumentor │ │ Collector   │ │  Analyzer   │ │Optimizer│   │
│ └─────────────┘ └─────────────┘ └─────────────┘ └─────────┘   │
├─────────────────────────────────────────────────────────────────┤
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────┐   │
│ │ Real-time   │ │ Predictive  │ │    Alert    │ │ Export  │   │
│ │ Dashboard   │ │ Analytics   │ │   Engine    │ │ Reports │   │
│ └─────────────┘ └─────────────┘ └─────────────┘ └─────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## Features Implemented

### ✅ Zero-Configuration Observability

- **Auto-Discovery**: Automatically detects AI providers from `farm.config.ts`
- **Smart Defaults**: Works out of the box with sensible configuration
- **Environment Awareness**: Development vs production mode detection
- **Graceful Fallbacks**: Continues working even if optional components fail
- **Beautiful Output**: Color-coded console output for development

### ✅ Comprehensive Cost Tracking

- **Real-Time Calculation**: Live cost tracking for all AI API calls
- **Provider Support**: OpenAI, Anthropic, Ollama, and custom providers
- **Token Accounting**: Detailed prompt/completion token breakdown
- **Currency Support**: Multi-currency cost tracking and conversion
- **Historical Analysis**: Cost trends and usage pattern analysis

### ✅ Predictive Analytics

- **Budget Projection**: Predict monthly costs based on current usage
- **Anomaly Detection**: Identify unusual spending patterns
- **Threshold Alerts**: Proactive warnings before budget limits
- **Seasonality Analysis**: Detect and account for usage patterns
- **Confidence Intervals**: Statistical confidence in predictions

### ✅ Smart Optimization

- **Batching Suggestions**: Identify opportunities to batch API calls
- **Model Recommendations**: Suggest more cost-effective model alternatives
- **Caching Opportunities**: Detect repeated requests for caching
- **Usage Optimization**: Analyze request patterns for efficiency
- **Concrete Savings**: Quantified potential cost reductions

### ✅ Advanced Provider System

- **Pluggable Architecture**: Easy integration with any telemetry backend
- **OpenTelemetry Standards**: Full OTEL compatibility
- **Custom Providers**: Extensible system for proprietary solutions
- **Multi-Provider**: Support for multiple providers simultaneously
- **Graceful Degradation**: Continues working if providers fail

### ✅ Intelligent Alerting

- **Smart Rules**: AI-powered alert logic that learns from patterns
- **Multi-Channel**: Slack, email, webhook notifications
- **Rate Limiting**: Prevents alert spam with intelligent throttling
- **Contextual Alerts**: Rich context and actionable recommendations
- **Custom Rules**: Flexible rule engine for specific requirements

### ✅ Professional PDF Reports

- **Executive Summaries**: High-level cost and performance overviews for stakeholders
- **Detailed Cost Reports**: Comprehensive analysis with provider and model breakdowns
- **Optimization Reports**: Actionable recommendations with implementation roadmaps
- **Customizable Formats**: A4, A3, Letter paper formats with professional themes
- **Rich Content**: Charts, graphs, insights, and technical appendices
- **Automated Generation**: Scheduled or on-demand report generation

## Installation

```bash
npm install @farm-framework/observability
```

## Quick Start

### Zero-Configuration Setup

The simplest way to get started - observability will auto-initialize:

```typescript
// Just import and use your AI providers - observability happens automatically!
import { openai } from "@farm-framework/ai";

// This call will be automatically instrumented
const response = await openai.chat.completions.create({
  model: "gpt-4",
  messages: [{ role: "user", content: "Hello!" }],
});

// Cost, performance, and usage data captured automatically
```

### Manual Setup

For more control over configuration:

```typescript
import { setupObservability } from "@farm-framework/observability";

// Initialize with custom configuration
await setupObservability({
  enabled: true,
  provider: "console", // Use console output for development
  costTracking: {
    enabled: true,
    currency: "USD",
    thresholds: {
      daily: 25, // Alert at $25/day
      monthly: 500, // Alert at $500/month
    },
  },
});
```

### Advanced Configuration

```typescript
import {
  FarmAutoInstrumentor,
  ConsoleProvider,
  UptraceProvider,
} from "@farm-framework/observability";

const instrumentor = FarmAutoInstrumentor.getInstance();

instrumentor.setup({
  provider:
    process.env.NODE_ENV === "production"
      ? new UptraceProvider({ endpoint: process.env.UPTRACE_DSN })
      : new ConsoleProvider({ pretty: true }),

  costTracking: {
    enabled: true,
    currency: "USD",
    providers: {
      openai: { apiKey: process.env.OPENAI_API_KEY },
      anthropic: { apiKey: process.env.ANTHROPIC_API_KEY },
    },
  },

  alerts: {
    channels: {
      slack: process.env.SLACK_WEBHOOK,
      email: process.env.ALERT_EMAIL,
    },
    rules: "smart", // Use AI-powered alert rules
  },
});
```

## Usage Examples

### Cost Analysis

```typescript
import { CostCalculator, CostPredictor } from "@farm-framework/observability";

// Calculate costs for specific usage
const cost = CostCalculator.calculate("openai", "gpt-4", {
  promptTokens: 100,
  completionTokens: 150,
});

// Get cost predictions
const predictor = new CostPredictor();
const prediction = await predictor.predictMonthlyCost();

console.log(`Predicted monthly cost: $${prediction.estimated}`);
console.log(
  `Confidence range: $${prediction.confidence.low} - $${prediction.confidence.high}`
);
```

### Smart Optimization

```typescript
import { CostOptimizer } from "@farm-framework/observability";

const optimizer = new CostOptimizer();
const analysis = await optimizer.analyzeUsage();

console.log("Optimization Suggestions:");
analysis.suggestions.forEach((suggestion) => {
  console.log(`- ${suggestion.description}`);
  console.log(`  Potential savings: $${suggestion.estimatedSavings}/month`);
  console.log(`  Implementation: ${suggestion.implementation.suggested}`);
});
```

### Dashboard Integration

```typescript
import { ObservabilityDashboard } from '@farm-framework/observability';

// Add dashboard to your React app
function App() {
  return (
    <div>
      <h1>My AI Application</h1>
      <ObservabilityDashboard />
    </div>
  );
}
```

### Custom Alerts

```typescript
import { SmartAlertEngine } from "@farm-framework/observability";

const alertEngine = new SmartAlertEngine();

// Add custom alert rule
alertEngine.addRule({
  name: "high_error_rate",
  condition: (metrics) => metrics.errorRate > 0.05, // 5% error rate
  action: async (alert) => {
    await fetch(process.env.SLACK_WEBHOOK, {
      method: "POST",
      body: JSON.stringify({
        text: `🚨 High error rate detected: ${alert.metrics.errorRate * 100}%`,
      }),
    });
  },
});
```

## Configuration

### Environment Variables

```bash
# Basic configuration
FARM_OBSERVABILITY=enabled           # Enable/disable observability
FARM_SERVICE_NAME=my-ai-app         # Service name for telemetry
FARM_TELEMETRY_PROVIDER=console     # Provider: console, uptrace, custom

# Cost tracking
FARM_COST_CURRENCY=USD              # Currency for cost calculations
FARM_COST_DAILY_LIMIT=25            # Daily spending limit
FARM_COST_MONTHLY_LIMIT=500         # Monthly spending limit

# Alerts
SLACK_WEBHOOK=https://...           # Slack webhook for alerts
ALERT_EMAIL=admin@example.com       # Email for alerts
UPTRACE_DSN=https://...             # Uptrace endpoint for production
```

### Configuration File (`farm.config.ts`)

```typescript
export default defineConfig({
  observability: {
    enabled: true,
    provider: "console", // 'console' | 'uptrace' | 'custom'

    costTracking: {
      enabled: true,
      currency: "USD",
      thresholds: {
        hourly: 5,
        daily: 25,
        monthly: 500,
      },
      quotas: {
        daily: 30,
        monthly: 600,
      },
    },

    alerts: {
      enabled: true,
      channels: {
        slack: process.env.SLACK_WEBHOOK,
        email: process.env.ALERT_EMAIL,
      },
      rules: {
        costSpike: true,
        quotaApproaching: true,
        errorRate: true,
        customRules: [],
      },
    },

    providers: {
      development: {
        type: "console",
        pretty: true,
        colors: true,
      },
      production: {
        type: "uptrace",
        endpoint: process.env.UPTRACE_DSN,
        sampling: 0.1, // 10% sampling for production
      },
    },
  },
});
```

## CLI Integration

When integrated with FARM CLI:

```bash
# View real-time dashboard
farm observe

# Show cost summary
farm observe --costs

# Get optimization suggestions
farm observe --optimize

# Export monthly report
farm observe --export pdf

# Stream real-time metrics
farm observe --tail

# Test alert configuration
farm observe --alert-test
```

## Provider System

### Built-in Providers

#### Console Provider (Development)

```typescript
import { ConsoleProvider } from "@farm-framework/observability";

const provider = new ConsoleProvider({
  pretty: true, // Beautiful colored output
  colors: true, // Enable colors
  timestamps: true, // Show timestamps
  verbose: false, // Detailed debugging
});
```

#### Uptrace Provider (Production)

```typescript
import { UptraceProvider } from "@farm-framework/observability";

const provider = new UptraceProvider({
  endpoint: process.env.UPTRACE_DSN,
  projectId: "1",
  sampling: 0.1, // 10% sampling
  compression: true, // Enable compression
});
```

#### Custom Provider

```typescript
import { BaseProvider } from "@farm-framework/observability";

class MyCustomProvider extends BaseProvider {
  async sendTelemetry(data: TelemetryData): Promise<void> {
    // Send to your custom backend
    await this.httpClient.post("/telemetry", data);
  }

  async sendCostData(data: CostData): Promise<void> {
    // Send cost data to your system
    await this.httpClient.post("/costs", data);
  }
}
```

## Export System

### CSV Reports

```typescript
import { CSVExporter } from "@farm-framework/observability";

const exporter = new CSVExporter();
const csvData = await exporter.exportCostData({
  startDate: new Date("2024-01-01"),
  endDate: new Date("2024-01-31"),
  groupBy: "provider", // 'day' | 'provider' | 'model'
});

// Save to file or send via email
```

### Dashboard Data

```typescript
import { DashboardExporter } from "@farm-framework/observability";

const exporter = new DashboardExporter();
const dashboardData = await exporter.exportDashboard({
  timeRange: "7d",
  includeOptimizations: true,
  includeAlerts: true,
});
```

### PDF Export Reports

```typescript
import { PDFExporter } from "@farm-framework/observability";

const pdfExporter = new PDFExporter({
  paperFormat: "A4",
  orientation: "portrait",
  includeCharts: true,
  includeOptimizations: true,
  theme: "professional",
});

// Export comprehensive cost report
const costReport = await pdfExporter.exportCostReport({
  costData: await getCostData(),
  metrics: await getMetrics(),
  optimizations: await getOptimizations(),
  alerts: await getAlerts(),
  period: {
    start: new Date("2024-01-01"),
    end: new Date("2024-01-31"),
  },
  title: "Monthly AI Cost Analysis",
});

// Save the PDF
import fs from "fs";
fs.writeFileSync(costReport.filename, costReport.buffer);
console.log(`Report saved: ${costReport.filename}`);

// Export executive summary
const execSummary = await pdfExporter.exportExecutiveSummary({
  costData: await getCostData(),
  metrics: await getMetrics(),
  optimizations: await getOptimizations(),
  period: {
    start: new Date("2024-01-01"),
    end: new Date("2024-01-31"),
  },
  executiveNotes:
    "Q1 performance exceeded expectations with 15% cost reduction.",
});

// Export optimization report
const optimizationReport = await pdfExporter.exportOptimizationReport({
  optimizations: await getOptimizations(),
  currentCosts: 1250.0,
  projectedSavings: 187.5,
  period: {
    start: new Date("2024-01-01"),
    end: new Date("2024-01-31"),
  },
});
```

## Types and Interfaces

The package exports comprehensive TypeScript types:

```typescript
import type {
  ObservabilityConfig,
  CostTrackingConfig,
  AIMetrics,
  CostPrediction,
  OptimizationSuggestion,
  AlertConfig,
  AlertRule,
  TelemetryProvider,
  TelemetryData,
  CostData,
} from "@farm-framework/observability";
```

## Event System

The observability system emits events for integration:

```typescript
import { FarmAutoInstrumentor } from "@farm-framework/observability";

const instrumentor = FarmAutoInstrumentor.getInstance();

instrumentor.on("ai-request-start", (data) => {
  console.log("AI request started:", data);
});

instrumentor.on("ai-request-complete", (data) => {
  console.log("AI request completed:", data);
});

instrumentor.on("cost-threshold-exceeded", (data) => {
  console.log("Cost threshold exceeded:", data);
});

instrumentor.on("optimization-suggestion", (suggestion) => {
  console.log("New optimization suggestion:", suggestion);
});
```

## Error Handling

### Graceful Degradation

- Observability never breaks your application
- Failed telemetry calls are logged but don't throw
- Automatic fallbacks when providers are unavailable
- Continues working with reduced functionality

### Debugging

```typescript
// Enable verbose debugging
process.env.FARM_OBSERVABILITY_DEBUG = "true";

// Or in configuration
setupObservability({
  debug: true,
  verbose: true,
});
```

## Performance

### Minimal Overhead

- Async telemetry processing doesn't block requests
- Efficient batching reduces network overhead
- Sampling reduces data volume in production
- Memory-efficient event streaming

### Production Optimizations

- Automatic sampling based on load
- Compression for large payloads
- Connection pooling for providers
- Background processing for exports

## Security

### Data Privacy

- No sensitive data logged by default
- Configurable data masking
- Secure credential handling
- GDPR compliance options

### Access Control

- Provider-level authentication
- Role-based dashboard access
- Audit logging for sensitive operations
- Secure webhook validation

## Integration Examples

### FastAPI Integration

```python
from farm.observability import ObservabilityMiddleware

app = FastAPI()
app.add_middleware(ObservabilityMiddleware)
```

### Express.js Integration

```typescript
import express from "express";
import { observabilityMiddleware } from "@farm-framework/observability";

const app = express();
app.use(observabilityMiddleware());
```

### Next.js Integration

```typescript
// pages/_app.tsx
import { setupObservability } from '@farm-framework/observability';

// Auto-initialize on app start
setupObservability();

export default function App({ Component, pageProps }) {
  return <Component {...pageProps} />;
}
```

## Development

### Building

```bash
npm run build          # Build the package
npm run build:watch    # Build in watch mode
npm run type-check     # TypeScript type checking
```

### Testing

```bash
npm test              # Run tests
npm run test:watch    # Run tests in watch mode
npm run test:coverage # Generate coverage report
```

## Package Structure

```
packages/observability/
├── src/
│   ├── core/                    # Core instrumentation system
│   │   ├── auto-instrumentor.ts # Auto-instrumentation engine
│   │   ├── collector.ts         # Telemetry data collection
│   │   ├── zero-config.ts       # Zero-config setup
│   │   └── index.ts            # Core exports
│   ├── cost/                   # Cost tracking and analysis
│   │   ├── calculator.ts       # Real-time cost calculation
│   │   ├── predictor.ts        # Predictive analytics
│   │   ├── optimizer.ts        # Optimization suggestions
│   │   ├── analyzer.ts         # Historical analysis
│   │   └── index.ts           # Cost exports
│   ├── providers/              # Telemetry provider integrations
│   │   ├── base.ts            # Abstract provider base
│   │   ├── console.ts         # Development console output
│   │   ├── uptrace.ts         # Production OTEL provider
│   │   ├── custom.ts          # Custom provider support
│   │   └── index.ts           # Provider exports
│   ├── alerts/                 # Smart alert system
│   │   ├── engine.ts          # Alert processing engine
│   │   ├── rules.ts           # Smart alert rules
│   │   ├── channels.ts        # Notification channels
│   │   └── index.ts           # Alert exports
│   ├── exporters/              # Data export system
│   │   ├── console.ts         # Console span/metric exporters
│   │   ├── csv.ts             # CSV report generation
│   │   ├── dashboard.ts       # Dashboard data export
│   │   ├── pdf.ts             # PDF report generation
│   │   └── index.ts           # Export exports
│   ├── ui/                     # Dashboard UI components
│   │   ├── dashboard/         # Main dashboard component
│   │   ├── components/        # Reusable UI components
│   │   └── hooks/            # React hooks
│   └── index.ts               # Main package exports
├── dist/                       # Built package output
├── package.json               # Package configuration
├── tsconfig.json              # TypeScript configuration
├── tsup.config.ts             # Build configuration
└── README.md                  # This documentation
```

## Contributing

1. **Issues**: Report bugs or request features via GitHub issues
2. **Pull Requests**: Submit PRs with comprehensive tests
3. **Documentation**: Update docs for any new features
4. **Testing**: Ensure all tests pass and add tests for new functionality

## License

This package is part of the FARM Framework and is licensed under the same terms as the main project.

## Support

- 📚 **Documentation**: [FARM Framework Docs](https://github.com/Cstannahill/farm-framework)
- 🐛 **Issues**: [GitHub Issues](https://github.com/Cstannahill/farm-framework/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/Cstannahill/farm-framework/discussions)
- 📧 **Email**: [Support Email](mailto:support@farm-framework.dev)

---

**The FARM Observability Package makes monitoring and optimizing AI applications effortless. With zero-configuration setup, intelligent cost tracking, and predictive analytics, you can focus on building great AI experiences while we handle the observability.**
