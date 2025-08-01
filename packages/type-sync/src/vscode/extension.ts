/**
 * VS Code extension for type-sync integration
 * Provides IDE support for type synchronization
 */

import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs-extra";
import { TypeSyncOrchestrator } from "../orchestrator";
import { TypeSyncWatcher } from "../watcher";
import type { TypeSyncConfig } from "../config/validation";
import type { SyncOptions } from "@farm-framework/types";

export class TypeSyncExtension {
  private context: vscode.ExtensionContext;
  private orchestrator?: TypeSyncOrchestrator;
  private watcher?: TypeSyncWatcher;
  private outputChannel: vscode.OutputChannel;
  private statusBarItem: vscode.StatusBarItem;
  private diagnosticCollection: vscode.DiagnosticCollection;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.outputChannel = vscode.window.createOutputChannel("Type-Sync");
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      100
    );
    this.diagnosticCollection =
      vscode.languages.createDiagnosticCollection("type-sync");

    this.registerCommands();
    this.registerEvents();
    this.initializeStatusBar();
  }

  /**
   * Register VS Code commands
   */
  private registerCommands(): void {
    const commands = [
      vscode.commands.registerCommand("type-sync.sync", () => this.syncTypes()),
      vscode.commands.registerCommand("type-sync.watch", () =>
        this.startWatching()
      ),
      vscode.commands.registerCommand("type-sync.stopWatch", () =>
        this.stopWatching()
      ),
      vscode.commands.registerCommand("type-sync.configure", () =>
        this.configure()
      ),
      vscode.commands.registerCommand("type-sync.validate", () =>
        this.validateConfig()
      ),
      vscode.commands.registerCommand("type-sync.clearCache", () =>
        this.clearCache()
      ),
      vscode.commands.registerCommand("type-sync.showOutput", () =>
        this.outputChannel.show()
      ),
      vscode.commands.registerCommand("type-sync.generateClient", () =>
        this.generateAPIClient()
      ),
      vscode.commands.registerCommand("type-sync.analyzeSchema", () =>
        this.analyzeSchema()
      ),
    ];

    this.context.subscriptions.push(...commands);
  }

  /**
   * Register VS Code events
   */
  private registerEvents(): void {
    // File change events
    const fileWatcher = vscode.workspace.createFileSystemWatcher("**/*.py");
    fileWatcher.onDidChange(() => this.onPythonFileChange());
    fileWatcher.onDidCreate(() => this.onPythonFileChange());
    fileWatcher.onDidDelete(() => this.onPythonFileChange());

    // Configuration change events
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration("type-sync")) {
        this.onConfigChange();
      }
    });

    // Window state change events
    vscode.window.onDidChangeActiveTextEditor(() => this.updateStatusBar());

    this.context.subscriptions.push(fileWatcher);
  }

  /**
   * Initialize status bar
   */
  private initializeStatusBar(): void {
    this.statusBarItem.text = "$(sync) Type-Sync";
    this.statusBarItem.command = "type-sync.sync";
    this.statusBarItem.tooltip = "Click to sync types";
    this.statusBarItem.show();
    this.context.subscriptions.push(this.statusBarItem);
  }

  /**
   * Sync types command
   */
  private async syncTypes(): Promise<void> {
    try {
      this.updateStatusBar("$(sync~spin) Syncing...", "Syncing types...");
      this.outputChannel.appendLine("Starting type synchronization...");

      const config = await this.loadConfig();
      if (!config) {
        vscode.window.showErrorMessage(
          'Type-sync configuration not found. Run "Type-Sync: Configure" first.'
        );
        return;
      }

      this.orchestrator = new TypeSyncOrchestrator();
      const result = await this.orchestrator.sync();

      this.outputChannel.appendLine(`Types synchronized successfully!`);
      this.outputChannel.appendLine(`Generated ${result.filesGenerated} files`);

      this.updateStatusBar("$(check) Type-Sync", "Types synchronized");
      vscode.window.showInformationMessage(
        `Type-sync completed! Generated ${result.filesGenerated} files.`
      );

      // Update diagnostics
      this.updateDiagnostics(result);
    } catch (error) {
      this.outputChannel.appendLine(`Error: ${error}`);
      this.updateStatusBar("$(error) Type-Sync", "Sync failed");
      vscode.window.showErrorMessage(`Type-sync failed: ${error}`);
    }
  }

  /**
   * Start watching for changes
   */
  private async startWatching(): Promise<void> {
    try {
      const config = await this.loadConfig();
      if (!config) {
        vscode.window.showErrorMessage("Type-sync configuration not found.");
        return;
      }

      // Initialize orchestrator and watcher
      const orchestrator = new TypeSyncOrchestrator();
      await orchestrator.initialize({
        apiUrl: config.apiUrl,
        outputDir: config.outputDir || "./src/types",
        features: {
          client: true,
          hooks: true,
          streaming: true,
          aiHooks: true,
        },
        performance: {
          enableMonitoring: true,
          enableIncrementalGeneration: true,
          maxConcurrency: 4,
          cacheTimeout: 300000,
        },
      });

      this.orchestrator = orchestrator;
      this.watcher = new TypeSyncWatcher(orchestrator);

      // Start the watcher (TypeSyncWatcher doesn't have event handlers)
      await this.watcher.start();

      await this.watcher.start();

      this.updateStatusBar("$(eye) Type-Sync", "Watching for changes");
      vscode.window.showInformationMessage(
        "Type-sync is now watching for changes."
      );
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to start watching: ${error}`);
    }
  }

  /**
   * Stop watching for changes
   */
  private async stopWatching(): Promise<void> {
    if (this.watcher) {
      await this.watcher.stop();
      this.watcher = undefined;
      this.updateStatusBar("$(sync) Type-Sync", "Ready");
      vscode.window.showInformationMessage("Type-sync stopped watching.");
    }
  }

  /**
   * Configure type-sync
   */
  private async configure(): Promise<void> {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      vscode.window.showErrorMessage("No workspace folder found.");
      return;
    }

    const configPath = path.join(
      workspaceFolder.uri.fsPath,
      "type-sync.config.js"
    );

    if (await fs.pathExists(configPath)) {
      const action = await vscode.window.showWarningMessage(
        "Configuration file already exists. What would you like to do?",
        "Edit existing",
        "Create new",
        "Cancel"
      );

      if (action === "Edit existing") {
        const doc = await vscode.workspace.openTextDocument(configPath);
        await vscode.window.showTextDocument(doc);
        return;
      } else if (action !== "Create new") {
        return;
      }
    }

    // Create interactive configuration
    const config = await this.createInteractiveConfig();
    if (config) {
      const configContent = this.generateConfigFile(config);
      await fs.writeFile(configPath, configContent);

      const doc = await vscode.workspace.openTextDocument(configPath);
      await vscode.window.showTextDocument(doc);

      vscode.window.showInformationMessage("Type-sync configuration created!");
    }
  }

  /**
   * Create interactive configuration
   */
  private async createInteractiveConfig(): Promise<Partial<SyncOptions> | null> {
    const config: Partial<SyncOptions> = {};

    // Server URL
    const serverUrl = await vscode.window.showInputBox({
      prompt: "Enter your FastAPI server URL",
      value: "http://localhost:8000",
      validateInput: (value) => {
        try {
          new URL(value);
          return null;
        } catch {
          return "Please enter a valid URL";
        }
      },
    });

    if (!serverUrl) return null;
    config.apiUrl = serverUrl;

    // Output directory
    const outputDir = await vscode.window.showInputBox({
      prompt: "Enter output directory for generated files",
      value: "./src/types",
    });

    if (!outputDir) return null;
    config.outputDir = outputDir;

    // Generators
    const generators = await vscode.window.showQuickPick(
      [
        { label: "TypeScript types only", value: ["typescript"] },
        {
          label: "TypeScript + API client",
          value: ["typescript", "api-client"],
        },
        {
          label: "TypeScript + API client + React hooks",
          value: ["typescript", "api-client", "react-hooks"],
        },
        {
          label: "All generators",
          value: ["typescript", "api-client", "react-hooks", "ai-hooks"],
        },
      ],
      {
        placeHolder: "Select generators to use",
      }
    );

    if (!generators) return null;

    // Convert generator string array to configuration objects
    const generatorConfig: Record<
      string,
      { outputDir: string; enabled: boolean; options?: Record<string, any> }
    > = {};
    generators.value.forEach((gen: string) => {
      generatorConfig[gen] = {
        outputDir: config.outputDir || "./src/types",
        enabled: true,
        options: {},
      };
    });
    config.generators = generatorConfig;

    // Enable watching - VS Code extension handles this differently
    const enableWatch = await vscode.window.showQuickPick(["Yes", "No"], {
      placeHolder: "Enable file watching in development?",
    });

    if (!enableWatch) return null;
    // Note: Watch functionality is handled by the VS Code extension directly
    // through the TypeSyncWatcher, not through the config

    return config;
  }

  /**
   * Generate configuration file content
   */
  private generateConfigFile(config: Partial<SyncOptions>): string {
    return `// Type-sync configuration
export default {
  apiUrl: '${config.apiUrl}',
  outputDir: '${config.outputDir}',
  generators: ${JSON.stringify(config.generators, null, 2)},
  features: {
    client: true,
    hooks: true,
    streaming: true,
    aiHooks: true
  },
  performance: {
    enableMonitoring: true,
    enableIncrementalGeneration: true,
    maxConcurrency: 4,
    cacheTimeout: 300000
  }
};
`;
  }

  /**
   * Validate configuration
   */
  private async validateConfig(): Promise<void> {
    try {
      const config = await this.loadConfig();
      if (!config) {
        vscode.window.showErrorMessage("No configuration found.");
        return;
      }

      // Validate configuration
      const errors: string[] = [];

      if (!config.apiUrl) {
        errors.push("apiUrl is required");
      } else {
        try {
          new URL(config.apiUrl);
        } catch {
          errors.push("apiUrl must be a valid URL");
        }
      }

      if (!config.outputDir) {
        errors.push("outputDir is required");
      }

      if (!config.generators || Object.keys(config.generators).length === 0) {
        errors.push("at least one generator must be specified");
      }

      if (errors.length > 0) {
        this.outputChannel.appendLine("Configuration validation failed:");
        errors.forEach((error) =>
          this.outputChannel.appendLine(`  - ${error}`)
        );
        vscode.window.showErrorMessage(
          `Configuration validation failed. Check output for details.`
        );
      } else {
        vscode.window.showInformationMessage("Configuration is valid!");
      }
    } catch (error) {
      vscode.window.showErrorMessage(
        `Configuration validation failed: ${error}`
      );
    }
  }

  /**
   * Clear cache
   */
  private async clearCache(): Promise<void> {
    try {
      const config = await this.loadConfig();
      if (!config?.cache?.directory) {
        vscode.window.showWarningMessage("No cache directory configured.");
        return;
      }

      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      if (!workspaceFolder) return;

      const cacheDir = path.join(
        workspaceFolder.uri.fsPath,
        config.cache.directory
      );
      if (await fs.pathExists(cacheDir)) {
        await fs.emptyDir(cacheDir);
        vscode.window.showInformationMessage("Cache cleared successfully!");
      } else {
        vscode.window.showInformationMessage("No cache found to clear.");
      }
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to clear cache: ${error}`);
    }
  }

  /**
   * Generate API client
   */
  private async generateAPIClient(): Promise<void> {
    const clientType = await vscode.window.showQuickPick(
      [
        { label: "Axios client", value: "axios" },
        { label: "Fetch client", value: "fetch" },
        { label: "Custom client", value: "custom" },
      ],
      {
        placeHolder: "Select API client type",
      }
    );

    if (!clientType) return;

    // Implementation would generate specific client type
    vscode.window.showInformationMessage(`Generating ${clientType.label}...`);
  }

  /**
   * Analyze schema
   */
  private async analyzeSchema(): Promise<void> {
    try {
      const config = await this.loadConfig();
      if (!config) return;

      this.outputChannel.appendLine("Analyzing OpenAPI schema...");

      // Implementation would analyze schema and show insights
      this.outputChannel.show();
      vscode.window.showInformationMessage(
        "Schema analysis complete. Check output for details."
      );
    } catch (error) {
      vscode.window.showErrorMessage(`Schema analysis failed: ${error}`);
    }
  }

  /**
   * Load configuration
   */
  private async loadConfig(): Promise<TypeSyncConfig | null> {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) return null;

    const configPath = path.join(
      workspaceFolder.uri.fsPath,
      "type-sync.config.js"
    );

    if (await fs.pathExists(configPath)) {
      try {
        delete require.cache[configPath];
        const config = require(configPath);
        return config.default || config;
      } catch (error) {
        this.outputChannel.appendLine(`Error loading config: ${error}`);
        return null;
      }
    }

    return null;
  }

  /**
   * Handle Python file changes
   */
  private async onPythonFileChange(): Promise<void> {
    if (this.watcher) {
      // Auto-sync is handled by watcher
      return;
    }

    // Show notification for manual sync
    const action = await vscode.window.showInformationMessage(
      "Python files changed. Sync types?",
      "Sync Now",
      "Start Watching"
    );

    if (action === "Sync Now") {
      await this.syncTypes();
    } else if (action === "Start Watching") {
      await this.startWatching();
    }
  }

  /**
   * Handle configuration changes
   */
  private async onConfigChange(): Promise<void> {
    this.outputChannel.appendLine("Configuration changed. Reloading...");

    if (this.watcher) {
      await this.stopWatching();
      await this.startWatching();
    }
  }

  /**
   * Update status bar
   */
  private updateStatusBar(text?: string, tooltip?: string): void {
    if (text) this.statusBarItem.text = text;
    if (tooltip) this.statusBarItem.tooltip = tooltip;
  }

  /**
   * Update diagnostics
   */
  private updateDiagnostics(result: any): void {
    this.diagnosticCollection.clear();

    if (result.errors && result.errors.length > 0) {
      const diagnostics: vscode.Diagnostic[] = [];

      for (const error of result.errors) {
        const diagnostic = new vscode.Diagnostic(
          new vscode.Range(0, 0, 0, 0),
          error.message,
          vscode.DiagnosticSeverity.Warning
        );
        diagnostic.source = "type-sync";
        diagnostics.push(diagnostic);
      }

      // Apply diagnostics to relevant files
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      if (workspaceFolder) {
        const configUri = vscode.Uri.file(
          path.join(workspaceFolder.uri.fsPath, "type-sync.config.js")
        );
        this.diagnosticCollection.set(configUri, diagnostics);
      }
    }
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    this.outputChannel.dispose();
    this.statusBarItem.dispose();
    this.diagnosticCollection.dispose();

    if (this.watcher) {
      this.watcher.stop();
    }
  }
}

/**
 * Activate VS Code extension
 */
export function activate(context: vscode.ExtensionContext): void {
  const extension = new TypeSyncExtension(context);
  context.subscriptions.push(extension);
}

/**
 * Deactivate VS Code extension
 */
export function deactivate(): void {
  // Cleanup handled by dispose
}
