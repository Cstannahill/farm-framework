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

export interface GenerationMetrics {
  totalFiles: number;
  templatesProcessed: number;
  staticFilesCopied: number;
  errors: string[];
  warnings: string[];
  duration: number;
  cacheHits: number;
  cacheMisses: number;
}

export class ProjectFileGenerator {
  private structureGenerator = new ProjectStructureGenerator();
  private currentProjectPath?: string;
  private templateCache = new Map<string, HandlebarsTemplateDelegate>();
  private handlebarsInstance: typeof Handlebars;

  // 🔧 CRITICAL FIX: Cache template root resolution
  private _templateRoot: string | null = null;
  private _templateRootResolved = false;

  private metrics: GenerationMetrics = {
    totalFiles: 0,
    templatesProcessed: 0,
    staticFilesCopied: 0,
    errors: [],
    warnings: [],
    duration: 0,
    cacheHits: 0,
    cacheMisses: 0,
  };

  hooks?: ProjectFileGeneratorHooks = {
    postGenerate: async (context, generatedFiles) => {
      const projectRoot = this.currentProjectPath || process.cwd();

      try {
        console.log(chalk.blue("🐍 Formatting Python files..."));
        await formatPython({ projectRoot, verbose: false });

        const jsFiles = generatedFiles.filter(
          (f) =>
            f.endsWith(".ts") ||
            f.endsWith(".tsx") ||
            f.endsWith(".js") ||
            f.endsWith(".jsx") ||
            f.endsWith(".json") ||
            f.endsWith(".md")
        );

        if (jsFiles.length > 0) {
          console.log(
            chalk.blue(`📝 Formatting ${jsFiles.length} frontend files...`)
          );

          const prettierConfig = await prettier.resolveConfig(projectRoot);
          let formatted = 0;
          let errors = 0;

          for (let i = 0; i < jsFiles.length; i++) {
            const file = jsFiles[i];
            const absPath = path.resolve(projectRoot, file);

            try {
              let content = await fsExtra.readFile(absPath, "utf-8");

              // Fix HTML entities for JS/TS files
              if (
                file.endsWith(".tsx") ||
                file.endsWith(".ts") ||
                file.endsWith(".jsx") ||
                file.endsWith(".js")
              ) {
                content = content
                  .replace(/&#123;/g, "{")
                  .replace(/&#125;/g, "}");
                content = content.replace(/\\{/g, "{").replace(/\\}/g, "}");
                await fsExtra.writeFile(absPath, content);
              }

              const info = await prettier.getFileInfo(absPath);
              if (!info.ignored && info.inferredParser != null) {
                const formattedContent = await prettier.format(content, {
                  ...prettierConfig,
                  filepath: absPath,
                });
                await fsExtra.writeFile(absPath, formattedContent);
                formatted++;
              }

              this.logProgress(i + 1, jsFiles.length, "formatting");
            } catch (err) {
              errors++;
              const errorMsg = err instanceof Error ? err.message : String(err);
              console.log(
                chalk.yellow(`\n⚠️ Formatting failed for ${file}: ${errorMsg}`)
              );
            }
          }

          if (errors === 0) {
            console.log(chalk.green(`✨ All files formatted successfully`));
          } else {
            console.log(
              chalk.yellow(`✨ Formatted ${formatted} files, ${errors} errors`)
            );
          }
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(chalk.red(`❌ Post-processing failed: ${errorMsg}`));
        throw error;
      }
    },
  };

  constructor() {
    // Initialize Handlebars once and reuse
    this.handlebarsInstance = Handlebars.create();
    registerHandlebarsHelpers(this.handlebarsInstance);
  }

  /**
   * 🚀 OPTIMIZED: Template resolution with caching - called ONCE per generation
   */
  private resolveTemplateRoot(): string {
    // Return cached result if already resolved
    if (this._templateRootResolved) {
      if (this._templateRoot) {
        return this._templateRoot;
      }
      throw new Error("Template root resolution failed - see previous errors");
    }

    console.log(chalk.gray("🔍 Resolving template directory..."));

    // Strategy 1: Use import.meta.resolve for ESM compatibility (most reliable)
    try {
      const packageUrl = import.meta.resolve("farm-framework/package.json");
      const packagePath = new URL(packageUrl).pathname;
      const packageDir = path.dirname(packagePath);

      // Primary: Check bundled templates
      const bundledTemplates = path.resolve(packageDir, "dist/templates");
      if (fsExtra.existsSync(bundledTemplates)) {
        console.log(
          chalk.green(`📁 Found bundled templates: ${bundledTemplates}`)
        );
        this._templateRoot = bundledTemplates;
        this._templateRootResolved = true;
        return bundledTemplates;
      }
    } catch (error) {
      // Silent fail - try next strategy
    }

    // Strategy 2: Use require.resolve for CommonJS compatibility
    try {
      const packageJson = require.resolve("farm-framework/package.json");
      const packageDir = path.dirname(packageJson);

      const bundledTemplates = path.resolve(packageDir, "dist/templates");
      if (fsExtra.existsSync(bundledTemplates)) {
        console.log(
          chalk.green(`📁 Found bundled templates: ${bundledTemplates}`)
        );
        this._templateRoot = bundledTemplates;
        this._templateRootResolved = true;
        return bundledTemplates;
      }

      // Fallback to source templates for development
      const sourceTemplates = path.resolve(packageDir, "templates");
      if (fsExtra.existsSync(sourceTemplates)) {
        console.log(
          chalk.green(`📁 Found source templates: ${sourceTemplates}`)
        );
        this._templateRoot = sourceTemplates;
        this._templateRootResolved = true;
        return sourceTemplates;
      }
    } catch (error) {
      // Silent fail - try next strategy
    }

    // Strategy 3: Relative path resolution (development/local builds)
    const devPaths = [
      path.resolve(__dirname, "../dist/templates"),
      path.resolve(__dirname, "../templates"),
      path.resolve(__dirname, "../../templates"),
      path.resolve(__dirname, "../../../templates"),
    ];

    for (const templatePath of devPaths) {
      if (fsExtra.existsSync(templatePath)) {
        console.log(chalk.green(`📁 Found dev templates: ${templatePath}`));
        this._templateRoot = templatePath;
        this._templateRootResolved = true;
        return templatePath;
      }
    }

    // Strategy 4: Environment variable override
    if (
      process.env.FARM_TEMPLATES_PATH &&
      fsExtra.existsSync(process.env.FARM_TEMPLATES_PATH)
    ) {
      console.log(
        chalk.green(
          `📁 Found env templates: ${process.env.FARM_TEMPLATES_PATH}`
        )
      );
      this._templateRoot = process.env.FARM_TEMPLATES_PATH;
      this._templateRootResolved = true;
      return process.env.FARM_TEMPLATES_PATH;
    }

    // Mark as resolved (failed) to prevent repeated attempts
    this._templateRootResolved = true;
    this._templateRoot = null;

    throw new Error(
      `❌ Could not locate FARM templates directory.\n` +
        `Searched locations:\n` +
        `  - Bundled: dist/templates\n` +
        `  - Source: templates/\n` +
        `  - Development paths: ${devPaths.join(", ")}\n` +
        `  - Environment: ${process.env.FARM_TEMPLATES_PATH || "not set"}\n\n` +
        `Please ensure farm-framework is properly installed or set FARM_TEMPLATES_PATH environment variable.`
    );
  }

  // Progress tracking
  private logProgress(
    current: number,
    total: number,
    type: "templates" | "static" | "formatting"
  ) {
    const percentage = Math.round((current / total) * 100);
    const progressBar =
      "█".repeat(Math.floor(percentage / 5)) +
      "░".repeat(20 - Math.floor(percentage / 5));

    process.stdout.write(
      `\r🎨 Processing ${type}: [${progressBar}] ${percentage}% (${current}/${total})`
    );

    if (current === total) {
      console.log(""); // New line when complete
    }
  }

  async generateFromTemplate(
    projectPath: string,
    context: TemplateContext,
    template: TemplateDefinition
  ): Promise<string[]> {
    const startTime = Date.now();
    this.currentProjectPath = projectPath;
    this.metrics = { ...this.metrics, totalFiles: 0, duration: 0 };

    try {
      console.log(chalk.blue(`⚙️ 🏗️ Initializing project generation...`));

      // 🔧 CRITICAL: Resolve template root ONCE at the beginning
      const templateRoot = this.resolveTemplateRoot();

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
        chalk.green(
          `📁 Project structure ready (${createdDirectories.length} directories)`
        )
      );

      // Generate files based on template and context
      const filesToGenerate = this.generateFileList(context, templateRoot);
      this.validateTemplateFiles(filesToGenerate, templateRoot);

      const templateFiles = filesToGenerate.filter(
        (f) => f.transform !== false
      );
      const staticFiles = filesToGenerate.filter((f) => f.transform === false);

      this.metrics.totalFiles = filesToGenerate.length;

      console.log(
        chalk.blue(
          `ℹ️ Processing ${filesToGenerate.length} files ` +
            `(${templateFiles.length} templates, ${staticFiles.length} static)`
        )
      );

      const generatedFiles: string[] = [];

      // Process template files with progress
      if (templateFiles.length > 0) {
        console.log(chalk.blue("🔧 Processing template files..."));
        await this.processFilesWithProgress(
          templateFiles,
          projectPath,
          context,
          template,
          generatedFiles,
          "templates",
          templateRoot
        );
        this.metrics.templatesProcessed = templateFiles.length;
      }

      // Process static files with progress
      if (staticFiles.length > 0) {
        console.log(chalk.blue("📄 Copying static files..."));
        await this.processFilesWithProgress(
          staticFiles,
          projectPath,
          context,
          template,
          generatedFiles,
          "static",
          templateRoot
        );
        this.metrics.staticFilesCopied = staticFiles.length;
      }

      this.metrics.duration = Date.now() - startTime;

      // Consolidated success message
      const duration = (this.metrics.duration / 1000).toFixed(1);
      console.log(
        chalk.green(
          `✅ Generated ${generatedFiles.length} files successfully ` +
            `(${this.metrics.templatesProcessed} templates, ${this.metrics.staticFilesCopied} static) ` +
            `in ${duration}s`
        )
      );

      // Post-generation hook
      if (this.hooks?.postGenerate) {
        console.log(chalk.blue(`🎨 Formatting and optimizing files...`));
        await this.hooks.postGenerate(context, generatedFiles);
      }

      return generatedFiles;
    } catch (error) {
      this.metrics.duration = Date.now() - startTime;
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.metrics.errors.push(`Generation failed: ${errorMsg}`);

      console.error(chalk.red(`❌ Project generation failed: ${errorMsg}`));
      throw error;
    }
  }

  private async processFilesWithProgress(
    files: TemplateFile[],
    projectPath: string,
    context: TemplateContext,
    template: TemplateDefinition,
    generatedFiles: string[],
    type: "templates" | "static",
    templateRoot: string // Pass template root to avoid repeated resolution
  ): Promise<void> {
    for (let i = 0; i < files.length; i++) {
      const fileConfig = files[i];

      if (this.shouldIncludeFile(fileConfig, context)) {
        try {
          const dest = join(projectPath, fileConfig.dest);
          // Ensure directory exists
          await fsExtra.ensureDir(dirname(dest));

          // Handle static files vs template files differently
          if (fileConfig.transform === false) {
            // Static file - copy as-is
            const sourcePath = path.resolve(templateRoot, fileConfig.src);
            await fsExtra.copyFile(sourcePath, dest);
          } else {
            // Template file - process with Handlebars
            const content = await this.generateFileContent(
              fileConfig,
              context,
              template,
              templateRoot
            );
            await fsExtra.writeFile(dest, content);
          }

          generatedFiles.push(fileConfig.dest);
          this.logProgress(i + 1, files.length, type);
        } catch (error) {
          const errorMsg =
            error instanceof Error ? error.message : String(error);
          console.log(
            chalk.red(`\n❌ Failed to generate ${fileConfig.dest}: ${errorMsg}`)
          );
        }
      } else {
        this.logProgress(i + 1, files.length, type);
      }
    }
  }

  // Generate the list of files to create based on context
  private generateFileList(
    context: TemplateContext,
    templateRoot: string
  ): TemplateFile[] {
    const templateDir = path.resolve(templateRoot, context.template);

    if (!fsExtra.existsSync(templateDir)) {
      throw new Error(`Template directory not found: ${templateDir}`);
    }

    // Recursively grab every file under the template directory
    function walk(dir: string): { templates: string[]; statics: string[] } {
      let templates: string[] = [];
      let statics: string[] = [];
      const list = fsExtra.readdirSync(dir);
      list.forEach((file: string) => {
        const filePath = path.join(dir, file);
        const stat = fsExtra.statSync(filePath);
        if (stat && stat.isDirectory()) {
          const subResults = walk(filePath);
          templates = templates.concat(subResults.templates);
          statics = statics.concat(subResults.statics);
        } else if (file.endsWith(".hbs")) {
          templates.push(filePath);
        } else {
          // Include static files that don't require Handlebars processing
          statics.push(filePath);
        }
      });
      return { templates, statics };
    }

    const { templates: hbsFiles, statics: staticFiles } = walk(templateDir);

    // Convert template files to TemplateFile objects
    const templateFileObjects: TemplateFile[] = hbsFiles.map(
      (srcPath: string) => {
        const relative = path.relative(templateDir, srcPath);
        return {
          src: `${context.template}/${relative.replace(/\\/g, "/")}`,
          dest: relative.replace(/\\/g, "/").replace(/\.hbs$/, ""),
          transform: true, // Mark as needing template processing
        };
      }
    );

    // Convert static files to TemplateFile objects (copy as-is)
    const staticFileObjects: TemplateFile[] = staticFiles.map(
      (srcPath: string) => {
        const relative = path.relative(templateDir, srcPath);
        return {
          src: `${context.template}/${relative.replace(/\\/g, "/")}`,
          dest: relative.replace(/\\/g, "/"),
          transform: false, // Mark as not needing template processing
        };
      }
    );

    // Combine both types of files
    const files = [...templateFileObjects, ...staticFileObjects];
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
        const errorMsg = e instanceof Error ? e.message : String(e);
        console.warn(
          `⚠️ Condition function failed for ${fileConfig.dest}: ${errorMsg}`
        );
        return false;
      }
    }
    return !fileConfig.condition || !!fileConfig.condition;
  }

