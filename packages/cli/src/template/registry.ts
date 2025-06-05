// packages/cli/src/template/registry.ts - Updated file patterns for monorepo structure
import { TemplateDefinition, TemplateType } from "./types.js";

export class TemplateRegistry {
  private templates = new Map<TemplateType, TemplateDefinition>();

  constructor() {
    this.registerBuiltinTemplates();
  }

  register(template: TemplateDefinition): void {
    this.templates.set(template.name as TemplateType, template);
  }

  get(templateName: TemplateType): TemplateDefinition | undefined {
    return this.templates.get(templateName);
  }

  getAll(): TemplateDefinition[] {
    return Array.from(this.templates.values());
  }

  private registerBuiltinTemplates(): void {
    // Basic template
    this.register({
      name: "basic",
      description: "Simple React + FastAPI + MongoDB setup",
      requiredFeatures: [],
      supportedFeatures: ["auth", "realtime", "storage", "analytics"],
      defaultFeatures: [],
      supportedDatabases: ["mongodb", "postgresql", "mysql", "sqlite"],
      defaultDatabase: "mongodb",
      files: [
        // Root files
        {
          sourcePath: "base/package.json.hbs",
          targetPath: "package.json",
          transform: true,
        },
        {
          sourcePath: "base/README.md.hbs",
          targetPath: "README.md",
          transform: true,
        },
        { sourcePath: "base/.gitignore", targetPath: ".gitignore" },
        {
          sourcePath: "base/farm.config.ts.hbs",
          targetPath: "farm.config.ts",
          transform: true,
        },

        // Docker files
        {
          sourcePath: "base/docker-compose.yml.hbs",
          targetPath: "docker-compose.yml",
          transform: true,
          condition: (ctx) => ctx.docker,
        },

        // Frontend files (React) - only if not API-only
        {
          sourcePath: "frontend/basic/package.json.hbs",
          targetPath: "apps/web/package.json",
          transform: true,
          condition: (ctx) => ctx.template !== "api-only",
        },
        {
          sourcePath: "frontend/basic/vite.config.ts.hbs",
          targetPath: "apps/web/vite.config.ts",
          transform: true,
          condition: (ctx) => ctx.template !== "api-only",
        },
        {
          sourcePath: "frontend/basic/index.html.hbs",
          targetPath: "apps/web/index.html",
          transform: true,
          condition: (ctx) => ctx.template !== "api-only",
        },
        {
          sourcePath: "frontend/basic/src/**/*",
          targetPath: "apps/web/src/",
          condition: (ctx) => ctx.template !== "api-only",
        },
        {
          sourcePath: "frontend/basic/public/**/*",
          targetPath: "apps/web/public/",
          condition: (ctx) => ctx.template !== "api-only",
        },

        // Backend files (FastAPI)
        {
          sourcePath: "backend/basic/src/**/*",
          targetPath: "apps/api/src/",
          transform: true,
        },
        {
          sourcePath: "backend/basic/tests/**/*",
          targetPath: "apps/api/tests/",
        },
        {
          sourcePath: "backend/basic/requirements.txt.hbs",
          targetPath: "apps/api/requirements.txt",
          transform: true,
        },
        {
          sourcePath: "backend/basic/pyproject.toml.hbs",
          targetPath: "apps/api/pyproject.toml",
          transform: true,
        },

        // Feature-specific files
        {
          sourcePath: "backend/auth/**/*",
          targetPath: "apps/api/src/",
          condition: (ctx) => ctx.features.includes("auth"),
        },
        {
          sourcePath: "backend/ai/**/*",
          targetPath: "apps/api/src/",
          condition: (ctx) => ctx.features.includes("ai"),
        },
      ],
      dependencies: this.getBasicTemplateDependencies(),
    });

    // AI Chat template
    this.register({
      name: "ai-chat",
      description: "Chat application with streaming AI responses",
      requiredFeatures: ["ai"],
      supportedFeatures: ["auth", "ai", "realtime", "storage"],
      defaultFeatures: ["ai", "realtime"],
      supportedDatabases: ["mongodb", "postgresql"],
      defaultDatabase: "mongodb",
      files: [
        // Include all basic files
        ...this.getBasicFiles(),

        // AI-specific frontend components
        {
          sourcePath: "frontend/ai-chat/**/*",
          targetPath: "apps/web/src/",
          condition: (ctx) => ctx.template !== "api-only",
        },

        // AI-specific backend files
        { sourcePath: "backend/ai/**/*", targetPath: "apps/api/src/" },

        // WebSocket support
        {
          sourcePath: "backend/features/realtime/**/*",
          targetPath: "apps/api/src/",
          condition: (ctx) => ctx.features.includes("realtime"),
        },

        // Docker Ollama setup
        { sourcePath: "docker/ollama/**/*", targetPath: "docker/ollama/" },
      ],
      dependencies: this.getAIChatTemplateDependencies(),
    });

    // Add other templates...
    this.register({
      name: "api-only",
      description: "FastAPI backend only, no React frontend",
      requiredFeatures: [],
      supportedFeatures: ["auth", "ai", "storage", "email", "search"],
      defaultFeatures: [],
      supportedDatabases: ["mongodb", "postgresql", "mysql", "sqlite"],
      defaultDatabase: "mongodb",
      files: [
        // Root files (no frontend package.json)
        {
          sourcePath: "base/package.json.hbs",
          targetPath: "package.json",
          transform: true,
        },
        {
          sourcePath: "base/README.md.hbs",
          targetPath: "README.md",
          transform: true,
        },
        { sourcePath: "base/.gitignore", targetPath: ".gitignore" },
        {
          sourcePath: "base/farm.config.ts.hbs",
          targetPath: "farm.config.ts",
          transform: true,
        },

        // Only backend files
        {
          sourcePath: "backend/basic/src/**/*",
          targetPath: "apps/api/src/",
          transform: true,
        },
        {
          sourcePath: "backend/basic/tests/**/*",
          targetPath: "apps/api/tests/",
        },
        {
          sourcePath: "backend/basic/requirements.txt.hbs",
          targetPath: "apps/api/requirements.txt",
          transform: true,
        },
        {
          sourcePath: "backend/basic/pyproject.toml.hbs",
          targetPath: "apps/api/pyproject.toml",
          transform: true,
        },
      ],
      dependencies: this.getAPIOnlyTemplateDependencies(),
    });
  }

