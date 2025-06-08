// Core Framework Types
export * from "./config.js";
export * from "./core.js";
export * from "./ai.js";
export * from "./database.js";
export * from "./errors.js";

// CLI types (separate to avoid conflicts)
export type {
  CLIOptions,
  CreateOptions,
  DevOptions,
  BuildOptions as CLIBuildOptions,
  GenerateOptions,
  CommandResult,
  CLIContext,
  Logger as CLILogger,
  Spinner,
} from "./cli.js";

// Template types
export type {
  TemplateDefinition,
  ProjectStructure,
  FileStructure,
  DirectoryStructure,
  TemplateDependencies,
  PackageDependency,
  PythonDependency,
  TemplatePrompt,
  PromptChoice,
  TemplateContext,
  TemplateConfig,
  TestResult,
  ValidationResult,
} from "./templates.js";

// Plugin types
export type {
  PluginDefinition,
  PluginConfigSchema,
  ConfigPropertySchema,
  PluginContext,
  PluginHooks,
  PluginDependency,
  Logger as PluginLogger,
  ServiceRegistry,
} from "./plugins.js";

// Build types
export type {
  BuildConfig as CoreBuildConfig,
  BuildResult,
  BuildArtifact,
  BuildError as CoreBuildError,
  BuildWarning,
  BundleAnalysis,
  ChunkInfo,
  AssetInfo,
  ModuleInfo,
  DependencyInfo,
} from "./build.js";

// Re-export main config type
export type { FarmConfig } from "./config.js";
