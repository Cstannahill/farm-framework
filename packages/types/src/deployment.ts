// packages/types/src/deployment.ts
// Shared deployment system types

import type { FarmConfig } from './config.js';

export type Platform = 'railway' | 'vercel' | 'fly' | 'aws' | 'gcp';

export interface PlatformRecommendation {
  recommended: Platform;
  alternatives: Platform[];
  reasons: string[];
  estimatedCost?: number;
}

export interface DeployOptions {
  platform?: Platform;
  dryRun?: boolean;
  verbose?: boolean;
  region?: string;
}

export interface DeploymentPlan {
  platform: Platform;
  steps: DeploymentStep[];
  config: FarmConfig;
}

export interface DeploymentStep {
  title: string;
  command?: string;
  info?: string;
}

export interface DeploymentResult {
  platform: Platform;
  success: boolean;
  url?: string;
  preview?: string;
  services: Array<{ name: string; type: string }>;
  duration: number;
  region: string;
  estimatedCost?: number;
  errors?: string[];
  id?: string;
}

export interface DeployContext {
  cwd: string;
  config: FarmConfig;
  options: DeployOptions;
}

