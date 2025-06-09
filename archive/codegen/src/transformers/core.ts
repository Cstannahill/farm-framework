// tools/codegen/src/transformers/core.ts
import { OpenAPISchema } from "../schema/extractor";

export interface TypeTransformationContext {
  schema: OpenAPISchema;
  currentPath: string[];
  visitedRefs: Set<string>;
  generatedTypes: Map<string, string>;
  options: TypeTransformationOptions;
}

export interface TypeTransformationOptions {
  enumType: "union" | "enum" | "const";
  dateType: "string" | "Date";
  strictNullChecks: boolean;
  generateComments: boolean;
  useReadonly: boolean;
  arrayType: "Array<T>" | "T[]";
  objectType: "Record<string, T>" | "{ [key: string]: T }";
  nullableType: "T | null" | "T | undefined" | "T | null | undefined";
  discriminatedUnions: boolean;
}

export interface TypeInfo {
  typeName: string;
  isNullable: boolean;
  isOptional: boolean;
  description?: string;
  example?: any;
  constraints?: TypeConstraints;
}

export interface TypeConstraints {
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  pattern?: string;
  format?: string;
  enum?: any[];
}

export class OpenAPITypeTransformer {
  private context: TypeTransformationContext;

  constructor(
    schema: OpenAPISchema,
    options: Partial<TypeTransformationOptions> = {}
  ) {
    this.context = {
      schema,
      currentPath: [],
      visitedRefs: new Set(),
      generatedTypes: new Map(),
      options: {
        enumType: "union",
        dateType: "string",
        strictNullChecks: true,
        generateComments: true,
        useReadonly: false,
        arrayType: "Array<T>",
        objectType: "Record<string, T>",
        nullableType: "T | null",
        discriminatedUnions: true,
        ...options,
      },
    };
  }

  /**
   * Transform OpenAPI schema to TypeScript type string
   */
  transformType(
    schema: any,
    context?: Partial<TypeTransformationContext>
  ): TypeInfo {
    const ctx = context ? { ...this.context, ...context } : this.context;
    return this.transformSchemaType(schema, ctx);
  }

  /**
   * Core type transformation logic
   */
  private transformSchemaType(
    schema: any,
    ctx: TypeTransformationContext
  ): TypeInfo {
    if (!schema) {
      return { typeName: "any", isNullable: false, isOptional: false };
    }

    // Handle $ref
    if (schema.$ref) {
      return this.handleReference(schema.$ref, ctx);
    }

    // Handle nullable types
    const isNullable = schema.nullable === true;
    const typeInfo = this.getBaseTypeInfo(schema, ctx);

    if (isNullable) {
      typeInfo.typeName = this.makeNullable(typeInfo.typeName, ctx.options);
      typeInfo.isNullable = true;
    }

    // Add constraints and metadata
    typeInfo.description = schema.description;
    typeInfo.example = schema.example;
    typeInfo.constraints = this.extractConstraints(schema);

    return typeInfo;
  }

  /**
   * Get base type information without nullable wrapper
   */
  private getBaseTypeInfo(
    schema: any,
    ctx: TypeTransformationContext
  ): TypeInfo {
    // Handle oneOf/anyOf (union types)
    if (schema.oneOf || schema.anyOf) {
      return this.handleUnionType(schema, ctx);
    }

    // Handle allOf (intersection types)
    if (schema.allOf) {
      return this.handleIntersectionType(schema, ctx);
    }

    // Handle arrays
    if (schema.type === "array") {
      return this.handleArrayType(schema, ctx);
    }

    // Handle objects
    if (schema.type === "object" || schema.properties) {
      return this.handleObjectType(schema, ctx);
    }

    // Handle enums
    if (schema.enum) {
      return this.handleEnumType(schema, ctx);
    }

    // Handle primitive types
    return this.handlePrimitiveType(schema, ctx);
  }

  /**
   * Handle $ref references
   */
  private handleReference(
    ref: string,
    ctx: TypeTransformationContext
  ): TypeInfo {
    // Prevent circular references
    if (ctx.visitedRefs.has(ref)) {
      const typeName = this.extractTypeNameFromRef(ref);
      return { typeName, isNullable: false, isOptional: false };
    }

    ctx.visitedRefs.add(ref);

    try {
      const resolvedSchema = this.resolveReference(ref, ctx.schema);
      const typeName = this.extractTypeNameFromRef(ref);

      // Store the resolved type for later generation
      if (!ctx.generatedTypes.has(typeName)) {
        const typeInfo = this.transformSchemaType(resolvedSchema, {
          ...ctx,
          currentPath: [...ctx.currentPath, typeName],
        });
        ctx.generatedTypes.set(typeName, typeInfo.typeName);
      }

      return { typeName, isNullable: false, isOptional: false };
    } finally {
      ctx.visitedRefs.delete(ref);
    }
  }

