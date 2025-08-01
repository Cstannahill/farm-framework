import type { OpenAPISchema } from "@farm-framework/types";
import {
  TypeScriptGenerator,
  type TypeScriptGenerationOptions,
  type GenerationResult,
} from "./typescript";

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
  typeMapping?: Record<string, (schema: any) => string>;

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
 * Enhanced TypeScript generator with advanced features and optimizations
 */
export class EnhancedTypeScriptGenerator {
  private enhancedOptions: EnhancedTypeScriptOptions;
  private baseGenerator: TypeScriptGenerator;

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
   * Generate TypeScript types - compatible with base class interface
   */
  async generate(schema: OpenAPISchema): Promise<GenerationResult[]> {
    return this.generateEnhanced(schema);
  }

  /**
   * Generate enhanced TypeScript types with advanced features
   */
  async generateEnhanced(schema: OpenAPISchema): Promise<GenerationResult[]> {
    const results: GenerationResult[] = [];

    // Preprocess schema
    const processedSchema = this.preprocessSchema(schema);

    if (this.enhancedOptions.modules?.splitByTag && schema.tags) {
      // Generate separate files for each tag
      for (const tag of schema.tags) {
        const tagSchema = this.extractSchemaByTag(processedSchema, tag.name);
        const result = await this.generateModuleFile(tagSchema, tag.name);
        results.push(result);
      }
    } else if (this.enhancedOptions.modules?.splitByPath) {
      // Generate separate files for each path group
      const pathGroups = this.groupPathsByModule(processedSchema.paths || {});
      for (const [moduleName, paths] of Object.entries(pathGroups)) {
        const moduleSchema = { ...processedSchema, paths };
        const result = await this.generateModuleFile(moduleSchema, moduleName);
        results.push(result);
      }
    } else {
      // Generate single file
      const result = await this.generateSingleFile(processedSchema);
      results.push(result);
    }

    // Generate index file if requested
    if (this.enhancedOptions.modules?.indexFile && results.length > 1) {
      const indexResult = await this.generateIndexFile(results);
      results.push(indexResult);
    }

    // Generate runtime validation if requested
    if (this.enhancedOptions.validation?.generateRuntimeValidation) {
      const validationResult =
        await this.generateValidationSchemas(processedSchema);
      results.push(validationResult);
    }

    return results;
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

  private generateEnhancedEnum(name: string, schema: any): string {
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
        for (const value of schema.enum) {
          const key = this.formatEnumKey(value);
          content += `  ${key}: '${value}' as const,\n`;
        }
        content += "} as const;\n\n";
        content += `export type ${enumName} = typeof ${enumName}[keyof typeof ${enumName}];\n\n`;
        break;

      case "enum":
        content += `export enum ${enumName} {\n`;
        for (const value of schema.enum) {
          const key = this.formatEnumKey(value);
          content += `  ${key} = '${value}',\n`;
        }
        content += "}\n\n";
        break;

      case "union":
      default:
        const values = schema.enum.map((v: any) => `'${v}'`).join(" | ");
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

  private generateEnhancedInterface(name: string, schema: any): string {
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
    propSchema: any,
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

  private generateEnhancedOperationTypes(operation: any): string {
    const operationId = operation.operationId;
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
    operation: any
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
        (p: any) => p.in === "path"
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
        (p: any) => p.in === "query"
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
        (p: any) => p.in === "header"
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
    operation: any
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

  private generateOperationType(operationId: string, operation: any): string {
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

  private mapEnhancedSchemaType(schema: any): string {
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
    if (schema.type === "array" && this.enhancedOptions.arrays?.readonly) {
      const itemType = this.mapEnhancedSchemaType(schema.items);
      return `ReadonlyArray<${itemType}>`;
    }

    return baseType;
  }

  private mapSchemaTypeBase(schema: any): string {
    // This would be the same as the parent class mapSchemaType method
    // Simplified version for this example
    if (schema.$ref) {
      return this.formatInterfaceName(schema.$ref.split("/").pop());
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
        return `Array<${this.mapEnhancedSchemaType(schema.items)}>`;
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

  private isEnumSchema(schema: any): boolean {
    return schema.enum && Array.isArray(schema.enum);
  }

  private toCamelCase(str: string): string {
    return str.replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) => chr.toUpperCase());
  }

  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  // ... Additional helper methods would be implemented here
  private generateChecksum(content: string): string {
    // Implementation from parent class
    return "";
  }

  private getOutputPath(fileName: string): string {
    // Implementation would return full path
    return fileName;
  }

  private async writeFile(filePath: string, content: string): Promise<void> {
    // Implementation would write file
  }

  private extractSchemaByTag(
    schema: OpenAPISchema,
    tagName: string
  ): OpenAPISchema {
    // Implementation would filter schema by tag
    return schema;
  }

  private groupPathsByModule(
    paths: Record<string, any>
  ): Record<string, Record<string, any>> {
    // Implementation would group paths into modules
    return { default: paths };
  }

  private async generateIndexFile(
    results: GenerationResult[]
  ): Promise<GenerationResult> {
    // Implementation would generate index file
    return results[0];
  }

  private async generateValidationSchemas(
    schema: OpenAPISchema
  ): Promise<GenerationResult> {
    // Implementation would generate validation schemas
    return {
      path: "validation.ts",
      generatedAt: new Date(),
      type: "validation",
    };
  }

  private applyCustomTypeMappings(
    schema: OpenAPISchema,
    mappings: Record<string, string>
  ): OpenAPISchema {
    // Implementation would apply custom type mappings
    return schema;
  }

  private deduplicateTypes(schema: OpenAPISchema): OpenAPISchema {
    // Implementation would deduplicate similar types
    return schema;
  }

  private generateInterfaceJSDoc(schema: any): string {
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

  private generateTypeGuards(schema: OpenAPISchema): string {
    // Implementation would generate runtime type guards
    return "// Type guards would be generated here\n\n";
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

  private sortSchemasByDependencies(
    schemas: Record<string, any>
  ): Array<[string, any]> {
    // Implementation from parent class
    return Object.entries(schemas);
  }
}
