// Sentence Transformer embedding provider for code intelligence
import type { EmbeddingProvider } from "./types";

export interface SentenceTransformerConfig {
  model: string;
  maxLength: number;
  batchSize: number;
  device: "cpu" | "cuda" | "mps";
  normalize: boolean;
}

export class SentenceTransformerProvider implements EmbeddingProvider {
  private model: string;
  private maxLength: number;
  private batchSize: number;
  private device: string;
  private normalize: boolean;
  private dimensions: number;
  private isInitialized = false;

  // Python bridge for sentence transformers
  private pythonBridge: any;

  constructor(config: SentenceTransformerConfig) {
    this.model = config.model;
    this.maxLength = config.maxLength;
    this.batchSize = config.batchSize;
    this.device = config.device;
    this.normalize = config.normalize;

    // Set dimensions based on model
    this.dimensions = this.getModelDimensions(config.model);
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Initialize Python bridge
      this.pythonBridge = await this.createPythonBridge();

      // Load the model
      await this.pythonBridge.loadModel(this.model, {
        device: this.device,
        maxLength: this.maxLength,
      });

      this.isInitialized = true;
      console.log(`✅ Initialized ${this.model} embedding provider`);
    } catch (error) {
      console.error(`Failed to initialize embedding provider: ${error}`);
      throw error;
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // Preprocess text for code content
      const processedText = this.preprocessText(text);

      // Generate embedding via Python bridge
      const embedding = await this.pythonBridge.encode([processedText], {
        normalize: this.normalize,
        convertToTensor: false,
      });

      return embedding[0];
    } catch (error) {
      console.error(`Failed to generate embedding: ${error}`);
      throw error;
    }
  }

  async generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // Process texts in batches
      const results: number[][] = [];

      for (let i = 0; i < texts.length; i += this.batchSize) {
        const batch = texts.slice(i, i + this.batchSize);
        const processedBatch = batch.map((text) => this.preprocessText(text));

        const embeddings = await this.pythonBridge.encode(processedBatch, {
          normalize: this.normalize,
          convertToTensor: false,
        });

        results.push(...embeddings);
      }

      return results;
    } catch (error) {
      console.error(`Failed to generate batch embeddings: ${error}`);
      throw error;
    }
  }

  getDimensions(): number {
    return this.dimensions;
  }

  getModel(): string {
    return this.model;
  }

  private preprocessText(text: string): string {
    // Clean and prepare text for embedding
    return text
      .replace(/\s+/g, " ") // Normalize whitespace
      .replace(/\/\*[\s\S]*?\*\//g, "") // Remove block comments
      .replace(/\/\/.*$/gm, "") // Remove line comments
      .trim()
      .substring(0, this.maxLength);
  }

  private getModelDimensions(model: string): number {
    // Map of common models to their embedding dimensions
    const modelDimensions: Record<string, number> = {
      "all-MiniLM-L6-v2": 384,
      "all-MiniLM-L12-v2": 384,
      "all-mpnet-base-v2": 768,
      "paraphrase-MiniLM-L6-v2": 384,
      "sentence-transformers/all-MiniLM-L6-v2": 384,
      "sentence-transformers/all-mpnet-base-v2": 768,
      "microsoft/codebert-base": 768,
      "microsoft/unixcoder-base": 768,
    };

    return modelDimensions[model] || 768; // Default to 768 if unknown
  }

  private async createPythonBridge(): Promise<any> {
    // Mock implementation - in production this would be a real Python bridge
    return {
      loadModel: async (model: string, config: any) => {
        console.log(`Loading model: ${model}`);
        // Simulate model loading
        await new Promise((resolve) => setTimeout(resolve, 1000));
      },

      encode: async (texts: string[], options: any) => {
        console.log(`Encoding ${texts.length} texts`);
        // Generate mock embeddings with correct dimensions
        return texts.map(() =>
          Array.from({ length: this.dimensions }, () => Math.random() - 0.5)
        );
      },
    };
  }
}

// Pre-configured providers for common use cases
export const CodeEmbeddingProvider = (device: "cpu" | "cuda" = "cpu") =>
  new SentenceTransformerProvider({
    model: "microsoft/codebert-base",
    maxLength: 512,
    batchSize: 32,
    device,
    normalize: true,
  });

export const GeneralEmbeddingProvider = (device: "cpu" | "cuda" = "cpu") =>
  new SentenceTransformerProvider({
    model: "all-mpnet-base-v2",
    maxLength: 512,
    batchSize: 32,
    device,
    normalize: true,
  });

export const FastEmbeddingProvider = (device: "cpu" | "cuda" = "cpu") =>
  new SentenceTransformerProvider({
    model: "all-MiniLM-L6-v2",
    maxLength: 256,
    batchSize: 64,
    device,
    normalize: true,
  });
