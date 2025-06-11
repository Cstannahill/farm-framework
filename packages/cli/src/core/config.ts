import fsExtra from "fs-extra";
import { resolve, extname } from "path";
// Comment out esbuild-register import if not used or not present
// import { register } from "esbuild-register/dist/node";
import type { FarmConfig } from "@farm-framework/types";
import { logger } from "../utils/logger.js";

const { pathExists } = fsExtra;
import { isErrorInstance } from "../utils/error-utils.js";
import { createConfigError } from "./errors.js";
import { FarmError, getErrorMessage } from "../utils/error-handling.js";

export interface ConfigLoadOptions {
  configPath?: string;
  cwd?: string;
  validate?: boolean;
}

export class ConfigLoader {
  private configCache = new Map<string, FarmConfig>();

  async loadConfig(
    options: ConfigLoadOptions = {}
  ): Promise<FarmConfig | null> {
    const { configPath, cwd = process.cwd(), validate = true } = options;

    try {
      const resolvedPath = await this.resolveConfigPath(configPath, cwd);

      if (!resolvedPath) {
        logger.debug("No configuration file found");
        return null;
      }

      // Check cache first
      if (this.configCache.has(resolvedPath)) {
        logger.debug(`Using cached config from ${resolvedPath}`);
        return this.configCache.get(resolvedPath)!;
      }

      logger.debug(`Loading configuration from ${resolvedPath}`);

      // Register TypeScript support for config files
      this.registerTypeScriptSupport();

      // Clear require cache to ensure fresh config load
      this.clearRequireCache(resolvedPath);

      // Load the configuration file
      const configModule = await import(resolvedPath);
      const config = configModule.default || configModule;

      if (!config || typeof config !== "object") {
        throw createConfigError(
          "Configuration file must export a valid configuration object",
          resolvedPath
        );
      }

      // Validate configuration if requested
      if (validate) {
        await this.validateConfig(config, resolvedPath);
      }

      // Cache the result
      this.configCache.set(resolvedPath, config);

      logger.debug("Configuration loaded successfully");
      return config;
    } catch (error) {
      if (isErrorInstance(error)) {
        throw error;
      }

      throw createConfigError(
        `Failed to load configuration: ${getErrorMessage(error)}`,
        configPath
      );
    }
  }

  private async resolveConfigPath(
    configPath?: string,
    cwd: string = process.cwd()
  ): Promise<string | null> {
    if (configPath) {
      const resolved = resolve(cwd, configPath);
      if (await pathExists(resolved)) {
        return resolved;
      }
      throw createConfigError(`Configuration file not found: ${configPath}`);
    }

    // Look for configuration files in order of preference
    const candidates = [
      "farm.config.ts",
      "farm.config.js",
      "farm.config.mjs",
      "farm.config.cjs",
    ];

    for (const candidate of candidates) {
      const candidatePath = resolve(cwd, candidate);
      if (await pathExists(candidatePath)) {
        return candidatePath;
      }
    }

    return null;
  }

  private registerTypeScriptSupport(): void {
    try {
      // register({
      //   target: "node18",
      //   format: "cjs",
      //   extensions: [".ts", ".tsx"],
      // });
    } catch (error) {
      logger.warn(
        "Failed to register TypeScript support:",
        getErrorMessage(error)
      );
    }
  }

  private clearRequireCache(configPath: string): void {
    // Clear the specific config file from cache
    delete require.cache[configPath];

    // Clear any related files that might have been imported
    Object.keys(require.cache).forEach((key) => {
      if (key.startsWith(configPath.replace(/\.[^.]+$/, ""))) {
        delete require.cache[key];
      }
    });
  }

  private async validateConfig(config: any, configPath: string): Promise<void> {
    // Basic validation - more comprehensive validation would use Joi or Zod
    const requiredFields = ["name"];

    for (const field of requiredFields) {
      if (!(field in config)) {
        throw createConfigError(
          `Missing required field '${field}' in configuration`,
          configPath
        );
      }
    }

    // Validate template if present
    if (config.template) {
      const validTemplates = [
        "basic",
        "ai-chat",
        "ai-dashboard",
        "ecommerce",
        "cms",
        "api-only",
      ];
      if (!validTemplates.includes(config.template)) {
        throw createConfigError(
          `Invalid template '${
            config.template
          }'. Valid templates: ${validTemplates.join(", ")}`,
          configPath
        );
      }
    }

    // Validate features if present
    if (config.features && Array.isArray(config.features)) {
      const validFeatures = [
        "auth",
        "ai",
        "realtime",
        "payments",
        "email",
        "storage",
        "search",
        "analytics",
      ];
      const invalidFeatures = config.features.filter(
        (f: string) => !validFeatures.includes(f)
      );

      if (invalidFeatures.length > 0) {
        throw createConfigError(
          `Invalid features: ${invalidFeatures.join(
            ", "
          )}. Valid features: ${validFeatures.join(", ")}`,
          configPath
        );
      }
    }
  }

  clearCache(): void {
    this.configCache.clear();
  }
}

// Singleton instance for global use
export const configLoader = new ConfigLoader();

// Convenience function
export async function loadConfig(
  options?: ConfigLoadOptions
): Promise<FarmConfig | null> {
  return configLoader.loadConfig(options);
}
