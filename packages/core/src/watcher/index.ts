// packages/core/src/watcher/index.ts
export { FarmFileWatcher } from "./file-watcher.js";
export { HotReloadCoordinator } from "./hot-reload-coordinator.js";
export type {
  FileChangeEvent,
  RegenerationResult,
  RegenerationPlan,
  WatcherStatus,
  HotReloadStatus,
} from "@farm-framework/types";
