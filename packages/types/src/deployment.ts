/**
 * Comprehensive deployment types for FARM framework
 */

import type { FarmConfig } from "./config.js";

// Platform identifiers
export type Platform = "railway" | "vercel" | "fly" | "aws" | "gcp";

// Deployment regions
export type DeploymentRegion =
  | "us-east-1"
  | "us-west-1"
  | "us-west-2"
  | "eu-west-1"
  | "eu-central-1"
  | "ap-northeast-1"
  | "ap-southeast-1"
  | string; // Allow custom regions

// Deployment strategies
export type DeploymentStrategy =
  | "rolling"
  | "canary"
  | "blue-green"
  | "recreate";

// Service types that can be deployed
export type ServiceType =
  | "web"
  | "api"
  | "worker"
  | "database"
  | "ai"
  | "cache"
  | "queue";

// Deployment environment
export type DeploymentEnvironment =
  | "development"
  | "staging"
  | "production"
  | string;

// Resource limits
export interface ResourceLimits {
  memory?: string; // e.g., '1Gi', '512Mi'
  cpu?: string; // e.g., '1000m', '0.5'
  disk?: string; // e.g., '10Gi'
}

// Platform detection and recommendation
export interface ProjectAnalysis {
  hasGPU: boolean;
  hasWebSockets: boolean;
  estimatedTraffic: number;
  databaseType: string;
  teamSize: number;
  budget?: number;
  regions: DeploymentRegion[];
  staticAssets: number;
  aiWorkload: boolean;
  hasDocker: boolean;
  framework: string;
}

export interface PlatformScore {
  platform: Platform;
  score: number;
  reasons: string[];
  pros: string[];
  cons: string[];
}

export interface PlatformRecommendation {
  recommended: Platform;
  alternatives: Array<{
    platform: Platform;
    description: string;
    score: number;
  }>;
  reasons: string[];
  estimatedCost: string;
  analysis: ProjectAnalysis;
}

// Deployment planning
export interface DeploymentService {
  name: string;
  type: ServiceType;
  image?: string;
  port?: number;
  env?: Record<string, string>;
  resources?: ResourceLimits;
  healthCheck?: HealthCheckConfig;
  volumes?: VolumeMount[];
  dependencies?: string[];
}

export interface VolumeMount {
  name: string;
  mount: string;
  size?: string;
}

export interface HealthCheckConfig {
  type: "http" | "tcp" | "command";
  path?: string;
  port?: number;
  command?: string[];
  interval?: number;
  timeout?: number;
  retries?: number;
  gracePeriod?: number;
}

export interface DeploymentPlan {
  id: string;
  platform: Platform;
  region: DeploymentRegion;
  environment: DeploymentEnvironment;
  strategy: DeploymentStrategy;
  services: DeploymentService[];
  url?: string;
  domains?: string[];
  estimatedCost: CostEstimate;
  estimatedTime: number; // minutes
  startTime: number;
  config: FarmConfig;
  steps: DeploymentStep[];
}

// Cost estimation
export interface CostItem {
  monthly: number;
  description: string;
  optimizable: boolean;
  breakdown?: Record<string, number>;
}

export interface CostEstimate {
  monthly: number;
  formatted: string;
  breakdown: {
    compute: CostItem;
    storage: CostItem;
    bandwidth: CostItem;
    ai: CostItem;
    addons: CostItem;
  };
  comparison?: Array<{
    platform: Platform;
    cost: number;
    savings?: number;
  }>;
  optimization?: string[];
}

// Deployment options and context
export interface DeployOptions {
  platform?: Platform;
  region?: DeploymentRegion;
  environment?: DeploymentEnvironment;
  strategy?: DeploymentStrategy;
  dryRun?: boolean;
  verbose?: boolean;
  yes?: boolean; // Skip confirmation
  force?: boolean;
  profile?: string; // Config profile name
  branch?: string;
  replicas?: number;
  resources?: ResourceLimits;
  domains?: string[];
  secrets?: Record<string, string>;
}

export interface DeployContext {
  workingDir: string;
  gitBranch: string;
  gitCommit: string;
  buildId: string;
  timestamp: number;
  user?: string;
  ci?: boolean;
  cwd: string; // Legacy compatibility
  config: FarmConfig;
  options: DeployOptions;
}

// Deployment results
export interface DeploymentResult {
  success: boolean;
  cancelled?: boolean;
  platform: Platform;
  environment: DeploymentEnvironment;
  id: string;
  url?: string;
  preview?: string;
  services: Array<{
    name: string;
    type: ServiceType | string; // Keep string for compatibility
    url?: string;
    status: "running" | "failed" | "pending";
  }>;
  duration: number;
  region: string; // Keep for compatibility
  estimatedCost?: number;
  errors?: DeploymentError[] | string[]; // Support both formats
  logs?: string[];
  rollback?: {
    available: boolean;
    snapshotId?: string;
  };
}

// Error handling
export interface DeploymentError {
  code: string;
  message: string;
  details?: any;
  suggestion?: string;
  commands?: string[];
  documentation?: string;
  recoverable: boolean;
}

export interface ErrorDiagnosis {
  problem: string;
  cause: string;
  solution: string;
  commands?: string[];
  documentation?: string;
}

// Health monitoring (deployment-specific)
export type DeploymentHealthStatus =
  | "healthy"
  | "degraded"
  | "unhealthy"
  | "unknown"
  | "critical";

