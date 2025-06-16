// Updated Code Intelligence Server with Vector Database Integration
import type { CodeIntelligenceConfig } from "./config";
import type {
  QueryRequest,
  QueryResponse,
  ExplanationResponse,
  IndexStatus,
  CodeEntity,
} from "./types/index";
import { SemanticSearchEngine, createSemanticSearch } from "./vector";
import { CodeExplanationEngine } from "./explanation/engine";
import { TypeScriptParser } from "./explanation/parser";
import { MockProvider, OllamaProvider } from "./providers";
import * as fs from "fs/promises";
import * as path from "path";
import { glob } from "glob";

export class CodeIntelligenceServer {
  private config: CodeIntelligenceConfig;
  private projectRoot: string;
  private semanticSearch: SemanticSearchEngine | null = null;
  private explanationEngine: CodeExplanationEngine | null = null;
  private watcher: any; // File system watcher
  private isStarted = false;

  constructor(config: CodeIntelligenceConfig, projectRoot: string) {
    this.config = config;
    this.projectRoot = projectRoot;
  }

  /**
   * Start the code intelligence server
   */
  async start(): Promise<void> {
    if (this.isStarted) {
      return;
    }

    console.log("🧠 Starting FARM Code Intelligence with Vector Database...");

    try {
      // Initialize semantic search engine
      await this.initializeSemanticSearch();

      // Initialize explanation engine
      await this.initializeExplanationEngine();

      // Start file watcher if enabled
      if (this.config.indexing.watch) {
        await this.startFileWatcher();
      }

      // Perform initial indexing
      await this.performInitialIndexing();

      this.isStarted = true;
      console.log("✅ Code Intelligence ready!");
    } catch (error) {
      console.error("❌ Failed to start Code Intelligence:", error);
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

    console.log("🛑 Stopping Code Intelligence...");

    try {
      // Stop file watcher
      if (this.watcher) {
        await this.watcher.stop();
      }

      // Close semantic search
      if (this.semanticSearch) {
        // The vector store will be closed by the search engine
      }

      this.isStarted = false;
      console.log("✅ Code Intelligence stopped");
    } catch (error) {
      console.error("❌ Error stopping Code Intelligence:", error);
      throw error;
    }
  }

  /**
   * Execute a query against the codebase using semantic search
   */
  async query(request: QueryRequest): Promise<QueryResponse> {
    if (!this.isStarted || !this.semanticSearch) {
      throw new Error("Code Intelligence server is not started");
    }

    try {
      console.log(`🔍 Processing query: "${request.query}"`);
      return await this.semanticSearch.search(request);
    } catch (error) {
      console.error("Query failed:", error);
      throw error;
    }
  }

  /**
   * Explain a code entity using AI
   */
  async explain(
    entityName: string,
    options: any = {}
  ): Promise<ExplanationResponse> {
    if (!this.isStarted || !this.explanationEngine) {
      throw new Error("Code Intelligence server is not started");
    }

    try {
      console.log(`📝 Explaining entity: "${entityName}"`);
      return await this.explanationEngine.explainEntity(entityName, options);
    } catch (error) {
      console.error("Explanation failed:", error);
      throw error;
    }
  }

  /**
   * Get index status
   */
  async getStatus(): Promise<IndexStatus> {
    if (!this.isStarted || !this.semanticSearch) {
      return {
        indexedFiles: 0,
        totalEntities: 0,
        lastUpdated: new Date(),
        indexHealth: "initializing",
        vectorCount: 0,
        processingQueue: 0,
        errors: [],
      };
    }

    try {
      const stats = await this.semanticSearch.getStats();

      return {
        indexedFiles: stats.collections.length,
        totalEntities: stats.totalDocuments,
        lastUpdated: stats.lastUpdated,
        indexHealth: "healthy",
        vectorCount: stats.totalVectors,
        processingQueue: 0,
        errors: [],
      };
    } catch (error) {
      console.error("Failed to get status:", error);
      return {
        indexedFiles: 0,
        totalEntities: 0,
        lastUpdated: new Date(),
        indexHealth: "error",
        vectorCount: 0,
        processingQueue: 0,
        errors: [error instanceof Error ? error.message : String(error)],
      };
    }
  }

  /**
   * Trigger full reindex
   */
  async reindex(): Promise<{ message: string; taskId: string }> {
    if (!this.isStarted || !this.semanticSearch) {
      throw new Error("Code Intelligence server is not started");
    }

    try {
      console.log("🔄 Starting full reindex...");

      // Reset the search index
      await this.semanticSearch.reset();

      // Perform full indexing
      await this.performInitialIndexing();

      const taskId = `reindex-${Date.now()}`;
      return {
        message: "Reindex completed",
        taskId,
      };
    } catch (error) {
      console.error("Reindex failed:", error);
      throw error;
    }
  }

  /**
   * Index a single file
   */
  async indexFile(filePath: string): Promise<void> {
    if (!this.isStarted || !this.semanticSearch) {
      throw new Error("Code Intelligence server is not started");
    }

    try {
      const content = await fs.readFile(filePath, "utf-8");
      await this.semanticSearch.indexFile(filePath, content);
      console.log(`📄 Indexed file: ${filePath}`);
    } catch (error) {
      console.error(`Failed to index file ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Remove a file from the index
   */
  async removeFile(filePath: string): Promise<void> {
    if (!this.isStarted || !this.semanticSearch) {
      throw new Error("Code Intelligence server is not started");
    }

    try {
      await this.semanticSearch.removeFile(filePath);
      console.log(`🗑️ Removed file from index: ${filePath}`);
    } catch (error) {
      console.error(`Failed to remove file ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Search for entities
   */
  async searchEntities(
    pattern: string,
    maxResults = 10
  ): Promise<CodeEntity[]> {
    const response = await this.query({
      query: pattern,
      maxResults,
      includeContext: false,
    });

    return response.results.map((r: any) => ({
      id: r.id,
      name: r.title,
      entityType: r.entityType,
      filePath: r.filePath,
      startLine: r.startLine,
      endLine: r.endLine,
      content: r.content,
    }));
  }

  /**
   * Find similar entities
   */
  async findSimilarEntities(
    entityId: string,
    limit = 10
  ): Promise<CodeEntity[]> {
    if (!this.isStarted || !this.semanticSearch) {
      throw new Error("Code Intelligence server is not started");
    }

    try {
      const results = await this.semanticSearch.similarEntities(
        entityId,
        limit
      );

      return results.map((result) => result.entity);
    } catch (error) {
      console.error("Failed to find similar entities:", error);
      throw error;
    }
  }

  /**
   * Get entity context for explanation
   */
  async getEntityContext(entityName: string, options: any = {}): Promise<any> {
    // Use semantic search to find the entity and related context
    const searchResults = await this.query({
      query: entityName,
      maxResults: 5,
      includeContext: true,
    });

    const entity = searchResults.results.find(
      (r: any) => r.title === entityName
    );
    if (!entity) {
      throw new Error(`Entity ${entityName} not found`);
    }

    // Find similar entities for context
    const similarEntities = await this.findSimilarEntities(entity.id, 3);

    return {
      entity,
      similarEntities,
      usageExamples: [], // Could be enhanced to find actual usage examples
      dependencies: [], // Could be enhanced to parse dependencies
    };
  }

  /**
   * Stream query results
   */
  async *streamQuery(
    request: QueryRequest
  ): AsyncGenerator<any, void, unknown> {
    if (!this.isStarted) {
      throw new Error("Code Intelligence server is not started");
    }

    try {
      // Get results and stream them
      const results = await this.query(request);

      for (const result of results.results) {
        yield {
          type: "result",
          data: result,
        };
      }

      yield {
        type: "complete",
        data: {
          totalResults: results.totalResults,
          processingTime: results.processingTime,
        },
      };
    } catch (error) {
      yield {
        type: "error",
        data: {
          message: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }

  private async initializeSemanticSearch(): Promise<void> {
    console.log("🔍 Initializing semantic search engine...");

    try {
      this.semanticSearch = await createSemanticSearch({
        provider: "chromadb",
        embeddingModel: "code", // Use code-optimized embeddings
        collectionName: `farm-code-intel-${Date.now()}`,
        device: "cpu", // Use CPU for now, can be configured later
      });

      console.log("✅ Semantic search engine ready");
    } catch (error) {
      console.error("Failed to initialize semantic search:", error);
      throw error;
    }
  }

  private async initializeExplanationEngine(): Promise<void> {
    console.log("🤖 Initializing explanation engine...");

    try {
      // Choose AI provider based on configuration
      let aiProvider;

      if (this.config.ai?.provider === "ollama") {
        const ollamaProvider = new OllamaProvider({
          model: this.config.ai.model || "codellama:7b",
        });

        const isAvailable = await ollamaProvider.isAvailable();
        if (isAvailable) {
          aiProvider = ollamaProvider;
          console.log(
            `🚀 Using Ollama with model: ${this.config.ai.model || "codellama:7b"}`
          );
        } else {
          console.log("⚠️ Ollama not available, using mock provider");
          aiProvider = new MockProvider();
        }
      } else {
        console.log("🎭 Using mock AI provider");
        aiProvider = new MockProvider();
      }

      const parser = new TypeScriptParser();
      this.explanationEngine = new CodeExplanationEngine(
        aiProvider,
        parser,
        this.projectRoot
      );

      console.log("✅ Explanation engine ready");
    } catch (error) {
      console.error("Failed to initialize explanation engine:", error);
      throw error;
    }
  }

  private async performInitialIndexing(): Promise<void> {
    if (!this.semanticSearch) {
      throw new Error("Semantic search not initialized");
    }

    console.log("📚 Starting initial code indexing...");

    try {
      // Find all files to index
      const files = await this.findFilesToIndex();

      if (files.length === 0) {
        console.log("⚠️ No files found to index");
        return;
      }

      console.log(`📦 Found ${files.length} files to index`);

      // Read file contents
      const fileContents = await Promise.all(
        files.map(async (filePath) => {
          try {
            const content = await fs.readFile(filePath, "utf-8");
            return { path: filePath, content };
          } catch (error) {
            console.warn(`⚠️ Could not read file ${filePath}:`, error);
            return null;
          }
        })
      );

      // Filter out failed reads
      const validFiles = fileContents.filter(Boolean) as Array<{
        path: string;
        content: string;
      }>;

      // Index all files
      await this.semanticSearch.indexFiles(validFiles);

      console.log(`✅ Indexed ${validFiles.length} files successfully`);
    } catch (error) {
      console.error("❌ Initial indexing failed:", error);
      throw error;
    }
  }

  private async findFilesToIndex(): Promise<string[]> {
    const patterns = this.config.indexing.include || [
      "**/*.ts",
      "**/*.tsx",
      "**/*.js",
      "**/*.jsx",
      "**/*.py",
      "**/*.md",
    ];

    const excludePatterns = [
      "**/node_modules/**",
      "**/dist/**",
      "**/build/**",
      "**/.git/**",
      ...(this.config.indexing.exclude || []),
    ];

    const allFiles: string[] = [];

    for (const pattern of patterns) {
      try {
        const files = await glob(pattern, {
          cwd: this.projectRoot,
          absolute: true,
          ignore: excludePatterns,
        });

        allFiles.push(...files);
      } catch (error) {
        console.warn(`Warning: Could not process pattern ${pattern}:`, error);
      }
    }

    // Remove duplicates and filter by file size
    const uniqueFiles = [...new Set(allFiles)];
    const maxFileSize = this.config.indexing.maxFileSize || 1024 * 1024; // 1MB default

    const filteredFiles = [];
    for (const file of uniqueFiles) {
      try {
        const stats = await fs.stat(file);
        if (stats.size <= maxFileSize) {
          filteredFiles.push(file);
        } else {
          console.log(`⚠️ Skipping large file: ${file} (${stats.size} bytes)`);
        }
      } catch (error) {
        console.warn(`⚠️ Could not stat file ${file}:`, error);
      }
    }

    return filteredFiles;
  }

  private async startFileWatcher(): Promise<void> {
    console.log("👀 File watcher integration pending...");
    // TODO: Integrate with FARM file watcher system
    // This would watch for file changes and update the index incrementally
  }
}
