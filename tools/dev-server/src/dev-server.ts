// tools/dev-server/src/dev-server.ts
import { EventEmitter } from "events";
import { readFileSync, existsSync } from "fs";
import { join, resolve } from "path";
import { ProcessManager } from "./process-manager.js";
import { ServiceConfigManager } from "./service-configs.js";
import { Logger } from "./logger.js";
import { HealthChecker } from "./health-checker.js";
import type {
  DevServerOptions,
  DevServerState,
  ServiceStatus,
  ServiceConfig,
} from "./types.js";
import type { FarmConfig } from "@farm-framework/types";

// Adjust DevServerEvents type to match EventMap constraint
interface DevServerEvents {
  "service-starting": [string];
  "service-ready": [string];
  "service-error": [string, Error];
  "service-exit": [string, number | null, string | null];
  "all-services-ready": [];
  "shutdown-started": [];
  "shutdown-complete": [];
}

// Update StartupPhase type
interface StartupPhase {
  name: string;
  services: ServiceConfig[];
  parallel?: boolean;
  required?: boolean;
}

export class FarmDevServer extends EventEmitter<DevServerEvents> {
  private processManager: ProcessManager;
  private serviceConfigManager: ServiceConfigManager;
  private logger: Logger;
  private healthChecker: HealthChecker;
  private state: DevServerState;
  private options: Required<DevServerOptions>;

  constructor(options: DevServerOptions = {}) {
    super();

    // Set default options
    this.options = {
      port: options.port || 4000,
      frontendOnly: options.frontendOnly || false,
      backendOnly: options.backendOnly || false,
      verbose: options.verbose || false,
      configPath: options.configPath || "farm.config.ts",
      skipHealthCheck: options.skipHealthCheck || false,
      services: options.services || [],
    };

    // Initialize components
    this.logger = new Logger(
      this.options.verbose ? "debug" : "info",
      this.options.verbose
    );
    this.healthChecker = new HealthChecker(this.logger);
    this.processManager = new ProcessManager(this.logger);
    this.serviceConfigManager = new ServiceConfigManager(this.logger);

    // Initialize state
    this.state = {
      status: "stopped",
      services: new Map(),
    };

    this.setupEventHandlers();
  }

  async start(projectPath?: string): Promise<void> {
    try {
      this.state.status = "starting";
      this.state.startTime = Date.now();
      this.state.projectPath = projectPath || process.cwd();

      this.logger.startup("Starting FARM development server...");
      this.logger.newLine();

      // Load configuration
      await this.loadConfiguration();

      // Validate environment
      await this.validateEnvironment();

      // Get service configurations
      const serviceConfigs = this.getServiceConfigurations();

      // Start services in phases
      await this.startServicesInPhases(serviceConfigs);

      // Update state
      this.state.status = "running";

      // Print startup summary
      this.printStartupSummary();

      this.emit("all-services-ready");
    } catch (error) {
      this.state.status = "error";
      this.logger.error("Failed to start development server:", error);
      await this.shutdown();
      throw error;
    }
  }

  async stop(): Promise<void> {
    await this.shutdown();
  }

  getStatus(): DevServerState {
    return {
      ...this.state,
      services: new Map(this.state.services),
    };
  }

  getServiceStatus(serviceName: string): ServiceStatus | undefined {
    return this.processManager.getServiceStatus(serviceName);
  }

  getAllServiceStatuses(): ServiceStatus[] {
    return this.processManager.getAllServices();
  }

  private async loadConfiguration(): Promise<void> {
    const configPath = resolve(
      this.state.projectPath!,
      this.options.configPath
    );

    try {
      this.logger.info(`Loading configuration from ${configPath}`);

      if (!existsSync(configPath)) {
        this.logger.warn(
          `Configuration file not found at ${configPath}, using defaults`
        );
        this.state.config = this.getDefaultConfig();
        return;
      }

      // For now, we'll use a simple require. In a full implementation,
      // you'd want to handle TypeScript compilation here
      const configModule = await import(configPath);
      this.state.config = configModule.default || configModule;

      this.logger.configLoaded(configPath);
    } catch (error) {
      this.logger.configError(configPath, error);
      this.logger.warn("Using default configuration");
      this.state.config = this.getDefaultConfig();
    }
  }

