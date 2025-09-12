import type { OpenAPISchema } from "@farm-framework/types";
import {
  TypeScriptGenerator,
  type TypeScriptGenerationOptions,
  type GenerationResult,
} from "./typescript";
import * as fs from "fs-extra";
import * as path from "path";
import * as crypto from "crypto";
import type {
  OpenAPISchemaObject,
  OpenAPIPathItem,
  OpenAPIOperation,
  OpenAPIPaths,
  OpenAPIParameter,
  TypeMappingFunction,
  ValidationLibraryType,
  ModuleGrouping,
} from "./types/enhanced-types";
import {
  TypeSyncError,
  SchemaValidationError,
  GenerationError,
  FileSystemError,
  handleError,
} from "../errors/generation-errors";

export interface EnhancedTypeScriptOptions extends TypeScriptGenerationOptions {
  // Advanced type generation options
  interfaces?: {
    prefix?: string;
    suffix?: string;
    readonly?: boolean;
  };

  enums?: {
    style?: "const" | "enum" | "union";
    casing?: "UPPER_CASE" | "camelCase" | "PascalCase";
    prefix?: string;
    suffix?: string;
  };

  arrays?: {
    readonly?: boolean;
    tuples?: boolean;
  };

  optionalProperties?: {
    style?: "question-mark" | "undefined-union";
  };

  // Type transformations
  customTypes?: Record<string, string>;
  typeMapping?: Record<string, TypeMappingFunction>;

  // Code organization
  modules?: {
    splitByTag?: boolean;
    splitByPath?: boolean;
    indexFile?: boolean;
  };

  // Code quality
  validation?: {
    generateRuntimeValidation?: boolean;
    validationLibrary?: "zod" | "joi" | "yup";
  };

  documentation?: {
    includeExamples?: boolean;
    includeConstraints?: boolean;
    generateJSDoc?: boolean;
  };

  // Performance optimizations
  optimizations?: {
    treeShaking?: boolean;
    minifyTypes?: boolean;
    deduplicateTypes?: boolean;
  };
}

/**
 * Enhanced TypeScript Generator with advanced features and optimizations
 * 
 * This generator extends the base TypeScriptGenerator with additional capabilities:
 * - Advanced type generation with custom formatting and naming conventions
 * - Module splitting by tags or paths for better organization
 * - Runtime validation schema generation (Zod, Joi, Yup)
 * - Type guards and utility functions for runtime type checking
 * - Comprehensive error handling with detailed error messages
 * - Custom type mappings and transformations
 * - Schema deduplication and optimization
 * - JSDoc generation with examples and constraints
 * 
 * @example
 * ```typescript
 * const generator = new EnhancedTypeScriptGenerator({
 *   outputDir: './generated',
 *   interfaces: { prefix: 'I', suffix: 'Type' },
 *   enums: { style: 'const', casing: 'PascalCase' },
 *   validation: { generateRuntimeValidation: true, validationLibrary: 'zod' },
 *   modules: { splitByTag: true, indexFile: true }
 * });
 * 
 * const results = await generator.generate(schema);
 * ```
 */
export class EnhancedTypeScriptGenerator {
  private enhancedOptions: EnhancedTypeScriptOptions;
  private baseGenerator: TypeScriptGenerator;

  /**
   * Creates a new EnhancedTypeScriptGenerator instance
   * 
   * @param options - Configuration options for the generator
   * @param options.interfaces - Interface generation options (prefix, suffix, readonly)
   * @param options.enums - Enum generation options (style, casing, prefix, suffix)
   * @param options.arrays - Array generation options (readonly, tuples)
   * @param options.optionalProperties - Optional property styling options
   * @param options.customTypes - Custom type mappings for OpenAPI formats
   * @param options.typeMapping - Custom type mapping functions
   * @param options.modules - Module organization options (splitByTag, splitByPath, indexFile)
   * @param options.validation - Runtime validation options (generateRuntimeValidation, validationLibrary)
   * @param options.documentation - Documentation generation options (includeExamples, includeConstraints, generateJSDoc)
   * @param options.optimizations - Code optimization options (treeShaking, minifyTypes, deduplicateTypes)
   * 
   * @example
   * ```typescript
   * const generator = new EnhancedTypeScriptGenerator({
   *   outputDir: './generated',
   *   interfaces: { prefix: 'I', suffix: 'Type' },
   *   enums: { style: 'const', casing: 'PascalCase' },
   *   validation: { generateRuntimeValidation: true, validationLibrary: 'zod' },
   *   modules: { splitByTag: true, indexFile: true }
   * });
   * ```
   */
  constructor(options?: Partial<EnhancedTypeScriptOptions>) {
    const baseOptions = {
      outputDir: "./src/types",
      generateComments: true,
      enumType: "union" as const,
      dateType: "string" as const,
      fileNaming: "camelCase" as const,
      cleanOrphans: true,
      metadataFile: "generation-metadata.json",
      strict: true,
      exportStyle: "named" as const,
    };

    this.baseGenerator = new TypeScriptGenerator(baseOptions);

    this.enhancedOptions = {
      ...baseOptions,
      interfaces: {
        prefix: "",
        suffix: "",
        readonly: false,
      },
      enums: {
        style: "const",
        casing: "PascalCase",
        prefix: "",
        suffix: "",
      },
      arrays: {
        readonly: false,
        tuples: false,
      },
      optionalProperties: {
        style: "question-mark",
      },
      customTypes: {
        "date-time": "Date",
        date: "string",
        uuid: "string",
        uri: "string",
        email: "string",
      },
      modules: {
        splitByTag: false,
        splitByPath: false,
        indexFile: true,
      },
      validation: {
        generateRuntimeValidation: false,
        validationLibrary: "zod",
      },
      documentation: {
        includeExamples: true,
        includeConstraints: true,
        generateJSDoc: true,
      },
      optimizations: {
        treeShaking: true,
        minifyTypes: false,
        deduplicateTypes: true,
      },
      ...options,
    };
  }

  /**
   * Generate TypeScript types from OpenAPI schema
   * 
   * This is the main entry point for type generation. It delegates to the enhanced
   * generation method which provides additional features like module splitting,
   * validation schema generation, and advanced error handling.
   * 
   * @param schema - The OpenAPI schema to generate types from
   * @returns Promise resolving to an array of generation results
   * 
   * @throws {SchemaValidationError} When the schema is invalid or missing required fields
   * @throws {GenerationError} When type generation fails
   * @throws {FileSystemError} When file writing operations fail
   * 
   * @example
   * ```typescript
   * const generator = new EnhancedTypeScriptGenerator();
   * const results = await generator.generate(schema);
   * 
   * for (const result of results) {
   *   console.log(`Generated ${result.type} at ${result.path}`);
   * }
   * ```
   */
  async generate(schema: OpenAPISchema): Promise<GenerationResult[]> {
    return this.generateEnhanced(schema);
  }

