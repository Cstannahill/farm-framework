// packages/core/src/watcher/file-watcher.ts
import { EventEmitter } from "events";
import { promises as fs } from "fs";
import path from "path";
import { CodeGenerator } from "../codegen/generator";
import { debounce } from "lodash";
import type { FarmConfig } from "@farm-framework/types";
import chokidar from "chokidar";

export interface FileChangeEvent {
  type: "change" | "add" | "unlink";
  path: string;
  timestamp: number;
  affectedSystems: string[];
}

export interface RegenerationResult {
  success: boolean;
  changedFiles: string[];
  errors: string[];
  duration: number;
}

export class FarmFileWatcher extends EventEmitter {
  private watchers = new Map<string, chokidar.FSWatcher>();
  private codeGenerator: CodeGenerator;
  private config: FarmConfig;
  private isRegenerating = false;
  private regenerationQueue: string[] = [];

  // Debounced regeneration to handle rapid file changes
  private debouncedRegenerate = debounce(
    this.performRegeneration.bind(this),
    300
  );

  constructor(config: FarmConfig, projectPath: string) {
    super();
    this.config = config;
    this.codeGenerator = new CodeGenerator(projectPath, config);
  }

  /**
   * Start watching all relevant files for changes
   */
  async startWatching(): Promise<void> {
    console.log("🔍 Starting file watchers...");

    // Setup Python file watcher (models, routes)
    await this.setupPythonWatcher();

    // Setup configuration file watcher
    await this.setupConfigWatcher();

    // Setup AI/ML model file watcher
    if (this.config.features?.includes("ai")) {
      await this.setupAIModelWatcher();
    }

    console.log("✅ File watchers started successfully");
  }

  /**
   * Setup watcher for Python model and route files
   */
  private async setupPythonWatcher(): Promise<void> {
    const pythonWatcher = chokidar.watch(
      [
        "apps/api/src/models/**/*.py",
        "apps/api/src/routes/**/*.py",
        "apps/api/src/schemas/**/*.py",
      ],
      {
        ignoreInitial: true,
        persistent: true,
        followSymlinks: false,
        ignored: [
          "**/.*", // Hidden files
          "**/__pycache__/**", // Python cache
          "**/test_*.py", // Test files
          "**/*_test.py", // Test files
        ],
      }
    );

    pythonWatcher.on("change", (filePath: string) => {
      this.handlePythonFileChange("change", filePath);
    });

    pythonWatcher.on("add", (filePath: string) => {
      this.handlePythonFileChange("add", filePath);
    });

    pythonWatcher.on("unlink", (filePath: string) => {
      this.handlePythonFileChange("unlink", filePath);
    });

    pythonWatcher.on("error", (error: Error) => {
      console.error("❌ Python file watcher error:", error);
      this.emit("watcher-error", { type: "python", error });
    });

    this.watchers.set("python", pythonWatcher);
    console.log("📁 Python file watcher configured");
  }

  /**
   * Setup watcher for configuration files
   */
  private async setupConfigWatcher(): Promise<void> {
    const configWatcher = chokidar.watch(
      [
        "farm.config.ts",
        "farm.config.js",
        "farm.config.*.ts",
        "farm.config.*.js",
      ],
      {
        ignoreInitial: true,
      }
    );

    configWatcher.on("change", (filePath: string) => {
      this.handleConfigFileChange("change", filePath);
    });

    configWatcher.on("add", (filePath: string) => {
      this.handleConfigFileChange("add", filePath);
    });

    configWatcher.on("unlink", (filePath: string) => {
      this.handleConfigFileChange("unlink", filePath);
    });

    this.watchers.set("config", configWatcher);
    console.log("⚙️ Configuration file watcher configured");
  }

  /**
   * Setup watcher for AI/ML model files and configurations
   */
  private async setupAIModelWatcher(): Promise<void> {
    const aiWatcher = chokidar.watch(
      [
        "apps/api/src/ai/**/*.py",
        "apps/api/models/**/*",
        "apps/api/src/ml/**/*.py",
      ],
      {
        ignoreInitial: true,
        ignored: ["**/.*", "**/__pycache__/**"],
      }
    );

    aiWatcher.on("change", (filePath: string) => {
      this.handleAIFileChange("change", filePath);
    });

    aiWatcher.on("add", (filePath: string) => {
      this.handleAIFileChange("add", filePath);
    });

    aiWatcher.on("unlink", (filePath: string) => {
      this.handleAIFileChange("unlink", filePath);
    });

    this.watchers.set("ai", aiWatcher);
    console.log("🤖 AI/ML file watcher configured");
  }