  /**
   * Handle union types (oneOf/anyOf)
   */
  private handleUnionType(
    schema: any,
    ctx: TypeTransformationContext
  ): TypeInfo {
    const unionSchemas = schema.oneOf || schema.anyOf;
    const isDiscriminated =
      ctx.options.discriminatedUnions &&
      this.isDiscriminatedUnion(unionSchemas);

    if (isDiscriminated) {
      return this.handleDiscriminatedUnion(schema, unionSchemas, ctx);
    }

    // Regular union type
    const memberTypes = unionSchemas.map((memberSchema: any) => {
      const memberInfo = this.transformSchemaType(memberSchema, ctx);
      return memberInfo.typeName;
    });

    const typeName = memberTypes.join(" | ");
    return { typeName, isNullable: false, isOptional: false };
  }

  /**
   * Handle discriminated union types
   */
  private handleDiscriminatedUnion(
    schema: any,
    unionSchemas: any[],
    ctx: TypeTransformationContext
  ): TypeInfo {
    const discriminator = schema.discriminator;

    if (!discriminator) {
      // Fall back to regular union
      return this.handleUnionType(schema, ctx);
    }

    const discriminatorProperty = discriminator.propertyName;
    const memberTypes: string[] = [];

    for (const memberSchema of unionSchemas) {
      if (memberSchema.$ref) {
        const typeName = this.extractTypeNameFromRef(memberSchema.$ref);
        memberTypes.push(typeName);
      } else if (
        memberSchema.properties &&
        memberSchema.properties[discriminatorProperty]
      ) {
        // Generate inline type with discriminator
        const memberInfo = this.transformSchemaType(memberSchema, ctx);
        memberTypes.push(`(${memberInfo.typeName})`);
      }
    }

    const typeName = memberTypes.join(" | ");
    return { typeName, isNullable: false, isOptional: false };
  }

  /**
   * Handle intersection types (allOf)
   */
  private handleIntersectionType(
    schema: any,
    ctx: TypeTransformationContext
  ): TypeInfo {
    const intersectionTypes = schema.allOf.map((memberSchema: any) => {
      const memberInfo = this.transformSchemaType(memberSchema, ctx);
      return memberInfo.typeName;
    });

    const typeName = intersectionTypes.join(" & ");
    return { typeName, isNullable: false, isOptional: false };
  }

  /**
   * Handle array types
   */
  private handleArrayType(
    schema: any,
    ctx: TypeTransformationContext
  ): TypeInfo {
    const itemsInfo = this.transformSchemaType(schema.items, ctx);

    const typeName =
      ctx.options.arrayType === "Array<T>"
        ? `Array<${itemsInfo.typeName}>`
        : `${itemsInfo.typeName}[]`;

    return { typeName, isNullable: false, isOptional: false };
  }

  /**
   * Handle object types
   */
  private handleObjectType(
    schema: any,
    ctx: TypeTransformationContext
  ): TypeInfo {
    if (!schema.properties && !schema.additionalProperties) {
      // Generic object
      return {
        typeName: ctx.options.objectType.replace("T", "any"),
        isNullable: false,
        isOptional: false,
      };
    }

    if (schema.properties) {
      // Structured object - should be handled by interface generation
      const properties = this.generateObjectProperties(schema, ctx);
      const typeName = `{ ${properties.join("; ")} }`;
      return { typeName, isNullable: false, isOptional: false };
    }

    if (schema.additionalProperties) {
      // Map-like object
      const valueType =
        schema.additionalProperties === true
          ? "any"
          : this.transformSchemaType(schema.additionalProperties, ctx).typeName;

      const typeName = ctx.options.objectType.replace("T", valueType);
      return { typeName, isNullable: false, isOptional: false };
    }

    return { typeName: "object", isNullable: false, isOptional: false };
  }

  /**
   * Handle enum types
   */
  private handleEnumType(
    schema: any,
    ctx: TypeTransformationContext
  ): TypeInfo {
    const enumValues = schema.enum;

    switch (ctx.options.enumType) {
      case "enum":
        // Will be handled by enum generation
        const enumName = this.generateEnumName(schema, ctx);
        return { typeName: enumName, isNullable: false, isOptional: false };

      case "const":
        // Const assertions
        const constValues = enumValues
          .map((value: any) => `${JSON.stringify(value)} as const`)
          .join(" | ");
        return { typeName: constValues, isNullable: false, isOptional: false };

      case "union":
      default:
        // Union type
        const unionValues = enumValues
          .map((value: any) => JSON.stringify(value))
          .join(" | ");
        return { typeName: unionValues, isNullable: false, isOptional: false };
    }
  }