  private getDefaultConfig(): FarmConfig {
    return {
      name: "farm-app",
      template: "basic",
      features: [],
      database: {
        type: "mongodb",
      },
      development: {
        ports: {
          frontend: 3000,
          backend: 8000,
          proxy: 4000,
          database: 27017,
          ollama: 11434,
        },
        hotReload: {
          enabled: true,
          typeGeneration: true,
          aiModels: true,
        },
      },
    };
  }

  private async validateEnvironment(): Promise<void> {
    this.logger.info("Validating environment...");

    // Check if we can access the project directories
    const projectPath = this.state.projectPath!;

    if (!this.options.frontendOnly) {
      const apiPath = join(projectPath, "apps", "api");
      if (!existsSync(apiPath)) {
        throw new Error(`Backend directory not found: ${apiPath}`);
      }
    }

    if (
      !this.options.backendOnly &&
      this.state.config!.template !== "api-only"
    ) {
      const webPath = join(projectPath, "apps", "web");
      if (!existsSync(webPath)) {
        throw new Error(`Frontend directory not found: ${webPath}`);
      }
    }

    // Check Docker availability if needed
    const needsDocker =
      this.state.config!.database?.type === "mongodb" ||
      this.state.config!.ai?.providers?.ollama?.enabled;

    if (needsDocker) {
      const dockerAvailable =
        await this.serviceConfigManager.checkDockerAvailable();
      if (!dockerAvailable) {
        this.logger.warn("Docker not available. Some services may not start.");
      }
    }

    this.logger.success("Environment validation passed");
  }

  private getServiceConfigurations() {
    const config = this.state.config!;
    const projectPath = this.state.projectPath!;

    // If specific services are requested, only start those
    if (this.options.services.length > 0) {
      const allConfigs = this.serviceConfigManager.getServiceConfigs(
        config,
        projectPath
      );
      return allConfigs.filter((c: ServiceConfig) =>
        this.options.services.includes(c.key)
      );
    }

    // Handle frontend-only or backend-only modes
    if (this.options.frontendOnly) {
      return this.serviceConfigManager
        .getServiceConfigs(config, projectPath)
        .filter((c: ServiceConfig) => c.key === "frontend");
    }

    if (this.options.backendOnly) {
      return this.serviceConfigManager
        .getServiceConfigs(config, projectPath)
        .filter((c: ServiceConfig) => c.key !== "frontend");
    }

    // Normal mode - start all configured services
    return this.serviceConfigManager.getServiceConfigs(config, projectPath);
  }

  private async startServicesInPhases(serviceConfigs: any[]): Promise<void> {
    // Group services by startup phases
    const phases = this.groupServicesByPhases(serviceConfigs);

    for (const phase of phases) {
      this.logger.section(`Starting ${phase.name} Services`);

      const phaseServices = serviceConfigs.filter((config) =>
        phase.services.includes(config.key)
      );

      if (phaseServices.length === 0) {
        this.logger.info(`No services in ${phase.name} phase`);
        continue;
      }

      try {
        if (phase.parallel) {
          // Start services in parallel
          await Promise.all(
            phaseServices.map((config) => this.startSingleService(config))
          );
        } else {
          // Start services sequentially
          for (const config of phaseServices) {
            await this.startSingleService(config);
          }
        }
      } catch (error) {
        if (phase.required) {
          throw error;
        } else {
          this.logger.warn(`Optional phase ${phase.name} failed:`, error);
        }
      }

      this.logger.newLine();
    }
  }

  private groupServicesByPhases(
    serviceConfigs: ServiceConfig[]
  ): StartupPhase[] {
    const phases: StartupPhase[] = [
      { name: "database", services: [] },
      { name: "backend", services: [] },
      { name: "frontend", services: [] },
    ];

    serviceConfigs.forEach((service) => {
      const phase = phases.find((p) => p.name === service.key);
      if (phase) {
        phase.services.push(service);
      }
    });

    return phases;
  }

