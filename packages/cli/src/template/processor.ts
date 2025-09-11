// packages/cli/src/template/processor.ts
import path from "path";
import fs from "fs-extra";
import { fileURLToPath } from "url";
import { glob } from "glob";
import { TemplateContext } from "@farm-framework/types";
import { logger } from "../utils/logger.js";
import { getHandlebars, compileTemplate, handlebarsSingleton, compileAndExecuteTemplate } from "./handlebars-singleton.js";
import { errorLogger, logTemplateProcessingError, logContextValidationError, ErrorCategory } from "../utils/error-logger.js";
import { TemplateRegistry } from "./registry.js";
import {
  TemplateInheritanceResolver,
  TemplateInheritanceConfig,
  FileInheritanceStrategy,
  TemplateFileInfo,
} from "./inheritance.js";
import {
  DependencyValidator,
  DependencyValidationConfig,
  DependencyValidationResult,
} from "./dependency-validator.js";
import {
  TemplateErrorHandler,
  TemplateError,
  TemplateProcessingResult as ErrorHandlerResult,
} from "./error-handler.js";
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
 * Enhanced template processing options
 */
export interface EnhancedTemplateProcessingOptions
  extends TemplateProcessingOptions {
  inheritanceConfig?: TemplateInheritanceConfig;
  fileStrategy?: FileInheritanceStrategy;
  validateInheritance?: boolean;
  dependencyValidation?: DependencyValidationConfig;
}

/**
 * Progress information for template processing
 */
export interface ProgressInfo {
  current: number;
  total: number;
  currentFile: string;
  phase: "discovery" | "inheritance" | "processing" | "writing";
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
 * Enhanced template processing result
 */
export interface EnhancedTemplateProcessingResult {
  generatedFiles: string[];
  skippedFiles: string[];
  inheritedFiles: string[];
  overriddenFiles: string[];
  metrics: EnhancedProcessingMetrics;
  inheritanceInfo: any;
  dependencyValidation?: DependencyValidationResult;
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
 * Enhanced processing metrics
 */
export interface EnhancedProcessingMetrics extends ProcessingMetrics {
  filesInherited: number;
  filesOverridden: number;
  inheritanceResolutionTime: number;
}

/**
 * Enhanced Template Processor with comprehensive inheritance support
 * Maintains full backward compatibility with the original TemplateProcessor
 */
export class TemplateProcessor {
  private templatesDir: string;
  private registry: TemplateRegistry;
  private inheritanceResolver: TemplateInheritanceResolver;
  private dependencyValidator: DependencyValidator;
  private errorHandler: TemplateErrorHandler;

  // Performance optimizations
  private templateCache = new Map<string, Handlebars.TemplateDelegate>();
  private fileStatsCache = new Map<string, fs.Stats>();
  private batchSize = 10;
  private templateDataCache = new Map<string, any>();

  // Enhanced metrics
  private metrics: EnhancedProcessingMetrics = {
    filesProcessed: 0,
    filesInherited: 0,
    filesOverridden: 0,
    templatesCompiled: 0,
    cacheHits: 0,
    cacheMisses: 0,
    totalProcessingTime: 0,
    inheritanceResolutionTime: 0,
    startTime: 0,
  };

  constructor() {
    // Proper template directory resolution
    this.templatesDir = this.resolveTemplatesDirectory();

    // Initialize registry first
    this.registry = new TemplateRegistry(this.templatesDir);

    // Initialize components
    this.inheritanceResolver = new TemplateInheritanceResolver(
      this.templatesDir
    );
    this.dependencyValidator = new DependencyValidator({
      allowOverrides: false,
      skipValidation: false,
    });

    // Initialize error handler with registered helpers from singleton
    const registeredHelpers = handlebarsSingleton.getRegisteredHelpers();
    this.errorHandler = new TemplateErrorHandler(registeredHelpers);

    // Verify that key helpers are registered
    const helpers = handlebarsSingleton.getRegisteredHelpers();
    logger.debug(`Available Handlebars helpers: ${helpers.join(", ")}`);

    if (helpers.includes("eq")) {
      logger.debug("✅ eq helper is registered");
    } else {
      logger.error("❌ eq helper is NOT registered");
    }

    if (helpers.includes("kebabCase")) {
      logger.debug("✅ kebabCase helper is registered");
    } else {
      logger.error("❌ kebabCase helper is NOT registered");
    }

    if (helpers.includes("switch")) {
      logger.debug("✅ switch helper is registered");
    } else {
      logger.error("❌ switch helper is NOT registered");
    }

    if (helpers.includes("if_feature")) {
      logger.debug("✅ if_feature helper is registered");
    } else {
      logger.error("❌ if_feature helper is NOT registered");
    }

    logger.debug(
      `✅ TemplateProcessor initialized with templates at: ${this.templatesDir}`
    );
  }

