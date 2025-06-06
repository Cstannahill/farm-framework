// tools/codegen/src/generators/typescript-generator.ts
import type {
  OpenAPISchema,
  GenerationResult,
  TypeGenerationOptions,
} from "@farm/types";

interface TypeScriptGenerationOptions {
  outputDir: string;
  generateComments?: boolean;
  enumType?: "string" | "number" | "const";
  dateType?: "string" | "Date";
  fileNaming?: "camelCase" | "kebab-case" | "snake_case";
  cleanOrphans?: boolean;
  metadataFile?: string;
  strict?: boolean;
  exportStyle?: "named" | "default" | "both";
}

class TypeScriptGenerator {
  private options: TypeScriptGenerationOptions;

  constructor(options?: Partial<TypeScriptGenerationOptions>) {
    this.options = {
      outputDir: "./src/types",
      generateComments: true,
      enumType: "string",
      dateType: "string",
      fileNaming: "camelCase",
      cleanOrphans: true,
      metadataFile: "generation-metadata.json",
      strict: true,
      exportStyle: "named",
      ...options,
    };
  }

  async generateTypes(schema: OpenAPISchema): Promise<GenerationResult> {
    const startTime = Date.now();

    try {
      const files = await this.processSchema(schema);

      return {
        files,
        stats: {
          totalFiles: files.length,
          totalSize: files.reduce((sum, f) => sum + f.size, 0),
          generationTime: Date.now() - startTime,
          modifiedFiles: files.length,
          createdFiles: files.length,
          deletedFiles: 0,
        },
        errors: [],
        metadata: {
          version: "1.0.0",
          generatedAt: new Date(),
          sourceSchema: JSON.stringify(schema.info),
          options: this.options,
        },
      };
    } catch (error: any) {
      throw new Error(`TypeScript generation failed: ${error.message}`);
    }
  }

  private async processSchema(schema: OpenAPISchema): Promise<any[]> {
    const files = [];

    // Process components/schemas
    if (schema.components?.schemas) {
      for (const [name, schemaObj] of Object.entries(
        schema.components.schemas
      )) {
        const content = this.generateInterface(name, schemaObj as any);
        files.push({
          path: `${this.options.outputDir}/models/${this.formatFileName(
            name
          )}.ts`,
          content,
          type: "typescript",
          size: content.length,
          checksum: this.generateChecksum(content),
          generatedAt: new Date(),
        });
      }
    }

    // Process paths for API types
    if (schema.paths) {
      const apiContent = this.generateApiTypes(schema.paths);
      files.push({
        path: `${this.options.outputDir}/api.ts`,
        content: apiContent,
        type: "typescript",
        size: apiContent.length,
        checksum: this.generateChecksum(apiContent),
        generatedAt: new Date(),
      });
    }

    return files;
  }

  private generateInterface(name: string, schema: any): string {
    let content = "";

    if (this.options.generateComments) {
      content += `/**\n * Generated interface for ${name}\n */\n`;
    }

    content += `export interface ${name} {\n`;

    if (schema.properties) {
      for (const [propName, propSchema] of Object.entries(
        schema.properties as any
      )) {
        const optional = !schema.required?.includes(propName) ? "?" : "";
        const type = this.mapSchemaType(propSchema as any);
        content += `  ${propName}${optional}: ${type};\n`;
      }
    }

    content += "}\n\n";
    return content;
  }

  private generateApiTypes(paths: Record<string, any>): string {
    let content = "";

    if (this.options.generateComments) {
      content += `/**\n * Generated API types\n */\n\n`;
    }

    for (const [path, methods] of Object.entries(paths)) {
      for (const [method, operation] of Object.entries(methods as any)) {
        const operationId =
          operation.operationId ||
          `${method}${path.replace(/[^a-zA-Z0-9]/g, "")}`;

        // Generate request type
        content += `export interface ${operationId}Request {\n`;
        if (operation.requestBody?.content?.["application/json"]?.schema) {
          const schema =
            operation.requestBody.content["application/json"].schema;
          if (schema.properties) {
            for (const [propName, propSchema] of Object.entries(
              schema.properties
            )) {
              const optional = !schema.required?.includes(propName) ? "?" : "";
              const type = this.mapSchemaType(propSchema as any);
              content += `  ${propName}${optional}: ${type};\n`;
            }
          }
        }
        content += "}\n\n";

        // Generate response type
        content += `export interface ${operationId}Response {\n`;
        const successResponse =
          operation.responses?.["200"] || operation.responses?.["201"];
        if (successResponse?.content?.["application/json"]?.schema) {
          const schema = successResponse.content["application/json"].schema;
          if (schema.properties) {
            for (const [propName, propSchema] of Object.entries(
              schema.properties
            )) {
              const type = this.mapSchemaType(propSchema as any);
              content += `  ${propName}: ${type};\n`;
            }
          }
        }
        content += "}\n\n";
      }
    }

    return content;
  }

  private mapSchemaType(schema: any): string {
    if (schema.$ref) {
      return schema.$ref.split("/").pop();
    }

    switch (schema.type) {
      case "string":
        return this.options.dateType === "Date" && schema.format === "date-time"
          ? "Date"
          : "string";
      case "number":
      case "integer":
        return "number";
      case "boolean":
        return "boolean";
      case "array":
        return `Array<${this.mapSchemaType(schema.items)}>`;
      case "object":
        return "Record<string, any>";
      default:
        return "any";
    }
  }

  private formatFileName(name: string): string {
    switch (this.options.fileNaming) {
      case "kebab-case":
        return name
          .replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`)
          .toLowerCase();
      case "snake_case":
        return name
          .replace(/[A-Z]/g, (match) => `_${match.toLowerCase()}`)
          .toLowerCase();
      default:
        return name.charAt(0).toLowerCase() + name.slice(1);
    }
  }

  private generateChecksum(content: string): string {
    // Simple checksum for now
    return Buffer.from(content).toString("base64").slice(0, 8);
  }
}
export { TypeScriptGenerator } from "./typescript-generator.js";
export type { TypeScriptGenerationOptions } from "./typescript-generator.js";
