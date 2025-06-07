// tools/codegen/src/generators/manager.ts
import { join } from "path";
import { writeFile, readFile, pathExists, ensureDir } from "fs-extra";
import { createHash } from "crypto";
import { TypeScriptGenerator, GenerationOptions } from "./typescript.js";
import { OpenAPISchemaExtractor } from "../schema/extractor.js";
import { SchemaWatcher } from "../schema/watcher.js";

export interface GenerationMetadata {
  schemaHash: string;
  lastGenerated: number;
  fileCount: number;
  files: string[];
}

export interface GenerationStats {
  totalFiles: number;
  interfaces: number;
  enums: number;
  types: number;
  skipped: boolean;
  duration: number;
}

export interface GenerationResult {
  success: boolean;
  stats: GenerationStats;
  errors: string[];
  warnings: string[];
}

export class TypeGenerationManager {
  private generator = new TypeScriptGenerator();
  private extractor = new OpenAPISchemaExtractor();
  private watcher?: SchemaWatcher;
  private outputDir: string;
  private metadataFile: string;

  constructor(outputDir: string) {
    this.outputDir = outputDir;
    this.metadataFile = join(outputDir, ".farm-metadata.json");
  }

  async generateFromSchema(
    schema: any,
    options: Partial<GenerationOptions> = {}
  ): Promise<GenerationResult> {
    const startTime = Date.now();

    try {
      // Check if regeneration is needed
      const metadata = await this.loadMetadata();
      const schemaHash = this.hashSchema(schema);

      if (metadata && metadata.schemaHash === schemaHash && !options.force) {
        console.log("📋 Types are up-to-date, skipping generation");
        return {
          success: true,
          stats: {
            totalFiles: metadata.fileCount,
            interfaces: 0,
            enums: 0,
            types: 0,
            skipped: true,
            duration: Date.now() - startTime,
          },
          errors: [],
          warnings: [],
        };
      }

      // Check for missing files
      const missingFiles = await this.checkMissingFiles(metadata);
      if (missingFiles.length > 0) {
        console.log(
          `📁 ${missingFiles.length} files missing, regeneration needed`
        );
      } else if (!metadata) {
        console.log("📋 No metadata found, regeneration needed");
      }

      console.log("🏗️ Generating TypeScript types...");

      const generationOptions: GenerationOptions = {
        outputDir: this.outputDir,
        generateApiClient: true,
        generateHooks: true,
        includeComments: true,
        ...options,
      };

      const result = await this.generator.generateFromSchema(
        schema,
        generationOptions
      );

      if (result.success) {
        // Count different types of files
        const stats = this.calculateStats(result.files, startTime);

        // Save metadata
        await this.saveMetadata({
          schemaHash,
          lastGenerated: Date.now(),
          fileCount: result.files.length,
          files: result.files.map((f) => f.path),
        });

        console.log(`✅ Generated ${stats.totalFiles} TypeScript files`);
        console.log(`   Interfaces: ${stats.interfaces}`);
        console.log(`   Enums: ${stats.enums}`);
        console.log(`   Types: ${stats.types}`);

        return {
          success: true,
          stats,
          errors: result.errors,
          warnings: result.warnings,
        };
      }

      return {
        success: false,
        stats: {
          totalFiles: 0,
          interfaces: 0,
          enums: 0,
          types: 0,
          skipped: false,
          duration: Date.now() - startTime,
        },
        errors: result.errors,
        warnings: result.warnings,
      };
    } catch (error) {
      return {
        success: false,
        stats: {
          totalFiles: 0,
          interfaces: 0,
          enums: 0,
          types: 0,
          skipped: false,
          duration: Date.now() - startTime,
        },
        errors: [this.getErrorMessage(error)],
        warnings: [],
      };
    }
  }

  async generateFromExtraction(
    options: Partial<GenerationOptions> = {}
  ): Promise<GenerationResult> {
    try {
      console.log("🔄 Forcing complete type regeneration...");
      const { schema } = await this.extractor.extractSchema({
        forceRefresh: true,
      });
      return this.generateFromSchema(schema, { ...options, force: true });
    } catch (error) {
      return {
        success: false,
        stats: {
          totalFiles: 0,
          interfaces: 0,
          enums: 0,
          types: 0,
          skipped: false,
          duration: 0,
        },
        errors: [this.getErrorMessage(error)],
        warnings: [],
      };
    }
  }

  async start(apiModule?: string): Promise<void> {
    console.log("🔧 Starting TypeScript type generation...");

    // Initial generation
    await this.generateFromExtraction();

    // Setup schema watching
    await this.setupSchemaWatching(apiModule);
  }

  async setupSchemaWatching(apiModule?: string): Promise<void> {
    console.log("👀 Setting up schema watching for auto-regeneration...");

    this.watcher = new SchemaWatcher();

    // Handle schema changes
    this.watcher.on("schema-extracted", async (event) => {
      console.log("🔄 Schema changed, regenerating types...");
      await this.generateFromSchema(event.schema);
    });

    // Handle extraction errors
    this.watcher.on("extraction-error", (event) => {
      console.error(
        "❌ Schema extraction failed during watching:",
        this.getErrorMessage(event.error)
      );
    });

    await this.watcher.start(apiModule);
  }

  async stop(): Promise<void> {
    if (this.watcher) {
      await this.watcher.stop();
      this.watcher = undefined;
    }
  }

  private async loadMetadata(): Promise<GenerationMetadata | null> {
    try {
      if (await pathExists(this.metadataFile)) {
        const content = await readFile(this.metadataFile, "utf-8");
        return JSON.parse(content);
      }
    } catch (error) {
      console.warn("⚠️ Failed to load metadata:", this.getErrorMessage(error));
    }
    return null;
  }

  private async saveMetadata(metadata: GenerationMetadata): Promise<void> {
    try {
      await ensureDir(this.outputDir);
      await writeFile(this.metadataFile, JSON.stringify(metadata, null, 2));
    } catch (error) {
      console.warn("⚠️ Failed to save metadata:", this.getErrorMessage(error));
    }
  }

  private async checkMissingFiles(
    metadata: GenerationMetadata | null
  ): Promise<string[]> {
    if (!metadata) return [];

    const missingFiles: string[] = [];
    for (const filePath of metadata.files) {
      if (!(await pathExists(filePath))) {
        missingFiles.push(filePath);
      }
    }

    return missingFiles;
  }

  private hashSchema(schema: any): string {
    return createHash("md5").update(JSON.stringify(schema)).digest("hex");
  }

  private calculateStats(files: any[], startTime: number): GenerationStats {
    let interfaces = 0;
    let enums = 0;
    let types = 0;

    for (const file of files) {
      if (file.content.includes("export interface")) {
        interfaces++;
      }
      if (file.content.includes("export enum")) {
        enums++;
      }
      if (file.content.includes("export type")) {
        types++;
      }
    }

    return {
      totalFiles: files.length,
      interfaces,
      enums,
      types,
      skipped: false,
      duration: Date.now() - startTime,
    };
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    if (typeof error === "string") {
      return error;
    }
    return String(error);
  }
}
