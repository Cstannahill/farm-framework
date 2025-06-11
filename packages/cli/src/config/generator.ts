// packages/cli/src/config/generator.ts
import path from "path";
import fs from "fs-extra";

export interface ConfigOptions {
  projectPath: string;
  projectName: string;
  template: string;
  features: string[];
  database: string;
  typescript: boolean;
}

export class ConfigGenerator {
  async generateConfig(options: ConfigOptions): Promise<void> {
    // Generate farm.config.ts
    await this.generateFarmConfig(options);

    // Generate package.json files
    await this.generatePackageJsons(options);

    // Generate environment files
    await this.generateEnvironmentFiles(options);

    // Generate Docker files
    await this.generateDockerFiles(options);

    // Generate TypeScript configs
    if (options.typescript) {
      await this.generateTSConfigs(options);
    }
  }

  private async generateFarmConfig(options: ConfigOptions): Promise<void> {
    const config = this.buildFarmConfig(options);
    const configContent = `import { defineConfig } from '@farm-framework/core';

export default defineConfig(${JSON.stringify(config, null, 2)});
`;

    await fs.writeFile(
      path.join(options.projectPath, "farm.config.ts"),
      configContent
    );
  }

  private buildFarmConfig(options: ConfigOptions) {
    const baseConfig: any = {
      name: options.projectName,
      template: options.template,
      features: options.features,

      database: {
        type: options.database,
        url: `process.env.DATABASE_URL || "${this.getDefaultDatabaseUrl(options.database, options.projectName)}"`,
      },

      development: {
        ports: {
          frontend: 3000,
          backend: 8000,
          proxy: 4000,
        },
        hotReload: {
          enabled: true,
          typeGeneration: true,
        },
      },

      build: {
        target: "node18",
        sourcemap: true,
        outDir: "dist",
      },
    };

    // Add AI configuration if AI features are enabled
    if (options.features.includes("ai")) {
      baseConfig["ai"] = {
        providers: {
          ollama: {
            enabled: true,
            url: "http://localhost:11434",
            models: ["llama3.1", "codestral"],
            defaultModel: "llama3.1",
            autoStart: true,
            autoPull: ["llama3.1"],
          },
          openai: {
            enabled: true,
            apiKey: "process.env.OPENAI_API_KEY",
            models: ["gpt-4", "gpt-3.5-turbo"],
            defaultModel: "gpt-3.5-turbo",
          },
        },
        routing: {
          development: "ollama",
          production: "openai",
        },
        features: {
          streaming: true,
          caching: true,
          fallback: true,
        },
      };
    }

    return baseConfig;
  }

  private getDefaultDatabaseUrl(database: string, projectName: string): string {
    switch (database) {
      case "mongodb":
        return `mongodb://localhost:27017/${projectName}`;
      case "postgresql":
        return `postgresql://user:password@localhost:5432/${projectName}`;
      case "mysql":
        return `mysql://user:password@localhost:3306/${projectName}`;
      case "sqlite":
        return `sqlite:./${projectName}.db`;
      default:
        return `mongodb://localhost:27017/${projectName}`;
    }
  }

  private async generatePackageJsons(options: ConfigOptions): Promise<void> {
    // Root package.json
    const rootPackageJson = {
      name: options.projectName,
      version: "1.0.0",
      description: `FARM application generated from ${options.template} template`,
      type: "module",
      private: true,
      workspaces: ["apps/*", "packages/*"],
      scripts: {
        dev: "farm dev",
        build: "farm build",
        "type-check": "tsc --noEmit",
        lint: "eslint .",
        test: "jest",
      },
      devDependencies: {
        "@farm-framework/cli": "^1.0.0",
        typescript: "^5.0.0",
        eslint: "^8.0.0",
        jest: "^29.0.0",
      },
    };

    await fs.writeJSON(
      path.join(options.projectPath, "package.json"),
      rootPackageJson,
      { spaces: 2 }
    );

    // Frontend package.json (if not api-only)
    if (options.template !== "api-only") {
      await this.generateFrontendPackageJson(options);
    }

    // Backend package.json
    await this.generateBackendPackageJson(options);
  }

