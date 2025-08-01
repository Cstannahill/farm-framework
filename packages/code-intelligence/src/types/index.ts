// Core entity types
export interface CodeEntity {
  id: string;
  filePath: string;
  entityType: EntityType;
  name: string;
  content: string;
  docstring?: string;
  signature?: string;
  dependencies: string[];
  references: string[];
  complexity: number;
  tokens: number;
  embedding?: number[];
  metadata: EntityMetadata;
  relationships: EntityRelationship[];
  position: CodePosition;
}

export enum EntityType {
  Function = "function",
  Class = "class",
  Method = "method",
  Component = "component",
  Hook = "hook",
  Interface = "interface",
  Type = "type",
  Enum = "enum",
  Variable = "variable",
  Module = "module",
}

export interface EntityMetadata {
  async?: boolean;
  exported?: boolean;
  decorators?: string[];
  modifiers?: string[];
  language: string;
  framework?: string;
  [key: string]: any;
}

export interface EntityRelationship {
  sourceId: string;
  targetId: string;
  relationshipType: RelationshipType;
  metadata?: Record<string, any>;
}

export enum RelationshipType {
  Imports = "imports",
  Extends = "extends",
  Implements = "implements",
  Uses = "uses",
  UsedBy = "usedBy",
  Contains = "contains",
  ContainedBy = "containedBy",
  Tests = "tests",
  TestedBy = "testedBy",
}

export interface CodePosition {
  line: number;
  column: number;
  endLine?: number;
  endColumn?: number;
}

// Query types
export interface QueryRequest {
  query: string;
  maxResults?: number;
  includeContext?: boolean;
  filters?: QueryFilters;
  options?: QueryOptions;
}

export interface QueryFilters {
  entityTypes?: EntityType[];
  filePatterns?: string[];
  languages?: string[];
  frameworks?: string[];
  dateRange?: DateRange;
  complexity?: ComplexityRange;
}

export interface QueryOptions {
  useAiSynthesis?: boolean;
  includeRelationships?: boolean;
  includeDependencies?: boolean;
  includeMetrics?: boolean;
  groupBy?: string;
}

export interface QueryResponse {
  results: SearchResult[];
  synthesis?: string;
  plan?: QueryPlan;
  context?: QueryContext;
  metrics?: QueryMetrics;
  error?: string;
}

export interface SearchResult {
  id: string;
  score: number;
  entity: CodeEntity;
  highlights?: string[];
  explanation?: string;
  relevantContext?: CodeEntity[];
}

export interface QueryPlan {
  queryType: string; // search, explain, analyze, generate
  searchStrategy: string; // semantic, keyword, hybrid
  filters: Record<string, any>;
  includeContext: boolean;
  maxResults: number;
  useAiSynthesis: boolean;
}

export interface QueryContext {
  projectRoot?: string;
  currentFile?: string;
  selectedText?: string;
  maxResults?: number;
  includeContext?: boolean;
  filters?: QueryFilters;
}

export interface QueryMetrics {
  totalResults: number;
  searchTime: number;
  synthesisTime?: number;
  cacheHit: boolean;
}

// Analysis types
export interface CodebaseAnalysis {
  entityCount: number;
  relationshipCount: number;
  patterns: ArchitecturalPattern[];
  metrics: CodebaseMetrics;
  layers: ArchitecturalLayer[];
  improvements: Improvement[];
  hotspots: Hotspot[];
  dependencies: DependencyAnalysis;
}

export interface ArchitecturalPattern {
  type: string;
  entities: string[];
  confidence: number;
  metadata?: Record<string, any>;
}

export interface ArchitecturalLayer {
  name: string;
  entities: string[];
  dependencies: string[];
  level: number;
}

export interface Improvement {
  type: string;
  description: string;
  severity: "low" | "medium" | "high" | "critical";
  suggestions: string[];
  affectedEntities: string[];
}

export interface Hotspot {
  entityId: string;
  type: string;
  severity: "low" | "medium" | "high" | "critical";
  message: string;
  suggestions?: string[];
}

export interface CodebaseMetrics {
  totalLines: number;
  totalFiles: number;
  averageComplexity: number;
  testCoverage?: number;
  duplicationRatio?: number;
  maintainabilityIndex?: number;
}

export interface DependencyAnalysis {
  external: ExternalDependency[];
  internal: InternalDependency[];
  circular: CircularDependency[];
  unused: string[];
}

export interface ExternalDependency {
  package: string;
  version: string;
  usedBy: string[];
  directUsers: number;
  transitiveUsers: number;
}

export interface InternalDependency {
  source: string;
  target: string;
  type: RelationshipType;
  strength: number;
}

export interface CircularDependency {
  entities: string[];
  severity: "warning" | "error";
  suggestions: string[];
}

// Date and complexity range filters
export interface DateRange {
  start: Date;
  end: Date;
}

export interface ComplexityRange {
  min: number;
  max: number;
}

// WebSocket types for real-time updates
export interface IntelligenceWebSocketMessage {
  type: "entity_updated" | "index_progress" | "analysis_complete" | "error";
  data: any;
  timestamp: string;
}

// API response types
export interface IndexStatus {
  indexedFiles: number;
  totalEntities: number;
  lastUpdated: Date;
  indexHealth: "healthy" | "degraded" | "rebuilding";
  vectorCount: number;
  processingQueue: number;
  errors: IndexError[];
}

export interface IndexError {
  file: string;
  error: string;
  timestamp: Date;
  severity: "warning" | "error";
}

export interface ExplanationResponse {
  entity: CodeEntity;
  explanation: string;
  context?: EntityContext;
  examples?: CodeExample[];
  tests?: TestCase[];
}

export interface EntityContext {
  entity: CodeEntity;
  related: CodeEntity[];
  usages: CodeEntity[];
  tests: CodeEntity[];
  documentation: CodeEntity[];
  callGraph?: CallGraphNode[];
  dataFlow?: DataFlowEdge[];
}

export interface CodeExample {
  description: string;
  code: string;
  file: string;
  line: number;
}

export interface TestCase {
  name: string;
  file: string;
  line: number;
  description?: string;
}

export interface CallGraphNode {
  id: string;
  name: string;
  type: string;
  callers: string[];
  callees: string[];
}

export interface DataFlowEdge {
  source: string;
  target: string;
  variable: string;
  type: "read" | "write" | "modify";
}

// Summary types for API responses
export interface CodeEntitySummary {
  id: string;
  file: string;
  line: number;
  name: string;
  type: string;
  preview?: string;
}

// Client streaming types
export interface StreamingQueryResponse {
  type: "result" | "synthesis" | "complete" | "error";
  data?: any;
  error?: string;
}

// Client-specific types
export interface CodeIntelligenceClientConfig {
  baseUrl?: string;
  timeout?: number;
  apiKey?: string;
  retries?: number;
  cache?: boolean;
}

export interface ClientQueryRequest {
  query: string;
  maxResults?: number;
  includeContext?: boolean;
  filters?: ClientQueryFilters;
}

export interface ClientQueryFilters {
  entityTypes?: EntityType[];
  filePatterns?: string[];
  languages?: string[];
  frameworks?: string[];
}

export interface ClientSearchOptions {
  stream?: boolean;
  timeout?: number;
  signal?: AbortSignal;
}

export interface ClientExplainRequest {
  entityName: string;
  includeExamples?: boolean;
  includeTests?: boolean;
  includeContext?: boolean;
}

export interface WebSocketClientOptions {
  url: string;
  reconnect?: boolean;
  maxReconnectAttempts?: number;
  reconnectDelay?: number;
}
