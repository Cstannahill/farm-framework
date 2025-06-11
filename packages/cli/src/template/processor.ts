// packages/cli/src/template/processor.ts
import path from "path";
import fs from "fs-extra";
import { fileURLToPath } from "url";
import Handlebars from "handlebars";
import { glob } from "glob";
import { TemplateContext } from "@farm-framework/types";
import { logger } from "../utils/logger.js";
import { registerHandlebarsHelpers } from "./helpers.js";
import crypto from "crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Template processing options for enhanced control
 */
export interface TemplateProcessingOptions {
  dryRun?: boolean;
  verbose?: boolean;
  includeTemplateData?: boolean;
  onProgress?: (progress: ProgressInfo) => void;
  batchSize?: number;
}

/**
 * Progress information for template processing
 */
export interface ProgressInfo {
  current: number;
  total: number;
  currentFile: string;
  phase: "discovery" | "processing" | "writing";
}

/**
 * Template processing result with metrics
 */
export interface TemplateProcessingResult {
  generatedFiles: string[];
  skippedFiles: string[];
  metrics: ProcessingMetrics;
  templateData?: any;
}

/**
 * Processing metrics for performance monitoring
 */
export interface ProcessingMetrics {
  filesProcessed: number;
  templatesCompiled: number;
  cacheHits: number;
  cacheMisses: number;
  totalProcessingTime: number;
  startTime: number;
}

/**
 * Enhanced TemplateProcessor with performance optimizations and caching
 */
export class TemplateProcessor {
  private templatesDir: string;
  private handlebars: typeof Handlebars;
  private switch_value?: any;
  private switch_break?: boolean;

  // Performance optimizations
  private templateCache = new Map<string, Handlebars.TemplateDelegate>();
  private fileStatsCache = new Map<string, fs.Stats>();
  private batchSize = 10;
  private templateDataCache = new Map<string, any>();

  // Performance metrics
  private metrics: ProcessingMetrics = {
    filesProcessed: 0,
    templatesCompiled: 0,
    cacheHits: 0,
    cacheMisses: 0,
    totalProcessingTime: 0,
    startTime: 0,
  };

  constructor() {
    // Fix: Proper template directory resolution
    this.templatesDir = this.resolveTemplatesDirectory();
    this.handlebars = Handlebars.create();

    registerHandlebarsHelpers(this.handlebars);
    this.registerProcessorHelpers();

    logger.debug(
      `✅ TemplateProcessor initialized with templates at: ${this.templatesDir}`
    );
  } /**
   * Resolve the templates directory based on the current execution context
   */
  private resolveTemplatesDirectory(): string {
    // Get the current file's directory (__dirname points to dist/template when built)
    const currentDir = __dirname;

    // Priority 1: Built mode - templates bundled in CLI dist directory
    // When built: __dirname = packages/cli/dist/template, templates at packages/cli/dist/templates
    let templatesPath = path.resolve(currentDir, "../templates");
    if (fs.existsSync(templatesPath)) {
      logger.debug(`Found templates (bundled): ${templatesPath}`);
      return templatesPath;
    }

    // Priority 2: Development mode - templates in CLI package directory
    // When in dev: __dirname = packages/cli/src/template, templates at packages/cli/templates
    templatesPath = path.resolve(currentDir, "../../templates");
    if (fs.existsSync(templatesPath)) {
      logger.debug(`Found templates (dev CLI package): ${templatesPath}`);
      return templatesPath;
    }

    // Priority 3: Development mode - templates in workspace root
    // Go up from src/template/ to packages/cli/, then to workspace root, then to templates/
    templatesPath = path.resolve(currentDir, "../../../templates");
    if (fs.existsSync(templatesPath)) {
      logger.debug(`Found templates (dev workspace): ${templatesPath}`);
      return templatesPath;
    }

    // Priority 4: Try to find package root and look for templates there
    const packageRoot = this.findPackageRoot(currentDir);
    if (packageRoot) {
      // Try templates in package root
      templatesPath = path.join(packageRoot, "templates");
      if (fs.existsSync(templatesPath)) {
        logger.debug(`Found templates (package root): ${templatesPath}`);
        return templatesPath;
      }

      // Try templates in workspace root relative to package
      templatesPath = path.resolve(packageRoot, "../../templates");
      if (fs.existsSync(templatesPath)) {
        logger.debug(
          `Found templates (workspace from package): ${templatesPath}`
        );
        return templatesPath;
      }
    }

    // Fallback: Create a more informative error
    const searchedPaths = [
      path.resolve(currentDir, "../templates"),
      path.resolve(currentDir, "../../templates"),
      path.resolve(currentDir, "../../../templates"),
      packageRoot ? path.join(packageRoot, "templates") : "N/A",
      packageRoot ? path.resolve(packageRoot, "../../templates") : "N/A",
    ];

    throw new Error(
      `Templates directory not found. Searched in:\n${searchedPaths
        .filter((p) => p !== "N/A")
        .map((p) => `  - ${p}`)
        .join(
          "\n"
        )}\n\nCurrent directory: ${currentDir}\nExpected: Templates should be in workspace root at ../../templates relative to CLI package`
    );
  }

