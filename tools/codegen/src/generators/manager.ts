// tools/codegen/src/generators/manager.ts
import {
  TypeScriptGenerator,
  TypeScriptGenerationOptions,
  GeneratedFile,
  TypeScriptGenerationResult,
} from "./typescript";
import { OpenAPISchema } from "../schema/extractor";
import { SchemaWatcher } from "../schema/watcher";
import { readFile, writeFile, mkdir, readdir, stat, unlink } from "fs/promises";
import { join, relative, dirname } from "path";
import { createHash } from "crypto";
import { EventEmitter } from "events";
import { getErrorMessage } from "@farm/cli";
import { get } from "lodash";

export interface GenerationMetadata {
  timestamp: number;
  schemaChecksum: string;
  filesGenerated: string[];
  version: string;
  options: TypeScriptGenerationOptions;
}

export interface IncrementalGenerationOptions
  extends TypeScriptGenerationOptions {
  metadataFile?: string;
  cleanOrphans?: boolean;
  watchForChanges?: boolean;
  onGenerated?: (result: TypeScriptGenerationResult) => void;
  onError?: (error: Error) => void;
}

export interface GenerationStats {
  totalGeneration: number;
  incrementalSkips: number;
  filesCreated: number;
  filesUpdated: number;
  filesDeleted: number;
  lastGeneration: Date | null;
  averageGenerationTime: number;
}

export class TypeGenerationManager extends EventEmitter {
  private options: Required<IncrementalGenerationOptions>;
  private watcher?: SchemaWatcher;
  private isGenerating = false;
  private stats: GenerationStats;
  private generationHistory: number[] = [];

  constructor(options: IncrementalGenerationOptions) {
    super();

    this.options = {
      metadataFile: ".farm/metadata/type-generation.json",
      cleanOrphans: true,
      watchForChanges: false,
      enumType: "union",
      dateType: "string",
      generateComments: true,
      generateValidation: false,
      fileNaming: "camelCase",
      baseUrl: "/api",
      onGenerated: () => {},
      onError: () => {},
      ...options,
    };

    this.stats = {
      totalGeneration: 0,
      incrementalSkips: 0,
      filesCreated: 0,
      filesUpdated: 0,
      filesDeleted: 0,
      lastGeneration: null,
      averageGenerationTime: 0,
    };
  }

  /**
   * Start type generation with optional schema watching
   */
  async start(schema?: OpenAPISchema): Promise<TypeScriptGenerationResult> {
    console.log("🔧 Starting TypeScript type generation...");

    try {
      // Generate types from provided schema or extract fresh schema
      const result = schema
        ? await this.generateFromSchema(schema)
        : await this.generateFromExtraction();

      // Setup watching if requested
      if (this.options.watchForChanges && !this.watcher) {
        await this.setupSchemaWatching();
      }

      this.options.onGenerated(result);
      this.emit("generation-complete", result);

      return result;
    } catch (error) {
      this.options.onError(error as Error);
      this.emit("generation-error", error);
      throw error;
    }
  }

  /**
   * Stop watching for changes
   */
  async stop(): Promise<void> {
    if (this.watcher) {
      await this.watcher.stop();
      this.watcher = undefined;
      console.log("🛑 Type generation watching stopped");
    }
  }

  /**
   * Force regeneration of all types
   */
  async forceRegeneration(): Promise<TypeScriptGenerationResult> {
    console.log("🔄 Forcing complete type regeneration...");

    // Clear metadata to force regeneration
    await this.clearMetadata();

    return this.generateFromExtraction();
  }

