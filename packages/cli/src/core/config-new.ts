import { createConfigError } from "./errors";
import type { FarmConfig, ConfigLoadOptions } from "@farm-framework/types";

export class ConfigLoader {
    private configCache = new Map<string, FarmConfig>();

    async loadConfig(options?: ConfigLoadOptions): Promise<FarmConfig | null> {
        const {
            configPath = "farm.config.ts",
            cwd = process.cwd(),
            validate = true,
        } = options || {};

        // Resolve the config path
        const path = await import("path");
        const fs = await import("fs-extra");

        const resolvedPath = path.resolve(cwd, configPath);

        // Check if file exists
        if (!(await fs.pathExists(resolvedPath))) {
            return null;
        }

        // Check cache first
        const cacheKey = resolvedPath;
        if (this.configCache.has(cacheKey)) {
            return this.configCache.get(cacheKey)!;
        }

        try {
            let config: FarmConfig;

            if (resolvedPath.endsWith(".ts")) {
                config = await this.loadTypeScriptConfig(resolvedPath);
            } else if (resolvedPath.endsWith(".js")) {
                const configModule = await import(resolvedPath);
                config = configModule.default || configModule;
            } else {
                throw createConfigError(
                    `Unsupported config file format: ${path.extname(resolvedPath)}`,
                    resolvedPath
                );
            }

            // Validate the config
            if (validate) {
                this.validateConfig(config, resolvedPath);
            }

            // Cache the config
            this.configCache.set(cacheKey, config);

            return config;
        } catch (error) {
            throw createConfigError(
                `Failed to load configuration: ${error instanceof Error ? error.message : String(error)}`,
                resolvedPath
            );
        }
    }

    private async loadTypeScriptConfig(configPath: string): Promise<any> {
        // Use tsx to load TypeScript configuration files
        try {
            // Import required modules
            const { execa } = await import('execa');
            const path = await import('path');
            const fs = await import('fs-extra');

            // Create a temporary loader script that uses tsx
            const tempLoaderPath = path.join(path.dirname(configPath), '.farm-config-loader.mjs');

            const loaderScript = `
import { pathToFileURL } from 'url';

// Use tsx to load the TypeScript config
const configModule = await import('${configPath.replace(/\\/g, '/')}');
console.log(JSON.stringify(configModule.default || configModule));
`;

            await fs.writeFile(tempLoaderPath, loaderScript);

            try {
                // Execute the loader script with tsx
                const { stdout } = await execa('npx', ['tsx', tempLoaderPath], {
                    cwd: path.dirname(configPath),
                    stdio: ['pipe', 'pipe', 'pipe']
                });

                // Parse the JSON output
                const config = JSON.parse(stdout.trim());
                return config;
            } finally {
                // Clean up the temporary loader
                try {
                    await fs.remove(tempLoaderPath);
                } catch (error) {
                    // Ignore cleanup errors
                }
            }
        } catch (error) {
            // Fallback to the old method if tsx fails
            console.warn('Failed to load TypeScript config with tsx, falling back to basic conversion:', error);
            return this.loadTypeScriptConfigFallback(configPath);
        }
    }

    private async loadTypeScriptConfigFallback(configPath: string): Promise<any> {
        // Fallback method: basic TypeScript to JavaScript conversion
        const fs = await import('fs-extra');
        const content = await fs.readFile(configPath, 'utf-8');

        // Convert TypeScript to JavaScript while preserving imports
        let jsContent = content
            // Keep imports but convert to require statements
            .replace(/import\s*{\s*([^}]+)\s*}\s*from\s*['"]([^'"]+)['"];?/g, 'const { $1 } = require("$2");')
            .replace(/import\s+([^{}\s]+)\s+from\s*['"]([^'"]+)['"];?/g, 'const $1 = require("$2");')
            .replace(/export\s+default\s+/g, 'module.exports = ')
            // Remove only type annotations, not values
            .replace(/:\s*string\s*(?=[,}])/g, '')
            .replace(/:\s*number\s*(?=[,}])/g, '')
            .replace(/:\s*boolean\s*(?=[,}])/g, '')
            .replace(/:\s*any\s*(?=[,}])/g, '')
            .replace(/:\s*\[\]\s*(?=[,}])/g, '')
            .replace(/:\s*\{\}\s*(?=[,}])/g, '');

        // Create a temporary JavaScript file
        const tempPath = configPath.replace('.ts', '.temp.js');
        await fs.writeFile(tempPath, jsContent);

        try {
            // Import the temporary file
            const configModule = await import(tempPath);
            return configModule.default || configModule;
        } finally {
            // Clean up the temporary file
            try {
                await fs.remove(tempPath);
            } catch (error) {
                // Ignore cleanup errors
            }
        }
    }

    private clearRequireCache(configPath: string): void {
        // Clear the specific config file from cache
        delete require.cache[configPath];

        // Clear any related files that might have been imported
        Object.keys(require.cache).forEach((key) => {
            if (key.includes(configPath)) {
                delete require.cache[key];
            }
        });
    }

    private validateConfig(config: any, configPath: string): void {
        if (!config || typeof config !== "object") {
            throw createConfigError(
                "Configuration must be an object",
                configPath
            );
        }

        // Validate required fields
        if (!config.name || typeof config.name !== "string") {
            throw createConfigError(
                "Configuration must have a 'name' field",
                configPath
            );
        }

        // Validate template if present
        if (config.template) {
            const validTemplates = [
                "basic",
                "fullstack",
                "api-only",
            ];
            if (!validTemplates.includes(config.template)) {
                throw createConfigError(
                    `Invalid template '${config.template
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
