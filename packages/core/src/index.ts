import type { FarmConfig } from "@farm/types";

// Re-export types for convenience
export type * from "@farm/types";

// Core configuration utilities
export { defineConfig } from "@farm/types";

// Configuration validation
export function validateConfig(config: any): config is FarmConfig {
  if (!config || typeof config !== "object") return false;
  if (!config.name || typeof config.name !== "string") return false;
  if (!config.template || typeof config.template !== "string") return false;
  if (!Array.isArray(config.features)) return false;
  if (!config.database || typeof config.database !== "object") return false;

  return true;
}

// Version utilities
export class Version {
  constructor(
    public major: number,
    public minor: number,
    public patch: number,
    public prerelease?: string
  ) {}

  toString(): string {
    const base = `${this.major}.${this.minor}.${this.patch}`;
    return this.prerelease ? `${base}-${this.prerelease}` : base;
  }

  static parse(version: string): Version {
    const regex = /^(\d+)\.(\d+)\.(\d+)(?:-(.+))?$/;
    const match = version.match(regex);

    if (!match) {
      throw new Error(`Invalid version format: ${version}`);
    }

    return new Version(
      parseInt(match[1], 10),
      parseInt(match[2], 10),
      parseInt(match[3], 10),
      match[4]
    );
  }

  isCompatible(other: Version): boolean {
    // Major versions must match
    return this.major === other.major;
  }
}

// Logger utility
export class Logger {
  private prefix: string;

  constructor(prefix: string = "FARM") {
    this.prefix = prefix;
  }

  info(message: string): void {
    console.log(`ℹ️ [${this.prefix}] ${message}`);
  }

  warn(message: string): void {
    console.warn(`⚠️ [${this.prefix}] ${message}`);
  }

  error(message: string): void {
    console.error(`❌ [${this.prefix}] ${message}`);
  }

  debug(message: string): void {
    if (process.env.DEBUG) {
      console.debug(`🐛 [${this.prefix}] ${message}`);
    }
  }

  success(message: string): void {
    console.log(`✅ [${this.prefix}] ${message}`);
  }

  spin(message: string): { stop: (finalMessage?: string) => void } {
    // Simple spinner implementation
    const frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
    let i = 0;
    let stopped = false;

    const interval = setInterval(() => {
      if (stopped) return;
      process.stdout.write(`\r${frames[i]} [${this.prefix}] ${message}`);
      i = (i + 1) % frames.length;
    }, 80);

    return {
      stop: (finalMessage?: string) => {
        stopped = true;
        clearInterval(interval);
        process.stdout.write(`\r`);
        if (finalMessage) {
          this.success(finalMessage);
        }
      },
    };
  }
}

// Constants
export const FARM_VERSION = "0.1.0";
export const DEFAULT_PORTS = {
  frontend: 3000,
  backend: 8000,
  proxy: 4000,
  ai: 8001,
  ollama: 11434,
};

// File watcher functionality
export { FarmFileWatcher } from "./watcher/file-watcher";
export { CodeGenerator } from "./codegen/generator";
