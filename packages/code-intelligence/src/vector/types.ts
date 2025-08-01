// Vector database interfaces and types for semantic search
import type { CodeEntity } from "../types/index";

export interface VectorSearchResult {
  entity: CodeEntity;
  score: number;
  distance: number;
  metadata: Record<string, any>;
}

export interface VectorQuery {
  vector?: number[];
  text?: string;
  filters?: Record<string, any>;
  limit?: number;
  minScore?: number;
}

export interface VectorDocument {
  id: string;
  content: string;
  vector?: number[];
  metadata: {
    entityId: string;
    entityType: string;
    filePath: string;
    language: string;
    lastModified: number;
    [key: string]: any;
  };
}

export interface EmbeddingProvider {
  generateEmbedding(text: string): Promise<number[]>;
  generateBatchEmbeddings(texts: string[]): Promise<number[][]>;
  getDimensions(): number;
  getModel(): string;
}

export interface VectorStore {
  // Collection management
  initialize(collectionName: string): Promise<void>;
  reset(): Promise<void>;
  exists(collectionName: string): Promise<boolean>;

  // Document operations
  add(documents: VectorDocument[]): Promise<void>;
  update(documents: VectorDocument[]): Promise<void>;
  delete(ids: string[]): Promise<void>;
  get(ids: string[]): Promise<VectorDocument[]>;

  // Search operations
  search(query: VectorQuery): Promise<VectorSearchResult[]>;
  similaritySearch(
    vector: number[],
    limit?: number,
    filters?: Record<string, any>
  ): Promise<VectorSearchResult[]>;
  textSearch(
    text: string,
    limit?: number,
    filters?: Record<string, any>
  ): Promise<VectorSearchResult[]>;
  hybridSearch(
    text: string,
    vector?: number[],
    limit?: number,
    filters?: Record<string, any>
  ): Promise<VectorSearchResult[]>;

  // Analytics
  count(): Promise<number>;
  getStats(): Promise<VectorStoreStats>;

  // Cleanup
  close(): Promise<void>;
}

export interface VectorStoreStats {
  totalDocuments: number;
  totalVectors: number;
  dimensions: number;
  diskUsage: number;
  memoryUsage: number;
  collections: string[];
  lastUpdated: Date;
}

export interface VectorStoreConfig {
  provider: "chromadb" | "pinecone" | "weaviate" | "qdrant";
  connectionString?: string;
  apiKey?: string;
  collectionName: string;
  dimensions: number;
  distance: "cosine" | "euclidean" | "dot";
  persistPath?: string;
  batchSize: number;
  maxRetries: number;
}

export interface SemanticSearchOptions {
  includeCode: boolean;
  includeComments: boolean;
  includeDocs: boolean;
  entityTypes: string[];
  languages: string[];
  minSimilarity: number;
  maxResults: number;
  rerank: boolean;
}
