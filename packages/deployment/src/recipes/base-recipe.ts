import type {
  FarmConfig,
  DeployOptions,
  DeploymentService,
  ResourceLimits,
} from "@farm-framework/types";

/**
 * Base class for deployment recipes with common functionality
 */
export abstract class BaseRecipe {
  /**
   * Generate environment variables common to all platforms
   */
  protected generateBaseEnvironmentVariables(
    config: FarmConfig,
    options: DeployOptions
  ): Record<string, string> {
    const env: Record<string, string> = {
      NODE_ENV: "production",
      FARM_ENV: options.environment || "production",
    };

    // Database configuration
    if (config.database?.type === "postgresql") {
      env.DATABASE_URL = "${DATABASE_URL}";
      env.DATABASE_TYPE = "postgresql";
    } else if (config.database?.type === "mysql") {
      env.DATABASE_URL = "${DATABASE_URL}";
      env.DATABASE_TYPE = "mysql";
    }

    // AI provider configuration
    if (config.ai?.providers?.openai?.enabled) {
      env.OPENAI_API_KEY = "${OPENAI_API_KEY}";
    }

    if (config.ai?.providers?.anthropic?.enabled) {
      env.ANTHROPIC_API_KEY = "${ANTHROPIC_API_KEY}";
    }

    if (config.ai?.providers?.huggingface?.enabled) {
      env.HUGGINGFACE_API_KEY = "${HUGGINGFACE_API_KEY}";
    }

    // Auth configuration
    if (config.auth?.enabled) {
      env.JWT_SECRET = "${JWT_SECRET}";
      env.AUTH_SECRET = "${AUTH_SECRET}";
    }

    // Custom environment variables from config
    if (config.deployment?.env) {
      Object.assign(env, config.deployment.env);
    }

    // Secrets from deployment options
    if (options.secrets) {
      Object.assign(env, options.secrets);
    }

    return env;
  }

  /**
   * Get default resource limits
   */
  protected getDefaultResourceLimits(): ResourceLimits {
    return {
      memory: "1Gi",
      cpu: "500m",
      disk: "10Gi",
    };
  }

  /**
   * Determine if the deployment needs a database service
   */
  protected needsDatabase(config: FarmConfig): boolean {
    return !!(config.database?.type && config.database.type !== "sqlite");
  }

  /**
   * Determine if the deployment needs Redis cache
   */
  protected needsCache(config: FarmConfig): boolean {
    return !!(config.cache?.enabled && config.cache.type === "redis");
  }

  /**
   * Determine if the deployment needs AI services
   */
  protected needsAIServices(config: FarmConfig): boolean {
    return !!config.ai?.providers?.ollama?.enabled;
  }

  /**
   * Generate health check configuration
   */
  protected getDefaultHealthCheck() {
    return {
      type: "http" as const,
      path: "/api/health",
      interval: 30,
      timeout: 10,
      retries: 3,
      gracePeriod: 60,
    };
  }

  /**
   * Generate common Docker build args
   */
  protected getDockerBuildArgs(config: FarmConfig): Record<string, string> {
    return {
      NODE_ENV: "production",
      BUILD_ENV: "production",
      // Add any config-specific build args
      ...(config.build?.args || {}),
    };
  }

  /**
   * Calculate estimated monthly cost base
   */
  protected calculateBaseCost(services: DeploymentService[]): number {
    let cost = 0;

    for (const service of services) {
      switch (service.type) {
        case "web":
        case "api":
          cost += 10;
          break;
        case "database":
          cost += 15;
          break;
        case "ai":
          cost += 25;
          break;
        case "cache":
          cost += 8;
          break;
        case "worker":
          cost += 12;
          break;
        default:
          cost += 5;
      }

      // Adjust for resource requirements
      if (service.resources?.memory) {
        const memoryGb = this.parseMemoryToGb(service.resources.memory);
        if (memoryGb > 1) {
          cost += (memoryGb - 1) * 5;
        }
      }
    }

    return cost;
  }

  /**
   * Parse memory string to GB
   */
  private parseMemoryToGb(memory: string): number {
    const match = memory.match(/^(\d+(?:\.\d+)?)(Mi|Gi|GB|MB)$/i);
    if (!match) return 1;

    const value = parseFloat(match[1]);
    const unit = match[2].toLowerCase();

    switch (unit) {
      case "mi":
      case "mb":
        return value / 1024;
      case "gi":
      case "gb":
        return value;
      default:
        return 1;
    }
  }

  /**
   * Validate deployment configuration
   */
  protected validateConfig(config: FarmConfig): void {
    if (!config) {
      throw new Error("Farm configuration is required");
    }

    // Validate database config if specified
    if (
      config.database?.type &&
      !["sqlite", "postgresql", "mysql"].includes(config.database.type)
    ) {
      throw new Error(`Unsupported database type: ${config.database.type}`);
    }

    // Validate AI config
    if (
      config.ai?.providers?.ollama?.enabled &&
      !config.ai.providers.ollama.baseUrl &&
      !config.ai.providers.ollama.gpu
    ) {
      throw new Error(
        "Ollama provider requires either baseUrl or GPU configuration"
      );
    }
  }

  /**
   * Generate application name from config
   */
  protected generateAppName(
    config: FarmConfig,
    options: DeployOptions
  ): string {
    const name = config.name || "farm-app";
    const env = options.environment || "production";
    const sanitized = name.toLowerCase().replace(/[^a-z0-9-]/g, "-");

    if (env === "production") {
      return sanitized;
    }

    return `${sanitized}-${env}`;
  }

  /**
   * Get deployment timeout in seconds
   */
  protected getDeploymentTimeout(): number {
    return parseInt(process.env.FARM_DEPLOY_TIMEOUT || "600", 10);
  }

  /**
   * Check if running in CI environment
   */
  protected isCI(): boolean {
    return !!(
      process.env.CI ||
      process.env.GITHUB_ACTIONS ||
      process.env.GITLAB_CI
    );
  }
}
