// Core Framework Types
export * from "./config.js";
export * from "./core.js";
export * from "./ai.js";
export * from "./database.js";
export * from "./errors.js";
export * from "./auth.js";

// Deployment types (explicit exports to avoid conflicts)
export type {
  Platform,
  DeploymentRegion,
  DeploymentStrategy,
  ServiceType,
  DeploymentEnvironment,
  ResourceLimits,
  ProjectAnalysis,
  PlatformScore,
  PlatformRecommendation,
  DeploymentService,
  VolumeMount,
  HealthCheckConfig,
  DeploymentPlan,
  CostItem,
  CostEstimate,
  DeployOptions,
  DeployContext,
  DeploymentResult,
  DeploymentError,
  ErrorDiagnosis,
  DeploymentHealthCheck,
  DeploymentHealthStatus,
  DeploymentHealthReport,
  Snapshot,
  RollbackOptions,
  DeploymentStep,
  ProgressUpdate,
  RailwayConfig,
  RailwayService,
  FlyConfig,
  VercelConfig,
  DeploymentMetrics,
  DeployRecipe,
  DeploymentConfig,
} from "./deployment.js";

// API Client Types
export * from "./api-client.js";

// Telemetry and Cost Types
export * from "./telemetry.js";
export * from "./cost.js";

// Observability Types (explicit exports to avoid conflicts)
export type {
  Alert,
  AlertAction,
  AlertSeverity,
  AlertNotification,
  NotificationResult,
  AlertChannelConfig,
  AlertChannel,
  AlertRule,
  AlertCondition,
  AlertConfig,
  AlertContext,
  ExportOptions,
  CSVExportOptions,
  DashboardExportOptions,
  ExportedDashboard,
  DashboardWidgetConfig,
  ObservabilityConfig,
  TelemetryConfig,
  ExporterConfig,
  ExportFormat,
  DashboardWidget,
  DashboardLayout,
  HealthStatus as ObservabilityHealthStatus,
  HealthCheck as ObservabilityHealthCheck,
  PDFExportOptions,
  ExportedPDF,
  AlertSummary,
  CollectorOptions,
  PredictorConfig,
  CustomTelemetryProviderConfig,
  CostTrackingConfig,
} from "./observability.js";

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

// CLI Template types
export type {
  TemplateName,
  FeatureName,
  EnvironmentName,
  CreateCommandOptions,
  CLITemplateContext,
  TemplateFile,
  TemplateDirectory,
  CLITemplateDefinition,
  TemplateProcessingError,
  ConfigurationValidationError,
} from "./cli-template.js";

// CLI Template functions (exported as values)
export {
  isTemplateName,
  isFeatureName,
  createTemplateContext,
} from "./cli-template.js";

// Codegen Types
export * from "./codegen.js";

// Watcher Types
export * from "./watcher.js";

// Type Sync Types
export * from "./type-sync.js";

// CLI Command types
export type {
  AddUIOptions,
  BuildCommandOptions,
  MigrateOptions,
  DevCommandOptions,
  DeployCommandOptions,
  GenerateCommandOptions,
  ConfigOptions,
  ConfigLoadOptions,
  CopyOptions,
  TemplateVariables,
  ProgressOptions,
  StepOptions,
  ExistingFileGeneratorInterface,
  ProjectFileGeneratorHooks,
  GenerationMetrics,
  DirectoryStructure,
  PythonFormatterOptions,
  ScaffoldResult,
  ScaffoldingOptions,
  ScaffoldingResult,
  TemplateProcessingOptions,
  ProgressInfo,
  TemplateProcessingResult,
  ProcessingMetrics,
  ValidationError,
  ValidationWarning,
  ValidationMetrics,
  ValidationOptions,
  ErrorContext,
  ExecOptions,
  GitInitOptions,
  PackageInstallOptions,
  PromptChoice,
  PromptQuestion,
  LogLevel,
  LoggerOptions,
  // Tools CLI types
  GenerateAllOptions,
  GenerateHooksOptions,
  GenerateTypesOptions,
  GenerateClientOptions,
} from "./cli-commands.js";

// Template types
export type {
  TemplateDefinition,
  ProjectStructure,
  FileStructure,
  DirectoryStructure as TemplateDirectoryStructure,
  TemplateDependencies,
  PackageDependency,
  PythonDependency,
  TemplatePrompt,
  PromptChoice as TemplatePromptChoice,
  TemplateContext,
  TemplateConfig,
  TestResult,
  ValidationResult as TemplateValidationResult,
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