export interface DeploymentHealthCheck {
  name: string;
  status: DeploymentHealthStatus;
  lastCheck: Date;
  responseTime?: number;
  duration?: number;
  error?: string;
  message?: string;
  details?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface DeploymentHealthReport {
  healthy: boolean;
  checks: DeploymentHealthCheck[];
  recommendation: string;
  timestamp: number;
}

// Rollback system
export interface Snapshot {
  id: string;
  timestamp: number;
  deployment: string;
  environment: DeploymentEnvironment;
  platform: Platform;
  healthy: boolean;
  preserveData?: boolean; // Add missing property
  state: {
    containers: any;
    database?: any;
    environment: Record<string, string>;
    aiModels?: any;
    config: any;
  };
  metadata: {
    gitCommit: string;
    buildId: string;
    user?: string;
    description?: string;
  };
}

export interface RollbackOptions {
  snapshotId?: string;
  dryRun?: boolean;
  force?: boolean;
  preserveData?: boolean;
  skipHealthCheck?: boolean;
}

// Enhanced deployment step for progress tracking
export interface DeploymentStep {
  title: string; // Legacy compatibility
  name: string;
  status: "pending" | "running" | "completed" | "failed";
  startTime?: number;
  endTime?: number;
  error?: string;
  command?: string; // Legacy compatibility
  info?: string; // Legacy compatibility
  substeps?: Array<{
    name: string;
    done: boolean;
  }>;
}

// Progress updates for UI
export interface ProgressUpdate {
  phase: string;
  message: string;
  percent: number;
  step?: string;
  platform?: Platform;
}

// Platform-specific configurations
export interface RailwayConfig {
  version: number;
  build: {
    builder: string;
    dockerfilePath?: string;
    buildCommand?: string;
  };
  deploy: {
    startCommand: string;
    healthcheckPath?: string;
    restartPolicyType?: "ON_FAILURE" | "ALWAYS" | "NEVER";
    restartPolicyMaxRetries?: number;
  };
  services: RailwayService[];
  env?: Record<string, string>;
}

export interface RailwayService {
  name: string;
  source: {
    type: "docker" | "template";
    image?: string;
    template?: string;
  };
  deploy?: {
    region?: string;
    replicas?: number;
    strategy?: string;
    resources?: ResourceLimits;
  };
  env?: Record<string, string>;
  domains?: Array<{
    domain: string;
    ssl?: boolean;
  }>;
  volumes?: VolumeMount[];
}

export interface FlyConfig {
  app: string;
  primary_region: string;
  build: {
    dockerfile?: string;
    buildpacks?: string[];
  };
  services: Array<{
    protocol: "tcp" | "udp";
    internal_port: number;
    concurrency?: {
      type: "connections" | "requests";
      soft_limit: number;
      hard_limit: number;
    };
    http_checks?: Array<{
      interval: string;
      timeout: string;
      grace_period: string;
      path: string;
    }>;
    ports: Array<{
      port: number;
      handlers: string[];
    }>;
  }>;
  env?: Record<string, string>;
  mounts?: Array<{
    destination: string;
    source: string;
  }>;
  deploy?: {
    strategy: string;
    regions: string[];
  };
  metrics?: {
    port: number;
    path: string;
  };
  vm?: {
    gpu_kind?: string;
    memory?: string;
    cpu_kind?: string;
    cpus?: number;
  };
}

export interface VercelConfig {
  framework?: string;
  buildCommand?: string;
  outputDirectory?: string;
  functions?: Record<
    string,
    {
      runtime: string;
      handler?: string;
      maxDuration?: number;
    }
  >;
  rewrites?: Array<{
    source: string;
    destination: string;
  }>;
  env?: Record<string, string>;
  regions?: string[];
  crons?: Array<{
    path: string;
    schedule: string;
  }>;
}

// Analytics and metrics
export interface DeploymentMetrics {
  platform: Platform;
  duration: number;
  success: boolean;
  services: number;
  hasAI: boolean;
  region: DeploymentRegion;
  cost: number;
  errors?: number;
  rollbacks?: number;
  size?: number; // MB
}

// Recipe interface
export interface DeployRecipe {
  name: Platform;
  detect?(config: FarmConfig): Promise<boolean>;
  generatePlan(
    config: FarmConfig,
    options: DeployOptions
  ): Promise<DeploymentPlan>;
  execute(
    plan: DeploymentPlan,
    context: DeployContext
  ): Promise<DeploymentResult>;
  rollback?(result: DeploymentResult, options: RollbackOptions): Promise<void>;
  estimateCost?(plan: DeploymentPlan): Promise<CostEstimate>;
}

// Configuration for deployment
export interface DeploymentConfig {
  defaultPlatform?: Platform;
  defaultRegion?: DeploymentRegion;
  regions?: DeploymentRegion[];
  env?: Record<string, string>;
  environments?: Record<
    string,
    {
      platform?: Platform;
      region?: DeploymentRegion;
      strategy?: DeploymentStrategy;
      replicas?: number;
      resources?: ResourceLimits;
      domains?: string[];
      env?: Record<string, string>;
    }
  >;
  platforms?: {
    railway?: Partial<RailwayConfig>;
    fly?: Partial<FlyConfig>;
    vercel?: Partial<VercelConfig>;
  };
  analytics?: {
    enabled: boolean;
    provider?: string;
  };
  rollback?: {
    enabled: boolean;
    maxSnapshots?: number;
    autoSnapshot?: boolean;
  };
}
