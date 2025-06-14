/**
 * FARM Watcher Types
 * Shared types for file watching, hot reload, and change detection
 */

/**
 * File change event information
 */
export interface FileChangeEvent {
  /** Type of file change */
  type: "change" | "add" | "unlink";
  /** Path to the changed file */
  path: string;
  /** Timestamp when change occurred */
  timestamp: number;
  /** Systems affected by this change */
  affectedSystems: string[];
}

/**
 * Result of a regeneration operation
 */
export interface RegenerationResult {
  /** Whether regeneration was successful */
  success: boolean;
  /** List of files that were changed */
  changedFiles: string[];
  /** Any errors encountered during regeneration */
  errors: string[];
  /** Time taken for regeneration (ms) */
  duration: number;
}

/**
 * Plan for what needs to be regenerated
 */
export interface RegenerationPlan {
  /** Whether full regeneration is needed */
  fullRegeneration: boolean;
  /** Set of models that changed */
  changedModels: Set<string>;
  /** Set of routes that changed */
  changedRoutes: Set<string>;
  /** Set of types that are affected */
  affectedTypes: Set<string>;
  /** Set of API methods that are affected */
  affectedApiMethods: Set<string>;
}

/**
 * Current status of the file watcher
 */
export interface WatcherStatus {
  /** Whether file watching is active */
  isWatching: boolean;
  /** List of active watcher identifiers */
  activeWatchers: string[];
  /** Whether regeneration is currently in progress */
  isRegenerating: boolean;
  /** Number of changes queued for processing */
  queuedChanges: number;
}

/**
 * Hot reload coordinator status
 */
export interface HotReloadStatus {
  /** Whether hot reload is active */
  isActive: boolean;
  /** Whether type generation hot reload is enabled */
  typeGeneration: boolean;
  /** Whether AI model hot reload is enabled */
  aiModels: boolean;
  /** Whether regeneration is currently in progress */
  isRegenerating: boolean;
  /** Number of changes queued for processing */
  queuedChanges: number;
}

/**
 * Configuration for file watcher
 */
export interface FileWatcherConfig {
  /** Paths to watch for changes */
  paths: string[];
  /** Patterns to ignore */
  ignored?: string[];
  /** Whether to maintain persistent watching */
  persistent?: boolean;
  /** Whether to ignore initial file scan */
  ignoreInitial?: boolean;
  /** Debounce delay in milliseconds */
  debounceMs?: number;
}

/**
 * Hot reload event data
 */
export interface HotReloadEvent {
  /** Type of hot reload event */
  type: "types" | "ai-models" | "config" | "frontend";
  /** Whether the reload was successful */
  success: boolean;
  /** Files that were changed */
  changedFiles?: string[];
  /** Duration of the reload operation */
  duration?: number;
  /** Error information if reload failed */
  error?: string;
}

/**
 * Watcher event types for type safety
 */
export type WatcherEventType =
  | "file-changed"
  | "regeneration-complete"
  | "regeneration-error"
  | "frontend-update-required"
  | "ai-file-changed"
  | "config-changed"
  | "hot-reload-complete"
  | "hot-reload-error";

/**
 * Generic watcher event payload
 */
export interface WatcherEvent<T = any> {
  /** Type of the event */
  type: WatcherEventType;
  /** Event-specific data */
  data: T;
  /** Timestamp when event occurred */
  timestamp: number;
}
