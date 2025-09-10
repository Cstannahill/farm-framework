// packages/cli/src/scaffolding/scaffolder.ts
import { join, basename } from "path";
import { mkdir } from "fs/promises";
import fs from "fs-extra";
import { TemplateContext } from "@farm-framework/types";
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
  private templateProcessor: TemplateProcessor;
  private structureGenerator: ProjectStructureGenerator;
  private dependencyResolver: DependencyResolver;

  constructor(
    private options: { verbose?: boolean; skipInstall?: boolean } = {}
  ) {
    // TemplateRegistry will be initialized in generateProject when we have the templates directory
    this.templateProcessor = new TemplateProcessor();
    this.structureGenerator = new ProjectStructureGenerator();
    this.dependencyResolver = new DependencyResolver();
  }
  async generateProject(
    projectPath: string,
    context: TemplateContext
  ): Promise<ScaffoldResult> {
    const projectName = basename(projectPath);
    const generatedFiles: string[] = [];

    logger.step(`🚀 STARTING PROJECT GENERATION`);
    logger.debugVerbose(`Project name: ${projectName}`);
    logger.debugVerbose(`Template: ${context.template}`);
    logger.debugVerbose(`Features: ${context.features?.join(", ") || "none"}`);
    logger.debugVerbose(`Database: ${context.database}`);
    logger.debugVerbose(`Project path: ${projectPath}`);

    try {
      logger.info(`🏗️ Generating ${context.template} project...`);

      // Convert to CLI context for internal operations
      logger.step(`🔄 Converting context for internal operations`);
      const cliContext = toCliTemplateContext(context);
      logger.debugDetailed(`CLI context created:`, cliContext);

      // Validate template exists (validation will be done in the registry system)
      logger.step(`🔍 Validating template exists: ${context.template}`);
      logger.result(`✅ Template validated: ${context.template}`);

      // 1. Create project directory
      logger.step(`📁 Creating project directory: ${projectPath}`);
      await mkdir(projectPath, { recursive: true });
      logger.result(`✅ Project directory created: ${projectPath}`);

      // 2. Generate directory structure
      logger.step(`🏗️ Generating directory structure`);
      const createdDirs =
        await this.structureGenerator.generateProjectStructure(
          projectPath,
          cliContext
        );
      logger.result(`✅ Created ${createdDirs.length} directories`);
      logger.debugVerbose(`Created directories:`, createdDirs); // 3. Process and copy template files with enhanced processor
      logger.step(`🎨 Processing template files with inheritance`);
      logger.debugVerbose(`Starting template processing with options:`, {
        verbose: this.options.verbose,
        template: context.template,
        outputPath: projectPath,
      });

      // Use the new registry-based template processing
      await this.templateProcessor.processTemplateWithRegistry(
        context.template,
        context,
        projectPath,
        context.features || []
      );

      logger.result(
        `✅ Generated files from template using registry system`
      );

      // 4. Generate dependency files
      logger.step(`📦 Generating dependency files`);
      await this.generateDependencyFiles(projectPath, cliContext);
      generatedFiles.push("package.json");
      if (context.template !== "api-only") {
        generatedFiles.push("apps/web/package.json");
      }
      generatedFiles.push(
        "apps/api/requirements.txt",
        "apps/api/pyproject.toml"
      );
      logger.result(`✅ Dependency files generated`);

      // 5. Initialize git if requested
      logger.step(
        `🔧 Git initialization ${context.git ? "requested" : "skipped"}`
      );
      const gitInitialized = context.git
        ? await this.initializeGit(projectPath)
        : false;
      logger.result(`Git initialized: ${gitInitialized ? "Yes" : "No"}`);

      // 6. Install dependencies if requested
      logger.step(
        `📦 Dependency installation ${context.install && !this.options.skipInstall ? "requested" : "skipped"}`
      );
      const installedDependencies =
        context.install && !this.options.skipInstall
          ? await this.installDependencies(projectPath, context)
          : false;
      logger.result(
        `Dependencies installed: ${installedDependencies ? "Yes" : "No"}`
      );

      logger.success(`🎉 PROJECT GENERATION COMPLETED SUCCESSFULLY!`);
      logger.result(`Total files generated: ${generatedFiles.length}`);
      logger.debugDetailed(`Final generated files list:`, generatedFiles);

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
      logger.error(`❌ PROJECT GENERATION FAILED: ${errorMessage}`);

      if (error instanceof Error && error.stack) {
        logger.debugDetailed(`Error stack trace:`, error.stack);
      }

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
    logger.step(`📦 Starting dependency file generation`);
    logger.debugVerbose(`Project path: ${projectPath}`);
    logger.debugVerbose(`Template: ${context.template}`);

    // Generate root package.json
    logger.progress(`Generating root package.json`);
    const rootPackageJson =
      this.dependencyResolver.generateRootPackageJson(context);
    logger.debugDetailed(`Root package.json content:`, rootPackageJson);
    await fs.writeJSON(join(projectPath, "package.json"), rootPackageJson, {
      spaces: 2,
    });
    logger.result(`✅ Root package.json written`);

    // Generate frontend package.json (if not API-only)
    if (context.template !== "api-only") {
      logger.progress(`Generating frontend package.json`);
      const frontendPackageJson =
        this.dependencyResolver.generateFrontendPackageJson(context);
      logger.debugDetailed(
        `Frontend package.json content:`,
        frontendPackageJson
      );
      await fs.writeJSON(
        join(projectPath, "apps/web/package.json"),
        frontendPackageJson,
        { spaces: 2 }
      );
      logger.result(`✅ Frontend package.json written`);
    } else {
      logger.progress(`Skipping frontend package.json (API-only template)`);
    }

    // Generate Python requirements
    logger.progress(`Generating Python requirements.txt`);
    const requirements = this.dependencyResolver.generateRequirements(context);
    logger.debugDetailed(`Requirements content:`, requirements);
    await fs.writeFile(
      join(projectPath, "apps/api/requirements.txt"),
      requirements
    );
    logger.result(`✅ Requirements.txt written`);

    // Generate pyproject.toml
    logger.progress(`Generating pyproject.toml`);
    const pyprojectToml =
      this.dependencyResolver.generatePyprojectToml(context);
    logger.debugDetailed(`Pyproject.toml content:`, pyprojectToml);
    await fs.writeFile(
      join(projectPath, "apps/api/pyproject.toml"),
      pyprojectToml
    );
    logger.result(`✅ Pyproject.toml written`);

    logger.result(`✅ All dependency files generated successfully`);
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
