// packages/cli/src/generators/file-generator-adapter.ts
/**
 * Adapter to bridge between the new typed TemplateContext and existing ProjectFileGenerator
 * This handles the interface mismatch where the old generator expects different parameters
 */

import type { TemplateContext } from "../template/types.js";
import type { TemplateDefinition } from "@farm-framework/types/templates";

// Define what your existing ProjectFileGenerator interface looks like
interface ExistingFileGeneratorInterface {
  generateFromTemplate?:
    | ((
        outputPath: string,
        templateName: string,
        context: any
      ) => Promise<void>)
    | ((
        projectPath: string,
        context: TemplateContext,
        template: TemplateDefinition
      ) => Promise<string[]>);
  generateProject?(
    outputPath: string,
    config: any,
    options?: any
  ): Promise<void>;
  createFiles?(outputPath: string, options: any): Promise<void>;
  generate?(outputPath: string, context: any): Promise<void>;
  // Add other methods your ProjectFileGenerator might have
}

/**
 * Adapter class that converts the new TemplateContext to your existing format
 */
export class FileGeneratorAdapter {
  constructor(private fileGenerator: ExistingFileGeneratorInterface) {}

  async generate(
    outputPath: string,
    context: TemplateContext,
    template?: any
  ): Promise<void> {
    // Convert the new TemplateContext to whatever format your existing FileGenerator expects
    const legacyConfig = this.convertToLegacyFormat(context);

    // Try different interface patterns that the existing generator might use
    if (this.fileGenerator.generateFromTemplate) {
      // Check the function signature by parameter count
      if (this.fileGenerator.generateFromTemplate.length === 3 && template) {
        // New generator: (projectPath, context, template)
        await (this.fileGenerator as any).generateFromTemplate(
          outputPath,
          legacyConfig,
          template
        );
      } else {
        // Old generator: (outputPath, templateName, context)
        await (
          this.fileGenerator.generateFromTemplate as (
            outputPath: string,
            templateName: string,
            context: any
          ) => Promise<void>
        )(outputPath, (context as any).template, legacyConfig);
      }
    } else if (this.fileGenerator.generateProject) {
      // If it expects (outputPath, config, options) - 3 parameters
      await this.fileGenerator.generateProject(outputPath, legacyConfig, {
        verbose: (context as any).verbose || false,
      });
    } else if (this.fileGenerator.generate) {
      // If it has a generate method that takes (outputPath, context) - 2 parameters
      await this.fileGenerator.generate(outputPath, legacyConfig);
    } else if (this.fileGenerator.createFiles) {
      // If it has a createFiles method
      await this.fileGenerator.createFiles(outputPath, legacyConfig);
    } else {
      throw new Error(
        "ProjectFileGenerator does not have a compatible interface. " +
          "Expected one of: generateFromTemplate, generateProject, generate, or createFiles methods."
      );
    }
  }

  private convertToLegacyFormat(context: TemplateContext): any {
    // Convert the new typed context to whatever your existing system expects
    return {
      ...context, // Spread context first so explicit properties below take precedence

      // Project basics
      projectName: context.name,
      template: context.template,
      name: context.name, // Some generators might expect 'name' instead of 'projectName'

      // Database configuration - handle both object and string formats
      database:
        typeof context.database === "object"
          ? context.database.type
          : context.database,
      databaseType:
        typeof context.database === "object"
          ? context.database.type
          : context.database,
      databaseConfig:
        typeof context.database === "object"
          ? context.database
          : { type: context.database },

      // Features as array
      features: context.features || [],
      enabledFeatures: context.features || [], // Alternative property name

      // Development options - handle boolean logic properly
      useTypeScript: context.typescript !== false,
      typescript: context.typescript !== false,
      useDocker: context.docker !== false,
      docker: context.docker !== false,
      useTesting: context.testing !== false,
      testing: context.testing !== false,
      useGit: context.git !== false,
      git: context.git !== false,

      // Installation and setup
      install: context.install !== false,
      installDependencies: context.install !== false,

      // Environment and mode
      environment: context.environment || "development",
      interactive: context.interactive !== false,
      verbose: context.verbose || false,

      // AI configuration if available
      ai: (context as any).ai || {},
      aiConfig: (context as any).ai || {},

      // Paths and structure
      outputPath: (context as any).outputPath,

      // Template-specific configurations
      templateConfig: {
        template: context.template,
        features: context.features || [],
        database:
          typeof context.database === "object"
            ? context.database
            : { type: context.database },
        options: {
          typescript: context.typescript !== false,
          docker: context.docker !== false,
          testing: context.testing !== false,
          git: context.git !== false,
        },
      },

      // Legacy properties that old generators might expect
      config: {
        projectName: context.name,
        template: context.template,
        database:
          typeof context.database === "object"
            ? context.database.type
            : context.database,
        features: context.features || [],
        typescript: context.typescript !== false,
        docker: context.docker !== false,
        testing: context.testing !== false,
      },
    };
  }

  /**
   * Helper method to check what methods are available on the generator
   * Useful for debugging interface issues
   */
  getAvailableMethods(): string[] {
    const methods: string[] = [];
    const proto = Object.getPrototypeOf(this.fileGenerator);

    Object.getOwnPropertyNames(proto).forEach((name) => {
      if (
        typeof (this.fileGenerator as any)[name] === "function" &&
        name !== "constructor"
      ) {
        methods.push(name);
      }
    });

    return methods;
  }

  /**
   * Debug method to log the converted config
   * Call this if you need to see what's being passed to the old generator
   */
  debugConvertedConfig(context: TemplateContext): any {
    const converted = this.convertToLegacyFormat(context);
    console.log("🔍 Available generator methods:", this.getAvailableMethods());
    console.log("🔍 Converted config:", JSON.stringify(converted, null, 2));
    return converted;
  }
}

/**
 * Usage example:
 *
 * import { ProjectFileGenerator } from './project-file-generator.js';
 * import { FileGeneratorAdapter } from './file-generator-adapter.js';
 *
 * const projectGenerator = new ProjectFileGenerator();
 * const adapter = new FileGeneratorAdapter(projectGenerator);
 * await adapter.generate(projectPath, context);
 *
 * // For debugging:
 * // adapter.debugConvertedConfig(context);
 */
