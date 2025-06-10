import fs from "fs-extra";
import path from "path";
import crypto from "crypto";
import type { OpenAPISchema } from "../types";

export interface TypeScriptGenerationOptions {
  outputDir: string;
  generateComments?: boolean;
  enumType?: "string" | "number" | "const" | "union";
  dateType?: "string" | "Date";
  fileNaming?: "camelCase" | "kebab-case" | "snake_case";
  cleanOrphans?: boolean;
  metadataFile?: string;
  strict?: boolean;
  exportStyle?: "named" | "default" | "both";
}

export interface GenerationResult {
  path: string;
  content?: string;
  size?: number;
  checksum?: string;
  generatedAt?: Date;
  type?: string;
}

/**
 * Generates raw TypeScript type declarations from an OpenAPI schema.
 */
export class TypeScriptGenerator {
  private options: TypeScriptGenerationOptions;

  constructor(options?: Partial<TypeScriptGenerationOptions>) {
    this.options = {
      outputDir: "./src/types",
      generateComments: true,
      enumType: "union",
      dateType: "string",
      fileNaming: "camelCase",
      cleanOrphans: true,
      metadataFile: "generation-metadata.json",
      strict: true,
      exportStyle: "named",
      ...options,
    };
  }

  /**
   * Generate the type declaration file.
   *
   * @param schema - Parsed OpenAPI schema
   * @param opts - Generation options
   * @returns Path to the generated file
   */
  async generate(
    schema: OpenAPISchema,
    opts: TypeScriptGenerationOptions
  ): Promise<GenerationResult> {
    const finalOpts = { ...this.options, ...opts };
    await fs.ensureDir(finalOpts.outputDir);

    const content = await this.generateTypesContent(schema, finalOpts);
    const outPath = path.join(finalOpts.outputDir, "types.ts");

    await fs.writeFile(outPath, content);

    return {
      path: outPath,
      content,
      size: content.length,
      checksum: this.generateChecksum(content),
      generatedAt: new Date(),
      type: "typescript",
    };
  }

  private async generateTypesContent(
    schema: OpenAPISchema,
    opts: TypeScriptGenerationOptions
  ): Promise<string> {
    let content = "";

    // Add file header
    if (opts.generateComments) {
      content += `/**\n * Generated TypeScript types from OpenAPI schema\n * Generated at: ${new Date().toISOString()}\n * DO NOT EDIT - This file is auto-generated\n */\n\n`;
    }

    // Generate interfaces from components/schemas
    if (schema.components?.schemas) {
      const sortedSchemas = this.sortSchemasByDependencies(
        schema.components.schemas
      );

      for (const [name, schemaObj] of sortedSchemas) {
        content += this.generateInterface(name, schemaObj as any, opts);
        content += "\n";
      }
    }

    // Generate API operation types
    if (schema.paths) {
      content += this.generateApiTypes(schema.paths, opts);
    }

    // Add common utility types
    content += this.generateCommonTypes(opts);

    return content;
  }

  private generateInterface(
    name: string,
    schema: any,
    opts: TypeScriptGenerationOptions
  ): string {
    let content = "";

    if (opts.generateComments && schema.description) {
      content += `/**\n * ${schema.description}\n */\n`;
    }

    // Handle enums
    if (schema.enum && opts.enumType === "union") {
      const values = schema.enum.map((v: any) => `"${v}"`).join(" | ");
      content += `export type ${name} = ${values};\n`;
      return content;
    }

    content += `export interface ${name} {\n`;

    if (schema.properties) {
      for (const [propName, propSchema] of Object.entries(
        schema.properties as any
      )) {
        const optional = !schema.required?.includes(propName) ? "?" : "";
        const type = this.mapSchemaType(propSchema as any, opts);

        if (opts.generateComments && (propSchema as any).description) {
          content += `  /** ${(propSchema as any).description} */\n`;
        }

        content += `  ${propName}${optional}: ${type};\n`;
      }
    }

    content += "}\n";
    return content;
  }

  private generateApiTypes(
    paths: Record<string, any>,
    opts: TypeScriptGenerationOptions
  ): string {
    let content = "";

    if (opts.generateComments) {
      content += `/**\n * API Operation Types\n */\n\n`;
    }
    for (const [path, methods] of Object.entries(paths)) {
      for (const [method, operation] of Object.entries(methods as any)) {
        const operationDef = operation as any;
        const operationId =
          operationDef.operationId || this.generateOperationId(method, path);

        // Generate request type
        content += this.generateRequestType(operationId, operationDef, opts);

        // Generate response type
        content += this.generateResponseType(operationId, operationDef, opts);
      }
    }

    return content;
  }

