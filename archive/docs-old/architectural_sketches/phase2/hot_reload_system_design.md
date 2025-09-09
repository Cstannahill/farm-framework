# Hot Reload System Design

## Overview

The FARM hot reload system provides intelligent, cross-stack hot reloading that coordinates updates across React frontend, FastAPI backend, database schemas, AI models, and plugins. It features dependency-aware reloading, type generation integration, and AI model hot-swapping to maintain development flow without service restarts.

---

## High-Level Hot Reload Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    FARM Hot Reload System                      │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────┐ │
│  │File Watcher │  │ Dependency  │  │   Change    │  │ Reload  │ │
│  │   Engine    │  │   Graph     │  │ Analyzer    │  │Coordinator│ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────┘ │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────┐ │
│  │   Vite      │  │  FastAPI    │  │    Type     │  │   AI    │ │
│  │    HMR      │  │   Reload    │  │ Generation  │  │ Models  │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────┘ │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────┐ │
│  │ Database    │  │   Plugin    │  │   Error     │  │ Client  │ │
│  │   Schema    │  │   System    │  │  Recovery   │  │ Notify  │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## Core Hot Reload Components

### 1. Hot Reload Coordinator

**Central Intelligence for Cross-Stack Reloading:**

```typescript
// packages/core/src/hot-reload/coordinator.ts
import { EventEmitter } from "events";
import { FileWatcher } from "./file-watcher";
import { DependencyGraph } from "./dependency-graph";
import { ChangeAnalyzer } from "./change-analyzer";
import { TypeGenerator } from "../codegen/type-generator";

export class HotReloadCoordinator extends EventEmitter {
  private fileWatcher: FileWatcher;
  private dependencyGraph: DependencyGraph;
  private changeAnalyzer: ChangeAnalyzer;
  private typeGenerator: TypeGenerator;
  private reloadQueue: ReloadTask[] = [];
  private isProcessing = false;
  private config: HotReloadConfig;

  constructor(config: HotReloadConfig) {
    super();
    this.config = config;
    this.fileWatcher = new FileWatcher(config.watchPaths);
    this.dependencyGraph = new DependencyGraph();
    this.changeAnalyzer = new ChangeAnalyzer();
    this.typeGenerator = new TypeGenerator(config);
    this.setupEventHandlers();
  }

  async initialize(): Promise<void> {
    console.log("🔥 Initializing hot reload system...");

    // Build initial dependency graph
    await this.buildDependencyGraph();

    // Start file watching
    await this.fileWatcher.start();

    // Setup debounced processing
    this.setupDebouncedProcessing();

    console.log("✅ Hot reload system ready");
  }

  private setupEventHandlers(): void {
    this.fileWatcher.on("change", this.handleFileChange.bind(this));
    this.fileWatcher.on("add", this.handleFileAdd.bind(this));
    this.fileWatcher.on("unlink", this.handleFileDelete.bind(this));
    this.fileWatcher.on("addDir", this.handleDirectoryAdd.bind(this));
    this.fileWatcher.on("unlinkDir", this.handleDirectoryDelete.bind(this));
  }

  private async handleFileChange(filePath: string): Promise<void> {
    console.log(`📝 File changed: ${filePath}`);

    try {
      // Analyze the change
      const change = await this.changeAnalyzer.analyzeFileChange(filePath);

      // Determine affected components
      const affectedComponents =
        this.dependencyGraph.getAffectedComponents(filePath);

      // Create reload tasks
      const reloadTasks = this.createReloadTasks(change, affectedComponents);

      // Queue tasks for processing
      this.queueReloadTasks(reloadTasks);
    } catch (error) {
      console.error(
        `❌ Error handling file change for ${filePath}:`,
        error.message
      );
      this.emit("reload-error", { filePath, error });
    }
  }

  private createReloadTasks(
    change: FileChange,
    affected: AffectedComponent[]
  ): ReloadTask[] {
    const tasks: ReloadTask[] = [];

    // Determine task types based on change type and affected components
    if (change.type === "backend-model") {
      tasks.push({
        type: "type-generation",
        priority: 1,
        dependencies: [],
        metadata: { modelFile: change.filePath },
      });

      tasks.push({
        type: "frontend-hmr",
        priority: 2,
        dependencies: ["type-generation"],
        metadata: { reason: "types-updated" },
      });
    }

    if (change.type === "backend-route") {
      tasks.push({
        type: "api-client-generation",
        priority: 1,
        dependencies: [],
        metadata: { routeFile: change.filePath },
      });

      tasks.push({
        type: "backend-reload",
        priority: 2,
        dependencies: ["api-client-generation"],
        metadata: { reason: "route-updated" },
      });
    }

    if (change.type === "ai-config") {
      tasks.push({
        type: "ai-model-reload",
        priority: 1,
        dependencies: [],
        metadata: { configFile: change.filePath },
      });
    }

    if (change.type === "frontend-component") {
      tasks.push({
        type: "frontend-hmr",
        priority: 1,
        dependencies: [],
        metadata: { component: change.filePath },
      });
    }

    if (change.type === "database-model") {
      tasks.push({
        type: "database-schema-update",
        priority: 1,
        dependencies: [],
        metadata: { modelFile: change.filePath },
      });

      tasks.push({
        type: "type-generation",
        priority: 2,
        dependencies: ["database-schema-update"],
        metadata: { reason: "schema-updated" },
      });
    }

    if (change.type === "plugin-config") {
      tasks.push({
        type: "plugin-reload",
        priority: 1,
        dependencies: [],
        metadata: { pluginPath: change.filePath },
      });
    }

    return tasks;
  }

  private queueReloadTasks(tasks: ReloadTask[]): void {
    // Add tasks to queue with deduplication
    for (const task of tasks) {
      const existingIndex = this.reloadQueue.findIndex(
        (existing) =>
          existing.type === task.type &&
          JSON.stringify(existing.metadata) === JSON.stringify(task.metadata)
      );

      if (existingIndex !== -1) {
        // Update existing task
        this.reloadQueue[existingIndex] = task;
      } else {
        // Add new task
        this.reloadQueue.push(task);
      }
    }

    // Trigger processing if not already running
    if (!this.isProcessing) {
      this.processReloadQueue();
    }
  }

  private setupDebouncedProcessing(): void {
    let debounceTimer: NodeJS.Timeout;

    this.on("queue-updated", () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        if (!this.isProcessing && this.reloadQueue.length > 0) {
          this.processReloadQueue();
        }
      }, this.config.debounceMs || 100);
    });
  }

  private async processReloadQueue(): Promise<void> {
    if (this.isProcessing || this.reloadQueue.length === 0) {
      return;
    }

    this.isProcessing = true;
    console.log(`🔄 Processing ${this.reloadQueue.length} reload tasks...`);

    try {
      // Sort tasks by priority and dependencies
      const sortedTasks = this.sortTasksByDependencies(this.reloadQueue);

      // Execute tasks in order
      for (const task of sortedTasks) {
        await this.executeReloadTask(task);
      }

      // Clear completed tasks
      this.reloadQueue = [];

      console.log("✅ Hot reload completed");
      this.emit("reload-complete");
    } catch (error) {
      console.error("❌ Hot reload failed:", error.message);
      this.emit("reload-error", error);
    } finally {
      this.isProcessing = false;
    }
  }

  private sortTasksByDependencies(tasks: ReloadTask[]): ReloadTask[] {
    const sorted: ReloadTask[] = [];
    const remaining = [...tasks];

    while (remaining.length > 0) {
      const readyTasks = remaining.filter((task) =>
        task.dependencies.every((dep) =>
          sorted.some((completed) => completed.type === dep)
        )
      );

      if (readyTasks.length === 0) {
        throw new Error("Circular dependency detected in reload tasks");
      }

      // Sort ready tasks by priority
      readyTasks.sort((a, b) => a.priority - b.priority);

      // Add first ready task to sorted list
      const nextTask = readyTasks[0];
      sorted.push(nextTask);

      // Remove from remaining
      const index = remaining.indexOf(nextTask);
      remaining.splice(index, 1);
    }

    return sorted;
  }

  private async executeReloadTask(task: ReloadTask): Promise<void> {
    const startTime = Date.now();
    console.log(`⚡ Executing ${task.type}...`);

    try {
      switch (task.type) {
        case "type-generation":
          await this.executeTypeGeneration(task);
          break;
        case "api-client-generation":
          await this.executeApiClientGeneration(task);
          break;
        case "frontend-hmr":
          await this.executeFrontendHMR(task);
          break;
        case "backend-reload":
          await this.executeBackendReload(task);
          break;
        case "ai-model-reload":
          await this.executeAIModelReload(task);
          break;
        case "database-schema-update":
          await this.executeDatabaseSchemaUpdate(task);
          break;
        case "plugin-reload":
          await this.executePluginReload(task);
          break;
        default:
          throw new Error(`Unknown reload task type: ${task.type}`);
      }

      const duration = Date.now() - startTime;
      console.log(`✅ ${task.type} completed in ${duration}ms`);
    } catch (error) {
      console.error(`❌ ${task.type} failed:`, error.message);
      throw error;
    }
  }

  private async executeTypeGeneration(task: ReloadTask): Promise<void> {
    // Generate TypeScript types from backend models
    await this.typeGenerator.generateFromModels();

    // Notify frontend about type updates
    this.emit("types-updated", {
      timestamp: Date.now(),
      reason: task.metadata.reason,
    });
  }

  private async executeFrontendHMR(task: ReloadTask): Promise<void> {
    // Trigger Vite HMR update
    await this.notifyViteHMR({
      type: "full-reload",
      reason: task.metadata.reason,
      timestamp: Date.now(),
    });
  }

  private async executeBackendReload(task: ReloadTask): Promise<void> {
    // FastAPI auto-reload should handle most cases
    // For complex changes, we might need to restart specific modules
    await this.notifyBackendReload({
      reason: task.metadata.reason,
      timestamp: Date.now(),
    });
  }

  private async executeAIModelReload(task: ReloadTask): Promise<void> {
    // Hot swap AI models without service restart
    await this.reloadAIModels(task.metadata.configFile);
  }

  private async buildDependencyGraph(): Promise<void> {
    // Build graph of file dependencies across the stack
    await this.dependencyGraph.build({
      frontendSrc: "apps/web/src",
      backendSrc: "apps/api/src",
      configFiles: ["farm.config.ts", "vite.config.ts"],
      typesDir: "apps/web/src/types",
    });
  }
}
```

