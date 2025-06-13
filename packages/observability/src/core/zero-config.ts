// packages/observability/src/core/zero-config.ts
import chalk from "chalk";
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import type { ObservabilityConfig, AlertChannel } from "@farm-framework/types";
import { FarmAutoInstrumentor } from "./auto-instrumentor.js";
import { ConsoleProvider } from "../providers/console.js";

export class ZeroConfigObservability {
  private static initialized = false;

  static async setup(userConfig?: Partial<ObservabilityConfig>): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // 1. Auto-detect environment
      const env = this.detectEnvironment();

      // 2. Load FARM config
      const farmConfig = await this.loadFarmConfig();

      // 3. Detect capabilities and preferences
      const detectedConfig = {
        provider: this.detectTelemetryProvider(env),
        currency: this.detectCurrency(),
        alertChannels: this.detectAlertChannels(),
        costThresholds: this.detectCostThresholds(farmConfig),
      };

      // 4. Build final configuration
      const config: ObservabilityConfig = {
        enabled: process.env.FARM_OBSERVABILITY !== "disabled",
        provider: detectedConfig.provider,
        serviceName: process.env.FARM_SERVICE_NAME || this.detectServiceName(),
        sampling: env === "development" ? 1.0 : 0.1,
        costTracking: {
          enabled: true,
          currency: detectedConfig.currency,
          thresholds: detectedConfig.costThresholds,
          alerting: {
            enabled: true,
            channels: ["console"],
          },
        },
        alerts: {
          enabled: detectedConfig.alertChannels.length > 0,
          channels: detectedConfig.alertChannels,
          rules: this.createSmartAlertRules(),
          throttle: {
            enabled: true,
            duration: 15, // 15 minutes
          },
        },
        telemetry: {
          enabled: true,
          batchSize: 100,
          timeout: 5000,
          retryAttempts: 3,
        },
        exporters: this.detectExporters(env),
        ...userConfig,
      };