  private generateRequestType(
    operationId: string,
    operation: any,
    opts: TypeScriptGenerationOptions
  ): string {
    let content = "";

    if (opts.generateComments) {
      content += `/** Request type for ${operationId} */\n`;
    }

    content += `export interface ${this.capitalize(operationId)}Request {\n`;

    // Parameters
    if (operation.parameters) {
      for (const param of operation.parameters) {
        const optional = !param.required ? "?" : "";
        const type = this.mapSchemaType(
          param.schema || { type: "string" },
          opts
        );
        content += `  ${param.name}${optional}: ${type};\n`;
      }
    }

    // Request body
    if (operation.requestBody?.content?.["application/json"]?.schema) {
      const schema = operation.requestBody.content["application/json"].schema;
      const type = this.mapSchemaType(schema, opts);
      content += `  body: ${type};\n`;
    }

    content += "}\n\n";
    return content;
  }

  private generateResponseType(
    operationId: string,
    operation: any,
    opts: TypeScriptGenerationOptions
  ): string {
    let content = "";

    if (opts.generateComments) {
      content += `/** Response type for ${operationId} */\n`;
    }

    const successResponse =
      operation.responses?.["200"] || operation.responses?.["201"];

    if (successResponse?.content?.["application/json"]?.schema) {
      const schema = successResponse.content["application/json"].schema;
      const type = this.mapSchemaType(schema, opts);
      content += `export type ${this.capitalize(operationId)}Response = ${type};\n\n`;
    } else {
      content += `export type ${this.capitalize(operationId)}Response = void;\n\n`;
    }

    return content;
  }

  private mapSchemaType(
    schema: any,
    opts: TypeScriptGenerationOptions
  ): string {
    if (schema.$ref) {
      return schema.$ref.split("/").pop();
    }

    if (schema.allOf) {
      return schema.allOf
        .map((s: any) => this.mapSchemaType(s, opts))
        .join(" & ");
    }

    if (schema.oneOf || schema.anyOf) {
      const union = schema.oneOf || schema.anyOf;
      return union.map((s: any) => this.mapSchemaType(s, opts)).join(" | ");
    }

    if (schema.enum && opts.enumType === "union") {
      return schema.enum.map((v: any) => `"${v}"`).join(" | ");
    }

    switch (schema.type) {
      case "string":
        if (schema.format === "date-time" && opts.dateType === "Date") {
          return "Date";
        }
        return "string";
      case "number":
      case "integer":
        return "number";
      case "boolean":
        return "boolean";
      case "array":
        return `Array<${this.mapSchemaType(schema.items, opts)}>`;
      case "object":
        if (schema.properties) {
          // Inline object type
          let objectType = "{\n";
          for (const [propName, propSchema] of Object.entries(
            schema.properties
          )) {
            const optional = !schema.required?.includes(propName) ? "?" : "";
            const type = this.mapSchemaType(propSchema as any, opts);
            objectType += `    ${propName}${optional}: ${type};\n`;
          }
          objectType += "  }";
          return objectType;
        }
        return "Record<string, any>";
      default:
        return "any";
    }
  }

  private generateCommonTypes(opts: TypeScriptGenerationOptions): string {
    if (!opts.generateComments) return "";

    return `
/**
 * Common utility types
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface ApiError {
  message: string;
  status: number;
  code?: string;
  details?: any;
  timestamp: string;
}

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};
`;
  }

  private sortSchemasByDependencies(
    schemas: Record<string, any>
  ): Array<[string, any]> {
    const sorted: Array<[string, any]> = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (name: string, schema: any) => {
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

  private findSchemaDependencies(schema: any): string[] {
    const deps: string[] = [];

    const traverse = (obj: any) => {
      if (typeof obj !== "object" || obj === null) return;

      if (obj.$ref && typeof obj.$ref === "string") {
        const refName = obj.$ref.split("/").pop();
        if (refName) deps.push(refName);
      }

      if (Array.isArray(obj)) {
        obj.forEach(traverse);
      } else {
        Object.values(obj).forEach(traverse);
      }
    };

    traverse(schema);
    return [...new Set(deps)];
  }

  private generateOperationId(method: string, path: string): string {
    return `${method}${path.replace(/[^a-zA-Z0-9]/g, "")}`;
  }

  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  private generateChecksum(content: string): string {
    return crypto.createHash("md5").update(content).digest("hex").slice(0, 8);
  }
}
