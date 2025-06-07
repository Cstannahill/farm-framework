// packages/cli/src/generators/file-generator.ts
import { join, dirname } from "path";
import { mkdir, writeFile } from "fs/promises";
import { TemplateDefinition, TemplateFile } from "../template/types.js";
import { ProjectStructureGenerator } from "./project-structure.js";
import fs from "fs-extra";
import path from "path";
import { TemplateProcessor } from "../template/processor.js";
import type { TemplateContext } from "../template/types.js";
import chalk from "chalk";

export class ProjectFileGenerator {
  private structureGenerator = new ProjectStructureGenerator();

  async generateFromTemplate(
    projectPath: string,
    context: TemplateContext,
    template: TemplateDefinition
  ): Promise<string[]> {
    const generatedFiles: string[] = [];

    // Generate project directory structure FIRST
    const createdDirectories =
      await this.structureGenerator.generateProjectStructure(
        projectPath,
        context
      );
    console.log(
      `📁 Project structure ready (${createdDirectories.length} directories)`
    );

    // Generate files based on template and context instead of template.files
    const filesToGenerate = this.generateFileList(context);
    console.log(
      chalk.blue(`ℹ️  Generating ${filesToGenerate.length} files...`)
    );
    for (const fileConfig of filesToGenerate) {
      if (this.shouldIncludeFile(fileConfig, context)) {
        const dest = join(projectPath, fileConfig.dest);

        // Ensure directory exists
        await mkdir(dirname(dest), { recursive: true });

        // Generate file content
        const content = await this.generateFileContent(
          fileConfig,
          context,
          template
        );

        // Write file
        await writeFile(dest, content);
        generatedFiles.push(fileConfig.dest);

        console.log(`✅ Generated: ${fileConfig.dest}`);
      }
    }

    return generatedFiles;
  }

