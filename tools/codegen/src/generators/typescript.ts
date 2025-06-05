// tools/codegen/src/generators/typescript.ts
import { OpenAPISchema } from "../schema/extractor";
import { writeFile, mkdir } from "fs/promises";
import { join, dirname } from "path";

export interface TypeScriptGenerationOptions {
  outputDir: string;
  baseUrl?: string;
  enumType?: "union" | "enum";
  dateType?: "string" | "Date";
  generateComments?: boolean;
  generateValidation?: boolean;
  fileNaming?: "camelCase" | "kebab-case" | "PascalCase";
}

export interface GeneratedFile {
  path: string;
  content: string;
  type: "interface" | "enum" | "type" | "api-client";
}

export interface TypeScriptGenerationResult {
  files: GeneratedFile[];
  stats: {
    interfaces: number;
    enums: number;
    types: number;
    totalFiles: number;
  };
}

interface ComponentSchema {
  type?: string;
  properties?: Record<string, any>;
  required?: string[];
  enum?: any[];
  items?: any;
  oneOf?: any[];
  anyOf?: any[];
  allOf?: any[];
  $ref?: string;
  format?: string;
  description?: string;
  example?: any;
  additionalProperties?: boolean | any;
}

// Define a type for `operation` to include `operationId`
interface Operation {
  operationId?: string;
  // ...other properties...
}

export class TypeScriptGenerator {
  private options: Required<TypeScriptGenerationOptions>;
  private schema: OpenAPISchema;
  private generatedTypes = new Set<string>();
  private typeRefs = new Map<string, string>(); // $ref -> type name mapping

  constructor(schema: OpenAPISchema, options: TypeScriptGenerationOptions) {
    this.schema = schema;
    this.options = {
      enumType: "union",
      dateType: "string",
      generateComments: true,
      generateValidation: false,
      fileNaming: "camelCase",
      baseUrl: "/api",
      ...options,
    };
  }

  /**
   * Generate all TypeScript files from OpenAPI schema
   */
  async generateTypes(): Promise<TypeScriptGenerationResult> {
    const files: GeneratedFile[] = [];
    const stats = {
      interfaces: 0,
      enums: 0,
      types: 0,
      totalFiles: 0,
    };

    // Ensure output directory exists
    await mkdir(this.options.outputDir, { recursive: true });

    // Generate component schemas (models)
    if (this.schema.components?.schemas) {
      const modelFiles = await this.generateModelInterfaces();
      files.push(...modelFiles);
      stats.interfaces += modelFiles.filter(
        (f) => f.type === "interface"
      ).length;
      stats.enums += modelFiles.filter((f) => f.type === "enum").length;
      stats.types += modelFiles.filter((f) => f.type === "type").length;
    }

    // Generate API request/response types
    const apiFiles = await this.generateApiTypes();
    files.push(...apiFiles);
    stats.types += apiFiles.length;

    // Generate index file
    const indexFile = await this.generateIndexFile(files);
    files.push(indexFile);

    stats.totalFiles = files.length;

    // Write all files
    await this.writeFiles(files);

    return { files, stats };
  }

  /**
   * Generate TypeScript interfaces from component schemas
   */
  private async generateModelInterfaces(): Promise<GeneratedFile[]> {
    const files: GeneratedFile[] = [];
    const schemas = this.schema.components!.schemas!;

    for (const [schemaName, schemaDefinition] of Object.entries(schemas)) {
      const content = this.generateInterfaceFromSchema(
        schemaName,
        schemaDefinition
      );

      if (content) {
        files.push({
          path: join("models", `${this.formatFileName(schemaName)}.ts`),
          content,
          type: this.getSchemaType(schemaDefinition),
        });
      }
    }

    return files;
  }

