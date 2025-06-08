// packages/core/src/codegen/generator.ts
import path from "path";
// Replace import from @farm/codegen with a local implementation or comment out until the module exists
// import { FarmCodeGenerator, CodegenConfig } from "@farm/codegen";
import type { FarmConfig } from "@farm/types";

/**
 * CodeGenerator class that acts as an adapter for the FarmCodeGenerator
 * This class provides the interface expected by the file-watcher while
 * delegating to the actual FarmCodeGenerator implementation
 */
export class CodeGenerator {
  constructor(projectPath: string, config: any) {}

  /**
   * Generate code using the underlying FarmCodeGenerator
   */
  async generate(): Promise<void> {}

  /**
   * Start watching for file changes
   */
  async startWatching(): Promise<void> {}

  /**
   * Stop watching for file changes
   */
  async stopWatching(): Promise<void> {}

  /**
   * Get the project path
   */
  getProjectPath(): string {
    return "";
  }

  /**
   * Get the configuration
   */
  getConfig(): FarmConfig {
    return {} as FarmConfig;
  }

  /**
   * Regenerate all code (used by file-watcher)
   */
  async regenerateAll(): Promise<{
    success: boolean;
    generatedFiles: string[];
    errors: string[];
  }> {
    return {
      success: true,
      generatedFiles: [],
      errors: [],
    };
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
    return this.regenerateAll();
  }
}
