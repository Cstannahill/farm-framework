// Vector database exports for code intelligence
export * from "./types";
export * from "./embeddings";
export * from "./chromadb";
export * from "./search-engine";

// Pre-configured setups for common use cases
import { ChromaDBVectorStore } from "./chromadb";
import {
  CodeEmbeddingProvider,
  GeneralEmbeddingProvider,
  FastEmbeddingProvider,
} from "./embeddings";
import { SemanticSearchEngine } from "./search-engine";
import type { VectorStoreConfig } from "./types";

export interface VectorSetupConfig {
  provider: "chromadb" | "pinecone" | "weaviate";
  embeddingModel: "code" | "general" | "fast";
  collectionName: string;
  persistPath?: string;
  device?: "cpu" | "cuda";
}

/**
 * Create a complete semantic search setup with sensible defaults
 */
export async function createSemanticSearch(
  config: VectorSetupConfig
): Promise<SemanticSearchEngine> {
  // Choose embedding provider based on model preference
  const embeddingProvider = (() => {
    switch (config.embeddingModel) {
      case "code":
        return CodeEmbeddingProvider(config.device);
      case "fast":
        return FastEmbeddingProvider(config.device);
      case "general":
      default:
        return GeneralEmbeddingProvider(config.device);
    }
  })();

  // Configure vector store
  const vectorStoreConfig: VectorStoreConfig = {
    provider: config.provider,
    collectionName: config.collectionName,
    dimensions: embeddingProvider.getDimensions(),
    distance: "cosine",
    persistPath: config.persistPath,
    batchSize: 100,
    maxRetries: 3,
  };

  // Create vector store based on provider
  const vectorStore = (() => {
    switch (config.provider) {
      case "chromadb":
      default:
        return new ChromaDBVectorStore(vectorStoreConfig, embeddingProvider);
    }
  })();

  // Create search engine
  const searchEngine = new SemanticSearchEngine(
    vectorStore,
    embeddingProvider,
    {
      embeddingModel: embeddingProvider.getModel(),
      vectorStore: config.provider,
      collectionName: config.collectionName,
      indexBatchSize: 50,
      searchLimit: 20,
      minSimilarity: 0.3,
      enableHybridSearch: true,
      enableReranking: true,
    }
  );

  // Initialize everything
  await searchEngine.initialize();

  return searchEngine;
}

/**
 * Quick setup for development/testing
 */
export async function createDevSemanticSearch(
  collectionName: string = "dev-code-intel"
): Promise<SemanticSearchEngine> {
  return createSemanticSearch({
    provider: "chromadb",
    embeddingModel: "fast",
    collectionName,
    device: "cpu",
  });
}

/**
 * Production setup optimized for code search
 */
export async function createProdSemanticSearch(
  collectionName: string,
  persistPath?: string
): Promise<SemanticSearchEngine> {
  return createSemanticSearch({
    provider: "chromadb",
    embeddingModel: "code",
    collectionName,
    persistPath,
    device: "cuda",
  });
}