  /**
   * Generate types from provided schema
   */
  async generateFromSchema(
    schema: OpenAPISchema
  ): Promise<TypeScriptGenerationResult> {
    const startTime = Date.now();

    try {
      // Check if generation is needed
      const shouldGenerate = await this.shouldGenerateTypes(schema);

      if (!shouldGenerate) {
        this.stats.incrementalSkips++;
        console.log("📋 Types are up-to-date, skipping generation");

        return {
          files: await this.getExistingFiles(),
          stats: {
            interfaces: 0,
            enums: 0,
            types: 0,
            totalFiles: 0,
          },
        };
      }

      this.isGenerating = true;
      console.log("🏗️ Generating TypeScript types...");

      // Generate types
      const generator = new TypeScriptGenerator(schema, this.options);
      const result = await generator.generateTypes();

      // Update file tracking
      await this.updateFileTracking(result, schema);

      // Clean up orphaned files
      if (this.options.cleanOrphans) {
        await this.cleanOrphanedFiles(result.files);
      }

      // Update statistics
      this.updateStats(startTime, result);

      console.log(`✅ Generated ${result.stats.totalFiles} TypeScript files`);
      console.log(`   Interfaces: ${result.stats.interfaces}`);
      console.log(`   Enums: ${result.stats.enums}`);
      console.log(`   Types: ${result.stats.types}`);

      return result;
    } finally {
      this.isGenerating = false;
    }
  }

  /**
   * Generate types by extracting fresh schema
   */
  private async generateFromExtraction(): Promise<TypeScriptGenerationResult> {
    const { OpenAPISchemaExtractor } = await import("../schema/extractor");

    const extractor = new OpenAPISchemaExtractor({
      forceRefresh: true, // Always get fresh schema for generation
    });

    const schema = await extractor.extractSchema();
    return this.generateFromSchema(schema);
  }

  /**
   * Setup schema watching for automatic regeneration
   */
  private async setupSchemaWatching(): Promise<void> {
    console.log("👀 Setting up schema watching for auto-regeneration...");

    this.watcher = new SchemaWatcher({
      extractorOptions: {
        forceRefresh: true,
      },
      debounceMs: 1000,
      verbose: false,
    });

    // Handle schema changes
    this.watcher.on("schema-extracted", async (event) => {
      if (!this.isGenerating && event.schema) {
        console.log("🔄 Schema changed, regenerating types...");

        try {
          const result = await this.generateFromSchema(event.schema);
          this.emit("auto-generated", result);
        } catch (error) {
          console.error("❌ Auto-generation failed:", getErrorMessage(error));
          this.emit("auto-generation-error", error);
        }
      }
    });

    this.watcher.on("extraction-error", (event) => {
      console.error(
        "❌ Schema extraction failed during watching:",
        getErrorMessage(event.error)
      );
    });

    await this.watcher.start();
    console.log("✅ Schema watching started");
  }

  /**
   * Check if types need to be regenerated
   */
  private async shouldGenerateTypes(schema: OpenAPISchema): Promise<boolean> {
    try {
      const metadata = await this.loadMetadata();
      const currentChecksum = this.calculateSchemaChecksum(schema);

      // Check if schema changed
      if (metadata.schemaChecksum !== currentChecksum) {
        console.log("📋 Schema changed, regeneration needed");
        return true;
      }

      // Check if options changed
      const optionsChecksum = this.calculateOptionsChecksum();
      const storedOptionsChecksum = this.calculateOptionsChecksum(
        metadata.options
      );

      if (optionsChecksum !== storedOptionsChecksum) {
        console.log("⚙️ Generation options changed, regeneration needed");
        return true;
      }

      // Check if files are missing
      const missingFiles = await this.checkForMissingFiles(
        metadata.filesGenerated
      );
      if (missingFiles.length > 0) {
        console.log(
          `📁 ${missingFiles.length} files missing, regeneration needed`
        );
        return true;
      }

      return false;
    } catch (error) {
      // If we can't load metadata, assume regeneration is needed
      console.log("📋 No metadata found, regeneration needed");
      return true;
    }
  }

  /**
   * Update file tracking metadata
   */
  private async updateFileTracking(
    result: TypeScriptGenerationResult,
    schema: OpenAPISchema
  ): Promise<void> {
    const metadata: GenerationMetadata = {
      timestamp: Date.now(),
      schemaChecksum: this.calculateSchemaChecksum(schema),
      filesGenerated: result.files.map((f) => f.path),
      version: "1.0.0", // TODO: Get from package.json
      options: this.options,
    };

    await this.saveMetadata(metadata);
  }

