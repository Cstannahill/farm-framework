// tools/codegen/src/transformers/union.ts
import { OpenAPITypeTransformer, TypeInfo } from "./core";
import { OpenAPISchema } from "../schema/extractor";

export interface UnionTypeOptions {
  preferDiscriminatedUnions: boolean;
  generateTypeGuards: boolean;
  generateUnionHelpers: boolean;
  strictDiscrimination: boolean;
  inlineUnions: boolean;
  maxInlineComplexity: number;
}

export interface DiscriminatorInfo {
  propertyName: string;
  mapping?: Record<string, string>;
  implicit: boolean;
}

export interface UnionMemberInfo {
  typeName: string;
  discriminatorValue?: string | number;
  schema: any;
  isInline: boolean;
  complexity: number;
}

export interface GeneratedUnion {
  name: string;
  content: string;
  members: UnionMemberInfo[];
  discriminator?: DiscriminatorInfo;
  isDiscriminated: boolean;
  typeGuards: string[];
  helpers: string[];
}

export class UnionTypeHandler {
  private transformer: OpenAPITypeTransformer;
  private options: Required<UnionTypeOptions>;

  constructor(schema: OpenAPISchema, options: Partial<UnionTypeOptions> = {}) {
    this.options = {
      preferDiscriminatedUnions: true,
      generateTypeGuards: true,
      generateUnionHelpers: true,
      strictDiscrimination: true,
      inlineUnions: false,
      maxInlineComplexity: 3,
      ...options,
    };

    this.transformer = new OpenAPITypeTransformer(schema, {
      discriminatedUnions: this.options.preferDiscriminatedUnions,
    });
  }

  /**
   * Generate union type from oneOf/anyOf schema
   */
  generateUnionType(name: string, schema: any): GeneratedUnion {
    const unionSchemas = schema.oneOf || schema.anyOf || [];
    const discriminator = this.extractDiscriminator(schema, unionSchemas);
    const members = this.generateUnionMembers(unionSchemas, discriminator);

    const isDiscriminated = !!discriminator && !!discriminator.propertyName;
    const content = this.buildUnionContent(
      name,
      schema,
      members,
      discriminator,
      isDiscriminated
    );

    const result: GeneratedUnion = {
      name,
      content,
      members,
      discriminator,
      isDiscriminated,
      typeGuards: [],
      helpers: [],
    };

    // Generate type guards if requested
    if (this.options.generateTypeGuards) {
      result.typeGuards = this.generateTypeGuards(name, members, discriminator);
    }

    // Generate helper functions if requested
    if (this.options.generateUnionHelpers) {
      result.helpers = this.generateUnionHelpers(name, members, discriminator);
    }

    return result;
  }

  /**
   * Extract discriminator information from schema
   */
  private extractDiscriminator(
    schema: any,
    unionSchemas: any[]
  ): DiscriminatorInfo | undefined {
    // Explicit discriminator
    if (schema.discriminator) {
      return {
        propertyName: schema.discriminator.propertyName,
        mapping: schema.discriminator.mapping,
        implicit: false,
      };
    }

    // Implicit discriminator detection
    if (this.options.preferDiscriminatedUnions) {
      const implicitDiscriminator =
        this.detectImplicitDiscriminator(unionSchemas);
      if (implicitDiscriminator) {
        return {
          propertyName: implicitDiscriminator,
          implicit: true,
        };
      }
    }

    return undefined;
  }

