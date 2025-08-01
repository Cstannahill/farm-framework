import type { CodeIntelligenceConfig } from "./config";
import type { 
  QueryRequest, 
  QueryResponse, 
  ExplanationResponse, 
  IndexStatus, 
  CodeEntity 
} from "./types/index";

import { createSemanticSearch } from "./vector";
import { CodeExplanationEngine } from "./explanation/engine";
import { TypeScriptParser } from "./explanation/parser";
import { OllamaProvider, MockProvider } from "./providers";
import * as fs from "fs/promises";
import * as path from "path";

export class CodeIntelligenceServer {
  private config: CodeIntelligenceConfig;
  private projectRoot: string;
  private semanticSearch: any; // SemanticSearchEngine
  private explanationEngine!: CodeExplanationEngine;
  private watcher: any; // File watcher
  private isStarted: boolean = false;

  constructor(config: CodeIntelligenceConfig, projectRoot: string) {
    this.config = config;
    this.projectRoot = projectRoot;
  }

  /**
   * Start the code intelligence server
   */
  async start(): Promise<void> {
    if (this.isStarted) {
      console.log("🚀 Server already started");
      return;
    }

    try {
      console.log("🚀 Starting Code Intelligence Server...");

      // Initialize semantic search
      this.semanticSearch = await createSemanticSearch({
        provider: "chromadb",
        embeddingModel: (this.config.vector?.embeddingModel as "code" | "general" | "fast") || "fast",
        collectionName: this.config.vector?.collectionName || "code-intelligence",
        persistPath: this.config.vector?.persistPath,
        device: (this.config.vector?.device as "cpu" | "cuda") || "cpu",
      });

      // Initialize AI provider
      const aiProvider = this.config.ai?.provider === "ollama" 
        ? new OllamaProvider({
            baseUrl: this.config.ai.ollamaUrl,
            model: this.config.ai.model,
            timeout: this.config.ai.timeout,
          })
        : new MockProvider(500);

      // Initialize explanation engine
      const parser = new TypeScriptParser();
      this.explanationEngine = new CodeExplanationEngine(
        aiProvider,
        parser,
        this.projectRoot
      );

      // Index the project initially
      if (this.config.indexing?.indexOnStart) {
        await this.indexProject();
      }

      // Set up file watching if enabled
      if (this.config.indexing?.watchFiles) {
        await this.setupFileWatcher();
      }

      this.isStarted = true;
      console.log("✅ Code Intelligence Server started successfully");

    } catch (error) {
      console.error("❌ Failed to start server:", error);
      throw error;
    }
  }

  /**
   * Stop the code intelligence server
   */
  async stop(): Promise<void> {
    if (!this.isStarted) {
      return;
    }

    console.log("🛑 Stopping Code Intelligence Server...");

    try {
      // Stop file watcher
      if (this.watcher) {
        await this.watcher.close();
      }

      // Clean up semantic search
      if (this.semanticSearch) {
        // Assuming the search engine has a cleanup method
        await this.semanticSearch.getStats(); // Keep connection alive until explicitly closed
      }

      this.isStarted = false;
      console.log("✅ Server stopped successfully");

    } catch (error) {
      console.error("❌ Error stopping server:", error);
      throw error;
    }
  }

  /**
   * Execute a query against the codebase
   */
  async query(request: QueryRequest): Promise<QueryResponse> {
    if (!this.isStarted) {
      throw new Error("Server not started");
    }

    try {
      return await this.semanticSearch.search(request);
    } catch (error) {
      console.error("Query error:", error);
      return {
        results: [],
        error: error instanceof Error ? error.message : "Query failed",
        metrics: {
          totalResults: 0,
          searchTime: 0,
          cacheHit: false,
        },
      };
    }
  }

  /**
   * Explain a code entity
   */
  async explainEntity(entityName: string, options: any = {}): Promise<ExplanationResponse> {
    if (!this.isStarted) {
      throw new Error("Server not started");
    }

    try {
      return await this.explanationEngine.explainEntity(entityName, options);
    } catch (error) {
      console.error("Explanation error:", error);
      throw error;
    }
  }