  /**
   * Generate enhanced TypeScript types with advanced features
   * 
   * This method provides the core enhanced generation functionality including:
   * - Schema validation and preprocessing
   * - Module splitting by tags or paths
   * - Runtime validation schema generation
   * - Comprehensive error handling
   * - Index file generation
   * 
   * @param schema - The OpenAPI schema to generate types from
   * @returns Promise resolving to an array of generation results
   * 
   * @throws {SchemaValidationError} When the schema is invalid
   * @throws {GenerationError} When generation fails for specific modules
   * @throws {FileSystemError} When file operations fail
   * 
   * @example
   * ```typescript
   * const generator = new EnhancedTypeScriptGenerator({
   *   modules: { splitByTag: true },
   *   validation: { generateRuntimeValidation: true }
   * });
   * 
   * const results = await generator.generateEnhanced(schema);
   * // Results will include separate files for each tag and validation schemas
   * ```
   */
  async generateEnhanced(schema: OpenAPISchema): Promise<GenerationResult[]> {
    try {
      const results: GenerationResult[] = [];

      // Validate schema
      this.validateSchema(schema);

      // Preprocess schema
      const processedSchema = this.preprocessSchema(schema);

      if (this.enhancedOptions.modules?.splitByTag && schema.tags) {
        // Generate separate files for each tag
        for (const tag of schema.tags) {
          try {
            const tagSchema = this.extractSchemaByTag(processedSchema, tag.name);
            const result = await this.generateModuleFile(tagSchema, tag.name);
            results.push(result);
          } catch (error) {
            throw new GenerationError(
              `Failed to generate module for tag ${tag.name}`,
              { tagName: tag.name, error: handleError(error) }
            );
          }
        }
      } else if (this.enhancedOptions.modules?.splitByPath) {
        // Generate separate files for each path group
        const pathGroups = this.groupPathsByModule(processedSchema.paths || {});
        for (const [moduleName, paths] of Object.entries(pathGroups)) {
          try {
            const moduleSchema = { ...processedSchema, paths } as OpenAPISchema;
            const result = await this.generateModuleFile(moduleSchema, moduleName);
            results.push(result);
          } catch (error) {
            throw new GenerationError(
              `Failed to generate module ${moduleName}`,
              { moduleName, error: handleError(error) }
            );
          }
        }
      } else {
        // Generate single file
        try {
          const result = await this.generateSingleFile(processedSchema);
          results.push(result);
        } catch (error) {
          throw new GenerationError(
            'Failed to generate single file',
            { error: handleError(error) }
          );
        }
      }

      // Generate index file if requested
      if (this.enhancedOptions.modules?.indexFile && results.length > 1) {
        try {
          const indexResult = await this.generateIndexFile(results);
          results.push(indexResult);
        } catch (error) {
          throw new GenerationError(
            'Failed to generate index file',
            { error: handleError(error) }
          );
        }
      }

      // Generate runtime validation if requested
      if (this.enhancedOptions.validation?.generateRuntimeValidation) {
        try {
          const validationResult = await this.generateValidationSchemas(processedSchema);
          results.push(validationResult);
        } catch (error) {
          throw new GenerationError(
            'Failed to generate validation schemas',
            { error: handleError(error) }
          );
        }
      }

      return results;
    } catch (error) {
      throw handleError(error, { schema: schema.info?.title });
    }
  }

  /**
   * Validate the OpenAPI schema
   * 
   * Performs comprehensive validation of the input schema to ensure it meets
   * the requirements for type generation. Validates schema structure, required
   * fields, and data types.
   * 
   * @param schema - The OpenAPI schema to validate
   * @throws {SchemaValidationError} When the schema is invalid or missing required fields
   * 
   * @example
   * ```typescript
   * try {
   *   this.validateSchema(schema);
   *   // Schema is valid, proceed with generation
   * } catch (error) {
   *   if (error instanceof SchemaValidationError) {
   *     console.error('Schema validation failed:', error.message);
   *   }
   * }
   * ```
   */
  private validateSchema(schema: OpenAPISchema): void {
    if (!schema) {
      throw new SchemaValidationError('Schema is required');
    }

    if (!schema.components?.schemas && !schema.paths) {
      throw new SchemaValidationError('Schema must have either components.schemas or paths');
    }

    if (schema.components?.schemas) {
      for (const [name, schemaObj] of Object.entries(schema.components.schemas)) {
        if (!schemaObj || typeof schemaObj !== 'object') {
          throw new SchemaValidationError(`Invalid schema for ${name}`, { schemaName: name });
        }
      }
    }
  }

  private preprocessSchema(schema: OpenAPISchema): OpenAPISchema {
    let processedSchema = { ...schema };

    // Apply custom type mappings
    if (this.enhancedOptions.customTypes) {
      processedSchema = this.applyCustomTypeMappings(
        processedSchema,
        this.enhancedOptions.customTypes
      );
    }

    // Deduplicate types if requested
    if (this.enhancedOptions.optimizations?.deduplicateTypes) {
      processedSchema = this.deduplicateTypes(processedSchema);
    }

    return processedSchema;
  }

  private async generateSingleFile(
    schema: OpenAPISchema
  ): Promise<GenerationResult> {
    const content = await this.generateEnhancedContent(schema);
    const filePath = this.getOutputPath("types.ts");

    await this.writeFile(filePath, content);

    return {
      path: filePath,
      content,
      size: content.length,
      checksum: this.generateChecksum(content),
      generatedAt: new Date(),
      type: "typescript-enhanced",
    };
  }

  private async generateModuleFile(
    schema: OpenAPISchema,
    moduleName: string
  ): Promise<GenerationResult> {
    const content = await this.generateEnhancedContent(schema, moduleName);
    const fileName = this.formatFileName(moduleName) + ".ts";
    const filePath = this.getOutputPath(fileName);

    await this.writeFile(filePath, content);

    return {
      path: filePath,
      content,
      size: content.length,
      checksum: this.generateChecksum(content),
      generatedAt: new Date(),
      type: "typescript-enhanced-module",
    };
  }

  private async generateEnhancedContent(
    schema: OpenAPISchema,
    moduleName?: string
  ): Promise<string> {
    let content = "";

    // Generate file header
    content += this.generateFileHeader(moduleName);

    // Generate imports
    content += this.generateImports(schema);

    // Generate utility types
    content += this.generateUtilityTypes();

    // Generate enums first (they might be referenced by interfaces)
    content += this.generateEnhancedEnums(schema);

    // Generate interfaces
    content += this.generateEnhancedInterfaces(schema);

    // Generate API operation types
    content += this.generateEnhancedApiTypes(schema);

    // Generate type guards if validation is enabled
    if (this.enhancedOptions.validation?.generateRuntimeValidation) {
      content += this.generateTypeGuards(schema);
    }

    return content;
  }

