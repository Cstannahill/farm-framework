// packages/cli/src/scaffolding/scaffolder.ts
import { join } from "path";
import { mkdir } from "fs/promises";
import fs from "fs-extra";
import { TemplateContext } from "@farm/types";
import {
  TemplateDefinition,
  TemplateName,
  TemplateContext as CLITemplateContext,
} from "../template/types.js";
import { TemplateRegistry } from "../template/registry.js";
import { TemplateProcessor } from "../template/processor.js";
import { ProjectStructureGenerator } from "../generators/project-structure.js";
import { DependencyResolver } from "../template/dependencies.js";
import { exec } from "child_process";
import { promisify } from "util";
import { logger } from "../utils/logger.js";

const execAsync = promisify(exec);

// Helper function to convert shared TemplateContext to CLI TemplateContext
function toCliTemplateContext(context: TemplateContext): CLITemplateContext {
  return {
    ...context,
    template: context.template as TemplateName,
    // Map any additional fields as needed
    config: undefined, // Not used in this context
  } as CLITemplateContext;
}

export interface ScaffoldResult {
  success: boolean;
  errors: string[];
  installedDependencies: boolean;
  gitInitialized: boolean;
  projectPath: string;
  generatedFiles: string[];
}

export class ProjectScaffolder {
  private templateRegistry: TemplateRegistry;
  private templateProcessor: TemplateProcessor;
  private structureGenerator: ProjectStructureGenerator;
  private dependencyResolver: DependencyResolver;

  constructor(
    private options: { verbose?: boolean; skipInstall?: boolean } = {}
  ) {
    this.templateRegistry = new TemplateRegistry();
    this.templateProcessor = new TemplateProcessor();
    this.structureGenerator = new ProjectStructureGenerator();
    this.dependencyResolver = new DependencyResolver();
  }

