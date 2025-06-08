// packages/cli/src/template/dependencies.ts
import { TemplateContext } from "./types.js";

export class DependencyResolver {
  generateRootPackageJson(context: TemplateContext) {
    const isApiOnly = context.template === "api-only";

    return {
      name: context.projectName,
      version: "0.1.0",
      description:
        context.description ||
        `A FARM Stack application using ${context.template} template`,
      private: true,
      type: "module",
      workspaces: isApiOnly ? [] : ["apps/*"],
      scripts: {
        ...(isApiOnly
          ? {}
          : {
              dev: 'concurrently "npm run dev:api" "npm run dev:web"',
              "dev:web": "cd apps/web && npm run dev",
              "build:web": "cd apps/web && npm run build",
              "preview:web": "cd apps/web && npm run preview",
            }),
        "dev:api":
          "cd apps/api && uvicorn src.main:app --reload --host 0.0.0.0 --port 8000",
        "test:api": "cd apps/api && pytest",
        "lint:api": "cd apps/api && black . && isort .",
        "type-check:api": "cd apps/api && mypy .",
        ...(context.docker
          ? {
              "docker:up": "docker-compose up -d",
              "docker:down": "docker-compose down",
              "docker:build": "docker-compose build",
            }
          : {}),
        ...(context.git
          ? {
              prepare: "husky install",
            }
          : {}),
      },
      devDependencies: {
        ...(isApiOnly
          ? {}
          : {
              concurrently: "^8.2.0",
            }),
        ...(context.git
          ? {
              husky: "^8.0.0",
              "lint-staged": "^14.0.0",
            }
          : {}),
      },
      keywords: [
        "farm-stack",
        "fastapi",
        "react",
        "mongodb",
        ...(context.features.includes("ai")
          ? ["ai", "machine-learning", "ollama"]
          : []),
        context.template,
      ],
      author: context.author || "",
      license: "MIT",
    };
  }

  generateFrontendPackageJson(context: TemplateContext) {
    // Get base dependencies for the template
    const baseDeps = this.getBaseFrontendDependencies(context.template);

    // Add feature-specific dependencies
    const featureDependencies = this.getFeatureDependencies(context.features);

    return {
      name: `${context.projectName}-web`,
      version: "0.1.0",
      type: "module",
      scripts: {
        dev: "vite",
        build: "tsc && vite build",
        preview: "vite preview",
        lint: "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
        "type-check": "tsc --noEmit",
      },
      dependencies: {
        ...baseDeps.dependencies,
        ...featureDependencies.dependencies,
      },
      devDependencies: {
        ...baseDeps.devDependencies,
        ...featureDependencies.devDependencies,
        "@types/node": "^20.0.0",
        eslint: "^8.0.0",
        "@typescript-eslint/eslint-plugin": "^6.0.0",
        "@typescript-eslint/parser": "^6.0.0",
        "eslint-plugin-react-hooks": "^4.6.0",
        "eslint-plugin-react-refresh": "^0.4.0",
      },
    };
  }

  generateRequirements(context: TemplateContext): string {
    const baseDeps = this.getBaseBackendDependencies(context.template);
    const devDeps = this.getBaseBackendDevDependencies();

    // Add feature-specific dependencies
    const featureDeps = this.getBackendFeatureDependencies(context.features);

    const allDeps = [
      ...baseDeps,
      ...featureDeps,
      "", // Empty line separator
      "# Development dependencies",
      ...devDeps,
    ];

    return allDeps.join("\n");
  }

  generatePyprojectToml(context: TemplateContext): string {
    const baseDeps = this.getBaseBackendDependencies(context.template);
    const featureDeps = this.getBackendFeatureDependencies(context.features);
    const devDeps = this.getBaseBackendDevDependencies();

    return `[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[project]
name = "${context.projectName}-api"
version = "0.1.0"
description = "${context.description || `${context.template} template API`}"
authors = [
    {name = "${context.author || "FARM Developer"}", email = "dev@example.com"},
]
dependencies = [
${[...baseDeps, ...featureDeps].map((dep) => `    "${dep}",`).join("\n")}
]
requires-python = ">=3.11"
license = "MIT"
readme = "README.md"

[project.optional-dependencies]
dev = [
${devDeps.map((dep) => `    "${dep}",`).join("\n")}
]

[tool.black]
line-length = 88
target-version = ['py311']
include = '\\.pyi?$'

[tool.isort]
profile = "black"
multi_line_output = 3

[tool.mypy]
python_version = "3.11"
warn_return_any = true
warn_unused_configs = true
disallow_untyped_defs = true

[tool.pytest.ini_options]
testpaths = ["tests"]
addopts = "-v --tb=short"
asyncio_mode = "auto"
`;
  }