  /**
   * Handle primitive types
   */
  private handlePrimitiveType(
    schema: any,
    ctx: TypeTransformationContext
  ): TypeInfo {
    switch (schema.type) {
      case "string":
        return this.handleStringType(schema, ctx);

      case "number":
      case "integer":
        return { typeName: "number", isNullable: false, isOptional: false };

      case "boolean":
        return { typeName: "boolean", isNullable: false, isOptional: false };

      case "null":
        return { typeName: "null", isNullable: false, isOptional: false };

      default:
        return { typeName: "any", isNullable: false, isOptional: false };
    }
  }

  /**
   * Handle string types with format considerations
   */
  private handleStringType(
    schema: any,
    ctx: TypeTransformationContext
  ): TypeInfo {
    if (schema.format === "date-time" || schema.format === "date") {
      const typeName = ctx.options.dateType === "Date" ? "Date" : "string";
      return { typeName, isNullable: false, isOptional: false };
    }

    return { typeName: "string", isNullable: false, isOptional: false };
  }

  /**
   * Generate object properties for inline objects
   */
  private generateObjectProperties(
    schema: any,
    ctx: TypeTransformationContext
  ): string[] {
    const properties: string[] = [];
    const required = schema.required || [];

    for (const [propName, propSchema] of Object.entries(
      schema.properties || {}
    )) {
      const isRequired = required.includes(propName);
      const optional = isRequired ? "" : "?";
      const readonly = ctx.options.useReadonly ? "readonly " : "";

      const propInfo = this.transformSchemaType(propSchema, ctx);
      properties.push(
        `${readonly}${propName}${optional}: ${propInfo.typeName}`
      );
    }

    // Handle additionalProperties
    if (schema.additionalProperties === true) {
      properties.push("[key: string]: any");
    } else if (
      schema.additionalProperties &&
      typeof schema.additionalProperties === "object"
    ) {
      const additionalType = this.transformSchemaType(
        schema.additionalProperties,
        ctx
      );
      properties.push(`[key: string]: ${additionalType.typeName}`);
    }

    return properties;
  }

  /**
   * Utility methods
   */
  private makeNullable(
    typeName: string,
    options: TypeTransformationOptions
  ): string {
    return `${typeName} | null`;
  }

  private extractConstraints(schema: any): TypeConstraints | undefined {
    const constraints: TypeConstraints = {};
    let hasConstraints = false;

    if (schema.minLength !== undefined) {
      constraints.minLength = schema.minLength;
      hasConstraints = true;
    }
    if (schema.maxLength !== undefined) {
      constraints.maxLength = schema.maxLength;
      hasConstraints = true;
    }
    if (schema.minimum !== undefined) {
      constraints.minimum = schema.minimum;
      hasConstraints = true;
    }
    if (schema.maximum !== undefined) {
      constraints.maximum = schema.maximum;
      hasConstraints = true;
    }
    if (schema.pattern) {
      constraints.pattern = schema.pattern;
      hasConstraints = true;
    }
    if (schema.format) {
      constraints.format = schema.format;
      hasConstraints = true;
    }
    if (schema.enum) {
      constraints.enum = schema.enum;
      hasConstraints = true;
    }

    return hasConstraints ? constraints : undefined;
  }

  private resolveReference(ref: string, schema: OpenAPISchema): any {
    const parts = ref.split("/").slice(1); // Remove leading #
    let current: any = schema;

    for (const part of parts) {
      if (!current[part]) {
        throw new Error(`Cannot resolve reference: ${ref}`);
      }
      current = current[part];
    }

    return current;
  }

  private extractTypeNameFromRef(ref: string): string {
    const parts = ref.split("/");
    return parts[parts.length - 1];
  }

  private isDiscriminatedUnion(unionSchemas: any[]): boolean {
    // Check if all members have a common discriminator property
    return unionSchemas.every((schema) => {
      if (schema.$ref) return true; // Assume referenced types can be discriminated
      return (
        schema.properties &&
        Object.keys(schema.properties).some(
          (prop) =>
            schema.properties[prop].enum ||
            typeof schema.properties[prop].const !== "undefined"
        )
      );
    });
  }

  private generateEnumName(
    schema: any,
    ctx: TypeTransformationContext
  ): string {
    // Try to derive enum name from context path
    const currentPath = ctx.currentPath;
    if (currentPath.length > 0) {
      return `${currentPath[currentPath.length - 1]}Enum`;
    }

    // Fallback to generic name
    return "UnknownEnum";
  }

  /**
   * Get all generated types for external access
   */
  getGeneratedTypes(): Map<string, string> {
    return new Map(this.context.generatedTypes);
  }

  /**
   * Clear transformation state
   */
  reset(): void {
    this.context.visitedRefs.clear();
    this.context.generatedTypes.clear();
    this.context.currentPath = [];
  }
}