  // Generate the list of files to create based on context
  private generateFileList(context: TemplateContext): TemplateFile[] {
    const files: TemplateFile[] = [
      // Base project files
      {
        dest: "package.json",
        src: `${context.template}/package.json.hbs`,
      },
      {
        dest: "farm.config.ts",
        src: `${context.template}/farm.config.ts.hbs`,
      },
      {
        dest: "README.md",
        src: `${context.template}/README.md.hbs`,
      },
      { dest: ".gitignore", src: "base/.gitignore.hbs" },
      {
        dest: "docker-compose.yml",
        src: `${context.template}/docker-compose.yml.hbs`,
      },

      // API files (always present)
      {
        dest: "apps/api/requirements.txt",
        src: `${context.template}/requirements.txt.hbs`,
      },
      {
        dest: "apps/api/pyproject.toml",
        src: `${context.template}/pyproject.toml.hbs`,
      },
      {
        dest: "apps/api/src/main.py",
        src: `${context.template}/src/main.py.hbs`,
      },
      {
        dest: "apps/api/src/routes/__init__.py",
        src: "backend/basic/src/routes/__init__.py.hbs",
      },
      {
        dest: "apps/api/src/routes/health.py",
        src: `${context.template}/src/routes/health.py.hbs`,
      },
      {
        dest: "apps/api/src/routes/api.py",
        src: `${context.template}/src/routes/api.py.hbs`,
      },
      {
        dest: "apps/api/src/__init__.py",
        src: "backend/basic/src/__init__.py.hbs",
      },
      {
        dest: "apps/api/src/core/__init__.py",
        src: "backend/basic/src/core/__init__.py.hbs",
      },
      {
        dest: "apps/api/src/core/config.py",
        src: `${context.template}/src/core/config.py.hbs`,
      },
      {
        dest: "apps/api/src/models/__init__.py",
        src: "backend/basic/src/models/__init__.py.hbs",
      },
      {
        dest: "apps/api/src/models/user.py",
        src: `${context.template}/src/models/user.py.hbs`,
      },
      {
        dest: "apps/api/src/database/__init__.py",
        src: "backend/basic/src/database/__init__.py.hbs",
      },
      {
        dest: "apps/api/src/database/connection.py",
        src: `${context.template}/src/database/connection.py.hbs`,
      },
    ];

    // Add frontend files if not API-only
    if (context.template !== "api-only") {
      files.push(
        {
          dest: "apps/web/package.json",
          src: `${context.template}/apps/web/package.json.hbs`,
        },
        {
          dest: "apps/web/index.html",
          src: `${context.template}/apps/web/index.html.hbs`,
        },
        {
          dest: "apps/web/vite.config.ts",
          src: `${context.template}/apps/web/vite.config.ts.hbs`,
        },
        {
          dest: "apps/web/src/App.tsx",
          src: `${context.template}/apps/web/src/App.tsx.hbs`,
        },
        {
          dest: "apps/web/src/main.tsx",
          src: `${context.template}/apps/web/src/main.tsx.hbs`,
        },
        {
          dest: "apps/web/src/index.css",
          src: "frontend/basic/src/index.css",
        },
        {
          dest: "apps/web/src/App.css",
          src: "frontend/basic/src/App.css",
        },
        {
          dest: "apps/web/src/components/layout/Layout.tsx",
          src: `${context.template}/apps/web/src/components/layout/Layout.tsx.hbs`,
        },
        {
          dest: "apps/web/src/pages/Home.tsx",
          src: `${context.template}/apps/web/src/pages/Home.tsx.hbs`,
        },
        {
          dest: "apps/web/src/pages/About.tsx",
          src: `${context.template}/apps/web/src/pages/About.tsx.hbs`,
        }
      );
    }

    // Add AI-specific files
    if (context.features.includes("ai")) {
      files.push(
        {
          dest: "apps/api/src/ai/__init__.py",
          src: "ai-chat/apps/api/src/ai/__init__.py.hbs",
        },
        {
          dest: "apps/api/src/ai/providers/__init__.py",
          src: "ai-chat/apps/api/src/ai/providers/__init__.py.hbs",
        },
        {
          dest: "apps/api/src/ai/providers/base.py",
          src: "ai-chat/apps/api/src/ai/providers/base.py.hbs",
        },
        {
          dest: "apps/api/src/ai/providers/ollama.py",
          src: "ai-chat/apps/api/src/ai/providers/ollama.py.hbs",
        },
        {
          dest: "apps/api/src/ai/providers/openai.py",
          src: "ai-chat/apps/api/src/ai/providers/openai.py.hbs",
        },
        {
          dest: "apps/api/src/ai/router.py",
          src: "ai-chat/apps/api/src/ai/router.py.hbs",
        },
        {
          dest: "apps/api/src/models/ai.py",
          src: "ai-chat/apps/api/src/models/ai.py.hbs",
        },
        {
          dest: "apps/api/src/routes/ai.py",
          src: "ai-chat/apps/api/src/routes/chat.py.hbs",
        }
      );

      // Add AI frontend components if not API-only
      if (context.template !== "api-only") {
        files.push(
          {
            dest: "apps/web/src/hooks/useAIModels.ts",
            src: "ai-chat/apps/web/src/hooks/useAIModels.ts.hbs",
          },
          {
            dest: "apps/web/src/hooks/useStreamingChat.ts",
            src: "ai-chat/apps/web/src/hooks/useStreamingChat.ts.hbs",
          },
          {
            dest: "apps/web/src/components/ai/ModelSelector.tsx",
            src: "ai-chat/apps/web/src/components/ai/ModelSelector.tsx.hbs",
          }
        );
      }

      // Add AI-specific template files for ai-chat template
      if (context.template === "ai-chat") {
        files.push(
          {
            dest: "apps/api/src/models/conversation.py",
            src: "ai-chat/apps/api/src/models/conversation.py.hbs",
          },
          {
            dest: "apps/api/src/models/message.py",
            src: "ai-chat/apps/api/src/models/message.py.hbs",
          },
          {
            dest: "apps/api/src/routes/websocket.py",
            src: "ai-chat/apps/api/src/routes/websocket.py.hbs",
          },
          {
            dest: "apps/api/src/websocket/__init__.py",
            src: "ai-chat/apps/api/src/websocket/__init__.py.hbs",
          },
          {
            dest: "apps/web/src/components/chat/ChatWindow.tsx",
            src: "ai-chat/apps/web/src/components/chat/ChatWindow.tsx.hbs",
          },
          {
            dest: "apps/web/src/components/chat/MessageInput.tsx",
            src: "ai-chat/apps/web/src/components/chat/MessageInput.tsx.hbs",
          },
          {
            dest: "apps/web/src/components/chat/MessageList.tsx",
            src: "ai-chat/apps/web/src/components/chat/MessageList.tsx.hbs",
          },
          {
            dest: "apps/web/src/components/chat/TypingIndicator.tsx",
            src: "ai-chat/apps/web/src/components/chat/TypingIndicator.tsx.hbs",
          }
        );
      }
    }

    // Add authentication files
    if (context.features.includes("auth")) {
      files.push(
        {
          dest: "apps/api/src/auth/__init__.py",
          src: "base/auth/__init__.py.hbs",
        },
        {
          dest: "apps/api/src/auth/jwt.py",
          src: "base/auth/jwt.py.hbs",
        },
        {
          dest: "apps/api/src/routes/auth.py",
          src: "base/routes/auth.py.hbs",
        }
      );

      if (context.template !== "api-only") {
        files.push(
          {
            dest: "apps/web/src/components/auth/LoginForm.tsx",
            src: "base/components/auth/LoginForm.tsx.hbs",
          },
          {
            dest: "apps/web/src/hooks/useAuth.ts",
            src: "base/hooks/useAuth.ts.hbs",
          }
        );
      }
    }

    return files;
  }

