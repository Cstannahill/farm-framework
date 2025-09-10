// packages/core/src/codegen/type-sync/index.ts

// Core orchestration
export { TypeSyncOrchestrator } from "./orchestrator";
export { TypeSyncWatcher } from "./watcher";
export { GenerationCache } from "./cache";
export { TypeDiffer } from "./type-sync";

// Extractors
export { OpenAPIExtractor } from "./extractors/openapi";

// Standard generators
export { TypeScriptGenerator } from "./generators/typescript";
export type { TypeScriptGenerationOptions } from "./generators/typescript";
export { APIClientGenerator } from "./generators/api-client";
export type { APIClientGeneratorOptions } from "./generators/api-client";
export { ReactHookGenerator } from "./generators/react-hooks";
export type { ReactHookGeneratorOptions } from "./generators/react-hooks";
export { AIHookGenerator } from "./generators/ai-hooks";
export type { AIHookGeneratorOptions } from "./generators/ai-hooks";

// Enhanced generators
export { EnhancedTypeScriptGenerator } from "./generators/enhanced-typescript";
export type { EnhancedTypeScriptOptions } from "./generators/enhanced-typescript";
export { EnhancedAPIClientGenerator } from "./generators/enhanced-api-client";
export type { EnhancedAPIClientOptions } from "./generators/enhanced-api-client";

// Error handling
export * from "./errors/enhanced-errors";

// Configuration management
export { TypeSyncConfigManager } from "./config/validation";

// Performance monitoring
export { PerformanceMonitor } from "./monitoring/performance";

// Template engine
export { TemplateEngine, BuiltInTemplates } from "./templates/engine";
export type {
  Template,
  TemplateContext,
  TemplateOptions,
} from "./templates/engine";

// Plugin system
export { PluginManager } from "./plugins/manager";
export {
  customHeaderPlugin,
  prettierPlugin,
  eslintPlugin,
  schemaValidationPlugin,
} from "./plugins/manager";
export type {
  TypeSyncPlugin,
  PluginHooks,
  PluginContext,
  PluginConfig,
} from "./plugins/manager";

// Build tool integrations
export { typeSyncPlugin } from "./integrations/vite";
export { TypeSyncWebpackPlugin } from "./integrations/webpack";
export { withTypeSync } from "./integrations/nextjs";

// CLI
export { program } from "./cli/index";

// Performance optimization
export {
  PerformanceOptimizer,
  IncrementalTracker,
} from "./performance/optimizer";
export type {
  PerformanceMetrics,
  OptimizationOptions,
  GenerationTask,
} from "./performance/optimizer";

// Advanced caching
export {
  AdvancedCache,
  DistributedCacheCoordinator,
} from "./cache/advanced-cache";
export type {
  CacheEntry,
  CacheConfig,
  CacheStats,
} from "./cache/advanced-cache";

// Built-in templates
export { BUILTIN_TEMPLATES, TEMPLATE_METADATA } from "./templates/builtin";
export {
  getTemplatesByCategory,
  getTemplatesByFramework,
  getTemplateDependencies,
  isValidTemplate,
} from "./templates/builtin";

// CI/CD integration
export {
  CICDIntegrationManager,
  GitHubActionsGenerator,
  PreCommitHookGenerator,
  PackageScriptsGenerator,
} from "./cicd/integration";
export type { CICDConfig, GitHubActionsConfig } from "./cicd/integration";

// VS Code extension (only available in VSCode environment)
// export { TypeSyncExtension, activate, deactivate } from "./vscode/extension";

// Utilities
export { fetchWithRetry } from "./utils/fetchWithRetry";

// Types
export type { SyncOptions, SyncResult } from "./types/sync";
export type { OpenAPISchema } from "@farm-framework/types";
