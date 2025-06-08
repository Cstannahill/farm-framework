// tools/codegen/src/type-generator.ts
import { OpenAPIV3 } from "openapi-types";
import { pascalCase, camelCase } from "change-case";

export interface GeneratedType {
  name: string;
  definition: string;
  description?: string;
  isEnum: boolean;
  dependencies: string[];
}

export interface TypeGenerationResult {
  types: GeneratedType[];
  imports: string[];
  exports: string[];
}

export class TypeGenerator {
  private schema: OpenAPIV3.Document;
  private generatedTypes = new Map<string, GeneratedType>();
  private typeQueue = new Set<string>();

  constructor(schema: OpenAPIV3.Document) {
    this.schema = schema;
  }

  public generateTypes(): TypeGenerationResult {
    // Generate types from components/schemas
    if (this.schema.components?.schemas) {
      for (const [name, schema] of Object.entries(
        this.schema.components.schemas
      )) {
        this.generateTypeFromSchema(name, schema);
      }
    }

    // Generate request/response types from paths
    this.generatePathTypes();

    // Process the type queue until all dependencies are resolved
    while (this.typeQueue.size > 0) {
      const typeName = this.typeQueue.values().next().value;
      if (!typeName) break; // Safety check for undefined

      this.typeQueue.delete(typeName);

      if (!this.generatedTypes.has(typeName)) {
        this.generateMissingType(typeName);
      }
    }

    return this.buildResult();
  }

  private generateTypeFromSchema(
    name: string,
    schema: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject
  ): GeneratedType {
    const typeName = pascalCase(name);

    if (this.generatedTypes.has(typeName)) {
      return this.generatedTypes.get(typeName)!;
    }

    if ("$ref" in schema) {
      // Handle reference types
      const refType = this.resolveReference(schema.$ref);
      return this.generateTypeFromSchema(name, refType);
    }

    let definition: string;
    let isEnum = false;
    const dependencies: string[] = [];

    if (schema.enum) {
      // Generate enum type
      isEnum = true;
      definition = this.generateEnumType(schema.enum);
    } else if (schema.type === "object" || schema.properties) {
      // Generate interface
      definition = this.generateInterfaceType(schema, dependencies);
    } else if (schema.type === "array") {
      // Generate array type
      const itemType = this.convertSchemaToType(schema.items, dependencies);
      definition = `${itemType}[]`;
    } else if (schema.oneOf || schema.anyOf || schema.allOf) {
      // Generate union/intersection types
      definition = this.generateUnionType(schema, dependencies);
    } else {
      // Generate primitive type alias
      definition = this.convertSchemaToType(schema, dependencies);
    }

    const generatedType: GeneratedType = {
      name: typeName,
      definition,
      description: schema.description,
      isEnum,
      dependencies,
    };

    this.generatedTypes.set(typeName, generatedType);
    return generatedType;
  }

  private generatePathTypes(): void {
    if (!this.schema.paths) return;

    for (const [path, pathItem] of Object.entries(this.schema.paths)) {
      if (!pathItem) continue;

      const methods = ["get", "post", "put", "patch", "delete"] as const;

      for (const method of methods) {
        const operation = pathItem[method] as OpenAPIV3.OperationObject;
        if (!operation) continue;

        this.generateOperationTypes(operation);
      }
    }
  }

  private generateOperationTypes(operation: OpenAPIV3.OperationObject): void {
    const operationId = operation.operationId;
    if (!operationId) return;

    const baseName = pascalCase(operationId);

    // Generate request type
    if (operation.requestBody) {
      this.generateRequestType(`${baseName}Request`, operation.requestBody);
    }

    // Generate response types
    if (operation.responses) {
      this.generateResponseTypes(baseName, operation.responses);
    }
  }

  private generateRequestType(
    typeName: string,
    requestBody: OpenAPIV3.RequestBodyObject | OpenAPIV3.ReferenceObject
  ): void {
    if ("$ref" in requestBody) {
      const resolved = this.resolveReference(requestBody.$ref);
      this.generateRequestType(typeName, resolved);
      return;
    }

    const content = requestBody.content;
    const jsonContent = content?.["application/json"];

    if (jsonContent?.schema) {
      const dependencies: string[] = [];
      const definition = this.convertSchemaToType(
        jsonContent.schema,
        dependencies
      );

      this.generatedTypes.set(typeName, {
        name: typeName,
        definition,
        description: requestBody.description,
        isEnum: false,
        dependencies,
      });
    }
  }

