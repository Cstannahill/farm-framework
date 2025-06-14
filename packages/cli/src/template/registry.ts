// packages/cli/src/template/registry.ts - Updated file patterns for monorepo structure
import { TemplateDefinition, TemplateName } from "./types.js";

export class TemplateRegistry {
  private templates = new Map<TemplateName, TemplateDefinition>();

  constructor() {
    this.registerBuiltinTemplates();
  }

  register(template: TemplateDefinition): void {
    this.templates.set(template.name as TemplateName, template);
  }

  get(templateName: TemplateName): TemplateDefinition | undefined {
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
      features: ["auth", "ai", "realtime", "storage"],
      supportedDatabases: [
        "mongodb",
        "postgresql",
        "mysql",
        "sqlite",
        "sqlserver",
      ],
      defaultDatabase: "mongodb",
      files: [
        // Root files
        {
          src: "base/package.json.hbs",
          dest: "package.json",
        },
        {
          src: "base/README.md.hbs",
          dest: "README.md",
        },
        { src: "base/.gitignore", dest: ".gitignore" },
        {
          src: "base/farm.config.ts.hbs",
          dest: "farm.config.ts",
        },

        // Docker files
        {
          src: "base/docker-compose.yml.hbs",
          dest: "docker-compose.yml",
        },

        // Frontend files (React) - only if not API-only
        {
          src: "frontend/basic/package.json.hbs",
          dest: "apps/web/package.json",

          condition: (ctx) => ctx.template !== "api-only",
        },
        {
          src: "frontend/basic/vite.config.ts.hbs",
          dest: "apps/web/vite.config.ts",

          condition: (ctx) => ctx.template !== "api-only",
        },
        {
          src: "frontend/basic/index.html.hbs",
          dest: "apps/web/index.html",

          condition: (ctx) => ctx.template !== "api-only",
        },
        {
          src: "frontend/basic/src/**/*",
          dest: "apps/web/src/",
          condition: (ctx) => ctx.template !== "api-only",
        },
        {
          src: "frontend/basic/public/**/*",
          dest: "apps/web/public/",
          condition: (ctx) => ctx.template !== "api-only",
        }, // Backend files (FastAPI) - Use base template as foundation
        {
          src: "base/apps/api/src/core/**/*",
          dest: "apps/api/src/core/",
        },
        {
          src: "base/apps/api/src/database/**/*",
          dest: "apps/api/src/database/",
        },
        {
          src: "base/apps/api/src/models/**/*",
          dest: "apps/api/src/models/",
        },
        {
          src: "base/apps/api/src/routes/health.py.hbs",
          dest: "apps/api/src/routes/health.py",
        },
        {
          src: "base/apps/api/src/main.py.hbs",
          dest: "apps/api/src/main.py",
        },
        {
          src: "base/apps/api/requirements.txt.hbs",
          dest: "apps/api/requirements.txt",
        },

        // Template-specific backend files (tests only)
        {
          src: "basic/apps/api/tests/**/*",
          dest: "apps/api/tests/",
        },

        // Feature-specific files
        {
          src: "backend/auth/**/*",
          dest: "apps/api/src/",
          condition: (ctx) => ctx.features.includes("auth"),
        },
        {
          src: "backend/ai/**/*",
          dest: "apps/api/src/",
          condition: (ctx) => ctx.features.includes("ai"),
        },
      ],
      directories: [],
      dependencies: this.getBasicTemplateDependencies(),
    }); // AI Chat template
    this.register({
      name: "ai-chat",
      description: "Chat application with streaming AI responses",
      features: ["auth", "ai", "realtime"], // Add a features array for compatibility
      requiredFeatures: ["ai"],
      supportedFeatures: ["auth", "ai", "realtime", "storage"],
      defaultFeatures: ["auth", "ai", "realtime"],
      supportedDatabases: [
        "mongodb",
        "postgresql",
        "mysql",
        "sqlite",
        "sqlserver",
      ],
      defaultDatabase: "mongodb",
      files: [
        // Include all basic files
        ...this.getBasicFiles(), // AI-specific frontend components
        {
          src: "ai-chat/apps/web/src/**/*",
          dest: "apps/web/src/",
          condition: (ctx) => ctx.template !== "api-only",
        },

        // AI Chat template-specific routes and AI infrastructure
        {
          src: "ai-chat/apps/api/src/routes/**/*",
          dest: "apps/api/src/routes/",
        },
        {
          src: "ai-chat/apps/api/src/ai/**/*",
          dest: "apps/api/src/ai/",
        },
        {
          src: "ai-chat/apps/api/src/models/**/*",
          dest: "apps/api/src/models/",
        },

        // Feature-specific files (auth and basic AI if needed)
        {
          src: "backend/auth/**/*",
          dest: "apps/api/src/",
          condition: (ctx) => ctx.features.includes("auth"),
        },

        // WebSocket support for real-time chat
        {
          src: "backend/features/realtime/**/*",
          dest: "apps/api/src/",
          condition: (ctx) => ctx.features.includes("realtime"),
        },

        // Docker Ollama setup
        { src: "docker/ollama/**/*", dest: "docker/ollama/" },
      ],
      directories: [], // Add an empty directories array for compatibility
      dependencies: this.getAIChatTemplateDependencies(),
    });

    // AI Dashboard template
    this.register({
      name: "ai-dashboard",
      description: "Data dashboard with ML insights, charts, and analytics",
      features: ["ai", "analytics"],
      requiredFeatures: ["ai"],
      supportedFeatures: ["ai", "auth", "analytics", "storage"],
      defaultFeatures: ["ai", "analytics"],
      supportedDatabases: [
        "mongodb",
        "postgresql",
        "mysql",
        "sqlite",
        "sqlserver",
      ],
      defaultDatabase: "mongodb",
      files: [
        // Include all basic files as foundation
        ...this.getBasicFiles(),

        // AI Dashboard template-specific frontend components
        {
          src: "ai-dashboard/apps/web/src/**/*",
          dest: "apps/web/src/",
          condition: (ctx) => ctx.template !== "api-only",
        },

        // AI Dashboard template-specific backend routes and models
        {
          src: "ai-dashboard/apps/api/src/routes/**/*",
          dest: "apps/api/src/routes/",
        },
        {
          src: "ai-dashboard/apps/api/src/ai/**/*",
          dest: "apps/api/src/ai/",
        },
        {
          src: "ai-dashboard/apps/api/src/ml/**/*",
          dest: "apps/api/src/ml/",
        },
        {
          src: "ai-dashboard/apps/api/src/models/**/*",
          dest: "apps/api/src/models/",
        },

        // Dashboard-specific requirements extension
        {
          src: "ai-dashboard/apps/api/requirements-dashboard.txt.hbs",
          dest: "apps/api/requirements-dashboard.txt",
        },

        // Feature-specific files (auth if enabled)
        {
          src: "other/features/authentication/**/*",
          dest: "apps/api/src/",
          condition: (ctx) => ctx.features.includes("auth"),
        },
      ],
      directories: [],
      dependencies: this.getAIDashboardTemplateDependencies(),
    });

    // Add other templates...
    this.register({
      name: "api-only",
      description: "FastAPI backend only, no React frontend",
      features: [],
      requiredFeatures: [],
      supportedFeatures: ["auth", "ai", "storage", "email", "search"],
      defaultFeatures: [],
      supportedDatabases: [
        "mongodb",
        "postgresql",
        "mysql",
        "sqlite",
        "sqlserver",
      ],
      defaultDatabase: "mongodb",
      files: [
        // Root files (no frontend package.json)
        {
          src: "base/package.json.hbs",
          dest: "package.json",
        },
        {
          src: "base/README.md.hbs",
          dest: "README.md",
        },
        { src: "base/.gitignore", dest: ".gitignore" },
        {
          src: "base/farm.config.ts.hbs",
          dest: "farm.config.ts",
        }, // Only backend files - Use base template as foundation
        {
          src: "base/apps/api/src/core/**/*",
          dest: "apps/api/src/core/",
        },
        {
          src: "base/apps/api/src/database/**/*",
          dest: "apps/api/src/database/",
        },
        {
          src: "base/apps/api/src/models/**/*",
          dest: "apps/api/src/models/",
        },
        {
          src: "base/apps/api/src/routes/health.py.hbs",
          dest: "apps/api/src/routes/health.py",
        },
        {
          src: "base/apps/api/src/main.py.hbs",
          dest: "apps/api/src/main.py",
        },
        {
          src: "base/apps/api/requirements.txt.hbs",
          dest: "apps/api/requirements.txt",
        },

        // API-only template-specific files
        {
          src: "api-only/apps/api/tests/**/*",
          dest: "apps/api/tests/",
        },
        {
          src: "api-only/apps/api/pyproject.toml.hbs",
          dest: "apps/api/pyproject.toml",
        },
      ],
      directories: [],
      dependencies: this.getAPIOnlyTemplateDependencies(),
    });
  }

  private getBasicFiles() {
    // Return the basic file set for reuse in other templates
    return [
      {
        src: "base/package.json.hbs",
        dest: "package.json",
      },
      {
        src: "base/README.md.hbs",
        dest: "README.md",
      },
      { src: "base/.gitignore", dest: ".gitignore" },
      {
        src: "base/farm.config.ts.hbs",
        dest: "farm.config.ts",
      },
      {
        src: "backend/basic/src/**/*",
        dest: "apps/api/src/",
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

  private getAIDashboardTemplateDependencies() {
    const base = this.getBasicTemplateDependencies();
    return {
      frontend: {
        dependencies: {
          ...base.frontend.dependencies,
          "react-chartjs-2": "^5.2.0",
          "chart.js": "^4.3.0",
          recharts: "^2.8.0",
          d3: "^7.8.0",
          "@types/d3": "^7.4.0",
        },
        devDependencies: base.frontend.devDependencies,
      },
      backend: {
        dependencies: [
          ...base.backend.dependencies,
          // AI Dashboard specific ML/Analytics packages (latest versions)
          "pandas>=2.3.0",
          "scikit-learn>=1.7.0",
          "numpy>=2.3.0",
          "plotly>=6.1.2",
          "scipy>=1.15.2",
          "seaborn>=0.13.2",
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
