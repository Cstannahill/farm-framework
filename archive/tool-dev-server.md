# Type Audit Report for tool: dev-server

## \U1F4E6 Target
- **Type:** tool
- **Name:** dev-server

## \U1F4C1 Local Types Summary

- **src/dev-server.ts**
  - interface DevServerEvents
  - interface StartupPhase
  - class FarmDevServer

- **src/docker-manager.ts**
  - interface DockerOptions
  - class DockerManager

- **src/health-checker.ts**
  - interface HealthCheckResult
  - class HealthChecker

- **src/logger.ts**
  - type LogLevel
  - interface LogEntry
  - class Logger

- **src/process-manager.ts**
  - class ProcessManager

- **src/service-configs.ts**
  - class ServiceConfigManager

- **src/types.ts**
  - interface ServiceCommand
  - interface ServiceConfig
  - interface ProcessInfo
  - type ServiceStatusType
  - interface ServiceStatus
  - interface LogEntry
  - interface DevServerOptions
  - interface FarmConfig
  - type TemplateType
  - type FeatureType
  - interface DatabaseConfig
  - interface AIConfig
  - interface OllamaConfig
  - interface OpenAIConfig
  - interface HuggingFaceConfig
  - interface DevelopmentConfig
  - type PluginConfig
  - interface DevServerEvents
  - class DevServerError
  - class ServiceStartupError
  - class HealthCheckError
  - class ConfigurationError
  - interface StartupPhase
  - interface FileWatcherConfig
  - interface FileChangeEvent
  - interface ProxyConfig
  - interface ProxyRoute
  - interface DevServerState
  - type Awaitable< T >
  - type EventHandler< T extends keyof DevServerEvents >
  - interface ValidationResult
  - interface ServiceDependency
  - interface PerformanceMetrics
  - interface DockerConfig
  - interface EnvironmentInfo
  - interface DevServerStats

## \U267B Shared Type Cross-Reference
- ✅ **None** - all local types are declared internally.
- ❌ **Duplicates:** FarmConfig, TemplateType, FeatureType, DatabaseConfig, AIConfig, OllamaConfig, OpenAIConfig, HuggingFaceConfig, DevelopmentConfig, PluginConfig, ValidationResult, ConfigurationError. These exist in `packages/types` but are redefined locally.
- ⚠️ **Candidate for centralization:** DevServerStats and related DevServerState if other tools begin consuming them.

## \U26D4 Violations
- Redefinition of configuration types already exported from `@farm-framework/types`.
- Local `ValidationResult` structure differs from shared version in `packages/types/src/templates.ts`.
- `ConfigurationError` class locally differs from `ConfigurationError` interface in shared types.

## \u2705 Suggestions for Sync
- Remove duplicated config-related interfaces from `tools/dev-server/src/types.ts` and import them from `@farm-framework/types`.
- Add `@farm-framework/types` as a dependency of `@farm-framework/dev-server`.
- Review if `DevServerState` and `DevServerStats` should be promoted to shared types once other packages depend on them.