  private generateResponseTypes(
    baseName: string,
    responses: OpenAPIV3.ResponsesObject
  ): void {
    // Generate response type for successful responses
    const successResponse =
      responses["200"] || responses["201"] || responses["default"];

    if (successResponse && !("$ref" in successResponse)) {
      const content = successResponse.content;
      const jsonContent = content?.["application/json"];

      if (jsonContent?.schema) {
        const dependencies: string[] = [];
        const definition = this.convertSchemaToType(
          jsonContent.schema,
          dependencies
        );

        this.generatedTypes.set(`${baseName}Response`, {
          name: `${baseName}Response`,
          definition,
          description: successResponse.description,
          isEnum: false,
          dependencies,
        });
      }
    }

    // Generate error response types if present
    for (const [statusCode, response] of Object.entries(responses)) {
      if (statusCode.startsWith("4") || statusCode.startsWith("5")) {
        const errorTypeName = `${baseName}Error${statusCode}`;

        if (
          !("$ref" in response) &&
          response.content?.["application/json"]?.schema
        ) {
          const dependencies: string[] = [];
          const definition = this.convertSchemaToType(
            response.content["application/json"].schema,
            dependencies
          );

          this.generatedTypes.set(errorTypeName, {
            name: errorTypeName,
            definition,
            description: response.description,
            isEnum: false,
            dependencies,
          });
        }
      }
    }
  }

  private generateInterfaceType(
    schema: OpenAPIV3.SchemaObject,
    dependencies: string[]
  ): string {
    const properties = schema.properties || {};
    const required = schema.required || [];

    const propertyLines: string[] = [];

    for (const [propName, propSchema] of Object.entries(properties)) {
      const isRequired = required.includes(propName);
      const propType = this.convertSchemaToType(propSchema, dependencies);
      const optional = isRequired ? "" : "?";
      const description =
        "description" in propSchema ? propSchema.description : undefined;

      if (description) {
        propertyLines.push(`  /** ${description} */`);
      }

      propertyLines.push(`  ${propName}${optional}: ${propType};`);
    }

    return `interface {
${propertyLines.join("\n")}
}`;
  }

  private generateEnumType(enumValues: any[]): string {
    const values = enumValues
      .map((value) => (typeof value === "string" ? `'${value}'` : value))
      .join(" | ");

    return values;
  }

  private generateUnionType(
    schema: OpenAPIV3.SchemaObject,
    dependencies: string[]
  ): string {
    if (schema.oneOf) {
      const types = schema.oneOf.map((s) =>
        this.convertSchemaToType(s, dependencies)
      );
      return types.join(" | ");
    }

    if (schema.anyOf) {
      const types = schema.anyOf.map((s) =>
        this.convertSchemaToType(s, dependencies)
      );
      return types.join(" | ");
    }

    if (schema.allOf) {
      const types = schema.allOf.map((s) =>
        this.convertSchemaToType(s, dependencies)
      );
      return types.join(" & ");
    }

    return "any";
  }

  private convertSchemaToType(
    schema: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject | any,
    dependencies: string[]
  ): string {
    if (!schema) return "any";

    if ("$ref" in schema) {
      const typeName = this.extractTypeNameFromRef(schema.$ref);
      dependencies.push(typeName);
      this.typeQueue.add(typeName);
      return typeName;
    }

    if (schema.type) {
      switch (schema.type) {
        case "string":
          if (schema.enum) {
            return schema.enum.map((v: any) => `'${v}'`).join(" | ");
          }
          if (schema.format === "date-time") return "string"; // Could be Date
          if (schema.format === "date") return "string";
          if (schema.format === "uuid") return "string";
          return "string";

        case "number":
        case "integer":
          return "number";

        case "boolean":
          return "boolean";

        case "array":
          const itemType = this.convertSchemaToType(schema.items, dependencies);
          return `${itemType}[]`;

        case "object":
          if (schema.additionalProperties === true) {
            return "Record<string, any>";
          }
          if (
            schema.additionalProperties &&
            typeof schema.additionalProperties === "object"
          ) {
            const valueType = this.convertSchemaToType(
              schema.additionalProperties,
              dependencies
            );
            return `Record<string, ${valueType}>`;
          }
          if (schema.properties) {
            // Generate inline interface for small objects
            const props = Object.entries(schema.properties)
              .map(([key, prop]: [string, any]) => {
                const optional = !schema.required?.includes(key) ? "?" : "";
                const type = this.convertSchemaToType(prop, dependencies);
                return `${key}${optional}: ${type}`;
              })
              .join("; ");
            return `{ ${props} }`;
          }
          return "Record<string, any>";

        default:
          return "any";
      }
    }

    if (schema.oneOf || schema.anyOf) {
      const unionTypes = (schema.oneOf || schema.anyOf)
        .map((s: any) => this.convertSchemaToType(s, dependencies))
        .join(" | ");
      return unionTypes;
    }

    if (schema.allOf) {
      const intersectionTypes = schema.allOf
        .map((s: any) => this.convertSchemaToType(s, dependencies))
        .join(" & ");
      return intersectionTypes;
    }

    return "any";
  }

