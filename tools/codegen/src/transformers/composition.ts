// tools/codegen/src/transformers/composition.ts
import {
  OpenAPITypeTransformer,
  TypeInfo,
  TypeTransformationContext,
} from "./core";
import { OpenAPISchema } from "../schema/extractor";

export interface CompositionOptions {
  maxDepth: number;
  resolveAllReferences: boolean;
  generateUtilityTypes: boolean;
  handleCircularRefs: boolean;
  inlineSimpleTypes: boolean;
  generateTypeHelpers: boolean;
  strictComposition: boolean;
}

export interface CompositionResult {
  typeName: string;
  content: string;
  dependencies: string[];
  utilityTypes: string[];
  helpers: string[];
  complexity: number;
}

export interface ReferenceInfo {
  ref: string;
  typeName: string;
  resolved: any;
  circular: boolean;
  depth: number;
}

export class TypeCompositionHandler {
  private transformer: OpenAPITypeTransformer;
  private options: Required<CompositionOptions>;
  private referenceCache = new Map<string, ReferenceInfo>();
  private compositionStack: string[] = [];

  constructor(
    schema: OpenAPISchema,
    options: Partial<CompositionOptions> = {}
  ) {
    this.options = {
      maxDepth: 10,
      resolveAllReferences: true,
      generateUtilityTypes: true,
      handleCircularRefs: true,
      inlineSimpleTypes: false,
      generateTypeHelpers: true,
      strictComposition: true,
      ...options,
    };

    this.transformer = new OpenAPITypeTransformer(schema, {
      discriminatedUnions: true,
    });
  }

  /**
   * Handle complex type composition
   */
  composeType(name: string, schema: any): CompositionResult {
    const dependencies: string[] = [];
    const utilityTypes: string[] = [];
    const helpers: string[] = [];

    // Reset composition state
    this.compositionStack = [];

    const { typeName, content, complexity } = this.processComposition(
      name,
      schema,
      0
    );

    // Generate utility types if requested
    if (this.options.generateUtilityTypes) {
      utilityTypes.push(...this.generateUtilityTypes(name, schema));
    }

    // Generate type helpers if requested
    if (this.options.generateTypeHelpers) {
      helpers.push(...this.generateTypeHelpers(name, schema));
    }

    return {
      typeName,
      content,
      dependencies: Array.from(new Set(dependencies)),
      utilityTypes,
      helpers,
      complexity,
    };
  }

  /**
   * Process complex composition schema
   */
  private processComposition(
    name: string,
    schema: any,
    depth: number
  ): {
    typeName: string;
    content: string;
    complexity: number;
  } {
    if (depth > this.options.maxDepth) {
      throw new Error(`Maximum composition depth exceeded for type: ${name}`);
    }

    // Handle different composition types
    if (schema.allOf) {
      return this.handleAllOf(name, schema, depth);
    }

    if (schema.oneOf || schema.anyOf) {
      return this.handleOneOfAnyOf(name, schema, depth);
    }

    if (schema.$ref) {
      return this.handleReference(name, schema.$ref, depth);
    }

    if (schema.type === "object" || schema.properties) {
      return this.handleObjectComposition(name, schema, depth);
    }

    if (schema.type === "array") {
      return this.handleArrayComposition(name, schema, depth);
    }

    // Fallback to simple type
    const typeInfo = this.transformer.transformType(schema);
    return {
      typeName: typeInfo.typeName,
      content: "",
      complexity: 1,
    };
  }

