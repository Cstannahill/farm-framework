// tools/codegen/src/transformers/interface.ts
import {
  OpenAPITypeTransformer,
  TypeInfo,
  TypeTransformationOptions,
} from "./core";
import { OpenAPISchema } from "../schema/extractor";

export interface InterfaceGenerationOptions extends TypeTransformationOptions {
  generateIndexSignatures: boolean;
  useQuestionToken: boolean; // Use ? for optional vs | undefined
  generateGettersSetters: boolean;
  generateConstructor: boolean;
  extendBaseInterface: string | null;
  implementInterfaces: string[];
  generateValidationMethods: boolean;
}

export interface PropertyInfo extends TypeInfo {
  propertyName: string;
  isOptional: boolean;
  isReadonly: boolean;
  defaultValue?: any;
  deprecated?: boolean;
  validationRules?: ValidationRule[];
}

export interface ValidationRule {
  type:
    | "minLength"
    | "maxLength"
    | "pattern"
    | "min"
    | "max"
    | "required"
    | "email"
    | "url";
  value?: any;
  message?: string;
}

export interface GeneratedInterface {
  name: string;
  content: string;
  properties: PropertyInfo[];
  extends?: string;
  implements?: string[];
  hasIndexSignature: boolean;
  hasValidation: boolean;
}

export class InterfaceGenerator {
  private transformer: OpenAPITypeTransformer;
  private options: Required<InterfaceGenerationOptions>;

  constructor(
    schema: OpenAPISchema,
    options: Partial<InterfaceGenerationOptions> = {}
  ) {
    this.options = {
      // Inherit from TypeTransformationOptions
      enumType: "union",
      dateType: "string",
      strictNullChecks: true,
      generateComments: true,
      useReadonly: false,
      arrayType: "Array<T>",
      objectType: "Record<string, T>",
      nullableType: "T | null",
      discriminatedUnions: true,

      // Interface-specific options
      generateIndexSignatures: true,
      useQuestionToken: true,
      generateGettersSetters: false,
      generateConstructor: false,
      extendBaseInterface: null,
      implementInterfaces: [],
      generateValidationMethods: false,
      ...options,
    };

    this.transformer = new OpenAPITypeTransformer(schema, this.options);
  }

  /**
   * Generate TypeScript interface from OpenAPI schema
   */
  generateInterface(name: string, schema: any): GeneratedInterface {
    const properties = this.generateProperties(schema);
    const content = this.buildInterfaceContent(name, schema, properties);

    return {
      name,
      content,
      properties,
      extends: this.options.extendBaseInterface || undefined,
      implements:
        this.options.implementInterfaces.length > 0
          ? this.options.implementInterfaces
          : undefined,
      hasIndexSignature: this.hasIndexSignature(schema),
      hasValidation: this.options.generateValidationMethods,
    };
  }

  /**
   * Generate properties from schema
   */
  private generateProperties(schema: any): PropertyInfo[] {
    const properties: PropertyInfo[] = [];
    const schemaProperties = schema.properties || {};
    const requiredFields = schema.required || [];

    for (const [propName, propSchema] of Object.entries(schemaProperties)) {
      const property = this.generateProperty(
        propName,
        propSchema as any,
        requiredFields
      );
      properties.push(property);
    }

    return properties;
  }

  /**
   * Generate individual property information
   */
  private generateProperty(
    name: string,
    schema: any,
    requiredFields: string[]
  ): PropertyInfo {
    const typeInfo = this.transformer.transformType(schema);
    const isRequired = requiredFields.includes(name);
    const isOptional = !isRequired;

    // Handle optional vs nullable distinction
    let finalTypeName = typeInfo.typeName;
    let finalIsOptional = isOptional;

    if (this.options.useQuestionToken) {
      // Use ? for optional, keep type as-is
      finalIsOptional = isOptional;
    } else {
      // Use | undefined for optional
      if (isOptional && !typeInfo.isNullable) {
        finalTypeName = `${typeInfo.typeName} | undefined`;
        finalIsOptional = false;
      }
    }

    const property: PropertyInfo = {
      propertyName: name,
      typeName: finalTypeName,
      isOptional: finalIsOptional,
      isNullable: typeInfo.isNullable,
      isReadonly: this.options.useReadonly || schema.readOnly === true,
      description: schema.description,
      example: schema.example,
      constraints: typeInfo.constraints,
      defaultValue: schema.default,
      deprecated: schema.deprecated === true,
    };

    // Generate validation rules
    if (this.options.generateValidationMethods) {
      property.validationRules = this.generateValidationRules(schema);
    }

    return property;
  }