  private generateFileHeader(moduleName?: string): string {
    if (!this.enhancedOptions.generateComments) return "";

    const module = moduleName ? ` for ${moduleName}` : "";
    return `/**
 * Generated TypeScript types${module}
 * 
 * This file was automatically generated from OpenAPI specification
 * Generated at: ${new Date().toISOString()}
 * 
 * @fileoverview Enhanced TypeScript type definitions
 * @version 1.0.0
 * @generator type-sync-enhanced
 * 
 * DO NOT EDIT - This file is auto-generated
 * Any changes will be lost when the file is regenerated
 */

/* eslint-disable */
/* tslint:disable */

`;
  }

  private generateImports(schema: OpenAPISchema): string {
    const imports: string[] = [];

    // Add validation library imports if needed
    if (this.enhancedOptions.validation?.generateRuntimeValidation) {
      const lib = this.enhancedOptions.validation.validationLibrary;
      if (lib === "zod") {
        imports.push("import { z } from 'zod';");
      } else if (lib === "joi") {
        imports.push("import Joi from 'joi';");
      } else if (lib === "yup") {
        imports.push("import * as yup from 'yup';");
      }
    }

    // Add utility type imports
    imports.push("// Utility types");
    imports.push("type Prettify<T> = { [K in keyof T]: T[K] } & {};");
    imports.push(
      "type DeepPartial<T> = { [P in keyof T]?: DeepPartial<T[P]> };"
    );

    if (this.enhancedOptions.arrays?.readonly) {
      imports.push("type ReadonlyArray<T> = readonly T[];");
    }

    return imports.length > 0 ? imports.join("\n") + "\n\n" : "";
  }

  private generateUtilityTypes(): string {
    return `/**
 * Utility Types
 */

/** Makes all properties of T optional recursively */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/** Makes all properties of T required */
export type DeepRequired<T> = {
  [P in keyof T]-?: T[P] extends object ? DeepRequired<T[P]> : T[P];
};

/** Extracts keys from T that are of type U */
export type KeysOfType<T, U> = {
  [K in keyof T]: T[K] extends U ? K : never;
}[keyof T];

/** Creates a type with only specified keys from T */
export type Pick<T, K extends keyof T> = {
  [P in K]: T[P];
};

/** Creates a type without specified keys from T */
export type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;

`;
  }

  private generateEnhancedEnums(schema: OpenAPISchema): string {
    let content = "";

    if (!schema.components?.schemas) return content;

    const enumSchemas = Object.entries(schema.components.schemas).filter(
      ([_, schemaObj]) => this.isEnumSchema(schemaObj as any)
    );

    if (enumSchemas.length === 0) return content;

    content += "/**\n * Enums\n */\n\n";

    for (const [name, schemaObj] of enumSchemas) {
      content += this.generateEnhancedEnum(name, schemaObj as any);
    }

    return content;
  }

  private generateEnhancedEnum(name: string, schema: OpenAPISchemaObject): string {
    const enumName = this.formatEnumName(name);
    const style = this.enhancedOptions.enums?.style || "const";

    let content = "";

    // Add JSDoc if enabled
    if (
      this.enhancedOptions.documentation?.generateJSDoc &&
      schema.description
    ) {
      content += `/**\n * ${schema.description}\n`;

      if (
        this.enhancedOptions.documentation?.includeExamples &&
        schema.example
      ) {
        content += ` * @example ${JSON.stringify(schema.example)}\n`;
      }

      content += " */\n";
    }

    switch (style) {
      case "const":
        content += `export const ${enumName} = {\n`;
        for (const value of schema.enum!) {
          const key = this.formatEnumKey(value);
          content += `  ${key}: '${value}' as const,\n`;
        }
        content += "} as const;\n\n";
        content += `export type ${enumName} = typeof ${enumName}[keyof typeof ${enumName}];\n\n`;
        break;

      case "enum":
        content += `export enum ${enumName} {\n`;
        for (const value of schema.enum!) {
          const key = this.formatEnumKey(value);
          content += `  ${key} = '${value}',\n`;
        }
        content += "}\n\n";
        break;

      case "union":
      default:
        const values = schema.enum!.map((v: unknown) => `'${v}'`).join(" | ");
        content += `export type ${enumName} = ${values};\n\n`;
        break;
    }

    return content;
  }

  private generateEnhancedInterfaces(schema: OpenAPISchema): string {
    let content = "";

    if (!schema.components?.schemas) return content;

    const interfaceSchemas = Object.entries(schema.components.schemas).filter(
      ([_, schemaObj]) => !this.isEnumSchema(schemaObj as any)
    );

    if (interfaceSchemas.length === 0) return content;

    content += "/**\n * Interfaces\n */\n\n";

    // Sort schemas by dependencies
    const sortedSchemas = this.sortSchemasByDependencies(
      Object.fromEntries(interfaceSchemas)
    );

    for (const [name, schemaObj] of sortedSchemas) {
      content += this.generateEnhancedInterface(name, schemaObj as any);
    }

    return content;
  }

  private generateEnhancedInterface(name: string, schema: OpenAPISchemaObject): string {
    const interfaceName = this.formatInterfaceName(name);
    let content = "";

    // Add JSDoc if enabled
    if (this.enhancedOptions.documentation?.generateJSDoc) {
      content += this.generateInterfaceJSDoc(schema);
    }

    // Start interface declaration
    const readonly = this.enhancedOptions.interfaces?.readonly
      ? "readonly "
      : "";
    content += `export interface ${interfaceName} {\n`;

    // Generate properties
    if (schema.properties) {
      for (const [propName, propSchema] of Object.entries(
        schema.properties as any
      )) {
        content += this.generateInterfaceProperty(
          propName,
          propSchema as any,
          schema.required
        );
      }
    }

    // Handle additional properties
    if (schema.additionalProperties === true) {
      content += `  [key: string]: any;\n`;
    } else if (typeof schema.additionalProperties === "object") {
      const additionalType = this.mapEnhancedSchemaType(
        schema.additionalProperties
      );
      content += `  [key: string]: ${additionalType};\n`;
    }

    content += "}\n\n";

    return content;
  }

