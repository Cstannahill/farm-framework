/**
 * Stub types for external dependencies that may not be available
 */

// Vite stubs
export interface VitePlugin {
  name: string;
  configResolved?: (config: any) => Promise<void> | void;
  configureServer?: (server: any) => void;
}

// Webpack stubs
export interface WebpackConfiguration {
  plugins?: any[];
}

// Next.js stubs
export const NextConfig = {};