  /**
   * Process template using the registry system
   */
  async processTemplateWithRegistry(
    templateName: string,
    context: TemplateContext,
    outputDir: string,
    features: string[] = []
  ): Promise<void> {
    logger.debug(`🏗️ Processing template '${templateName}' with registry system`);

    // Validate template files exist
    const validation = await this.registry.validateTemplateFiles(templateName, features);
    if (!validation.valid) {
      logger.error("❌ Template validation failed:");
      validation.errors.forEach(error => logger.error(`  • ${error}`));
      throw new Error(`Template validation failed: ${validation.errors.join(", ")}`);
    }

    // Get all files that should be generated
    const files = this.registry.resolveFiles(templateName, features);
    logger.debug(`📋 Resolved ${files.length} files to generate`);

    // Process each file
    for (const file of files) {
      const sourcePath = path.join(this.templatesDir, file.templatePath);
      const targetPath = path.join(outputDir, file.path);

      try {
        // Ensure target directory exists
        await fs.ensureDir(path.dirname(targetPath));

        await this.processHandlebarsFile(sourcePath, targetPath, context, {});
        logger.debug(`✅ Generated: ${file.path}`);
      } catch (error) {
        if (file.required) {
          logger.error(`❌ Failed to generate required file: ${file.path}`);
          throw error;
        } else {
          logger.warn(`⚠️ Failed to generate optional file: ${file.path}`);
        }
      }
    }
  }

  /**
   * Main template processing method - now uses inheritance by default
   */
  async processTemplate(
    templateName: string,
    context: TemplateContext,
    outputPath: string,
    options: TemplateProcessingOptions = {}
  ): Promise<TemplateProcessingResult> {
    // Convert to enhanced options with inheritance enabled by default
    const enhancedOptions: EnhancedTemplateProcessingOptions = {
      ...options,
      dependencyValidation: {
        allowOverrides: false,
        warnOnly: true, // Start with warnings to see what's happening
        skipValidation: false,
      },
    };

    // Use the enhanced processing with inheritance
    const enhancedResult = await this.processTemplateEnhanced(
      templateName,
      context,
      outputPath,
      enhancedOptions
    );

    // Convert back to simple result for backward compatibility
    return {
      generatedFiles: enhancedResult.generatedFiles,
      skippedFiles: enhancedResult.skippedFiles,
      metrics: {
        filesProcessed: enhancedResult.metrics.filesProcessed,
        templatesCompiled: enhancedResult.metrics.templatesCompiled,
        cacheHits: enhancedResult.metrics.cacheHits,
        cacheMisses: enhancedResult.metrics.cacheMisses,
        totalProcessingTime: enhancedResult.metrics.totalProcessingTime,
        startTime: enhancedResult.metrics.startTime,
      },
      templateData: enhancedResult.templateData,
    };
  }