  /**
   * Handle Python file changes that affect API definitions
   */
  private handlePythonFileChange(
    type: "change" | "add" | "unlink",
    filePath: string
  ): void {
    const relativePath = path.relative(process.cwd(), filePath);
    console.log(`🔄 Python file ${type}: ${relativePath}`);

    const changeEvent: FileChangeEvent = {
      type,
      path: relativePath,
      timestamp: Date.now(),
      affectedSystems: this.determineAffectedSystems(filePath),
    };

    this.emit("python-file-changed", changeEvent);

    // Determine if this change affects API generation
    if (this.shouldTriggerRegeneration(filePath)) {
      this.queueRegeneration(filePath);
    }
  }

  /**
   * Handle configuration file changes
   */
  private handleConfigFileChange(
    type: "change" | "add" | "unlink",
    filePath: string
  ): void {
    const relativePath = path.relative(process.cwd(), filePath);
    console.log(`⚙️ Config file ${type}: ${relativePath}`);

    this.emit("config-changed", {
      type,
      path: relativePath,
      timestamp: Date.now(),
      affectedSystems: ["config", "ai", "database", "development"],
    });

    // Configuration changes might affect AI providers or database settings
    // Trigger a full regeneration to be safe
    this.queueRegeneration(filePath, true);
  }

  /**
   * Handle AI/ML file changes
   */
  private handleAIFileChange(
    type: "change" | "add" | "unlink",
    filePath: string
  ): void {
    const relativePath = path.relative(process.cwd(), filePath);
    console.log(`🤖 AI file ${type}: ${relativePath}`);

    this.emit("ai-file-changed", {
      type,
      path: relativePath,
      timestamp: Date.now(),
      affectedSystems: ["ai", "api"],
    });

    // AI file changes might affect API endpoints
    if (filePath.includes("/ai/") && filePath.endsWith(".py")) {
      this.queueRegeneration(filePath);
    }
  }

  /**
   * Determine which systems are affected by a file change
   */
  private determineAffectedSystems(filePath: string): string[] {
    const systems: string[] = [];

    if (filePath.includes("/models/")) {
      systems.push("types", "api", "database");
    }

    if (filePath.includes("/routes/")) {
      systems.push("api", "types", "frontend");
    }

    if (filePath.includes("/schemas/")) {
      systems.push("types", "validation");
    }

    if (filePath.includes("/ai/")) {
      systems.push("ai", "api", "types");
    }

    return systems;
  }

  /**
   * Check if a file change should trigger type regeneration
   */
  private shouldTriggerRegeneration(filePath: string): boolean {
    // Only regenerate for files that affect API definitions
    const triggers = ["/models/", "/routes/", "/schemas/", "/ai/", "main.py"];

    return triggers.some((trigger) => filePath.includes(trigger));
  }

  /**
   * Queue a regeneration (debounced to handle multiple rapid changes)
   */
  private queueRegeneration(filePath: string, force = false): void {
    if (!this.regenerationQueue.includes(filePath)) {
      this.regenerationQueue.push(filePath);
    }

    if (force) {
      this.performRegeneration();
    } else {
      this.debouncedRegenerate();
    }
  }

