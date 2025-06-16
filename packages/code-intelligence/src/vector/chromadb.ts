// ChromaDB vector store implementation
import type {
  VectorStore,
  VectorDocument,
  VectorQuery,
  VectorSearchResult,
  VectorStoreConfig,
  VectorStoreStats,
  EmbeddingProvider,
} from "./types";
import type { CodeEntity } from "../types/index";

export interface ChromaDBConfig extends VectorStoreConfig {
  host?: string;
  port?: number;
  ssl?: boolean;
  headers?: Record<string, string>;
}

export class ChromaDBVectorStore implements VectorStore {
  private config: ChromaDBConfig;
  private embeddingProvider: EmbeddingProvider;
  private client: any; // ChromaDB client
  private collection: any; // ChromaDB collection
  private isInitialized = false;

  constructor(config: ChromaDBConfig, embeddingProvider: EmbeddingProvider) {
    this.config = config;
    this.embeddingProvider = embeddingProvider;
  }

  async initialize(collectionName: string): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Initialize ChromaDB client
      this.client = await this.createChromaClient();

      // Create or get collection
      this.collection = await this.getOrCreateCollection(collectionName);

      this.isInitialized = true;
      console.log(
        `✅ ChromaDB vector store initialized with collection: ${collectionName}`
      );
    } catch (error) {
      console.error(`Failed to initialize ChromaDB: ${error}`);
      throw error;
    }
  }

  async reset(): Promise<void> {
    if (!this.isInitialized) return;

    try {
      await this.client.deleteCollection(this.config.collectionName);
      this.collection = await this.getOrCreateCollection(
        this.config.collectionName
      );
      console.log(`🔄 Reset collection: ${this.config.collectionName}`);
    } catch (error) {
      console.error(`Failed to reset collection: ${error}`);
      throw error;
    }
  }

  async exists(collectionName: string): Promise<boolean> {
    try {
      const collections = await this.client.listCollections();
      return collections.some((col: any) => col.name === collectionName);
    } catch (error) {
      console.error(`Failed to check collection existence: ${error}`);
      return false;
    }
  }

  async add(documents: VectorDocument[]): Promise<void> {
    if (!this.isInitialized) {
      throw new Error("Vector store not initialized");
    }

    try {
      // Process documents in batches
      for (let i = 0; i < documents.length; i += this.config.batchSize) {
        const batch = documents.slice(i, i + this.config.batchSize);
        await this.addBatch(batch);
      }

      console.log(`📦 Added ${documents.length} documents to vector store`);
    } catch (error) {
      console.error(`Failed to add documents: ${error}`);
      throw error;
    }
  }

  async update(documents: VectorDocument[]): Promise<void> {
    if (!this.isInitialized) {
      throw new Error("Vector store not initialized");
    }

    try {
      // Delete existing documents first
      const ids = documents.map((doc) => doc.id);
      await this.delete(ids);

      // Add updated documents
      await this.add(documents);

      console.log(`🔄 Updated ${documents.length} documents in vector store`);
    } catch (error) {
      console.error(`Failed to update documents: ${error}`);
      throw error;
    }
  }

  async delete(ids: string[]): Promise<void> {
    if (!this.isInitialized) {
      throw new Error("Vector store not initialized");
    }

    try {
      await this.collection.delete({ ids });
      console.log(`🗑️ Deleted ${ids.length} documents from vector store`);
    } catch (error) {
      console.error(`Failed to delete documents: ${error}`);
      throw error;
    }
  }

  async get(ids: string[]): Promise<VectorDocument[]> {
    if (!this.isInitialized) {
      throw new Error("Vector store not initialized");
    }

    try {
      const result = await this.collection.get({ ids });
      return this.parseGetResults(result);
    } catch (error) {
      console.error(`Failed to get documents: ${error}`);
      throw error;
    }
  }

  async search(query: VectorQuery): Promise<VectorSearchResult[]> {
    if (!this.isInitialized) {
      throw new Error("Vector store not initialized");
    }

    try {
      if (query.text) {
        return await this.textSearch(query.text, query.limit, query.filters);
      } else if (query.vector) {
        return await this.similaritySearch(
          query.vector,
          query.limit,
          query.filters
        );
      } else {
        throw new Error("Query must contain either text or vector");
      }
    } catch (error) {
      console.error(`Failed to search: ${error}`);
      throw error;
    }
  }

  async similaritySearch(
    vector: number[],
    limit: number = 10,
    filters?: Record<string, any>
  ): Promise<VectorSearchResult[]> {
    if (!this.isInitialized) {
      throw new Error("Vector store not initialized");
    }

    try {
      const queryParams: any = {
        queryEmbeddings: [vector],
        nResults: limit,
      };

      if (filters) {
        queryParams.where = filters;
      }

      const results = await this.collection.query(queryParams);
      return this.parseQueryResults(results);
    } catch (error) {
      console.error(`Failed to perform similarity search: ${error}`);
      throw error;
    }
  }

  async textSearch(
    text: string,
    limit: number = 10,
    filters?: Record<string, any>
  ): Promise<VectorSearchResult[]> {
    if (!this.isInitialized) {
      throw new Error("Vector store not initialized");
    }

    try {
      // Generate embedding for query text
      const queryVector = await this.embeddingProvider.generateEmbedding(text);
      return await this.similaritySearch(queryVector, limit, filters);
    } catch (error) {
      console.error(`Failed to perform text search: ${error}`);
      throw error;
    }
  }

  async hybridSearch(
    text: string,
    vector?: number[],
    limit: number = 10,
    filters?: Record<string, any>
  ): Promise<VectorSearchResult[]> {
    if (!this.isInitialized) {
      throw new Error("Vector store not initialized");
    }

    try {
      // If no vector provided, generate from text
      if (!vector) {
        vector = await this.embeddingProvider.generateEmbedding(text);
      }

      // Perform similarity search
      const vectorResults = await this.similaritySearch(
        vector,
        limit * 2,
        filters
      );

      // Also perform text matching for reranking
      const textResults = await this.performTextMatching(text, filters);

      // Combine and rerank results
      return this.combineAndRerankResults(vectorResults, textResults, limit);
    } catch (error) {
      console.error(`Failed to perform hybrid search: ${error}`);
      throw error;
    }
  }

  async count(): Promise<number> {
    if (!this.isInitialized) {
      throw new Error("Vector store not initialized");
    }

    try {
      const result = await this.collection.count();
      return result;
    } catch (error) {
      console.error(`Failed to count documents: ${error}`);
      return 0;
    }
  }

  async getStats(): Promise<VectorStoreStats> {
    if (!this.isInitialized) {
      throw new Error("Vector store not initialized");
    }

    try {
      const count = await this.count();
      const collections = await this.client.listCollections();

      return {
        totalDocuments: count,
        totalVectors: count,
        dimensions: this.embeddingProvider.getDimensions(),
        diskUsage: 0, // ChromaDB doesn't expose this easily
        memoryUsage: 0, // ChromaDB doesn't expose this easily
        collections: collections.map((col: any) => col.name),
        lastUpdated: new Date(),
      };
    } catch (error) {
      console.error(`Failed to get stats: ${error}`);
      throw error;
    }
  }

  async close(): Promise<void> {
    if (this.isInitialized) {
      // ChromaDB client doesn't need explicit closing
      this.isInitialized = false;
      console.log("🔐 ChromaDB vector store closed");
    }
  }

  private async createChromaClient(): Promise<any> {
    // Mock ChromaDB client implementation
    // In production, this would import and configure the real ChromaDB client
    return {
      listCollections: async () => [{ name: this.config.collectionName }],

      deleteCollection: async (name: string) => {
        console.log(`Deleting collection: ${name}`);
      },

      getOrCreateCollection: async (params: any) => {
        console.log(`Getting or creating collection: ${params.name}`);
        return this.createMockCollection();
      },
    };
  }

  private async getOrCreateCollection(name: string): Promise<any> {
    const collectionParams = {
      name,
      metadata: {
        description: "FARM Code Intelligence Vector Store",
        model: this.embeddingProvider.getModel(),
        dimensions: this.embeddingProvider.getDimensions(),
      },
    };

    return await this.client.getOrCreateCollection(collectionParams);
  }

  private createMockCollection(): any {
    // Mock collection implementation
    return {
      add: async (params: any) => {
        console.log(`Adding ${params.ids.length} documents to collection`);
      },

      delete: async (params: any) => {
        console.log(`Deleting ${params.ids.length} documents from collection`);
      },

      get: async (params: any) => {
        console.log(`Getting ${params.ids.length} documents from collection`);
        return {
          ids: params.ids,
          documents: params.ids.map(() => "mock document"),
          metadatas: params.ids.map(() => ({ mock: true })),
          embeddings: params.ids.map(() =>
            Array.from({ length: this.embeddingProvider.getDimensions() }, () =>
              Math.random()
            )
          ),
        };
      },

      query: async (params: any) => {
        console.log(`Querying collection with ${params.nResults} results`);
        const numResults = Math.min(params.nResults, 5);
        return {
          ids: [Array.from({ length: numResults }, (_, i) => `result_${i}`)],
          distances: [Array.from({ length: numResults }, () => Math.random())],
          documents: [
            Array.from({ length: numResults }, () => "mock document"),
          ],
          metadatas: [
            Array.from({ length: numResults }, () => ({ mock: true })),
          ],
          embeddings: [
            Array.from({ length: numResults }, () =>
              Array.from(
                { length: this.embeddingProvider.getDimensions() },
                () => Math.random()
              )
            ),
          ],
        };
      },

      count: async () => 42, // Mock count
    };
  }

  private async addBatch(documents: VectorDocument[]): Promise<void> {
    // Generate embeddings for documents that don't have them
    const documentsToEmbed = documents.filter((doc) => !doc.vector);
    const texts = documentsToEmbed.map((doc) => doc.content);

    let embeddings: number[][] = [];
    if (texts.length > 0) {
      embeddings = await this.embeddingProvider.generateBatchEmbeddings(texts);
    }

    // Prepare data for ChromaDB
    const ids = documents.map((doc) => doc.id);
    const docTexts = documents.map((doc) => doc.content);
    const metadatas = documents.map((doc) => doc.metadata);
    const vectors = documents.map((doc, i) => {
      if (doc.vector) {
        return doc.vector;
      } else {
        const embeddingIndex = documentsToEmbed.indexOf(doc);
        return embeddings[embeddingIndex];
      }
    });

    // Add to collection
    await this.collection.add({
      ids,
      documents: docTexts,
      metadatas,
      embeddings: vectors,
    });
  }

  private parseQueryResults(results: any): VectorSearchResult[] {
    const searchResults: VectorSearchResult[] = [];

    for (let i = 0; i < results.ids[0].length; i++) {
      const entity: CodeEntity = {
        id: results.metadatas[0][i].entityId,
        name: results.metadatas[0][i].name || "Unknown",
        entityType: results.metadatas[0][i].entityType as any,
        filePath: results.metadatas[0][i].filePath,
        startLine: results.metadatas[0][i].startLine || 0,
        endLine: results.metadatas[0][i].endLine || 0,
        content: results.documents[0][i],
      };

      searchResults.push({
        entity,
        score: 1 - results.distances[0][i], // Convert distance to similarity score
        distance: results.distances[0][i],
        metadata: results.metadatas[0][i],
      });
    }

    return searchResults;
  }

  private parseGetResults(results: any): VectorDocument[] {
    const documents: VectorDocument[] = [];

    for (let i = 0; i < results.ids.length; i++) {
      documents.push({
        id: results.ids[i],
        content: results.documents[i],
        vector: results.embeddings?.[i],
        metadata: results.metadatas[i],
      });
    }

    return documents;
  }

  private async performTextMatching(
    text: string,
    filters?: Record<string, any>
  ): Promise<VectorSearchResult[]> {
    // Simple text matching implementation
    // In production, this could use BM25 or other text search algorithms
    try {
      const allDocs = await this.collection.get({ where: filters });

      if (!allDocs || !allDocs.documents || allDocs.documents.length === 0) {
        return [];
      }

      const matches = allDocs.documents
        .map((doc: string, index: number) => ({
          index,
          score: this.calculateTextSimilarity(
            text.toLowerCase(),
            doc.toLowerCase()
          ),
          document: doc,
          metadata: allDocs.metadatas[index],
        }))
        .filter((match: any) => match.score > 0)
        .sort((a: any, b: any) => b.score - a.score)
        .slice(0, 10);

      return matches.map((match: any) => ({
        entity: this.metadataToEntity(match.metadata, match.document),
        score: match.score,
        distance: 1 - match.score,
        metadata: match.metadata,
      }));
    } catch (error) {
      console.error("Error in performTextMatching:", error);
      return [];
    }
  }

  private calculateTextSimilarity(query: string, text: string): number {
    const queryWords = query.split(/\s+/);
    const textWords = text.split(/\s+/);

    const matches = queryWords.filter((word) =>
      textWords.some(
        (textWord) => textWord.includes(word) || word.includes(textWord)
      )
    );

    return matches.length / queryWords.length;
  }

  private combineAndRerankResults(
    vectorResults: VectorSearchResult[],
    textResults: VectorSearchResult[],
    limit: number
  ): VectorSearchResult[] {
    // Simple combination strategy - in production, you might use more sophisticated reranking
    const combinedResults = new Map<string, VectorSearchResult>();

    // Add vector results with higher weight
    vectorResults.forEach((result) => {
      combinedResults.set(result.entity.id, {
        ...result,
        score: result.score * 0.7, // Weight vector search
      });
    });

    // Add or boost text results
    textResults.forEach((result) => {
      const existing = combinedResults.get(result.entity.id);
      if (existing) {
        // Boost existing result
        existing.score = existing.score + result.score * 0.3;
      } else {
        // Add new result
        combinedResults.set(result.entity.id, {
          ...result,
          score: result.score * 0.3, // Weight text search
        });
      }
    });

    return Array.from(combinedResults.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  private metadataToEntity(metadata: any, content: string): CodeEntity {
    return {
      id: metadata.entityId || `entity_${Date.now()}`,
      name: metadata.name || "Unknown",
      entityType: metadata.entityType || "function",
      filePath: metadata.filePath || "",
      content,
      dependencies: metadata.dependencies || [],
      references: metadata.references || [],
      complexity: metadata.complexity || 1,
      tokens: metadata.tokens || content.length,
      metadata: {
        language: metadata.language || "typescript",
        ...metadata,
      },
      relationships: metadata.relationships || [],
      position: {
        line: metadata.startLine || 0,
        column: metadata.startColumn || 0,
        endLine: metadata.endLine || 0,
        endColumn: metadata.endColumn || 0,
      },
    };
  }
}