  /**
   * Find the package root by looking for package.json
   */
  private findPackageRoot(startDir: string): string | null {
    let dir = startDir;

    while (dir !== path.dirname(dir)) {
      const packageJsonPath = path.join(dir, "package.json");
      if (fs.existsSync(packageJsonPath)) {
        try {
          const packageJson = JSON.parse(
            fs.readFileSync(packageJsonPath, "utf-8")
          );
          // Check if this is our package by looking for a specific field
          if (
            packageJson.name === "@farm-framework/cli" ||
            packageJson.name === "farm-framework" ||
            packageJson.keywords?.includes("farm-stack")
          ) {
            return dir;
          }
        } catch {
          // Ignore invalid package.json files
        }
      }
      dir = path.dirname(dir);
    }

    return null;
  }

  /**
   * Enhanced template processing with performance optimizations
   */
  async processTemplate(
    templateName: string,
    context: TemplateContext,
    outputPath: string,
    options: TemplateProcessingOptions = {}
  ): Promise<TemplateProcessingResult> {
    this.resetMetrics();
    this.metrics.startTime = Date.now();

    const templatePath = path.join(this.templatesDir, templateName);

    if (!(await fs.pathExists(templatePath))) {
      throw new Error(
        `Template directory not found: ${templatePath}\n` +
          `Available templates: ${await this.listAvailableTemplates()}`
      );
    }

    logger.info(
      `📂 Processing template: ${templateName} ${options.dryRun ? "(dry run)" : ""}`
    );

    const generatedFiles: string[] = [];
    const skippedFiles: string[] = [];

    // Get all template files with filtering
    const templateFiles = await this.getTemplateFiles(templatePath, context);

    // Create template data once and cache it
    const templateData = this.getCachedTemplateData(context);

    // Process files in optimized batches
    const batches = this.createBatches(
      templateFiles,
      options.batchSize || this.batchSize
    );

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];

      if (options.onProgress) {
        options.onProgress({
          current: i * this.batchSize,
          total: templateFiles.length,
          currentFile: batch[0] || "",
          phase: "processing",
        });
      }

      const batchResults = await this.processBatch(
        batch,
        templatePath,
        outputPath,
        templateData,
        context,
        options
      );