  async generateProject(
    projectName: string,
    context: TemplateContext
  ): Promise<ScaffoldResult> {
    const projectPath = join(process.cwd(), projectName);
    const generatedFiles: string[] = [];
    try {
      logger.info(`🏗️ Generating ${context.template} project...`);

      // Convert to CLI context for internal operations
      const cliContext = toCliTemplateContext(context);

      // Validate template exists
      const template = this.templateRegistry.get(
        context.template as TemplateName
      );
      if (!template) {
        throw new Error(`Template ${context.template} not found`);
      }

      // 1. Create project directory
      await mkdir(projectPath, { recursive: true });
      logger.info(`📁 Created project directory: ${projectPath}`);

      // 2. Generate directory structure
      const createdDirs =
        await this.structureGenerator.generateProjectStructure(
          projectPath,
          cliContext
        );
      logger.info(`📁 Created ${createdDirs.length} directories`); // 3. Process and copy template files with enhanced processor
      const processingResult = await this.templateProcessor.processTemplate(
        context.template,
        context,
        projectPath,
        {
          verbose: this.options.verbose,
          onProgress: (progress) => {
            if (this.options.verbose) {
              logger.info(
                `📄 Processing: ${progress.currentFile} (${progress.current}/${progress.total})`
              );
            }
          },
        }
      );

      generatedFiles.push(...processingResult.generatedFiles);

      logger.info(
        `📄 Generated ${processingResult.generatedFiles.length} files from template`
      );
      if (processingResult.skippedFiles.length > 0) {
        logger.info(
          `⏭️ Skipped ${processingResult.skippedFiles.length} files based on features/template`
        );
      }

      if (this.options.verbose && processingResult.metrics) {
        logger.info(
          `⚡ Template processing completed in ${processingResult.metrics.totalProcessingTime}ms`
        );
        logger.info(
          `📊 Cache hit ratio: ${((processingResult.metrics.cacheHits / (processingResult.metrics.cacheHits + processingResult.metrics.cacheMisses)) * 100).toFixed(1)}%`
        );
      } // 4. Generate dependency files
      await this.generateDependencyFiles(projectPath, cliContext);
      generatedFiles.push("package.json");
      if (context.template !== "api-only") {
        generatedFiles.push("apps/web/package.json");
      }
      generatedFiles.push(
        "apps/api/requirements.txt",
        "apps/api/pyproject.toml"
      );

      // 5. Initialize git if requested
      const gitInitialized = context.git
        ? await this.initializeGit(projectPath)
        : false;

      // 6. Install dependencies if requested
      const installedDependencies =
        context.install && !this.options.skipInstall
          ? await this.installDependencies(projectPath, context)
          : false;

      logger.success(`✅ Project generation completed successfully!`);

      return {
        success: true,
        errors: [],
        installedDependencies,
        gitInitialized,
        projectPath,
        generatedFiles,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error(`❌ Project generation failed: ${errorMessage}`);

      return {
        success: false,
        errors: [errorMessage],
        installedDependencies: false,
        gitInitialized: false,
        projectPath,
        generatedFiles,
      };
    }
  }
  private async generateDependencyFiles(
    projectPath: string,
    context: CLITemplateContext
  ): Promise<void> {
    logger.info(`📦 Generating dependency files...`);

    // Generate root package.json
    const rootPackageJson =
      this.dependencyResolver.generateRootPackageJson(context);
    await fs.writeJSON(join(projectPath, "package.json"), rootPackageJson, {
      spaces: 2,
    });

    // Generate frontend package.json (if not API-only)
    if (context.template !== "api-only") {
      const frontendPackageJson =
        this.dependencyResolver.generateFrontendPackageJson(context);
      await fs.writeJSON(
        join(projectPath, "apps/web/package.json"),
        frontendPackageJson,
        { spaces: 2 }
      );
    }

    // Generate Python requirements
    const requirements = this.dependencyResolver.generateRequirements(context);
    await fs.writeFile(
      join(projectPath, "apps/api/requirements.txt"),
      requirements
    );

    // Generate pyproject.toml
    const pyprojectToml =
      this.dependencyResolver.generatePyprojectToml(context);
    await fs.writeFile(
      join(projectPath, "apps/api/pyproject.toml"),
      pyprojectToml
    );
  }

  private async initializeGit(projectPath: string): Promise<boolean> {
    try {
      logger.info(`🔧 Initializing git repository...`);

      await execAsync("git init", { cwd: projectPath });

      // Create .gitignore if it doesn't exist
      const gitignorePath = join(projectPath, ".gitignore");
      if (!(await fs.pathExists(gitignorePath))) {
        const gitignoreContent = this.generateGitignore();
        await fs.writeFile(gitignorePath, gitignoreContent);
      } // Stage all files
      await execAsync("git add .", { cwd: projectPath });

      // Create initial commit
      await execAsync('git commit -m "Initial commit from FARM CLI"', {
        cwd: projectPath,
      });

      logger.success(`✅ Git repository initialized`);
      return true;
    } catch (error) {
      logger.warn(
        `⚠️ Git initialization failed: ${error instanceof Error ? error.message : String(error)}`
      );
      return false;
    }
  }

  private async installDependencies(
    projectPath: string,
    context: TemplateContext
  ): Promise<boolean> {
    try {
      logger.info(`📦 Installing dependencies...`);

      // Install frontend dependencies (if not API-only)
      if (context.template !== "api-only") {
        logger.info(`📦 Installing frontend dependencies...`);
        try {
          // Try pnpm first, fallback to npm
          await execAsync("pnpm install", {
            cwd: join(projectPath, "apps/web"),
            timeout: 300000, // 5 minutes
          });
        } catch {
          logger.info(`📦 pnpm not available, using npm...`);
          await execAsync("npm install", {
            cwd: join(projectPath, "apps/web"),
            timeout: 300000, // 5 minutes
          });
        }
      }

      // Install backend dependencies
      logger.info(`📦 Installing backend dependencies...`);
      try {
        // Try to create virtual environment first
        await execAsync("python -m venv venv", {
          cwd: join(projectPath, "apps/api"),
          timeout: 120000, // 2 minutes
        });

        // Activate venv and install
        const venvPython =
          process.platform === "win32"
            ? ".\\venv\\Scripts\\python"
            : "./venv/bin/python";
        await execAsync(`${venvPython} -m pip install -r requirements.txt`, {
          cwd: join(projectPath, "apps/api"),
          timeout: 300000, // 5 minutes
        });
      } catch {
        // Fallback to global pip install
        logger.info(
          `📦 Virtual environment creation failed, using global pip...`
        );
        await execAsync("pip install -r requirements.txt", {
          cwd: join(projectPath, "apps/api"),
          timeout: 300000, // 5 minutes
        });
      }

      logger.success(`✅ Dependencies installed successfully`);
      return true;
    } catch (error) {
      logger.warn(
        `⚠️ Dependency installation failed: ${error instanceof Error ? error.message : String(error)}`
      );
      logger.info(`💡 You can install dependencies manually later`);
      return false;
    }
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
*.temp

# FARM specific
.farm/
`;
  }
}