  /**
   * Generate request/response types from API paths
   */
  private async generateApiTypes(): Promise<GeneratedFile[]> {
    const files: GeneratedFile[] = [];
    const requestTypes: string[] = [];
    const responseTypes: string[] = [];

    for (const [path, pathItem] of Object.entries(this.schema.paths)) {
      for (const [method, operation] of Object.entries(pathItem) as [
        string,
        Operation
      ][]) {
        if (!operation || typeof operation !== "object") continue;

        const operationId =
          operation.operationId || this.generateOperationId(method, path);

        // Generate request type
        const requestType = this.generateRequestType(operationId, operation);
        if (requestType) {
          requestTypes.push(requestType);
        }

        // Generate response type
        const responseType = this.generateResponseType(operationId, operation);
        if (responseType) {
          responseTypes.push(responseType);
        }
      }
    }

    // Create request types file
    if (requestTypes.length > 0) {
      files.push({
        path: join("api", "requests.ts"),
        content: this.wrapInFile(["// API Request Types", "", ...requestTypes]),
        type: "type",
      });
    }

    // Create response types file
    if (responseTypes.length > 0) {
      files.push({
        path: join("api", "responses.ts"),
        content: this.wrapInFile([
          "// API Response Types",
          "",
          ...responseTypes,
        ]),
        type: "type",
      });
    }

    return files;
  }

  /**
   * Generate TypeScript interface from OpenAPI schema
   */
  private generateInterfaceFromSchema(
    name: string,
    schema: ComponentSchema
  ): string {
    if (schema.enum) {
      return this.generateEnum(name, schema);
    }

    if (schema.oneOf || schema.anyOf) {
      return this.generateUnionType(name, schema);
    }

    if (schema.allOf) {
      return this.generateIntersectionType(name, schema);
    }

    if (schema.type === "object" || schema.properties) {
      return this.generateInterface(name, schema);
    }

    // For primitive types, generate type alias
    return this.generateTypeAlias(name, schema);
  }

  /**
   * Generate TypeScript interface for object schemas
   */
  private generateInterface(name: string, schema: ComponentSchema): string {
    const lines: string[] = [];

    // Add JSDoc comment
    if (this.options.generateComments && schema.description) {
      lines.push(`/**`);
      lines.push(` * ${schema.description}`);
      if (schema.example) {
        lines.push(` * @example ${JSON.stringify(schema.example, null, 2)}`);
      }
      lines.push(` */`);
    }

    lines.push(`export interface ${name} {`);

    if (schema.properties) {
      const required = schema.required || [];

      for (const [propName, propSchema] of Object.entries(schema.properties)) {
        const isRequired = required.includes(propName);
        const optional = isRequired ? "" : "?";
        const propType = this.getTypeScriptType(propSchema);

        // Add property comment
        if (this.options.generateComments && propSchema.description) {
          lines.push(`  /** ${propSchema.description} */`);
        }

        lines.push(`  ${propName}${optional}: ${propType};`);
      }
    }

    // Handle additionalProperties
    if (schema.additionalProperties === true) {
      lines.push(`  [key: string]: any;`);
    } else if (
      schema.additionalProperties &&
      typeof schema.additionalProperties === "object"
    ) {
      const additionalType = this.getTypeScriptType(
        schema.additionalProperties
      );
      lines.push(`  [key: string]: ${additionalType};`);
    }

    lines.push(`}`);
    lines.push(""); // Empty line after interface

    return lines.join("\n");
  }

  /**
   * Generate TypeScript enum
   */
  private generateEnum(name: string, schema: ComponentSchema): string {
    const lines: string[] = [];

    if (this.options.generateComments && schema.description) {
      lines.push(`/** ${schema.description} */`);
    }

    if (this.options.enumType === "enum") {
      lines.push(`export enum ${name} {`);

      schema.enum!.forEach((value, index) => {
        const enumKey = this.formatEnumKey(value);
        const enumValue = typeof value === "string" ? `"${value}"` : value;
        const comma = index < schema.enum!.length - 1 ? "," : "";
        lines.push(`  ${enumKey} = ${enumValue}${comma}`);
      });

      lines.push(`}`);
    } else {
      // Union type
      const unionValues = schema
        .enum!.map((value) =>
          typeof value === "string" ? `"${value}"` : value
        )
        .join(" | ");
      lines.push(`export type ${name} = ${unionValues};`);
    }

    lines.push("");
    return lines.join("\n");
  }

  /**
   * Generate union type for oneOf/anyOf schemas
   */
  private generateUnionType(name: string, schema: ComponentSchema): string {
    const lines: string[] = [];
    const unionSchemas = schema.oneOf || schema.anyOf || [];

    if (this.options.generateComments && schema.description) {
      lines.push(`/** ${schema.description} */`);
    }

    const unionTypes = unionSchemas
      .map((subSchema) => this.getTypeScriptType(subSchema))
      .join(" | ");

    lines.push(`export type ${name} = ${unionTypes};`);
    lines.push("");

    return lines.join("\n");
  }