### 2. Intelligent File Watcher

**Advanced File Watching with Change Detection:**

```typescript
// packages/core/src/hot-reload/file-watcher.ts
import chokidar from "chokidar";
import { EventEmitter } from "events";
import path from "path";
import fs from "fs-extra";

export class FileWatcher extends EventEmitter {
  private watchers: Map<string, chokidar.FSWatcher> = new Map();
  private watchPaths: WatchPath[];
  private ignorePatterns: string[];
  private fileHashes: Map<string, string> = new Map();

  constructor(watchPaths: WatchPath[]) {
    super();
    this.watchPaths = watchPaths;
    this.ignorePatterns = [
      "**/node_modules/**",
      "**/.git/**",
      "**/dist/**",
      "**/build/**",
      "**/__pycache__/**",
      "**/.pytest_cache/**",
      "**/.*",
      "**/*.log",
      "**/*.tmp",
    ];
  }

  async start(): Promise<void> {
    console.log("👁️  Starting file watchers...");

    for (const watchPath of this.watchPaths) {
      await this.createWatcher(watchPath);
    }

    console.log(`✅ Watching ${this.watchPaths.length} paths`);
  }

  private async createWatcher(watchPath: WatchPath): Promise<void> {
    const watcher = chokidar.watch(watchPath.pattern, {
      ignored: [...this.ignorePatterns, ...(watchPath.ignore || [])],
      persistent: true,
      ignoreInitial: true,
      followSymlinks: false,
      usePolling: watchPath.usePolling || false,
      interval: watchPath.interval || 1000,
      binaryInterval: watchPath.binaryInterval || 300,
      awaitWriteFinish: {
        stabilityThreshold: 100,
        pollInterval: 50,
      },
    });

    // Setup event handlers
    watcher.on("change", async (filePath) => {
      if (await this.shouldProcessChange(filePath)) {
        this.emit("change", this.normalizePath(filePath));
      }
    });

    watcher.on("add", (filePath) => {
      this.emit("add", this.normalizePath(filePath));
    });

    watcher.on("unlink", (filePath) => {
      this.fileHashes.delete(filePath);
      this.emit("unlink", this.normalizePath(filePath));
    });

    watcher.on("addDir", (dirPath) => {
      this.emit("addDir", this.normalizePath(dirPath));
    });

    watcher.on("unlinkDir", (dirPath) => {
      this.emit("unlinkDir", this.normalizePath(dirPath));
    });

    watcher.on("error", (error) => {
      console.error(`❌ File watcher error for ${watchPath.pattern}:`, error);
      this.emit("error", error);
    });

    this.watchers.set(watchPath.pattern, watcher);
  }

  private async shouldProcessChange(filePath: string): Promise<boolean> {
    try {
      // Check if file still exists
      if (!(await fs.pathExists(filePath))) {
        return false;
      }

      // Calculate file hash to detect actual changes
      const content = await fs.readFile(filePath);
      const hash = this.calculateHash(content);

      const previousHash = this.fileHashes.get(filePath);
      this.fileHashes.set(filePath, hash);

      // Only process if content actually changed
      return hash !== previousHash;
    } catch (error) {
      // If we can't read the file, assume it changed
      return true;
    }
  }

  private calculateHash(content: Buffer): string {
    const crypto = require("crypto");
    return crypto.createHash("md5").update(content).digest("hex");
  }

  private normalizePath(filePath: string): string {
    return path.resolve(filePath);
  }

  async stop(): Promise<void> {
    console.log("⏹️  Stopping file watchers...");

    for (const [pattern, watcher] of this.watchers) {
      await watcher.close();
      console.log(`Stopped watching: ${pattern}`);
    }

    this.watchers.clear();
    this.fileHashes.clear();
  }

  addWatchPath(watchPath: WatchPath): void {
    this.watchPaths.push(watchPath);
    if (this.watchers.size > 0) {
      // Already started, add watcher immediately
      this.createWatcher(watchPath);
    }
  }

  removeWatchPath(pattern: string): void {
    const watcher = this.watchers.get(pattern);
    if (watcher) {
      watcher.close();
      this.watchers.delete(pattern);
    }

    this.watchPaths = this.watchPaths.filter((wp) => wp.pattern !== pattern);
  }
}

export interface WatchPath {
  pattern: string;
  ignore?: string[];
  usePolling?: boolean;
  interval?: number;
  binaryInterval?: number;
  description?: string;
}
```

