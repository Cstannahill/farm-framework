import type { 
  VectorStore, 
  VectorDocument, 
  VectorQuery, 
  VectorSearchResult, 
  VectorStoreConfig, 
  VectorStoreStats, 
  EmbeddingProvider 
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
      console.log(`✅ ChromaDB vector store initialized with collection: ${collectionName}`);
    } catch (error) {
      console.error(`Failed to initialize ChromaDB: ${error}`);
      throw error;
    }
  }

  async reset(): Promise<void> {
    if (!this.isInitialized) return;

    try {
      await this.client.deleteCollection(this.config.collectionName);
      this.collection = await this.getOrCreateCollection(this.config.collectionName);
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
      const results = await this.collection.get({ ids });
      return this.parseGetResults(results);
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
      if (query.vector) {
        return await this.similaritySearch(query.vector, query.limit, query.filters);
      } else if (query.text) {
        return await this.textSearch(query.text, query.limit, query.filters);
      } else {
        throw new Error("Query must have either vector or text");
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
      const results = await this.collection.query({
        queryEmbeddings: [vector],
        nResults: limit,
        where: filters,
      });

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
      // Generate embedding for the text
      const embedding = await this.embeddingProvider.generateEmbedding(text);
      
      // Perform vector search
      const vectorResults = await this.similaritySearch(embedding, limit, filters);
      
      // Also perform text matching for hybrid results
      const textResults = await this.performTextMatching(text, limit, filters);
      
      // Combine and rerank results
      return this.combineAndRerankResults(vectorResults, textResults, limit);
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
      // Use provided vector or generate from text
      const searchVector = vector || await this.embeddingProvider.generateEmbedding(text);
      
      // Perform vector search
      const vectorResults = await this.similaritySearch(searchVector, limit, filters);
      
      // Perform text search
      const textResults = await this.performTextMatching(text, limit, filters);
      
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
      const results = await this.collection.count();
      return results;
    } catch (error) {
      console.error(`Failed to get count: ${error}`);
      throw error;
    }
  }

  async getStats(): Promise<VectorStoreStats> {
    if (!this.isInitialized) {
      throw new Error("Vector store not initialized");
    }

    try {
      const totalDocuments = await this.count();
      
      return {
        totalDocuments,
        totalVectors: totalDocuments,
        dimensions: this.embeddingProvider.getDimensions(),
        diskUsage: 0, // Would need to calculate actual usage
        memoryUsage: 0, // Would need to calculate actual usage
        collections: [this.config.collectionName],
        lastUpdated: new Date(),
      };
    } catch (error) {
      console.error(`Failed to get stats: ${error}`);
      throw error;
    }
  }

  async close(): Promise<void> {
    if (this.client && this.client.close) {
      await this.client.close();
    }
    this.isInitialized = false;
  }

  private async createChromaClient(): Promise<any> {
    // Mock ChromaDB client - would use actual ChromaDB in production
    return this.createMockCollection();
  }

  private async getOrCreateCollection(collectionName: string): Promise<any> {
    // Mock implementation
    return this.createMockCollection();
  }

  private createMockCollection(): any {
    // Mock collection for development/testing
    const documents = new Map<string, VectorDocument>();
    
    return {
      async add(data: any) {
        const { ids, documents: docs, metadatas, embeddings } = data;
        for (let i = 0; i < ids.length; i++) {
          documents.set(ids[i], {
            id: ids[i],
            content: docs[i],
            vector: embeddings[i],
            metadata: metadatas[i],
          });
        }
      },
      
      async delete(data: any) {
        const { ids } = data;
        ids.forEach((id: string) => documents.delete(id));
      },
      
      async get(data: any) {
        const { ids } = data;
        const results = ids.map((id: string) => documents.get(id)).filter(Boolean);
        return {
          ids: results.map((doc: any) => doc?.id),
          documents: results.map((doc: any) => doc?.content),
          metadatas: results.map((doc: any) => doc?.metadata),
          embeddings: results.map((doc: any) => doc?.vector),
        };
      },
      
      async query(data: any) {
        const { queryEmbeddings, nResults } = data;
        const allDocs = Array.from(documents.values());
        
        // Simple mock similarity calculation
        const results = allDocs
          .map(doc => ({
            doc,
            distance: Math.random(), // Mock distance
          }))
          .sort((a, b) => a.distance - b.distance)
          .slice(0, nResults);
          
        return {
          ids: [results.map(r => r.doc.id)],
          documents: [results.map(r => r.doc.content)],
          metadatas: [results.map(r => r.doc.metadata)],
          distances: [results.map(r => r.distance)],
        };
      },
      
      async count() {
        return documents.size;
      }
    };
  }

  private async addBatch(batch: VectorDocument[]): Promise<void> {
    // Generate embeddings for documents that don't have them
    const textsToEmbed: string[] = [];
    const indices: number[] = [];
    
    batch.forEach((doc, index) => {
      if (!doc.vector) {
        textsToEmbed.push(doc.content);
        indices.push(index);
      }
    });

    if (textsToEmbed.length > 0) {
      const embeddings = await this.embeddingProvider.generateBatchEmbeddings(textsToEmbed);
      indices.forEach((batchIndex, embeddingIndex) => {
        batch[batchIndex].vector = embeddings[embeddingIndex];
      });
    }

    // Add to collection
    await this.collection.add({
      ids: batch.map(doc => doc.id),
      documents: batch.map(doc => doc.content),
      metadatas: batch.map(doc => doc.metadata),
      embeddings: batch.map(doc => doc.vector),
    });
  }

  private parseQueryResults(results: any): VectorSearchResult[] {
    const { ids, documents, metadatas, distances } = results;
    
    return ids[0].map((id: string, index: number) => ({
      entity: this.metadataToEntity(metadatas[0][index]),
      score: 1 - distances[0][index], // Convert distance to similarity score
      distance: distances[0][index],
      metadata: metadatas[0][index],
    }));
  }

  private parseGetResults(results: any): VectorDocument[] {
    const { ids, documents, metadatas, embeddings } = results;
    
    return ids.map((id: string, index: number) => ({
      id,
      content: documents[index],
      vector: embeddings[index],
      metadata: metadatas[index],
    }));
  }

  private async performTextMatching(
    text: string, 
    limit: number, 
    filters?: Record<string, any>
  ): Promise<VectorSearchResult[]> {
    // Simple text matching implementation
    // In production, this would use full-text search capabilities
    const allDocs = await this.collection.get({});
    
    return allDocs.documents
      .map((doc: string, index: number) => ({
        entity: this.metadataToEntity(allDocs.metadatas[index]),
        score: this.calculateTextSimilarity(text, doc),
        distance: 1 - this.calculateTextSimilarity(text, doc),
        metadata: allDocs.metadatas[index],
      }))
      .filter((result: VectorSearchResult) => result.score > 0.1)
      .sort((a: VectorSearchResult, b: VectorSearchResult) => b.score - a.score)
      .slice(0, limit);
  }

  private calculateTextSimilarity(query: string, document: string): number {
    // Simple text similarity based on common words
    const queryWords = query.toLowerCase().split(/\s+/);
    const docWords = document.toLowerCase().split(/\s+/);
    
    const intersection = queryWords.filter(word => docWords.includes(word));
    const union = [...new Set([...queryWords, ...docWords])];
    
    return intersection.length / union.length;
  }

  private combineAndRerankResults(
    vectorResults: VectorSearchResult[], 
    textResults: VectorSearchResult[], 
    limit: number
  ): VectorSearchResult[] {
    // Combine results and remove duplicates
    const combined = new Map<string, VectorSearchResult>();
    
    vectorResults.forEach(result => {
      combined.set(result.entity.id, result);
    });
    
    textResults.forEach(result => {
      const existing = combined.get(result.entity.id);
      if (existing) {
        // Combine scores (weighted average)
        existing.score = (existing.score * 0.7) + (result.score * 0.3);
      } else {
        combined.set(result.entity.id, result);
      }
    });
    
    return Array.from(combined.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  private metadataToEntity(metadata: any): CodeEntity {
    // Convert metadata back to CodeEntity
    // This is a simplified conversion - would need proper mapping
    return {
      id: metadata.entityId,
      filePath: metadata.filePath,
      entityType: metadata.entityType,
      name: metadata.name || '',
      content: metadata.content || '',
      dependencies: [],
      references: [],
      complexity: metadata.complexity || 0,
      tokens: metadata.tokens || 0,
      metadata: metadata,
      relationships: [],
      position: {
        line: metadata.line || 0,
        column: metadata.column || 0,
      },
    };
  }
}