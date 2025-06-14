import type {
  DeployRecipe,
  Platform,
  FarmConfig,
  DeployOptions,
  DeploymentPlan,
  DeployContext,
  DeploymentResult,
  RollbackOptions,
  CostEstimate,
  RailwayConfig,
  RailwayService,
  DeploymentService,
  ResourceLimits,
} from "@farm-framework/types";

import { BaseRecipe } from "../base-recipe.js";
import { generateId } from "../../utils/id.js";
import { execSync } from "child_process";
import * as fs from "fs/promises";
import * as path from "path";

/**
 * Railway deployment recipe - The developer favorite platform
 *
 * Features:
 * - Automatic database provisioning
 * - Built-in Ollama support
 * - Zero-config HTTPS
 * - Instant rollbacks
 */
export class RailwayRecipe extends BaseRecipe implements DeployRecipe {
  readonly name: Platform = "railway";

  /**
   * Detect if Railway is a good fit for this project
   */
  async detect(config: FarmConfig): Promise<boolean> {
    // Railway is good for projects that:
    // - Don't require GPU (Ollama without GPU mode)
    // - Use PostgreSQL or SQLite
    // - Are developed by small teams

    const hasGPU = config.ai?.providers?.ollama?.gpu;
    const dbType = config.database?.type;

    // Not suitable if GPU is required
    if (hasGPU) return false;

    // Great for PostgreSQL and SQLite
    if (dbType === "postgresql" || dbType === "sqlite") return true;

    // Generally good default choice
    return true;
  }

  /**
   * Generate Railway deployment plan
   */
  async generatePlan(
    config: FarmConfig,
    options: DeployOptions
  ): Promise<DeploymentPlan> {
    const services = await this.generateServices(config, options);
    const railwayConfig = await this.generateRailwayConfig(
      config,
      options,
      services
    );

    return {
      id: generateId(),
      platform: "railway",
      region: (options.region as any) || "us-west1",
      environment: options.environment || "production",
      strategy: options.strategy || "rolling",
      services,
      estimatedCost: await this.estimateCost(config, services),
      estimatedTime: this.estimateDeploymentTime(services),
      startTime: Date.now(),
      config,
      steps: [
        {
          name: "Validate Railway CLI",
          title: "Validate Railway CLI",
          status: "pending",
        },
        {
          name: "Create or link Railway project",
          title: "Create or link Railway project",
          status: "pending",
        },
        {
          name: "Build and push Docker image",
          title: "Build and push Docker image",
          status: "pending",
        },
        {
          name: "Deploy services",
          title: "Deploy services",
          status: "pending",
        },
        {
          name: "Configure database",
          title: "Configure database",
          status: "pending",
        },
        {
          name: "Setup domains",
          title: "Setup domains",
          status: "pending",
        },
        {
          name: "Run health checks",
          title: "Run health checks",
          status: "pending",
        },
      ],
    };
  }

  /**
   * Execute Railway deployment
   */
  async execute(
    plan: DeploymentPlan,
    context: DeployContext
  ): Promise<DeploymentResult> {
    const startTime = Date.now();
    const errors: string[] = [];

    try {
      // Step 1: Validate Railway CLI
      await this.ensureRailwayCLI();

      // Step 2: Create or link project
      const projectId = await this.createOrLinkProject(plan, context);

      // Step 3: Build optimized Docker image
      const dockerImage = await this.buildOptimizedImage(plan, context);

      // Step 4: Deploy services
      const deployedServices = await this.deployServices(
        plan,
        projectId,
        dockerImage
      );

      // Step 5: Configure database
      if (this.needsDatabase(plan)) {
        await this.configureDatabase(plan, projectId);
      }

      // Step 6: Setup domains
      const urls = await this.setupDomains(plan, projectId);

      // Step 7: Wait for services to be ready
      await this.waitForServicesReady(deployedServices);

      return {
        success: true,
        platform: "railway",
        environment: plan.environment,
        id: plan.id,
        url: urls.primary,
        services: deployedServices.map((service) => ({
          name: service.name,
          type: service.type,
          url: service.url,
          status: "running",
        })),
        duration: Date.now() - startTime,
        region: plan.region,
        estimatedCost: plan.estimatedCost.monthly,
      };
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));