### 3. Change Analyzer

**Intelligent Analysis of File Changes:**

```typescript
// packages/core/src/hot-reload/change-analyzer.ts
import path from "path";
import fs from "fs-extra";
import { parse } from "@babel/parser";
import traverse from "@babel/traverse";

export class ChangeAnalyzer {
  async analyzeFileChange(filePath: string): Promise<FileChange> {
    const extension = path.extname(filePath);
    const relativePath = path.relative(process.cwd(), filePath);

    // Determine change type based on file path and content
    const changeType = this.determineChangeType(relativePath, extension);

    // Analyze specific changes based on type
    const details = await this.analyzeSpecificChanges(filePath, changeType);

    return {
      filePath: relativePath,
      type: changeType,
      timestamp: Date.now(),
      details,
    };
  }

  private determineChangeType(
    relativePath: string,
    extension: string
  ): ChangeType {
    // Backend Python files
    if (relativePath.includes("apps/api/src/models/") && extension === ".py") {
      return "backend-model";
    }

    if (relativePath.includes("apps/api/src/routes/") && extension === ".py") {
      return "backend-route";
    }

    if (relativePath.includes("apps/api/src/") && extension === ".py") {
      return "backend-source";
    }

    // Frontend files
    if (
      relativePath.includes("apps/web/src/") &&
      [".tsx", ".ts", ".jsx", ".js"].includes(extension)
    ) {
      if (relativePath.includes("/components/")) {
        return "frontend-component";
      }
      if (relativePath.includes("/pages/")) {
        return "frontend-page";
      }
      if (relativePath.includes("/hooks/")) {
        return "frontend-hook";
      }
      return "frontend-source";
    }

    // Configuration files
    if (
      relativePath === "farm.config.ts" ||
      relativePath === "farm.config.js"
    ) {
      return "farm-config";
    }

    if (relativePath === "apps/web/vite.config.ts") {
      return "vite-config";
    }

    // AI-related files
    if (relativePath.includes("apps/api/src/ai/") && extension === ".py") {
      return "ai-config";
    }

    // Database migration files
    if (
      relativePath.includes("apps/api/migrations/") &&
      extension === ".json"
    ) {
      return "database-migration";
    }

    // Plugin files
    if (
      relativePath.includes("/plugins/") ||
      relativePath.includes("@farm/plugin-")
    ) {
      return "plugin-config";
    }

    // Style files
    if ([".css", ".scss", ".sass", ".less"].includes(extension)) {
      return "style";
    }

    // Asset files
    if ([".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico"].includes(extension)) {
      return "asset";
    }

    return "unknown";
  }

  private async analyzeSpecificChanges(
    filePath: string,
    changeType: ChangeType
  ): Promise<ChangeDetails> {
    const details: ChangeDetails = {
      affectedExports: [],
      affectedImports: [],
      hasStructuralChanges: false,
    };

    try {
      switch (changeType) {
        case "backend-model":
          return await this.analyzePythonModelChanges(filePath);
        case "backend-route":
          return await this.analyzePythonRouteChanges(filePath);
        case "frontend-component":
          return await this.analyzeReactComponentChanges(filePath);
        case "farm-config":
          return await this.analyzeFarmConfigChanges(filePath);
        default:
          return details;
      }
    } catch (error) {
      console.warn(`Could not analyze changes in ${filePath}:`, error.message);
      return details;
    }
  }

  private async analyzePythonModelChanges(
    filePath: string
  ): Promise<ChangeDetails> {
    const content = await fs.readFile(filePath, "utf-8");

    // Parse Python AST to detect model changes
    // For now, simplified detection based on content analysis
    const details: ChangeDetails = {
      affectedExports: [],
      affectedImports: [],
      hasStructuralChanges: false,
    };

    // Detect Pydantic model classes
    const modelClassRegex = /class\s+(\w+)\s*\([^)]*Document[^)]*\):/g;
    let match;

    while ((match = modelClassRegex.exec(content)) !== null) {
      details.affectedExports.push({
        name: match[1],
        type: "class",
        isModel: true,
      });
    }

    // Detect field changes
    if (
      content.includes("Field(") ||
      content.includes(": str") ||
      content.includes(": int")
    ) {
      details.hasStructuralChanges = true;
    }

    return details;
  }

  private async analyzeReactComponentChanges(
    filePath: string
  ): Promise<ChangeDetails> {
    const content = await fs.readFile(filePath, "utf-8");

    const details: ChangeDetails = {
      affectedExports: [],
      affectedImports: [],
      hasStructuralChanges: false,
    };

    try {
      // Parse JavaScript/TypeScript AST
      const ast = parse(content, {
        sourceType: "module",
        plugins: ["typescript", "jsx"],
      });

      // Analyze exports and imports
      traverse(ast, {
        ExportDefaultDeclaration(path) {
          details.affectedExports.push({
            name: "default",
            type: "component",
          });
        },

        ExportNamedDeclaration(path) {
          if (path.node.declaration?.id?.name) {
            details.affectedExports.push({
              name: path.node.declaration.id.name,
              type: "function",
            });
          }
        },

        ImportDeclaration(path) {
          details.affectedImports.push({
            source: path.node.source.value,
            specifiers: path.node.specifiers.map((spec) => spec.local.name),
          });
        },
      });

      // Detect structural changes (hooks, props, etc.)
      if (
        content.includes("useState") ||
        content.includes("useEffect") ||
        content.includes("interface ") ||
        content.includes("type ")
      ) {
        details.hasStructuralChanges = true;
      }
    } catch (error) {
      console.warn(`Could not parse ${filePath}:`, error.message);
    }

    return details;
  }

  private async analyzeFarmConfigChanges(
    filePath: string
  ): Promise<ChangeDetails> {
    // Farm config changes affect the entire system
    return {
      affectedExports: [],
      affectedImports: [],
      hasStructuralChanges: true,
      configSections: await this.detectConfigSections(filePath),
    };
  }

  private async detectConfigSections(filePath: string): Promise<string[]> {
    const content = await fs.readFile(filePath, "utf-8");
    const sections: string[] = [];

    // Detect which config sections changed
    if (content.includes("database:")) sections.push("database");
    if (content.includes("ai:")) sections.push("ai");
    if (content.includes("auth:")) sections.push("auth");
    if (content.includes("plugins:")) sections.push("plugins");
    if (content.includes("development:")) sections.push("development");

    return sections;
  }
}
```