  /**
   * Build complete interface content
   */
  private buildInterfaceContent(
    name: string,
    schema: any,
    properties: PropertyInfo[]
  ): string {
    const lines: string[] = [];

    // Add interface comment
    if (this.options.generateComments && schema.description) {
      lines.push("/**");
      lines.push(` * ${schema.description}`);

      if (schema.example) {
        lines.push(" * @example");
        lines.push(` * ${JSON.stringify(schema.example, null, 2)}`);
      }

      lines.push(" */");
    }

    // Start interface declaration
    const extendsClause = this.options.extendBaseInterface
      ? ` extends ${this.options.extendBaseInterface}`
      : "";
    lines.push(`export interface ${name}${extendsClause} {`);

    // Add properties
    for (const property of properties) {
      lines.push(...this.generatePropertyLines(property));
    }

    // Add index signature if needed
    if (this.hasIndexSignature(schema)) {
      const indexSignature = this.generateIndexSignature(schema);
      if (indexSignature) {
        lines.push("");
        lines.push(`  ${indexSignature}`);
      }
    }

    lines.push("}");

    // Add validation interface if needed
    if (this.options.generateValidationMethods) {
      lines.push("");
      lines.push(...this.generateValidationInterface(name, properties));
    }

    return lines.join("\n");
  }

  /**
   * Generate property lines with proper formatting
   */
  private generatePropertyLines(property: PropertyInfo): string[] {
    const lines: string[] = [];

    // Add property comment
    if (this.options.generateComments) {
      const commentLines = this.generatePropertyComment(property);
      if (commentLines.length > 0) {
        lines.push(...commentLines);
      }
    }

    // Generate property declaration
    const readonly = property.isReadonly ? "readonly " : "";
    const optional = property.isOptional ? "?" : "";
    const deprecated = property.deprecated ? "/** @deprecated */ " : "";

    lines.push(
      `  ${deprecated}${readonly}${property.propertyName}${optional}: ${property.typeName};`
    );

    return lines;
  }

  /**
   * Generate property comment with validation info
   */
  private generatePropertyComment(property: PropertyInfo): string[] {
    const lines: string[] = [];

    if (property.description || property.constraints || property.example) {
      lines.push("  /**");

      if (property.description) {
        lines.push(`   * ${property.description}`);
      }

      if (property.constraints) {
        const constraintLines = this.formatConstraints(property.constraints);
        if (constraintLines.length > 0) {
          if (property.description) lines.push("   *");
          lines.push(...constraintLines);
        }
      }

      if (property.example !== undefined) {
        lines.push("   *");
        lines.push(`   * @example ${JSON.stringify(property.example)}`);
      }

      if (property.defaultValue !== undefined) {
        lines.push(`   * @default ${JSON.stringify(property.defaultValue)}`);
      }

      lines.push("   */");
    }

    return lines;
  }

  /**
   * Format constraint information for comments
   */
  private formatConstraints(constraints: any): string[] {
    const lines: string[] = [];

    if (constraints.minLength !== undefined) {
      lines.push(`   * @minLength ${constraints.minLength}`);
    }
    if (constraints.maxLength !== undefined) {
      lines.push(`   * @maxLength ${constraints.maxLength}`);
    }
    if (constraints.minimum !== undefined) {
      lines.push(`   * @minimum ${constraints.minimum}`);
    }
    if (constraints.maximum !== undefined) {
      lines.push(`   * @maximum ${constraints.maximum}`);
    }
    if (constraints.pattern) {
      lines.push(`   * @pattern ${constraints.pattern}`);
    }
    if (constraints.format) {
      lines.push(`   * @format ${constraints.format}`);
    }

    return lines;
  }

  /**
   * Check if schema needs index signature
   */
  private hasIndexSignature(schema: any): boolean {
    return (
      this.options.generateIndexSignatures &&
      (schema.additionalProperties === true ||
        (schema.additionalProperties &&
          typeof schema.additionalProperties === "object"))
    );
  }

