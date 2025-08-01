// Main entry point for the code intelligence package

// Configuration
export * from "./config";

// Core types (selective exports to avoid conflicts)
export type {
  CodeEntity,
  EntityType,
  QueryRequest,
  SearchResult,
  ClientExplainRequest,
  ExplanationResponse
} from "./types/index";

// Core functionality
export { CodeIntelligenceServer } from "./server";

// Vector database and semantic search
export * from "./vector";

// AI explanation engine
export * from "./explanation/engine";
export * from "./explanation/parser";

// AI providers
export * from "./providers";

// Client libraries (selective exports)  
export { CodeIntelligenceAPIClient } from "./client/api-client";
export { WebSocketClient } from "./client/websocket-client";

// Query engine
export { CodeQueryEngine, QueryPlanner } from "./query/engine";