  /**
   * Get index status
   */
  async getStatus(): Promise<IndexStatus> {
    if (!this.isStarted) {
      return {
        indexedFiles: 0,
        totalEntities: 0,
        lastUpdated: new Date(),
        indexHealth: "rebuilding",
        vectorCount: 0,
        processingQueue: 0,
        errors: [],
      };
    }

    try {
      const stats = await this.semanticSearch.getStats();
      
      return {
        indexedFiles: stats.totalDocuments,
        totalEntities: stats.totalVectors,
        lastUpdated: stats.lastUpdated,
        indexHealth: "healthy",
        vectorCount: stats.totalVectors,
        processingQueue: 0,
        errors: [],
      };
    } catch (error) {
      console.error("Status error:", error);
      return {
        indexedFiles: 0,
        totalEntities: 0,
        lastUpdated: new Date(),
        indexHealth: "degraded",
        vectorCount: 0,
        processingQueue: 0,
        errors: [{
          file: "system",
          error: error instanceof Error ? error.message : "Unknown error",
          timestamp: new Date(),
          severity: "error",
        }],
      };
    }
  }

  /**
   * Trigger full reindex
   */
  async reindex(): Promise<{ message: string; taskId: string }> {
    if (!this.isStarted) {
      throw new Error("Server not started");
    }

    const taskId = `reindex-${Date.now()}`;
    
    // Start reindexing in background
    this.indexProject().catch(error => {
      console.error("Reindex error:", error);
    });

    return {
      message: "Reindexing started",
      taskId,
    };
  }

  /**
   * Reset the index
   */
  async reset(): Promise<void> {
    if (!this.isStarted) {
      throw new Error("Server not started");
    }

    await this.semanticSearch.reset();
  }

  /**
   * Index files
   */
  async indexFiles(files: Array<{ path: string; content: string }>): Promise<void> {
    if (!this.isStarted) {
      throw new Error("Server not started");
    }

    await this.semanticSearch.indexFiles(files);
  }

  /**
   * Index the project initially
   */
  async indexProject(): Promise<void> {
    console.log("📚 Starting project indexing...");
    
    try {
      const files = await this.findCodeFiles();
      console.log(`📄 Found ${files.length} code files to index`);

      const fileContents = await Promise.all(
        files.map(async (filePath) => {
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
        await this.semanticSearch.indexFiles(validFiles);
        console.log(`✅ Indexed ${validFiles.length} files successfully`);
      }

    } catch (error) {
      console.error("❌ Project indexing failed:", error);
      throw error;
    }
  }

  /**
   * Search for entities
   */
  async searchEntities(pattern: string, maxResults: number = 10): Promise<CodeEntity[]> {
    const response = await this.query({
      query: pattern,
      maxResults,
      includeContext: false,
    });

    return response.results.map(r => r.entity);
  }

  /**
   * Find usages of an entity
   */
  async findUsages(entityName: string): Promise<CodeEntity[]> {
    const response = await this.query({
      query: `usages of ${entityName}`,
      maxResults: 50,
      includeContext: true,
    });

    return response.results.map(r => r.entity);
  }

  private async findCodeFiles(): Promise<string[]> {
    const files: string[] = [];
    const extensions = this.config.indexing?.fileExtensions || [".ts", ".tsx", ".js", ".jsx"];
    const excludePatterns = this.config.indexing?.exclude || [
      "**/node_modules/**",
      "**/dist/**",
      "**/build/**",
      "**/.git/**",
    ];

    async function walkDir(dir: string): Promise<void> {
      try {
        const items = await fs.readdir(dir, { withFileTypes: true });

        for (const item of items) {
          const fullPath = path.join(dir, item.name);
          const relativePath = path.relative(process.cwd(), fullPath);

          // Check exclude patterns
          const shouldExclude = excludePatterns.some(pattern =>
            relativePath.includes(pattern.replace(/\*\*/g, "").replace(/\*/g, ""))
          );

          if (shouldExclude) continue;

          if (item.isDirectory()) {
            await walkDir(fullPath);
          } else if (item.isFile()) {
            const ext = path.extname(item.name);
            if (extensions.includes(ext)) {
              files.push(fullPath);
            }
          }
        }
      } catch (error) {
        console.warn(`Failed to read directory ${dir}:`, error);
      }
    }

    await walkDir(this.projectRoot);
    return files;
  }

  private async setupFileWatcher(): Promise<void> {
    // Mock file watcher implementation
    console.log("👀 File watching not yet implemented");
    
    // In a real implementation, this would use fs.watch or chokidar
    // to monitor file changes and update the index accordingly
    this.watcher = {
      close: async () => {
        console.log("👀 File watcher closed");
      }
    };
  }
}