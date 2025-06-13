// packages/observability/src/core/auto-instrumentor.ts
import { trace, metrics, context, SpanStatusCode } from "@opentelemetry/api";
import { Resource } from "@opentelemetry/resources";
import { SemanticResourceAttributes } from "@opentelemetry/semantic-conventions";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import {
  ConsoleSpanExporter,
  ConsoleMetricExporter,
} from "../exporters/index.js";
import type { ObservabilityConfig, AIMetrics } from "@farm-framework/types";
import { CostCalculator } from "../cost/calculator.js";

export class FarmAutoInstrumentor {
  private static instance: FarmAutoInstrumentor;
  private initialized = false;
  private sdk?: NodeSDK;

  static getInstance(): FarmAutoInstrumentor {
    if (!this.instance) {
      this.instance = new FarmAutoInstrumentor();
    }
    return this.instance;
  }

  static initialize(config?: ObservabilityConfig): FarmAutoInstrumentor {
    const instance = this.getInstance();
    instance.setup(config);
    return instance;
  }

  private constructor() {}

  setup(config: ObservabilityConfig = {}): void {
    if (this.initialized) {
      return;
    }

    // Auto-detect environment and set defaults
    const finalConfig: Required<ObservabilityConfig> = {
      enabled: process.env.NODE_ENV !== "test",
      provider: (process.env.FARM_TELEMETRY_PROVIDER as any) || "console",
      serviceName: process.env.FARM_SERVICE_NAME || "farm-app",
      sampling: parseFloat(process.env.FARM_SAMPLING_RATE || "1.0"),
      costTracking: {
        enabled: true,
        currency: "USD",
        ...config.costTracking,
      },
      alerts: {
        enabled: false,
        channels: [],
        rules: [],
        ...config.alerts,
      },
      telemetry: {
        enabled: true,
        ...config.telemetry,
      },
      exporters: config.exporters || [],
      ...config,
    };

    if (!finalConfig.enabled) {
      return;
    }

    this.instrument(finalConfig);
    this.initialized = true;
  }

  private instrument(config: Required<ObservabilityConfig>): void {
    // Create resource attributes - using a simple object for now due to version compatibility
    const resourceAttributes = {
      [SemanticResourceAttributes.SERVICE_NAME]: config.serviceName,
      [SemanticResourceAttributes.SERVICE_VERSION]: this.detectVersion(),
      "farm.framework.version": this.detectFarmVersion(),
      "farm.ai.providers": this.detectAIProviders().join(","),
    };

    // For now, we'll skip the resource creation due to compatibility issues
    // This can be revisited when OpenTelemetry versions are aligned

    // Initialize OpenTelemetry SDK
    this.sdk = new NodeSDK({
      traceExporter: new ConsoleSpanExporter(),
      metricReader: new PeriodicExportingMetricReader({
        exporter: new ConsoleMetricExporter(),
        exportIntervalMillis: 30000,
      }),
      instrumentations: [getNodeAutoInstrumentations()],
    });

    this.sdk.start();

    // Custom AI instrumentation
    this.instrumentAI();

    console.log("🚀 FARM Auto-Instrumentation initialized");
  }

  private detectVersion(): string {
    try {
      const packageJson = require(process.cwd() + "/package.json");
      return packageJson.version || "unknown";
    } catch {
      return "unknown";
    }
  }

  private detectFarmVersion(): string {
    try {
      const farmPackage = require("@farm-framework/core/package.json");
      return farmPackage.version || "unknown";
    } catch {
      return "unknown";
    }
  }

  private detectAIProviders(): string[] {
    // Auto-detect configured AI providers from farm.config.ts
    try {
      const farmConfig = require(process.cwd() + "/farm.config.ts");
      return Object.keys(farmConfig.ai?.providers || {}).filter(
        (provider) => farmConfig.ai.providers[provider].enabled
      );
    } catch {
      return [];
    }
  }

