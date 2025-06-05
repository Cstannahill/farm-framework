// packages/core/src/codegen/generator.ts
import path from "path";
import { FarmCodeGenerator, CodegenConfig } from "@farm/codegen";
import type { FarmConfig } from "@farm/types";

/**
 * CodeGenerator class that acts as an adapter for the FarmCodeGenerator
 * This class provides the interface expected by the file-watcher while
 * delegating to the actual FarmCodeGenerator implementation
 */
export class CodeGenerator {
  private farmCodeGenerator: FarmCodeGenerator;
  private projectPath: string;
  private config: FarmConfig;

  constructor(projectPath: string, config: FarmConfig) {
    this.projectPath = projectPath;
    this.config = config;

    // Convert FarmConfig to CodegenConfig format
    const codegenConfig: Partial<CodegenConfig> = {
      apiPath: path.resolve(projectPath, "apps/api/src/main.py"),
      outputDir: path.resolve(projectPath, "apps/web/src"),
      typesDir: path.resolve(projectPath, "apps/web/src/types"),
      servicesDir: path.resolve(projectPath, "apps/web/src/services"),
      schemaFile: path.resolve(projectPath, ".farm/openapi-schema.json"),
      watch: false,
      verbose: false, // Default to false since FarmConfig doesn't have verbose
    };

    this.farmCodeGenerator = new FarmCodeGenerator(codegenConfig);
  }

  /**
   * Generate code using the underlying FarmCodeGenerator
   */
  async generate(): Promise<void> {
    return this.farmCodeGenerator.generate();
  }

  /**
   * Start watching for file changes
   */
  async startWatching(): Promise<void> {
    return this.farmCodeGenerator.startWatching();
  }

  /**
   * Stop watching for file changes
   */
  async stopWatching(): Promise<void> {
    return this.farmCodeGenerator.stopWatching();
  }

  /**
   * Get the project path
   */
  getProjectPath(): string {
    return this.projectPath;
  }

  /**
   * Get the configuration
   */
  getConfig(): FarmConfig {
    return this.config;
  }

  /**
   * Regenerate all code (used by file-watcher)
   */
  async regenerateAll(): Promise<{
    success: boolean;
    generatedFiles: string[];
    errors: string[];
  }> {
    try {
      await this.farmCodeGenerator.generate();
      return {
        success: true,
        generatedFiles: [
          path.resolve(this.projectPath, "apps/web/src/types"),
          path.resolve(this.projectPath, "apps/web/src/services"),
        ],
        errors: [],
      };
    } catch (error) {
      return {
        success: false,
        generatedFiles: [],
        errors: [error instanceof Error ? error.message : String(error)],
      };
    }
  }

  /**
   * Regenerate code incrementally (used by file-watcher)
   */
  async regenerateIncremental(changes: {
    models: string[];
    routes: string[];
  }): Promise<{
    success: boolean;
    generatedFiles: string[];
    errors: string[];
  }> {
    // For now, delegate to full regeneration
    // TODO: Implement actual incremental regeneration logic
    return this.regenerateAll();
  }
}