  /**
   * Perform the actual type regeneration
   */
  private async performRegeneration(): Promise<void> {
    if (this.isRegenerating) {
      console.log("⏳ Regeneration already in progress, skipping...");
      return;
    }

    if (this.regenerationQueue.length === 0) {
      return;
    }

    this.isRegenerating = true;
    const startTime = Date.now();
    const changedFiles = [...this.regenerationQueue];
    this.regenerationQueue = [];

    console.log("🏗️ Regenerating TypeScript types...");
    console.log(
      `📁 Changed files: ${changedFiles
        .map((f) => path.basename(f))
        .join(", ")}`
    );

    try {
      // Determine what needs to be regenerated
      const regenerationPlan = await this.createRegenerationPlan(changedFiles);

      // Perform incremental regeneration
      const result = await this.executeRegenerationPlan(regenerationPlan);

      const duration = Date.now() - startTime;

      if (result.success) {
        console.log(`✅ Types regenerated successfully (${duration}ms)`);
        console.log(`📝 Updated: ${result.changedFiles.join(", ")}`);

        // Trigger frontend hot reload
        this.triggerFrontendUpdate(result);
      } else {
        console.error("❌ Type regeneration failed:");
        result.errors.forEach((error) => console.error(`   ${error}`));
      }

      this.emit("regeneration-complete", {
        success: result.success,
        changedFiles: result.changedFiles,
        errors: result.errors,
        duration,
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error("💥 Type regeneration crashed:", error);

      this.emit("regeneration-error", {
        error: error instanceof Error ? error.message : String(error),
        changedFiles,
        duration,
      });
    } finally {
      this.isRegenerating = false;
    }
  }

  /**
   * Create a plan for what needs to be regenerated
   */
  private async createRegenerationPlan(
    changedFiles: string[]
  ): Promise<RegenerationPlan> {
    const plan: RegenerationPlan = {
      fullRegeneration: false,
      changedModels: new Set(),
      changedRoutes: new Set(),
      affectedTypes: new Set(),
      affectedApiMethods: new Set(),
    };

    for (const filePath of changedFiles) {
      if (filePath.includes("farm.config")) {
        // Config changes trigger full regeneration
        plan.fullRegeneration = true;
        break;
      }

      if (filePath.includes("/models/")) {
        const modelName = this.extractModelName(filePath);
        if (modelName) {
          plan.changedModels.add(modelName);
          plan.affectedTypes.add(modelName);
        }
      }

      if (filePath.includes("/routes/")) {
        const routeName = this.extractRouteName(filePath);
        if (routeName) {
          plan.changedRoutes.add(routeName);
          plan.affectedApiMethods.add(routeName);
        }
      }
    }

    return plan;
  }

  /**
   * Execute the regeneration plan
   */
  private async executeRegenerationPlan(
    plan: RegenerationPlan
  ): Promise<RegenerationResult> {
    const result: RegenerationResult = {
      success: true,
      changedFiles: [],
      errors: [],
      duration: 0,
    };

    const startTime = Date.now();

    try {
      if (plan.fullRegeneration) {
        // Full regeneration
        const generationResult = await this.codeGenerator.regenerateAll();
        result.changedFiles = generationResult.generatedFiles;
        result.success = generationResult.success;
        result.errors = generationResult.errors;
      } else {
        // Incremental regeneration
        const generationResult = await this.codeGenerator.regenerateIncremental(
          {
            models: Array.from(plan.changedModels),
            routes: Array.from(plan.changedRoutes),
          }
        );
        result.changedFiles = generationResult.generatedFiles;
        result.success = generationResult.success;
        result.errors = generationResult.errors;
      }
    } catch (error) {
      result.success = false;
      result.errors.push(
        error instanceof Error ? error.message : String(error)
      );
    }

    result.duration = Date.now() - startTime;
    return result;
  }

  /**
   * Trigger frontend hot reload with new types
   */
  private triggerFrontendUpdate(result: RegenerationResult): void {
    // Emit event that the dev server can listen to
    this.emit("frontend-update-required", {
      type: "types-updated",
      changedFiles: result.changedFiles,
      timestamp: Date.now(),
    });

    // The Vite dev server will automatically pick up changes to the types directory
    // We just need to ensure the files are written and touch a trigger file if needed
    this.touchViteTriggerFile();
  }

  /**
   * Touch a file that Vite watches to trigger HMR
   */
  private async touchViteTriggerFile(): Promise<void> {
    try {
      const triggerFile = path.join("apps/web/src/types/.farm-trigger");
      await fs.writeFile(triggerFile, Date.now().toString());
    } catch (error) {
      // Non-critical error - Vite should still pick up the changes
      console.warn("⚠️ Could not touch Vite trigger file:", error);
    }
  }

  /**
   * Extract model name from file path
   */
  private extractModelName(filePath: string): string | null {
    const match = filePath.match(/\/models\/([^\/]+)\.py$/);
    return match ? match[1] : null;
  }

  /**
   * Extract route name from file path
   */
  private extractRouteName(filePath: string): string | null {
    const match = filePath.match(/\/routes\/([^\/]+)\.py$/);
    return match ? match[1] : null;
  }

  /**
   * Stop all file watchers
   */
  async stopWatching(): Promise<void> {
    console.log("🛑 Stopping file watchers...");

    for (const [name, watcher] of this.watchers) {
      try {
        await watcher.close();
        console.log(`✅ ${name} watcher stopped`);
      } catch (error) {
        console.error(`❌ Error stopping ${name} watcher:`, error);
      }
    }

    this.watchers.clear();
    console.log("✅ All file watchers stopped");
  }

  /**
   * Get current watcher status
   */
  getStatus(): WatcherStatus {
    return {
      isWatching: this.watchers.size > 0,
      activeWatchers: Array.from(this.watchers.keys()),
      isRegenerating: this.isRegenerating,
      queuedChanges: this.regenerationQueue.length,
    };
  }
}

interface RegenerationPlan {
  fullRegeneration: boolean;
  changedModels: Set<string>;
  changedRoutes: Set<string>;
  affectedTypes: Set<string>;
  affectedApiMethods: Set<string>;
}

interface WatcherStatus {
  isWatching: boolean;
  activeWatchers: string[];
  isRegenerating: boolean;
  queuedChanges: number;
}
