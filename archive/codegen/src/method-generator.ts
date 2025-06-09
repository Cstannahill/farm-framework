// tools/codegen/src/method-generator.ts
import { OpenAPIV3 } from "openapi-types";
import { camelCase, pascalCase } from "change-case";

// Types for generated API methods
export interface GeneratedMethod {
  name: string;
  httpMethod: string;
  path: string;
  pathParams: ParameterInfo[];
  queryParams: ParameterInfo[];
  bodyParam?: ParameterInfo;
  responseType: string;
  requestType?: string;
  summary?: string;
  description?: string;
  tags: string[];
  isStreaming: boolean;
  isAIEndpoint: boolean;
}

export interface ParameterInfo {
  name: string;
  type: string;
  required: boolean;
  description?: string;
  example?: any;
  enum?: string[];
}

export interface GeneratedApiClient {
  imports: string[];
  interfaces: string[];
  methods: string[];
  exports: string[];
}

export class ApiMethodGenerator {
  private schema: OpenAPIV3.Document;
  private typeMap = new Map<string, string>();

  constructor(schema: OpenAPIV3.Document) {
    this.schema = schema;
    this.buildTypeMap();
  }

  private buildTypeMap(): void {
    // Build a map of OpenAPI types to TypeScript types
    this.typeMap.set("string", "string");
    this.typeMap.set("number", "number");
    this.typeMap.set("integer", "number");
    this.typeMap.set("boolean", "boolean");
    this.typeMap.set("array", "Array");
    this.typeMap.set("object", "Record<string, any>");
    this.typeMap.set("file", "File");
  }

  public generateApiClient(): GeneratedApiClient {
    const methods: GeneratedMethod[] = [];

    // Extract methods from OpenAPI paths
    for (const [path, pathItem] of Object.entries(this.schema.paths || {})) {
      if (!pathItem) continue;

      const pathMethods = this.extractMethodsFromPath(path, pathItem);
      methods.push(...pathMethods);
    }

    // Group methods by tags for organization
    const methodGroups = this.groupMethodsByTags(methods);

    // Generate the final API client code
    return this.generateClientCode(methodGroups);
  }

  private extractMethodsFromPath(
    path: string,
    pathItem: OpenAPIV3.PathItemObject
  ): GeneratedMethod[] {
    const methods: GeneratedMethod[] = [];
    const httpMethods = [
      "get",
      "post",
      "put",
      "patch",
      "delete",
      "head",
      "options",
    ] as const;

    for (const httpMethod of httpMethods) {
      const operation = pathItem[httpMethod] as OpenAPIV3.OperationObject;
      if (!operation) continue;

      const method = this.generateMethodFromOperation(
        path,
        httpMethod,
        operation
      );
      methods.push(method);
    }

    return methods;
  }

  private generateMethodFromOperation(
    path: string,
    httpMethod: string,
    operation: OpenAPIV3.OperationObject
  ): GeneratedMethod {
    const operationId =
      operation.operationId || this.generateOperationId(path, httpMethod);
    const tags = operation.tags || ["default"];

    // Determine if this is an AI endpoint
    const isAIEndpoint =
      path.includes("/ai/") || tags.includes("ai") || tags.includes("AI");

    // Determine if this is a streaming endpoint
    const isStreaming = this.checkIfStreamingEndpoint(path, operation);

    // Extract parameters
    const pathParams = this.extractPathParameters(operation.parameters || []);
    const queryParams = this.extractQueryParameters(operation.parameters || []);
    const bodyParam = this.extractBodyParameter(operation.requestBody);

    // Generate types
    const responseType = this.generateResponseType(operation.responses);
    const requestType = bodyParam
      ? this.generateRequestType(operationId)
      : undefined;

    return {
      name: camelCase(operationId),
      httpMethod: httpMethod.toUpperCase(),
      path,
      pathParams,
      queryParams,
      bodyParam,
      responseType,
      requestType,
      summary: operation.summary,
      description: operation.description,
      tags,
      isStreaming,
      isAIEndpoint,
    };
  }

  private generateOperationId(path: string, httpMethod: string): string {
    // Generate operation ID from path and method
    const pathParts = path
      .split("/")
      .filter((part) => part && !part.startsWith("{"));
    const resource = pathParts[pathParts.length - 1] || "resource";

    const methodMap: Record<string, string> = {
      get: path.includes("{") ? "getById" : "list",
      post: "create",
      put: "update",
      patch: "update",
      delete: "delete",
    };

    const action = methodMap[httpMethod] || httpMethod;
    return `${action}${pascalCase(resource)}`;
  }

