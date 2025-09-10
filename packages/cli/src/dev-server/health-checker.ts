// tools/dev-server/src/health-checker.ts
import { Logger } from "./logger.js";

export interface HealthCheckResult {
  healthy: boolean;
  responseTime: number;
  error?: string;
}

export class HealthChecker {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  async check(url: string, timeout: number = 5000): Promise<boolean> {
    try {
      const result = await this.checkWithDetails(url, timeout);
      return result.healthy;
    } catch {
      return false;
    }
  }

  async checkWithDetails(
    url: string,
    timeout: number = 5000
  ): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      // Create AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        method: "GET",
        signal: controller.signal,
        headers: {
          "User-Agent": "FARM-DevServer-HealthCheck/1.0",
        },
      });

      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;

      if (response.ok) {
        return {
          healthy: true,
          responseTime,
        };
      } else {
        return {
          healthy: false,
          responseTime,
          error: `HTTP ${response.status}: ${response.statusText}`,
        };
      }
    } catch (error) {
      const responseTime = Date.now() - startTime;

      if (error instanceof Error) {
        if (error.name === "AbortError") {
          return {
            healthy: false,
            responseTime,
            error: `Timeout after ${timeout}ms`,
          };
        }

        // Handle connection errors
        if (error.message.includes("ECONNREFUSED")) {
          return {
            healthy: false,
            responseTime,
            error: "Connection refused - service not ready",
          };
        }

        return {
          healthy: false,
          responseTime,
          error: error.message,
        };
      }

      return {
        healthy: false,
        responseTime,
        error: "Unknown error",
      };
    }
  }

  async waitForHealthy(
    url: string,
    maxWaitTime: number = 30000,
    checkInterval: number = 1000
  ): Promise<boolean> {
    const startTime = Date.now();
    let lastError: string | undefined;

    while (Date.now() - startTime < maxWaitTime) {
      const result = await this.checkWithDetails(url);

      if (result.healthy) {
        if (lastError) {
          this.logger.info(`Health check recovered for ${url}`);
        }
        return true;
      }

      // Only log if error changes to avoid spam
      if (result.error && result.error !== lastError) {
        this.logger.debug(`Health check failed for ${url}: ${result.error}`);
        lastError = result.error;
      }

      await new Promise((resolve) => setTimeout(resolve, checkInterval));
    }

    this.logger.warn(
      `Health check timed out for ${url} after ${maxWaitTime}ms`
    );
    return false;
  }

  async checkMultiple(
    urls: string[],
    timeout: number = 5000
  ): Promise<Record<string, HealthCheckResult>> {
    const checks = urls.map(async (url) => {
      const result = await this.checkWithDetails(url, timeout);
      return [url, result] as const;
    });

    const results = await Promise.all(checks);
    return Object.fromEntries(results);
  }

  // Specialized health checks for common services
  async checkMongoDB(
    url: string = "mongodb://localhost:27017"
  ): Promise<boolean> {
    try {
      // For MongoDB, we'll try to connect using a simple TCP check
      // In a real implementation, you might use the MongoDB driver
      const host = url.includes("://") ? new URL(url).hostname : "localhost";
      const port = url.includes("://") ? new URL(url).port || "27017" : "27017";

      // Simple TCP connection check
      const { createConnection } = await import("net");

      return new Promise((resolve) => {
        const socket = createConnection(parseInt(port), host);

        socket.on("connect", () => {
          socket.destroy();
          resolve(true);
        });

        socket.on("error", () => {
          resolve(false);
        });

        setTimeout(() => {
          socket.destroy();
          resolve(false);
        }, 5000);
      });
    } catch {
      return false;
    }
  }

  async checkOllama(url: string = "http://localhost:11434"): Promise<boolean> {
    try {
      // Ollama has a specific API endpoint we can check
      return await this.check(`${url}/api/tags`);
    } catch {
      return false;
    }
  }

  async checkFastAPI(url: string = "http://localhost:8000"): Promise<boolean> {
    try {
      // Try the health endpoint first, fall back to docs
      const healthCheck = await this.check(`${url}/health`);
      if (healthCheck) return true;

      // Fallback to docs endpoint which FastAPI always provides
      return await this.check(`${url}/docs`);
    } catch {
      return false;
    }
  }

  async checkVite(url: string = "http://localhost:3000"): Promise<boolean> {
    try {
      return await this.check(url);
    } catch {
      return false;
    }
  }
}
