// tools/dev-server/src/process-manager.ts
import { EventEmitter } from "events";
import { spawn, ChildProcess } from "child_process";
import { Logger } from "./logger.js";
import { HealthChecker } from "./health-checker.js";
import type { ServiceConfig, ServiceStatus, ProcessInfo } from "./types.js";

export class ProcessManager extends EventEmitter {
  private processes = new Map<string, ProcessInfo>();
  private logger: Logger;
  private healthChecker: HealthChecker;
  private isShuttingDown = false;

  constructor(logger: Logger) {
    super();
    this.logger = logger;
    this.healthChecker = new HealthChecker(logger);
    this.setupSignalHandlers();
  }

  async startService(name: string, config: ServiceConfig): Promise<void> {
    if (this.processes.has(name)) {
      throw new Error(`Service ${name} is already running`);
    }

    this.logger.info(`Starting service: ${name}`);
    this.emit("service-starting", name);

    try {
      const spawnedProcess = spawn(config.command.cmd, config.command.args, {
        stdio: ["pipe", "pipe", "pipe"],
        env: { ...process.env, ...config.env },
        cwd: config.cwd,
        shell: process.platform === "win32",
      });

      const processInfo: ProcessInfo = {
        name,
        process: spawnedProcess,
        config,
        status: "starting",
        startTime: Date.now(),
        restartCount: 0,
        logs: [],
      };

      this.processes.set(name, processInfo);
      this.setupProcessHandlers(name, processInfo);

      // Wait for service to become healthy
      if (config.healthCheck) {
        await this.waitForHealthy(
          name,
          config.healthCheck,
          config.healthTimeout || 30000
        );
      } else {
        // If no health check, assume healthy after a short delay
        await new Promise((resolve) => setTimeout(resolve, 2000));
        processInfo.status = "healthy";
      }

      this.logger.success(`Service ${name} started successfully`);
      this.emit("service-ready", name);

      // Execute post-start hook if defined
      if (config.postStart) {
        await config.postStart(config);
      }
    } catch (error) {
      this.logger.error(`Failed to start service: ${name}`, error);
      throw error;
    }
  }

  async stopService(name: string): Promise<void> {
    const processInfo = this.processes.get(name);
    if (!processInfo) {
      this.logger.warn(`Service ${name} is not running`);
      return;
    }

    this.logger.info(`Stopping service: ${name}`);
    processInfo.status = "stopping";

    return new Promise((resolve) => {
      const { process } = processInfo;

      // Set a timeout for graceful shutdown
      const timeout = setTimeout(() => {
        this.logger.warn(`Force killing service ${name} after timeout`);
        process.kill("SIGKILL");
      }, 10000);

      process.once("exit", () => {
        clearTimeout(timeout);
        this.processes.delete(name);
        this.logger.info(`Service ${name} stopped`);
        this.emit("service-stopped", name);
        resolve();
      });

      // Try graceful shutdown first
      if (process.killed) {
        clearTimeout(timeout);
        resolve();
      } else {
        process.kill("SIGTERM");
      }
    });
  }

  async restartService(name: string): Promise<void> {
    const processInfo = this.processes.get(name);
    if (!processInfo) {
      throw new Error(`Service ${name} is not running`);
    }

    this.logger.info(`Restarting service: ${name}`);
    const config = processInfo.config;

    await this.stopService(name);
    await new Promise((resolve) => setTimeout(resolve, 1000)); // Brief pause
    await this.startService(name, config);
  }

  getServiceStatus(name: string): ServiceStatus | undefined {
    const processInfo = this.processes.get(name);
    if (!processInfo) return undefined;

    return {
      name,
      status: processInfo.status,
      pid: processInfo.process.pid,
      startTime: processInfo.startTime,
      restartCount: processInfo.restartCount,
      uptime: Date.now() - processInfo.startTime,
    };
  }

  getAllServices(): ServiceStatus[] {
    return Array.from(this.processes.keys()).map(
      (name) => this.getServiceStatus(name)!
    );
  }

  hasService(name: string): boolean {
    return this.processes.has(name);
  }

  getProcess(name: string): ChildProcess | undefined {
    return this.processes.get(name)?.process;
  }

