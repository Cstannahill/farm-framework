/**
 * FARM Codegen Types
 * Shared types for code generation and type synchronization
 */
import type { SyncOptions } from "./type-sync";

/**
 * Enhanced codegen options that extend type-sync options
 * with FARM-specific configuration and progress reporting
 */
export interface CodegenOptions extends SyncOptions {
  /** Enable verbose logging during code generation */
  verbose?: boolean;
  /** Run in dry-run mode without making changes */
  dryRun?: boolean;
  /** Enable performance profiling */
  profile?: boolean;
  /** Callback for progress updates */
  progressCallback?: (progress: CodegenProgressInfo) => void;
}

/**
 * Progress information for code generation operations
 */
export interface CodegenProgressInfo {
  /** Current stage of code generation */
  stage:
    | "initialization"
    | "extraction"
    | "generation"
    | "caching"
    | "completion";
  /** Human-readable progress message */
  message: string;
  /** Progress percentage (0-100) */
  progress: number;
  /** Additional stage-specific details */
  details?: any;
}

/**
 * Performance metrics for code generation
 */
export interface CodegenMetrics {
  /** Total time taken for code generation (ms) */
  totalTime: number;
  /** Time breakdown by stage */
  stageTimings: Record<string, number>;
  /** Number of files generated */
  filesGenerated: number;
  /** Whether results were served from cache */
  fromCache: boolean;
  /** Memory usage during generation */
  memoryUsage?: {
    peak: number;
    average: number;
  };
}

/**
 * Code generation result
 */
export interface CodegenResult {
  /** Whether generation was successful */
  success: boolean;
  /** List of generated files */
  generatedFiles: string[];
  /** Any errors encountered */
  errors: string[];
  /** Performance metrics */
  metrics?: CodegenMetrics;
  /** Whether results came from cache */
  fromCache: boolean;
}
