// src/utils/validation.ts
import { execSync } from "child_process";
import { homedir } from "os";
import { readFile } from "fs/promises";
import { join } from "path";

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function validateProjectName(name: string): ValidationResult {
  if (!name || name.length === 0) {
    return { valid: false, error: "Project name cannot be empty" };
  }

  if (name.length > 100) {
    return {
      valid: false,
      error: "Project name must be less than 100 characters",
    };
  }

  if (!/^[a-z0-9-_]+$/.test(name)) {
    return {
      valid: false,
      error:
        "Project name must contain only lowercase letters, numbers, hyphens, and underscores",
    };
  }

  if (name.startsWith("-") || name.endsWith("-")) {
    return {
      valid: false,
      error: "Project name cannot start or end with a hyphen",
    };
  }

  if (name.startsWith("_") || name.endsWith("_")) {
    return {
      valid: false,
      error: "Project name cannot start or end with an underscore",
    };
  }

  // Check for reserved names
  const reservedNames = [
    "con",
    "prn",
    "aux",
    "nul",
    "com1",
    "com2",
    "com3",
    "com4",
    "com5",
    "com6",
    "com7",
    "com8",
    "com9",
    "lpt1",
    "lpt2",
    "lpt3",
    "lpt4",
    "lpt5",
    "lpt6",
    "lpt7",
    "lpt8",
    "lpt9",
    "node_modules",
    ".git",
    ".env",
  ];

  if (reservedNames.includes(name.toLowerCase())) {
    return {
      valid: false,
      error: `'${name}' is a reserved name and cannot be used`,
    };
  }

  return { valid: true };
}

export function getCurrentUser(): string {
  try {
    // Try to get git user name first
    const gitUser = execSync("git config user.name", {
      encoding: "utf-8",
      stdio: "pipe",
    }).trim();
    if (gitUser) return gitUser;
  } catch {
    // Git not configured or not available
  }

  try {
    // Try to get system username
    const username = execSync("whoami", {
      encoding: "utf-8",
      stdio: "pipe",
    }).trim();
    if (username) return username;
  } catch {
    // whoami not available
  }

  // Fallback to environment variables
  return process.env.USER || process.env.USERNAME || "Developer";
}

export async function detectPackageManager(): Promise<"npm" | "yarn" | "pnpm"> {
  // Check for lock files to determine package manager preference
  const fs = await import("fs/promises");

  try {
    await fs.access("pnpm-lock.yaml");
    return "pnpm";
  } catch {}

  try {
    await fs.access("yarn.lock");
    return "yarn";
  } catch {}

  // Default to npm
  return "npm";
}

export function formatBytes(bytes: number): string {
  const sizes = ["B", "KB", "MB", "GB"];
  if (bytes === 0) return "0 B";
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + " " + sizes[i];
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3600000) return `${(ms / 60000).toFixed(1)}m`;
  return `${(ms / 3600000).toFixed(1)}h`;
}
