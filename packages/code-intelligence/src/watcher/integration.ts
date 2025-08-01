import type { CodeIntelligenceConfig } from "../config";
import * as fs from "fs/promises";
import * as path from "path";

export interface FileWatcherIntegration {
  start(): Promise<void>;
  stop(): Promise<void>;
  on(event: string, callback: (...args: any[]) => void): void;
}

export class CodeIntelligenceWatcher {
  private config: CodeIntelligenceConfig;
  private watchers: Set<FileWatcherIntegration> = new Set();
  private batchQueue: Map<string, { action: "add" | "delete"; timestamp: number }> = new Map();
  private batchTimer?: NodeJS.Timeout;

  constructor(config: CodeIntelligenceConfig) {
    this.config = config;
  }

  /**
   * Start file watching for incremental indexing
   */
  async start(watcher?: FileWatcherIntegration): Promise<void> {
    console.log("👀 Starting file watching for incremental indexing...");

    if (watcher) {
      // Use provided watcher (e.g., VSCode file watcher)
      this.watchers.add(watcher);
      
      watcher.on("change", (filePath: string) => {
        this.handleFileChange(filePath);
      });
      
      watcher.on("delete", (filePath: string) => {
        this.handleFileDelete(filePath);
      });
      
      await watcher.start();
    } else {
      // Use Node.js fs.watch as fallback
      await this.startNodeWatcher();
    }

    console.log("✅ File watching started");
  }

  /**
   * Stop all file watchers
   */
  async stop(): Promise<void> {
    console.log("👀 Stopping file watchers...");

    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      await this.processBatch(); // Process any remaining items
    }

    for (const watcher of this.watchers) {
      await watcher.stop();
    }

    this.watchers.clear();
    console.log("✅ File watchers stopped");
  }

  private async startNodeWatcher(): Promise<void> {
    // Simple Node.js fs.watch implementation
    const watchPath = this.config.projectRoot || process.cwd();
    
    const nodeWatcher: FileWatcherIntegration = {
      start: async () => {
        // In a real implementation, this would use fs.watch recursively
        console.log(`👀 Watching ${watchPath} with Node.js fs.watch`);
      },
      
      stop: async () => {
        console.log("👀 Node.js watcher stopped");
      },
      
      on: (event: string, callback: (...args: any[]) => void) => {
        // Mock implementation - would wire up actual fs.watch events
      }
    };

    this.watchers.add(nodeWatcher);
    await nodeWatcher.start();
  }

  private handleFileChange(filePath: string): void {
    if (!this.shouldIndexFile(filePath)) {
      return;
    }

    console.log(`📝 File changed: ${filePath}`);

    if (this.config.indexing?.batchUpdates) {
      this.queueForBatchProcessing(filePath, "add");
    } else {
      this.processFileImmediately(filePath, "add");
    }
  }

  private handleFileDelete(filePath: string): void {
    if (!this.shouldIndexFile(filePath)) {
      return;
    }

    console.log(`🗑️ File deleted: ${filePath}`);

    if (this.config.indexing?.batchUpdates) {
      this.queueForBatchProcessing(filePath, "delete");
    } else {
      this.processFileImmediately(filePath, "delete");
    }
  }

  private shouldIndexFile(filePath: string): boolean {
    const ext = path.extname(filePath);
    const allowedExtensions = this.config.indexing?.fileExtensions || [".ts", ".tsx", ".js", ".jsx"];
    
    if (!allowedExtensions.includes(ext)) {
      return false;
    }

    const excludePatterns = this.config.indexing?.exclude || [
      "**/node_modules/**",
      "**/dist/**",
      "**/build/**",
      "**/.git/**",
    ];

    const relativePath = path.relative(process.cwd(), filePath);
    return !excludePatterns.some(pattern => this.matchesGlob(relativePath, pattern));
  }

  private queueForBatchProcessing(filePath: string, action: "add" | "delete"): void {
    this.batchQueue.set(filePath, {
      action,
      timestamp: Date.now(),
    });

    // Clear existing timer and set a new one
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
    }

    const batchDelay = this.config.indexing?.batchDelay || 1000; // 1 second default
    this.batchTimer = setTimeout(() => {
      this.processBatch();
    }, batchDelay);
  }

  private async processBatch(): Promise<void> {
    if (this.batchQueue.size === 0) {
      return;
    }

    console.log(`📦 Processing batch of ${this.batchQueue.size} file changes...`);

    const items = Array.from(this.batchQueue.entries());
    this.batchQueue.clear();

    // Group by action type
    const toAdd = items.filter(([, item]) => item.action === "add").map(([path]) => path);
    const toDelete = items.filter(([, item]) => item.action === "delete").map(([path]) => path);

    try {
      // Process deletions first
      if (toDelete.length > 0) {
        await Promise.all(toDelete.map(filePath => this.removeFromIndex(filePath)));
      }

      // Then process additions/updates
      if (toAdd.length > 0) {
        await this.processBatchFiles(toAdd);
      }

      console.log(`✅ Batch processing complete (${toAdd.length} added, ${toDelete.length} deleted)`);
    } catch (error) {
      console.error("❌ Batch processing failed:", error);
    }
  }

  private async processBatchFiles(filePaths: string[]): Promise<void> {
    const fileContents = await Promise.all(
      filePaths.map(async (filePath) => {
        try {
          const content = await fs.readFile(filePath, "utf-8");
          return { path: filePath, content };
        } catch (error) {
          console.warn(`Failed to read ${filePath}:`, error);
          return null;
        }
      })
    );

    const validFiles = fileContents.filter(Boolean) as Array<{ path: string; content: string }>;
    
    if (validFiles.length > 0) {
      await this.addToIndex(validFiles);
    }
  }

  private async processFileImmediately(filePath: string, action: "add" | "delete"): Promise<void> {
    try {
      if (action === "add") {
        const content = await fs.readFile(filePath, "utf-8");
        await this.addToIndex([{ path: filePath, content }]);
      } else {
        await this.removeFromIndex(filePath);
      }
    } catch (error) {
      console.error(`Failed to process ${filePath}:`, error);
    }
  }

  private async addToIndex(files: Array<{ path: string; content: string }>): Promise<void> {
    // This would interface with the semantic search engine
    // For now, we'll just log the action
    console.log(`📚 Adding ${files.length} files to index:`, files.map(f => f.path));
    
    // In real implementation:
    // await this.semanticSearch.indexFiles(files);
  }

  private async removeFromIndex(filePath: string): Promise<void> {
    // This would interface with the semantic search engine
    console.log(`🗑️ Removing ${filePath} from index`);
    
    // In real implementation:
    // await this.semanticSearch.removeFile(filePath);
  }

  private matchesGlob(filePath: string, pattern: string): boolean {
    // Simple glob matching - in production, use a proper glob library
    const regexPattern = pattern
      .replace(/\*\*/g, ".*")
      .replace(/\*/g, "[^/]*")
      .replace(/\?/g, "[^/]");
    
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(filePath);
  }
}