  private extractPathParameters(
    parameters: (OpenAPIV3.ParameterObject | OpenAPIV3.ReferenceObject)[]
  ): ParameterInfo[] {
    return parameters
      .filter((param) => "in" in param && param.in === "path")
      .map((param) =>
        this.convertParameterToInfo(param as OpenAPIV3.ParameterObject)
      );
  }

  private extractQueryParameters(
    parameters: (OpenAPIV3.ParameterObject | OpenAPIV3.ReferenceObject)[]
  ): ParameterInfo[] {
    return parameters
      .filter((param) => "in" in param && param.in === "query")
      .map((param) =>
        this.convertParameterToInfo(param as OpenAPIV3.ParameterObject)
      );
  }

  private extractBodyParameter(
    requestBody?: OpenAPIV3.RequestBodyObject | OpenAPIV3.ReferenceObject
  ): ParameterInfo | undefined {
    if (!requestBody || "$ref" in requestBody) return undefined;

    const content = requestBody.content;
    const jsonContent = content?.["application/json"];

    if (!jsonContent?.schema) return undefined;

    return {
      name: "data",
      type: this.convertSchemaToType(jsonContent.schema),
      required: requestBody.required || false,
      description: requestBody.description,
    };
  }

  private convertParameterToInfo(
    param: OpenAPIV3.ParameterObject
  ): ParameterInfo {
    return {
      name: param.name,
      type: this.convertSchemaToType(param.schema),
      required: param.required || false,
      description: param.description,
      example: param.example,
      enum:
        "enum" in param.schema! ? (param.schema.enum as string[]) : undefined,
    };
  }

  private convertSchemaToType(schema: any): string {
    if (!schema) return "any";

    if (schema.$ref) {
      // Extract type name from $ref
      const refParts = schema.$ref.split("/");
      return pascalCase(refParts[refParts.length - 1]);
    }

    if (schema.type) {
      switch (schema.type) {
        case "array":
          const itemType = this.convertSchemaToType(schema.items);
          return `${itemType}[]`;
        case "object":
          if (schema.properties) {
            // Generate inline interface for simple objects
            const props = Object.entries(schema.properties)
              .map(([key, prop]: [string, any]) => {
                const optional = !schema.required?.includes(key) ? "?" : "";
                const type = this.convertSchemaToType(prop);
                return `${key}${optional}: ${type}`;
              })
              .join("; ");
            return `{ ${props} }`;
          }
          return "Record<string, any>";
        case "string":
          return schema.enum ? `'${schema.enum.join("' | '")}'` : "string";
        case "number":
        case "integer":
          return "number";
        case "boolean":
          return "boolean";
        default:
          return "any";
      }
    }

    if (schema.oneOf || schema.anyOf) {
      const unionTypes = (schema.oneOf || schema.anyOf)
        .map((s: any) => this.convertSchemaToType(s))
        .join(" | ");
      return unionTypes;
    }

    return "any";
  }

  private generateResponseType(responses?: OpenAPIV3.ResponsesObject): string {
    if (!responses) return "any";

    const successResponse =
      responses["200"] || responses["201"] || responses["default"];
    if (!successResponse || "$ref" in successResponse) return "any";

    const content = successResponse.content;
    const jsonContent = content?.["application/json"];

    if (!jsonContent?.schema) return "void";

    return this.convertSchemaToType(jsonContent.schema);
  }

  private generateRequestType(operationId: string): string {
    return `${pascalCase(operationId)}Request`;
  }

  private groupMethodsByTags(
    methods: GeneratedMethod[]
  ): Map<string, GeneratedMethod[]> {
    const groups = new Map<string, GeneratedMethod[]>();

    for (const method of methods) {
      const primaryTag = method.tags[0] || "default";
      const normalizedTag = camelCase(primaryTag);

      if (!groups.has(normalizedTag)) {
        groups.set(normalizedTag, []);
      }
      groups.get(normalizedTag)!.push(method);
    }

    return groups;
  }

