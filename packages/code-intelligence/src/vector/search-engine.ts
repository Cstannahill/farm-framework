// Semantic search engine for code intelligence
import type {
  VectorStore,
  VectorDocument,
  VectorSearchResult,
  EmbeddingProvider,
  SemanticSearchOptions,
} from "./types";
import type { CodeEntity, QueryRequest, QueryResponse } from "../types/index";
import { TypeScriptParser } from "../explanation/parser";

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
  private parser: TypeScriptParser;
  private config: SemanticSearchConfig;
  private isInitialized = false;

  constructor(
    vectorStore: VectorStore,
    embeddingProvider: EmbeddingProvider,
    config: SemanticSearchConfig
  ) {
    this.vectorStore = vectorStore;
    this.embeddingProvider = embeddingProvider;
    this.parser = new TypeScriptParser();
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

  async indexFiles(
    files: Array<{ path: string; content: string }>
  ): Promise<void> {
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
      console.log(`🔍 Searching for: "${query.query}"`);
      const startTime = Date.now();

      // Prepare search options
      const options: SemanticSearchOptions = {
        includeCode: true,
        includeComments: true,
        includeDocs: true,
        entityTypes: query.entityTypes || [],
        languages: query.languages || [],
        minSimilarity: this.config.minSimilarity,
        maxResults: query.maxResults || this.config.searchLimit,
        rerank: this.config.enableReranking,
      };

      // Perform search
      let results: VectorSearchResult[];

      if (this.config.enableHybridSearch) {
        results = await this.hybridSearch(query.query, options);
      } else {
        results = await this.semanticSearch(query.query, options);
      }

      // Filter and format results
      const filteredResults = this.filterResults(results, options);
      const searchResults = this.formatSearchResults(filteredResults);

      const duration = Date.now() - startTime;
      console.log(`✅ Found ${searchResults.length} results in ${duration}ms`);

      return {
        results: searchResults,
        totalResults: searchResults.length,
        query: query.query,
        processingTime: duration,
        metadata: {
          searchType: this.config.enableHybridSearch ? "hybrid" : "semantic",
          embeddingModel: this.embeddingProvider.getModel(),
          vectorStore: "chromadb",
        },
      };
    } catch (error) {
      console.error("Search failed:", error);
      throw error;
    }
  }

  async similarEntities(
    entityId: string,
    limit: number = 10
  ): Promise<VectorSearchResult[]> {
    if (!this.isInitialized) {
      throw new Error("Search engine not initialized");
    }

    try {
      // Get the target entity
      const entities = await this.vectorStore.get([entityId]);
      if (entities.length === 0) {
        throw new Error(`Entity ${entityId} not found`);
      }

      const targetEntity = entities[0];

      // Find similar entities using the target's embedding
      if (!targetEntity.vector) {
        // Generate embedding if not available
        targetEntity.vector = await this.embeddingProvider.generateEmbedding(
          targetEntity.content
        );
      }

      const results = await this.vectorStore.similaritySearch(
        targetEntity.vector,
        limit + 1, // +1 to exclude the target entity itself
        { entityId: { $ne: entityId } } // Exclude the target entity
      );

      return results.slice(0, limit);
    } catch (error) {
      console.error(`Failed to find similar entities for ${entityId}:`, error);
      throw error;
    }
  }

  async getStats() {
    if (!this.isInitialized) {
      throw new Error("Search engine not initialized");
    }

    return await this.vectorStore.getStats();
  }

  async reset(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error("Search engine not initialized");
    }

    await this.vectorStore.reset();
    console.log("🔄 Search index reset");
  }

  private async semanticSearch(
    query: string,
    options: SemanticSearchOptions
  ): Promise<VectorSearchResult[]> {
    // Build filters based on options
    const filters: Record<string, any> = {};

    if (options.entityTypes.length > 0) {
      filters.entityType = { $in: options.entityTypes };
    }

    if (options.languages.length > 0) {
      filters.language = { $in: options.languages };
    }

    // Perform semantic search
    return await this.vectorStore.textSearch(
      query,
      options.maxResults,
      filters
    );
  }

  private async hybridSearch(
    query: string,
    options: SemanticSearchOptions
  ): Promise<VectorSearchResult[]> {
    // Build filters
    const filters: Record<string, any> = {};

    if (options.entityTypes.length > 0) {
      filters.entityType = { $in: options.entityTypes };
    }

    if (options.languages.length > 0) {
      filters.language = { $in: options.languages };
    }

    // Perform hybrid search (combines semantic and lexical search)
    return await this.vectorStore.hybridSearch(
      query,
      undefined,
      options.maxResults,
      filters
    );
  }

  private filterResults(
    results: VectorSearchResult[],
    options: SemanticSearchOptions
  ): VectorSearchResult[] {
    return results.filter((result) => {
      // Filter by similarity score
      if (result.score < options.minSimilarity) {
        return false;
      }

      // Filter by entity type
      if (
        options.entityTypes.length > 0 &&
        !options.entityTypes.includes(result.entity.entityType)
      ) {
        return false;
      }

      return true;
    });
  }

  private formatSearchResults(results: VectorSearchResult[]): any[] {
    return results.map((result) => ({
      id: result.entity.id,
      title: result.entity.name,
      description: this.generateDescription(result.entity),
      filePath: result.entity.filePath,
      startLine: result.entity.startLine,
      endLine: result.entity.endLine,
      entityType: result.entity.entityType,
      content: result.entity.content,
      score: result.score,
      metadata: {
        language: result.metadata.language,
        lastModified: result.metadata.lastModified,
        similarity: result.score,
        distance: result.distance,
      },
    }));
  }

  private generateDescription(entity: CodeEntity): string {
    const contentPreview = entity.content
      .replace(/\s+/g, " ")
      .substring(0, 150);

    return `${entity.entityType} in ${entity.filePath}: ${contentPreview}...`;
  }

  private async entitiesToDocuments(
    entities: CodeEntity[],
    filePath: string
  ): Promise<VectorDocument[]> {
    const documents: VectorDocument[] = [];

    for (const entity of entities) {
      // Create searchable content by combining different parts
      const searchableContent = this.createSearchableContent(entity);

      const document: VectorDocument = {
        id: entity.id,
        content: searchableContent,
        metadata: {
          entityId: entity.id,
          entityType: entity.entityType,
          filePath: entity.filePath,
          name: entity.name,
          startLine: entity.startLine,
          endLine: entity.endLine,
          language: this.getLanguageFromFile(filePath),
          lastModified: Date.now(),
        },
      };

      documents.push(document);
    }

    return documents;
  }

  private createSearchableContent(entity: CodeEntity): string {
    // Combine entity name, type, and content for better searchability
    const parts = [entity.name, entity.entityType, entity.content];

    // Add any additional metadata that might be useful for search
    if (entity.signature) {
      parts.push(entity.signature);
    }

    if (entity.description) {
      parts.push(entity.description);
    }

    return parts.filter(Boolean).join(" ");
  }

  private getLanguageFromFile(filePath: string): string {
    const extension = filePath.split(".").pop()?.toLowerCase();

    const languageMap: Record<string, string> = {
      ts: "typescript",
      tsx: "typescript",
      js: "javascript",
      jsx: "javascript",
      py: "python",
      java: "java",
      cpp: "cpp",
      c: "c",
      go: "go",
      rs: "rust",
      php: "php",
      rb: "ruby",
      kt: "kotlin",
      swift: "swift",
    };

    return languageMap[extension || ""] || "unknown";
  }
}
