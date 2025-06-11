// tools/dev-server/src/service-configs.ts
import { readFileSync } from "fs";
import { join } from "path";
import type { ServiceConfig, FarmConfig } from "./types.js";
import { Logger } from "./logger.js";

export class ServiceConfigManager {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }
  getServiceConfigs(
    farmConfig: FarmConfig,
    projectPath: string
  ): ServiceConfig[] {
    const configs: ServiceConfig[] = [];

    // Always include database
    configs.push(this.getDatabaseConfig(farmConfig, projectPath));

    // Add Ollama if AI features are enabled
    if (this.shouldStartOllama(farmConfig)) {
      configs.push(this.getOllamaConfig(farmConfig, projectPath));
    }

    // Add backend (FastAPI)
    configs.push(this.getBackendConfig(farmConfig, projectPath));

    // Add type-sync if type generation is enabled
    if (this.shouldStartTypeSync(farmConfig)) {
      configs.push(this.getTypeSyncConfig(farmConfig, projectPath));
    }

    // Add frontend (React/Vite) if not API-only
    if (farmConfig.template !== "api-only") {
      configs.push(this.getFrontendConfig(farmConfig, projectPath));
    }

    return configs.sort((a, b) => a.order - b.order);
  }
  private shouldStartOllama(farmConfig: FarmConfig): boolean {
    return !!(
      farmConfig.features?.includes("ai") &&
      farmConfig.ai?.providers?.ollama?.enabled &&
      farmConfig.ai?.providers?.ollama?.autoStart
    );
  }

  private shouldStartTypeSync(farmConfig: FarmConfig): boolean {
    return !!(
      farmConfig.development?.hotReload?.typeGeneration &&
      farmConfig.template !== "api-only"
    );
  }

  private getDatabaseConfig(
    farmConfig: FarmConfig,
    projectPath: string
  ): ServiceConfig {
    const dbType = farmConfig.database?.type || "mongodb";
    const ports = farmConfig.development?.ports || {};

    switch (dbType) {
      case "mongodb":
        return {
          name: "MongoDB",
          key: "database",
          command: {
            cmd: "docker",
            args: ["compose", "up", "mongodb", "-d"],
          },
          cwd: projectPath,
          healthCheck: `http://localhost:${ports.database || 27017}`,
          healthTimeout: 30000,
          required: true,
          autoRestart: true,
          order: 1,
          env: {
            MONGO_PORT: String(ports.database || 27017),
          },
          postStart: async () => {
            this.logger.success("MongoDB container started");
          },
        };

      case "postgresql":
        return {
          name: "PostgreSQL",
          key: "database",
          command: {
            cmd: "docker",
            args: ["compose", "up", "postgres", "-d"],
          },
          cwd: projectPath,
          healthCheck: `http://localhost:${ports.database || 5432}`,
          healthTimeout: 30000,
          required: true,
          autoRestart: true,
          order: 1,
          env: {
            POSTGRES_PORT: String(ports.database || 5432),
          },
        };

      default:
        throw new Error(`Unsupported database type: ${dbType}`);
    }
  }

  private getOllamaConfig(
    farmConfig: FarmConfig,
    projectPath: string
  ): ServiceConfig {
    const ollamaConfig = farmConfig.ai?.providers?.ollama!;
    const ports = farmConfig.development?.ports || {};
    const ollamaPort = ports.ollama || 11434;

    return {
      name: "Ollama AI",
      key: "ollama",
      command: {
        cmd: "docker",
        args: [
          "run",
          "--rm",
          "-d",
          "--name",
          "farm-ollama",
          "-p",
          `${ollamaPort}:11434`,
          "-v",
          "ollama:/root/.ollama",
          "--pull",
          "missing",
          ...(ollamaConfig.gpu ? ["--gpus", "all"] : []),
          "ollama/ollama",
        ],
      },
      cwd: projectPath,
      healthCheck: `http://localhost:${ollamaPort}/api/tags`,
      healthTimeout: 60000, // Ollama can take longer to start
      required: false,
      autoRestart: false, // Don't auto-restart Ollama, it's optional
      order: 1.5,
      env: {
        OLLAMA_HOST: `http://localhost:${ollamaPort}`,
        OLLAMA_PORT: String(ollamaPort),
      },
      postStart: async (config) => {
        await this.handleOllamaPostStart(ollamaConfig, ollamaPort);
      },
    };
  }

  private async handleOllamaPostStart(
    ollamaConfig: any,
    port: number
  ): Promise<void> {
    const autoPullModels = ollamaConfig.autoPull || [];

    if (autoPullModels.length === 0) {
      this.logger.info("No models configured for auto-pull");
      return;
    }

    this.logger.info(`Auto-pulling ${autoPullModels.length} Ollama models...`);

    for (const modelName of autoPullModels) {
      try {
        this.logger.info(`📥 Pulling Ollama model: ${modelName}`);
        await this.pullOllamaModel(modelName, port);
        this.logger.success(`✅ Successfully pulled: ${modelName}`);
      } catch (error) {
        this.logger.warn(`⚠️ Failed to pull model ${modelName}:`, error);
      }
    }
  }

  private async pullOllamaModel(
    modelName: string,
    port: number
  ): Promise<void> {
    const url = `http://localhost:${port}/api/pull`;

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: modelName }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Stream the response to show progress
      const reader = response.body?.getReader();
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = new TextDecoder().decode(value);
          const lines = chunk.split("\n").filter((line) => line.trim());

          for (const line of lines) {
            try {
              const data = JSON.parse(line);
              if (data.status) {
                this.logger.debug(`📦 ${data.status}`);
              }
            } catch {
              // Ignore malformed JSON lines
            }
          }
        }
      }
    } catch (error) {
      throw new Error(`Failed to pull model ${modelName}: ${error}`);
    }
  }

  private getBackendConfig(
    farmConfig: FarmConfig,
    projectPath: string
  ): ServiceConfig {
    const ports = farmConfig.development?.ports || {};
    const backendPort = ports.backend || 8000;

    return {
      name: "FastAPI",
      key: "backend",
      command: {
        cmd: "uvicorn",
        args: [
          "src.main:app",
          "--reload",
          "--host",
          "0.0.0.0",
          "--port",
          String(backendPort),
          "--log-level",
          "info",
        ],
      },
      cwd: join(projectPath, "apps", "api"),
      healthCheck: `http://localhost:${backendPort}/health`,
      healthTimeout: 30000,
      required: true,
      autoRestart: true,
      order: 2,
      env: {
        FARM_ENV: "development",
        PYTHONPATH: ".",
        PORT: String(backendPort),
        ...this.getBackendEnvironmentVariables(farmConfig),
      },
    };
  }

  private getTypeSyncConfig(
    farmConfig: FarmConfig,
    projectPath: string
  ): ServiceConfig {
    const ports = farmConfig.development?.ports || {};
    const backendPort = ports.backend || 8000;

    return {
      name: "Type Sync",
      key: "type-sync",
      command: {
        cmd: "node",
        args: [
          "-e",
          `
          const { TypeSyncOrchestrator, TypeSyncWatcher } = require('@farm-framework/type-sync');
            async function startTypeSync() {
            const orchestrator = new TypeSyncOrchestrator();
            await orchestrator.initialize({
              apiUrl: 'http://localhost:${backendPort}',
              outputDir: 'generated',
              features: {
                client: true,
                hooks: true,
                streaming: true, // Enable streaming by default
                aiHooks: ${farmConfig.features?.includes("ai") || false},
              },
              performance: {
                enableMonitoring: true,
                enableIncrementalGeneration: true,
                maxConcurrency: 4,
                cacheTimeout: 300000,
              },
            });

            // Initial sync
            console.log('🔄 Starting initial type sync...');
            const result = await orchestrator.syncOnce();
            console.log(\`✅ Generated \${result.filesGenerated} type files\`);

            // Start watching
            const watcher = new TypeSyncWatcher(orchestrator);
            await watcher.start();
            console.log('👁️  Watching for API changes...');
          }

          startTypeSync().catch(console.error);
          `,
        ],
      },
      cwd: projectPath,
      healthCheck: undefined, // Type sync doesn't need health checks
      healthTimeout: 10000,
      required: false, // Not required - graceful degradation
      autoRestart: true,
      order: 2.5, // After backend, before frontend
      env: {
        NODE_ENV: "development",
        FARM_API_URL: `http://localhost:${backendPort}`,
      },
    };
  }

  private getBackendEnvironmentVariables(
    farmConfig: FarmConfig
  ): Record<string, string> {
    const env: Record<string, string> = {};
    const ports = farmConfig.development?.ports || {};

    // Database configuration
    if (farmConfig.database?.url) {
      env.DATABASE_URL = farmConfig.database.url;
    } else {
      const dbPort = ports.database || 27017;
      env.DATABASE_URL = `mongodb://localhost:${dbPort}/${
        farmConfig.name || "farmapp"
      }`;
    }

    // AI provider configuration
    if (farmConfig.ai?.providers?.ollama?.enabled) {
      const ollamaPort = ports.ollama || 11434;
      env.OLLAMA_URL = `http://localhost:${ollamaPort}`;
    }

    if (
      farmConfig.ai?.providers?.openai?.enabled &&
      farmConfig.ai.providers.openai.apiKey
    ) {
      env.OPENAI_API_KEY = farmConfig.ai.providers.openai.apiKey;
    }

    // AI routing configuration
    if (farmConfig.ai?.routing?.development) {
      env.AI_PROVIDER = farmConfig.ai.routing.development;
    }

    return env;
  }

  private getFrontendConfig(
    farmConfig: FarmConfig,
    projectPath: string
  ): ServiceConfig {
    const ports = farmConfig.development?.ports || {};
    const frontendPort = ports.frontend || 3000;
    const backendPort = ports.backend || 8000;

    return {
      name: "Vite (React)",
      key: "frontend",
      command: {
        cmd: "npm",
        args: ["run", "dev"],
      },
      cwd: join(projectPath, "apps", "web"),
      healthCheck: `http://localhost:${frontendPort}`,
      healthTimeout: 30000,
      required: true,
      autoRestart: true,
      order: 3,
      env: {
        VITE_API_URL: `http://localhost:${backendPort}`,
        VITE_WS_URL: `ws://localhost:${backendPort}`,
        PORT: String(frontendPort),
        ...this.getFrontendEnvironmentVariables(farmConfig),
      },
    };
  }

  private getFrontendEnvironmentVariables(
    farmConfig: FarmConfig
  ): Record<string, string> {
    const env: Record<string, string> = {};

    // AI configuration for frontend
    if (farmConfig.ai?.providers?.ollama?.enabled) {
      env.VITE_AI_PROVIDER = "ollama";
      env.VITE_AI_DEFAULT_MODEL = farmConfig.ai.providers.ollama.defaultModel;
    }

    // Feature flags
    if (farmConfig.features) {
      env.VITE_FEATURES = farmConfig.features.join(",");
    }

    return env;
  }

  // Utility method to check if Docker is available
  async checkDockerAvailable(): Promise<boolean> {
    try {
      const { spawn } = await import("child_process");

      return new Promise((resolve) => {
        const docker = spawn("docker", ["--version"], { stdio: "pipe" });

        docker.on("exit", (code) => {
          resolve(code === 0);
        });

        docker.on("error", () => {
          resolve(false);
        });

        setTimeout(() => {
          docker.kill();
          resolve(false);
        }, 5000);
      });
    } catch {
      return false;
    }
  }

  // Get minimal config for services that should always work
  getMinimalServiceConfigs(projectPath: string): ServiceConfig[] {
    return [
      {
        name: "FastAPI",
        key: "backend",
        command: {
          cmd: "uvicorn",
          args: [
            "src.main:app",
            "--reload",
            "--host",
            "0.0.0.0",
            "--port",
            "8000",
          ],
        },
        cwd: join(projectPath, "apps", "api"),
        healthCheck: "http://localhost:8000/health",
        healthTimeout: 30000,
        required: true,
        autoRestart: true,
        order: 1,
        env: {
          FARM_ENV: "development",
          PYTHONPATH: ".",
        },
      },
      {
        name: "Vite (React)",
        key: "frontend",
        command: {
          cmd: "npm",
          args: ["run", "dev"],
        },
        cwd: join(projectPath, "apps", "web"),
        healthCheck: "http://localhost:3000",
        healthTimeout: 30000,
        required: true,
        autoRestart: true,
        order: 2,
        env: {
          VITE_API_URL: "http://localhost:8000",
          PORT: "3000",
        },
      },
    ];
  }
}
