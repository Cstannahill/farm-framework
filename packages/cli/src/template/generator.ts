// src/template/generator.ts
import { mkdir, writeFile, chmod, access } from "fs/promises";
import { join, dirname, resolve } from "path";
import { execSync } from "child_process";
import {
  TemplateContext,
  TemplateDefinition,
  GenerationResult,
} from "./types.js";
import { TemplateRegistry } from "./registry.js";
import { TemplateProcessor } from "./processor.js";
import { DependencyResolver } from "./dependencies.js";
import { GitInitializer } from "./git.js";
import { getErrorMessage, isErrorInstance } from "../utils/error-utils.js";
import { messages, format, styles } from "../utils/styling.js";
export class ProjectGenerator {
  private registry: TemplateRegistry;
  private processor: TemplateProcessor;
  private dependencyResolver: DependencyResolver;
  private gitInitializer: GitInitializer;

  constructor() {
    this.registry = new TemplateRegistry();
    this.processor = new TemplateProcessor();
    this.dependencyResolver = new DependencyResolver();
    this.gitInitializer = new GitInitializer();
  }

  async generateProject(context: TemplateContext): Promise<GenerationResult> {
    const result: GenerationResult = {
      success: false,
      projectPath: resolve(context.projectName),
      generatedFiles: [],
      installedDependencies: false,
      gitInitialized: false,
      errors: [],
      warnings: [],
    };

    try {
      console.log(`🌾 Generating FARM project: ${context.projectName}`);

      // Get template definition
      const template = this.registry.get(context.template);
      if (!template) {
        throw new Error(`Template '${context.template}' not found`);
      }

      // Validate context against template
      this.validateContext(context, template);

      // Create project directory
      await this.createProjectDirectory(result.projectPath);
      console.log(`📁 Created project directory: ${context.projectName}`);

      // Generate files from template
      await this.generateFiles(context, template, result);
      console.log(`📄 Generated ${result.generatedFiles.length} files`);

      // Generate package.json files with resolved dependencies
      await this.generatePackageFiles(context, template, result);
      console.log(messages.step("Generated package configuration files"));

      // Initialize git repository
      if (context.git) {
        try {
          await this.gitInitializer.initializeRepository(
            result.projectPath,
            context
          );
          result.gitInitialized = true;
          console.log(messages.step("Initialized git repository"));
        } catch (error) {
          result.warnings.push(
            `Git initialization failed: ${getErrorMessage(error)}`
          );
          console.log(
            messages.warning(
              `Git initialization failed: ${getErrorMessage(error)}`
            )
          );
        }
      }

      // Install dependencies
      if (context.install) {
        try {
          await this.installDependencies(context, result.projectPath);
          result.installedDependencies = true;
          console.log(messages.step("Dependencies installed successfully"));
        } catch (error) {
          result.warnings.push(
            `Dependency installation failed: ${getErrorMessage(error)}`
          );
          console.warn(
            `⚠️ Dependency installation failed: ${getErrorMessage(error)}`
          );
        }
      }

      // Run post-generation hooks
      await this.runPostGenerationHooks(template, context, result.projectPath);

      result.success = true;
      console.log(`✅ Project ${context.projectName} generated successfully!`);
    } catch (error) {
      result.errors.push(getErrorMessage(error));
      console.error(`❌ Project generation failed: ${getErrorMessage(error)}`);
    }

    return result;
  }

  private validateContext(
    context: TemplateContext,
    template: TemplateDefinition
  ): void {
    // Check required features
    for (const requiredFeature of template.requiredFeatures) {
      if (!context.features.includes(requiredFeature)) {
        throw new Error(
          `Template '${template.name}' requires feature '${requiredFeature}' but it was not selected`
        );
      }
    }

    // Check supported features
    for (const feature of context.features) {
      if (!template.supportedFeatures.includes(feature)) {
        throw new Error(
          `Template '${template.name}' does not support feature '${feature}'`
        );
      }
    }

    // Check supported databases
    if (!template.supportedDatabases.includes(context.database)) {
      throw new Error(
        `Template '${template.name}' does not support database '${context.database}'. ` +
          `Supported databases: ${template.supportedDatabases.join(", ")}`
      );
    }

    // Validate project name
    if (!/^[a-z0-9-_]+$/.test(context.projectName)) {
      throw new Error(
        "Project name must contain only lowercase letters, numbers, hyphens, and underscores"
      );
    }
  }

  private async createProjectDirectory(projectPath: string): Promise<void> {
    try {
      await access(projectPath);
      throw new Error(`Directory '${projectPath}' already exists`);
    } catch (error) {
      if (isErrorInstance(error, Error)) {
        throw error;
      }
    }

    await mkdir(projectPath, { recursive: true });
  }