  private generateClientCode(
    methodGroups: Map<string, GeneratedMethod[]>
  ): GeneratedApiClient {
    const imports: string[] = [
      "import { ApiClient, ApiResponse, PaginatedResponse } from '@farm/api-client';",
      "import type * as Types from '../types';",
    ];

    const interfaces: string[] = [];
    const methods: string[] = [];
    const exports: string[] = [];

    // Generate client instantiation
    methods.push(`
const client = new ApiClient({
  baseURL: process.env.VITE_API_URL || 'http://localhost:8000'
});`);

    // Generate method groups
    for (const [tag, tagMethods] of methodGroups) {
      const groupMethods = tagMethods.map((method) =>
        this.generateMethodCode(method)
      );

      methods.push(`
// ${pascalCase(tag)} operations
export const ${tag}Api = {
${groupMethods.join(",\n")}
};`);

      exports.push(`${tag}Api`);
    }

    // Generate AI-specific methods if present
    const aiMethods = Array.from(methodGroups.values())
      .flat()
      .filter((method) => method.isAIEndpoint);

    if (aiMethods.length > 0) {
      const aiMethodsCode = aiMethods.map((method) =>
        this.generateAIMethodCode(method)
      );

      methods.push(`
// AI operations with provider support
export const aiApi = {
${aiMethodsCode.join(",\n")}
};`);

      exports.push("aiApi");
    }

    return {
      imports,
      interfaces,
      methods,
      exports,
    };
  }

  private generateMethodCode(method: GeneratedMethod): string {
    const {
      name,
      httpMethod,
      path,
      pathParams,
      queryParams,
      bodyParam,
      responseType,
      requestType,
      summary,
      isStreaming,
    } = method;

    // Generate parameter list
    const params: string[] = [];

    // Path parameters
    pathParams.forEach((param) => {
      params.push(`${param.name}: ${param.type}`);
    });

    // Body parameter
    if (bodyParam) {
      params.push(`data: ${requestType || bodyParam.type}`);
    }

    // Query parameters (as optional object)
    if (queryParams.length > 0) {
      const queryParamType = `{ ${queryParams
        .map((p) => `${p.name}${p.required ? "" : "?"}: ${p.type}`)
        .join("; ")} }`;
      params.push(`params?: ${queryParamType}`);
    }

    // Generate path with parameter substitution
    let apiPath = path;
    pathParams.forEach((param) => {
      apiPath = apiPath.replace(`{${param.name}}`, `\${${param.name}}`);
    });

    // Generate method body
    const returnType = `Promise<ApiResponse<${responseType}>>`;

    let methodBody: string;
    if (isStreaming) {
      methodBody = `client.stream('${apiPath}'${bodyParam ? ", data" : ""})`;
    } else {
      const clientMethod = httpMethod.toLowerCase();
      const methodArgs: string[] = [`'${apiPath}'`];

      if (bodyParam) {
        methodArgs.push("data");
      }

      if (queryParams.length > 0) {
        methodArgs.push("{ params }");
      }

      methodBody = `client.${clientMethod}(${methodArgs.join(", ")})`;
    }

    const documentation = summary ? `\n  /** ${summary} */` : "";

    return `  ${documentation}
  ${name}: (${params.join(", ")}): ${returnType} =>
    ${methodBody}`;
  }

  private generateAIMethodCode(method: GeneratedMethod): string {
    const baseMethod = this.generateMethodCode(method);

    // Add provider parameter for AI methods
    if (method.isAIEndpoint) {
      const params = baseMethod.match(/\((.*?)\):/)?.[1] || "";
      const newParams = params
        ? `${params}, provider?: 'ollama' | 'openai' | 'huggingface'`
        : `provider?: 'ollama' | 'openai' | 'huggingface'`;

      return baseMethod.replace(/\(.*?\):/, `(${newParams}):`);
    }

    return baseMethod;
  }

  private checkIfStreamingEndpoint(
    path: string,
    operation: OpenAPIV3.OperationObject
  ): boolean {
    if (path.includes("/stream")) {
      return true;
    }

    const response200 = operation.responses?.["200"];
    if (!response200 || "$ref" in response200) {
      return false;
    }

    return response200.content?.["text/event-stream"] !== undefined;
  }
}

// Utility function to generate API client from OpenAPI schema
export function generateApiClientFromSchema(
  schema: OpenAPIV3.Document
): string {
  const generator = new ApiMethodGenerator(schema);
  const client = generator.generateApiClient();

  return `${client.imports.join("\n")}

${client.interfaces.join("\n")}

${client.methods.join("\n")}

// Export all API groups
export { ${client.exports.join(", ")} };

// Default export combines all APIs
export default {
  ${client.exports.join(",\n  ")}
};
`;
}
