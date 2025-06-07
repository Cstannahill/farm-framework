// tools/codegen/src/schema/watcher.ts
import chokidar, { FSWatcher } from "chokidar";
import { EventEmitter } from "events";
import { debounce } from "lodash";
import { join, relative } from "path";
import { OpenAPISchemaExtractor, OpenAPISchema } from "./extractor";

export interface SchemaChangeEvent {
  type: "changed" | "added" | "removed";
  file: string;
  schema?: OpenAPISchema;
  error?: Error;
  timestamp: number;
}

export interface SchemaWatcherOptions {
  projectRoot?: string;
  extractorOptions?: any;
  debounceMs?: number;
  ignorePatterns?: string[];
  verbose?: boolean;
}

export class SchemaWatcher extends EventEmitter {
  private watcher?: FSWatcher;
  private extractor: OpenAPISchemaExtractor;
  private options: Required<SchemaWatcherOptions>;
  private isExtracting = false;
  private lastSchema?: OpenAPISchema;

  // Debounced extraction function
  private debouncedExtract: () => Promise<void>;

  constructor(options: SchemaWatcherOptions = {}) {
    super();

    const defaultOptions: Required<SchemaWatcherOptions> = {
      projectRoot: process.cwd(),
      extractorOptions: {},
      debounceMs: 1000, // Wait 1 second after last change
      ignorePatterns: [
        "node_modules/**",
        ".git/**",
        "**/*.pyc",
        "**/__pycache__/**",
        "**/.*",
        "**/*.log",
      ],
      verbose: false,
    };

    this.options = { ...defaultOptions, ...options };

    this.extractor = new OpenAPISchemaExtractor({
      forceRefresh: true, // Always refresh when watching
      ...this.options.extractorOptions,
    });

    // Create debounced extraction function
    this.debouncedExtract = debounce(async () => {
      try {
        await this.performExtraction();
      } catch (error) {
        // Fix remaining `unknown` type issue for `error`
        if (error instanceof Error) {
          this.log(`❌ Schema extraction failed: ${error.message}`);

          this.emit("extraction-error", {
            type: "changed",
            file: "api",
            error,
            timestamp: Date.now(),
          } as SchemaChangeEvent);
        } else {
          this.log("❌ Schema extraction failed: Unknown error");
        }
      }
    }, this.options.debounceMs) as () => Promise<void>;
  }

  /**
   * Start watching for schema changes
   */
  async start(): Promise<void> {
    if (this.watcher) {
      throw new Error("Schema watcher is already running");
    }

    this.log("🔍 Starting schema watcher...");

    // Define watch patterns for Python files that could affect the API
    const watchPatterns = [
      "apps/api/src/**/*.py",
      "apps/api/src/**/*.pyi",
      "apps/api/pyproject.toml",
      "apps/api/requirements.txt",
      "farm.config.ts",
      "farm.config.js",
    ].map((pattern) => join(this.options.projectRoot, pattern));

    this.watcher = chokidar.watch(watchPatterns, {
      ignored: this.options.ignorePatterns,
      ignoreInitial: true,
      persistent: true,
      followSymlinks: false,
      usePolling: false, // Use native FS events when possible
      awaitWriteFinish: {
        stabilityThreshold: 100,
        pollInterval: 50,
      },
    });

    // Setup event handlers
    this.setupEventHandlers();

    // Perform initial extraction
    await this.performInitialExtraction();

    this.log("✅ Schema watcher started successfully");
  }

  /**
   * Stop watching for changes
   */
  async stop(): Promise<void> {
    if (this.watcher) {
      await this.watcher.close();
      this.watcher = undefined;
      this.log("🛑 Schema watcher stopped");
    }
  }

  /**
   * Get the last extracted schema
   */
  getLastSchema(): OpenAPISchema | undefined {
    return this.lastSchema;
  }

  /**
   * Force schema extraction
   */
  async forceExtraction(): Promise<OpenAPISchema> {
    this.log("🔄 Forcing schema extraction...");
    return this.performExtraction();
  }

  /**
   * Setup file watcher event handlers
   */
  private setupEventHandlers(): void {
    if (!this.watcher) return;

    this.watcher.on("change", (path) => {
      this.handleFileChange("changed", path);
    });

    this.watcher.on("add", (path) => {
      this.handleFileChange("added", path);
    });

    this.watcher.on("unlink", (path) => {
      this.handleFileChange("removed", path);
    });

    this.watcher.on("error", (error) => {
      this.emit("error", {
        type: "changed",
        file: "unknown",
        error,
        timestamp: Date.now(),
      } as SchemaChangeEvent);
    });
  }

  /**
   * Handle file system changes
   */
  private handleFileChange(
    type: "changed" | "added" | "removed",
    filePath: string
  ): void {
    const relativePath = relative(this.options.projectRoot, filePath);
    this.log(`📝 File ${type}: ${relativePath}`);

    // Check if this is a significant change that should trigger extraction
    if (this.shouldTriggerExtraction(filePath)) {
      this.log("🔄 Change detected, scheduling schema extraction...");
      this.debouncedExtract();
    }
  }