  /**
   * Handle allOf composition (intersection types)
   */
  private handleAllOf(
    name: string,
    schema: any,
    depth: number
  ): {
    typeName: string;
    content: string;
    complexity: number;
  } {
    const lines: string[] = [];
    const intersectionTypes: string[] = [];
    let totalComplexity = 0;

    // Add composition comment
    if (schema.description) {
      lines.push("/**");
      lines.push(` * ${schema.description}`);
      lines.push(" * @composition allOf (intersection)");
      lines.push(" */");
    }

    // Process each allOf member
    for (let i = 0; i < schema.allOf.length; i++) {
      const member = schema.allOf[i];
      const memberName = `${name}Member${i + 1}`;

      if (member.$ref) {
        // Reference type
        const refInfo = this.resolveReference(member.$ref, depth + 1);
        intersectionTypes.push(refInfo.typeName);
        totalComplexity += 1;
      } else if (this.isSimpleType(member) && this.options.inlineSimpleTypes) {
        // Inline simple type
        const typeInfo = this.transformer.transformType(member);
        intersectionTypes.push(`(${typeInfo.typeName})`);
        totalComplexity += 1;
      } else {
        // Complex member - generate as separate type
        const memberResult = this.processComposition(
          memberName,
          member,
          depth + 1
        );

        if (memberResult.content) {
          lines.push(memberResult.content);
          lines.push("");
        }

        intersectionTypes.push(memberResult.typeName);
        totalComplexity += memberResult.complexity;
      }
    }

    // Generate intersection type
    const intersectionType = intersectionTypes.join(" & ");
    lines.push(`export type ${name} = ${intersectionType};`);

    return {
      typeName: name,
      content: lines.join("\n"),
      complexity: totalComplexity,
    };
  }

  /**
   * Handle oneOf/anyOf composition (union types)
   */
  private handleOneOfAnyOf(
    name: string,
    schema: any,
    depth: number
  ): {
    typeName: string;
    content: string;
    complexity: number;
  } {
    const lines: string[] = [];
    const unionTypes: string[] = [];
    const compositionType = schema.oneOf ? "oneOf" : "anyOf";
    const unionSchemas = schema.oneOf || schema.anyOf;
    let totalComplexity = 0;

    // Add composition comment
    if (schema.description) {
      lines.push("/**");
      lines.push(` * ${schema.description}`);
      lines.push(` * @composition ${compositionType} (union)`);
      lines.push(" */");
    }

    // Check for discriminated union
    const discriminator = schema.discriminator;
    if (discriminator) {
      lines.push(`/**`);
      lines.push(
        ` * Discriminated union with discriminator: ${discriminator.propertyName}`
      );
      lines.push(` */`);
    }

    // Process each union member
    for (let i = 0; i < unionSchemas.length; i++) {
      const member = unionSchemas[i];
      const memberName = `${name}${
        discriminator
          ? this.getDiscriminatorValue(member, discriminator)
          : `Variant${i + 1}`
      }`;

      if (member.$ref) {
        // Reference type
        const refInfo = this.resolveReference(member.$ref, depth + 1);
        unionTypes.push(refInfo.typeName);
        totalComplexity += 1;
      } else if (this.isSimpleType(member) && this.options.inlineSimpleTypes) {
        // Inline simple type
        const typeInfo = this.transformer.transformType(member);
        unionTypes.push(`(${typeInfo.typeName})`);
        totalComplexity += 1;
      } else {
        // Complex member
        const memberResult = this.processComposition(
          memberName,
          member,
          depth + 1
        );

        if (memberResult.content) {
          lines.push(memberResult.content);
          lines.push("");
        }

        unionTypes.push(memberResult.typeName);
        totalComplexity += memberResult.complexity;
      }
    }

    // Generate union type
    const unionType = unionTypes.join(" | ");
    lines.push(`export type ${name} = ${unionType};`);

    return {
      typeName: name,
      content: lines.join("\n"),
      complexity: totalComplexity,
    };
  }

  /**
   * Handle reference resolution with circular detection
   */
  private handleReference(
    name: string,
    ref: string,
    depth: number
  ): {
    typeName: string;
    content: string;
    complexity: number;
  } {
    const refInfo = this.resolveReference(ref, depth);

    if (refInfo.circular && this.options.handleCircularRefs) {
      // Handle circular reference
      return {
        typeName: refInfo.typeName,
        content: `// Circular reference detected: ${ref}`,
        complexity: 1,
      };
    }

    return {
      typeName: refInfo.typeName,
      content: "",
      complexity: 1,
    };
  }