  /**
   * Enhanced template processing with full inheritance support
   */
  async processTemplateEnhanced(
    templateName: string,
    context: TemplateContext,
    outputPath: string,
    options: EnhancedTemplateProcessingOptions = {}
  ): Promise<EnhancedTemplateProcessingResult> {
    // Start error logging session
    const sessionId = errorLogger.startSession('template_processing', {
      projectName: context.projectName || context.name,
      templateName: templateName
    });

    this.resetMetrics();
    this.metrics.startTime = Date.now();

    logger.step(`🎨 STARTING ENHANCED TEMPLATE PROCESSING`);
    logger.debugVerbose(`Template: ${templateName}`);
    logger.debugVerbose(`Output path: ${outputPath}`);
    logger.debugVerbose(`Options:`, options);
    logger.debugVerbose(`Context:`, context);

    try {
      logger.info(
        `🏗️  Processing template with inheritance: ${templateName} ${options.dryRun ? "(dry run)" : ""}`
      );

      const inheritanceStartTime = Date.now();
      logger.step(`🔍 Resolving template inheritance`);

      // Resolve template inheritance
      logger.progress(`Looking up template files for: ${templateName}`);
      const inheritanceFiles =
        await this.inheritanceResolver.resolveTemplateFiles(
          templateName,
          context
        );

      this.metrics.inheritanceResolutionTime = Date.now() - inheritanceStartTime;
      logger.result(
        `⚡ Inheritance resolved in ${this.metrics.inheritanceResolutionTime}ms`
      );

      // Get inheritance info for metrics
      logger.progress(`Getting inheritance information`);
      const inheritanceInfo = await this.inheritanceResolver.getInheritanceInfo(
        templateName,
        context
      );

      logger.result(
        `📋 Resolved inheritance: ${inheritanceFiles.length} files (${inheritanceInfo.baseFiles} base, ${inheritanceInfo.templateFiles} template, ${inheritanceInfo.featureFiles} features)`
      );
      logger.debugDetailed(`Inheritance info:`, inheritanceInfo);
      logger.debugDetailed(
        `Inheritance files:`,
        inheritanceFiles.map((f) => ({
          path: f.relativePath,
          source: f.source,
          isHandlebars: f.isHandlebars,
          priority: f.priority,
        }))
      );

      // Validate and merge package.json dependencies
      logger.step(`🔍 Validating dependencies`);
      let dependencyValidationResult: DependencyValidationResult | undefined;
      if (options.dependencyValidation?.skipValidation !== true) {
        logger.progress(`Starting dependency validation`);
        dependencyValidationResult = await this.validateAndMergeDependencies(
          inheritanceFiles,
          templateName,
          options.dependencyValidation || {}
        );

        logger.result(
          `Dependency validation completed: ${dependencyValidationResult.valid ? "VALID" : "INVALID"}`
        );
        logger.debugVerbose(`Validation result:`, dependencyValidationResult);

        if (dependencyValidationResult.conflicts.length > 0) {
          logger.warn(
            `Found ${dependencyValidationResult.conflicts.length} dependency conflicts`
          );
          logger.debugDetailed(
            `Conflicts:`,
            dependencyValidationResult.conflicts
          );
        }

        if (
          !dependencyValidationResult.valid &&
          !options.dependencyValidation?.warnOnly
        ) {
          logger.error(`Dependency validation failed - aborting`);
          throw new Error(
            `Dependency validation failed. ${dependencyValidationResult.conflicts.length} conflicts found. ` +
            `Use dependencyValidation.warnOnly=true to proceed with warnings.`
          );
        }

        if (options.verbose && dependencyValidationResult.conflicts.length > 0) {
          logger.info(
            "\n" +
            this.dependencyValidator.generateValidationReport(
              dependencyValidationResult
            )
          );
        }
      } else {
        logger.progress(`Dependency validation skipped`);
      }

      const generatedFiles: string[] = [];
      const skippedFiles: string[] = [];
      const inheritedFiles: string[] = [];
      const overriddenFiles: string[] = [];

      // Create template data once and cache it
      logger.step(`🎨 Creating template data context`);
      const templateData = this.getCachedTemplateData(context);
      logger.debugDetailed(`Template data created:`, templateData);

      // Process files in optimized batches
      logger.step(`🔄 Processing files in batches`);
      const batches = this.createBatches(
        inheritanceFiles,
        options.batchSize || this.batchSize
      );
      logger.result(
        `Created ${batches.length} batches for ${inheritanceFiles.length} files`
      );

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        logger.progress(
          `Processing batch ${i + 1}/${batches.length} (${batch.length} files)`
        );
        logger.debugTrace(
          `Batch ${i + 1} files:`,
          batch.map((f) => f.relativePath)
        );

        if (options.onProgress) {
          options.onProgress({
            current: i * this.batchSize,
            total: inheritanceFiles.length,
            currentFile: batch[0]?.relativePath || "",
            phase: "processing",
          });
        }

        logger.debugVerbose(`Calling processInheritanceBatch for batch ${i + 1}`);
        const batchResults = await this.processInheritanceBatch(
          batch,
          outputPath,
          templateData,
          context,
          options
        );

        logger.debugTrace(`Batch ${i + 1} results:`, batchResults);

        generatedFiles.push(...batchResults.generated);
        skippedFiles.push(...batchResults.skipped);
        inheritedFiles.push(...batchResults.inherited);
        overriddenFiles.push(...batchResults.overridden);

        logger.progress(
          `Batch ${i + 1} completed: ${batchResults.generated.length} generated, ${batchResults.skipped.length} skipped`
        );
      }

      const processingTime = Date.now() - this.metrics.startTime;
      this.metrics.totalProcessingTime = processingTime;

      logger.step(`📊 Template processing completed`);
      logger.result(`Generated: ${generatedFiles.length} files`);
      logger.result(`Skipped: ${skippedFiles.length} files`);
      logger.result(`Inherited: ${inheritedFiles.length} files`);
      logger.result(`Overridden: ${overriddenFiles.length} files`);
      logger.result(`Total processing time: ${processingTime}ms`);

      // Log performance metrics
      if (options.verbose) {
        logger.step(`📈 Performance metrics`);
        this.logPerformanceMetrics();
        this.logInheritanceMetrics(inheritanceInfo);
      }

      logger.success(`🎉 ENHANCED TEMPLATE PROCESSING COMPLETED`);

      return {
        generatedFiles,
        skippedFiles,
        inheritedFiles,
        overriddenFiles,
        metrics: { ...this.metrics },
        inheritanceInfo,
        dependencyValidation: dependencyValidationResult,
        templateData: options.includeTemplateData ? templateData : undefined,
      };
    } catch (error) {
      // Log template processing error
      logTemplateProcessingError(error instanceof Error ? error : new Error(String(error)), {
        templateName,
        projectName: context.projectName || context.name,
        outputPath,
        operation: 'processTemplateEnhanced'
      });

      // Re-throw the error
      throw error;
    } finally {
      // End error logging session
      errorLogger.endSession();
    }
  }

