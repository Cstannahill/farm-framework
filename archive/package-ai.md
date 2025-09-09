# Type Audit Report for package: ai

## 📦 Target
- **Type:** package
- **Name:** ai

## 📁 Local Types Summary
- `packages/ai/src/providers/base.ts`
  - `interface ChatMessage`
  - `interface GenerationOptions`
  - `interface GenerationRequest`
  - `interface GenerationResponse`
  - `interface ModelInfo`
  - `interface ProviderStatus`
  - `interface ProviderConfig`
  - `interface StreamChunk`
  - `interface ProviderHealthCheck`
  - `class BaseAIProvider`
  - `interface ProviderFactory`
  - `interface IProviderRegistry`
  - `class ProviderError`
  - `class ModelNotFoundError`
  - `class ProviderUnavailableError`
  - `class InvalidRequestError`
- `packages/ai/src/registry/provider-registry.ts`
  - `interface RegistryConfig`
  - `interface ProviderRegistryStatus`
  - `class ProviderRegistry`
  - `const globalProviderRegistry`
- `packages/ai/src/config/ai-config.ts`
  - `type ProviderConfig`
  - `type OllamaConfig`
  - `type OpenAIConfig`
  - `type HuggingFaceConfig`
  - `type CustomProviderConfig`
  - `type AIRoutingConfig`
  - `type AIFeaturesConfig`
  - `type AIConfig`
  - `class AIConfigManager`
  - `function createDefaultAIConfig`
  - `function mergeAIConfigs`
- `packages/ai/src/errors/error-handler.ts`
  - `enum ErrorCategory`
  - `enum ErrorSeverity`
  - `interface ErrorContext`
  - `interface ErrorDetails`
  - `class AIError`
  - `class NetworkError`
  - `class AuthenticationError`
  - `class RateLimitError`
  - `class ModelError`
  - `class ValidationError`
  - `class TimeoutError`
  - `class ConfigurationError`
  - `class ProviderUnavailableError`
  - `interface ErrorHandlerOptions`
  - `interface ErrorMetrics`
  - `class AIErrorHandler`
  - `const globalErrorHandler`
- `packages/ai/src/health/health-checker.ts`
  - `interface HealthMetrics`
  - `interface HealthCheckOptions`
  - `interface HealthCheck`
  - `interface HealthCheckResult`
  - `interface ProviderHealthReport`
  - `interface SystemHealthReport`
  - `class HealthChecker`
  - `function createConnectivityCheck`
  - `function createModelLoadCheck`
- `packages/ai/src/index.ts`
  - `class AISystem`
  - `function exampleUsage`

## 🔁 Shared Type Cross-Reference
- ✅ Types correctly imported from `@farm/types`: none
- ❌ Duplicates found across other packages:
  - `ChatMessage`, `ModelInfo`, and `ProviderStatus` also defined in `packages/types/src/ai.ts`
  - `ErrorContext` also defined in `packages/types/src/errors.ts`
- ⚠️ Types that should be centralized but are currently local:
  - `GenerationRequest`, `GenerationResponse`, and related provider error types
  - Provider configuration types (e.g., `ProviderConfig`, `OllamaConfig`, `OpenAIConfig`)
  - AI error handling types such as `ErrorCategory`, `ErrorSeverity`, `AIError`

## 🚫 Violations
- Local definitions for `ChatMessage`, `ModelInfo`, `ProviderStatus`, and `ErrorContext` duplicate shared types with differing structures
- Multiple conflicting definitions of `ProviderConfig` within the package
- No imports from `@farm/types` detected in the package

## ✅ Suggestions for Sync
- Replace local `ChatMessage`, `ModelInfo`, and `ProviderStatus` with imports from `@farm/types/ai`
- Consolidate provider configuration types under `packages/types` and import them here
- Move error handling types (`ErrorCategory`, `ErrorSeverity`, `AIError`, `ErrorContext`, etc.) to `packages/types/errors.ts` and re-export
- Ensure all packages consume these shared types via `@farm/types`
