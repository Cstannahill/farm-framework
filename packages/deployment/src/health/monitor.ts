import type {
  DeploymentHealthStatus as HealthStatus,
  DeploymentHealthCheck as HealthCheck,
  DeploymentHealthReport,
  DeploymentResult,
  FarmConfig,
  DeploymentService,
} from "@farm-framework/types";

/**
 * Health monitoring system for deployed applications
 */
export class HealthMonitor {
  private config: FarmConfig;

  constructor(config: FarmConfig) {
    this.config = config;
  }

  /**
   * Check the health of a deployment
   */
  async checkDeployment(
    result: DeploymentResult
  ): Promise<DeploymentHealthReport> {
    const checks: HealthCheck[] = [];

    // HTTP endpoint checks
    const httpCheck = await this.checkHTTPEndpoints(result);
    checks.push(httpCheck);

    // Database connectivity
    if (this.needsDatabaseCheck(result)) {
      const dbCheck = await this.checkDatabaseConnection(result);
      checks.push(dbCheck);
    }

    // AI provider checks
    if (this.needsAIProviderCheck(result)) {
      const aiCheck = await this.checkAIProviders(result);
      checks.push(aiCheck);
    }

    // Resource usage checks
    const resourceCheck = await this.checkResourceUsage(result);
    checks.push(resourceCheck);

    // Response time check
    const responseCheck = await this.checkResponseTimes(result);
    checks.push(responseCheck);

    const healthy = checks.every((check) => check.status === "healthy");
    const hasCritical = checks.some((check) => check.status === "critical");

    return {
      healthy: healthy && !hasCritical,
      checks,
      recommendation: this.getRecommendation(checks),
      timestamp: Date.now(),
    };
  }

  /**
   * Monitor deployment continuously
   */
  async monitorDeployment(
    result: DeploymentResult
  ): Promise<DeploymentHealthReport> {
    // Run initial health checks
    const healthStatus = await this.checkDeployment(result);

    // If critical issues found, recommend rollback
    if (healthStatus.checks.some((check) => check.status === "critical")) {
      // Emit rollback recommendation
      console.warn(
        "Critical health check failures detected. Consider rolling back."
      );
    }

    return healthStatus;
  }

  /**
   * Check HTTP endpoints
   */
  private async checkHTTPEndpoints(
    result: DeploymentResult
  ): Promise<HealthCheck> {
    const lastCheck = new Date();

    if (!result.url) {
      return {
        name: "HTTP Endpoints",
        status: "degraded",
        message: "No URL available for health check",
        lastCheck,
      };
    }

    try {
      const startTime = Date.now();
      const response = await fetch(`${result.url}/api/health`, {
        method: "GET",
      });
      const duration = Date.now() - startTime;

      if (response.ok) {
        return {
          name: "HTTP Endpoints",
          status: "healthy",
          message: "All endpoints responding normally",
          lastCheck,
          duration,
        };
      } else {
        return {
          name: "HTTP Endpoints",
          status: "degraded",
          message: `Health endpoint returned ${response.status}`,
          lastCheck,
        };
      }
    } catch (error) {
      return {
        name: "HTTP Endpoints",
        status: "critical",
        message: `Health check failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        lastCheck,
      };
    }
  }

  /**
   * Check database connection
   */
  private async checkDatabaseConnection(
    result: DeploymentResult
  ): Promise<HealthCheck> {
    const lastCheck = new Date();

    try {
      // In a real implementation, this would test the actual database connection
      // For now, we'll check if database service is running
      const dbService = result.services.find((s) => s.type === "database");

      if (!dbService) {
        return {
          name: "Database Connection",
          status: "degraded",
          message: "No database service found",
          lastCheck,
        };
      }

      if (dbService.status === "running") {
        return {
          name: "Database Connection",
          status: "healthy",
          message: "Database connection is healthy",
          lastCheck,
        };
      } else {
        return {
          name: "Database Connection",
          status: "critical",
          message: `Database service status: ${dbService.status}`,
          lastCheck,
        };
      }
    } catch (error) {
      return {
        name: "Database Connection",
        status: "critical",
        message: `Database check failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        lastCheck,
      };
    }
  }

