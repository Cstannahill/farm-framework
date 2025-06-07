/**
 * Build System Types
 */

export interface BuildConfig {
  target: string;
  outDir: string;
  sourcemap: boolean;
  minify: boolean;
  splitting: boolean;
  analyze?: boolean;
  cache?: boolean;
}

export interface BuildResult {
  success: boolean;
  duration: number;
  artifacts: BuildArtifact[];
  errors?: BuildError[];
  warnings?: BuildWarning[];
}

export interface BuildArtifact {
  type: string;
  path: string;
  size: number;
  hash?: string;
  metadata?: Record<string, any>;
}

export interface BuildError {
  message: string;
  file?: string;
  line?: number;
  column?: number;
  code?: string;
}

export interface BuildWarning {
  message: string;
  file?: string;
  line?: number;
  column?: number;
}

export interface BundleAnalysis {
  totalSize: number;
  chunks: ChunkInfo[];
  assets: AssetInfo[];
  dependencies: DependencyInfo[];
}

export interface ChunkInfo {
  name: string;
  size: number;
  modules: ModuleInfo[];
}

export interface AssetInfo {
  name: string;
  size: number;
  type: string;
}

export interface ModuleInfo {
  name: string;
  size: number;
  dependencies: string[];
}

export interface DependencyInfo {
  name: string;
  version: string;
  size: number;
  treeshaken: boolean;
}
