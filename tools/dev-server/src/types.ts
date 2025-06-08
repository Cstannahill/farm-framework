// tools/dev-server/src/types.ts
import type { ChildProcess } from "child_process";

// Service configuration types
export interface ServiceCommand {
  cmd: string;
  args: string[];
}

export interface ServiceConfig {
  name: string;
  key: string;
  command: ServiceCommand;
  cwd?: string;
  env?: Record<string, string>;
  healthCheck?: string;
  healthTimeout?: number;
  required: boolean;
  autoRestart: boolean;
  order: number;
  postStart?: (config: ServiceConfig) => Promise<void>;
}

// Process information
export interface ProcessInfo {
  name: string;
  process: ChildProcess;
  config: ServiceConfig;
  status: ServiceStatusType;
  startTime: number;
  restartCount: number;
  logs: LogEntry[];
}

export type ServiceStatusType =
  | "starting"
  | "healthy"
  | "unhealthy"
  | "stopping"
  | "stopped"
  | "error";

export interface ServiceStatus {
  name: string;
  status: ServiceStatusType;
  pid?: number;
  startTime: number;
  restartCount: number;
  uptime: number;
}

// Log entry for service logs
export interface LogEntry {
  timestamp: number;
  level: "info" | "warn" | "error" | "debug";
  stream: "stdout" | "stderr";
  message: string;
}

// Development server options
export interface DevServerOptions {
  port?: number;
  frontendOnly?: boolean;
  backendOnly?: boolean;
  verbose?: boolean;
  configPath?: string;
  skipHealthCheck?: boolean;
  services?: string[];
}

// FARM configuration types (from existing types package)
/**
 * @deprecated Moved to `@farm/types` package
 */
export interface FarmConfig {
  name?: string;
  template: TemplateType;
  features?: FeatureType[];
  database?: DatabaseConfig;
  ai?: AIConfig;
  development?: DevelopmentConfig;
  plugins?: PluginConfig[];
}

/**
 * @deprecated Moved to `@farm/types` package
 */
export type TemplateType =
  | "basic"
  | "ai-chat"
  | "ai-dashboard"
  | "ecommerce"
  | "cms"
  | "api-only";

/**
 * @deprecated Moved to `@farm/types` package
 */
export type FeatureType =
  | "auth"
  | "ai"
  | "realtime"
  | "payments"
  | "email"
  | "storage"
  | "search"
  | "analytics";

/**
 * @deprecated Moved to `@farm/types` package
 */
export interface DatabaseConfig {
  type: "mongodb" | "postgresql" | "mysql" | "sqlite";
  url?: string;
  options?: Record<string, any>;
}

/**
 * @deprecated Moved to `@farm/types` package
 */
export interface AIConfig {
  providers?: {
    ollama?: OllamaConfig;
    openai?: OpenAIConfig;
    huggingface?: HuggingFaceConfig;
  };
  routing?: {
    development?: string;
    staging?: string;
    production?: string;
  };
  features?: {
    streaming?: boolean;
    caching?: boolean;
    rateLimiting?: boolean;
    fallback?: boolean;
  };
}

/**
 * @deprecated Moved to `@farm/types` package
 */
export interface OllamaConfig {
  enabled: boolean;
  url?: string;
  models: string[];
  defaultModel: string;
  autoStart?: boolean;
  autoPull?: string[];
  gpu?: boolean;
}

/**
 * @deprecated Moved to `@farm/types` package
 */
export interface OpenAIConfig {
  enabled: boolean;
  apiKey?: string;
  models: string[];
  defaultModel: string;
  rateLimiting?: {
    requestsPerMinute?: number;
    tokensPerMinute?: number;
  };
}

/**
 * @deprecated Moved to `@farm/types` package
 */
export interface HuggingFaceConfig {
  enabled: boolean;
  token?: string;
  models: string[];
  device?: "auto" | "cpu" | "cuda";
}

/**
 * @deprecated Moved to `@farm/types` package
 */
export interface DevelopmentConfig {
  ports?: {
    frontend?: number;
    backend?: number;
    proxy?: number;
    database?: number;
    ollama?: number;
  };
  hotReload?: {
    enabled?: boolean;
    typeGeneration?: boolean;
    aiModels?: boolean;
  };
  ssl?: boolean;
}

