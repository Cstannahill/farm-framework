declare module "@farm/type-sync" {
  import type { EventEmitter } from "events";
  export interface OpenAPISchema {
    openapi: string;
    info: any;
    paths: Record<string, any>;
    components?: Record<string, any>;
    [key: string]: any;
  }
  export interface SyncOptions {
    apiUrl: string;
    outputDir: string;
    features: {
      client?: boolean;
      hooks?: boolean;
      streaming?: boolean;
      aiHooks?: boolean;
    };
    performance?: {
      enableMonitoring?: boolean;
      enableIncrementalGeneration?: boolean;
      maxConcurrency?: number;
      cacheTimeout?: number;
    };
  }
  export interface SyncResult {
    filesGenerated: number;
    fromCache: boolean;
    artifacts?: string[];
    performance?: {
      extractionTime?: number;
      generationTime?: number;
      cacheTime?: number;
      parallelJobs?: number;
      totalTime?: number;
    };
  }
  export class TypeSyncOrchestrator {
    constructor(): void;
    initialize(config: SyncOptions): Promise<void>;
    syncOnce(config?: SyncOptions): Promise<SyncResult>;
  }
  export class TypeSyncWatcher extends EventEmitter {
    constructor(orchestrator: TypeSyncOrchestrator);
    start(): Promise<void>;
    stop(): Promise<void>;
  }
  export class GenerationCache {
    constructor(baseDir: string, options?: any);
    hashSchema(schema: any): string;
    set(hash: string, entry: any): Promise<void>;
    get(hash: string): Promise<any>;
  }
  export class TypeDiffer {
    hasSchemaChanges(a: any, b: any): boolean;
    compareDirectories(a: string, b: string): Promise<any[]>;
  }
  export class OpenAPIExtractor {
    extractFromFastAPI(
      root: string,
      outFile: string,
      options?: any
    ): Promise<any>;
  }
  export class TypeScriptGenerator {}
}