  private generateInterfaceProperty(
    propName: string,
    propSchema: OpenAPISchemaObject,
    required?: string[]
  ): string {
    let content = "";

    // Add property JSDoc
    if (
      this.enhancedOptions.documentation?.generateJSDoc &&
      propSchema.description
    ) {
      content += `  /**\n   * ${propSchema.description}\n`;

      if (this.enhancedOptions.documentation?.includeConstraints) {
        if (propSchema.minimum !== undefined)
          content += `   * @minimum ${propSchema.minimum}\n`;
        if (propSchema.maximum !== undefined)
          content += `   * @maximum ${propSchema.maximum}\n`;
        if (propSchema.minLength !== undefined)
          content += `   * @minLength ${propSchema.minLength}\n`;
        if (propSchema.maxLength !== undefined)
          content += `   * @maxLength ${propSchema.maxLength}\n`;
        if (propSchema.pattern)
          content += `   * @pattern ${propSchema.pattern}\n`;
      }

      if (
        this.enhancedOptions.documentation?.includeExamples &&
        propSchema.example !== undefined
      ) {
        content += `   * @example ${JSON.stringify(propSchema.example)}\n`;
      }

      content += "   */\n";
    }

    // Determine if property is optional
    const isRequired = required?.includes(propName) ?? false;
    const optionalMarker = this.getOptionalMarker(isRequired);

    // Generate property type
    const type = this.mapEnhancedSchemaType(propSchema);
    const readonly = this.enhancedOptions.interfaces?.readonly
      ? "readonly "
      : "";

    content += `  ${readonly}${propName}${optionalMarker}: ${type};\n`;

    return content;
  }

  private generateEnhancedApiTypes(schema: OpenAPISchema): string {
    let content = "";

    if (!schema.paths) return content;

    content += "/**\n * API Operation Types\n */\n\n";

    for (const [path, methods] of Object.entries(schema.paths)) {
      for (const [method, operation] of Object.entries(methods as any)) {
        const operationDef = operation as any;
        if (!operationDef.operationId) continue;

        content += this.generateEnhancedOperationTypes(operationDef);
      }
    }

    return content;
  }

  private generateEnhancedOperationTypes(operation: OpenAPIOperation): string {
    const operationId = operation.operationId;
    if (!operationId) return "";

    let content = "";

    // Generate request type
    content += this.generateEnhancedRequestType(operationId, operation);

    // Generate response type
    content += this.generateEnhancedResponseType(operationId, operation);

    // Generate operation type (combines request and response)
    content += this.generateOperationType(operationId, operation);

    return content;
  }

  private generateEnhancedRequestType(
    operationId: string,
    operation: OpenAPIOperation
  ): string {
    const typeName = `${this.capitalize(operationId)}Request`;
    let content = "";

    if (this.enhancedOptions.documentation?.generateJSDoc) {
      content += `/**\n * Request parameters for ${operationId}\n`;
      if (operation.summary) content += ` * ${operation.summary}\n`;
      content += " */\n";
    }

    content += `export interface ${typeName} {\n`;

    // Path parameters
    if (operation.parameters) {
      const pathParams = operation.parameters.filter(
        (p: OpenAPIParameter) => p.in === "path"
      );
      if (pathParams.length > 0) {
        content += "  /** Path parameters */\n";
        content += "  path: {\n";
        for (const param of pathParams) {
          const type = this.mapEnhancedSchemaType(
            param.schema || { type: "string" }
          );
          content += `    ${param.name}: ${type};\n`;
        }
        content += "  };\n";
      }

      // Query parameters
      const queryParams = operation.parameters.filter(
        (p: OpenAPIParameter) => p.in === "query"
      );
      if (queryParams.length > 0) {
        content += "  /** Query parameters */\n";
        content += "  query?: {\n";
        for (const param of queryParams) {
          const type = this.mapEnhancedSchemaType(
            param.schema || { type: "string" }
          );
          const optional = param.required ? "" : "?";
          content += `    ${param.name}${optional}: ${type};\n`;
        }
        content += "  };\n";
      }

      // Header parameters
      const headerParams = operation.parameters.filter(
        (p: OpenAPIParameter) => p.in === "header"
      );
      if (headerParams.length > 0) {
        content += "  /** Header parameters */\n";
        content += "  headers?: {\n";
        for (const param of headerParams) {
          const type = this.mapEnhancedSchemaType(
            param.schema || { type: "string" }
          );
          content += `    '${param.name}'?: ${type};\n`;
        }
        content += "  };\n";
      }
    }

    // Request body
    if (operation.requestBody?.content) {
      const jsonContent = operation.requestBody.content["application/json"];
      if (jsonContent?.schema) {
        const type = this.mapEnhancedSchemaType(jsonContent.schema);
        const required = operation.requestBody.required ? "" : "?";
        content += `  /** Request body */\n`;
        content += `  body${required}: ${type};\n`;
      }
    }

    content += "}\n\n";
    return content;
  }

  private generateEnhancedResponseType(
    operationId: string,
    operation: OpenAPIOperation
  ): string {
    const typeName = `${this.capitalize(operationId)}Response`;
    let content = "";

    if (this.enhancedOptions.documentation?.generateJSDoc) {
      content += `/**\n * Response type for ${operationId}\n */\n`;
    }

    // Find success response
    const successResponse =
      operation.responses?.["200"] ||
      operation.responses?.["201"] ||
      operation.responses?.["204"];

    if (successResponse?.content?.["application/json"]?.schema) {
      const type = this.mapEnhancedSchemaType(
        successResponse.content["application/json"].schema
      );
      content += `export type ${typeName} = ${type};\n\n`;
    } else {
      content += `export type ${typeName} = void;\n\n`;
    }

    return content;
  }

  private generateOperationType(operationId: string, operation: OpenAPIOperation): string {
    const typeName = `${this.capitalize(operationId)}Operation`;
    const requestType = `${this.capitalize(operationId)}Request`;
    const responseType = `${this.capitalize(operationId)}Response`;

    return `export interface ${typeName} {
  request: ${requestType};
  response: ${responseType};
  method: '${operation.method?.toUpperCase() || "GET"}';
  path: string;
}

`;
  }

  private mapEnhancedSchemaType(schema: OpenAPISchemaObject): string {
    // Handle custom type mappings first
    if (schema.format && this.enhancedOptions.customTypes?.[schema.format]) {
      return this.enhancedOptions.customTypes[schema.format];
    }

    // Handle custom type mapping functions
    if (this.enhancedOptions.typeMapping) {
      for (const [pattern, mapper] of Object.entries(
        this.enhancedOptions.typeMapping
      )) {
        if (schema.type === pattern || schema.format === pattern) {
          return mapper(schema);
        }
      }
    }

    // Use parent class mapping with enhancements
    const baseType = this.mapSchemaTypeBase(schema);

    // Apply array enhancements
    if (schema.type === "array" && this.enhancedOptions.arrays?.readonly && schema.items) {
      const itemType = this.mapEnhancedSchemaType(schema.items);
      return `ReadonlyArray<${itemType}>`;
    }

    return baseType;
  }