  /**
   * Handle object composition with nested properties
   */
  private handleObjectComposition(
    name: string,
    schema: any,
    depth: number
  ): {
    typeName: string;
    content: string;
    complexity: number;
  } {
    const lines: string[] = [];
    let complexity = 1;

    // Add object comment
    if (schema.description) {
      lines.push("/**");
      lines.push(` * ${schema.description}`);
      lines.push(" */");
    }

    lines.push(`export interface ${name} {`);

    // Process properties
    if (schema.properties) {
      const required = schema.required || [];

      for (const [propName, propSchema] of Object.entries(schema.properties)) {
        const isRequired = required.includes(propName);
        const optional = isRequired ? "" : "?";

        // Handle nested compositions
        if (this.isComplexType(propSchema)) {
          const propTypeName = `${name}${this.capitalize(propName)}`;
          const propResult = this.processComposition(
            propTypeName,
            propSchema as any,
            depth + 1
          );

          if (propResult.content) {
            // Generate nested type before interface
            lines.unshift(propResult.content, "");
          }

          lines.push(`  ${propName}${optional}: ${propResult.typeName};`);
          complexity += propResult.complexity;
        } else {
          // Simple property
          const typeInfo = this.transformer.transformType(propSchema);
          lines.push(`  ${propName}${optional}: ${typeInfo.typeName};`);
          complexity += 1;
        }
      }
    }

    // Handle additionalProperties
    if (schema.additionalProperties === true) {
      lines.push(`  [key: string]: any;`);
    } else if (
      schema.additionalProperties &&
      typeof schema.additionalProperties === "object"
    ) {
      const additionalTypeInfo = this.transformer.transformType(
        schema.additionalProperties
      );
      lines.push(`  [key: string]: ${additionalTypeInfo.typeName};`);
    }

    lines.push("}");

    return {
      typeName: name,
      content: lines.join("\n"),
      complexity,
    };
  }

  /**
   * Handle array composition with complex item types
   */
  private handleArrayComposition(
    name: string,
    schema: any,
    depth: number
  ): {
    typeName: string;
    content: string;
    complexity: number;
  } {
    const lines: string[] = [];

    if (schema.items) {
      if (this.isComplexType(schema.items)) {
        const itemTypeName = `${name}Item`;
        const itemResult = this.processComposition(
          itemTypeName,
          schema.items,
          depth + 1
        );

        if (itemResult.content) {
          lines.push(itemResult.content);
          lines.push("");
        }

        lines.push(`export type ${name} = Array<${itemResult.typeName}>;`);

        return {
          typeName: name,
          content: lines.join("\n"),
          complexity: itemResult.complexity + 1,
        };
      } else {
        // Simple array
        const itemTypeInfo = this.transformer.transformType(schema.items);
        return {
          typeName: `Array<${itemTypeInfo.typeName}>`,
          content: "",
          complexity: 1,
        };
      }
    }

    return {
      typeName: "Array<any>",
      content: "",
      complexity: 1,
    };
  }

  /**
   * Resolve reference with circular detection
   */
  private resolveReference(ref: string, depth: number): ReferenceInfo {
    // Check cache first
    if (this.referenceCache.has(ref)) {
      return this.referenceCache.get(ref)!;
    }

    // Check for circular reference
    const circular = this.compositionStack.includes(ref);

    if (circular && !this.options.handleCircularRefs) {
      throw new Error(`Circular reference detected: ${ref}`);
    }

    const typeName = this.extractTypeNameFromRef(ref);

    // Add to stack for circular detection
    this.compositionStack.push(ref);

    try {
      // Resolve the reference (simplified - in real implementation, resolve from schema)
      const resolved = {}; // This would resolve the actual schema

      const refInfo: ReferenceInfo = {
        ref,
        typeName,
        resolved,
        circular,
        depth,
      };

      this.referenceCache.set(ref, refInfo);
      return refInfo;
    } finally {
      // Remove from stack
      this.compositionStack.pop();
    }
  }