  /**
   * Detect implicit discriminator property
   */
  private detectImplicitDiscriminator(unionSchemas: any[]): string | undefined {
    const propertyOccurrences = new Map<string, Set<any>>();

    // Collect properties and their possible values
    for (const memberSchema of unionSchemas) {
      const resolvedSchema = this.resolveSchemaRef(memberSchema);

      if (resolvedSchema.properties) {
        for (const [propName, propSchema] of Object.entries(
          resolvedSchema.properties
        )) {
          if (!propertyOccurrences.has(propName)) {
            propertyOccurrences.set(propName, new Set());
          }

          // Check for enum values or const values
          const prop = propSchema as any;
          if (prop.enum && prop.enum.length === 1) {
            propertyOccurrences.get(propName)!.add(prop.enum[0]);
          } else if (prop.const !== undefined) {
            propertyOccurrences.get(propName)!.add(prop.const);
          }
        }
      }
    }

    // Find property that appears in all schemas with unique values
    for (const [propName, values] of propertyOccurrences) {
      if (values.size === unionSchemas.length && values.size > 1) {
        return propName;
      }
    }

    return undefined;
  }

  /**
   * Generate union member information
   */
  private generateUnionMembers(
    unionSchemas: any[],
    discriminator?: DiscriminatorInfo
  ): UnionMemberInfo[] {
    return unionSchemas.map((memberSchema, index) => {
      const resolvedSchema = this.resolveSchemaRef(memberSchema);
      const complexity = this.calculateSchemaComplexity(resolvedSchema);
      const isInline = this.shouldInlineUnionMember(resolvedSchema, complexity);

      let typeName: string;
      let discriminatorValue: string | number | undefined;

      if (memberSchema.$ref) {
        // Referenced type
        typeName = this.extractTypeNameFromRef(memberSchema.$ref);
      } else if (isInline) {
        // Inline type
        const typeInfo = this.transformer.transformType(resolvedSchema);
        typeName = typeInfo.typeName;
      } else {
        // Generate named type
        typeName = `${
          discriminator ? discriminator.propertyName : "Union"
        }Member${index + 1}`;
      }

      // Extract discriminator value if available
      if (discriminator && resolvedSchema.properties) {
        const discriminatorProp =
          resolvedSchema.properties[discriminator.propertyName];
        if (discriminatorProp) {
          if (discriminatorProp.enum && discriminatorProp.enum.length === 1) {
            discriminatorValue = discriminatorProp.enum[0];
          } else if (discriminatorProp.const !== undefined) {
            discriminatorValue = discriminatorProp.const;
          }
        }
      }

      return {
        typeName,
        discriminatorValue,
        schema: resolvedSchema,
        isInline,
        complexity,
      };
    });
  }

  /**
   * Build union type content
   */
  private buildUnionContent(
    name: string,
    schema: any,
    members: UnionMemberInfo[],
    discriminator?: DiscriminatorInfo,
    isDiscriminated: boolean = false
  ): string {
    const lines: string[] = [];

    // Add union comment
    if (schema.description) {
      lines.push("/**");
      lines.push(` * ${schema.description}`);
      if (discriminator) {
        lines.push(` * @discriminator ${discriminator.propertyName}`);
      }
      lines.push(" */");
    }

    if (isDiscriminated && discriminator) {
      // Generate discriminated union
      lines.push(
        ...this.generateDiscriminatedUnion(name, members, discriminator)
      );
    } else {
      // Generate regular union
      lines.push(...this.generateRegularUnion(name, members));
    }

    return lines.join("\n");
  }

  /**
   * Generate discriminated union type
   */
  private generateDiscriminatedUnion(
    name: string,
    members: UnionMemberInfo[],
    discriminator: DiscriminatorInfo
  ): string[] {
    const lines: string[] = [];

    // Generate individual member interfaces for inline types
    for (const member of members) {
      if (member.isInline && member.discriminatorValue !== undefined) {
        const memberName = `${name}${this.capitalize(
          String(member.discriminatorValue)
        )}`;
        lines.push(`interface ${memberName} {`);
        lines.push(
          `  ${discriminator.propertyName}: ${JSON.stringify(
            member.discriminatorValue
          )};`
        );

        // Add other properties
        if (member.schema.properties) {
          for (const [propName, propSchema] of Object.entries(
            member.schema.properties
          )) {
            if (propName !== discriminator.propertyName) {
              const typeInfo = this.transformer.transformType(propSchema);
              const required = member.schema.required?.includes(propName);
              const optional = required ? "" : "?";
              lines.push(`  ${propName}${optional}: ${typeInfo.typeName};`);
            }
          }
        }

        lines.push("}");
        lines.push("");

        // Update member type name
        member.typeName = memberName;
      }
    }

    // Generate discriminated union type
    const unionTypes = members.map((m) => m.typeName).join(" | ");
    lines.push(`export type ${name} = ${unionTypes};`);

    return lines;
  }