/**
 * @deprecated Moved to `@farm/types` package
 */
export type PluginConfig = string | [string, Record<string, any>];

// Development server events
export interface DevServerEvents {
  "service-starting": (name: string) => void;
  "service-ready": (name: string) => void;
  "service-error": (name: string, error: Error) => void;
  "service-exit": (
    name: string,
    code: number | null,
    signal: string | null
  ) => void;
  "service-stopped": (name: string) => void;
  "service-log": (
    name: string,
    stream: "stdout" | "stderr",
    message: string
  ) => void;
  "critical-service-failed": (name: string) => void;
  "all-services-ready": () => void;
  "shutdown-started": () => void;
  "shutdown-complete": () => void;
}

// Error types
export class DevServerError extends Error {
  constructor(
    message: string,
    public service?: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = "DevServerError";
  }
}

export class ServiceStartupError extends DevServerError {
  constructor(serviceName: string, originalError: Error) {
    super(
      `Failed to start service: ${serviceName}`,
      serviceName,
      originalError
    );
    this.name = "ServiceStartupError";
  }
}

export class HealthCheckError extends DevServerError {
  constructor(serviceName: string, url: string, originalError: Error) {
    super(
      `Health check failed for ${serviceName} at ${url}`,
      serviceName,
      originalError
    );
    this.name = "HealthCheckError";
  }
}

export class ConfigurationError extends DevServerError {
  constructor(message: string, originalError?: Error) {
    super(`Configuration error: ${message}`, undefined, originalError);
    this.name = "ConfigurationError";
  }
}

// Service startup phases
export interface StartupPhase {
  name: string;
  services: string[];
  parallel: boolean;
  required: boolean;
}

// Default service startup phases
export const DEFAULT_STARTUP_PHASES: StartupPhase[] = [
  {
    name: "Infrastructure",
    services: ["database"],
    parallel: false,
    required: true,
  },
  {
    name: "AI Services",
    services: ["ollama"],
    parallel: false,
    required: false,
  },
  {
    name: "Application",
    services: ["backend", "frontend"],
    parallel: true,
    required: true,
  },
];

// File watcher types (for future integration)
export interface FileWatcherConfig {
  paths: string[];
  ignored?: string[];
  persistent?: boolean;
  ignoreInitial?: boolean;
  debounceMs?: number;
}

export interface FileChangeEvent {
  type: "add" | "change" | "unlink" | "addDir" | "unlinkDir";
  path: string;
  stats?: any;
}

// Proxy configuration (for future integration)
export interface ProxyConfig {
  enabled: boolean;
  port: number;
  routes: ProxyRoute[];
}

export interface ProxyRoute {
  path: string;
  target: string;
  changeOrigin?: boolean;
  pathRewrite?: Record<string, string>;
  ws?: boolean;
}

// Development server state
export interface DevServerState {
  status: "starting" | "running" | "stopping" | "stopped" | "error";
  services: Map<string, ServiceStatus>;
  startTime?: number;
  config?: FarmConfig;
  projectPath?: string;
}

// Utility types
export type Awaitable<T> = T | Promise<T>;

export type EventHandler<T extends keyof DevServerEvents> = DevServerEvents[T];

// Configuration validation
/**
 * @deprecated Moved to `@farm/types` package
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// Service dependency graph
export interface ServiceDependency {
  service: string;
  dependsOn: string[];
  optional: boolean;
}

// Performance monitoring
export interface PerformanceMetrics {
  serviceName: string;
  startupTime: number;
  memoryUsage: number;
  cpuUsage: number;
  restartCount: number;
  lastRestart?: number;
}

// Docker integration types
export interface DockerConfig {
  enabled: boolean;
  composeFile?: string;
  services?: string[];
  buildContext?: string;
}

// Environment detection
export interface EnvironmentInfo {
  nodeVersion: string;
  npmVersion: string;
  pythonVersion?: string;
  dockerAvailable: boolean;
  platform: NodeJS.Platform;
  arch: string;
}

// Development server statistics
export interface DevServerStats {
  uptime: number;
  totalRequests?: number;
  errorCount: number;
  restartCount: number;
  services: Record<
    string,
    {
      status: ServiceStatusType;
      uptime: number;
      restarts: number;
      lastError?: string;
    }
  >;
}