  private async generateFrontendPackageJson(
    options: ConfigOptions
  ): Promise<void> {
    const frontendDeps: Record<string, string> = {
      react: "^18.0.0",
      "react-dom": "^18.0.0",
      "@tanstack/react-query": "^4.0.0",
      zustand: "^4.0.0",
    };

    const frontendDevDeps = {
      "@types/react": "^18.0.0",
      "@types/react-dom": "^18.0.0",
      "@vitejs/plugin-react": "^4.0.0",
      vite: "^5.0.0",
      tailwindcss: "^3.0.0",
    };

    // Add feature-specific dependencies
    if (options.features.includes("ai")) {
      frontendDeps["ai"] = "^3.0.0";
    }

    const frontendPackageJson = {
      name: `${options.projectName}-web`,
      version: "1.0.0",
      type: "module",
      scripts: {
        dev: "vite",
        build: "vite build",
        preview: "vite preview",
        "type-check": "tsc --noEmit",
      },
      dependencies: frontendDeps,
      devDependencies: frontendDevDeps,
    };

    await fs.writeJSON(
      path.join(options.projectPath, "apps/web/package.json"),
      frontendPackageJson,
      { spaces: 2 }
    );
  }

  private async generateBackendPackageJson(
    options: ConfigOptions
  ): Promise<void> {
    const backendDeps = [
      "fastapi==0.104.1",
      "uvicorn[standard]==0.24.0",
      "motor==3.3.2",
      "pydantic==2.5.0",
      "python-multipart==0.0.6",
    ];

    // Add feature-specific dependencies
    if (options.features.includes("ai")) {
      backendDeps.push("openai==1.0.0");
      backendDeps.push("httpx==0.25.0");
    }

    if (options.features.includes("auth")) {
      backendDeps.push("python-jose[cryptography]==3.3.0");
      backendDeps.push("passlib[bcrypt]==1.7.4");
    }

    const requirements = backendDeps.join("\n") + "\n";

    await fs.writeFile(
      path.join(options.projectPath, "apps/api/requirements.txt"),
      requirements
    );

    // pyproject.toml
    const pyprojectContent = `[build-system]
requires = ["setuptools>=45", "wheel"]
build-backend = "setuptools.build_meta"

[project]
name = "${options.projectName}-api"
version = "1.0.0"
description = "FARM API for ${options.projectName}"
dependencies = [
${backendDeps.map((dep) => `    "${dep}",`).join("\n")}
]

[tool.pytest.ini_options]
testpaths = ["tests"]
python_files = ["test_*.py"]
python_classes = ["Test*"]
python_functions = ["test_*"]
`;

    await fs.writeFile(
      path.join(options.projectPath, "apps/api/pyproject.toml"),
      pyprojectContent
    );
  }

  private async generateEnvironmentFiles(
    options: ConfigOptions
  ): Promise<void> {
    const envContent = `# Database
DATABASE_URL=${this.getDefaultDatabaseUrl(options.database, options.projectName)}

# Development
NODE_ENV=development
FARM_ENV=development

# API Configuration
API_URL=http://localhost:8000
FRONTEND_URL=http://localhost:3000

${
  options.features.includes("ai")
    ? `
# AI Configuration
OPENAI_API_KEY=your-openai-api-key-here
OLLAMA_URL=http://localhost:11434
AI_PROVIDER=ollama
`
    : ""
}

${
  options.features.includes("auth")
    ? `
# Authentication
JWT_SECRET=your-jwt-secret-here
JWT_ALGORITHM=HS256
JWT_EXPIRATION=24h
`
    : ""
}
`;

    await fs.writeFile(
      path.join(options.projectPath, ".env.example"),
      envContent
    );

    // Create actual .env file (will be gitignored)
    await fs.writeFile(path.join(options.projectPath, ".env"), envContent);
  }

