// packages/cli/src/generators/project-file-generator.ts
import { join, dirname } from "path";
import {
  TemplateDefinition,
  TemplateFile,
  TemplateContext,
} from "../template/types.js";
import { ProjectStructureGenerator } from "./project-structure.js";
import { registerHandlebarsHelpers } from "../template/helpers.js";
import { moduleDirname } from "../utils/modulePath.js";
import fsExtra from "fs-extra";
import path from "path";
import Handlebars from "handlebars";
import chalk from "chalk";
import prettier from "prettier";
import { formatPython } from "../postProcessors/pythonFormatter.js";

const __dirname = moduleDirname(import.meta.url);

export interface ProjectFileGeneratorHooks {
  preGenerate?: (context: TemplateContext) => Promise<void> | void;
  postGenerate?: (
    context: TemplateContext,
    generatedFiles: string[]
  ) => Promise<void> | void;
}

export class ProjectFileGenerator {
  private structureGenerator = new ProjectStructureGenerator();

  hooks?: ProjectFileGeneratorHooks = {
    postGenerate: async (context, generatedFiles) => {
      // Use the actual project path passed to generateFromTemplate
      const projectRoot = this.currentProjectPath || process.cwd();

      console.log(
        chalk.blue(`🎨 Formatting ${generatedFiles.length} files...`)
      );

      // Format Python files first
      await formatPython({
        projectRoot,
        verbose: true,
      });

      // Then format other files with Prettier
      const prettierConfig = await prettier.resolveConfig(projectRoot);

      for (const file of generatedFiles) {
        // Skip Python files (already handled above)
        if (file.endsWith(".py")) {
          continue;
        }
        const absPath = path.resolve(projectRoot, file);
        try {
          let content = await fsExtra.readFile(absPath, "utf-8"); // Convert HTML entities back to proper JavaScript syntax for TypeScript/JavaScript files
          if (
            file.endsWith(".tsx") ||
            file.endsWith(".ts") ||
            file.endsWith(".jsx") ||
            file.endsWith(".js")
          ) {
            content = content.replace(/&#123;/g, "{");
            content = content.replace(/&#125;/g, "}");
            // Also fix backslash escapes that might be present
            content = content.replace(/\\{/g, "{");
            content = content.replace(/\\}/g, "}");
            // Write the converted content back to the file
            await fsExtra.writeFile(absPath, content);
          }

          // Handle other files with Prettier
          const info = await prettier.getFileInfo(absPath);
          if (info.ignored || info.inferredParser == null) continue;

          // prettier.format is now async in Prettier 3.x, so we must await it
          const formatted = await prettier.format(content, {
            ...prettierConfig,
            filepath: absPath,
          });
          await fsExtra.writeFile(absPath, formatted);
          console.log(chalk.green(`✨ Formatted: ${file}`));
        } catch (err) {
          console.warn(chalk.yellow(`⚠️ Could not format ${file}: ${err}`));
        }
      }
    },
  };
  private currentProjectPath?: string;
  async generateFromTemplate(
    projectPath: string,
    context: TemplateContext,
    template: TemplateDefinition
  ): Promise<string[]> {
    const generatedFiles: string[] = [];

    // Store the project path for use in hooks
    this.currentProjectPath = projectPath;

    // Pre-generation hook
    if (this.hooks?.preGenerate) {
      await this.hooks.preGenerate(context);
    }

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
    this.validateTemplateFiles(filesToGenerate, context);
    console.log(
      chalk.blue(`ℹ️  Generating ${filesToGenerate.length} files...`)
    );
    for (const fileConfig of filesToGenerate) {
      if (this.shouldIncludeFile(fileConfig, context)) {
        const dest = join(projectPath, fileConfig.dest); // Ensure directory exists
        await fsExtra.ensureDir(dirname(dest));

        // Generate file content
        const content = await this.generateFileContent(
          fileConfig,
          context,
          template
        );

        // Write file
        await fsExtra.writeFile(dest, content);
        generatedFiles.push(fileConfig.dest);

        console.log(`✅ Generated: ${fileConfig.dest}`);
      }
    }

    // Post-generation hook
    if (this.hooks?.postGenerate) {
      await this.hooks.postGenerate(context, generatedFiles);
    }

    return generatedFiles;
  }
  // Generate the list of files to create based on context
  private generateFileList(context: TemplateContext): TemplateFile[] {
    const templateRoot = path.resolve(
      __dirname,
      "../../../templates",
      context.template
    ); // 1. Recursively grab every *.hbs under the template directory
    function walk(dir: string): string[] {
      let results: string[] = [];
      const list = fsExtra.readdirSync(dir);
      list.forEach((file: string) => {
        const filePath = path.join(dir, file);
        const stat = fsExtra.statSync(filePath);
        if (stat && stat.isDirectory()) {
          results = results.concat(walk(filePath));
        } else if (file.endsWith(".hbs")) {
          results.push(filePath);
        }
      });
      return results;
    }
    const hbsFiles = walk(templateRoot);

    // 2. Convert to TemplateFile objects
    const files: TemplateFile[] = hbsFiles.map((srcPath: string) => {
      const relative = path.relative(templateRoot, srcPath);
      return {
        src: `${context.template}/${relative.replace(/\\/g, "/")}`,
        dest: relative.replace(/\\/g, "/").replace(/\.hbs$/, ""),
        // Advanced: You can add a condition property here if you want to support per-file conditions
      };
    });

    // 3. Optionally, add virtual files here if needed
    // files.push({ src: ..., dest: ... });

    return files;
  }

  // Advanced conditional file inclusion
  private shouldIncludeFile(
    fileConfig: TemplateFile,
    context: TemplateContext
  ): boolean {
    if (typeof fileConfig.condition === "function") {
      try {
        return fileConfig.condition(context);
      } catch (e) {
        console.warn(
          `⚠️ Condition function failed for ${fileConfig.dest}: ${e}`
        );
        return false;
      }
    }
    return !fileConfig.condition || !!fileConfig.condition;
  }
  // Error reporting & validation for missing/malformed template files
  private validateTemplateFiles(
    files: TemplateFile[],
    context: TemplateContext
  ) {
    const templateRoot = path.resolve(__dirname, "../../../templates");
    let hasError = false;
    files.forEach((file) => {
      if (file.src) {
        const filePath = path.join(templateRoot, file.src);
        if (!fsExtra.existsSync(filePath)) {
          console.error(chalk.red(`❌ Template file missing: ${filePath}`));
          hasError = true;
        }
      }
    });
    if (hasError) {
      throw new Error(
        "One or more template files are missing. See errors above."
      );
    }
  }

  private async generateFileContent(
    fileConfig: TemplateFile,
    context: TemplateContext,
    template: TemplateDefinition
  ): Promise<string> {
    // First try to use actual template files from the templates directory
    if (fileConfig.src) {
      const templatePath = path.resolve(
        __dirname,
        "../../../templates",
        fileConfig.src
      );
      if (await fsExtra.pathExists(templatePath)) {
        try {
          const templateContent = await fsExtra.readFile(templatePath, "utf-8");

          // Create handlebars instance with registered helpers
          const handlebars = Handlebars.create();
          registerHandlebarsHelpers(handlebars);

          const compiledTemplate = handlebars.compile(templateContent);
          return compiledTemplate(context);
        } catch (error) {
          console.warn(
            `⚠️ Failed to process template ${fileConfig.src}: ${error}`
          );
          // Fall back to generated content
        }
      } else {
        console.warn(`⚠️ No generator for: ${fileConfig.dest}`);
      }
    }

    // Fall back to hardcoded generators
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