  private shouldIncludeFile(
    fileConfig: TemplateFile,
    context: TemplateContext
  ): boolean {
    return !fileConfig.condition || fileConfig.condition(context);
  }

  private async generateFileContent(
    fileConfig: TemplateFile,
    context: TemplateContext,
    template: TemplateDefinition
  ): Promise<string> {
    return this.generateContentFromScratch(fileConfig, context, template);
  }

  private generateContentFromScratch(
    fileConfig: TemplateFile,
    context: TemplateContext,
    template: TemplateDefinition
  ): string {
    const { dest } = fileConfig;

    // Generate based on target path
    switch (dest) {
      case "package.json":
        return this.generateRootPackageJson(context);
      case "farm.config.ts":
        return this.generateFarmConfig(context);
      case "README.md":
        return this.generateReadme(context);
      case ".gitignore":
        return this.generateGitignore();
      case "apps/web/package.json":
        return this.generateFrontendPackageJson(context);
      case "apps/web/index.html":
        return this.generateIndexHTML(context);
      case "apps/web/vite.config.ts":
        return this.generateViteConfig(context);
      case "apps/web/src/App.tsx":
        return this.generateAppComponent(context);
      case "apps/web/src/main.tsx":
        return this.generateMainEntry(context);
      case "apps/web/src/index.css":
        return this.generateIndexCSS();
      case "apps/web/src/App.css":
        return this.generateAppCSS();
      case "apps/api/requirements.txt":
        return this.generateRequirements(context);
      case "apps/api/pyproject.toml":
        return this.generatePyprojectToml(context);
      case "apps/api/src/main.py":
        return this.generateMainPy(context);
      case "apps/api/src/routes/health.py":
        return this.generateHealthRouter(context);
      case "apps/api/src/routes/api.py":
        return this.generateApiRouter(context);
      case "apps/api/src/ai/providers.py":
        return this.generateAIProviders(context);
      case "apps/web/src/components/ai/__init__.tsx":
        return this.generateAIComponents(context);
      default:
        // Handle __init__.py files
        if (dest.endsWith("__init__.py")) {
          return "# Generated by FARM CLI\n";
        }
        if (dest.endsWith("__init__.tsx")) {
          return "// Generated by FARM CLI\n";
        }
        // For other files, return basic content
        console.warn(`⚠️ No generator for: ${dest}`);
        return `# Generated by FARM CLI\n# File: ${dest}\n`;
    }
  }

