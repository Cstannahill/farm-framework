// File watcher integration for code intelligence
import type { CodeIntelligenceConfig } from "../config";
import type { CodeEntity } from "../types/index";

export interface FileWatcherIntegration {
  start(): Promise<void>;
  stop(): Promise<void>;
  on(event: string, callback: (...args: any[]) => void): void;
}

export class CodeIntelligenceWatcher {
  private config: CodeIntelligenceConfig;
  private watchers: Set<FileWatcherIntegration> = new Set();
  private batchQueue: string[] = [];
  private batchTimer?: NodeJS.Timeout;

  constructor(config: CodeIntelligenceConfig) {
    this.config = config;
  }

  /**
   * Start file watching for incremental indexing
   */
  async start(watcher?: FileWatcherIntegration): Promise<void> {
    if (!this.config.indexing.watch) {
      console.log("File watching disabled in config");
      return;
    }

    if (watcher) {
      this.watchers.add(watcher);
      await watcher.start();

      watcher.on("file:changed", (filePath: string) => {
        this.handleFileChange(filePath);
      });

      watcher.on("file:added", (filePath: string) => {
        this.handleFileChange(filePath);
      });

      watcher.on("file:deleted", (filePath: string) => {
        this.handleFileDelete(filePath);
      });
    }

    console.log("✅ Code intelligence file watcher started");
  }

  /**
   * Stop all file watchers
   */
  async stop(): Promise<void> {
    for (const watcher of this.watchers) {
      await watcher.stop();
    }
    this.watchers.clear();

    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = undefined;
    }

    console.log("🛑 Code intelligence file watcher stopped");
  }

  private handleFileChange(filePath: string): void {
    if (!this.shouldIndexFile(filePath)) {
      return;
    }

    console.log(`📝 File changed: ${filePath}`);

    if (this.config.indexing.incremental) {
      this.queueForBatchProcessing(filePath);
    } else {
      this.processFileImmediately(filePath);
    }
  }

  private handleFileDelete(filePath: string): void {
    if (!this.shouldIndexFile(filePath)) {
      return;
    }

    console.log(`🗑️  File deleted: ${filePath}`);
    this.removeFromIndex(filePath);
  }

  private shouldIndexFile(filePath: string): boolean {
    // Check include patterns
    if (this.config.indexing.include?.length) {
      const shouldInclude = this.config.indexing.include.some((pattern) =>
        this.matchesGlob(filePath, pattern)
      );
      if (!shouldInclude) {
        return false;
      }
    }

    // Check exclude patterns
    if (this.config.indexing.exclude?.length) {
      const shouldExclude = this.config.indexing.exclude.some((pattern) =>
        this.matchesGlob(filePath, pattern)
      );
      if (shouldExclude) {
        return false;
      }
    }

    return true;
  }

  private queueForBatchProcessing(filePath: string): void {
    this.batchQueue.push(filePath);

    // Debounce batch processing
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
    }

    this.batchTimer = setTimeout(() => {
      this.processBatch();
    }, 1000); // 1 second debounce
  }

  private async processBatch(): Promise<void> {
    if (this.batchQueue.length === 0) {
      return;
    }

    const files = [...this.batchQueue];
    this.batchQueue = [];

    console.log(`🔄 Processing batch of ${files.length} files`);

    // Group into batches based on config
    const batchSize = this.config.indexing.batchSize || 10;

    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize);
      await this.processBatchFiles(batch);
    }
  }

  private async processBatchFiles(files: string[]): Promise<void> {
    console.log(`Processing files: ${files.join(", ")}`);

    for (const file of files) {
      await this.processFileImmediately(file);
    }
  }

  private async processFileImmediately(filePath: string): Promise<void> {
    try {
      console.log(`🔍 Indexing: ${filePath}`);

      // Mock entity extraction
      const entities: CodeEntity[] = [];

      // Add to index
      await this.addToIndex(filePath, entities);
    } catch (error) {
      console.error(`Error processing ${filePath}:`, error);
    }
  }

  private async addToIndex(
    filePath: string,
    entities: CodeEntity[]
  ): Promise<void> {
    console.log(`📚 Added ${entities.length} entities from ${filePath}`);
  }

  private async removeFromIndex(filePath: string): Promise<void> {
    console.log(`🗑️  Removed entities from ${filePath}`);
  }

  private matchesGlob(filePath: string, pattern: string): boolean {
    // Simple glob matching
    const regex = pattern
      .replace(/\./g, "\\.")
      .replace(/\*/g, ".*")
      .replace(/\?/g, ".");

    return new RegExp(`^${regex}$`).test(filePath);
  }
}