### 4. Type Generation Hot Reload

**Seamless Type Updates:**

```typescript
// packages/core/src/hot-reload/type-hot-reload.ts
import { TypeGenerator } from "../codegen/type-generator";
import { EventEmitter } from "events";

export class TypeHotReload extends EventEmitter {
  private typeGenerator: TypeGenerator;
  private lastGenerationTime = 0;
  private pendingGeneration = false;

  constructor(typeGenerator: TypeGenerator) {
    super();
    this.typeGenerator = typeGenerator;
  }

  async handleModelChange(filePath: string): Promise<void> {
    console.log(`🔄 Model changed: ${filePath}, regenerating types...`);

    // Prevent multiple simultaneous generations
    if (this.pendingGeneration) {
      console.log("⏭️  Type generation already in progress, skipping...");
      return;
    }

    this.pendingGeneration = true;

    try {
      const startTime = Date.now();

      // Generate TypeScript types from updated models
      await this.typeGenerator.generateFromModels();

      // Generate API client updates
      await this.typeGenerator.generateApiClient();

      // Generate React hooks
      await this.typeGenerator.generateHooks();

      const duration = Date.now() - startTime;
      this.lastGenerationTime = Date.now();

      console.log(`✅ Types regenerated in ${duration}ms`);

      // Notify frontend about updated types
      this.emit("types-updated", {
        timestamp: this.lastGenerationTime,
        duration,
        affectedFiles: await this.getGeneratedFiles(),
      });

      // Trigger frontend HMR
      await this.triggerFrontendHMR();
    } catch (error) {
      console.error("❌ Type generation failed:", error.message);
      this.emit("type-generation-error", error);
    } finally {
      this.pendingGeneration = false;
    }
  }

  private async getGeneratedFiles(): Promise<string[]> {
    // Return list of generated TypeScript files
    return [
      "apps/web/src/types/api.ts",
      "apps/web/src/types/models/index.ts",
      "apps/web/src/services/api.ts",
      "apps/web/src/hooks/api.ts",
    ];
  }

  private async triggerFrontendHMR(): Promise<void> {
    // Send HMR update to Vite dev server
    try {
      await fetch("http://localhost:3000/__vite_hmr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "full-reload",
          reason: "types-updated",
        }),
      });
    } catch (error) {
      console.warn("Could not trigger frontend HMR:", error.message);
    }
  }

  async handleConfigChange(configPath: string): Promise<void> {
    console.log(`⚙️ Configuration changed: ${configPath}`);

    // Reload type generator configuration
    await this.typeGenerator.reloadConfig();

    // Regenerate all types with new configuration
    await this.handleModelChange(configPath);
  }
}
```

