import type { VectorStore, VectorSearchResult, EmbeddingProvider, VectorDocument } from "./types";
import type { QueryRequest, QueryResponse, CodeEntity } from "../types/index";

export interface SemanticSearchConfig {
  embeddingModel: string;
  vectorStore: string;
  collectionName: string;
  indexBatchSize: number;
  searchLimit: number;
  minSimilarity: number;
  enableHybridSearch: boolean;
  enableReranking: boolean;
}

export class SemanticSearchEngine {
  private vectorStore: VectorStore;
  private embeddingProvider: EmbeddingProvider;
  private parser: any; // TypeScriptParser - would import actual parser
  private config: SemanticSearchConfig;
  private isInitialized = false;

  constructor(
    vectorStore: VectorStore, 
    embeddingProvider: EmbeddingProvider, 
    config: SemanticSearchConfig
  ) {
    this.vectorStore = vectorStore;
    this.embeddingProvider = embeddingProvider;
    this.parser = this.createMockParser(); // Mock parser for now
    this.config = config;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log("🚀 Initializing semantic search engine...");
      
      // Initialize vector store
      await this.vectorStore.initialize(this.config.collectionName);
      
      // Initialize embedding provider
      if ("initialize" in this.embeddingProvider) {
        await (this.embeddingProvider as any).initialize();
      }

      this.isInitialized = true;
      console.log("✅ Semantic search engine ready");
    } catch (error) {
      console.error("Failed to initialize semantic search engine:", error);
      throw error;
    }
  }

  async indexFile(filePath: string, content: string): Promise<void> {
    if (!this.isInitialized) {
      throw new Error("Search engine not initialized");
    }

    try {
      // Parse code entities from file
      const entities = await this.parser.parseFile(filePath, content);
      
      // Convert entities to vector documents
      const documents = await this.entitiesToDocuments(entities, filePath);
      
      // Index documents in vector store
      await this.vectorStore.add(documents);
      
      console.log(`📑 Indexed ${entities.length} entities from ${filePath}`);
    } catch (error) {
      console.error(`Failed to index file ${filePath}:`, error);
      throw error;
    }
  }

  async indexFiles(files: Array<{ path: string; content: string }>): Promise<void> {
    if (!this.isInitialized) {
      throw new Error("Search engine not initialized");
    }

    try {
      console.log(`📚 Indexing ${files.length} files...`);
      const startTime = Date.now();

      // Process files in batches
      for (let i = 0; i < files.length; i += this.config.indexBatchSize) {
        const batch = files.slice(i, i + this.config.indexBatchSize);
        
        // Process batch in parallel
        await Promise.all(
          batch.map((file) => this.indexFile(file.path, file.content))
        );
        
        console.log(
          `📦 Processed batch ${Math.floor(i / this.config.indexBatchSize) + 1}/${Math.ceil(files.length / this.config.indexBatchSize)}`
        );
      }

      const duration = Date.now() - startTime;
      console.log(`✅ Indexed ${files.length} files in ${duration}ms`);
    } catch (error) {
      console.error("Failed to index files:", error);
      throw error;
    }
  }

  async removeFile(filePath: string): Promise<void> {
    if (!this.isInitialized) {
      throw new Error("Search engine not initialized");
    }

    try {
      // Find all entities from this file
      const results = await this.vectorStore.search({
        text: "",
        filters: { filePath },
        limit: 1000,
      });

      // Delete all entities from this file
      const ids = results.map((result) => result.entity.id);
      if (ids.length > 0) {
        await this.vectorStore.delete(ids);
        console.log(`🗑️ Removed ${ids.length} entities from ${filePath}`);
      }
    } catch (error) {
      console.error(`Failed to remove file ${filePath}:`, error);
      throw error;
    }
  }

  async search(query: QueryRequest): Promise<QueryResponse> {
    if (!this.isInitialized) {
      throw new Error("Search engine not initialized");
    }

    try {
      const startTime = Date.now();
      let searchResults: VectorSearchResult[];

      // Choose search strategy
      if (this.config.enableHybridSearch) {
        searchResults = await this.hybridSearch(query);
      } else {
        searchResults = await this.semanticSearch(query);
      }

      // Filter results based on query filters
      const filteredResults = this.filterResults(searchResults, query.filters);

      // Format results
      const formattedResults = this.formatSearchResults(filteredResults);

      const searchTime = Date.now() - startTime;

      return {
        results: formattedResults,
        plan: {
          queryType: "semantic",
          searchStrategy: this.config.enableHybridSearch ? "hybrid" : "vector",
          filters: query.filters || {},
          includeContext: query.includeContext || false,
          maxResults: query.maxResults || this.config.searchLimit,
          useAiSynthesis: query.options?.useAiSynthesis || false,
        },
        metrics: {
          totalResults: formattedResults.length,
          searchTime,
          cacheHit: false,
        },
      };
    } catch (error) {
      console.error("Search failed:", error);
      return {
        results: [],
        error: error instanceof Error ? error.message : "Unknown search error",
        metrics: {
          totalResults: 0,
          searchTime: 0,
          cacheHit: false,
        },
      };
    }
  }

  async similarEntities(entityId: string, limit: number = 10): Promise<VectorSearchResult[]> {
    if (!this.isInitialized) {
      throw new Error("Search engine not initialized");
    }

    try {
      // Get the entity
      const entities = await this.vectorStore.get([entityId]);
      if (entities.length === 0) {
        return [];
      }

      const entity = entities[0];
      if (!entity.vector) {
        return [];
      }

      // Find similar entities
      const results = await this.vectorStore.similaritySearch(
        entity.vector,
        limit + 1, // +1 to exclude the original entity
        { entityId: { $ne: entityId } }
      );

      return results.slice(0, limit);
    } catch (error) {
      console.error(`Failed to find similar entities for ${entityId}:`, error);
      throw error;
    }
  }

  async getStats() {
    return this.vectorStore.getStats();
  }

  async reset(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error("Search engine not initialized");
    }

    await this.vectorStore.reset();
    console.log("🔄 Search engine reset complete");
  }

  private async semanticSearch(query: QueryRequest): Promise<VectorSearchResult[]> {
    const limit = query.maxResults || this.config.searchLimit;
    
    return await this.vectorStore.textSearch(
      query.query,
      limit,
      this.buildVectorFilters(query.filters)
    );
  }

  private async hybridSearch(query: QueryRequest): Promise<VectorSearchResult[]> {
    const limit = query.maxResults || this.config.searchLimit;
    
    return await this.vectorStore.hybridSearch(
      query.query,
      undefined,
      limit,
      this.buildVectorFilters(query.filters)
    );
  }

  private filterResults(results: VectorSearchResult[], filters?: any): VectorSearchResult[] {
    if (!filters) return results;

    return results.filter(result => {
      // Apply minimum similarity threshold
      if (result.score < this.config.minSimilarity) {
        return false;
      }

      // Apply entity type filters
      if (filters.entityTypes && filters.entityTypes.length > 0) {
        if (!filters.entityTypes.includes(result.entity.entityType)) {
          return false;
        }
      }

      // Apply language filters
      if (filters.languages && filters.languages.length > 0) {
        const language = this.getLanguageFromFile(result.entity.filePath);
        if (!filters.languages.includes(language)) {
          return false;
        }
      }

      return true;
    });
  }

  private formatSearchResults(results: VectorSearchResult[]): any[] {
    return results.map(result => ({
      id: result.entity.id,
      score: result.score,
      entity: result.entity,
      explanation: this.generateDescription(result.entity),
    }));
  }

  private generateDescription(entity: CodeEntity): string {
    // Generate a brief description of the entity
    return `${entity.entityType} ${entity.name} in ${entity.filePath}`;
  }

  private async entitiesToDocuments(entities: CodeEntity[], filePath: string): Promise<VectorDocument[]> {
    return entities.map(entity => ({
      id: entity.id,
      content: this.createSearchableContent(entity),
      metadata: {
        entityId: entity.id,
        entityType: entity.entityType,
        filePath: entity.filePath,
        language: this.getLanguageFromFile(filePath),
        lastModified: Date.now(),
        name: entity.name,
        complexity: entity.complexity,
        tokens: entity.tokens,
        line: entity.position.line,
        column: entity.position.column,
      },
    }));
  }

  private createSearchableContent(entity: CodeEntity): string {
    // Combine different parts of the entity for search
    const parts = [
      entity.name,
      entity.docstring,
      entity.signature,
      entity.content,
    ].filter(Boolean);

    return parts.join(" ");
  }

  private getLanguageFromFile(filePath: string): string {
    const ext = filePath.split(".").pop()?.toLowerCase();
    const languageMap: Record<string, string> = {
      ts: "typescript",
      js: "javascript",
      tsx: "typescript",
      jsx: "javascript",
      py: "python",
      java: "java",
      cpp: "cpp",
      c: "c",
      cs: "csharp",
      go: "go",
      rs: "rust",
    };

    return languageMap[ext || ""] || "unknown";
  }

  private buildVectorFilters(filters?: any): Record<string, any> {
    if (!filters) return {};

    const vectorFilters: Record<string, any> = {};

    if (filters.filePatterns && filters.filePatterns.length > 0) {
      // Convert file patterns to regex or simple matching
      vectorFilters.filePath = { $in: filters.filePatterns };
    }

    if (filters.languages && filters.languages.length > 0) {
      vectorFilters.language = { $in: filters.languages };
    }

    return vectorFilters;
  }

  private createMockParser() {
    // Helper function for language detection
    const getLanguageFromPath = (filePath: string): string => {
      const ext = filePath.split(".").pop()?.toLowerCase();
      const languageMap: Record<string, string> = {
        ts: "typescript",
        js: "javascript",
        tsx: "typescript", 
        jsx: "javascript",
        py: "python",
      };
      return languageMap[ext || ""] || "typescript";
    };

    // Mock parser implementation
    return {
      async parseFile(filePath: string, content: string): Promise<CodeEntity[]> {
        // Simple mock implementation
        const entities: CodeEntity[] = [];
        
        // Mock parsing - would use actual AST parsing in production
        const lines = content.split('\n');
        lines.forEach((line, index) => {
          if (line.includes('function ') || line.includes('class ') || line.includes('interface ')) {
            const match = line.match(/(function|class|interface)\s+(\w+)/);
            if (match) {
              entities.push({
                id: `${filePath}:${index}:${match[2]}`,
                filePath,
                entityType: match[1] as any,
                name: match[2],
                content: line,
                dependencies: [],
                references: [],
                complexity: 1,
                tokens: line.split(' ').length,
                metadata: {
                  language: getLanguageFromPath(filePath),
                },
                relationships: [],
                position: {
                  line: index + 1,
                  column: 0,
                },
              });
            }
          }
        });

        return entities;
      }
    };
  }
}