  // Fixed: Generate requirements based on context features
  private generateRequirements(context: TemplateContext): string {
    const baseDeps = [
      "fastapi==0.104.1",
      "uvicorn[standard]==0.24.0",
      "python-multipart==0.0.6",
      "python-dotenv==1.0.0",
    ];

    // Add database dependencies
    switch (context.database) {
      case "mongodb":
        baseDeps.push("motor==3.3.2", "beanie==1.23.0");
        break;
      case "postgresql":
        baseDeps.push("asyncpg==0.29.0", "sqlalchemy[asyncio]==2.0.23");
        break;
      case "mysql":
        baseDeps.push("aiomysql==0.2.0", "sqlalchemy[asyncio]==2.0.23");
        break;
      case "sqlite":
        baseDeps.push("aiosqlite==0.19.0", "sqlalchemy[asyncio]==2.0.23");
        break;
    }

    // Add feature-specific dependencies
    if (context.features.includes("ai")) {
      baseDeps.push("openai==1.3.0", "httpx==0.25.0", "pydantic==2.5.0");
    }

    if (context.features.includes("auth")) {
      baseDeps.push(
        "python-jose[cryptography]==3.3.0",
        "passlib[bcrypt]==1.7.4",
        "python-multipart==0.0.6"
      );
    }

    if (context.features.includes("storage")) {
      baseDeps.push("boto3==1.34.0", "Pillow==10.1.0");
    }

    if (context.features.includes("email")) {
      baseDeps.push("fastapi-mail==1.4.1");
    }

    // Add template-specific dependencies
    if (context.template === "ai-chat") {
      baseDeps.push("websockets==12.0");
    }

    if (context.template === "ai-dashboard") {
      baseDeps.push("pandas==2.1.4", "numpy==1.25.2");
    }

    return baseDeps.join("\n") + "\n";
  }

  private generatePyprojectToml(context: TemplateContext): string {
    return `[build-system]
requires = ["setuptools>=45", "wheel"]
build-backend = "setuptools.build_meta"

[project]
name = "${context.projectName}-api"
version = "0.1.0"
description = "FARM API for ${context.projectName}"
authors = [
    {name = "FARM CLI", email = "hello@farm-stack.dev"},
]
readme = "README.md"
requires-python = ">=3.8"
dependencies = [
    "fastapi>=0.104.0",
    "uvicorn[standard]>=0.24.0",
    "python-multipart>=0.0.6",
    "python-dotenv>=1.0.0",
]

[tool.pytest.ini_options]
testpaths = ["tests"]
python_files = ["test_*.py"]
python_classes = ["Test*"]
python_functions = ["test_*"]

[tool.black]
line-length = 88
target-version = ['py38']

[tool.isort]
profile = "black"
multi_line_output = 3
`;
  }

