import { join } from "path";
import { writeFile } from "fs/promises";
import { ensureDir, copy, pathExists } from "fs-extra";
import type { TemplateDefinition, TemplateContext } from '@farm/types';
import { loadTemplate, loadTemplateFiles } from '../utils/template-loader.js';

export interface ProjectConfig {
  projectName: string;
  targetDir: string;
  template: string;
  features: string[];
  database: string;
  typescript: boolean;
  docker: boolean;
  testing: boolean;
  git: boolean;
  install: boolean;
}

export class ProjectGenerator {
  constructor() {}

  async generateProject(config: ProjectConfig): Promise<void> {
    console.log(`📦 Generating project from template: ${config.template}`);

    // Prepare template context
    const context = this.createTemplateContext(config);

    try {
      // Load template definition
      const templatePath = this.getTemplatePath(config.template);
      const templateDefinition = await loadTemplate(templatePath);

      // Copy template files
      await this.copyTemplateFiles(templatePath, config.targetDir, context);

      // Generate additional files based on features
      await this.generateFeatureFiles(config, context);

      // Initialize git repository
      if (config.git) {
        await this.initializeGit(config.targetDir);
      }

      // Install dependencies
      if (config.install) {
        await this.installDependencies(config.targetDir);
      }

      console.log("✅ Project generation completed");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("❌ Project generation failed:", message);
      throw error;
    }
  }

  private getTemplatePath(templateName: string): string {
    // For now, return a placeholder path - this will be implemented
    // when we add the actual template files
    return join(__dirname, '../../templates', templateName);
  }

  private async copyTemplateFiles(
    templatePath: string, 
    targetDir: string, 
    context: TemplateContext
  ): Promise<void> {
    // Ensure target directory exists
    await ensureDir(targetDir);

    // For now, just create basic structure
    // This will be enhanced when we add actual template files
    console.log("📁 Creating project structure...");
    
    // Create basic directories
    await ensureDir(join(targetDir, 'apps', 'web', 'src'));
    await ensureDir(join(targetDir, 'apps', 'api', 'src'));
    await ensureDir(join(targetDir, 'packages'));
    
    // Create basic files
    await this.createBasicFiles(targetDir, context);
  }

  private async createBasicFiles(targetDir: string, context: TemplateContext): Promise<void> {
    // Create package.json
    const packageJson = {
      name: context.projectName,
      version: "0.1.0",
      private: true,
      workspaces: ["apps/*", "packages/*"],
      scripts: {
        dev: "farm dev",
        build: "farm build",
        clean: "farm clean"
      }
    };

    await writeFile(
      join(targetDir, 'package.json'), 
      JSON.stringify(packageJson, null, 2)
    );

    // Create README.md
    const readme = `# ${context.projectName}

Generated with FARM Stack Framework

## Getting Started

\`\`\`bash
pnpm install
pnpm dev
\`\`\`

## Features

${context.features.map((f: string) => `- ${f}`).join('\n')}
`;

    await writeFile(join(targetDir, 'README.md'), readme);
  }

  private createTemplateContext(config: ProjectConfig): TemplateContext {
    const features = config.features || [];

    return {
      projectName: config.projectName,
      features: features,
      database: config.database,
      answers: {
        projectNameKebab: config.projectName
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "-"),
        projectNameCamel: config.projectName.replace(/[-_\s]+(.)?/g, (_, c) =>
          c ? c.toUpperCase() : ""
        ),
        projectNamePascal: config.projectName
          .replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ""))
          .replace(/^./, (c) => c.toUpperCase()),

        // Template selection
        template: config.template,

        // Features
        hasAuth: features.includes("auth"),
        hasAI: features.includes("ai"),
        hasRealtime: features.includes("realtime"),
        hasPayments: features.includes("payments"),
        hasEmail: features.includes("email"),
        hasStorage: features.includes("storage"),
        hasSearch: features.includes("search"),
        hasAnalytics: features.includes("analytics"),

        // Configuration
        useTypeScript: config.typescript,
        useDocker: config.docker,
        useTesting: config.testing,

        // Database-specific context
        isMongoDb: config.database === "mongodb",
        isPostgreSQL: config.database === "postgresql",
        isMySQL: config.database === "mysql",
        isSQLite: config.database === "sqlite",

        // Template-specific context
        isBasicTemplate: config.template === "basic",
        isAIChatTemplate: config.template === "ai-chat",
        isAIDashboardTemplate: config.template === "ai-dashboard",
        isEcommerceTemplate: config.template === "ecommerce",
        isCMSTemplate: config.template === "cms",
        isAPIOnlyTemplate: config.template === "api-only",