  private async generateDockerFiles(options: ConfigOptions): Promise<void> {
    // docker-compose.yml
    const dockerComposeContent = this.generateDockerCompose(options);

    await fs.writeFile(
      path.join(options.projectPath, "docker-compose.yml"),
      dockerComposeContent
    );

    // .dockerignore
    const dockerIgnoreContent = `node_modules
npm-debug.log
.git
.env
dist
build
*.log
`;

    await fs.writeFile(
      path.join(options.projectPath, ".dockerignore"),
      dockerIgnoreContent
    );
  }

  private generateDockerCompose(options: ConfigOptions): string {
    let services = `version: '3.8'

services:
  # Database
  ${options.database}:
    image: ${this.getDatabaseImage(options.database)}
    environment:
      ${this.getDatabaseEnvironment(options.database, options.projectName)}
    ports:
      - "${this.getDatabasePort(options.database)}:${this.getDatabasePort(options.database)}"
    volumes:
      - ${options.database}_data:/data/db

`;

    // Add Ollama service if AI features are enabled
    if (options.features.includes("ai")) {
      services += `  # Ollama AI Service
  ollama:
    image: ollama/ollama:latest
    ports:
      - "11434:11434"
    volumes:
      - ollama_data:/root/.ollama
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:11434/api/tags"]
      interval: 30s
      timeout: 10s
      retries: 3

`;
    }

    services += `volumes:
  ${options.database}_data:
`;

    if (options.features.includes("ai")) {
      services += `  ollama_data:
`;
    }

    return services;
  }

  private getDatabaseImage(database: string): string {
    switch (database) {
      case "mongodb":
        return "mongo:7";
      case "postgresql":
        return "postgres:16";
      case "mysql":
        return "mysql:8";
      case "sqlite":
        return ""; // SQLite doesn't need a Docker image
      default:
        return "mongo:7";
    }
  }

  private getDatabaseEnvironment(
    database: string,
    projectName: string
  ): string {
    switch (database) {
      case "mongodb":
        return `MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: password
      MONGO_INITDB_DATABASE: ${projectName}`;
      case "postgresql":
        return `POSTGRES_DB: ${projectName}
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password`;
      case "mysql":
        return `MYSQL_DATABASE: ${projectName}
      MYSQL_USER: user
      MYSQL_PASSWORD: password
      MYSQL_ROOT_PASSWORD: rootpassword`;
      default:
        return "";
    }
  }

  private getDatabasePort(database: string): string {
    switch (database) {
      case "mongodb":
        return "27017";
      case "postgresql":
        return "5432";
      case "mysql":
        return "3306";
      default:
        return "27017";
    }
  }

  private async generateTSConfigs(options: ConfigOptions): Promise<void> {
    // Root tsconfig.json
    const rootTSConfig = {
      compilerOptions: {
        target: "ES2022",
        module: "ESNext",
        moduleResolution: "bundler",
        allowSyntheticDefaultImports: true,
        esModuleInterop: true,
        allowJs: true,
        strict: true,
        skipLibCheck: true,
        forceConsistentCasingInFileNames: true,
      },
      references: [{ path: "./apps/web" }],
    };

    await fs.writeJSON(
      path.join(options.projectPath, "tsconfig.json"),
      rootTSConfig,
      { spaces: 2 }
    );

    // Frontend tsconfig.json (if not api-only)
    if (options.template !== "api-only") {
      const frontendTSConfig = {
        compilerOptions: {
          target: "ES2020",
          lib: ["ES2020", "DOM", "DOM.Iterable"],
          module: "ESNext",
          skipLibCheck: true,
          moduleResolution: "bundler",
          allowImportingTsExtensions: true,
          resolveJsonModule: true,
          isolatedModules: true,
          noEmit: true,
          jsx: "react-jsx",
          strict: true,
          noUnusedLocals: true,
          noUnusedParameters: true,
          noFallthroughCasesInSwitch: true,
        },
        include: ["src"],
        references: [{ path: "./tsconfig.node.json" }],
      };

      await fs.writeJSON(
        path.join(options.projectPath, "apps/web/tsconfig.json"),
        frontendTSConfig,
        { spaces: 2 }
      );
    }
  }
}