  /**
   * Generate index signature for additional properties
   */
  private generateIndexSignature(schema: any): string | null {
    if (!schema.additionalProperties) return null;

    if (schema.additionalProperties === true) {
      return "[key: string]: any;";
    }

    if (typeof schema.additionalProperties === "object") {
      const valueType = this.transformer.transformType(
        schema.additionalProperties
      );
      return `[key: string]: ${valueType.typeName};`;
    }

    return null;
  }

  /**
   * Generate validation rules from schema constraints
   */
  private generateValidationRules(schema: any): ValidationRule[] {
    const rules: ValidationRule[] = [];

    if (schema.minLength !== undefined) {
      rules.push({
        type: "minLength",
        value: schema.minLength,
        message: `Must be at least ${schema.minLength} characters long`,
      });
    }

    if (schema.maxLength !== undefined) {
      rules.push({
        type: "maxLength",
        value: schema.maxLength,
        message: `Must be no more than ${schema.maxLength} characters long`,
      });
    }

    if (schema.minimum !== undefined) {
      rules.push({
        type: "min",
        value: schema.minimum,
        message: `Must be at least ${schema.minimum}`,
      });
    }

    if (schema.maximum !== undefined) {
      rules.push({
        type: "max",
        value: schema.maximum,
        message: `Must be no more than ${schema.maximum}`,
      });
    }

    if (schema.pattern) {
      rules.push({
        type: "pattern",
        value: schema.pattern,
        message: `Must match pattern: ${schema.pattern}`,
      });
    }

    if (schema.format === "email") {
      rules.push({
        type: "email",
        message: "Must be a valid email address",
      });
    }

    if (schema.format === "uri" || schema.format === "url") {
      rules.push({
        type: "url",
        message: "Must be a valid URL",
      });
    }

    return rules;
  }

  /**
   * Generate validation interface for runtime validation
   */
  private generateValidationInterface(
    name: string,
    properties: PropertyInfo[]
  ): string[] {
    const lines: string[] = [];
    const validationName = `${name}Validation`;

    lines.push(`export interface ${validationName} {`);
    lines.push(`  validate(data: ${name}): ValidationResult;`);
    lines.push(
      `  validateProperty(key: keyof ${name}, value: any): PropertyValidationResult;`
    );
    lines.push("}");

    lines.push("");
    lines.push("export interface ValidationResult {");
    lines.push("  isValid: boolean;");
    lines.push("  errors: ValidationError[];");
    lines.push("}");

    lines.push("");
    lines.push("export interface PropertyValidationResult {");
    lines.push("  isValid: boolean;");
    lines.push("  error?: ValidationError;");
    lines.push("}");

    lines.push("");
    lines.push("export interface ValidationError {");
    lines.push("  property: string;");
    lines.push("  rule: string;");
    lines.push("  message: string;");
    lines.push("  value?: any;");
    lines.push("}");

    return lines;
  }

  /**
   * Generate helper methods for the interface
   */
  generateHelperMethods(interfaceInfo: GeneratedInterface): string {
    const lines: string[] = [];
    const name = interfaceInfo.name;

    // Type guard
    lines.push(`/**`);
    lines.push(` * Type guard for ${name}`);
    lines.push(` */`);
    lines.push(`export function is${name}(obj: any): obj is ${name} {`);
    lines.push(`  return obj && typeof obj === 'object' &&`);

    // Check required properties
    const requiredProperties = interfaceInfo.properties.filter(
      (p) => !p.isOptional
    );
    for (const prop of requiredProperties) {
      lines.push(`    '${prop.propertyName}' in obj &&`);
    }

    lines.push(`    true;`);
    lines.push(`}`);

    lines.push("");

    // Partial type
    lines.push(`/**`);
    lines.push(` * Partial version of ${name} for updates`);
    lines.push(` */`);
    lines.push(`export type Partial${name} = Partial<${name}>;`);

    lines.push("");

    // Required type
    lines.push(`/**`);
    lines.push(` * Required version of ${name}`);
    lines.push(` */`);
    lines.push(`export type Required${name} = Required<${name}>;`);

    // Default values factory
    if (interfaceInfo.properties.some((p) => p.defaultValue !== undefined)) {
      lines.push("");
      lines.push(`/**`);
      lines.push(` * Create ${name} with default values`);
      lines.push(` */`);
      lines.push(
        `export function create${name}(partial: Partial${name} = {}): ${name} {`
      );
      lines.push(`  return {`);

      for (const prop of interfaceInfo.properties) {
        if (prop.defaultValue !== undefined) {
          lines.push(
            `    ${prop.propertyName}: ${JSON.stringify(prop.defaultValue)},`
          );
        }
      }

      lines.push(`    ...partial`);
      lines.push(`  } as ${name};`);
      lines.push(`}`);
    }

    return lines.join("\n");
  }