  /**
   * Generate regular union type
   */
  private generateRegularUnion(
    name: string,
    members: UnionMemberInfo[]
  ): string[] {
    const lines: string[] = [];

    // Generate member types for inline members
    for (const [index, member] of members.entries()) {
      if (member.isInline) {
        const memberName = `${name}Member${index + 1}`;
        const typeInfo = this.transformer.transformType(member.schema);
        lines.push(`type ${memberName} = ${typeInfo.typeName};`);
        member.typeName = memberName;
      }
    }

    if (lines.length > 0) {
      lines.push("");
    }

    // Generate union type
    const unionTypes = members.map((m) => m.typeName).join(" | ");
    lines.push(`export type ${name} = ${unionTypes};`);

    return lines;
  }

  /**
   * Generate type guards for union members
   */
  private generateTypeGuards(
    name: string,
    members: UnionMemberInfo[],
    discriminator?: DiscriminatorInfo
  ): string[] {
    const typeGuards: string[] = [];

    if (discriminator && discriminator.propertyName) {
      // Discriminated union type guards
      for (const member of members) {
        if (member.discriminatorValue !== undefined) {
          const guardName = `is${name}${this.capitalize(
            String(member.discriminatorValue)
          )}`;
          const valueCheck = JSON.stringify(member.discriminatorValue);

          typeGuards.push(`/**`);
          typeGuards.push(` * Type guard for ${member.typeName}`);
          typeGuards.push(` */`);
          typeGuards.push(
            `export function ${guardName}(obj: ${name}): obj is ${member.typeName} {`
          );
          typeGuards.push(
            `  return obj.${discriminator.propertyName} === ${valueCheck};`
          );
          typeGuards.push(`}`);
          typeGuards.push("");
        }
      }
    } else {
      // Generic union type guards (structural checking)
      for (const [index, member] of members.entries()) {
        const guardName = `is${name}Member${index + 1}`;

        typeGuards.push(`/**`);
        typeGuards.push(` * Type guard for ${member.typeName}`);
        typeGuards.push(` */`);
        typeGuards.push(
          `export function ${guardName}(obj: ${name}): obj is ${member.typeName} {`
        );

        // Generate structural checks
        const checks = this.generateStructuralChecks(member.schema);
        if (checks.length > 0) {
          typeGuards.push(`  return ${checks.join(" && ")};`);
        } else {
          typeGuards.push(
            `  return true; // TODO: Add specific type checking logic`
          );
        }

        typeGuards.push(`}`);
        typeGuards.push("");
      }
    }

    return typeGuards;
  }