  // Fixed: Use Record<string, string> for flexible dependencies
  private generateFrontendPackageJson(context: TemplateContext): string {
    const dependencies: Record<string, string> = {
      react: "^18.2.0",
      "react-dom": "^18.2.0",
      "@tanstack/react-query": "^5.0.0",
      zustand: "^4.4.0",
    };

    const devDependencies: Record<string, string> = {
      "@types/react": "^18.2.0",
      "@types/react-dom": "^18.2.0",
      "@vitejs/plugin-react": "^4.0.0",
      typescript: "^5.0.0",
      vite: "^5.0.0",
      tailwindcss: "^3.3.0",
      autoprefixer: "^10.4.0",
      postcss: "^8.4.0",
    };

    // Add feature-specific dependencies
    if (context.features.includes("ai")) {
      dependencies["ai"] = "^3.0.0";
      dependencies["@headlessui/react"] = "^1.7.0";
    }

    if (context.features.includes("auth")) {
      dependencies["@tanstack/react-router"] = "^1.0.0";
    }

    if (context.template === "ai-dashboard") {
      dependencies["recharts"] = "^2.8.0";
      dependencies["d3"] = "^7.8.0";
    }

    if (context.template === "ecommerce") {
      dependencies["@stripe/stripe-js"] = "^2.0.0";
      dependencies["@stripe/react-stripe-js"] = "^2.0.0";
    }

    return JSON.stringify(
      {
        name: `${context.projectName}-web`,
        version: "0.1.0",
        type: "module",
        scripts: {
          dev: "vite",
          build: "vite build",
          preview: "vite preview",
          typecheck: "tsc --noEmit",
          lint: "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
        },
        dependencies,
        devDependencies,
      },
      null,
      2
    );
  }

  private generateRootPackageJson(context: TemplateContext): string {
    const scripts: Record<string, string> = {
      dev: "farm dev",
      build: "farm build",
    };

    if (context.template !== "api-only") {
      scripts["dev:web"] = "cd apps/web && npm run dev";
      scripts["build:web"] = "cd apps/web && npm run build";
    }

    scripts["dev:api"] =
      "cd apps/api && python -m uvicorn src.main:app --reload";
    scripts["test"] = "npm run test:web && npm run test:api";

    if (context.template !== "api-only") {
      scripts["test:web"] = "cd apps/web && npm test";
    }
    scripts["test:api"] = "cd apps/api && pytest";

    return JSON.stringify(
      {
        name: context.projectName,
        version: "0.1.0",
        private: true,
        type: "module",
        workspaces: ["apps/*", "packages/*"],
        scripts,
        devDependencies: {
          "@farm/cli": "latest",
        },
      },
      null,
      2
    );
  }

  private generateFarmConfig(context: TemplateContext): string {
    const hasAI = context.features.includes("ai");

    let config = `import { defineConfig } from '@farm/core';

export default defineConfig({
  name: '${context.projectName}',
  template: '${context.template}',
  
  database: {
    type: '${context.database}',
    url: process.env.DATABASE_URL || '${this.getDefaultDatabaseUrl(typeof context.database === "string" ? context.database : context.database.type, context.name)}'
  },`;

    if (hasAI) {
      config += `

  ai: {
    providers: {
      ollama: {
        enabled: true,
        url: 'http://localhost:11434',
        models: ['llama3.1', 'codestral'],
        defaultModel: 'llama3.1',
        autoStart: true
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
    }
  },`;
    }

    config += `

  development: {
    ports: {
      frontend: 3000,
      backend: 8000,
      proxy: 4000
    }
  }
});`;

    return config;
  }

  private generateReadme(context: TemplateContext): string {
    return `# ${context.projectName}

Built with FARM Stack Framework - AI-First Full-Stack Development

## 🌾 FARM Stack

- **F**astAPI - Modern Python web framework
- **A**I/ML - Built-in AI integration with Ollama and cloud providers  
- **R**eact - Component-based frontend with TypeScript
- **M**ongoDB - Document database (flexible database options)

## 🚀 Quick Start

\`\`\`bash
# Install dependencies
npm install

# Start development servers
npm run dev

# Or start individually:
${context.template !== "api-only" ? "npm run dev:web    # Frontend on http://localhost:3000\n" : ""}npm run dev:api    # Backend on http://localhost:8000
\`\`\`

## 📁 Project Structure

\`\`\`
${context.projectName}/
├── apps/
${context.template !== "api-only" ? "│   ├── web/          # React frontend\n" : ""}│   └── api/          # FastAPI backend
├── packages/         # Shared packages
├── tools/           # Build tools and scripts
└── docs/            # Documentation
\`\`\`

## Features

${context.features.map((f) => `- ${f}`).join("\n")}

## Learn More

- [FARM Framework Documentation](https://farm-stack.dev)
- [FastAPI Documentation](https://fastapi.tiangolo.com)
${context.template !== "api-only" ? "- [React Documentation](https://react.dev)\n" : ""}- [MongoDB Documentation](https://docs.mongodb.com)
`;
  }

