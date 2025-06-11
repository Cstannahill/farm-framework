// tools/codegen/api-client-generator.ts
import { OpenAPIV3 } from "openapi-types";
import { readFile, writeFile, ensureDir } from "fs-extra";
import { join } from "path";
import { getErrorMessage } from "./src/utils/error-utils";

export interface APIClientGeneratorOptions {
  enableAI?: boolean;
  outputFormat?: "typescript" | "javascript";
  includeTypes?: boolean;
  baseURL?: string;
}

export class APIClientGenerator {
  private options: APIClientGeneratorOptions;

  constructor(options: APIClientGeneratorOptions = {}) {
    this.options = {
      enableAI: false,
      outputFormat: "typescript",
      includeTypes: true,
      ...options,
    };
  }

  async generateFromSchema(
    schemaPath: string,
    outputPath: string,
    options: APIClientGeneratorOptions = {}
  ): Promise<void> {
    try {
      const mergedOptions = { ...this.options, ...options };

      // Read and parse the OpenAPI schema
      const schemaContent = await readFile(schemaPath, "utf-8");
      const schema: OpenAPIV3.Document = JSON.parse(schemaContent);

      // Ensure output directory exists
      await ensureDir(outputPath);

      // Generate the API client
      const clientCode = this.generateClientCode(schema, mergedOptions);

      // Write the client file
      const clientFilePath = join(
        outputPath,
        `api-client.${
          mergedOptions.outputFormat === "typescript" ? "ts" : "js"
        }`
      );
      await writeFile(clientFilePath, clientCode);

      // Generate types if requested
      if (
        mergedOptions.includeTypes &&
        mergedOptions.outputFormat === "typescript"
      ) {
        const typesCode = this.generateTypesCode(schema);
        const typesFilePath = join(outputPath, "types.ts");
        await writeFile(typesFilePath, typesCode);
      }

      console.log(`✅ API client generated at ${outputPath}`);
    } catch (error) {
      throw new Error(
        `Failed to generate API client: ${getErrorMessage(error)}`
      );
    }
  }

  private generateClientCode(
    schema: OpenAPIV3.Document,
    options: APIClientGeneratorOptions
  ): string {
    const { enableAI, outputFormat, baseURL } = options;

    const imports =
      outputFormat === "typescript"
        ? `
import { ApiResponse, RequestConfig } from './types';
import { BaseApiClient } from '@farm-stack/api-client';
`
        : `
const { BaseApiClient } = require('@farm-stack/api-client');
`;

    const classDefinition =
      outputFormat === "typescript"
        ? `
export class APIClient extends BaseApiClient {
  constructor(baseURL: string = '${baseURL || "http://localhost:8000"}') {
    super(baseURL);
  }
`
        : `
class APIClient extends BaseApiClient {
  constructor(baseURL = '${baseURL || "http://localhost:8000"}') {
    super(baseURL);
  }
`;

    let methods = "";

    // Generate methods from OpenAPI paths
    if (schema.paths) {
      for (const [path, pathItem] of Object.entries(schema.paths)) {
        if (pathItem) {
          methods += this.generatePathMethods(path, pathItem, options);
        }
      }
    }

    const exports =
      outputFormat === "typescript"
        ? ""
        : `
module.exports = { APIClient };
`;

    return `${imports}
${classDefinition}
${methods}
}
${exports}`;
  }

  private generatePathMethods(
    path: string,
    pathItem: OpenAPIV3.PathItemObject,
    options: APIClientGeneratorOptions
  ): string {
    let methods = "";
    const { enableAI, outputFormat } = options;

    const httpMethods = ["get", "post", "put", "delete", "patch"] as const;

    for (const method of httpMethods) {
      const operation = pathItem[method];
      if (operation) {
        const methodName = this.generateMethodName(method, path, operation);
        const parameters = this.generateMethodParameters(
          operation,
          outputFormat === "typescript" ? "typescript" : "javascript"
        );
        const returnType =
          outputFormat === "typescript"
            ? this.generateReturnType(operation)
            : "";

        // Skip AI-specific endpoints if AI is not enabled
        if (!enableAI && this.isAIEndpoint(path, operation)) {
          continue;
        }

        methods += `
  async ${methodName}(${parameters})${returnType} {
    return this.${method}('${path}'${this.generateMethodCall(operation)});
  }
`;
      }
    }

    return methods;
  }