  private async generateFiles(
    context: TemplateContext,
    template: TemplateDefinition,
    result: GenerationResult
  ): Promise<void> {
    // Expand file patterns (handle globs and directories)
    const expandedFiles = await this.processor.expandFilePatterns(
      template.files
    );

    // Filter files based on conditions
    const applicableFiles = expandedFiles.filter((file) => {
      if (file.condition) {
        return file.condition(context);
      }
      return true;
    });

    // Process each file
    for (const file of applicableFiles) {
      try {
        const { content, targetPath } = await this.processor.processFile(
          file,
          context
        );
        const fullTargetPath = join(result.projectPath, targetPath);

        // Ensure target directory exists
        await mkdir(dirname(fullTargetPath), { recursive: true });

        // Write file
        if (typeof content === "string") {
          await writeFile(fullTargetPath, content, "utf-8");
        } else {
          await writeFile(fullTargetPath, content);
        }

        // Set executable permissions for shell scripts
        if (targetPath.endsWith(".sh") || targetPath.includes("bin/")) {
          await chmod(fullTargetPath, 0o755);
        }

        result.generatedFiles.push(targetPath);
      } catch (error) {
        if (getErrorMessage(error) === "File condition not met") {
          continue; // Skip files that don't meet conditions
        }
        throw new Error(
          `Failed to process file '${file.sourcePath}': ${getErrorMessage(
            error
          )}`
        );
      }
    }
  }

  private async generatePackageFiles(
    context: TemplateContext,
    template: TemplateDefinition,
    result: GenerationResult
  ): Promise<void> {
    // Generate root package.json for workspace
    const rootPackageJson = this.dependencyResolver.generateRootPackageJson(
      context,
      template
    );
    const rootPackagePath = join(result.projectPath, "package.json");
    await writeFile(
      rootPackagePath,
      JSON.stringify(rootPackageJson, null, 2),
      "utf-8"
    );
    result.generatedFiles.push("package.json");

    // Generate frontend package.json if not API-only
    if (context.template !== "api-only") {
      const frontendPackageJson =
        this.dependencyResolver.generateFrontendPackageJson(context, template);
      const frontendPackagePath = join(
        result.projectPath,
        "apps/web/package.json"
      );
      await mkdir(dirname(frontendPackagePath), { recursive: true });
      await writeFile(
        frontendPackagePath,
        JSON.stringify(frontendPackageJson, null, 2),
        "utf-8"
      );
      result.generatedFiles.push("apps/web/package.json");
    }

    // Generate backend requirements.txt and pyproject.toml
    const requirements = this.dependencyResolver.generateRequirements(
      context,
      template
    );
    const requirementsPath = join(
      result.projectPath,
      "apps/api/requirements.txt"
    );
    await mkdir(dirname(requirementsPath), { recursive: true });
    await writeFile(requirementsPath, requirements, "utf-8");
    result.generatedFiles.push("apps/api/requirements.txt");

    const pyprojectToml = this.dependencyResolver.generatePyprojectToml(
      context,
      template
    );
    const pyprojectPath = join(result.projectPath, "apps/api/pyproject.toml");
    await writeFile(pyprojectPath, pyprojectToml, "utf-8");
    result.generatedFiles.push("apps/api/pyproject.toml");
  }

  private async installDependencies(
    context: TemplateContext,
    projectPath: string
  ): Promise<void> {
    console.log(messages.step("Installing dependencies..."));

    try {
      // Install Python dependencies
      console.log(messages.step("Installing Python dependencies..."));
      execSync("python -m pip install -r requirements.txt", {
        cwd: join(projectPath, "apps/api"),
        stdio: "pipe",
      });

      // Install Node.js dependencies if not API-only
      if (context.template !== "api-only") {
        console.log(messages.step("Installing Node.js dependencies..."));

        // Install root dependencies
        execSync("npm install", {
          cwd: projectPath,
          stdio: "pipe",
        });

        // Install frontend dependencies
        execSync("npm install", {
          cwd: join(projectPath, "apps/web"),
          stdio: "pipe",
        });
      }
    } catch (error) {
      throw new Error(
        `Dependency installation failed: ${getErrorMessage(error)}`
      );
    }
  }

  private async runPostGenerationHooks(
    template: TemplateDefinition,
    context: TemplateContext,
    projectPath: string
  ): Promise<void> {
    if (!template.postGeneration || template.postGeneration.length === 0) {
      return;
    }

    console.log(`🔧 Running post-generation hooks...`);

    for (const hook of template.postGeneration) {
      try {
        // Process hook command with template variables
        const processedHook = hook
          .replace("{{projectName}}", context.projectName)
          .replace("{{template}}", context.template);

        execSync(processedHook, {
          cwd: projectPath,
          stdio: "pipe",
        });

        console.log(`✅ Executed hook: ${hook}`);
      } catch (error) {
        console.warn(`⚠️ Hook failed: ${hook} - ${getErrorMessage(error)}`);
      }
    }
  }
}