  // Monkey-patch AI providers to add telemetry
  private instrumentAI(): void {
    const providers = ["ollama", "openai", "huggingface", "anthropic"];

    providers.forEach((providerName) => {
      try {
        // Try to find and wrap the AI provider
        this.tryWrapAIProvider(providerName);
      } catch (error) {
        // Provider not installed or available, skip silently
      }
    });
  }

  private tryWrapAIProvider(providerName: string): void {
    // This is a simplified approach - in practice, you'd need specific
    // wrapping for each provider's client library
    try {
      const module = require(`@farm-framework/ai`);
      if (module.providers && module.providers[providerName]) {
        this.wrapAIProvider(providerName, module.providers[providerName]);
      }
    } catch {
      // Provider not available
    }
  }

  private wrapAIProvider(name: string, provider: any): void {
    if (!provider.prototype?.generate) {
      return;
    }

    const original = provider.prototype.generate;
    const costCalculator = new CostCalculator();

    provider.prototype.generate = async function (...args: any[]) {
      const span = trace.getTracer("farm-ai").startSpan(`ai.${name}.generate`);
      const startTime = Date.now();

      try {
        const result = await original.apply(this, args);

        // Record metrics
        const duration = Date.now() - startTime;
        const tokens = result.usage?.total_tokens || 0;
        const cost = costCalculator.calculateCost({
          provider: name,
          model: result.model || "unknown",
          operation: "generate",
          tokens: {
            prompt: result.usage?.prompt_tokens || 0,
            completion: result.usage?.completion_tokens || 0,
            total: tokens,
          },
          cost: { amount: 0, currency: "USD" },
          timestamp: Date.now(),
          duration,
        });

        span.setAttributes({
          "ai.provider": name,
          "ai.model": result.model || "unknown",
          "ai.tokens.total": tokens,
          "ai.tokens.prompt": result.usage?.prompt_tokens || 0,
          "ai.tokens.completion": result.usage?.completion_tokens || 0,
          "ai.duration_ms": duration,
          "ai.cost.usd": cost,
        });

        // Emit metrics
        const meter = metrics.getMeter("farm-ai");

        meter.createHistogram("ai_request_duration").record(duration, {
          provider: name,
          model: result.model || "unknown",
        });

        meter.createCounter("ai_tokens_used").add(tokens, {
          provider: name,
          model: result.model || "unknown",
        });

        meter.createCounter("ai_cost_usd").add(cost, {
          provider: name,
          model: result.model || "unknown",
        });

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

  wrapClient<T>(client: T, clientName: string): T {
    // Generic client wrapper for additional instrumentation
    if (!client || typeof client !== "object") {
      return client;
    }

    const tracer = trace.getTracer(`farm-${clientName}`);

    // Create a proxy to intercept method calls
    return new Proxy(client, {
      get(target: any, prop: string | symbol) {
        const originalMethod = target[prop];

        if (typeof originalMethod === "function") {
          return function (...args: any[]) {
            const span = tracer.startSpan(`${clientName}.${String(prop)}`);

            try {
              const result = originalMethod.apply(target, args);

              // Handle promises
              if (result && typeof result.then === "function") {
                return result
                  .then((value: any) => {
                    span.setStatus({ code: SpanStatusCode.OK });
                    return value;
                  })
                  .catch((error: Error) => {
                    span.recordException(error);
                    span.setStatus({ code: SpanStatusCode.ERROR });
                    throw error;
                  })
                  .finally(() => {
                    span.end();
                  });
              }

              span.setStatus({ code: SpanStatusCode.OK });
              span.end();
              return result;
            } catch (error) {
              span.recordException(error as Error);
              span.setStatus({ code: SpanStatusCode.ERROR });
              span.end();
              throw error;
            }
          };
        }

        return originalMethod;
      },
    });
  }

  shutdown(): Promise<void> {
    if (this.sdk) {
      return this.sdk.shutdown();
    }
    return Promise.resolve();
  }
}