### 5. AI Model Hot Swapping

**Hot Reload AI Models Without Service Restart:**

```typescript
// packages/core/src/hot-reload/ai-hot-reload.ts
export class AIHotReload extends EventEmitter {
  private aiRouter: any; // Reference to AI router
  private modelCache: Map<string, any> = new Map();

  constructor(aiRouter: any) {
    super();
    this.aiRouter = aiRouter;
  }

  async handleAIConfigChange(configPath: string): Promise<void> {
    console.log(`🤖 AI configuration changed: ${configPath}`);

    try {
      // Reload FARM configuration
      const newConfig = await this.loadFarmConfig();
      const aiConfig = newConfig.ai || {};

      // Compare with current configuration
      const changes = await this.detectAIConfigChanges(aiConfig);

      // Apply changes
      for (const change of changes) {
        await this.applyAIConfigChange(change);
      }

      console.log(
        `✅ AI configuration updated: ${changes.length} changes applied`
      );
    } catch (error) {
      console.error("❌ AI config hot reload failed:", error.message);
      this.emit("ai-reload-error", error);
    }
  }

  private async detectAIConfigChanges(
    newConfig: any
  ): Promise<AIConfigChange[]> {
    const changes: AIConfigChange[] = [];

    // Check for new or removed providers
    const currentProviders = Object.keys(this.aiRouter.providers || {});
    const newProviders = Object.keys(newConfig.providers || {});

    for (const provider of newProviders) {
      if (!currentProviders.includes(provider)) {
        changes.push({
          type: "provider-added",
          provider,
          config: newConfig.providers[provider],
        });
      } else {
        // Check for provider config changes
        const configChanged = await this.hasProviderConfigChanged(
          provider,
          newConfig.providers[provider]
        );

        if (configChanged) {
          changes.push({
            type: "provider-updated",
            provider,
            config: newConfig.providers[provider],
          });
        }
      }
    }

    for (const provider of currentProviders) {
      if (!newProviders.includes(provider)) {
        changes.push({
          type: "provider-removed",
          provider,
        });
      }
    }

    // Check for model changes within providers
    for (const provider of newProviders) {
      const providerConfig = newConfig.providers[provider];
      const modelChanges = await this.detectModelChanges(
        provider,
        providerConfig
      );
      changes.push(...modelChanges);
    }

    return changes;
  }

  private async applyAIConfigChange(change: AIConfigChange): Promise<void> {
    switch (change.type) {
      case "provider-added":
        await this.addAIProvider(change.provider, change.config);
        break;

      case "provider-updated":
        await this.updateAIProvider(change.provider, change.config);
        break;

      case "provider-removed":
        await this.removeAIProvider(change.provider);
        break;

      case "model-added":
        await this.addModel(change.provider, change.model, change.config);
        break;

      case "model-removed":
        await this.removeModel(change.provider, change.model);
        break;

      case "model-updated":
        await this.updateModel(change.provider, change.model, change.config);
        break;
    }
  }

  private async addModel(
    provider: string,
    modelName: string,
    config: any
  ): Promise<void> {
    console.log(`📥 Adding model: ${provider}/${modelName}`);

    if (provider === "ollama") {
      // Pull Ollama model in background
      await this.pullOllamaModel(modelName);
    }

    // Register model with provider
    await this.aiRouter.registerModel(provider, modelName, config);

    console.log(`✅ Model ${modelName} added to ${provider}`);
  }

  private async updateModel(
    provider: string,
    modelName: string,
    config: any
  ): Promise<void> {
    console.log(`🔄 Updating model: ${provider}/${modelName}`);

    // Hot swap model configuration
    await this.aiRouter.updateModelConfig(provider, modelName, config);

    console.log(`✅ Model ${modelName} configuration updated`);
  }

  private async removeModel(
    provider: string,
    modelName: string
  ): Promise<void> {
    console.log(`🗑️ Removing model: ${provider}/${modelName}`);

    // Unload model from memory
    await this.aiRouter.unloadModel(provider, modelName);

    console.log(`✅ Model ${modelName} removed from ${provider}`);
  }

  private async pullOllamaModel(modelName: string): Promise<void> {
    try {
      console.log(`📥 Pulling Ollama model: ${modelName}...`);

      const response = await fetch("http://localhost:11434/api/pull", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: modelName }),
      });

      if (!response.ok) {
        throw new Error(`Failed to pull model: ${response.statusText}`);
      }

      // Stream progress
      const reader = response.body?.getReader();
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = new TextDecoder().decode(value);
          const lines = chunk.split("\n").filter((line) => line.trim());

          for (const line of lines) {
            try {
              const data = JSON.parse(line);
              if (data.status) {
                console.log(`📦 ${data.status}`);
              }
            } catch (e) {
              // Ignore malformed JSON
            }
          }
        }
      }

      console.log(`✅ Ollama model ${modelName} pulled successfully`);
    } catch (error) {
      console.error(
        `❌ Failed to pull Ollama model ${modelName}:`,
        error.message
      );
      throw error;
    }
  }
}
```