  /**
   * Generate intersection type for allOf schemas
   */
  private generateIntersectionType(
    name: string,
    schema: ComponentSchema
  ): string {
    const lines: string[] = [];

    if (this.options.generateComments && schema.description) {
      lines.push(`/** ${schema.description} */`);
    }

    const intersectionTypes = schema
      .allOf!.map((subSchema) => this.getTypeScriptType(subSchema))
      .join(" & ");

    lines.push(`export type ${name} = ${intersectionTypes};`);
    lines.push("");

    return lines.join("\n");
  }

  /**
   * Generate type alias for primitive types
   */
  private generateTypeAlias(name: string, schema: ComponentSchema): string {
    const lines: string[] = [];

    if (this.options.generateComments && schema.description) {
      lines.push(`/** ${schema.description} */`);
    }

    const tsType = this.getTypeScriptType(schema);
    lines.push(`export type ${name} = ${tsType};`);
    lines.push("");

    return lines.join("\n");
  }

  /**
   * Convert OpenAPI type to TypeScript type
   */
  private getTypeScriptType(schema: any): string {
    if (!schema) return "any";

    // Handle $ref
    if (schema.$ref) {
      return this.resolveReference(schema.$ref);
    }

    // Handle arrays
    if (schema.type === "array") {
      const itemType = this.getTypeScriptType(schema.items);
      return `Array<${itemType}>`;
    }

    // Handle objects
    if (schema.type === "object") {
      if (schema.properties) {
        // Inline object type
        const props = Object.entries(schema.properties)
          .map(([key, propSchema]: [string, any]) => {
            const optional = schema.required?.includes(key) ? "" : "?";
            const type = this.getTypeScriptType(propSchema);
            return `${key}${optional}: ${type}`;
          })
          .join("; ");
        return `{ ${props} }`;
      }

      if (schema.additionalProperties === true) {
        return "Record<string, any>";
      }

      if (schema.additionalProperties) {
        const valueType = this.getTypeScriptType(schema.additionalProperties);
        return `Record<string, ${valueType}>`;
      }

      return "Record<string, any>";
    }

    // Handle enums
    if (schema.enum) {
      return schema.enum
        .map((value: any) => (typeof value === "string" ? `"${value}"` : value))
        .join(" | ");
    }

    // Handle oneOf/anyOf
    if (schema.oneOf || schema.anyOf) {
      const unionSchemas = schema.oneOf || schema.anyOf;
      return unionSchemas
        .map((subSchema: any) => this.getTypeScriptType(subSchema))
        .join(" | ");
    }

    // Handle allOf
    if (schema.allOf) {
      return schema.allOf
        .map((subSchema: any) => this.getTypeScriptType(subSchema))
        .join(" & ");
    }

    // Handle primitive types
    switch (schema.type) {
      case "string":
        if (schema.format === "date-time" || schema.format === "date") {
          return this.options.dateType === "Date" ? "Date" : "string";
        }
        return "string";

      case "number":
      case "integer":
        return "number";

      case "boolean":
        return "boolean";

      case "null":
        return "null";

      default:
        return "any";
    }
  }

  /**
   * Resolve $ref to TypeScript type name
   */
  private resolveReference(ref: string): string {
    // Handle component references
    if (ref.startsWith("#/components/schemas/")) {
      const typeName = ref.replace("#/components/schemas/", "");
      this.typeRefs.set(ref, typeName);
      return typeName;
    }

    // Handle other references (simplified)
    const parts = ref.split("/");
    const typeName = parts[parts.length - 1];
    this.typeRefs.set(ref, typeName);
    return typeName;
  }