  async shutdown(): Promise<void> {
    if (this.isShuttingDown) return;

    this.isShuttingDown = true;
    this.logger.info("Shutting down all services...");

    const shutdownPromises = Array.from(this.processes.keys()).map((name) =>
      this.stopService(name).catch((error) => {
        this.logger.error(`Error stopping service ${name}:`, error);
      })
    );

    await Promise.all(shutdownPromises);
    this.logger.success("All services shut down successfully");
  }

  private setupProcessHandlers(name: string, processInfo: ProcessInfo): void {
    const { process } = processInfo;

    // Handle stdout
    process.stdout?.on("data", (data: Buffer) => {
      const message = data.toString().trim();
      if (message) {
        processInfo.logs.push({
          timestamp: Date.now(),
          level: "info",
          stream: "stdout",
          message,
        });
        this.logger.service(name, message);
        this.emit("service-log", name, "stdout", message);
      }
    });

    // Handle stderr
    process.stderr?.on("data", (data: Buffer) => {
      const message = data.toString().trim();
      if (message) {
        processInfo.logs.push({
          timestamp: Date.now(),
          level: "error",
          stream: "stderr",
          message,
        });
        this.logger.serviceError(name, message);
        this.emit("service-log", name, "stderr", message);
      }
    });

    // Handle process exit
    process.on("exit", (code: number | null, signal: string | null) => {
      this.handleProcessExit(name, code, signal);
    });

    // Handle process errors
    process.on("error", (error: Error) => {
      this.logger.error(`Process error for ${name}:`, error);
      processInfo.status = "error";
      this.emit("service-error", name, error);
    });
  }

  private async waitForHealthy(
    name: string,
    healthCheckUrl: string,
    timeout: number
  ): Promise<void> {
    const processInfo = this.processes.get(name)!;
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      if (this.isShuttingDown) {
        throw new Error("Shutdown requested during startup");
      }

      try {
        const isHealthy = await this.healthChecker.check(healthCheckUrl);
        if (isHealthy) {
          processInfo.status = "healthy";
          return;
        }
      } catch (error) {
        // Health check failed, continue waiting
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    processInfo.status = "unhealthy";
    throw new Error(
      `Service ${name} failed to become healthy within ${timeout}ms`
    );
  }

  private handleProcessExit(
    name: string,
    code: number | null,
    signal: string | null
  ): void {
    const processInfo = this.processes.get(name);
    if (!processInfo) return;

    if (this.isShuttingDown) {
      // Expected shutdown
      this.processes.delete(name);
      return;
    }

    this.logger.warn(
      `Service ${name} exited with code ${code}, signal ${signal}`
    );

    processInfo.status = "stopped";
    this.emit("service-exit", name, code, signal);

    // Handle restart logic for critical services
    if (processInfo.config.autoRestart && processInfo.restartCount < 3) {
      this.logger.info(
        `Auto-restarting service ${name} (attempt ${
          processInfo.restartCount + 1
        })`
      );
      processInfo.restartCount++;

      setTimeout(async () => {
        try {
          await this.restartService(name);
        } catch (error) {
          this.logger.error(`Failed to auto-restart service ${name}:`, error);
        }
      }, 2000);
    } else if (processInfo.config.required) {
      this.logger.error(
        `Critical service ${name} failed and cannot be restarted`
      );
      this.emit("critical-service-failed", name);
    }
  }

  private setupSignalHandlers(): void {
    const handleShutdown = async (signal: string) => {
      this.logger.info(`Received ${signal}, shutting down...`);
      await this.shutdown();
      process.exit(0);
    };

    process.on("SIGINT", () => handleShutdown("SIGINT"));
    process.on("SIGTERM", () => handleShutdown("SIGTERM"));

    // Handle uncaught exceptions
    process.on("uncaughtException", (error) => {
      this.logger.error("Uncaught exception:", error);
      this.shutdown().finally(() => process.exit(1));
    });

    process.on("unhandledRejection", (reason, promise) => {
      this.logger.error("Unhandled promise rejection:", reason);
      this.shutdown().finally(() => process.exit(1));
    });
  }
}