  private resolveReference(ref: string): any {
    const parts = ref.split("/");
    let current: any = this.schema;

    for (const part of parts.slice(1)) {
      // Skip the first '#'
      current = current?.[part];
    }

    return current;
  }

  private extractTypeNameFromRef(ref: string): string {
    const parts = ref.split("/");
    return pascalCase(parts[parts.length - 1]);
  }

  private generateMissingType(typeName: string): void {
    // Try to find the type in components/schemas
    const schema =
      this.schema.components?.schemas?.[typeName] ||
      this.schema.components?.schemas?.[camelCase(typeName)];

    if (schema) {
      this.generateTypeFromSchema(typeName, schema);
    } else {
      // Generate a placeholder type
      this.generatedTypes.set(typeName, {
        name: typeName,
        definition: "any",
        description: `Generated placeholder for ${typeName}`,
        isEnum: false,
        dependencies: [],
      });
    }
  }

  private buildResult(): TypeGenerationResult {
    const types = Array.from(this.generatedTypes.values());
    const imports: string[] = [];
    const exports: string[] = [];

    // Sort types by dependencies (types with no dependencies first)
    const sortedTypes = this.topologicalSort(types);

    // Build exports
    sortedTypes.forEach((type) => {
      exports.push(type.name);
    });

    return {
      types: sortedTypes,
      imports,
      exports,
    };
  }

  private topologicalSort(types: GeneratedType[]): GeneratedType[] {
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const result: GeneratedType[] = [];
    const typeMap = new Map(types.map((t) => [t.name, t]));

    function visit(typeName: string): void {
      if (visited.has(typeName)) return;
      if (visiting.has(typeName)) {
        // Circular dependency detected - this is okay for TypeScript interfaces
        return;
      }

      visiting.add(typeName);
      const type = typeMap.get(typeName);

      if (type) {
        // Visit dependencies first
        type.dependencies.forEach((dep) => {
          if (typeMap.has(dep)) {
            visit(dep);
          }
        });

        result.push(type);
        visited.add(typeName);
      }

      visiting.delete(typeName);
    }

    types.forEach((type) => visit(type.name));
    return result;
  }
}

// Utility function to generate TypeScript types from OpenAPI schema
export function generateTypesFromSchema(schema: OpenAPIV3.Document): string {
  const generator = new TypeGenerator(schema);
  const result = generator.generateTypes();

  const typeDefinitions = result.types.map((type) => {
    const description = type.description ? `/** ${type.description} */\n` : "";
    const keyword = type.isEnum ? "type" : "interface";

    if (type.isEnum) {
      return `${description}export type ${type.name} = ${type.definition};`;
    } else if (type.definition.startsWith("interface")) {
      return `${description}export ${type.definition.replace(
        "interface",
        `interface ${type.name}`
      )}`;
    } else {
      return `${description}export type ${type.name} = ${type.definition};`;
    }
  });

  return `// Auto-generated types from OpenAPI schema
// Do not edit this file manually

${result.imports.join("\n")}

${typeDefinitions.join("\n\n")}

// Export all types
export type {
  ${result.exports.join(",\n  ")}
};
`;
}

// Common type utilities for FARM applications
export const commonTypes = `
// Common types for FARM applications
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

/**
 * @deprecated Moved to `@farm/types` package
 */
export interface AIProvider {
  name: 'ollama' | 'openai' | 'huggingface';
  status: 'healthy' | 'unhealthy' | 'loading';
  models: string[];
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

export interface StreamingResponse {
  content: string;
  done: boolean;
  model?: string;
  provider?: string;
}
`;