      // 5. Initialize instrumentation
      if (config.enabled) {
        FarmAutoInstrumentor.initialize(config);
        this.initialized = true;

        // 6. Print beautiful setup confirmation
        this.printSetupConfirmation(config, env);
      }
    } catch (error) {
      console.warn(
        chalk.yellow("⚠️  Failed to auto-configure FARM observability:"),
        error instanceof Error ? error.message : error
      );
    }
  }

  private static detectEnvironment(): "development" | "production" | "test" {
    if (process.env.NODE_ENV === "test") return "test";
    if (process.env.NODE_ENV === "production") return "production";
    return "development";
  }

  private static async loadFarmConfig(): Promise<any> {
    const configPaths = [
      join(process.cwd(), "farm.config.ts"),
      join(process.cwd(), "farm.config.js"),
      join(process.cwd(), "farm.config.mjs"),
    ];

    for (const configPath of configPaths) {
      if (existsSync(configPath)) {
        try {
          // Dynamic import to handle both ES modules and CommonJS
          const config = await import(configPath);
          return config.default || config;
        } catch (error) {
          console.warn(`Failed to load config from ${configPath}:`, error);
        }
      }
    }

    return {};
  }

  private static detectTelemetryProvider(
    env: string
  ): "console" | "uptrace" | "datadog" | "custom" {
    // Check environment variables for explicit provider
    const envProvider = process.env.FARM_TELEMETRY_PROVIDER;
    if (
      envProvider &&
      ["console", "uptrace", "datadog", "custom"].includes(envProvider)
    ) {
      return envProvider as any;
    }

    // Auto-detect based on environment and available credentials
    if (env === "development") {
      return "console";
    }

    // Check for cloud provider credentials
    if (process.env.UPTRACE_DSN) {
      return "uptrace";
    }

    if (process.env.DD_API_KEY || process.env.DATADOG_API_KEY) {
      return "datadog";
    }

    // Default to console
    return "console";
  }

  private static detectCurrency(): "USD" | "EUR" | "GBP" {
    const currency = process.env.FARM_CURRENCY || process.env.CURRENCY;
    if (currency && ["USD", "EUR", "GBP"].includes(currency.toUpperCase())) {
      return currency.toUpperCase() as any;
    }

    // Try to detect from locale
    try {
      const locale = Intl.DateTimeFormat().resolvedOptions().locale;
      if (locale.includes("US") || locale.includes("en-US")) return "USD";
      if (locale.includes("GB") || locale.includes("en-GB")) return "GBP";
      if (
        locale.includes("EU") ||
        locale.includes("de") ||
        locale.includes("fr")
      )
        return "EUR";
    } catch {
      // Ignore locale detection errors
    }

    return "USD";
  }

  private static detectAlertChannels(): AlertChannel[] {
    const channels: AlertChannel[] = [];

    // Always include console for development
    channels.push({
      name: "console",
      type: "console",
      enabled: true,
      send: async (alert: any) => {
        console.log("Alert:", alert);
        return {
          success: true,
          channel: "console",
          timestamp: new Date(),
        };
      },
    });

    // Check for Slack webhook
    if (process.env.SLACK_WEBHOOK_URL) {
      channels.push({
        name: "slack",
        type: "slack",
        enabled: true,
        send: async (alert: any) => {
          // Simple Slack webhook implementation
          try {
            console.log("Would send to Slack:", alert);
            return {
              success: true,
              channel: "slack",
              timestamp: new Date(),
            };
          } catch (error) {
            return {
              success: false,
              channel: "slack",
              error: error instanceof Error ? error.message : "Unknown error",
              timestamp: new Date(),
            };
          }
        },
      });
    }

    // Check for email configuration
    if (process.env.SMTP_HOST && process.env.ALERT_EMAIL_TO) {
      channels.push({
        name: "email",
        type: "email",
        enabled: true,
        send: async (alert: any) => {
          // Simple email implementation placeholder
          try {
            console.log(
              "Would send email alert to:",
              process.env.ALERT_EMAIL_TO
            );
            console.log("Alert:", alert);
            return {
              success: true,
              channel: "email",
              timestamp: new Date(),
            };
          } catch (error) {
            return {
              success: false,
              channel: "email",
              error: error instanceof Error ? error.message : "Unknown error",
              timestamp: new Date(),
            };
          }
        },
      });
    }

    // Check for custom webhook
    if (process.env.ALERT_WEBHOOK_URL) {
      channels.push({
        name: "webhook",
        type: "webhook",
        enabled: true,
        send: async (alert: any) => {
          // Simple webhook implementation placeholder
          try {
            console.log(
              "Would send webhook alert to:",
              process.env.ALERT_WEBHOOK_URL
            );
            console.log("Alert:", alert);
            return {
              success: true,
              channel: "webhook",
              timestamp: new Date(),
            };
          } catch (error) {
            return {
              success: false,
              channel: "webhook",
              error: error instanceof Error ? error.message : "Unknown error",
              timestamp: new Date(),
            };
          }
        },
      });
    }

    return channels;
  }

  private static detectCostThresholds(farmConfig: any): any {
    return {
      hourly: farmConfig.observability?.costThresholds?.hourly || 1,
      daily: farmConfig.observability?.costThresholds?.daily || 10,
      monthly: farmConfig.observability?.costThresholds?.monthly || 250,
    };
  }

  private static detectServiceName(): string {
    try {
      const packageJson = JSON.parse(
        readFileSync(join(process.cwd(), "package.json"), "utf8")
      );
      return packageJson.name || "farm-app";
    } catch {
      return "farm-app";
    }
  }

  private static createSmartAlertRules(): any[] {
    return [
      {
        id: "high-cost-spike",
        name: "High Cost Spike",
        description: "Alert when cost increases significantly",
        enabled: true,
        conditions: [
          {
            metric: "cost.hourly",
            operator: ">",
            value: 5,
            timeWindow: 60,
            aggregation: "sum",
          },
        ],
        severity: "warning",
        throttle: 30,
        channels: ["console"],
      },
      {
        id: "error-rate-spike",
        name: "Error Rate Spike",
        description: "Alert when error rate is unusually high",
        enabled: true,
        conditions: [
          {
            metric: "errors.rate",
            operator: ">",
            value: 0.1,
            timeWindow: 15,
            aggregation: "avg",
          },
        ],
        severity: "error",
        throttle: 15,
        channels: ["console"],
      },
    ];
  }

  private static detectExporters(env: string): any[] {
    const exporters = [];

    // Always include console for development
    if (env === "development") {
      exporters.push({
        type: "console",
        enabled: true,
        interval: 30,
      });
    }

    // Check for Prometheus endpoint
    if (process.env.PROMETHEUS_ENDPOINT) {
      exporters.push({
        type: "prometheus",
        enabled: true,
        endpoint: process.env.PROMETHEUS_ENDPOINT,
        interval: 15,
      });
    }

    // Check for Jaeger endpoint
    if (process.env.JAEGER_ENDPOINT) {
      exporters.push({
        type: "jaeger",
        enabled: true,
        endpoint: process.env.JAEGER_ENDPOINT,
      });
    }

    // Check for OTLP endpoint
    if (process.env.OTLP_ENDPOINT) {
      exporters.push({
        type: "otlp",
        enabled: true,
        endpoint: process.env.OTLP_ENDPOINT,
        headers: process.env.OTLP_HEADERS
          ? JSON.parse(process.env.OTLP_HEADERS)
          : {},
      });
    }

    return exporters;
  }

  private static printSetupConfirmation(
    config: ObservabilityConfig,
    env: string
  ): void {
    console.log(chalk.green("✨ FARM Observability initialized!"));
    console.log(chalk.gray("  • Environment:"), chalk.cyan(env));
    console.log(chalk.gray("  • Provider:"), chalk.cyan(config.provider));
    console.log(chalk.gray("  • Service:"), chalk.cyan(config.serviceName));
    console.log(
      chalk.gray("  • Cost tracking:"),
      config.costTracking?.enabled
        ? chalk.green("Enabled")
        : chalk.red("Disabled")
    );
    console.log(
      chalk.gray("  • Alert channels:"),
      chalk.cyan(config.alerts?.channels?.length || 0)
    );

    if (env === "development") {
      console.log(
        chalk.gray("  • Dashboard:"),
        chalk.cyan("http://localhost:8000/dashboard")
      );
    }

    console.log(
      chalk.gray("  • Learn more:"),
      chalk.cyan("farm observe --help")
    );
  }

  static isInitialized(): boolean {
    return this.initialized;
  }

  static async shutdown(): Promise<void> {
    if (this.initialized) {
      await FarmAutoInstrumentor.getInstance().shutdown();
      this.initialized = false;
    }
  }
}
