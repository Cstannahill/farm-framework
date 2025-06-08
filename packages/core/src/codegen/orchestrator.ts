import type { OpenAPISchema } from "./types/openapi";
import { OpenAPIExtractor } from "./extractors/openapi";
import { TypeScriptGenerator } from "./generators/typescript";
import { APIClientGenerator } from "./generators/api-client";
import { ReactHookGenerator } from "./generators/react-hooks";
import { AIHookGenerator } from "./generators/ai-hooks";

/**
 * Options controlling the behaviour of the {@link CodegenOrchestrator}.
 */
export interface CodegenOptions {
  apiUrl: string;
  outputDir: string;
  features: {
    client: boolean;
    hooks: boolean;
    streaming: boolean;
  };
}

/**
 * Result object returned from a code generation run.
 */
export interface CodegenResult {
  filesGenerated: number;
  artifacts?: string[];
}

interface Generator {
  generate: (schema: OpenAPISchema, opts: any) => Promise<{ path: string }>;
}

/**
 * Coordinates extraction of API schemas and generation of TypeScript artifacts
 * such as clients and hooks. Acts as the top-level entry point for the
 * code-generation pipeline.
 */
export class CodegenOrchestrator {
  private extractor = new OpenAPIExtractor();
  private generators = new Map<string, Generator>();
  private config: CodegenOptions | null = null;

  constructor() {
    this.initializeGenerators();
  }

  private initializeGenerators() {
    this.generators.set(
      "types",
      new TypeScriptGenerator() as unknown as Generator
    );
    this.generators.set(
      "client",
      new APIClientGenerator() as unknown as Generator
    );
    this.generators.set(
      "hooks",
      new ReactHookGenerator() as unknown as Generator
    );
    this.generators.set(
      "ai-hooks",
      new AIHookGenerator() as unknown as Generator
    );
  }

  /**
   * Configure the orchestrator prior to execution.
   *
   * @param config - Runtime options for code generation
   */
  async initialize(config: CodegenOptions) {
    this.config = config;
  }

  private isFeatureEnabled(genType: string): boolean {
    if (!this.config) return false;
    if (genType === "client") return this.config.features.client;
    if (genType === "hooks" || genType === "ai-hooks")
      return this.config.features.hooks;
    return true;
  }

  /**
   * Execute the full code generation pipeline.
   *
   * @returns Summary information about the generated artifacts
   */
  async run(): Promise<CodegenResult> {
    if (!this.config) throw new Error("Orchestrator not initialized");
    const schema = await this.extractor
      .extractFromFastAPI(".", `${this.config.outputDir}/openapi.json`)
      .then(() =>
        import("fs-extra").then((fs) => {
          if (!fs || typeof fs.readJson !== "function")
            throw new Error("fs-extra is not available");
          // TypeScript: config is always set here, but add fallback for safety
          const outputDir = this.config ? this.config.outputDir : "./";
          return fs.readJson(`${outputDir}/openapi.json`);
        })
      );

    const results = await this.generateArtifacts(schema);
    return {
      filesGenerated: results.length,
      artifacts: results.map((r) => r.path),
    };
  }

  private async generateArtifacts(schema: OpenAPISchema) {
    const results: { path: string }[] = [];
    const order = ["types", "client", "hooks", "ai-hooks"];
    for (const type of order) {
      const generator = this.generators.get(type);
      if (generator && this.isFeatureEnabled(type)) {
        const result = await generator.generate(schema, {
          outputDir: this.config!.outputDir,
        });
        results.push(result);
      }
    }
    return results;
  }
}
