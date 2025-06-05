import { promises as fs } from "fs";
import path from "path";
import { spawn } from "child_process";
import type {
  TemplateConfig,
  TemplateValidationResult,
  ValidationError,
} from "./types";

/**
 * Safely extracts an error message from an unknown error type
 */
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  if (error && typeof error === "object" && "message" in error) {
    return String(error.message);
  }
  return "An unknown error occurred";
}
export class TemplateValidator {
  private tempDir: string;

  constructor(tempDir = "/tmp/farm-template-validation") {
    this.tempDir = tempDir;
  }

  /**
   * Validate a template by generating a project and running basic checks
   */
  async validateTemplate(
    templateName: string,
    templateConfig: TemplateConfig
  ): Promise<TemplateValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];

    try {
      // 1. Validate template structure
      await this.validateTemplateStructure(templateName, errors);

      // 2. Generate test project
      const testProjectPath = await this.generateTestProject(
        templateName,
        templateConfig
      );

      // 3. Validate generated project structure
      await this.validateGeneratedProject(
        testProjectPath,
        templateConfig,
        errors
      );

      // 4. Check file syntax and validity
      await this.validateGeneratedFiles(
        testProjectPath,
        templateConfig,
        errors,
        warnings
      );

      // 5. Test basic functionality
      await this.testBasicFunctionality(
        testProjectPath,
        templateConfig,
        errors
      );

      // 6. Cleanup
      await this.cleanup(testProjectPath);

      return {
        templateName,
        isValid: errors.length === 0,
        errors,
        warnings,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      errors.push({
        type: "VALIDATION_ERROR",
        message: `Template validation failed: ${getErrorMessage(error)}`,
        file: templateName,
      });

      return {
        templateName,
        isValid: false,
        errors,
        warnings,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Validate template structure and required files
   */
  private async validateTemplateStructure(
    templateName: string,
    errors: ValidationError[]
  ): Promise<void> {
    const templatePath = path.join(process.cwd(), "templates", templateName);

    try {
      const stats = await fs.stat(templatePath);
      if (!stats.isDirectory()) {
        errors.push({
          type: "STRUCTURE_ERROR",
          message: `Template '${templateName}' is not a directory`,
          file: templatePath,
        });
        return;
      }
    } catch (error) {
      errors.push({
        type: "STRUCTURE_ERROR",
        message: `Template directory '${templateName}' does not exist`,
        file: templatePath,
      });
      return;
    }

    // Check for required files based on template type
    const requiredFiles = this.getRequiredFiles(templateName);

    for (const requiredFile of requiredFiles) {
      const filePath = path.join(templatePath, requiredFile);
      try {
        await fs.access(filePath);
      } catch (error) {
        errors.push({
          type: "MISSING_FILE",
          message: `Required file missing: ${requiredFile}`,
          file: filePath,
        });
      }
    }
  }

  /**
   * Generate a test project using the template
   */
  private async generateTestProject(
    templateName: string,
    config: TemplateConfig
  ): Promise<string> {
    const testProjectName = `test-${templateName}-${Date.now()}`;
    const testProjectPath = path.join(this.tempDir, testProjectName);

    // Ensure temp directory exists
    await fs.mkdir(this.tempDir, { recursive: true });

    // Use the FARM CLI to generate the project
    await this.runCommand(
      "farm",
      [
        "create",
        testProjectName,
        "--template",
        templateName,
        "--no-install",
        "--no-git",
        "--no-interactive",
      ],
      this.tempDir
    );

    return testProjectPath;
  }

  /**
   * Validate the generated project structure
   */
  private async validateGeneratedProject(
    projectPath: string,
    config: TemplateConfig,
    errors: ValidationError[]
  ): Promise<void> {
    const expectedStructure = this.getExpectedProjectStructure(config);

    for (const expectedPath of expectedStructure) {
      const fullPath = path.join(projectPath, expectedPath);
      try {
        await fs.access(fullPath);
      } catch (error) {
        errors.push({
          type: "MISSING_GENERATED_FILE",
          message: `Expected generated file missing: ${expectedPath}`,
          file: fullPath,
        });
      }
    }
  }

  /**
   * Validate syntax and content of generated files
   */
  private async validateGeneratedFiles(
    projectPath: string,
    config: TemplateConfig,
    errors: ValidationError[],
    warnings: string[]
  ): Promise<void> {
    // Check package.json files
    await this.validatePackageJson(projectPath, config, errors);

    // Check Python files
    if (config.features.includes("backend")) {
      await this.validatePythonFiles(projectPath, errors);
    }

    // Check TypeScript files
    if (config.template !== "api-only") {
      await this.validateTypeScriptFiles(projectPath, errors);
    }

    // Check configuration files
    await this.validateConfigFiles(projectPath, config, errors, warnings);
  }

  /**
   * Test basic functionality of generated project
   */
  private async testBasicFunctionality(
    projectPath: string,
    config: TemplateConfig,
    errors: ValidationError[]
  ): Promise<void> {
    // Test Python syntax
    if (config.features.includes("backend")) {
      try {
        await this.runCommand(
          "python",
          ["-m", "py_compile", "apps/api/src/main.py"],
          projectPath
        );
      } catch (error) {
        errors.push({
          type: "SYNTAX_ERROR",
          message: `Python syntax error in main.py: ${getErrorMessage(error)}`,
          file: "apps/api/src/main.py",
        });
      }
    }

    // Test TypeScript compilation
    if (config.template !== "api-only") {
      try {
        await this.runCommand(
          "npx",
          ["tsc", "--noEmit"],
          path.join(projectPath, "apps/web")
        );
      } catch (error) {
        errors.push({
          type: "COMPILATION_ERROR",
          message: `TypeScript compilation failed: ${getErrorMessage(error)}`,
          file: "apps/web",
        });
      }
    }
  }

  /**
   * Validate package.json files
   */
  private async validatePackageJson(
    projectPath: string,
    config: TemplateConfig,
    errors: ValidationError[]
  ): Promise<void> {
    const packageJsonPaths = [
      "package.json", // Root package.json
      ...(config.template !== "api-only" ? ["apps/web/package.json"] : []),
    ];

    for (const packagePath of packageJsonPaths) {
      const fullPath = path.join(projectPath, packagePath);
      try {
        const content = await fs.readFile(fullPath, "utf-8");
        const packageJson = JSON.parse(content);

        // Basic validation
        if (!packageJson.name) {
          errors.push({
            type: "INVALID_PACKAGE_JSON",
            message: "package.json missing name field",
            file: fullPath,
          });
        }

        if (!packageJson.version) {
          errors.push({
            type: "INVALID_PACKAGE_JSON",
            message: "package.json missing version field",
            file: fullPath,
          });
        }
      } catch (error) {
        errors.push({
          type: "INVALID_PACKAGE_JSON",
          message: `Invalid package.json: ${getErrorMessage(error)}`,
          file: fullPath,
        });
      }
    }
  }

  /**
   * Validate Python files for syntax errors
   */
  private async validatePythonFiles(
    projectPath: string,
    errors: ValidationError[]
  ): Promise<void> {
    const pythonFiles = await this.findFiles(
      path.join(projectPath, "apps/api"),
      /\.py$/
    );

    for (const file of pythonFiles) {
      try {
        await this.runCommand(
          "python",
          ["-m", "py_compile", file],
          projectPath
        );
      } catch (error) {
        errors.push({
          type: "SYNTAX_ERROR",
          message: `Python syntax error: ${getErrorMessage(error)}`,
          file: file,
        });
      }
    }
  }

  /**
   * Validate TypeScript files
   */
  private async validateTypeScriptFiles(
    projectPath: string,
    errors: ValidationError[]
  ): Promise<void> {
    const webPath = path.join(projectPath, "apps/web");

    try {
      // Check if there's a tsconfig.json
      await fs.access(path.join(webPath, "tsconfig.json"));

      // Try to compile TypeScript
      await this.runCommand("npx", ["tsc", "--noEmit"], webPath);
    } catch (error) {
      errors.push({
        type: "TYPESCRIPT_ERROR",
        message: `TypeScript validation failed: ${getErrorMessage(error)}`,
        file: "apps/web",
      });
    }
  }

  /**
   * Validate configuration files
   */
  private async validateConfigFiles(
    projectPath: string,
    config: TemplateConfig,
    errors: ValidationError[],
    warnings: string[]
  ): Promise<void> {
    // Check farm.config.ts
    const farmConfigPath = path.join(projectPath, "farm.config.ts");
    try {
      const content = await fs.readFile(farmConfigPath, "utf-8");

      // Basic validation - should contain defineConfig
      if (!content.includes("defineConfig")) {
        errors.push({
          type: "INVALID_CONFIG",
          message: "farm.config.ts does not use defineConfig",
          file: farmConfigPath,
        });
      }

      // Check for required configuration sections
      const requiredSections = ["name", "template", "database"];
      for (const section of requiredSections) {
        if (!content.includes(section)) {
          warnings.push(`farm.config.ts missing ${section} configuration`);
        }
      }
    } catch (error) {
      errors.push({
        type: "MISSING_CONFIG",
        message: `farm.config.ts validation failed: ${getErrorMessage(error)}`,
        file: farmConfigPath,
      });
    }
  }

  /**
   * Get required files for a template
   */
  private getRequiredFiles(templateName: string): string[] {
    const baseFiles = [
      "farm.config.ts.hbs",
      "README.md.hbs",
      "docker-compose.yml.hbs",
    ];

    switch (templateName) {
      case "basic":
        return [
          ...baseFiles,
          "apps/web/src/App.tsx",
          "apps/web/package.json.hbs",
          "apps/api/src/main.py.hbs",
          "apps/api/requirements.txt.hbs",
        ];

      case "api-only":
        return [...baseFiles, "src/main.py.hbs", "requirements.txt.hbs"];

      case "ai-chat":
        return [
          ...baseFiles,
          "apps/web/src/components/chat/ChatWindow.tsx",
          "apps/api/src/ai/router.py.hbs",
          "apps/api/src/ai/providers/manager.py.hbs",
        ];

      default:
        return baseFiles;
    }
  }

  /**
   * Get expected project structure after generation
   */
  private getExpectedProjectStructure(config: TemplateConfig): string[] {
    const baseStructure = [
      "package.json",
      "farm.config.ts",
      "README.md",
      "docker-compose.yml",
    ];

    if (config.template !== "api-only") {
      baseStructure.push(
        "apps/web/package.json",
        "apps/web/src/App.tsx",
        "apps/web/src/main.tsx"
      );
    }

    if (config.features.includes("backend") || config.template === "api-only") {
      const apiPath = config.template === "api-only" ? "src" : "apps/api/src";
      baseStructure.push(
        `${apiPath}/main.py`,
        `${apiPath}/routes/health.py`,
        `${apiPath}/models`,
        `${apiPath}/database`
      );
    }

    return baseStructure;
  }

  /**
   * Run a command and return stdout
   */
  private async runCommand(
    command: string,
    args: string[],
    cwd: string
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, {
        cwd,
        stdio: ["pipe", "pipe", "pipe"],
        shell: true,
      });

      let stdout = "";
      let stderr = "";

      child.stdout?.on("data", (data) => {
        stdout += data.toString();
      });

      child.stderr?.on("data", (data) => {
        stderr += data.toString();
      });

      child.on("close", (code) => {
        if (code === 0) {
          resolve(stdout);
        } else {
          reject(new Error(`Command failed with code ${code}: ${stderr}`));
        }
      });

      child.on("error", (error) => {
        reject(error);
      });
    });
  }

  /**
   * Find files matching a pattern
   */
  private async findFiles(
    directory: string,
    pattern: RegExp
  ): Promise<string[]> {
    const files: string[] = [];

    const findFilesRecursive = async (dir: string): Promise<void> => {
      try {
        const items = await fs.readdir(dir);

        for (const item of items) {
          const fullPath = path.join(dir, item);
          const stats = await fs.stat(fullPath);

          if (stats.isDirectory()) {
            await findFilesRecursive(fullPath);
          } else if (pattern.test(item)) {
            files.push(fullPath);
          }
        }
      } catch (error) {
        // Ignore permission errors, etc.
      }
    };

    await findFilesRecursive(directory);
    return files;
  }

  /**
   * Clean up temporary files
   */
  private async cleanup(projectPath: string): Promise<void> {
    try {
      await fs.rm(projectPath, { recursive: true, force: true });
    } catch (error) {
      console.warn(
        `Failed to cleanup ${projectPath}: ${getErrorMessage(error)}`
      );
    }
  }
}

