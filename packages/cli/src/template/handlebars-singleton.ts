/**
 * Handlebars Singleton
 * 
 * Provides a centralized, singleton instance of Handlebars with all helpers
 * pre-registered. This ensures consistent helper availability across all
 * template processing components.
 */

import Handlebars from "handlebars";
import { registerHandlebarsHelpers } from "./helpers.js";
import { logger } from "../utils/logger.js";

export type HandlebarsInstance = typeof Handlebars;

/**
 * Handlebars Singleton Class
 * 
 * Features:
 * - Single instance across the entire application
 * - Lazy initialization with helper registration
 * - Thread-safe initialization
 * - Comprehensive helper registration
 * - Template caching support
 */
export class HandlebarsSingleton {
    private static instance: HandlebarsSingleton;
    private handlebars: HandlebarsInstance;
    private isInitialized = false;
    private templateCache = new Map<string, Handlebars.TemplateDelegate>();

    private constructor() {
        // Private constructor to prevent direct instantiation
        this.handlebars = Handlebars;
    }

    /**
     * Get the singleton instance
     */
    public static getInstance(): HandlebarsSingleton {
        if (!HandlebarsSingleton.instance) {
            HandlebarsSingleton.instance = new HandlebarsSingleton();
        }
        return HandlebarsSingleton.instance;
    }

    /**
     * Get the Handlebars instance with all helpers registered
     */
    public getHandlebars(): HandlebarsInstance {
        this.ensureInitialized();
        return this.handlebars;
    }

    /**
     * Compile a template with caching
     */
    public compile(template: string, options?: any): Handlebars.TemplateDelegate {
        this.ensureInitialized();

        // Create cache key from template content and options
        const cacheKey = this.createCacheKey(template, options);

        // Check cache first
        if (this.templateCache.has(cacheKey)) {
            logger.debug(`📋 Template cache hit for key: ${cacheKey.substring(0, 20)}...`);
            return this.templateCache.get(cacheKey)!;
        }

        // Compile and cache
        try {
            const compiledTemplate = this.handlebars.compile(template, options);
            this.templateCache.set(cacheKey, compiledTemplate);
            logger.debug(`📝 Template compiled and cached: ${cacheKey.substring(0, 20)}...`);
            return compiledTemplate;
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            logger.error(`❌ Template compilation failed: ${errorMsg}`);
            throw error;
        }
    }

    /**
     * Register a custom helper
     */
    public registerHelper(name: string, helper: Handlebars.HelperDelegate): void {
        this.ensureInitialized();
        this.handlebars.registerHelper(name, helper);
        logger.debug(`✅ Registered custom helper: ${name}`);
    }

    /**
     * Get all registered helpers
     */
    public getRegisteredHelpers(): string[] {
        this.ensureInitialized();
        return Object.keys(this.handlebars.helpers || {});
    }

    /**
     * Check if a helper is registered
     */
    public hasHelper(name: string): boolean {
        this.ensureInitialized();
        return this.getRegisteredHelpers().includes(name);
    }

    /**
     * Clear template cache
     */
    public clearCache(): void {
        this.templateCache.clear();
        logger.debug("🗑️ Template cache cleared");
    }

    /**
     * Get cache statistics
     */
    public getCacheStats(): { size: number; keys: string[] } {
        return {
            size: this.templateCache.size,
            keys: Array.from(this.templateCache.keys())
        };
    }

    /**
     * Ensure the Handlebars instance is initialized with all helpers
     */
    private ensureInitialized(): void {
        if (this.isInitialized) {
            return;
        }

        logger.debug("🔧 Initializing Handlebars singleton...");

        try {
            // Register all custom helpers
            registerHandlebarsHelpers(this.handlebars);

            // Register processor-specific helpers
            this.registerProcessorHelpers();

            this.isInitialized = true;

            const helperCount = this.getRegisteredHelpers().length;
            logger.debug(`✅ Handlebars singleton initialized with ${helperCount} helpers`);
            logger.debug(`📋 Available helpers: ${this.getRegisteredHelpers().join(", ")}`);

        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            logger.error(`❌ Failed to initialize Handlebars singleton: ${errorMsg}`);
            throw error;
        }
    }

    /**
     * Register processor-specific helpers
     */
    private registerProcessorHelpers(): void {
        // Switch/case helpers
        this.handlebars.registerHelper("switch", (value, options) => {
            // Store switch value in context
            const context = options.data?.root || options.data || {};
            context._switch_value = value;
            context._switch_break = false;
            const result = options.fn(context);
            delete context._switch_break;
            delete context._switch_value;
            return result;
        });

        this.handlebars.registerHelper("case", (value, options) => {
            const context = options.data?.root || options.data || {};
            if (value === context._switch_value) {
                context._switch_break = true;
                return options.fn(context);
            }
            return "";
        });

        // Indentation helper
        this.handlebars.registerHelper(
            "indent",
            (str: string, spaces: number = 2) =>
                String(str)
                    .split("\n")
                    .map((line) => " ".repeat(spaces) + line)
                    .join("\n")
        );

        // Comment helper
        this.handlebars.registerHelper(
            "comment",
            (str: string, style: "js" | "py" | "html" = "js") => {
                const prefix =
                    style === "py" ? "# " : style === "html" ? "<!-- " : "// ";
                const suffix = style === "html" ? " -->" : "";
                return `${prefix}${str}${suffix}`;
            }
        );

        // Path helper
        this.handlebars.registerHelper(
            "import_path",
            (moduleName: string, isRelative: boolean = false) =>
                isRelative && !moduleName.startsWith(".")
                    ? `./${moduleName}`
                    : moduleName
        );

        // Validation helper
        this.handlebars.registerHelper("validate_name", (name: string) =>
            /^[a-zA-Z][a-zA-Z0-9_-]*$/.test(name)
        );

        // Lazy helper
        this.handlebars.registerHelper("lazy", (fn: () => string) =>
            typeof fn === "function" ? fn() : fn
        );

        // Raw block helper
        this.handlebars.registerHelper("raw", (options: any) => {
            return options.fn();
        });

        logger.debug("✅ Processor-specific helpers registered");
    }

    /**
     * Create a cache key for template caching
     */
    private createCacheKey(template: string, options?: any): string {
        const optionsStr = options ? JSON.stringify(options) : "";
        return `${template.length}-${template.substring(0, 50)}-${optionsStr}`;
    }
}

/**
 * Convenience function to get the Handlebars instance
 */
export function getHandlebars(): HandlebarsInstance {
    return HandlebarsSingleton.getInstance().getHandlebars();
}

/**
 * Convenience function to compile a template
 */
export function compileTemplate(template: string, options?: any): Handlebars.TemplateDelegate {
    return HandlebarsSingleton.getInstance().compile(template, options);
}

/**
 * Convenience function to register a helper
 */
export function registerHelper(name: string, helper: Handlebars.HelperDelegate): void {
    HandlebarsSingleton.getInstance().registerHelper(name, helper);
}

/**
 * Convenience function to check if a helper exists
 */
export function hasHelper(name: string): boolean {
    return HandlebarsSingleton.getInstance().hasHelper(name);
}

/**
 * Convenience function to get all registered helpers
 */
export function getRegisteredHelpers(): string[] {
    return HandlebarsSingleton.getInstance().getRegisteredHelpers();
}

// Export the singleton instance for direct access if needed
export const handlebarsSingleton = HandlebarsSingleton.getInstance();
