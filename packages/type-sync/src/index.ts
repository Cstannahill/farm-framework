// packages/core/src/codegen/type-sync/index.ts
export { TypeSyncOrchestrator } from "./orchestrator";
export { TypeSyncWatcher } from "./watcher";
export { GenerationCache } from "./cache";
export { TypeDiffer } from "./type-sync";
export { TypeScriptGenerator } from "./generators/typescript";
export type { TypeScriptGenerationOptions } from "./generators/typescript";
export { APIClientGenerator } from "./generators/api-client";
export type { APIClientGeneratorOptions } from "./generators/api-client";
export { ReactHookGenerator } from "./generators/react-hooks";
export type { ReactHookGeneratorOptions } from "./generators/react-hooks";
export { AIHookGenerator } from "./generators/ai-hooks";
export type { AIHookGeneratorOptions } from "./generators/ai-hooks";
export type { SyncOptions, SyncResult } from "./orchestrator";