  /**
   * Generate validation implementation
   */
  generateValidationImplementation(interfaceInfo: GeneratedInterface): string {
    if (!this.options.generateValidationMethods) return "";

    const lines: string[] = [];
    const name = interfaceInfo.name;
    const validationName = `${name}Validation`;

    lines.push(`/**`);
    lines.push(` * Validation implementation for ${name}`);
    lines.push(` */`);
    lines.push(
      `export const ${name.toLowerCase()}Validation: ${validationName} = {`
    );
    lines.push(`  validate(data: ${name}): ValidationResult {`);
    lines.push(`    const errors: ValidationError[] = [];`);
    lines.push("");

    // Generate validation for each property
    for (const prop of interfaceInfo.properties) {
      if (prop.validationRules && prop.validationRules.length > 0) {
        lines.push(`    // Validate ${prop.propertyName}`);
        lines.push(
          `    const ${prop.propertyName}Result = this.validateProperty('${prop.propertyName}', data.${prop.propertyName});`
        );
        lines.push(
          `    if (!${prop.propertyName}Result.isValid && ${prop.propertyName}Result.error) {`
        );
        lines.push(`      errors.push(${prop.propertyName}Result.error);`);
        lines.push(`    }`);
        lines.push("");
      }
    }

    lines.push(`    return { isValid: errors.length === 0, errors };`);
    lines.push(`  },`);
    lines.push("");

    lines.push(
      `  validateProperty(key: keyof ${name}, value: any): PropertyValidationResult {`
    );
    lines.push(`    switch (key) {`);

    for (const prop of interfaceInfo.properties) {
      if (prop.validationRules && prop.validationRules.length > 0) {
        lines.push(`      case '${prop.propertyName}':`);

        for (const rule of prop.validationRules) {
          lines.push(
            `        if (${this.generateValidationCheck(rule, "value")}) {`
          );
          lines.push(`          return {`);
          lines.push(`            isValid: false,`);
          lines.push(`            error: {`);
          lines.push(`              property: '${prop.propertyName}',`);
          lines.push(`              rule: '${rule.type}',`);
          lines.push(`              message: '${rule.message}',`);
          lines.push(`              value`);
          lines.push(`            }`);
          lines.push(`          };`);
          lines.push(`        }`);
        }

        lines.push(`        return { isValid: true };`);
        lines.push("");
      }
    }

    lines.push(`      default:`);
    lines.push(`        return { isValid: true };`);
    lines.push(`    }`);
    lines.push(`  }`);
    lines.push(`};`);

    return lines.join("\n");
  }

  /**
   * Generate validation check expression
   */
  private generateValidationCheck(
    rule: ValidationRule,
    valueVar: string
  ): string {
    switch (rule.type) {
      case "minLength":
        return `typeof ${valueVar} === 'string' && ${valueVar}.length < ${rule.value}`;
      case "maxLength":
        return `typeof ${valueVar} === 'string' && ${valueVar}.length > ${rule.value}`;
      case "min":
        return `typeof ${valueVar} === 'number' && ${valueVar} < ${rule.value}`;
      case "max":
        return `typeof ${valueVar} === 'number' && ${valueVar} > ${rule.value}`;
      case "pattern":
        return `typeof ${valueVar} === 'string' && !/${rule.value}/.test(${valueVar})`;
      case "email":
        return `typeof ${valueVar} === 'string' && !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(${valueVar})`;
      case "url":
        return `typeof ${valueVar} === 'string' && !/^https?:\\/\\/.+/.test(${valueVar})`;
      default:
        return "false";
    }
  }
}