  // Error reporting & validation for missing/malformed template files
  private validateTemplateFiles(files: TemplateFile[], templateRoot: string) {
    const missingFiles: string[] = [];

    files.forEach((file) => {
      if (file.src && file.transform !== false) {
        const filePath = path.join(templateRoot, file.src);
        if (!fsExtra.existsSync(filePath)) {
          missingFiles.push(filePath);
        }
      }
    });

    if (missingFiles.length > 0) {
      console.error(
        chalk.red(`❌ Missing template files (${missingFiles.length}):`)
      );
      missingFiles.forEach((file) => console.error(chalk.red(`   • ${file}`)));
      throw new Error("Template validation failed. See missing files above.");
    }
  }

  private async generateFileContent(
    fileConfig: TemplateFile,
    context: TemplateContext,
    template: TemplateDefinition,
    templateRoot: string // Pass template root to avoid repeated resolution
  ): Promise<string> {
    // First try to use actual template files from the templates directory
    if (fileConfig.src) {
      const templatePath = path.resolve(templateRoot, fileConfig.src);
      if (await fsExtra.pathExists(templatePath)) {
        try {
          // Check cache first
          let compiledTemplate = this.templateCache.get(templatePath);

          if (!compiledTemplate) {
            const templateContent = await fsExtra.readFile(
              templatePath,
              "utf-8"
            );

            // 🔧 ENHANCED: Better Handlebars error handling
            try {
              compiledTemplate = this.handlebarsInstance.compile(
                templateContent,
                {
                  strict: false, // More lenient parsing
                  noEscape: false, // Allow HTML escaping
                }
              );
              this.templateCache.set(templatePath, compiledTemplate);
              this.metrics.cacheMisses++;
            } catch (compileError) {
              const errorMsg =
                compileError instanceof Error
                  ? compileError.message
                  : String(compileError);
              console.warn(
                chalk.yellow(
                  `⚠️ Template compilation failed for ${fileConfig.src}: ${errorMsg}`
                )
              );
              console.warn(
                chalk.yellow(`   Falling back to basic content generation`)
              );
              return this.generateContentFromScratch(
                fileConfig,
                context,
                template
              );
            }
          } else {
            this.metrics.cacheHits++;
          }

          return compiledTemplate(context);
        } catch (error) {
          const errorMsg =
            error instanceof Error ? error.message : String(error);
          console.warn(
            `⚠️ Failed to process template ${fileConfig.src}: ${errorMsg}`
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

  // All the generator methods (keeping your existing implementations)
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
    {name = "FARM CLI", email = "hello@farm-framework.dev"},
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
          "@farm-framework/cli": "latest",
        },
      },
      null,
      2
    );
  }

  private generateFarmConfig(context: TemplateContext): string {
    const hasAI = context.features.includes("ai");

    let config = `import { defineConfig } from '@farm-framework/core';

export default defineConfig({
  name: '${context.projectName}',
  template: '${context.template}',
    database: {
    type: '${context.database}',
    url: process.env.DATABASE_URL || '${this.getDefaultDatabaseUrl(context.database, context.name)}'
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
      case "sqlserver":
        return `mssql+pyodbc://user:password@localhost:1433/${dbName}?driver=ODBC+Driver+18+for+SQL+Server&TrustServerCertificate=yes`;
      default:
        return `mongodb://localhost:27017/${dbName}`;
    }
  }
}