  private generateGitignore(): string {
    return `# Dependencies
node_modules/
__pycache__/
*.pyc
*.pyo
*.pyd
.Python
env/
venv/
.venv/

# Build outputs
dist/
build/
*.egg-info/

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Logs
*.log
npm-debug.log*
yarn-debug.log*
pnpm-debug.log*

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Testing
coverage/
.pytest_cache/

# Cache
.cache/
.parcel-cache/

# Temporary files
*.tmp
*.temp`;
  }

  private generateIndexHTML(context: TemplateContext): string {
    return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${context.projectName}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`;
  }

  private generateViteConfig(context: TemplateContext): string {
    return `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true
      }
    }
  }
});`;
  }

  private generateAppComponent(context: TemplateContext): string {
    const hasAI = context.features.includes("ai");

    return `import React from 'react';
import './App.css';
${hasAI && context.template === "ai-chat" ? "// import { ChatWindow } from './components/chat/ChatWindow';" : ""}

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4">
          <h1 className="text-3xl font-bold text-gray-900">
            🌾 ${context.projectName}
          </h1>
          <p className="text-gray-600">FARM Stack Application</p>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto py-6 px-4">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Welcome to FARM!</h2>
          <p className="text-gray-600 mb-4">
            Your full-stack application is ready. Features enabled:
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-600">
            ${context.features.map((f) => `<li><strong>${f}</strong></li>`).join("\n            ")}
          </ul>
        </div>
      </main>
    </div>
  );
}

export default App;`;
  }

  private generateMainEntry(context: TemplateContext): string {
    return `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`;
  }

  private generateIndexCSS(): string {
    return `@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}`;
  }

  private generateAppCSS(): string {
    return `.App {
  text-align: center;
}

.App-header {
  background-color: #282c34;
  padding: 20px;
  color: white;
}`;
  }

  private generateMainPy(context: TemplateContext): string {
    return `"""
${context.projectName} API
Built with FARM Stack Framework
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.routes.health import router as health_router
from src.routes.api import router as api_router

app = FastAPI(
    title="${context.projectName} API",
    description="Built with FARM Stack Framework",
    version="0.1.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health_router, prefix="/health", tags=["health"])
app.include_router(api_router, prefix="/api", tags=["api"])

@app.get("/")
async def root():
    return {
        "message": "🌾 ${context.projectName} API",
        "framework": "FARM Stack",
        "status": "running"
    }`;
  }

  private generateHealthRouter(context: TemplateContext): string {
    return `"""Health check endpoints"""

from fastapi import APIRouter

router = APIRouter()

@router.get("/")
async def health_check():
    return {"status": "healthy", "service": "${context.projectName}-api"}

@router.get("/ready")
async def readiness_check():
    return {"status": "ready", "database": "connected"}`;
  }

  private generateApiRouter(context: TemplateContext): string {
    return `"""Main API routes"""

from fastapi import APIRouter

router = APIRouter()

@router.get("/hello")
async def hello_world():
    return {"message": "Hello from ${context.projectName} API!"}`;
  }

  private generateAIProviders(context: TemplateContext): string {
    return `"""AI Providers for ${context.projectName}"""

from typing import Dict, Any

class AIProviderManager:
    def __init__(self):
        self.providers = {}
    
    async def get_provider(self, name: str):
        # TODO: Implement AI provider logic
        return {"provider": name, "status": "ready"}
`;
  }

  private generateAIComponents(context: TemplateContext): string {
    return `// AI Components for ${context.projectName}
// TODO: Implement AI components
export {};
`;
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
}