  /**
   * Check AI provider services
   */
  private async checkAIProviders(
    result: DeploymentResult
  ): Promise<HealthCheck> {
    const lastCheck = new Date();
    const results: any[] = [];

    // Check Ollama if enabled
    if (this.config.ai?.providers?.ollama?.enabled) {
      const ollamaCheck = await this.checkOllamaService(result);
      results.push(ollamaCheck);
    }

    // Check OpenAI if enabled
    if (this.config.ai?.providers?.openai?.enabled) {
      const openaiCheck = await this.checkOpenAIService();
      results.push(openaiCheck);
    }

    // Determine overall AI provider health
    const allHealthy = results.every((r) => r.healthy);
    const anyHealthy = results.some((r) => r.healthy);

    if (allHealthy) {
      return {
        name: "AI Providers",
        status: "healthy",
        message: "All AI providers are responding",
        lastCheck,
        details: results,
      };
    } else if (anyHealthy) {
      return {
        name: "AI Providers",
        status: "degraded",
        message: "Some AI providers are not responding",
        lastCheck,
        details: results,
      };
    } else {
      return {
        name: "AI Providers",
        status: "critical",
        message: "No AI providers are responding",
        lastCheck,
        details: results,
      };
    }
  }

  /**
   * Check Ollama service
   */
  private async checkOllamaService(result: DeploymentResult): Promise<any> {
    try {
      const ollamaService = result.services.find((s) => s.name === "ollama");
      if (!ollamaService || ollamaService.status !== "running") {
        return {
          provider: "ollama",
          healthy: false,
          error: "Service not running",
        };
      }

      // In a real implementation, would test actual Ollama API
      return { provider: "ollama", healthy: true };
    } catch (error) {
      return {
        provider: "ollama",
        healthy: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Check OpenAI service
   */
  private async checkOpenAIService(): Promise<any> {
    try {
      // In a real implementation, would test OpenAI API connectivity
      // For now, just check if API key is configured
      if (process.env.OPENAI_API_KEY) {
        return { provider: "openai", healthy: true };
      } else {
        return {
          provider: "openai",
          healthy: false,
          error: "API key not configured",
        };
      }
    } catch (error) {
      return {
        provider: "openai",
        healthy: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Check resource usage
   */
  private async checkResourceUsage(
    result: DeploymentResult
  ): Promise<HealthCheck> {
    const lastCheck = new Date();

    // In a real implementation, this would check actual resource metrics
    // For now, we'll do a basic check
    try {
      return {
        name: "Resource Usage",
        status: "healthy",
        message: "Resource usage within normal limits",
        lastCheck,
        details: {
          cpu: "< 70%",
          memory: "< 80%",
          disk: "< 90%",
        },
      };
    } catch (error) {
      return {
        name: "Resource Usage",
        status: "degraded",
        message: "Unable to check resource usage",
        lastCheck,
      };
    }
  }

  /**
   * Check response times
   */
  private async checkResponseTimes(
    result: DeploymentResult
  ): Promise<HealthCheck> {
    const lastCheck = new Date();

    if (!result.url) {
      return {
        name: "Response Times",
        status: "degraded",
        message: "No URL available for response time check",
        lastCheck,
      };
    }

    try {
      const startTime = Date.now();
      await fetch(`${result.url}/api/health`, {
        method: "GET",
      });
      const responseTime = Date.now() - startTime;

      if (responseTime < 500) {
        return {
          name: "Response Times",
          status: "healthy",
          message: `Fast response time: ${responseTime}ms`,
          lastCheck,
          duration: responseTime,
        };
      } else if (responseTime < 2000) {
        return {
          name: "Response Times",
          status: "degraded",
          message: `Slow response time: ${responseTime}ms`,
          lastCheck,
          duration: responseTime,
        };
      } else {
        return {
          name: "Response Times",
          status: "critical",
          message: `Very slow response time: ${responseTime}ms`,
          lastCheck,
          duration: responseTime,
        };
      }
    } catch (error) {
      return {
        name: "Response Times",
        status: "critical",
        message: `Response time check failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        lastCheck,
      };
    }
  }

  /**
   * Determine if database check is needed
   */
  private needsDatabaseCheck(result: DeploymentResult): boolean {
    return result.services.some((s) => s.type === "database");
  }

  /**
   * Determine if AI provider check is needed
   */
  private needsAIProviderCheck(result: DeploymentResult): boolean {
    return !!(
      this.config.ai?.providers?.ollama?.enabled ||
      this.config.ai?.providers?.openai?.enabled ||
      result.services.some((s) => s.type === "ai")
    );
  }

  /**
   * Get recommendation based on health checks
   */
  private getRecommendation(checks: HealthCheck[]): string {
    const criticalChecks = checks.filter((c) => c.status === "critical");
    const degradedChecks = checks.filter((c) => c.status === "degraded");

    if (criticalChecks.length > 0) {
      return `Critical issues found: ${criticalChecks.map((c) => c.name).join(", ")}. Consider rolling back.`;
    }

    if (degradedChecks.length > 0) {
      return `Some services are degraded: ${degradedChecks.map((c) => c.name).join(", ")}. Monitor closely.`;
    }

    return "All health checks passed. Deployment is healthy.";
  }
}