  /**
   * Generate utility types for composition
   */
  private generateUtilityTypes(name: string, schema: any): string[] {
    const utilities: string[] = [];

    // Partial type
    utilities.push(`export type Partial${name} = Partial<${name}>;`);

    // Required type
    utilities.push(`export type Required${name} = Required<${name}>;`);

    // Pick utilities for object types
    if (schema.type === "object" || schema.properties) {
      const properties = Object.keys(schema.properties || {});
      if (properties.length > 0) {
        const propsUnion = properties.map((p) => `'${p}'`).join(" | ");
        utilities.push(`export type ${name}Keys = ${propsUnion};`);
        utilities.push(
          `export type Pick${name}<K extends ${name}Keys> = Pick<${name}, K>;`
        );
        utilities.push(
          `export type Omit${name}<K extends ${name}Keys> = Omit<${name}, K>;`
        );
      }
    }

    // Readonly type
    utilities.push(`export type Readonly${name} = Readonly<${name}>;`);

    // Deep partial for nested objects
    if (this.hasNestedObjects(schema)) {
      utilities.push(`export type DeepPartial${name} = {`);
      utilities.push(
        `  [P in keyof ${name}]?: ${name}[P] extends object ? DeepPartial${name}[P] : ${name}[P];`
      );
      utilities.push(`};`);
    }

    return utilities;
  }

  /**
   * Generate type helpers for composition
   */
  private generateTypeHelpers(name: string, schema: any): string[] {
    const helpers: string[] = [];

    // Type guard
    helpers.push(`/**`);
    helpers.push(` * Type guard for ${name}`);
    helpers.push(` */`);
    helpers.push(`export function is${name}(value: any): value is ${name} {`);
    helpers.push(`  return value && typeof value === 'object';`);
    helpers.push(`}`);
    helpers.push("");

    // Deep clone helper for complex types
    if (this.hasNestedObjects(schema)) {
      helpers.push(`/**`);
      helpers.push(` * Deep clone ${name}`);
      helpers.push(` */`);
      helpers.push(`export function clone${name}(value: ${name}): ${name} {`);
      helpers.push(`  return JSON.parse(JSON.stringify(value));`);
      helpers.push(`}`);
      helpers.push("");
    }

    // Merge helper for object types
    if (schema.type === "object" || schema.properties) {
      helpers.push(`/**`);
      helpers.push(` * Merge ${name} objects`);
      helpers.push(` */`);
      helpers.push(
        `export function merge${name}(...objects: Partial${name}[]): ${name} {`
      );
      helpers.push(`  return Object.assign({}, ...objects) as ${name};`);
      helpers.push(`}`);
      helpers.push("");
    }

    return helpers;
  }

  /**
   * Utility methods
   */
  private isSimpleType(schema: any): boolean {
    return (
      schema.type &&
      ["string", "number", "integer", "boolean"].includes(schema.type) &&
      !schema.allOf &&
      !schema.oneOf &&
      !schema.anyOf &&
      !schema.properties
    );
  }

  private isComplexType(schema: any): boolean {
    return !!(
      schema.allOf ||
      schema.oneOf ||
      schema.anyOf ||
      schema.properties ||
      schema.additionalProperties ||
      (schema.type === "array" && this.isComplexType(schema.items))
    );
  }

  private hasNestedObjects(schema: any): boolean {
    if (schema.properties) {
      return Object.values(schema.properties).some(
        (prop: any) => prop.type === "object" || prop.properties
      );
    }
    return false;
  }

  private getDiscriminatorValue(schema: any, discriminator: any): string {
    if (schema.properties && schema.properties[discriminator.propertyName]) {
      const discriminatorProp = schema.properties[discriminator.propertyName];
      if (discriminatorProp.enum && discriminatorProp.enum.length === 1) {
        return this.capitalize(String(discriminatorProp.enum[0]));
      }
      if (discriminatorProp.const !== undefined) {
        return this.capitalize(String(discriminatorProp.const));
      }
    }
    return "Unknown";
  }

  private extractTypeNameFromRef(ref: string): string {
    const parts = ref.split("/");
    return parts[parts.length - 1];
  }

  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}