  private generateMethodName(
    method: string,
    path: string,
    operation: OpenAPIV3.OperationObject
  ): string {
    if (operation.operationId) {
      return operation.operationId;
    }

    // Generate method name from path and HTTP method
    const pathParts = path
      .split("/")
      .filter((part) => part && !part.startsWith("{"));
    const pathName = pathParts.join("_").replace(/[^a-zA-Z0-9_]/g, "");
    return `${method}${pathName.charAt(0).toUpperCase() + pathName.slice(1)}`;
  }

  private generateMethodParameters(
    operation: OpenAPIV3.OperationObject,
    outputFormat: string
  ): string {
    const params: string[] = [];

    if (operation.parameters) {
      for (const param of operation.parameters) {
        if ("name" in param) {
          const paramType = outputFormat === "typescript" ? ": any" : "";
          params.push(`${param.name}${param.required ? "" : "?"}${paramType}`);
        }
      }
    }

    if (operation.requestBody) {
      const bodyType = outputFormat === "typescript" ? ": any" : "";
      params.push(`data${bodyType}`);
    }

    const configType =
      outputFormat === "typescript" ? ": RequestConfig = {}" : " = {}";
    params.push(`config${configType}`);

    return params.join(", ");
  }

  private generateReturnType(operation: OpenAPIV3.OperationObject): string {
    // For now, return a generic Promise<ApiResponse>
    return ": Promise<ApiResponse>";
  }

  private generateMethodCall(operation: OpenAPIV3.OperationObject): string {
    const hasRequestBody = !!operation.requestBody;
    const hasParams = !!(
      operation.parameters && operation.parameters.length > 0
    );

    if (hasRequestBody) {
      return ", data, config";
    } else if (hasParams) {
      return ", { params: { ...arguments[0] }, ...config }";
    } else {
      return ", config";
    }
  }

  private isAIEndpoint(
    path: string,
    operation: OpenAPIV3.OperationObject
  ): boolean {
    const aiKeywords = ["ai", "chat", "completion", "embedding", "model"];
    const pathLower = path.toLowerCase();
    const summaryLower = operation.summary?.toLowerCase() || "";
    const descriptionLower = operation.description?.toLowerCase() || "";

    return aiKeywords.some(
      (keyword) =>
        pathLower.includes(keyword) ||
        summaryLower.includes(keyword) ||
        descriptionLower.includes(keyword)
    );
  }

  private generateTypesCode(schema: OpenAPIV3.Document): string {
    let typesCode = `// Generated API Types
export interface ApiResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
}

export interface RequestConfig {
  headers?: Record<string, string>;
  timeout?: number;
  params?: Record<string, any>;
}
`;

    // Generate types from schema components
    if (schema.components?.schemas) {
      for (const [name, schemaObj] of Object.entries(
        schema.components.schemas
      )) {
        if (typeof schemaObj === "object" && schemaObj !== null) {
          typesCode += this.generateTypeFromSchema(
            name,
            schemaObj as OpenAPIV3.SchemaObject
          );
        }
      }
    }

    return typesCode;
  }

  private generateTypeFromSchema(
    name: string,
    schema: OpenAPIV3.SchemaObject
  ): string {
    if (schema.type === "object" && schema.properties) {
      const properties = Object.entries(schema.properties)
        .map(([propName, propSchema]) => {
          const optional = schema.required?.includes(propName) ? "" : "?";
          const type = this.getTypeFromSchema(propSchema);
          return `  ${propName}${optional}: ${type};`;
        })
        .join("\n");

      return `
export interface ${name} {
${properties}
}
`;
    }

    return `export type ${name} = ${this.getTypeFromSchema(schema)};
`;
  }

  private getTypeFromSchema(schema: any): string {
    if (typeof schema !== "object" || schema === null) {
      return "any";
    }

    if (schema.$ref) {
      const refName = schema.$ref.split("/").pop();
      return refName || "any";
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
        const itemType = schema.items
          ? this.getTypeFromSchema(schema.items)
          : "any";
        return `${itemType}[]`;
      case "object":
        return "Record<string, any>";
      default:
        return "any";
    }
  }
}