  private mapSchemaTypeBase(schema: OpenAPISchemaObject): string {
    // This would be the same as the parent class mapSchemaType method
    // Simplified version for this example
    if (schema.$ref) {
      return this.formatInterfaceName(schema.$ref.split("/").pop()!);
    }

    switch (schema.type) {
      case "string":
        return "string";
      case "number":
      case "integer":
        return "number";
      case "boolean":
        return "boolean";
      case "array":
        return schema.items ? `${this.mapEnhancedSchemaType(schema.items)}[]` : "any[]";
      case "object":
        return "Record<string, any>";
      default:
        return "any";
    }
  }

  // Helper methods
  private formatInterfaceName(name: string): string {
    const prefix = this.enhancedOptions.interfaces?.prefix || "";
    const suffix = this.enhancedOptions.interfaces?.suffix || "";
    return prefix + this.capitalize(name) + suffix;
  }

  private formatEnumName(name: string): string {
    const prefix = this.enhancedOptions.enums?.prefix || "";
    const suffix = this.enhancedOptions.enums?.suffix || "";
    return prefix + this.capitalize(name) + suffix;
  }

  private formatEnumKey(value: string): string {
    const casing = this.enhancedOptions.enums?.casing || "PascalCase";

    switch (casing) {
      case "UPPER_CASE":
        return value.toUpperCase().replace(/[^A-Z0-9]/g, "_");
      case "camelCase":
        return this.toCamelCase(value);
      case "PascalCase":
      default:
        return this.capitalize(this.toCamelCase(value));
    }
  }

  private getOptionalMarker(isRequired: boolean): string {
    if (isRequired) return "";

    const style =
      this.enhancedOptions.optionalProperties?.style || "question-mark";
    return style === "question-mark" ? "?" : "";
  }

  private isEnumSchema(schema: OpenAPISchemaObject): boolean {
    return !!(schema.enum && Array.isArray(schema.enum));
  }