      return {
        success: false,
        platform: "railway",
        environment: plan.environment,
        id: plan.id,
        services: [],
        duration: Date.now() - startTime,
        region: plan.region,
        errors,
      };
    }
  }

  /**
   * Rollback Railway deployment
   */
  async rollback(
    result: DeploymentResult,
    options: RollbackOptions = {}
  ): Promise<void> {
    if (options.dryRun) {
      console.log("Would rollback Railway deployment:", result.id);
      return;
    }

    // Railway rollback implementation
    try {
      execSync(`railway rollback --service ${result.id}`, {
        stdio: "inherit",
      });
    } catch (error) {
      throw new Error(`Railway rollback failed: ${error}`);
    }
  }

  /**
   * Generate Railway services configuration
   */
  private async generateServices(
    config: FarmConfig,
    options: DeployOptions
  ): Promise<DeploymentService[]> {
    const services: DeploymentService[] = [];

    // Main application service
    services.push({
      name: "farm-app",
      type: "web",
      port: 8000,
      env: this.generateEnvironmentVariables(config, options),
      resources: this.getResourceLimits(options),
      healthCheck: {
        type: "http",
        path: "/api/health",
        interval: 30,
        timeout: 10,
        retries: 3,
      },
    });

    // Database service (if needed)
    if (config.database?.type === "postgresql") {
      services.push({
        name: "postgres",
        type: "database",
        env: {
          POSTGRES_DB: "farmdb",
          POSTGRES_USER: "farm",
          POSTGRES_PASSWORD: "{{RAILWAY_SECRET}}",
        },
      });
    }

    // Ollama service (if AI is enabled)
    if (config.ai?.providers?.ollama?.enabled) {
      services.push({
        name: "ollama",
        type: "ai",
        port: 11434,
        resources: {
          memory: "4Gi",
          cpu: "2000m",
        },
        volumes: [
          {
            name: "ollama-models",
            mount: "/root/.ollama",
          },
        ],
        env: {
          OLLAMA_HOST: "0.0.0.0",
        },
      });
    }

    // Redis cache (if caching is enabled)
    if (config.cache?.enabled) {
      services.push({
        name: "redis",
        type: "cache",
        port: 6379,
      });
    }

    return services;
  }

  /**
   * Generate Railway configuration
   */
  private async generateRailwayConfig(
    config: FarmConfig,
    options: DeployOptions,
    services: DeploymentService[]
  ): Promise<RailwayConfig> {
    return {
      version: 1,
      build: {
        builder: "DOCKERFILE",
        dockerfilePath: await this.generateDockerfile(config),
      },
      deploy: {
        startCommand: "farm start --production",
        healthcheckPath: "/api/health",
        restartPolicyType: "ON_FAILURE",
        restartPolicyMaxRetries: 3,
      },
      services: services.map((service) =>
        this.convertToRailwayService(service)
      ),
      env: this.generateEnvironmentVariables(config, options),
    };
  }

  /**
   * Convert deployment service to Railway service
   */
  private convertToRailwayService(service: DeploymentService): RailwayService {
    return {
      name: service.name,
      source: {
        type: "docker",
        image: service.image || "farm-app:latest",
      },
      deploy: {
        region: "us-west1",
        replicas: 1,
        strategy: "ROLLING",
        resources: service.resources,
      },
      env: service.env,
      volumes: service.volumes,
    };
  }

  /**
   * Generate optimized Dockerfile for Railway
   */
  private async generateDockerfile(config: FarmConfig): Promise<string> {
    const dockerfile = `
# Multi-stage build optimized for Railway
FROM node:18-alpine AS frontend-builder
WORKDIR /app
COPY pnpm-lock.yaml package.json ./
RUN npm install -g pnpm
RUN pnpm fetch
COPY apps/web ./apps/web
COPY packages ./packages
RUN pnpm install --offline
RUN pnpm build:frontend

FROM python:3.11-slim AS backend-builder
WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY apps/api ./apps/api
RUN pip install -e ./apps/api

FROM python:3.11-slim AS production
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \\
    curl \\
    && rm -rf /var/lib/apt/lists/*

# Copy built applications
COPY --from=frontend-builder /app/apps/web/dist ./static
COPY --from=backend-builder /app/apps/api ./apps/api
COPY --from=backend-builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages

# Create non-root user
RUN useradd -m -u 1000 farmuser
USER farmuser

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \\
  CMD curl -f http://localhost:8000/api/health || exit 1

CMD ["python", "-m", "uvicorn", "apps.api.main:app", "--host", "0.0.0.0", "--port", "8000"]
    `.trim();

    const dockerfilePath = path.join(process.cwd(), "Dockerfile.railway");
    await fs.writeFile(dockerfilePath, dockerfile);
    return dockerfilePath;
  }

  /**
   * Ensure Railway CLI is installed and authenticated
   */
  private async ensureRailwayCLI(): Promise<void> {
    try {
      execSync("railway --version", { stdio: "ignore" });
    } catch {
      throw new Error(
        "Railway CLI not found. Install it with: npm install -g @railway/cli"
      );
    }

    try {
      execSync("railway whoami", { stdio: "ignore" });
    } catch {
      throw new Error("Railway CLI not authenticated. Run: railway login");
    }
  }

  /**
   * Create or link Railway project
   */
  private async createOrLinkProject(
    plan: DeploymentPlan,
    context: DeployContext
  ): Promise<string> {
    try {
      // Try to link existing project first
      const result = execSync("railway status --json", { encoding: "utf-8" });
      const status = JSON.parse(result);
      return status.project.id;
    } catch {
      // Create new project
      const projectName = `farm-${plan.environment}-${context.gitBranch}`;
      execSync(`railway project create ${projectName}`, { stdio: "inherit" });

      const result = execSync("railway status --json", { encoding: "utf-8" });
      const status = JSON.parse(result);
      return status.project.id;
    }
  }

  /**
   * Build optimized Docker image
   */
  private async buildOptimizedImage(
    plan: DeploymentPlan,
    context: DeployContext
  ): Promise<string> {
    const imageName = `farm-app:${context.gitCommit.substring(0, 8)}`;

    execSync(`docker build -f Dockerfile.railway -t ${imageName} .`, {
      stdio: "inherit",
      cwd: context.workingDir,
    });

    return imageName;
  }

  /**
   * Deploy services to Railway
   */
  private async deployServices(
    plan: DeploymentPlan,
    projectId: string,
    dockerImage: string
  ): Promise<any[]> {
    const deployedServices = [];

    for (const service of plan.services) {
      console.log(`Deploying service: ${service.name}`);

      execSync(`railway service create ${service.name}`, { stdio: "inherit" });
      execSync(`railway up --service ${service.name}`, { stdio: "inherit" });

      deployedServices.push({
        name: service.name,
        type: service.type,
        url: `https://${service.name}-${projectId}.railway.app`,
      });
    }

    return deployedServices;
  }

  /**
   * Configure database service
   */
  private async configureDatabase(
    plan: DeploymentPlan,
    projectId: string
  ): Promise<void> {
    console.log("Configuring database...");

    // Add PostgreSQL service
    execSync("railway add postgresql", { stdio: "inherit" });

    // Run migrations if needed
    if (plan.config.database?.migrations) {
      execSync("railway run python manage.py migrate", { stdio: "inherit" });
    }
  }

  /**
   * Setup domains and SSL
   */
  private async setupDomains(
    plan: DeploymentPlan,
    projectId: string
  ): Promise<{ primary: string; services: Record<string, string> }> {
    const urls = {
      primary: `https://farm-app-${projectId}.railway.app`,
      services: {} as Record<string, string>,
    };

    // Setup custom domains if specified
    if (plan.domains && plan.domains.length > 0) {
      for (const domain of plan.domains) {
        execSync(`railway domain create ${domain}`, { stdio: "inherit" });
        urls.primary = `https://${domain}`;
      }
    }

    return urls;
  }

  /**
   * Wait for services to be ready
   */
  private async waitForServicesReady(services: any[]): Promise<void> {
    console.log("Waiting for services to be ready...");

    // Simple wait - in production this would do actual health checks
    await new Promise((resolve) => setTimeout(resolve, 30000));
  }

  /**
   * Check if deployment needs database
   */
  private needsDatabase(plan: DeploymentPlan): boolean {
    return plan.services.some((s) => s.type === "database");
  }

  /**
   * Estimate deployment cost
   */
  private async estimateCost(
    config: FarmConfig,
    services: DeploymentService[]
  ): Promise<CostEstimate> {
    let monthlyCost = 5; // Base Railway cost

    // Add costs for additional services
    if (services.some((s) => s.type === "database")) {
      monthlyCost += 10; // PostgreSQL addon
    }

    if (services.some((s) => s.type === "ai")) {
      monthlyCost += 20; // Higher resource usage for AI
    }

    return {
      monthly: monthlyCost,
      formatted: `$${monthlyCost}/month`,
      breakdown: {
        compute: {
          monthly: monthlyCost - 10,
          description: "Web service",
          optimizable: false,
        },
        storage: {
          monthly: 5,
          description: "Database storage",
          optimizable: true,
        },
        bandwidth: {
          monthly: 0,
          description: "Included in plan",
          optimizable: false,
        },
        ai: {
          monthly: 5,
          description: "AI service resources",
          optimizable: true,
        },
        addons: {
          monthly: 0,
          description: "No additional addons",
          optimizable: false,
        },
      },
    };
  }

  /**
   * Estimate deployment time in minutes
   */
  private estimateDeploymentTime(services: DeploymentService[]): number {
    let baseTime = 3; // Base deployment time

    // Add time for each service
    baseTime += services.length * 1;

    // Add extra time for AI services
    if (services.some((s) => s.type === "ai")) {
      baseTime += 5;
    }

    return baseTime;
  }

  /**
   * Generate environment variables
   */
  private generateEnvironmentVariables(
    config: FarmConfig,
    options: DeployOptions
  ): Record<string, string> {
    const env: Record<string, string> = {
      NODE_ENV: "production",
      FARM_ENV: options.environment || "production",
      PORT: "8000",
    };

    // Database configuration
    if (config.database?.type === "postgresql") {
      env.DATABASE_URL = "${DATABASE_URL}";
    }

    // AI configuration
    if (config.ai?.providers?.openai?.enabled) {
      env.OPENAI_API_KEY = "${OPENAI_API_KEY}";
    }

    if (config.ai?.providers?.ollama?.enabled) {
      env.OLLAMA_BASE_URL = "http://ollama:11434";
    }

    // Custom environment variables
    if (options.secrets) {
      Object.assign(env, options.secrets);
    }

    return env;
  }

  /**
   * Get resource limits based on options
   */
  private getResourceLimits(
    options: DeployOptions
  ): ResourceLimits | undefined {
    if (options.resources) {
      return options.resources;
    }

    // Default resource limits for Railway
    return {
      memory: "1Gi",
      cpu: "500m",
    };
  }
}
