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
  private device: "cpu" | "cuda" | "mps";
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
      const processedTexts = texts.map(text => this.preprocessText(text));
      
      // Process in batches
      const results: number[][] = [];
      for (let i = 0; i < processedTexts.length; i += this.batchSize) {
        const batch = processedTexts.slice(i, i + this.batchSize);
        const embeddings = await this.pythonBridge.encode(batch, {
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
    // Clean up code text for better embeddings
    return text
      .replace(/\s+/g, ' ')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '')
      .trim()
      .slice(0, this.maxLength);
  }

  private getModelDimensions(model: string): number {
    // Common model dimensions
    const modelDimensions: Record<string, number> = {
      'all-MiniLM-L6-v2': 384,
      'all-mpnet-base-v2': 768,
      'code-search-net': 768,
      'unixcoder-base': 768,
      'codet5-base': 768,
    };

    return modelDimensions[model] || 384;
  }

  private async createPythonBridge(): Promise<any> {
    // Mock implementation - would use actual Python bridge in production
    return {
      async loadModel(model: string, options: any) {
        console.log(`Loading model ${model} with options:`, options);
      },
      async encode(texts: string[], options: any) {
        // Mock embeddings
        return texts.map(() => Array.from({length: this.dimensions}, () => Math.random()));
      }
    };
  }
}

// Pre-configured embedding providers
export const CodeEmbeddingProvider = (device: "cpu" | "cuda" = "cpu") =>
  new SentenceTransformerProvider({
    model: "microsoft/unixcoder-base",
    maxLength: 512,
    batchSize: 32,
    device,
    normalize: true,
  });

export const GeneralEmbeddingProvider = (device: "cpu" | "cuda" = "cpu") =>
  new SentenceTransformerProvider({
    model: "all-mpnet-base-v2",
    maxLength: 512,
    batchSize: 64,
    device,
    normalize: true,
  });

export const FastEmbeddingProvider = (device: "cpu" | "cuda" = "cpu") =>
  new SentenceTransformerProvider({
    model: "all-MiniLM-L6-v2",
    maxLength: 256,
    batchSize: 128,
    device,
    normalize: true,
  });