  /**
   * Determine if a file change should trigger schema extraction
   */
  private shouldTriggerExtraction(filePath: string): boolean {
    // Always trigger for main API files
    if (filePath.includes("main.py") || filePath.includes("app.py")) {
      return true;
    }

    // Trigger for route files
    if (filePath.includes("/routes/") && filePath.endsWith(".py")) {
      return true;
    }

    // Trigger for model files
    if (filePath.includes("/models/") && filePath.endsWith(".py")) {
      return true;
    }

    // Trigger for schema files
    if (filePath.includes("/schemas/") && filePath.endsWith(".py")) {
      return true;
    }

    // Trigger for dependency files
    if (
      filePath.includes("requirements.txt") ||
      filePath.includes("pyproject.toml")
    ) {
      return true;
    }

    // Trigger for config files
    if (filePath.includes("farm.config")) {
      return true;
    }

    return false;
  }

  /**
   * Perform initial schema extraction
   */
  private async performInitialExtraction(): Promise<void> {
    try {
      this.log("📋 Performing initial schema extraction...");
      const schema = await this.extractor.extractSchema();
      this.lastSchema = schema;

      this.emit("schema-extracted", {
        type: "changed",
        file: "initial",
        schema,
        timestamp: Date.now(),
      } as SchemaChangeEvent);
    } catch (error) {
      this.emit("extraction-error", {
        type: "changed",
        file: "initial",
        error: error instanceof Error ? error : new Error(String(error)),
        timestamp: Date.now(),
      } as SchemaChangeEvent);
    }
  }

  /**
   * Perform schema extraction
   */
  private async performExtraction(): Promise<OpenAPISchema> {
    if (this.isExtracting) {
      this.log("⏳ Extraction already in progress, skipping...");
      return this.lastSchema!;
    }

    this.isExtracting = true;

    try {
      this.log("🔄 Extracting OpenAPI schema...");

      const startTime = Date.now();
      const schema = await this.extractor.extractSchema();
      const duration = Date.now() - startTime;

      // Check if schema actually changed
      const schemaChanged = this.hasSchemaChanged(schema);

      if (schemaChanged) {
        this.lastSchema = schema;
        this.log(`✅ Schema extracted successfully (${duration}ms)`);

        this.emit("schema-extracted", {
          type: "changed",
          file: "api",
          schema,
          timestamp: Date.now(),
        } as SchemaChangeEvent);
      } else {
        this.log(`📋 Schema unchanged (${duration}ms)`);

        this.emit("schema-unchanged", {
          type: "changed",
          file: "api",
          schema,
          timestamp: Date.now(),
        } as SchemaChangeEvent);
      }

      return schema;
    } catch (error) {
      // Fix remaining `unknown` type issue for `error`
      if (error instanceof Error) {
        this.log(`❌ Schema extraction failed: ${error.message}`);

        this.emit("extraction-error", {
          type: "changed",
          file: "api",
          error,
          timestamp: Date.now(),
        } as SchemaChangeEvent);
      } else {
        this.log("❌ Schema extraction failed: Unknown error");
      }
      throw error;
    } finally {
      this.isExtracting = false;
    }
  }

  /**
   * Check if schema has actually changed
   */
  private hasSchemaChanged(newSchema: OpenAPISchema): boolean {
    if (!this.lastSchema) return true;

    // Quick check - compare stringified schemas
    const oldStr = JSON.stringify(this.lastSchema);
    const newStr = JSON.stringify(newSchema);

    return oldStr !== newStr;
  }

  /**
   * Log message if verbose mode enabled
   */
  private log(message: string): void {
    if (this.options.verbose) {
      console.log(`[SchemaWatcher] ${message}`);
    }
  }

  /**
   * Get watcher statistics
   */
  getStats(): {
    isWatching: boolean;
    isExtracting: boolean;
    filesWatched: number;
  } {
    return {
      isWatching: !!this.watcher,
      isExtracting: this.isExtracting,
      filesWatched: this.watcher
        ? Object.keys(this.watcher.getWatched()).length
        : 0,
    };
  }
}

// Helper class for managing multiple schema watchers
export class SchemaWatcherManager {
  private watchers = new Map<string, SchemaWatcher>();

  /**
   * Create and start a schema watcher for a project
   */
  async createWatcher(
    projectName: string,
    options: SchemaWatcherOptions
  ): Promise<SchemaWatcher> {
    if (this.watchers.has(projectName)) {
      throw new Error(`Watcher for project '${projectName}' already exists`);
    }

    const watcher = new SchemaWatcher(options);
    this.watchers.set(projectName, watcher);

    // Forward events
    watcher.on("schema-extracted", (event) => {
      console.log(
        `🔄 [${projectName}] Schema extracted: ${
          Object.keys(event.schema?.paths || {}).length
        } paths`
      );
    });

    watcher.on("extraction-error", (event) => {
      console.error(
        `❌ [${projectName}] Schema extraction failed: ${event.error?.message}`
      );
    });

    await watcher.start();
    return watcher;
  }

  /**
   * Get watcher for a project
   */
  getWatcher(projectName: string): SchemaWatcher | undefined {
    return this.watchers.get(projectName);
  }

  /**
   * Stop and remove a watcher
   */
  async removeWatcher(projectName: string): Promise<void> {
    const watcher = this.watchers.get(projectName);
    if (watcher) {
      await watcher.stop();
      this.watchers.delete(projectName);
      console.log(`✅ Watcher for project '${projectName}' removed`);
    } else {
      console.warn(`⚠️ Watcher for project '${projectName}' not found`);
    }
  }

  /**
   * Stop all watchers
   */
  async stopAll(): Promise<void> {
    for (const [projectName, watcher] of this.watchers.entries()) {
      await watcher.stop();
      this.watchers.delete(projectName);
      console.log(`🛑 Watcher for project '${projectName}' stopped`);
    }
  }
}