/**
 * Validate all templates
 */
export async function validateAllTemplates(): Promise<
  TemplateValidationResult[]
> {
  const validator = new TemplateValidator();
  const templates = ["basic", "api-only", "ai-chat"];
  const results: TemplateValidationResult[] = [];

  for (const templateName of templates) {
    const config: TemplateConfig = {
      template: templateName as any,
      features: templateName.includes("ai") ? ["ai", "backend"] : ["backend"],
      database: { type: "mongodb" },
    };

    console.log(`🔍 Validating template: ${templateName}`);
    const result = await validator.validateTemplate(templateName, config);
    results.push(result);

    if (result.isValid) {
      console.log(`✅ Template '${templateName}' is valid`);
    } else {
      console.log(`❌ Template '${templateName}' has errors:`);
      result.errors.forEach((error) => {
        console.log(`   - ${error.type}: ${error.message}`);
      });
    }

    if (result.warnings.length > 0) {
      console.log(`⚠️ Template '${templateName}' has warnings:`);
      result.warnings.forEach((warning) => {
        console.log(`   - ${warning}`);
      });
    }
  }

  return results;
}

// Export CLI function for package.json scripts
if (require.main === module) {
  validateAllTemplates()
    .then((results) => {
      const failedTemplates = results.filter((r) => !r.isValid);
      if (failedTemplates.length > 0) {
        console.log(
          `\n❌ ${failedTemplates.length} templates failed validation`
        );
        process.exit(1);
      } else {
        console.log(`\n✅ All templates passed validation`);
        process.exit(0);
      }
    })
    .catch((error) => {
      console.error("Template validation failed:", error);
      process.exit(1);
    });
}
