// packages/core/src/watcher/hot-reload-coordinator.ts
import { EventEmitter } from "events";
import { promises as fs } from "fs";
import path from "path";
import type { FarmConfig, HotReloadStatus } from "@farm-framework/types";
import type { FarmFileWatcher } from "./file-watcher";

export class HotReloadCoordinator extends EventEmitter {
  private fileWatcher: FarmFileWatcher;
  private config: FarmConfig;

  constructor(fileWatcher: FarmFileWatcher, config: FarmConfig) {
    super();
    this.fileWatcher = fileWatcher;
    this.config = config;
    this.setupEventHandlers();
  }

  /**
   * Setup event handlers for coordinated hot reload
   */
  private setupEventHandlers(): void {
    // Listen for successful regeneration
    this.fileWatcher.on(
      "regeneration-complete",
      this.handleRegenerationComplete.bind(this)
    );

    // Listen for regeneration errors
    this.fileWatcher.on(
      "regeneration-error",
      this.handleRegenerationError.bind(this)
    );

    // Listen for frontend update requirements
    this.fileWatcher.on(
      "frontend-update-required",
      this.handleFrontendUpdateRequired.bind(this)
    );

    // Listen for AI file changes
    this.fileWatcher.on("ai-file-changed", this.handleAIFileChange.bind(this));

    // Listen for config changes
    this.fileWatcher.on("config-changed", this.handleConfigChange.bind(this));
  }

  /**
   * Handle successful type regeneration
   */
  private handleRegenerationComplete(event: any): void {
    console.log("🔥 Hot reload: Types updated successfully");

    // Emit coordinated update event
    this.emit("hot-reload-complete", {
      type: "types",
      success: true,
      changedFiles: event.changedFiles,
      duration: event.duration,
    });

    // Update IDE TypeScript service if configured
    if (this.config.development?.hotReload?.typeGeneration) {
      this.triggerTypeScriptServiceReload();
    }
  }

  /**
   * Handle regeneration errors
   */
  private handleRegenerationError(event: any): void {
    console.error("💥 Hot reload: Type regeneration failed");

    // Provide helpful error messages to developer
    this.displayDeveloperFriendlyError(event.error);

    this.emit("hot-reload-error", {
      type: "types",
      error: event.error,
      changedFiles: event.changedFiles,
    });
  }

  /**
   * Handle frontend update requirements
   */
  private handleFrontendUpdateRequired(event: any): void {
    console.log("📡 Hot reload: Triggering frontend update");

    // The frontend dev server (Vite) will automatically pick up file changes
    // We can enhance this with custom WebSocket messages if needed
    this.emit("frontend-update", event);
  }

  /**
   * Handle AI file changes for hot model swapping
   */
  private handleAIFileChange(event: any): void {
    if (this.config.development?.hotReload?.aiModels) {
      console.log("🤖 Hot reload: AI models updated");

      // Trigger AI model hot swap
      this.triggerAIModelHotSwap(event);
    }
  }

  /**
   * Handle configuration changes
   */
  private handleConfigChange(event: any): void {
    console.log("⚙️ Hot reload: Configuration changed");

    // Configuration changes might require service restarts
    this.emit("config-hot-reload", {
      configFile: event.path,
      affectedSystems: event.affectedSystems,
    });
  }

  /**
   * Trigger TypeScript service reload for better IDE experience
   */
  private triggerTypeScriptServiceReload(): void {
    // This helps VS Code and other editors pick up new types immediately
    console.log("🔄 Triggering TypeScript service reload...");

    // Create a signal file that IDEs can watch
    this.createIDESignalFile();
  }

  /**
   * Create a signal file for IDE integration
   */
  private async createIDESignalFile(): Promise<void> {
    try {
      const signalFile = path.join("apps/web/src/types/.ts-reload-signal");
      await fs.writeFile(
        signalFile,
        JSON.stringify({
          timestamp: Date.now(),
          event: "types-updated",
        })
      );
    } catch (error) {
      // Non-critical - IDE integration is optional
      console.warn("⚠️ Could not create IDE signal file:", error);
    }
  }

  /**
   * Trigger AI model hot swap
   */
  private async triggerAIModelHotSwap(event: any): Promise<void> {
    try {
      // Send hot reload signal to AI service
      const response = await fetch("http://localhost:8000/api/ai/hot-reload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          changedFile: event.path,
          timestamp: event.timestamp,
        }),
      });

      if (response.ok) {
        console.log("✅ AI models hot-swapped successfully");
        this.emit("ai-hot-reload-complete", event);
      } else {
        console.warn(
          "⚠️ AI hot reload failed, service restart may be required"
        );
        this.emit("ai-hot-reload-failed", event);
      }
    } catch (error) {
      console.warn("⚠️ Could not communicate with AI service for hot reload");
      this.emit("ai-hot-reload-error", { event, error });
    }
  }

  /**
   * Display developer-friendly error messages
   */
  private displayDeveloperFriendlyError(error: string): void {
    console.error("\n📝 How to fix this error:");

    if (
      error.includes("ImportError") ||
      error.includes("ModuleNotFoundError")
    ) {
      console.error("   • Check your Python imports in the changed file");
      console.error("   • Make sure all required dependencies are installed");
      console.error("   • Verify your Python virtual environment is activated");
    } else if (error.includes("SyntaxError")) {
      console.error("   • Fix the Python syntax error in your code");
      console.error(
        "   • Check for missing colons, parentheses, or indentation"
      );
    } else if (error.includes("ValidationError")) {
      console.error("   • Check your Pydantic model field definitions");
      console.error("   • Ensure all required fields are properly typed");
    } else if (error.includes("FastAPI")) {
      console.error("   • Check your FastAPI route definitions");
      console.error("   • Verify response_model and request body types");
    } else {
      console.error("   • Check the error details above");
      console.error("   • Fix the issue and save the file to retry");
    }

    console.error(
      "\n💡 Types will regenerate automatically when you fix the error\n"
    );
  }

  /**
   * Get hot reload status
   */
  getStatus(): HotReloadStatus {
    const watcherStatus = this.fileWatcher.getStatus();

    return {
      isActive: watcherStatus.isWatching,
      typeGeneration:
        this.config.development?.hotReload?.typeGeneration ?? true,
      aiModels: this.config.development?.hotReload?.aiModels ?? true,
      isRegenerating: watcherStatus.isRegenerating,
      queuedChanges: watcherStatus.queuedChanges,
    };
  }
}