  /**
   * Clean up orphaned files that are no longer generated
   */
  private async cleanOrphanedFiles(
    currentFiles: GeneratedFile[]
  ): Promise<void> {
    try {
      const metadata = await this.loadMetadata();
      const currentPaths = new Set(currentFiles.map((f) => f.path));
      const orphanedFiles = metadata.filesGenerated.filter(
        (path) => !currentPaths.has(path)
      );

      if (orphanedFiles.length > 0) {
        console.log(`🧹 Cleaning up ${orphanedFiles.length} orphaned files...`);

        for (const orphanPath of orphanedFiles) {
          try {
            const fullPath = join(this.options.outputDir, orphanPath);
            await unlink(fullPath);
            this.stats.filesDeleted++;
          } catch (error) {
            // File might already be deleted, ignore error
          }
        }
      }
    } catch (error) {
      // No metadata file, nothing to clean up
    }
  }

  /**
   * Get list of existing generated files
   */
  private async getExistingFiles(): Promise<GeneratedFile[]> {
    try {
      const metadata = await this.loadMetadata();
      const files: GeneratedFile[] = [];

      for (const filePath of metadata.filesGenerated) {
        try {
          const fullPath = join(this.options.outputDir, filePath);
          const content = await readFile(fullPath, "utf-8");

          files.push({
            path: filePath,
            content,
            type: this.inferFileType(filePath, content),
          });
        } catch (error) {
          // File doesn't exist, skip
        }
      }

      return files;
    } catch (error) {
      return [];
    }
  }

  /**
   * Check for missing files from metadata
   */
  private async checkForMissingFiles(
    expectedFiles: string[]
  ): Promise<string[]> {
    const missingFiles: string[] = [];

    for (const filePath of expectedFiles) {
      try {
        const fullPath = join(this.options.outputDir, filePath);
        await stat(fullPath);
      } catch (error) {
        missingFiles.push(filePath);
      }
    }

    return missingFiles;
  }

  /**
   * Load generation metadata
   */
  private async loadMetadata(): Promise<GenerationMetadata> {
    const content = await readFile(this.options.metadataFile, "utf-8");
    return JSON.parse(content);
  }

  /**
   * Save generation metadata
   */
  private async saveMetadata(metadata: GenerationMetadata): Promise<void> {
    const metadataDir = dirname(this.options.metadataFile);
    await mkdir(metadataDir, { recursive: true });
    await writeFile(
      this.options.metadataFile,
      JSON.stringify(metadata, null, 2)
    );
  }

  /**
   * Clear metadata to force regeneration
   */
  private async clearMetadata(): Promise<void> {
    try {
      await unlink(this.options.metadataFile);
    } catch (error) {
      // File doesn't exist, nothing to clear
    }
  }

  /**
   * Calculate checksum for schema
   */
  private calculateSchemaChecksum(schema: OpenAPISchema): string {
    // Create a stable representation of the schema for checksum
    const stableSchema = {
      openapi: schema.openapi,
      info: schema.info,
      paths: schema.paths,
      components: schema.components,
    };

    return createHash("md5")
      .update(JSON.stringify(stableSchema, Object.keys(stableSchema).sort()))
      .digest("hex");
  }

  /**
   * Calculate checksum for generation options
   */
  private calculateOptionsChecksum(
    options:
      | TypeScriptGenerationOptions
      | Required<IncrementalGenerationOptions> = this.options
  ): string {
    const relevantOptions = {
      enumType: options.enumType || "union",
      dateType: options.dateType || "string",
      generateComments: options.generateComments ?? true,
      generateValidation: options.generateValidation ?? false,
      fileNaming: options.fileNaming || "camelCase",
    };

    return createHash("md5")
      .update(
        JSON.stringify(relevantOptions, Object.keys(relevantOptions).sort())
      )
      .digest("hex");
  }

  /**
   * Update generation statistics
   */
  private updateStats(
    startTime: number,
    result: TypeScriptGenerationResult
  ): void {
    const generationTime = Date.now() - startTime;

    this.stats.totalGeneration++;
    this.stats.lastGeneration = new Date();
    this.stats.filesCreated += result.stats.totalFiles;

    // Track generation times for average calculation
    this.generationHistory.push(generationTime);
    if (this.generationHistory.length > 10) {
      this.generationHistory.shift(); // Keep only last 10 generations
    }

    this.stats.averageGenerationTime =
      this.generationHistory.reduce((sum, time) => sum + time, 0) /
      this.generationHistory.length;
  }