      generatedFiles.push(...batchResults.generated);
      skippedFiles.push(...batchResults.skipped);
    }

    const processingTime = Date.now() - this.metrics.startTime;
    this.metrics.totalProcessingTime = processingTime;

    // Log performance metrics
    if (options.verbose) {
      this.logPerformanceMetrics();
    }

    return {
      generatedFiles,
      skippedFiles,
      metrics: { ...this.metrics },
      templateData: options.includeTemplateData ? templateData : undefined,
    };
  }

  /**
   * List available templates for better error messages
   */
  private async listAvailableTemplates(): Promise<string> {
    try {
      const entries = await fs.readdir(this.templatesDir, {
        withFileTypes: true,
      });
      const templates = entries
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
        .join(", ");
      return templates || "None found";
    } catch {
      return "Unable to list templates";
    }
  }

  /**
   * Legacy method for backward compatibility
   */
  async processTemplateLegacy(
    templateName: string,
    context: TemplateContext,
    outputPath: string
  ): Promise<string[]> {
    const result = await this.processTemplate(
      templateName,
      context,
      outputPath
    );
    return result.generatedFiles;
  }

  /**
   * Reset performance metrics
   */
  private resetMetrics(): void {
    this.metrics = {
      filesProcessed: 0,
      templatesCompiled: 0,
      cacheHits: 0,
      cacheMisses: 0,
      totalProcessingTime: 0,
      startTime: 0,
    };
  }

  /**
   * Get template data with caching
   */
  private getCachedTemplateData(context: TemplateContext): any {
    const cacheKey = this.createCacheKey(context);

    if (this.templateDataCache.has(cacheKey)) {
      this.metrics.cacheHits++;
      return this.templateDataCache.get(cacheKey);
    }

    this.metrics.cacheMisses++;
    const templateData = this.createTemplateData(context);
    this.templateDataCache.set(cacheKey, templateData);

    return templateData;
  }

  private createCacheKey(context: TemplateContext): string {
    const relevantData = {
      projectName: context.projectName,
      template: context.template,
      features: context.features,
      database: context.database,
    };
    return crypto
      .createHash("md5")
      .update(JSON.stringify(relevantData))
      .digest("hex");
  }

  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  private async processBatch(
    templateFiles: string[],
    templatePath: string,
    outputPath: string,
    templateData: any,
    context: TemplateContext,
    options: TemplateProcessingOptions
  ): Promise<{ generated: string[]; skipped: string[] }> {
    const generated: string[] = [];
    const skipped: string[] = [];

    const promises = templateFiles.map(async (templateFile) => {
      const sourcePath = path.join(templatePath, templateFile);
      const relativePath = templateFile.replace(/\.hbs$/, "");
      const targetPath = path.join(outputPath, relativePath);

      if (!this.shouldProcessFile(templateFile, context)) {
        skipped.push(relativePath);
        return;
      }

      try {
        if (!options.dryRun) {
          await fs.ensureDir(path.dirname(targetPath));
        }

        if (templateFile.endsWith(".hbs")) {
          await this.processHandlebarsFile(
            sourcePath,
            targetPath,
            templateData,
            options
          );
        } else {
          await this.copyBinaryFile(sourcePath, targetPath, options);
        }

        generated.push(relativePath);
        this.metrics.filesProcessed++;

        logger.debug(
          `✅ ${options.dryRun ? "Would generate" : "Generated"}: ${relativePath}`
        );
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        throw new Error(
          `Failed to process template file "${templateFile}": ${errorMessage}`
        );
      }
    });

    await Promise.all(promises);
    return { generated, skipped };
  }

  /**
   * Render & write a Handlebars template
   */
  private async processHandlebarsFile(
    sourcePath: string,
    targetPath: string,
    templateData: any,
    options: TemplateProcessingOptions
  ): Promise<void> {
    const templateContent = await fs.readFile(sourcePath, "utf-8");

    const cacheKey = sourcePath;
    let compiledTemplate = this.templateCache.get(cacheKey);

    if (!compiledTemplate) {
      compiledTemplate = this.handlebars.compile(templateContent);
      this.templateCache.set(cacheKey, compiledTemplate);
      this.metrics.templatesCompiled++;
    }

    const output = compiledTemplate(templateData);

    if (!options.dryRun) {
      // writeFile overwrites by default – ensures later template passes win
      await fs.writeFile(targetPath, output);
    }
  }

  /**
   * Copy binary or static file – **now always overwrites** existing dest
   */
  private async copyBinaryFile(
    sourcePath: string,
    targetPath: string,
    options: TemplateProcessingOptions
  ): Promise<void> {
    if (!options.dryRun) {
      await fs.copy(sourcePath, targetPath, { overwrite: true });
    }
  }

  private logPerformanceMetrics(): void {
    const { cacheHits, cacheMisses } = this.metrics;
    const cacheHitRatio = (cacheHits / (cacheHits + cacheMisses || 1)) * 100;

    logger.info("📊 Template Processing Performance:");
    logger.info(`   Files processed: ${this.metrics.filesProcessed}`);
    logger.info(`   Templates compiled: ${this.metrics.templatesCompiled}`);
    logger.info(`   Cache hit ratio: ${cacheHitRatio.toFixed(1)}%`);
    logger.info(`   Total time: ${this.metrics.totalProcessingTime}ms`);
    logger.info(
      `   Avg time per file: ${(
        this.metrics.totalProcessingTime / this.metrics.filesProcessed
      ).toFixed(2)}ms`
    );
  }

  private async getTemplateFiles(
    templatePath: string,
    context?: TemplateContext
  ): Promise<string[]> {
    const pattern = path.join(templatePath, "**/*").replace(/\\/g, "/");

    const files = await glob(pattern, {
      ignore: [
        "**/node_modules/**",
        "**/dist/**",
        "**/build/**",
        "**/.git/**",
        "**/coverage/**",
        "**/*.log",
      ],
      nodir: true,
      dot: true,
    });

    const relativeFiles = files.map((file) =>
      path.relative(templatePath, file)
    );

    return context
      ? relativeFiles.filter((file) => this.shouldProcessFile(file, context))
      : relativeFiles;
  }

  private shouldProcessFile(
    filePath: string,
    context: TemplateContext
  ): boolean {
    if (
      (context.template || "basic") === "api-only" &&
      filePath.includes("apps/web")
    )
      return false;

    if (
      !context.features.includes("ai") &&
      (filePath.includes("/ai/") || filePath.includes("/chat/"))
    )
      return false;

    if (!context.features.includes("auth") && filePath.includes("/auth/"))
      return false;

    if (
      !context.features.includes("payments") &&
      filePath.includes("/payments/")
    )
      return false;

    if (
      !context.features.includes("realtime") &&
      filePath.includes("/realtime/")
    )
      return false;

    return true;
  }

  /**
   * Register processor-specific Handlebars helpers
   */
  private registerProcessorHelpers(): void {
    // switch/case helpers
    this.handlebars.registerHelper("switch", (value, options) => {
      this.switch_value = value;
      this.switch_break = false;
      const result = options.fn(this);
      delete this.switch_break;
      delete this.switch_value;
      return result;
    });

    this.handlebars.registerHelper("case", (value, options) => {
      if (value === this.switch_value) {
        this.switch_break = true;
        return options.fn(this);
      }
      return "";
    });

    // indentation helper
    this.handlebars.registerHelper(
      "indent",
      (str: string, spaces: number = 2) =>
        String(str)
          .split("\n")
          .map((line) => " ".repeat(spaces) + line)
          .join("\n")
    );

    // comment helper
    this.handlebars.registerHelper(
      "comment",
      (str: string, style: "js" | "py" | "html" = "js") => {
        const prefix =
          style === "py" ? "# " : style === "html" ? "<!-- " : "// ";
        const suffix = style === "html" ? " -->" : "";
        return `${prefix}${str}${suffix}`;
      }
    );

    // path helper
    this.handlebars.registerHelper(
      "import_path",
      (moduleName: string, isRelative: boolean = false) =>
        isRelative && !moduleName.startsWith(".")
          ? `./${moduleName}`
          : moduleName
    );

    // validation helper
    this.handlebars.registerHelper("validate_name", (name: string) =>
      /^[a-zA-Z][a-zA-Z0-9_-]*$/.test(name)
    ); // lazy helper
    this.handlebars.registerHelper("lazy", (fn: () => string) =>
      typeof fn === "function" ? fn() : fn
    );

    // Raw block helper - allows content to be passed through without Handlebars processing
    this.handlebars.registerHelper("raw", (options: any) => {
      return options.fn();
    });
  }

  // ────────────────────────────────────────────────────────────
  //  Template‑data helpers
  // ────────────────────────────────────────────────────────────

  private createTemplateData(context: TemplateContext) {
    const projectName = context?.projectName || "unnamed-project";
    const kebabName = this.toKebabCase(projectName);
    const template = context.template || "basic";

    return {
      projectName,
      projectNamePascal: this.toPascalCase(projectName),
      projectNameKebab: kebabName,
      template,
      version: "0.1.0",
      description:
        context.description ||
        `A FARM Stack application using ${template} template`,

      features: context.features,
      hasFeature: (feature: string) =>
        context.features.includes(feature as any),

      database: {
        type: context.database,
        url: this.getDatabaseUrl(context.database, kebabName),
        options: this.getDatabaseOptions(context.database),
      },

      ai: context.features.includes("ai")
        ? {
            providers: {
              ollama: {
                enabled: true,
                url: "http://localhost:11434",
                models:
                  template === "ai-chat"
                    ? ["llama3.1", "codestral"]
                    : ["llama3.1"],
                defaultModel: "llama3.1",
                autoStart: true,
                autoPull: ["llama3.1"],
                gpu: true,
              },
              openai: {
                enabled: true,
                models: ["gpt-4", "gpt-3.5-turbo"],
                defaultModel: "gpt-3.5-turbo",
                rateLimiting: {
                  requestsPerMinute: 60,
                  tokensPerMinute: 40000,
                },
              },
            },
            routing: {
              development: "ollama",
              staging: "openai",
              production: "openai",
            },
            features: {
              streaming: true,
              caching: true,
              rateLimiting: true,
              fallback: true,
            },
          }
        : undefined,

      development: {
        ports: {
          frontend: template !== "api-only" ? 3000 : undefined,
          backend: 8000,
          proxy: 4000,
          ai: context.features.includes("ai") ? 11434 : undefined,
        },
        hotReload: {
          enabled: true,
          typeGeneration: true,
          aiModels: context.features.includes("ai"),
        },
        ssl: false,
      },

      build: {
        target: "node18",
        sourcemap: true,
        minify: true,
        splitting: true,
        outDir: "dist",
      },

      deployment:
        context.template !== "basic"
          ? {
              platform: "vercel",
              regions: ["us-east-1"],
              environment: {
                NODE_ENV: "production",
              },
            }
          : undefined,

      plugins: (() => {
        const pluginList = this.getPluginsForTemplate(context);
        return pluginList.length > 0 ? pluginList : undefined;
      })(),

      typescript: context.typescript,
      docker: context.docker,
      git: context.git,
      currentYear: new Date().getFullYear(),

      isApiOnly: context.template === "api-only",
      hasAI: context.features.includes("ai"),
      hasAuth: context.features.includes("auth"),
      hasRealtime: context.features.includes("realtime"),
    };
  }

  private getDatabaseUrl(database: string, projectName: string): string {
    switch (database) {
      case "mongodb":
        return `mongodb://localhost:27017/${projectName}`;
      case "postgresql":
        return `postgresql://user:password@localhost:5432/${projectName}`;
      case "mysql":
        return `mysql://user:password@localhost:3306/${projectName}`;
      case "sqlite":
        return `sqlite:///${projectName}.db`;
      default:
        return `mongodb://localhost:27017/${projectName}`;
    }
  }

  private getDatabaseOptions(database: string): any {
    return database === "mongodb"
      ? { maxPoolSize: 10, serverSelectionTimeoutMS: 5000 }
      : undefined;
  }

  private getPluginsForTemplate(context: TemplateContext): any[] {
    const plugins: any[] = [];

    if (context.features.includes("auth")) {
      plugins.push("@farm/plugin-auth");
    }

    if (context.features.includes("storage")) {
      plugins.push(["@farm/plugin-storage", { provider: "s3" }]);
    }

    return plugins;
  }

  private toPascalCase(str: string): string {
    return str
      ? str
          .split(/[-_]/)
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join("")
      : "";
  }

  private toKebabCase(str: string): string {
    return str
      ? str
          .replace(/([a-z])([A-Z])/g, "$1-$2")
          .replace(/[\s_]+/g, "-")
          .toLowerCase()
      : "";
  }
}