### 6. Database Schema Hot Updates

**Live Schema Updates:**

```typescript
// packages/core/src/hot-reload/database-hot-reload.ts
export class DatabaseHotReload extends EventEmitter {
  private databaseManager: any;
  private migrationManager: any;

  constructor(databaseManager: any, migrationManager: any) {
    super();
    this.databaseManager = databaseManager;
    this.migrationManager = migrationManager;
  }

  async handleModelChange(modelFilePath: string): Promise<void> {
    console.log(`🗄️ Database model changed: ${modelFilePath}`);

    try {
      // Analyze model changes
      const changes = await this.analyzeModelChanges(modelFilePath);

      if (changes.length === 0) {
        console.log("📝 No schema changes detected");
        return;
      }

      // Create automatic migration for development
      if (process.env.NODE_ENV === "development") {
        await this.createAutoMigration(changes);
      }

      // Update in-memory model definitions
      await this.updateModelDefinitions(modelFilePath);

      // Recreate indexes if needed
      await this.updateIndexes(changes);

      console.log(`✅ Database schema updated for ${modelFilePath}`);

      // Notify type generator about schema changes
      this.emit("schema-updated", {
        modelFile: modelFilePath,
        changes,
      });
    } catch (error) {
      console.error("❌ Database schema hot reload failed:", error.message);
      this.emit("schema-error", error);
    }
  }

  private async analyzeModelChanges(
    modelFilePath: string
  ): Promise<SchemaChange[]> {
    const changes: SchemaChange[] = [];

    // Read and parse the model file
    const content = await fs.readFile(modelFilePath, "utf-8");

    // Extract model class and field definitions
    const modelInfo = this.parseModelDefinition(content);

    // Compare with existing schema
    const existingSchema = await this.getExistingSchema(modelInfo.className);

    if (!existingSchema) {
      // New model
      changes.push({
        type: "create-collection",
        collection: modelInfo.collectionName,
        schema: modelInfo.schema,
      });
    } else {
      // Compare schemas to detect changes
      const fieldChanges = this.compareSchemas(
        existingSchema,
        modelInfo.schema
      );
      changes.push(...fieldChanges);
    }

    return changes;
  }

  private parseModelDefinition(content: string): ModelInfo {
    // Parse Python model definition
    // For now, simplified regex-based parsing

    const classMatch = content.match(/class\s+(\w+)\s*\([^)]*Document[^)]*\):/);
    const className = classMatch?.[1] || "Unknown";

    // Extract collection name
    const collectionMatch = content.match(/collection\s*=\s*["']([^"']+)["']/);
    const collectionName = collectionMatch?.[1] || className.toLowerCase();

    // Extract fields
    const fields = this.extractFields(content);

    return {
      className,
      collectionName,
      schema: { fields },
    };
  }

  private extractFields(content: string): FieldDefinition[] {
    const fields: FieldDefinition[] = [];

    // Match field definitions like: field_name: FieldType = Field(...)
    const fieldRegex = /(\w+):\s*([^=\n]+)(?:\s*=\s*Field\(([^)]*)\))?/g;
    let match;

    while ((match = fieldRegex.exec(content)) !== null) {
      const [, fieldName, fieldType, fieldOptions] = match;

      fields.push({
        name: fieldName,
        type: fieldType.trim(),
        options: fieldOptions ? this.parseFieldOptions(fieldOptions) : {},
      });
    }

    return fields;
  }

  private async createAutoMigration(changes: SchemaChange[]): Promise<void> {
    console.log("🔄 Creating automatic migration for development...");

    // Create migration with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const migrationId = `auto_${timestamp}`;

    // Apply changes directly in development
    for (const change of changes) {
      await this.applySchemaChange(change);
    }

    console.log("✅ Automatic migration applied");
  }

  private async applySchemaChange(change: SchemaChange): Promise<void> {
    switch (change.type) {
      case "create-collection":
        await this.createCollection(change.collection, change.schema);
        break;

      case "add-field":
        await this.addField(
          change.collection,
          change.field,
          change.defaultValue
        );
        break;

      case "remove-field":
        await this.removeField(change.collection, change.field);
        break;

      case "rename-field":
        await this.renameField(
          change.collection,
          change.oldName,
          change.newName
        );
        break;

      case "create-index":
        await this.createIndex(change.collection, change.index);
        break;

      case "drop-index":
        await this.dropIndex(change.collection, change.index);
        break;
    }
  }

  private async createCollection(name: string, schema: any): Promise<void> {
    // MongoDB collections are created automatically
    // Just ensure the model is registered
    console.log(
      `📂 Collection ${name} will be created on first document insert`
    );
  }

  private async addField(
    collection: string,
    field: string,
    defaultValue: any
  ): Promise<void> {
    // Add field with default value to existing documents
    const db = this.databaseManager.getDatabase();
    await db
      .collection(collection)
      .updateMany(
        { [field]: { $exists: false } },
        { $set: { [field]: defaultValue } }
      );

    console.log(`➕ Added field ${field} to ${collection}`);
  }

  private async updateModelDefinitions(modelFilePath: string): Promise<void> {
    // Clear Python module cache to reload updated model
    const moduleName = this.getModuleName(modelFilePath);

    // This would need to integrate with the Python runtime
    // For now, we rely on FastAPI's auto-reload functionality
    console.log(`🔄 Model definitions updated for ${moduleName}`);
  }
}
```

