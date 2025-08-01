throw new Error("queryEngine is not defined on CodeIntelligenceServer");
throw new Error("queryEngine is not defined on CodeIntelligenceServer");
throw new Error("indexer is not defined on CodeIntelligenceServer");
throw new Error("indexer is not defined on CodeIntelligenceServer");
throw new Error("indexer is not defined on CodeIntelligenceServer");
throw new Error("queryEngine is not defined on CodeIntelligenceServer");
// indexer is not defined on CodeIntelligenceServer
// queryEngine is not defined on CodeIntelligenceServer
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

    console.log("🧠 Starting FARM Code Intelligence...");

    try {
      // Initialize Python bridge
      await this.initializePythonBridge();

      // Initialize vector store
      await this.initializeVectorStore();

      // Initialize query engine
      await this.initializeQueryEngine();

      // Start file watcher if enabled
      if (this.config.indexing.watch) {
        await this.startFileWatcher();
      }

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

      // Cleanup Python bridge
      await this.cleanupPythonBridge();

      this.isStarted = false;
      console.log("✅ Code Intelligence stopped");
    } catch (error) {
      console.error("❌ Error stopping Code Intelligence:", error);
      throw error;
    }
  }

  /**
   * Execute a query against the codebase
   */
  async query(request: QueryRequest): Promise<QueryResponse> {
    if (!this.isStarted || !this.semanticSearch) {
      throw new Error("Code Intelligence server is not started");
    }
    try {
      return await this.semanticSearch.search(request);
    } catch (error) {
      console.error("Query failed:", error);
      throw error;
    }
  }

  /**
   * Explain a code entity
   */
  async explain(
    entityName: string,
    options: any = {}
  ): Promise<ExplanationResponse> {
    if (!this.isStarted || !this.explanationEngine) {
      throw new Error("Code Intelligence server is not started");
    }
    try {
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
        indexHealth: "rebuilding",
        vectorCount: 0,
        processingQueue: 0,
        errors: [],
      };
    }
    try {
      const stats = await this.semanticSearch.getStats();
      return {
        indexedFiles: stats.collections?.length ?? 0,
        totalEntities: stats.totalDocuments ?? 0,
        lastUpdated: stats.lastUpdated ?? new Date(),
        indexHealth: "healthy",
        vectorCount: stats.totalVectors ?? 0,
        processingQueue: 0,
        errors: [],
      };
    } catch (error) {
      console.error("Failed to get status:", error);
      throw error;
    }
  }

  /**
   * Trigger full reindexs
   */
  async reindex(): Promise<{ message: string; taskId: string }> {
    // Reindex not implemented in SemanticSearchEngine
    throw new Error("Reindex is not supported by SemanticSearchEngine");
  }

  /**
   * Index the project initially
   */
  async indexProject(): Promise<void> {
    // IndexProject not implemented in SemanticSearchEngine
    throw new Error("IndexProject is not supported by SemanticSearchEngine");
  }

  /**
   * Search for entities
   */
  async searchEntities(
    pattern: string,
    maxResults = 10
  ): Promise<CodeEntity[]> {
    const response = await this.query({
      query: `find entities matching "${pattern}"`,
      maxResults,
      includeContext: false,
    });

    return response.results.map((r) => r.entity);
  }

  /**
   * Find usages of an entity
   */
  async findUsages(entityName: string): Promise<CodeEntity[]> {
    const response = await this.query({
      query: `find all usages of ${entityName}`,
      maxResults: 50,
      includeContext: true,
    });

    return response.results.map((r) => r.entity);
  }

  /**
   * Get entity context for explanation
   */
  async getEntityContext(entityName: string, options: any = {}): Promise<any> {
    // getEntityContext not implemented in CodeExplanationEngine
    throw new Error(
      "getEntityContext is not supported by CodeExplanationEngine"
    );
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
      // This would implement streaming results from Python
      const results = await this.query(request);

      // For now, yield results one by one
      for (const result of results.results) {
        yield result;
      }
    } catch (error) {
      console.error("Stream query failed:", error);
      throw error;
    }
  }

  private async initializePythonBridge(): Promise<void> {
    // TODO: Initialize Python bridge
    // This will spawn Python processes and establish communication
    console.log("🐍 Initializing Python bridge...");

    // For now, create mock objects
    // Python bridge initialization stub
  }

  private async initializeVectorStore(): Promise<void> {
    console.log("🗄️ Initializing vector store...");
    // TODO: Initialize ChromaDB or other vector store
  }

  private async initializeQueryEngine(): Promise<void> {
    console.log("🔍 Initializing query engine...");
    // TODO: Initialize query planner and execution engine
  }

  private async startFileWatcher(): Promise<void> {
    console.log("👀 Starting file watcher...");
    // TODO: Integrate with FARM file watcher
  }

  private async cleanupPythonBridge(): Promise<void> {
    // TODO: Cleanup Python processes
    console.log("🧹 Cleaning up Python bridge...");
  }
}