  /**
   * Generate request type for API operation
   */
  private generateRequestType(
    operationId: string,
    operation: any
  ): string | null {
    const lines: string[] = [];
    const typeName = `${this.capitalize(operationId)}Request`;

    // Check if there's a request body
    const requestBody = operation.requestBody;
    const parameters = operation.parameters || [];

    if (!requestBody && parameters.length === 0) {
      return null; // No request type needed
    }

    if (this.options.generateComments) {
      lines.push(`/** Request type for ${operationId} operation */`);
    }

    lines.push(`export interface ${typeName} {`);

    // Add parameters
    for (const param of parameters) {
      const required = param.required ? "" : "?";
      const paramType = this.getTypeScriptType(param.schema);

      if (this.options.generateComments && param.description) {
        lines.push(`  /** ${param.description} */`);
      }

      lines.push(`  ${param.name}${required}: ${paramType};`);
    }

    // Add request body
    if (requestBody) {
      const content = requestBody.content;
      if (content && content["application/json"]) {
        const bodyType = this.getTypeScriptType(
          content["application/json"].schema
        );
        lines.push(`  body: ${bodyType};`);
      }
    }

    lines.push(`}`);
    lines.push("");

    return lines.join("\n");
  }

  /**
   * Generate response type for API operation
   */
  private generateResponseType(
    operationId: string,
    operation: any
  ): string | null {
    const responses = operation.responses;
    if (!responses) return null;

    const lines: string[] = [];
    const typeName = `${this.capitalize(operationId)}Response`;

    // Find success response (200, 201, etc.)
    const successResponse =
      responses["200"] || responses["201"] || responses["204"];

    if (!successResponse) {
      return null; // No success response type needed
    }

    if (this.options.generateComments) {
      lines.push(`/** Response type for ${operationId} operation */`);
    }

    const content = successResponse.content;
    if (content && content["application/json"]) {
      const responseType = this.getTypeScriptType(
        content["application/json"].schema
      );
      lines.push(`export type ${typeName} = ${responseType};`);
    } else {
      lines.push(`export type ${typeName} = void;`);
    }

    lines.push("");
    return lines.join("\n");
  }

  /**
   * Generate index file that exports all types
   */
  private async generateIndexFile(
    files: GeneratedFile[]
  ): Promise<GeneratedFile> {
    const lines: string[] = [
      "// Auto-generated TypeScript types from OpenAPI schema",
      "// Do not edit this file directly",
      "",
    ];

    // Group exports by directory
    const exportsByDir = new Map<string, string[]>();

    for (const file of files) {
      if (
        file.type === "interface" ||
        file.type === "enum" ||
        file.type === "type"
      ) {
        const dir = dirname(file.path);
        const fileName = file.path.replace(".ts", "");

        if (!exportsByDir.has(dir)) {
          exportsByDir.set(dir, []);
        }

        exportsByDir.get(dir)!.push(`export * from './${fileName}';`);
      }
    }

    // Add exports
    for (const [dir, exports] of exportsByDir) {
      if (dir !== ".") {
        lines.push(`// ${dir} exports`);
      }
      lines.push(...exports);
      lines.push("");
    }

    return {
      path: "index.ts",
      content: lines.join("\n"),
      type: "type",
    };
  }

  /**
   * Write generated files to disk
   */
  private async writeFiles(files: GeneratedFile[]): Promise<void> {
    for (const file of files) {
      const fullPath = join(this.options.outputDir, file.path);
      const dir = dirname(fullPath);

      // Ensure directory exists
      await mkdir(dir, { recursive: true });

      // Write file
      await writeFile(fullPath, file.content);
    }
  }

  /**
   * Utility functions
   */
  private getSchemaType(
    schema: ComponentSchema
  ): "interface" | "enum" | "type" {
    if (schema.enum) return "enum";
    if (schema.type === "object" || schema.properties) return "interface";
    return "type";
  }

  private generateOperationId(method: string, path: string): string {
    const pathParts = path.split("/").filter((p) => p && !p.startsWith("{"));
    const methodPart = method.toLowerCase();
    return `${methodPart}${pathParts.map((p) => this.capitalize(p)).join("")}`;
  }

  private formatFileName(name: string): string {
    switch (this.options.fileNaming) {
      case "kebab-case":
        return name
          .replace(/([A-Z])/g, "-$1")
          .toLowerCase()
          .replace(/^-/, "");
      case "PascalCase":
        return this.capitalize(name);
      case "camelCase":
      default:
        return name.charAt(0).toLowerCase() + name.slice(1);
    }
  }

  private formatEnumKey(value: any): string {
    const str = String(value);
    return str.replace(/[^a-zA-Z0-9]/g, "_").toUpperCase();
  }

  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  private wrapInFile(lines: string[]): string {
    return [
      "// Auto-generated from OpenAPI schema",
      "// Do not edit this file directly",
      "",
      ...lines,
    ].join("\n");
  }
}
