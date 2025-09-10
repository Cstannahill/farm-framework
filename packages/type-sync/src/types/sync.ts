/**
 * Type definitions for sync operations
 */

export interface SyncResult {
  success: boolean;
  filesGenerated: number;
  fromCache: boolean;
  artifacts?: string[];
  generatedFiles?: string[]; // For backwards compatibility
  errors?: string[];
  performance?: {
    totalTime: number;
    extractionTime: number;
    generationTime: number;
    cacheTime: number;
    parallelJobs: number;
  };
  generationDetails?: Array<{
    generator: string;
    file: string;
    time: number;
    fromCache: boolean;
    size: number;
  }>;
}

export interface SyncOptions {
  apiUrl: string;
  outputDir?: string;
  performance?: {
    enableMonitoring?: boolean;
    enableIncrementalGeneration?: boolean;
    maxConcurrency?: number;
    cacheTimeout?: number;
  };
  features: {
    client: boolean;
    hooks: boolean;
    streaming: boolean;
    aiHooks: boolean;
  };
  generators?: Record<string, any>;
}
