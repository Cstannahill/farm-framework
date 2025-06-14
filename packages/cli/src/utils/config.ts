/**
 * Configuration loading utilities for CLI commands
 */

import { readFileSync, existsSync } from "fs";
import { join } from "path";
import type { FarmConfig } from "@farm-framework/types";

/**
 * Load FARM configuration from the current working directory
 */
export async function loadFarmConfig(
  cwd: string = process.cwd()
): Promise<FarmConfig> {
  const configFiles = ["farm.config.ts", "farm.config.js", "farm.config.json"];

  for (const configFile of configFiles) {
    const configPath = join(cwd, configFile);

    if (existsSync(configPath)) {
      try {
        if (configFile.endsWith(".json")) {
          const configContent = readFileSync(configPath, "utf-8");
          return JSON.parse(configContent);
        } else {
          // For .ts/.js files, we'll use dynamic import
          const configModule = await import(configPath);
          return configModule.default || configModule;
        }
      } catch (error) {
        console.warn(`Warning: Could not load config from ${configFile}`);
      }
    }
  }

  // Return minimal default config if no config file found
  return {
    name: "farm-app",
    template: "basic",
    features: [],
    database: {
      type: "mongodb",
      url: "mongodb://localhost:27017/farm-app",
    },
    deployment: {
      defaultPlatform: "railway",
      defaultRegion: "us-east-1",
    },
  };
}

/**
 * Validate that we're in a FARM project directory
 */
export function isFarmProject(cwd: string = process.cwd()): boolean {
  const indicators = [
    "farm.config.ts",
    "farm.config.js",
    "farm.config.json",
    "package.json",
  ];

  return indicators.some((file) => existsSync(join(cwd, file)));
}

/**
 * Get project root directory
 */
export function getProjectRoot(cwd: string = process.cwd()): string {
  let currentDir = cwd;

  while (currentDir !== "/") {
    if (isFarmProject(currentDir)) {
      return currentDir;
    }

    const parent = join(currentDir, "..");
    if (parent === currentDir) break;
    currentDir = parent;
  }

  return cwd;
}