  /**
   * Process a batch of inherited template files
   */
  private async processInheritanceBatch(
    templateFiles: TemplateFileInfo[],
    outputPath: string,
    templateData: any,
    context: TemplateContext,
    options: EnhancedTemplateProcessingOptions
  ): Promise<{
    generated: string[];
    skipped: string[];
    inherited: string[];
    overridden: string[];
  }> {
    const generated: string[] = [];
    const skipped: string[] = [];
    const inherited: string[] = [];
    const overridden: string[] = [];

    const promises = templateFiles.map(async (templateFile) => {
      const sourcePath = templateFile.path;
      const relativePath = templateFile.relativePath.replace(/\.hbs$/, "");
      const targetPath = path.join(outputPath, relativePath);

      if (!this.shouldProcessFile(templateFile.relativePath, context)) {
        skipped.push(relativePath);
        return;
      }

      try {
        if (!options.dryRun) {
          await fs.ensureDir(path.dirname(targetPath));
        }

        // Track inheritance information
        if (templateFile.source === "base") {
          inherited.push(relativePath);
          this.metrics.filesInherited++;
        } else if (
          templateFile.source === "template" ||
          templateFile.source === "feature"
        ) {
          // Check if this file overrides a base file
          const hasBaseVersion = templateFiles.some(
            (f) =>
              f.relativePath === templateFile.relativePath &&
              f.source === "base"
          );
          if (hasBaseVersion) {
            overridden.push(relativePath);
            this.metrics.filesOverridden++;
          }
        }

        if (templateFile.isHandlebars) {
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

        const sourceLabel =
          templateFile.source === "base"
            ? "📋"
            : templateFile.source === "feature"
              ? "📦"
              : "📄";

        logger.debug(
          `✅ ${options.dryRun ? "Would generate" : "Generated"} ${sourceLabel}: ${relativePath}`
        );
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        throw new Error(
          `Failed to process template file "${templateFile.relativePath}" from ${templateFile.source}: ${errorMessage}`
        );
      }
    });

    await Promise.all(promises);
    return { generated, skipped, inherited, overridden };
  }

  /**
   * Render & write a Handlebars template with comprehensive error handling
   * Also handles static assets (non-template files) by copying them directly
   */
  private async processHandlebarsFile(
    sourcePath: string,
    targetPath: string,
    templateData: any,
    options: TemplateProcessingOptions | EnhancedTemplateProcessingOptions
  ): Promise<void> {
    logger.debugTrace(`Processing file: ${sourcePath}`);
    logger.debugTrace(`Target path: ${targetPath}`);
    logger.debugTrace(
      `Template data keys: ${Object.keys(templateData).join(", ")}`
    );

    // Check if this is a static asset (non-template file)
    if (!sourcePath.endsWith('.hbs')) {
      logger.debugTrace(`Copying static asset: ${sourcePath}`);
      await this.copyStaticFile(sourcePath, targetPath, options);
      return;
    }

    const templateContent = await fs.readFile(sourcePath, "utf-8");
    logger.debugTrace(
      `Template content: ${templateContent.substring(0, 200)}${templateContent.length > 200 ? "..." : ""}`
    );

    // Use safe template processing with comprehensive error handling
    const result = await this.errorHandler.safeProcessTemplate(
      templateContent,
      templateData,
      sourcePath,
      getHandlebars()
    );

    if (!result.success) {
      // Log all errors and warnings
      if (result.errors.length > 0) {
        logger.error(`❌ Template processing failed: ${sourcePath}`);
        const errorReport = this.errorHandler.formatErrorReport(result.errors);
        logger.error(errorReport);

        // Log each specific error to the error logger
        result.errors.forEach((error, index) => {
          logTemplateProcessingError(`Template processing error ${index + 1}: ${error.message}`, {
            filePath: sourcePath,
            operation: 'processHandlebarsFile',
            errorType: error.type,
            templateError: error,
            errorIndex: index,
            totalErrors: result.errors.length
          });
        });

        // Try fallback processing for development
        logger.progress("Attempting fallback processing...");
        try {
          const compiledTemplate = compileTemplate(templateContent);
          const output = compiledTemplate(templateData);
          logger.progress("✅ Fallback processing succeeded");

          if (!options.dryRun) {
            await fs.writeFile(targetPath, output);
            logger.debugTrace(`Written to file via fallback: ${targetPath}`);
          }
          return;
        } catch (fallbackError) {
          logger.error("❌ Fallback processing also failed");
          const fallbackMessage =
            fallbackError instanceof Error
              ? fallbackError.message
              : String(fallbackError);

          // Log the fallback failure
          logTemplateProcessingError(`Fallback processing failed: ${fallbackMessage}`, {
            filePath: sourcePath,
            operation: 'fallback_processing',
            errorType: 'fallback_failure',
            originalErrors: result.errors,
            fallbackError: fallbackError instanceof Error ? fallbackError.message : String(fallbackError)
          });

          throw new Error(
            `Template processing failed: ${sourcePath}\n${errorReport}\nFallback error: ${fallbackMessage}`
          );
        }
      }
    }

    // Log warnings if any
    if (result.warnings.length > 0) {
      logger.progress(`⚠️ Template warnings for: ${sourcePath}`);
      const warningReport = this.errorHandler.formatErrorReport(
        result.warnings
      );
      logger.debugVerbose(warningReport);

      // Log each warning to the error logger
      result.warnings.forEach((warning, index) => {
        logTemplateProcessingError(`Template warning ${index + 1}: ${warning.message}`, {
          filePath: sourcePath,
          operation: 'processHandlebarsFile',
          errorType: warning.type,
          templateWarning: warning,
          warningIndex: index,
          totalWarnings: result.warnings.length
        });
      });
    }

    // Write successful result
    if (result.content && !options.dryRun) {
      await fs.writeFile(targetPath, result.content);
      logger.debugTrace(`Written to file: ${targetPath}`);
    }

    logger.debugTrace(
      `Template output: ${result.content?.substring(0, 200)}${result.content && result.content.length > 200 ? "..." : ""}`
    );
  }

  /**
   * Copy static file (non-template) directly to target
   */
  private async copyStaticFile(
    sourcePath: string,
    targetPath: string,
    options: TemplateProcessingOptions | EnhancedTemplateProcessingOptions
  ): Promise<void> {
    try {
      // Ensure target directory exists
      const targetDir = path.dirname(targetPath);
      await fs.ensureDir(targetDir);

      if (!options.dryRun) {
        // Copy the file directly
        await fs.copyFile(sourcePath, targetPath);
        logger.debugTrace(`✅ Copied static file: ${sourcePath} -> ${targetPath}`);
      } else {
        logger.debugTrace(`[DRY RUN] Would copy static file: ${sourcePath} -> ${targetPath}`);
      }
    } catch (error) {
      logger.error(`❌ Failed to copy static file: ${sourcePath}`);
      throw error;
    }
  }

  /**
   * Copy binary or static file
   */
  private async copyBinaryFile(
    sourcePath: string,
    targetPath: string,
    options: TemplateProcessingOptions | EnhancedTemplateProcessingOptions
  ): Promise<void> {
    if (!options.dryRun) {
      await fs.copy(sourcePath, targetPath, { overwrite: true });
    }
  }

  /**
   * Validate and merge package.json dependencies from inheritance
   */
  private async validateAndMergeDependencies(
    inheritanceFiles: TemplateFileInfo[],
    templateName: string,
    config: DependencyValidationConfig
  ): Promise<DependencyValidationResult> {
    logger.step(`🔍 STARTING DEPENDENCY VALIDATION`);
    logger.debugVerbose(`Template: ${templateName}`);
    logger.debugVerbose(`Config:`, config);
    logger.debugVerbose(`Total inheritance files: ${inheritanceFiles.length}`);

    // Find all package.json files in the inheritance chain
    logger.progress(`Searching for package.json files in inheritance chain`);
    const packageJsonFiles = inheritanceFiles.filter((file) =>
      file.relativePath.endsWith("package.json.hbs")
    );

    logger.result(`Found ${packageJsonFiles.length} package.json files`);
    logger.debugDetailed(
      `Package.json files:`,
      packageJsonFiles.map((f) => ({
        path: f.relativePath,
        source: f.source,
        priority: f.priority,
      }))
    );

    if (packageJsonFiles.length === 0) {
      logger.warn("No package.json files found in inheritance chain");
      return {
        valid: true,
        conflicts: [],
        warnings: [],
        mergedDependencies: {},
        mergedDevDependencies: {},
      };
    }

    // Initialize dependency validator with base template
    logger.progress(`Initializing dependency validator`);
    const baseTemplatePath = path.join(this.templatesDir, "base");
    logger.debugVerbose(`Base template path: ${baseTemplatePath}`);

    logger.progress(`Loading base dependencies`);
    await this.dependencyValidator.loadBaseDependencies(baseTemplatePath);

    // Create validation config with defaults
    const validationConfig: DependencyValidationConfig = {
      allowOverrides: false,
      warnOnly: false,
      skipValidation: false,
      ...config,
    };
    logger.debugVerbose(`Final validation config:`, validationConfig);

    // Update validator config
    logger.progress(`Updating validator configuration`);
    this.dependencyValidator = new DependencyValidator(validationConfig);
    await this.dependencyValidator.loadBaseDependencies(baseTemplatePath);

    // Read and collect package.json content from all files
    logger.progress(`Reading package.json contents`);
    const packageJsonContents = await Promise.all(
      packageJsonFiles.map(async (file) => {
        logger.debugTrace(`Reading file: ${file.relativePath}`);
        const content = await fs.readFile(file.path, "utf-8");
        logger.debugTrace(
          `File ${file.relativePath} content length: ${content.length} chars`
        );
        return {
          content,
          source: file.source,
          filePath: file.path,
        };
      })
    );

    logger.result(`Read ${packageJsonContents.length} package.json files`);

    // Validate and merge dependencies
    logger.progress(`Validating and merging dependencies`);
    const result =
      await this.dependencyValidator.validateAndMergeDependencies(
        packageJsonContents
      );

    logger.result(`Dependency validation completed`);
    logger.result(`Valid: ${result.valid}`);
    logger.result(`Conflicts: ${result.conflicts.length}`);
    logger.result(`Warnings: ${result.warnings.length}`);
    logger.debugDetailed(`Validation result:`, result);

    if (result.conflicts.length > 0) {
      logger.warn(
        `🔍 Found ${result.conflicts.length} dependency conflicts in template ${templateName}`
      );
      logger.debugDetailed(`Conflicts details:`, result.conflicts);
    }

    logger.success(`✅ Dependency validation completed`);
    return result;
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
   * Check if file should be processed based on context
   */
  private shouldProcessFile(
    filePath: string,
    context: TemplateContext
  ): boolean {
    if (
      (context.template || "basic") === "api-only" &&
      filePath.includes("apps/web")
    ) {
      return false;
    }

    if (
      !context.features.includes("ai") &&
      (filePath.includes("/ai/") || filePath.includes("/chat/"))
    ) {
      return false;
    }

    if (!context.features.includes("auth") && filePath.includes("/auth/")) {
      return false;
    }

    if (
      !context.features.includes("payments") &&
      filePath.includes("/payments/")
    ) {
      return false;
    }

    if (
      !context.features.includes("realtime") &&
      filePath.includes("/realtime/")
    ) {
      return false;
    }

    return true;
  }

  /**
   * Reset performance metrics
   */
  private resetMetrics(): void {
    this.metrics = {
      filesProcessed: 0,
      filesInherited: 0,
      filesOverridden: 0,
      templatesCompiled: 0,
      cacheHits: 0,
      cacheMisses: 0,
      totalProcessingTime: 0,
      inheritanceResolutionTime: 0,
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

  private createTemplateData(context: TemplateContext): any {
    const projectName = context?.projectName || "unnamed-project";
    const kebabName = this.toKebabCase(projectName);
    const template = context.template || "basic";

    return {
      name: projectName,
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

      // Environment configuration
      environment: {
        NODE_ENV: context.environment || "development",
        ENVIRONMENT: context.environment || "development",
      },

      // Utility functions
      now: new Date().toISOString(),
      pascalCase: (str: string) => this.toPascalCase(str),
      kebabCase: (str: string) => this.toKebabCase(str),
      camelCase: (str: string) => this.toCamelCase(str),

      isApiOnly: context.template === "api-only",
      hasAI: context.features.includes("ai"),
      hasAuth: context.features.includes("auth"),
      hasRealtime: context.features.includes("realtime"),
    };
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
        this.metrics.totalProcessingTime / (this.metrics.filesProcessed || 1)
      ).toFixed(2)}ms`
    );
  }

  private logInheritanceMetrics(inheritanceInfo: any): void {
    logger.info("🏗️  Template Inheritance Summary:");
    logger.info(`   Base template: ${inheritanceInfo.baseTemplate || "none"}`);
    logger.info(`   Template files: ${inheritanceInfo.templateFiles || 0}`);
    logger.info(`   Base files: ${inheritanceInfo.baseFiles || 0}`);
    logger.info(`   Feature files: ${inheritanceInfo.featureFiles || 0}`);
    logger.info(
      `   Conflicts resolved: ${inheritanceInfo.conflicts?.length || 0}`
    );

    if (inheritanceInfo.conflicts?.length > 0) {
      logger.debug("🔀 Resolved conflicts:");
      inheritanceInfo.conflicts.forEach((conflict: any) => {
        logger.debug(
          `     ${conflict.path} (sources: ${conflict.sources.join(", ")})`
        );
      });
    }
  }

  /**
   * Resolve the templates directory based on the current execution context
   */
  public resolveTemplatesDirectory(): string {
    const currentDir = __dirname;

    // Option 1: Check if templates are bundled with the CLI (PRIORITY)
    let templatesPath = path.resolve(currentDir, "templates");
    logger.debug(`Checking bundled templates path: ${templatesPath}`);
    if (fs.existsSync(templatesPath)) {
      logger.debug(`✅ Found templates (bundled): ${templatesPath}`);
      return templatesPath;
    } else {
      logger.debug(`❌ Bundled templates not found at: ${templatesPath}`);
    }

    // Option 2: Try relative to the current file (development)
    templatesPath = path.resolve(currentDir, "../../../templates");
    if (fs.existsSync(templatesPath)) {
      logger.debug(`Found templates (dev): ${templatesPath}`);
      return templatesPath;
    }

    // Option 3: Try relative to the package root (when installed)
    templatesPath = path.resolve(currentDir, "../../templates");
    if (fs.existsSync(templatesPath)) {
      logger.debug(`Found templates (installed): ${templatesPath}`);
      return templatesPath;
    }

    // Option 4: Try from the npm global location
    const packageRoot = this.findPackageRoot(currentDir);
    if (packageRoot) {
      templatesPath = path.join(packageRoot, "templates");
      if (fs.existsSync(templatesPath)) {
        logger.debug(`Found templates (global): ${templatesPath}`);
        return templatesPath;
      }
    }

    // Fallback: Create a more informative error
    const searchedPaths = [
      path.resolve(currentDir, "templates"),
      path.resolve(currentDir, "../../../templates"),
      path.resolve(currentDir, "../../templates"),
      packageRoot ? path.join(packageRoot, "templates") : "N/A",
    ];

    throw new Error(
      `Templates directory not found. Searched in:\n${searchedPaths
        .filter((p) => p !== "N/A")
        .map((p) => `  - ${p}`)
        .join("\n")}\n\nCurrent directory: ${currentDir}`
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

  private toCamelCase(str: string): string {
    return str
      ? str
        .split(/[-_]/)
        .map((w, i) => i === 0 ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
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

  /**
   * Get available helpers for debugging
   */
  public getAvailableHelpers(): string[] {
    return this.errorHandler.getAvailableHelpers();
  }

  /**
   * Run preflight checks on a template directory
   */
  public async runPreflightChecks(
    templateDir: string
  ): Promise<TemplateError[]> {
    logger.step("🔍 Running preflight checks on template directory");
    const allErrors: TemplateError[] = [];

    try {
      const templateFiles = await glob("**/*.hbs", {
        cwd: templateDir,
        absolute: true,
      });

      logger.progress(`Found ${templateFiles.length} template files to check`);

      for (const templateFile of templateFiles) {
        try {
          const content = await fs.readFile(templateFile, "utf-8");
          const errors = this.errorHandler.preflightCheck(
            content,
            templateFile
          );
          allErrors.push(...errors);
        } catch (error) {
          allErrors.push({
            type: "unknown",
            message: `Failed to read template file: ${error instanceof Error ? error.message : String(error)}`,
            file: templateFile,
            severity: "error",
          });
        }
      }

      logger.result(
        `Preflight checks complete. Found ${allErrors.length} issues`
      );

      if (allErrors.length > 0) {
        const errorReport = this.errorHandler.formatErrorReport(allErrors);
        logger.debugVerbose(errorReport);
      }
    } catch (error) {
      logger.error(
        `Failed to run preflight checks: ${error instanceof Error ? error.message : String(error)}`
      );
      allErrors.push({
        type: "unknown",
        message: `Failed to scan template directory: ${error instanceof Error ? error.message : String(error)}`,
        file: templateDir,
        severity: "error",
      });
    }

    return allErrors;
  }

  /**
   * Process a single template file and return its content
   */
  async processTemplateFile(
    templatePath: string,
    context: TemplateContext,
    outputPath: string
  ): Promise<string> {
    const templateRoot = this.resolveTemplateRoot();
    const fullTemplatePath = path.join(templateRoot, templatePath);

    if (!(await fs.pathExists(fullTemplatePath))) {
      throw new Error(`Template file not found: ${templatePath}`);
    }

    const templateContent = await fs.readFile(fullTemplatePath, "utf-8");
    const compiledTemplate = compileTemplate(templateContent);

    return compiledTemplate(context);
  }

  /**
   * Resolve the template root directory
   */
  private resolveTemplateRoot(): string {
    return this.resolveTemplatesDirectory();
  }

  /**
   * Get the templates directory path (public method for external use)
   */
  getTemplatesDir(): string {
    return this.resolveTemplateRoot();
  }
}
