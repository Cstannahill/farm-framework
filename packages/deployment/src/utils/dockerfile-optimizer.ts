import type { FarmConfig } from "@farm-framework/types";

/**
 * Docker optimization utility for generating efficient containers
 */
export class DockerfileOptimizer {
  /**
   * Generate optimized Dockerfile for the given configuration
   */
  generate(options: {
    base?: string;
    caching?: "aggressive" | "moderate" | "minimal";
    size?: "minimal" | "standard" | "full";
    security?: "basic" | "hardened";
    features?: {
      gpu?: boolean;
      multiRegion?: boolean;
      edgeCompute?: boolean;
    };
  }): string {
    const {
      base = "standard",
      caching = "moderate",
      size = "standard",
      security = "basic",
      features = {},
    } = options;

    let dockerfile = this.getBaseImage(base, features);
    dockerfile += this.getWorkdirSetup();
    dockerfile += this.getDependencyInstallation(caching);
    dockerfile += this.getApplicationSetup();
    dockerfile += this.getSecuritySetup(security);
    dockerfile += this.getOptimizations(size);
    dockerfile += this.getHealthcheck();
    dockerfile += this.getStartCommand();

    return dockerfile;
  }

  /**
   * Optimize existing Dockerfile
   */
  optimize(dockerfile: string): string {
    // Basic optimizations for existing Dockerfiles
    let optimized = dockerfile;

    // Add multi-stage build if not present
    if (!optimized.includes("AS ")) {
      optimized = this.addMultiStage(optimized);
    }

    // Optimize layer caching
    optimized = this.optimizeLayerCaching(optimized);

    // Add security improvements
    optimized = this.addSecurityImprovements(optimized);

    return optimized;
  }

  /**
   * Get base image based on requirements
   */
  private getBaseImage(base: string, features: any): string {
    if (features.gpu) {
      return `
# GPU-enabled base image
FROM nvidia/cuda:11.8-runtime-ubuntu22.04 AS base
RUN apt-get update && apt-get install -y python3 python3-pip nodejs npm

`;
    }

    if (base === "edge-optimized") {
      return `
# Edge-optimized lightweight image
FROM node:18-alpine AS base
RUN apk add --no-cache python3 py3-pip

`;
    }

    return `
# Standard multi-stage base
FROM node:18-alpine AS base
WORKDIR /app

`;
  }

  /**
   * Get working directory setup
   */
  private getWorkdirSetup(): string {
    return `
# Set working directory
WORKDIR /app

# Create app user for security
RUN addgroup -g 1001 -S nodejs && adduser -S farmuser -u 1001

`;
  }

  /**
   * Get dependency installation with caching
   */
  private getDependencyInstallation(caching: string): string {
    if (caching === "aggressive") {
      return `
# Aggressive caching - copy lock files first
COPY pnpm-lock.yaml package.json ./
RUN npm install -g pnpm
RUN pnpm fetch

# Copy source and install
COPY . .
RUN pnpm install --offline --frozen-lockfile

`;
    }

    return `
# Standard dependency installation
COPY package*.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile

`;
  }

  /**
   * Get application setup
   */
  private getApplicationSetup(): string {
    return `
# Copy application code
COPY . .

# Build application
RUN pnpm build

`;
  }

  /**
   * Get security setup
   */
  private getSecuritySetup(security: string): string {
    if (security === "hardened") {
      return `
# Hardened security setup
RUN chown -R farmuser:nodejs /app
USER farmuser

# Remove unnecessary packages
RUN apk del --purge build-base python3-dev

`;
    }

    return `
# Basic security
USER farmuser

`;
  }

  /**
   * Get size optimizations
   */
  private getOptimizations(size: string): string {
    if (size === "minimal") {
      return `
# Minimal size optimizations
RUN rm -rf node_modules/.cache
RUN rm -rf /tmp/*
RUN rm -rf /var/cache/apk/*

`;
    }

    return `
# Standard optimizations
RUN rm -rf node_modules/.cache

`;
  }

  /**
   * Get healthcheck configuration
   */
  private getHealthcheck(): string {
    return `
# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \\
  CMD curl -f http://localhost:8000/api/health || exit 1

`;
  }

  /**
   * Get start command
   */
  private getStartCommand(): string {
    return `
# Expose port
EXPOSE 8000

# Start application
CMD ["pnpm", "start"]
`;
  }

  /**
   * Add multi-stage build to existing Dockerfile
   */
  private addMultiStage(dockerfile: string): string {
    // Simple implementation - would be more sophisticated in practice
    return `# Multi-stage build added\nFROM node:18-alpine AS builder\n${dockerfile}`;
  }

  /**
   * Optimize layer caching
   */
  private optimizeLayerCaching(dockerfile: string): string {
    // Move package.json copy before source copy for better caching
    return dockerfile.replace(
      /COPY \. \./g,
      "COPY package*.json ./\nRUN npm install\nCOPY . ."
    );
  }

  /**
   * Add security improvements
   */
  private addSecurityImprovements(dockerfile: string): string {
    if (!dockerfile.includes("USER ")) {
      dockerfile += "\n# Security: Run as non-root user\nUSER node\n";
    }
    return dockerfile;
  }
}