### 7. Plugin Hot Reload

**Dynamic Plugin System Updates:**

```typescript
// packages/core/src/hot-reload/plugin-hot-reload.ts
export class PluginHotReload extends EventEmitter {
  private pluginManager: any;
  private activePlugins: Map<string, any> = new Map();

  constructor(pluginManager: any) {
    super();
    this.pluginManager = pluginManager;
  }

  async handlePluginChange(pluginPath: string): Promise<void> {
    console.log(`🔌 Plugin changed: ${pluginPath}`);

    try {
      const pluginName = this.extractPluginName(pluginPath);

      if (this.activePlugins.has(pluginName)) {
        // Hot reload existing plugin
        await this.hotReloadPlugin(pluginName, pluginPath);
      } else {
        // New plugin detected
        await this.loadNewPlugin(pluginName, pluginPath);
      }

      console.log(`✅ Plugin ${pluginName} hot reloaded`);
    } catch (error) {
      console.error("❌ Plugin hot reload failed:", error.message);
      this.emit("plugin-error", error);
    }
  }

  private async hotReloadPlugin(
    pluginName: string,
    pluginPath: string
  ): Promise<void> {
    console.log(`🔄 Hot reloading plugin: ${pluginName}`);

    // Deactivate current plugin
    await this.pluginManager.deactivatePlugin(pluginName);

    // Clear require cache for the plugin
    this.clearPluginCache(pluginPath);

    // Reload plugin manifest
    const newManifest = await this.loadPluginManifest(pluginPath);

    // Update plugin registration
    await this.pluginManager.updatePlugin(pluginName, newManifest);

    // Reactivate plugin
    await this.pluginManager.activatePlugin(pluginName);

    // Update frontend if plugin has frontend components
    if (newManifest.frontend) {
      await this.updateFrontendPlugin(pluginName, newManifest.frontend);
    }

    // Update backend if plugin has backend integration
    if (newManifest.backend) {
      await this.updateBackendPlugin(pluginName, newManifest.backend);
    }
  }

  private async updateFrontendPlugin(
    pluginName: string,
    frontendConfig: any
  ): Promise<void> {
    // Regenerate plugin component index
    await this.regeneratePluginComponents();

    // Trigger frontend HMR
    await this.triggerFrontendHMR({
      type: "plugin-updated",
      plugin: pluginName,
    });
  }

  private async updateBackendPlugin(
    pluginName: string,
    backendConfig: any
  ): Promise<void> {
    // Regenerate FastAPI integration
    await this.regenerateBackendIntegration();

    // The FastAPI auto-reload should pick up the changes
    console.log(`🔄 Backend plugin integration updated for ${pluginName}`);
  }

  private clearPluginCache(pluginPath: string): void {
    // Clear Node.js require cache
    const pluginDir = path.dirname(pluginPath);

    Object.keys(require.cache).forEach((key) => {
      if (key.startsWith(pluginDir)) {
        delete require.cache[key];
      }
    });
  }
}
```

---

## Error Recovery System

### 1. Graceful Error Handling

**Robust Error Recovery:**

```typescript
// packages/core/src/hot-reload/error-recovery.ts
export class HotReloadErrorRecovery {
  private retryAttempts: Map<string, number> = new Map();
  private maxRetries = 3;
  private cooldownPeriod = 5000; // 5 seconds

  async handleReloadError(error: HotReloadError): Promise<void> {
    console.error(`❌ Hot reload error in ${error.component}:`, error.message);

    const retryKey = `${error.component}-${error.type}`;
    const currentAttempts = this.retryAttempts.get(retryKey) || 0;

    if (currentAttempts < this.maxRetries) {
      console.log(
        `🔄 Retrying ${error.component} hot reload (attempt ${
          currentAttempts + 1
        }/${this.maxRetries})`
      );

      // Increment retry count
      this.retryAttempts.set(retryKey, currentAttempts + 1);

      // Wait for cooldown
      await this.wait(this.cooldownPeriod);

      // Retry the operation
      await this.retryReloadOperation(error);
    } else {
      console.error(
        `❌ Hot reload failed after ${this.maxRetries} attempts, falling back to full restart`
      );

      // Clear retry count
      this.retryAttempts.delete(retryKey);

      // Fallback to full service restart
      await this.fallbackToFullRestart(error.component);
    }
  }

  private async retryReloadOperation(error: HotReloadError): Promise<void> {
    switch (error.component) {
      case "type-generation":
        await this.retryTypeGeneration(error);
        break;
      case "frontend-hmr":
        await this.retryFrontendHMR(error);
        break;
      case "backend-reload":
        await this.retryBackendReload(error);
        break;
      case "ai-models":
        await this.retryAIModelReload(error);
        break;
      default:
        throw new Error(`Unknown component for retry: ${error.component}`);
    }
  }

  private async fallbackToFullRestart(component: string): Promise<void> {
    console.log(`🔄 Initiating full restart for ${component}...`);

    switch (component) {
      case "frontend-hmr":
        await this.restartFrontendServer();
        break;
      case "backend-reload":
        await this.restartBackendServer();
        break;
      case "ai-models":
        await this.restartAIService();
        break;
      case "type-generation":
        // Full type regeneration
        await this.fullTypeRegeneration();
        break;
    }
  }

  private async wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
```

