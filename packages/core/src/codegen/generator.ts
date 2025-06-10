// packages/core/src/codegen/generator.ts
// Re-export generators from type-sync package
export {
  TypeScriptGenerator,
  APIClientGenerator,
  ReactHookGenerator,
  AIHookGenerator,
} from "@farm/type-sync";

import type { FarmConfig } from "@farm/types";

// Legacy adapter for backward compatibility
export class CodeGenerator {
  constructor(
    private projectPath: string,
    private config: any
  ) {
    console.warn(
      "CodeGenerator is deprecated. Use TypeSyncOrchestrator from @farm/type-sync instead."
    );
  }

  async generate(): Promise<void> {
    console.warn("CodeGenerator.generate() is deprecated");
  }

  async startWatching(): Promise<void> {
    console.warn("CodeGenerator.startWatching() is deprecated");
  }

  async stopWatching(): Promise<void> {
    console.warn("CodeGenerator.stopWatching() is deprecated");
  }

  getProjectPath(): string {
    return this.projectPath;
  }

  getConfig(): FarmConfig {
    return this.config || ({} as FarmConfig);
  }

  async regenerateAll() {
    return {
      success: true,
      generatedFiles: [] as string[],
      errors: [] as string[],
    };
  }

  async regenerateIncremental(changes: { models: string[]; routes: string[] }) {
    return this.regenerateAll();
  }
}