  private getBaseFrontendDependencies(template: string): {
    dependencies: Record<string, string>;
    devDependencies: Record<string, string>;
  } {
    // Build dependencies object dynamically
    const dependencies: Record<string, string> = {
      react: "^18.2.0",
      "react-dom": "^18.2.0",
      "@tanstack/react-query": "^4.32.0",
      zustand: "^4.4.0",
    };

    const devDependencies: Record<string, string> = {
      "@types/react": "^18.2.0",
      "@types/react-dom": "^18.2.0",
      "@vitejs/plugin-react": "^4.0.0",
      typescript: "^5.0.0",
      vite: "^4.4.0",
      tailwindcss: "^3.3.0",
      autoprefixer: "^10.4.0",
      postcss: "^8.4.0",
    };

    // Add template-specific dependencies
    switch (template) {
      case "ai-chat":
        dependencies["@headlessui/react"] = "^1.7.0";
        dependencies["@heroicons/react"] = "^2.0.0";
        break;
      case "ai-dashboard":
        dependencies["recharts"] = "^2.8.0";
        dependencies["d3"] = "^7.8.0";
        devDependencies["@types/d3"] = "^7.4.0";
        break;
      case "ecommerce":
        dependencies["@stripe/stripe-js"] = "^2.0.0";
        dependencies["@stripe/react-stripe-js"] = "^2.0.0";
        break;
    }

    return {
      dependencies,
      devDependencies,
    };
  }

  private getBaseBackendDependencies(template: string): string[] {
    const baseDeps = [
      "fastapi>=0.104.0",
      "uvicorn[standard]>=0.24.0",
      "motor>=3.3.0", // MongoDB async driver
      "beanie>=1.23.0", // MongoDB ODM
      "pydantic>=2.4.0",
      "python-dotenv>=1.0.0",
    ];

    // Add template-specific dependencies
    switch (template) {
      case "ai-chat":
      case "ai-dashboard":
        baseDeps.push("httpx>=0.25.0", "websockets>=11.0.0", "openai>=1.0.0");
        break;
      case "ecommerce":
        baseDeps.push("stripe>=6.0.0");
        break;
    }

    return baseDeps;
  }

  private getBaseBackendDevDependencies(): string[] {
    return [
      "pytest>=7.4.0",
      "pytest-asyncio>=0.21.0",
      "black>=23.0.0",
      "isort>=5.12.0",
      "mypy>=1.5.0",
      "httpx>=0.25.0", // For testing
    ];
  }

  private getFeatureDependencies(features: string[]) {
    const dependencies: Record<string, string> = {};
    const devDependencies: Record<string, string> = {};

    for (const feature of features) {
      switch (feature) {
        case "auth":
          dependencies["@supabase/supabase-js"] = "^2.0.0";
          dependencies["js-cookie"] = "^3.0.0";
          devDependencies["@types/js-cookie"] = "^3.0.0";
          break;

        case "ai":
          dependencies["eventsource-parser"] = "^1.0.0";
          dependencies["marked"] = "^5.0.0";
          dependencies["prismjs"] = "^1.29.0";
          devDependencies["@types/prismjs"] = "^1.26.0";
          break;

        case "realtime":
          dependencies["socket.io-client"] = "^4.7.0";
          break;

        case "payments":
          dependencies["@stripe/stripe-js"] = "^2.0.0";
          dependencies["@stripe/react-stripe-js"] = "^2.0.0";
          break;

        case "storage":
          dependencies["react-dropzone"] = "^14.0.0";
          break;

        case "analytics":
          dependencies["recharts"] = "^2.8.0";
          dependencies["d3"] = "^7.8.0";
          devDependencies["@types/d3"] = "^7.4.0";
          break;
      }
    }

    return { dependencies, devDependencies };
  }

  private getBackendFeatureDependencies(features: string[]): string[] {
    const dependencies: string[] = [];

    for (const feature of features) {
      switch (feature) {
        case "auth":
          dependencies.push(
            "python-jose[cryptography]>=3.3.0",
            "passlib[bcrypt]>=1.7.4",
            "python-multipart>=0.0.6"
          );
          break;

        case "ai":
          dependencies.push(
            "httpx>=0.25.0",
            "websockets>=11.0.0",
            "openai>=1.0.0"
          );
          break;

        case "realtime":
          dependencies.push("python-socketio>=5.9.0", "websockets>=11.0.0");
          break;

        case "payments":
          dependencies.push("stripe>=6.0.0");
          break;

        case "email":
          dependencies.push("fastapi-mail>=1.4.0");
          break;

        case "storage":
          dependencies.push("boto3>=1.28.0", "python-multipart>=0.0.6");
          break;

        case "search":
          dependencies.push("elasticsearch>=8.0.0");
          break;
      }
    }

    return dependencies;
  }
}