  private async startSingleService(config: any): Promise<void> {
    try {
      this.logger.serviceStarting(config.name);

      await this.processManager.startService(config.key, config);

      const status = this.processManager.getServiceStatus(config.key);
      if (status) {
        this.state.services.set(config.key, status);

        // Determine service URL for display
        const serviceUrl = this.getServiceUrl(config);
        this.logger.serviceReady(config.name, serviceUrl);
      }
    } catch (error) {
      this.logger.serviceFailed(
        config.name,
        error instanceof Error ? error.message : String(error)
      );

      if (config.required) {
        throw error;
      }
    }
  }

  private getServiceUrl(config: any): string | undefined {
    const ports = this.state.config!.development?.ports || {};

    switch (config.key) {
      case "frontend":
        return `http://localhost:${ports.frontend || 3000}`;
      case "backend":
        return `http://localhost:${ports.backend || 8000}`;
      case "ollama":
        return `http://localhost:${ports.ollama || 11434}`;
      default:
        return undefined;
    }
  }

  private printStartupSummary(): void {
    const config = this.state.config!;
    const ports = config.development?.ports || {};

    this.logger.newLine();
    this.logger.banner([
      "🎉 FARM Development Server Ready!",
      "",
      `Template: ${config.template}`,
      `Features: ${config.features?.join(", ") || "none"}`,
      `Uptime: ${Math.round((Date.now() - this.state.startTime!) / 1000)}s`,
    ]);

    this.logger.section("🔗 Service URLs");

    if (this.processManager.hasService("frontend")) {
      this.logger.url("Frontend", `http://localhost:${ports.frontend || 3000}`);
    }

    if (this.processManager.hasService("backend")) {
      this.logger.url("Backend", `http://localhost:${ports.backend || 8000}`);
      this.logger.url(
        "API Docs",
        `http://localhost:${ports.backend || 8000}/docs`
      );
    }

    if (this.processManager.hasService("ollama")) {
      this.logger.url("Ollama AI", `http://localhost:${ports.ollama || 11434}`);
    }

    this.logger.section("📊 Service Status");
    const services = this.processManager.getAllServices();
    services.forEach((service) => {
      const statusIcon = service.status === "healthy" ? "✅" : "⚠️";
      this.logger.keyValue(`${statusIcon} ${service.name}`, service.status);
    });

    this.logger.newLine();
    this.logger.info("🔍 Watching for changes...");
    this.logger.separator();
  }

  private setupEventHandlers(): void {
    // Forward events from process manager
    this.processManager.on("service-starting", (name) => {
      this.emit("service-starting", name);
    });

    this.processManager.on("service-ready", (name) => {
      this.emit("service-ready", name);
    });

    this.processManager.on("service-error", (name, error) => {
      this.emit("service-error", name, error);
    });

    this.processManager.on("service-exit", (name, code, signal) => {
      this.emit("service-exit", name, code, signal);
    });

    this.processManager.on("critical-service-failed", (name) => {
      this.logger.error(`Critical service ${name} failed. Shutting down...`);
      this.shutdown();
    });
  }

  private async shutdown(): Promise<void> {
    if (this.state.status === "stopping" || this.state.status === "stopped") {
      return;
    }

    this.state.status = "stopping";
    this.emit("shutdown-started");

    try {
      this.logger.info("🛑 Shutting down development server...");
      await this.processManager.shutdown();
      this.state.status = "stopped";
      this.logger.success("✅ Development server stopped successfully");
      this.emit("shutdown-complete");
    } catch (error) {
      this.logger.error("Error during shutdown:", error);
      this.state.status = "error";
    }
  }
}

// CLI integration function
export async function startDevServer(
  options: DevServerOptions = {}
): Promise<FarmDevServer> {
  const server = new FarmDevServer(options);
  await server.start();
  return server;
}