  /**
   * Infer file type from path and content
   */
  private inferFileType(
    filePath: string,
    content: string
  ): "interface" | "enum" | "type" | "api-client" {
    if (filePath.includes("api/")) return "api-client";
    if (content.includes("export interface")) return "interface";
    if (content.includes("export enum")) return "enum";
    return "type";
  }

  /**
   * Get generation statistics
   */
  getStats(): GenerationStats {
    return { ...this.stats };
  }

  /**
   * Get current options
   */
  getOptions(): IncrementalGenerationOptions {
    return { ...this.options };
  }

  /**
   * Update generation options
   */
  updateOptions(newOptions: Partial<IncrementalGenerationOptions>): void {
    this.options = { ...this.options, ...newOptions };
  }

  /**
   * Check if currently generating
   */
  isCurrentlyGenerating(): boolean {
    return this.isGenerating;
  }

  /**
   * Validate a specific generated file
   */
  async validateFile(filePath: string): Promise<{
    file: string;
    valid: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];

    try {
      // Check if file exists in the output directory
      const fullPath = join(this.options.outputDir, filePath);
      const { stat } = await import("fs/promises");

      try {
        await stat(fullPath);
      } catch (error) {
        errors.push(`File does not exist: ${filePath}`);
        return { file: filePath, valid: false, errors };
      }

      // Read and validate file content
      const { readFile } = await import("fs/promises");
      const content = await readFile(fullPath, "utf-8");

      // Basic TypeScript syntax validation
      if (!content.includes("export")) {
        errors.push("File does not contain any exports");
      }

      // Check for common TypeScript patterns
      const hasValidTypeScript =
        content.includes("interface") ||
        content.includes("type ") ||
        content.includes("enum ") ||
        content.includes("class ");

      if (!hasValidTypeScript) {
        errors.push("File does not contain valid TypeScript type definitions");
      }

      // Check if file is tracked in metadata
      try {
        const metadata = await this.loadMetadata();
        const relativePath = relative(this.options.outputDir, fullPath);

        if (
          !metadata.filesGenerated.includes(relativePath) &&
          !metadata.filesGenerated.includes(filePath)
        ) {
          errors.push("File is not tracked in generation metadata");
        }
      } catch (error) {
        // Metadata doesn't exist, that's okay for validation
      }

      return {
        file: filePath,
        valid: errors.length === 0,
        errors,
      };
    } catch (error) {
      errors.push(`Validation failed: ${getErrorMessage(error)}`);
      return { file: filePath, valid: false, errors };
    }
  }
}

// Helper class for batch operations
export class BatchTypeGenerator {
  private managers = new Map<string, TypeGenerationManager>();

  /**
   * Add a project for batch generation
   */
  addProject(
    name: string,
    options: IncrementalGenerationOptions
  ): TypeGenerationManager {
    const manager = new TypeGenerationManager(options);
    this.managers.set(name, manager);
    return manager;
  }

  /**
   * Generate types for all projects
   */
  async generateAll(): Promise<Map<string, TypeScriptGenerationResult>> {
    const results = new Map<string, TypeScriptGenerationResult>();

    for (const [name, manager] of this.managers) {
      try {
        console.log(`🏗️ Generating types for project: ${name}`);
        const result = await manager.start();
        results.set(name, result);
      } catch (error) {
        console.error(
          `❌ Failed to generate types for ${name}:`,
          getErrorMessage(error as Error)
        );
        throw error;
      }
    }

    return results;
  }

  /**
   * Stop all managers
   */
  async stopAll(): Promise<void> {
    const stopPromises = Array.from(this.managers.values()).map((m) =>
      m.stop()
    );
    await Promise.all(stopPromises);
    this.managers.clear();
  }

  /**
   * Get manager for project
   */
  getManager(name: string): TypeGenerationManager | undefined {
    return this.managers.get(name);
  }

  /**
   * Get all project names
   */
  getProjectNames(): string[] {
    return Array.from(this.managers.keys());
  }

  /**
   * Get combined statistics
   */
  getCombinedStats(): Record<string, GenerationStats> {
    const stats: Record<string, GenerationStats> = {};

    for (const [name, manager] of this.managers) {
      stats[name] = manager.getStats();
    }

    return stats;
  }
}