  private getBasicFiles() {
    // Return the basic file set for reuse in other templates
    return [
      {
        sourcePath: "base/package.json.hbs",
        targetPath: "package.json",
        transform: true,
      },
      {
        sourcePath: "base/README.md.hbs",
        targetPath: "README.md",
        transform: true,
      },
      { sourcePath: "base/.gitignore", targetPath: ".gitignore" },
      {
        sourcePath: "base/farm.config.ts.hbs",
        targetPath: "farm.config.ts",
        transform: true,
      },
      {
        sourcePath: "backend/basic/src/**/*",
        targetPath: "apps/api/src/",
        transform: true,
      },
    ];
  }

  // ... dependency methods remain the same as before
  private getBasicTemplateDependencies() {
    return {
      frontend: {
        dependencies: {
          react: "^18.2.0",
          "react-dom": "^18.2.0",
          "@tanstack/react-query": "^5.0.0",
          zustand: "^4.4.0",
          "react-router-dom": "^6.0.0",
        },
        devDependencies: {
          "@types/react": "^18.2.0",
          "@types/react-dom": "^18.2.0",
          "@vitejs/plugin-react": "^4.0.0",
          vite: "^5.0.0",
          typescript: "^5.0.0",
          tailwindcss: "^3.0.0",
        },
      },
      backend: {
        dependencies: [
          "fastapi>=0.104.0",
          "uvicorn[standard]>=0.24.0",
          "pydantic>=2.0.0",
          "motor>=3.3.0",
          "beanie>=1.23.0",
        ],
        devDependencies: [
          "pytest>=7.0.0",
          "pytest-asyncio>=0.21.0",
          "black>=23.0.0",
          "isort>=5.0.0",
          "mypy>=1.0.0",
        ],
      },
    };
  }

  private getAIChatTemplateDependencies() {
    const base = this.getBasicTemplateDependencies();
    return {
      frontend: {
        dependencies: {
          ...base.frontend.dependencies,
          marked: "^5.0.0",
          prismjs: "^1.29.0",
        },
        devDependencies: base.frontend.devDependencies,
      },
      backend: {
        dependencies: [
          ...base.backend.dependencies,
          "httpx>=0.25.0",
          "websockets>=11.0.0",
          "openai>=1.0.0",
        ],
        devDependencies: base.backend.devDependencies,
      },
    };
  }

  private getAPIOnlyTemplateDependencies() {
    const base = this.getBasicTemplateDependencies();
    return {
      frontend: { dependencies: {}, devDependencies: {} },
      backend: base.backend,
    };
  }
}
