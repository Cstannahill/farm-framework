export interface FarmConfig {
  api?: {
    url?: string;
    port?: number;
    timeout?: number;
  };
  features?: {
    client?: boolean;
    hooks?: boolean;
    streaming?: boolean;
    aiHooks?: boolean;
  };
  codegen?: {
    outputDir?: string;
    enableCache?: boolean;
    enableIncrementalGeneration?: boolean;
  };
  ai?: {
    enabled?: boolean;
    provider?: string;
    models?: string[];
  };
  development?: {
    enableHotReload?: boolean;
    enableWatcher?: boolean;
    api?: {
      url?: string;
      port?: number;
    };
  };
}