---

## Performance Optimization

### 1. Reload Performance Monitor

**Optimize Hot Reload Performance:**

```typescript
// packages/core/src/hot-reload/performance-monitor.ts
export class HotReloadPerformanceMonitor {
  private metrics: HotReloadMetric[] = [];
  private slowReloadThreshold = 5000; // 5 seconds

  recordReloadMetric(type: string, duration: number, success: boolean): void {
    const metric: HotReloadMetric = {
      type,
      duration,
      success,
      timestamp: Date.now(),
    };

    this.metrics.push(metric);

    // Keep only last 100 metrics
    if (this.metrics.length > 100) {
      this.metrics = this.metrics.slice(-100);
    }

    // Log slow reloads
    if (duration > this.slowReloadThreshold) {
      console.warn(`⚠️ Slow hot reload detected: ${type} took ${duration}ms`);
    }
  }

  getPerformanceReport(): HotReloadReport {
    const last24h = this.metrics.filter(
      (m) => Date.now() - m.timestamp < 24 * 60 * 60 * 1000
    );

    const successful = last24h.filter((m) => m.success);
    const failed = last24h.filter((m) => !m.success);

    const avgDuration =
      successful.length > 0
        ? successful.reduce((sum, m) => sum + m.duration, 0) / successful.length
        : 0;

    const slowReloads = successful.filter(
      (m) => m.duration > this.slowReloadThreshold
    );

    return {
      totalReloads: last24h.length,
      successfulReloads: successful.length,
      failedReloads: failed.length,
      averageDuration: Math.round(avgDuration),
      slowReloads: slowReloads.length,
      successRate:
        last24h.length > 0 ? (successful.length / last24h.length) * 100 : 0,
    };
  }
}
```

---

## Development Server Integration

### 1. Hot Reload Service

**Integration with Development Server:**

```typescript
// packages/core/src/hot-reload/service.ts
export class HotReloadService {
  private coordinator: HotReloadCoordinator;
  private performanceMonitor: HotReloadPerformanceMonitor;
  private errorRecovery: HotReloadErrorRecovery;
  private isEnabled = true;

  constructor(config: HotReloadConfig) {
    this.coordinator = new HotReloadCoordinator(config);
    this.performanceMonitor = new HotReloadPerformanceMonitor();
    this.errorRecovery = new HotReloadErrorRecovery();

    this.setupEventHandlers();
  }

  async start(): Promise<void> {
    if (!this.isEnabled) {
      console.log("🔥 Hot reload is disabled");
      return;
    }

    console.log("🔥 Starting hot reload service...");

    await this.coordinator.initialize();

    console.log("✅ Hot reload service started");
  }

  async stop(): Promise<void> {
    console.log("⏹️ Stopping hot reload service...");

    await this.coordinator.shutdown();

    console.log("✅ Hot reload service stopped");
  }

  private setupEventHandlers(): void {
    this.coordinator.on("reload-complete", (event) => {
      this.performanceMonitor.recordReloadMetric(
        event.type,
        event.duration,
        true
      );
    });

    this.coordinator.on("reload-error", async (error) => {
      this.performanceMonitor.recordReloadMetric(
        error.component,
        error.duration || 0,
        false
      );

      await this.errorRecovery.handleReloadError(error);
    });
  }

  getStatus(): HotReloadStatus {
    return {
      enabled: this.isEnabled,
      isProcessing: this.coordinator.isProcessing,
      queueLength: this.coordinator.getQueueLength(),
      performance: this.performanceMonitor.getPerformanceReport(),
    };
  }

  enable(): void {
    this.isEnabled = true;
    console.log("🔥 Hot reload enabled");
  }

  disable(): void {
    this.isEnabled = false;
    console.log("⏸️ Hot reload disabled");
  }
}
```

---

## Configuration Integration

### 1. Hot Reload Configuration

**TypeScript Configuration:**

```typescript
// farm.config.ts - Hot reload configuration
export default defineConfig({
  development: {
    hotReload: {
      enabled: true,

      // File watching configuration
      watch: {
        debounceMs: 100,
        usePolling: false,
        interval: 1000,
        paths: [
          {
            pattern: "apps/web/src/**/*",
            ignore: ["**/*.test.*", "**/node_modules/**"],
          },
          {
            pattern: "apps/api/src/**/*.py",
            ignore: ["**/__pycache__/**", "**/test_*.py"],
          },
          {
            pattern: "farm.config.ts",
          },
        ],
      },

      // Type generation settings
      typeGeneration: {
        enabled: true,
        debounceMs: 500,
        generateOnModelChange: true,
        generateOnRouteChange: true,
      },

      // AI model hot swapping
      aiModels: {
        enabled: true,
        hotSwap: true,
        preloadModels: true,
      },

      // Performance settings
      performance: {
        slowReloadThreshold: 5000,
        maxRetries: 3,
        cooldownPeriod: 5000,
      },

      // Error handling
      errorRecovery: {
        enabled: true,
        fallbackToRestart: true,
        logErrors: true,
      },
    },
  },
});
```

---

_Status: ✅ Completed - Ready for implementation_

This hot reload system provides:

- **Intelligent cross-stack reloading** across React, FastAPI, database, and AI systems
- **Dependency-aware updates** that minimize unnecessary reloads
- **Type generation hot reload** for seamless frontend-backend synchronization
- **AI model hot swapping** without service restarts
- **Database schema live updates** for development workflow
- **Plugin system hot reload** for dynamic plugin development
- **Comprehensive error recovery** with retry mechanisms and fallbacks
- **Performance monitoring** and optimization
- **Development server integration** with the existing architecture
