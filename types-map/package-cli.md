# Type Audit Report for package: cli

## 📦 Target
- **Type:** package
- **Name:** cli

## 📁 Local Types Summary
- `packages/cli/src/commands/add-ui.ts` — `interface AddUIOptions`
- `packages/cli/src/commands/build.ts` — `interface BuildCommandOptions`
- `packages/cli/src/commands/database.ts` — `interface MigrateOptions`
- `packages/cli/src/commands/dev.ts` — `interface DevCommandOptions`
- `packages/cli/src/commands/generate.ts` — `interface GenerateCommandOptions`
- `packages/cli/src/commands/utils/logger.ts` — `type LogLevel`, `interface LoggerOptions`
- `packages/cli/src/config/generator.ts` — `interface ConfigOptions`
- `packages/cli/src/core/config.ts` — `interface ConfigLoadOptions`
- `packages/cli/src/core/fs-utils.ts` — `interface CopyOptions`, `interface TemplateVariables`
- `packages/cli/src/core/progress.ts` — `interface ProgressOptions`, `interface StepOptions`
- `packages/cli/src/generators/file-generator-adapter.ts` — `interface ExistingFileGeneratorInterface`
- `packages/cli/src/generators/project-file-generator.ts` — `interface ProjectFileGeneratorHooks`, `interface GenerationMetrics`
- `packages/cli/src/generators/project-structure.ts` — `interface DirectoryStructure`
- `packages/cli/src/postProcessors/pythonFormatter.ts` — `interface PythonFormatterOptions`
- `packages/cli/src/scaffolding/scaffolder.ts` — `interface ScaffoldResult`
- `packages/cli/src/scaffolding/types.ts` — `interface ScaffoldingOptions`, `interface ScaffoldingResult`
- `packages/cli/src/template/definitions.ts` — `interface TemplateDefinition`, `interface TemplateStructure`
- `packages/cli/src/template/helpers.ts` — `interface HandlebarsInstance`, `interface HandlebarsOptions`, `interface DatabaseConfig`, `interface AIProviderConfig`, `interface AIConfig`, `interface TemplateContext`, plus multiple helper `type` aliases
- `packages/cli/src/template/processor.ts` — `interface TemplateProcessingOptions`, `interface ProgressInfo`, `interface TemplateProcessingResult`, `interface ProcessingMetrics`
- `packages/cli/src/template/types.ts` — numerous interfaces (`DatabaseConfig`, `AIProviderConfig`, `AIConfig`, `DevelopmentConfig`, `BuildConfig`, `DeploymentConfig`, `FarmConfig`, `TemplateContext`, etc.) and `type` aliases (`DatabaseType`, `FeatureName`, `TemplateName`, `EnvironmentName`, `PluginConfig`), plus error classes used for typing
- `packages/cli/src/template/validator.ts` — `interface ValidationResult`, `interface ValidationError`, `interface ValidationWarning`, `interface ValidationMetrics`, `interface ValidationOptions`
- `packages/cli/src/utils/error-handling.ts` — `interface ErrorContext`
- `packages/cli/src/utils/exec.ts` — `interface ExecOptions`
- `packages/cli/src/utils/git-initializer.ts` — `interface GitInitOptions`
- `packages/cli/src/utils/logger.ts` — `type LogLevel`, `interface LoggerOptions`
- `packages/cli/src/utils/package-installer.ts` — `interface PackageInstallOptions`
- `packages/cli/src/utils/prompts.ts` — `interface PromptChoice`, `interface PromptQuestion`
- `packages/cli/src/utils/validation.ts` — `interface ValidationResult`

## 🔁 Shared Type Cross-Reference
- ✅ `DatabaseType`, `DatabaseConfig`, `AIConfig`, `DevelopmentConfig`, `BuildConfig`, `DeploymentConfig`, `PluginConfig`, `FarmConfig`, `TemplateContext`, `TemplateDefinition`, `ErrorContext`, `ValidationResult` exist in `packages/types` and should be imported from `@farm/types`.
- ❌ Local definitions `FeatureName`, `TemplateName`, `EnvironmentName`, `AIProviderConfig`, `CreateCommandOptions`, `TemplateFile`, `TemplateDirectory`, `TemplateProcessingError`, `ConfigurationValidationError` have no equivalents in `packages/types`.
- ⚠️ Several option interfaces (`BuildCommandOptions`, `DevCommandOptions`, `GenerateCommandOptions`, etc.) overlap with shared CLI option types like `BuildOptions`, `DevOptions`, `GenerateOptions` in `packages/types/src/cli.ts` but differ in structure or naming.

## ❌ Violations
- Duplicate type declarations for core concepts (`DatabaseConfig`, `AIConfig`, `FarmConfig`, `TemplateContext`, etc.) exist both locally and in `packages/types`.
- Local option interfaces partially replicate shared CLI option types, causing divergence.
- Deprecated comments indicate types were moved to `@farm/types` but local copies remain.

## ✅ Suggestions for Sync
- Replace local copies of common types (e.g., `DatabaseConfig`, `AIConfig`, `FarmConfig`, `TemplateContext`, `ErrorContext`, `ValidationResult`) with imports from `@farm/types`.
- Align option interfaces (`BuildCommandOptions`, `DevCommandOptions`, etc.) with the corresponding shared types in `packages/types/src/cli.ts` or extend them instead of redefining.
- Consider moving remaining reusable types (`FeatureName`, `TemplateName`, `EnvironmentName`, `AIProviderConfig`, `CreateCommandOptions`, `TemplateFile`, `TemplateDirectory`) into `packages/types` if shared across packages.
- Remove deprecated local definitions once centralized types are adopted.