        // Current year for copyright notices
        currentYear: new Date().getFullYear(),
      },
      timestamp: new Date().toISOString(),
      farmVersion: "0.1.0"
    };
  }

  private async generateFeatureFiles(
    config: ProjectConfig,
    context: TemplateContext
  ): Promise<void> {
    // Generate farm.config.ts
    await this.generateFarmConfig(config, context);

    // Generate docker-compose.yml if Docker enabled
    if (config.docker) {
      await this.generateDockerFiles(config, context);
    }

    // Generate .env files
    await this.generateEnvFiles(config, context);
  }

  private async generateFarmConfig(
    config: ProjectConfig,
    context: TemplateContext
  ): Promise<void> {
    const configContent = this.generateFarmConfigContent(config);
    const configPath = join(config.targetDir, "farm.config.ts");
    await writeFile(configPath, configContent);
    console.log("✅ Generated farm.config.ts");
  }

  private generateFarmConfigContent(config: ProjectConfig): string {
    const features = config.features || [];
    const hasAI = features.includes("ai");

    let configContent = `import { defineConfig } from '@farm/core';

export default defineConfig({
  name: '${config.projectName}',
  template: '${config.template}',
  features: [${features.map((f) => `'${f}'`).join(", ")}],

  database: {
    type: '${config.database}',
    url: process.env.DATABASE_URL || '${this.getDefaultDatabaseUrl(
      config.database,
      config.projectName
    )}'
  },
`;

    if (hasAI) {
      configContent += `
  ai: {
    providers: {
      ollama: {
        enabled: true,
        url: 'http://localhost:11434',
        models: ['llama3.1', 'codestral'],
        defaultModel: 'llama3.1',
        autoStart: true,
        autoPull: ['llama3.1']
      },
      openai: {
        enabled: true,
        apiKey: process.env.OPENAI_API_KEY,
        models: ['gpt-4', 'gpt-3.5-turbo'],
        defaultModel: 'gpt-3.5-turbo'
      }
    },
    routing: {
      development: 'ollama',
      production: 'openai'
    },
    features: {
      streaming: true,
      caching: true,
      fallback: true
    }
  },
`;
    }

    configContent += `
  development: {
    ports: {
      frontend: 3000,
      backend: 8000,
      proxy: 4000${hasAI ? ",\n      ollama: 11434" : ""}
    },
    hotReload: {
      enabled: true,
      typeGeneration: true${hasAI ? ",\n      aiModels: true" : ""}
    }
  }
});
`;

    return configContent;
  }

  private getDefaultDatabaseUrl(database: string, projectName: string): string {
    const dbName = projectName.toLowerCase().replace(/[^a-z0-9]/g, "");

    switch (database) {
      case "mongodb":
        return `mongodb://localhost:27017/${dbName}`;
      case "postgresql":
        return `postgresql://user:password@localhost:5432/${dbName}`;
      case "mysql":
        return `mysql://user:password@localhost:3306/${dbName}`;
      case "sqlite":
        return `sqlite://./database.db`;
      default:
        return `mongodb://localhost:27017/${dbName}`;
    }
  }

  private async generateDockerFiles(
    config: ProjectConfig,
    context: TemplateContext
  ): Promise<void> {
    // Generate docker-compose.yml based on features
    const dockerComposeContent = this.generateDockerCompose(config);
    const dockerComposePath = join(config.targetDir, "docker-compose.yml");
    await writeFile(dockerComposePath, dockerComposeContent);
    console.log("✅ Generated docker-compose.yml");
  }

  private generateDockerCompose(config: ProjectConfig): string {
    const features = config.features || [];
    const hasAI = features.includes("ai");
    const projectName = config.projectName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");

    let compose = `version: '3.8'

services:
  mongodb:
    image: mongo:7
    container_name: ${projectName}-mongodb
    ports:
      - "27017:27017"
    environment:
      MONGO_INITDB_DATABASE: ${projectName}
    volumes:
      - mongodb_data:/data/db
    networks:
      - farm-network

`;

    if (hasAI) {
      compose += `  ollama:
    image: ollama/ollama:latest
    container_name: ${projectName}-ollama
    ports:
      - "11434:11434"
    volumes:
      - ollama_data:/root/.ollama
    networks:
      - farm-network
    restart: unless-stopped

`;
    }

    compose += `volumes:
  mongodb_data:
`;

    if (hasAI) {
      compose += `  ollama_data:
`;
    }

    compose += `
networks:
  farm-network:
    driver: bridge
`;

    return compose;
  }

  private async generateEnvFiles(
    config: ProjectConfig,
    context: TemplateContext
  ): Promise<void> {
    const envExample = this.generateEnvExample(config);
    const envPath = join(config.targetDir, ".env.example");
    await writeFile(envPath, envExample);
    console.log("✅ Generated .env.example");
  }

  private generateEnvExample(config: ProjectConfig): string {
    const features = config.features || [];
    const hasAI = features.includes("ai");
    const hasAuth = features.includes("auth");
    const hasPayments = features.includes("payments");

    let envContent = `# Database
DATABASE_URL=${this.getDefaultDatabaseUrl(config.database, config.projectName)}

# Environment
NODE_ENV=development
FARM_ENV=development

`;

    if (hasAI) {
      envContent += `# AI Providers
OPENAI_API_KEY=sk-your-openai-api-key
HUGGINGFACE_TOKEN=hf_your-huggingface-token
OLLAMA_URL=http://localhost:11434

`;
    }

    if (hasAuth) {
      envContent += `# Authentication
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d

`;
    }

    if (hasPayments) {
      envContent += `# Payments
STRIPE_SECRET_KEY=sk_test_your-stripe-secret-key
STRIPE_PUBLISHABLE_KEY=pk_test_your-stripe-publishable-key

`;
    }

    return envContent;
  }

  private async initializeGit(targetDir: string): Promise<void> {
    try {
      // We'll implement git initialization later
      console.log("✅ Git initialization skipped for now");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn("⚠️ Failed to initialize git repository:", message);
    }
  }

  private async installDependencies(targetDir: string): Promise<void> {
    try {
      console.log("📦 Dependency installation skipped for now");
      console.log("💡 You can install them manually with: pnpm install");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn("⚠️ Failed to install dependencies:", message);
      console.log("💡 You can install them manually with: pnpm install");
    }
  }
}