  /**
   * Generate helper functions for union types
   */
  private generateUnionHelpers(
    name: string,
    members: UnionMemberInfo[],
    discriminator?: DiscriminatorInfo
  ): string[] {
    const helpers: string[] = [];

    // Match function for pattern matching
    helpers.push(`/**`);
    helpers.push(` * Pattern match on ${name}`);
    helpers.push(` */`);
    helpers.push(`export function match${name}<T>(`);
    helpers.push(`  value: ${name},`);
    helpers.push(`  cases: {`);

    if (discriminator && discriminator.propertyName) {
      // Discriminated union matching
      for (const member of members) {
        if (member.discriminatorValue !== undefined) {
          const caseName = String(member.discriminatorValue);
          helpers.push(`    ${caseName}: (value: ${member.typeName}) => T;`);
        }
      }
    } else {
      // Index-based matching
      for (const [index, member] of members.entries()) {
        helpers.push(
          `    member${index + 1}: (value: ${member.typeName}) => T;`
        );
      }
    }

    helpers.push(`  }`);
    helpers.push(`): T {`);

    if (discriminator && discriminator.propertyName) {
      helpers.push(`  switch (value.${discriminator.propertyName}) {`);
      for (const member of members) {
        if (member.discriminatorValue !== undefined) {
          const caseName = String(member.discriminatorValue);
          const valueCheck = JSON.stringify(member.discriminatorValue);
          helpers.push(`    case ${valueCheck}:`);
          helpers.push(
            `      return cases.${caseName}(value as ${member.typeName});`
          );
        }
      }
      helpers.push(`    default:`);
      helpers.push(
        `      throw new Error('Unknown ${discriminator.propertyName}: ' + value.${discriminator.propertyName});`
      );
      helpers.push(`  }`);
    } else {
      // Use type guards for matching
      for (const [index, member] of members.entries()) {
        const guardName = `is${name}Member${index + 1}`;
        const condition = index === 0 ? "if" : "else if";
        helpers.push(`  ${condition} (${guardName}(value)) {`);
        helpers.push(`    return cases.member${index + 1}(value);`);
        helpers.push(`  }`);
      }
      helpers.push(`  throw new Error('Unable to match union type');`);
    }

    helpers.push(`}`);
    helpers.push("");

    // Fold function for reducing over union
    helpers.push(`/**`);
    helpers.push(` * Fold/reduce over ${name}`);
    helpers.push(` */`);
    helpers.push(`export function fold${name}<T>(`);
    helpers.push(`  values: ${name}[],`);
    helpers.push(`  reducer: (acc: T, value: ${name}) => T,`);
    helpers.push(`  initialValue: T`);
    helpers.push(`): T {`);
    helpers.push(`  return values.reduce(reducer, initialValue);`);
    helpers.push(`}`);

    return helpers;
  }

  /**
   * Generate structural checks for type guards
   */
  private generateStructuralChecks(schema: any): string[] {
    const checks: string[] = [];

    if (schema.required && schema.required.length > 0) {
      for (const requiredProp of schema.required) {
        checks.push(`'${requiredProp}' in obj`);
      }
    }

    if (schema.properties) {
      // Add type checks for specific properties
      for (const [propName, propSchema] of Object.entries(schema.properties)) {
        const prop = propSchema as any;
        if (prop.type) {
          switch (prop.type) {
            case "string":
              checks.push(`typeof obj.${propName} === 'string'`);
              break;
            case "number":
            case "integer":
              checks.push(`typeof obj.${propName} === 'number'`);
              break;
            case "boolean":
              checks.push(`typeof obj.${propName} === 'boolean'`);
              break;
            case "array":
              checks.push(`Array.isArray(obj.${propName})`);
              break;
          }
        }
      }
    }

    return checks;
  }

  /**
   * Utility methods
   */
  private resolveSchemaRef(schema: any): any {
    if (schema.$ref) {
      // In a real implementation, resolve the reference
      // For now, return the schema as-is
      return schema;
    }
    return schema;
  }

  private extractTypeNameFromRef(ref: string): string {
    const parts = ref.split("/");
    return parts[parts.length - 1];
  }

  private calculateSchemaComplexity(schema: any): number {
    let complexity = 1;

    if (schema.properties) {
      complexity += Object.keys(schema.properties).length;
    }

    if (schema.allOf || schema.oneOf || schema.anyOf) {
      complexity += 2;
    }

    return complexity;
  }

  private shouldInlineUnionMember(schema: any, complexity: number): boolean {
    return (
      this.options.inlineUnions &&
      complexity <= this.options.maxInlineComplexity
    );
  }

  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}