  private toCamelCase(str: string): string {
    return str.replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) => chr.toUpperCase());
  }

  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Generate MD5 checksum for content
   */
  private generateChecksum(content: string): string {
    return crypto
      .createHash("md5")
      .update(content)
      .digest("hex")
      .slice(0, 8);
  }

  /**
   * Get full output path for a file
   */
  private getOutputPath(fileName: string): string {
    return path.join(this.enhancedOptions.outputDir, fileName);
  }

  /**
   * Write content to file with proper error handling
   */
  private async writeFile(filePath: string, content: string): Promise<void> {
    try {
      await fs.ensureDir(path.dirname(filePath));
      await fs.writeFile(filePath, content, 'utf8');
    } catch (error) {
      throw new FileSystemError(
        `Failed to write file ${filePath}`,
        { filePath, error: handleError(error) }
      );
    }
  }

  /**
   * Extract schema components that belong to a specific tag
   */
  private extractSchemaByTag(
    schema: OpenAPISchema,
    tagName: string
  ): OpenAPISchema {
    const filteredSchema: OpenAPISchema = {
      ...schema,
      paths: {},
      components: {
        ...schema.components,
        schemas: {},
      },
    };

    // Filter paths by tag
    if (schema.paths) {
      for (const [pathKey, pathItem] of Object.entries(schema.paths)) {
        if (pathItem) {
          const filteredPathItem: any = {};

          for (const [method, operation] of Object.entries(pathItem)) {
            if (operation && typeof operation === 'object') {
              const operationObj = operation as any;
              if (operationObj.tags && operationObj.tags.includes(tagName)) {
                filteredPathItem[method] = operation;
              }
            }
          }

          if (Object.keys(filteredPathItem).length > 0) {
            filteredSchema.paths![pathKey] = filteredPathItem;
          }
        }
      }
    }

    // Filter schemas by tag (if schemas have tag metadata)
    if (schema.components?.schemas) {
      for (const [schemaName, schemaObj] of Object.entries(schema.components.schemas)) {
        const schemaWithTag = schemaObj as any;
        if (!schemaWithTag.tags || schemaWithTag.tags.includes(tagName)) {
          filteredSchema.components!.schemas![schemaName] = schemaObj;
        }
      }
    }

    return filteredSchema;
  }

  /**
   * Group API paths by module based on path patterns
   */
  private groupPathsByModule(
    paths: OpenAPIPaths
  ): ModuleGrouping {
    const modules: ModuleGrouping = {};

    for (const [pathKey, pathItem] of Object.entries(paths)) {
      if (!pathItem) continue;

      // Extract module name from path
      const moduleName = this.extractModuleFromPath(pathKey);

      if (!modules[moduleName]) {
        modules[moduleName] = {};
      }

      modules[moduleName][pathKey] = pathItem;
    }

    return modules;
  }

  /**
   * Extract module name from API path
   */
  private extractModuleFromPath(path: string): string {
    // Remove leading slash and split by path segments
    const segments = path.replace(/^\//, '').split('/');

    if (segments.length === 0) return 'root';

    // Use the first segment as module name, or 'api' if it's a common prefix
    const firstSegment = segments[0];

    // Common API prefixes that should be grouped differently
    const commonPrefixes = ['api', 'v1', 'v2', 'v3', 'v4', 'v5'];

    if (commonPrefixes.includes(firstSegment.toLowerCase())) {
      return segments.length > 1 ? segments[1] : 'api';
    }

    return firstSegment;
  }

  /**
   * Generate index file that exports all generated modules
   */
  private async generateIndexFile(
    results: GenerationResult[]
  ): Promise<GenerationResult> {
    let content = this.generateFileHeader();

    // Add imports for all generated files
    for (const result of results) {
      if (result.type === 'typescript-enhanced-module') {
        const moduleName = path.basename(result.path, '.ts');
        const importPath = `./${moduleName}`;
        content += `export * from '${importPath}';\n`;
      }
    }

    // Add main types export
    content += `\nexport * from './types';\n`;

    // Add validation schemas if they exist
    const validationResult = results.find(r => r.type === 'validation');
    if (validationResult) {
      content += `export * from './validation';\n`;
    }

    const indexPath = this.getOutputPath('index.ts');
    await this.writeFile(indexPath, content);

    return {
      path: indexPath,
      content,
      size: content.length,
      checksum: this.generateChecksum(content),
      generatedAt: new Date(),
      type: 'index',
    };
  }

  /**
   * Generate runtime validation schemas using the configured validation library
   * 
   * Creates runtime validation schemas for all schema components and API operations
   * using the specified validation library (Zod, Joi, or Yup). Generates type-safe
   * validation functions that can be used at runtime to validate data against
   * the OpenAPI schema.
   * 
   * @param schema - The OpenAPI schema to generate validation schemas from
   * @returns Promise resolving to a generation result containing the validation file
   * 
   * @throws {GenerationError} When validation schema generation fails
   * @throws {FileSystemError} When writing the validation file fails
   * 
   * @example
   * ```typescript
   * const generator = new EnhancedTypeScriptGenerator({
   *   validation: { generateRuntimeValidation: true, validationLibrary: 'zod' }
   * });
   * 
   * const result = await generator.generateValidationSchemas(schema);
   * // Generates validation.ts with Zod schemas for all types
   * ```
   */
  private async generateValidationSchemas(
    schema: OpenAPISchema
  ): Promise<GenerationResult> {
    try {
      const validationLibrary = this.enhancedOptions.validation?.validationLibrary || 'zod';
      let content = this.generateFileHeader('Validation Schemas');

      // Add validation library import
      content += this.generateValidationImports(validationLibrary);

      // Generate schemas for all components
      if (schema.components?.schemas) {
        const sortedSchemas = this.sortSchemasByDependencies(schema.components.schemas);

        for (const [name, schemaObj] of sortedSchemas) {
          try {
            content += this.generateValidationSchema(name, schemaObj as OpenAPISchemaObject, validationLibrary);
            content += '\n';
          } catch (error) {
            throw new GenerationError(
              `Failed to generate validation schema for ${name}`,
              { schemaName: name, error: handleError(error) }
            );
          }
        }
      }

      // Generate API operation validation schemas
      if (schema.paths) {
        try {
          content += this.generateApiValidationSchemas(schema.paths, validationLibrary);
        } catch (error) {
          throw new GenerationError(
            'Failed to generate API validation schemas',
            { error: handleError(error) }
          );
        }
      }

      const filePath = this.getOutputPath('validation.ts');
      await this.writeFile(filePath, content);

      return {
        path: filePath,
        content,
        size: content.length,
        checksum: this.generateChecksum(content),
        generatedAt: new Date(),
        type: 'validation',
      };
    } catch (error) {
      throw handleError(error, { schema: schema.info?.title });
    }
  }

  /**
   * Generate validation library imports
   */
  private generateValidationImports(library: string): string {
    switch (library) {
      case 'zod':
        return "import { z } from 'zod';\n\n";
      case 'joi':
        return "import Joi from 'joi';\n\n";
      case 'yup':
        return "import * as yup from 'yup';\n\n";
      default:
        return "import { z } from 'zod';\n\n";
    }
  }

  /**
   * Generate validation schema for a specific schema object
   */
  private generateValidationSchema(name: string, schema: OpenAPISchemaObject, library: ValidationLibraryType): string {
    const schemaName = `${name}Schema`;

    if (this.enhancedOptions.documentation?.generateJSDoc && schema.description) {
      return `/**\n * ${schema.description}\n */\nexport const ${schemaName} = ${this.schemaToValidation(schema, library)};\n`;
    }

    return `export const ${schemaName} = ${this.schemaToValidation(schema, library)};\n`;
  }

  /**
   * Convert OpenAPI schema to validation library schema
   */
  private schemaToValidation(schema: OpenAPISchemaObject, library: ValidationLibraryType): string {
    switch (library) {
      case 'zod':
        return this.schemaToZod(schema);
      case 'joi':
        return this.schemaToJoi(schema);
      case 'yup':
        return this.schemaToYup(schema);
      default:
        return this.schemaToZod(schema);
    }
  }

  /**
   * Convert OpenAPI schema to Zod schema
   */
  private schemaToZod(schema: OpenAPISchemaObject): string {
    if (schema.$ref) {
      const refName = schema.$ref.split('/').pop();
      return `z.lazy(() => ${refName}Schema)`;
    }

    if (schema.enum) {
      const values = schema.enum.map((v: unknown) => `"${v}"`).join(', ');
      return `z.enum([${values}])`;
    }

    switch (schema.type) {
      case 'string':
        let stringSchema = 'z.string()';
        if (schema.minLength) stringSchema += `.min(${schema.minLength})`;
        if (schema.maxLength) stringSchema += `.max(${schema.maxLength})`;
        if (schema.pattern) stringSchema += `.regex(/${schema.pattern}/)`;
        if (schema.format === 'email') stringSchema += '.email()';
        if (schema.format === 'uri') stringSchema += '.url()';
        if (schema.format === 'date-time') stringSchema += '.datetime()';
        return stringSchema;

      case 'number':
      case 'integer':
        let numberSchema = schema.type === 'integer' ? 'z.number().int()' : 'z.number()';
        if (schema.minimum !== undefined) numberSchema += `.min(${schema.minimum})`;
        if (schema.maximum !== undefined) numberSchema += `.max(${schema.maximum})`;
        return numberSchema;

      case 'boolean':
        return 'z.boolean()';

      case 'array':
        const itemSchema = schema.items ? this.schemaToZod(schema.items) : 'z.any()';
        let arraySchema = `z.array(${itemSchema})`;
        if (schema.minItems) arraySchema += `.min(${schema.minItems})`;
        if (schema.maxItems) arraySchema += `.max(${schema.maxItems})`;
        return arraySchema;

      case 'object':
        if (schema.properties) {
          const properties: string[] = [];
          for (const [propName, propSchema] of Object.entries(schema.properties)) {
            const isRequired = schema.required?.includes(propName) ?? false;
            const propSchemaStr = this.schemaToZod(propSchema as any);
            properties.push(`  ${propName}: ${propSchemaStr}${isRequired ? '' : '.optional()'}`);
          }
          return `z.object({\n${properties.join(',\n')}\n})`;
        }
        return 'z.record(z.any())';

      default:
        return 'z.any()';
    }
  }

  /**
   * Convert OpenAPI schema to Joi schema (simplified)
   */
  private schemaToJoi(schema: OpenAPISchemaObject): string {
    // Simplified Joi implementation
    switch (schema.type) {
      case 'string':
        return 'Joi.string()';
      case 'number':
      case 'integer':
        return 'Joi.number()';
      case 'boolean':
        return 'Joi.boolean()';
      case 'array':
        return `Joi.array().items(${schema.items ? this.schemaToJoi(schema.items) : 'Joi.any()'})`;
      case 'object':
        return 'Joi.object()';
      default:
        return 'Joi.any()';
    }
  }

  /**
   * Convert OpenAPI schema to Yup schema (simplified)
   */
  private schemaToYup(schema: OpenAPISchemaObject): string {
    // Simplified Yup implementation
    switch (schema.type) {
      case 'string':
        return 'yup.string()';
      case 'number':
      case 'integer':
        return 'yup.number()';
      case 'boolean':
        return 'yup.boolean()';
      case 'array':
        return `yup.array().of(${schema.items ? this.schemaToYup(schema.items) : 'yup.mixed()'})`;
      case 'object':
        return 'yup.object()';
      default:
        return 'yup.mixed()';
    }
  }

  /**
   * Generate API operation validation schemas
   */
  private generateApiValidationSchemas(paths: OpenAPIPaths, library: ValidationLibraryType): string {
    let content = '\n// API Operation Validation Schemas\n';

    for (const [path, methods] of Object.entries(paths)) {
      for (const [method, operation] of Object.entries(methods as OpenAPIPathItem)) {
        const operationDef = operation as OpenAPIOperation;
        if (!operationDef.operationId) continue;

        const operationId = operationDef.operationId;

        // Generate request validation
        if (operationDef.requestBody?.content?.['application/json']?.schema) {
          const requestSchema = this.schemaToValidation(
            operationDef.requestBody.content['application/json'].schema,
            library
          );
          content += `export const ${operationId}RequestSchema = ${requestSchema};\n`;
        }

        // Generate response validation
        const successResponse = operationDef.responses?.['200'] || operationDef.responses?.['201'];
        if (successResponse?.content?.['application/json']?.schema) {
          const responseSchema = this.schemaToValidation(
            successResponse.content['application/json'].schema,
            library
          );
          content += `export const ${operationId}ResponseSchema = ${responseSchema};\n`;
        }
      }
    }

    return content;
  }

  /**
   * Apply custom type mappings to the schema
   */
  private applyCustomTypeMappings(
    schema: OpenAPISchema,
    mappings: Record<string, string>
  ): OpenAPISchema {
    const processedSchema = JSON.parse(JSON.stringify(schema)); // Deep clone

    // Apply mappings to schema components
    if (processedSchema.components?.schemas) {
      for (const [name, schemaObj] of Object.entries(processedSchema.components.schemas)) {
        processedSchema.components.schemas[name] = this.applyMappingsToSchema(
          schemaObj as any,
          mappings
        );
      }
    }

    // Apply mappings to API paths
    if (processedSchema.paths) {
      for (const [path, methods] of Object.entries(processedSchema.paths)) {
        if (methods) {
          for (const [method, operation] of Object.entries(methods as any)) {
            if (operation && typeof operation === 'object') {
              const operationObj = operation as any;

              // Apply to request body
              if (operationObj.requestBody?.content?.['application/json']?.schema) {
                operationObj.requestBody.content['application/json'].schema =
                  this.applyMappingsToSchema(
                    operationObj.requestBody.content['application/json'].schema,
                    mappings
                  );
              }

              // Apply to responses
              if (operationObj.responses) {
                for (const [statusCode, response] of Object.entries(operationObj.responses)) {
                  if (response && typeof response === 'object') {
                    const responseObj = response as any;
                    if (responseObj.content?.['application/json']?.schema) {
                      responseObj.content['application/json'].schema =
                        this.applyMappingsToSchema(
                          responseObj.content['application/json'].schema,
                          mappings
                        );
                    }
                  }
                }
              }
            }
          }
        }
      }
    }

    return processedSchema;
  }

  /**
   * Apply mappings to a specific schema object
   */
  private applyMappingsToSchema(schema: OpenAPISchemaObject, mappings: Record<string, string>): OpenAPISchemaObject {
    if (!schema || typeof schema !== 'object') return schema;

    const processedSchema = { ...schema };

    // Apply format mappings
    if (processedSchema.format && mappings[processedSchema.format]) {
      processedSchema['x-mapped-type'] = mappings[processedSchema.format];
    }

    // Apply type mappings
    if (processedSchema.type && mappings[processedSchema.type]) {
      processedSchema['x-mapped-type'] = mappings[processedSchema.type];
    }

    // Recursively apply to nested schemas
    if (processedSchema.properties) {
      for (const [propName, propSchema] of Object.entries(processedSchema.properties)) {
        processedSchema.properties[propName] = this.applyMappingsToSchema(
          propSchema as any,
          mappings
        );
      }
    }

    if (processedSchema.items) {
      processedSchema.items = this.applyMappingsToSchema(processedSchema.items, mappings);
    }

    if (processedSchema.allOf) {
      processedSchema.allOf = processedSchema.allOf.map((s: any) =>
        this.applyMappingsToSchema(s, mappings)
      );
    }

    if (processedSchema.oneOf) {
      processedSchema.oneOf = processedSchema.oneOf.map((s: any) =>
        this.applyMappingsToSchema(s, mappings)
      );
    }

    if (processedSchema.anyOf) {
      processedSchema.anyOf = processedSchema.anyOf.map((s: any) =>
        this.applyMappingsToSchema(s, mappings)
      );
    }

    return processedSchema;
  }

  /**
   * Deduplicate similar types in the schema
   * 
   * Removes duplicate schema definitions that have identical structure and properties.
   * This helps reduce the size of generated code and prevents redundant type definitions.
   * Updates all references to point to the canonical type definition.
   * 
   * @param schema - The OpenAPI schema to deduplicate
   * @returns A new schema with duplicate types removed and references updated
   * 
   * @example
   * ```typescript
   * const originalSchema = {
   *   components: {
   *     schemas: {
   *       User: { type: 'object', properties: { name: { type: 'string' } } },
   *       UserProfile: { type: 'object', properties: { name: { type: 'string' } } }
   *     }
   *   }
   * };
   * 
   * const deduplicated = this.deduplicateTypes(originalSchema);
   * // UserProfile will be removed and all references updated to point to User
   * ```
   */
  private deduplicateTypes(schema: OpenAPISchema): OpenAPISchema {
    const processedSchema = JSON.parse(JSON.stringify(schema)); // Deep clone

    if (!processedSchema.components?.schemas) return processedSchema;

    const schemas = processedSchema.components.schemas;
    const typeMap = new Map<string, string>();
    const duplicates: string[] = [];

    // Find duplicate types
    for (const [name, schemaObj] of Object.entries(schemas)) {
      const schemaKey = this.generateSchemaKey(schemaObj as any);

      if (typeMap.has(schemaKey)) {
        duplicates.push(name);
        typeMap.set(schemaKey, typeMap.get(schemaKey)!);
      } else {
        typeMap.set(schemaKey, name);
      }
    }

    // Remove duplicates and update references
    for (const duplicateName of duplicates) {
      const originalName = typeMap.get(this.generateSchemaKey(schemas[duplicateName] as any))!;
      delete schemas[duplicateName];

      // Update all references to the duplicate
      this.updateSchemaReferences(processedSchema, duplicateName, originalName);
    }

    return processedSchema;
  }

  /**
   * Generate a key for schema comparison
   */
  private generateSchemaKey(schema: OpenAPISchemaObject): string {
    // Create a normalized representation of the schema for comparison
    const normalized = {
      type: schema.type,
      properties: schema.properties ? this.normalizeProperties(schema.properties) : undefined,
      required: schema.required,
      enum: schema.enum,
      items: schema.items ? this.generateSchemaKey(schema.items) : undefined,
      format: schema.format,
    };

    return JSON.stringify(normalized, Object.keys(normalized).sort());
  }

  /**
   * Normalize properties for comparison
   */
  private normalizeProperties(properties: Record<string, OpenAPISchemaObject>): Record<string, string> {
    const normalized: Record<string, string> = {};

    for (const [propName, propSchema] of Object.entries(properties)) {
      normalized[propName] = this.generateSchemaKey(propSchema);
    }

    return normalized;
  }

  /**
   * Update schema references throughout the schema
   */
  private updateSchemaReferences(schema: unknown, oldName: string, newName: string): void {
    if (!schema || typeof schema !== 'object') return;

    if (Array.isArray(schema)) {
      schema.forEach(item => this.updateSchemaReferences(item, oldName, newName));
      return;
    }

    for (const [key, value] of Object.entries(schema)) {
      if (key === '$ref' && typeof value === 'string' && value.includes(oldName)) {
        (schema as any)[key] = value.replace(oldName, newName);
      } else if (typeof value === 'object') {
        this.updateSchemaReferences(value, oldName, newName);
      }
    }
  }

  private generateInterfaceJSDoc(schema: OpenAPISchemaObject): string {
    let jsdoc = "/**\n";

    if (schema.description) {
      jsdoc += ` * ${schema.description}\n`;
    }

    if (this.enhancedOptions.documentation?.includeExamples && schema.example) {
      jsdoc += ` * @example\n`;
      jsdoc += ` * ${JSON.stringify(schema.example, null, 2)
        .split("\n")
        .map((line) => ` * ${line}`)
        .join("\n")}\n`;
    }

    jsdoc += " */\n";
    return jsdoc;
  }

  /**
   * Generate runtime type guards for schema validation
   * 
   * Creates TypeScript type guard functions that can be used at runtime to check
   * if a value matches a specific schema type. These guards provide type safety
   * and can be used with TypeScript's type narrowing features.
   * 
   * @param schema - The OpenAPI schema to generate type guards from
   * @returns String containing the generated type guard functions
   * 
   * @example
   * ```typescript
   * const typeGuards = this.generateTypeGuards(schema);
   * // Generates functions like:
   * // export function isUser(value: unknown): value is User { ... }
   * // export function isProduct(value: unknown): value is Product { ... }
   * ```
   */
  private generateTypeGuards(schema: OpenAPISchema): string {
    let content = '\n// Type Guards\n';

    if (schema.components?.schemas) {
      for (const [name, schemaObj] of Object.entries(schema.components.schemas)) {
        content += this.generateTypeGuard(name, schemaObj as any);
        content += '\n';
      }
    }

    return content;
  }

  /**
   * Generate a type guard for a specific schema
   */
  private generateTypeGuard(name: string, schema: OpenAPISchemaObject): string {
    const guardName = `is${this.capitalize(name)}`;
    const typeName = this.formatInterfaceName(name);

    let content = `/**\n * Type guard for ${typeName}\n */\n`;
    content += `export function ${guardName}(value: unknown): value is ${typeName} {\n`;
    content += `  return typeof value === 'object' && value !== null`;

    if (schema.properties) {
      for (const [propName, propSchema] of Object.entries(schema.properties)) {
        const isRequired = schema.required?.includes(propName) ?? false;
        const propType = this.getTypeGuardForProperty(propSchema as any);

        if (isRequired) {
          content += `\n    && '${propName}' in value`;
          content += `\n    && ${propType}((value as any).${propName})`;
        } else {
          content += `\n    && (!('${propName}' in value) || ${propType}((value as any).${propName}))`;
        }
      }
    }

    content += ';\n}\n';

    return content;
  }

  /**
   * Get type guard function for a property schema
   */
  private getTypeGuardForProperty(schema: OpenAPISchemaObject): string {
    if (schema.$ref) {
      const refName = schema.$ref.split('/').pop();
      return `is${this.capitalize(refName!)}`;
    }

    if (schema.enum) {
      const values = schema.enum.map((v: unknown) => `"${v}"`).join(', ');
      return `(val: unknown): val is ${values} => [${values}].includes(val as any)`;
    }

    switch (schema.type) {
      case 'string':
        return '(val: unknown): val is string => typeof val === "string"';
      case 'number':
      case 'integer':
        return '(val: unknown): val is number => typeof val === "number"';
      case 'boolean':
        return '(val: unknown): val is boolean => typeof val === "boolean"';
      case 'array':
        const itemGuard = schema.items ? this.getTypeGuardForProperty(schema.items) : '(val: unknown): val is any => true';
        return `(val: unknown): val is any[] => Array.isArray(val) && val.every(${itemGuard})`;
      case 'object':
        return '(val: unknown): val is object => typeof val === "object" && val !== null';
      default:
        return '(val: unknown): val is any => true';
    }
  }

  private formatFileName(name: string): string {
    const naming = this.enhancedOptions.fileNaming || "camelCase";

    switch (naming) {
      case "kebab-case":
        return name.toLowerCase().replace(/[^a-z0-9]/g, "-");
      case "snake_case":
        return name.toLowerCase().replace(/[^a-z0-9]/g, "_");
      case "camelCase":
      default:
        return this.toCamelCase(name);
    }
  }

  /**
   * Sort schemas by their dependencies to avoid forward references
   */
  private sortSchemasByDependencies(
    schemas: Record<string, OpenAPISchemaObject>
  ): Array<[string, OpenAPISchemaObject]> {
    const sorted: Array<[string, OpenAPISchemaObject]> = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (name: string, schema: OpenAPISchemaObject) => {
      if (visited.has(name)) return;
      if (visiting.has(name)) return; // Circular dependency, skip

      visiting.add(name);

      // Find dependencies
      const deps = this.findSchemaDependencies(schema);
      for (const dep of deps) {
        if (schemas[dep]) {
          visit(dep, schemas[dep]);
        }
      }

      visiting.delete(name);
      visited.add(name);
      sorted.push([name, schema]);
    };

    for (const [name, schema] of Object.entries(schemas)) {
      visit(name, schema);
    }

    return sorted;
  }

  /**
   * Find dependencies in a schema object
   */
  private findSchemaDependencies(schema: OpenAPISchemaObject): string[] {
    const deps: string[] = [];

    const traverse = (obj: unknown) => {
      if (typeof obj !== 'object' || obj === null) return;

      if ((obj as any).$ref && typeof (obj as any).$ref === 'string') {
        const refName = (obj as any).$ref.split('/').pop();
        if (refName) deps.push(refName);
      }

      if (Array.isArray(obj)) {
        obj.forEach(traverse);
      } else {
        Object.values(obj).forEach(traverse);
      }
    };

    traverse(schema);
    return Array.from(new Set(deps));
  }
}
