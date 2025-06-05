// tools/codegen/src/transformers/enum.ts
import { OpenAPISchema } from "../schema/extractor";

export interface EnumGenerationOptions {
  strategy: "union" | "enum" | "const" | "branded";
  generateHelpers: boolean;
  generateValidation: boolean;
  generateMapping: boolean;
  preserveCase: boolean;
  addPrefix: string | null;
  addSuffix: string | null;
  generateComments: boolean;
  includeNumericValues: boolean;
  sortValues: boolean;
}

export interface EnumValue {
  key: string;
  value: string | number;
  originalValue: any;
  description?: string;
  deprecated?: boolean;
}

export interface GeneratedEnum {
  name: string;
  content: string;
  values: EnumValue[];
  strategy: string;
  helpers: string[];
  validation: string[];
  mapping: string[];
}

export class EnumGenerator {
  private options: Required<EnumGenerationOptions>;

  constructor(options: Partial<EnumGenerationOptions> = {}) {
    this.options = {
      strategy: "union",
      generateHelpers: true,
      generateValidation: true,
      generateMapping: false,
      preserveCase: false,
      addPrefix: null,
      addSuffix: null,
      generateComments: true,
      includeNumericValues: true,
      sortValues: false,
      ...options,
    };
  }

  /**
   * Generate enum from OpenAPI schema
   */
  generateEnum(name: string, schema: any): GeneratedEnum {
    const values = this.extractEnumValues(name, schema);
    const content = this.buildEnumContent(name, schema, values);

    const result: GeneratedEnum = {
      name,
      content,
      values,
      strategy: this.options.strategy,
      helpers: [],
      validation: [],
      mapping: [],
    };

    // Generate additional features
    if (this.options.generateHelpers) {
      result.helpers = this.generateHelpers(name, values);
    }

    if (this.options.generateValidation) {
      result.validation = this.generateValidation(name, values);
    }

    if (this.options.generateMapping) {
      result.mapping = this.generateMapping(name, values);
    }

    return result;
  }

  /**
   * Extract enum values from schema
   */
  private extractEnumValues(name: string, schema: any): EnumValue[] {
    const enumValues = schema.enum || [];
    const values: EnumValue[] = [];

    for (let i = 0; i < enumValues.length; i++) {
      const originalValue = enumValues[i];
      const enumValue = this.processEnumValue(name, originalValue, i, schema);
      values.push(enumValue);
    }

    // Sort values if requested
    if (this.options.sortValues) {
      values.sort((a, b) => {
        if (typeof a.value === "string" && typeof b.value === "string") {
          return a.value.localeCompare(b.value);
        }
        return String(a.value).localeCompare(String(b.value));
      });
    }

    return values;
  }

  /**
   * Process individual enum value
   */
  private processEnumValue(
    enumName: string,
    originalValue: any,
    index: number,
    schema: any
  ): EnumValue {
    let key = this.generateEnumKey(originalValue);
    let value: string | number = originalValue;

    // Apply transformations
    if (this.options.addPrefix) {
      key = this.options.addPrefix + key;
    }
    if (this.options.addSuffix) {
      key = key + this.options.addSuffix;
    }

    // Ensure key is valid TypeScript identifier
    key = this.ensureValidIdentifier(key);

    // Handle numeric values
    if (
      typeof originalValue === "number" &&
      !this.options.includeNumericValues
    ) {
      value = String(originalValue);
    }

    return {
      key,
      value,
      originalValue,
      description: this.extractValueDescription(originalValue, schema),
      deprecated: this.isValueDeprecated(originalValue, schema),
    };
  }

  /**
   * Build enum content based on strategy
   */
  private buildEnumContent(
    name: string,
    schema: any,
    values: EnumValue[]
  ): string {
    const lines: string[] = [];

    // Add enum comment
    if (this.options.generateComments && schema.description) {
      lines.push("/**");
      lines.push(` * ${schema.description}`);
      if (schema.example !== undefined) {
        lines.push(` * @example ${JSON.stringify(schema.example)}`);
      }
      lines.push(" */");
    }

    switch (this.options.strategy) {
      case "enum":
        lines.push(...this.generateTypeScriptEnum(name, values));
        break;
      case "union":
        lines.push(...this.generateUnionType(name, values));
        break;
      case "const":
        lines.push(...this.generateConstAssertions(name, values));
        break;
      case "branded":
        lines.push(...this.generateBrandedType(name, values));
        break;
    }

    return lines.join("\n");
  }

  /**
   * Generate TypeScript enum
   */
  private generateTypeScriptEnum(name: string, values: EnumValue[]): string[] {
    const lines: string[] = [];

    lines.push(`export enum ${name} {`);

    for (let i = 0; i < values.length; i++) {
      const value = values[i];
      const comma = i < values.length - 1 ? "," : "";

      // Add value comment
      if (this.options.generateComments && value.description) {
        lines.push(`  /** ${value.description} */`);
      }

      const deprecated = value.deprecated ? "/** @deprecated */ " : "";
      const enumValue =
        typeof value.value === "string" ? `"${value.value}"` : value.value;

      lines.push(`  ${deprecated}${value.key} = ${enumValue}${comma}`);
    }

    lines.push("}");

    return lines;
  }

  /**
   * Generate union type
   */
  private generateUnionType(name: string, values: EnumValue[]): string[] {
    const lines: string[] = [];

    const unionValues = values
      .map((v) =>
        typeof v.value === "string" ? `"${v.value}"` : String(v.value)
      )
      .join(" | ");

    lines.push(`export type ${name} = ${unionValues};`);

    // Add const object for enum-like behavior
    lines.push("");
    lines.push(`export const ${name} = {`);

    for (let i = 0; i < values.length; i++) {
      const value = values[i];
      const comma = i < values.length - 1 ? "," : "";

      if (this.options.generateComments && value.description) {
        lines.push(`  /** ${value.description} */`);
      }

      const deprecated = value.deprecated ? "/** @deprecated */ " : "";
      const constValue =
        typeof value.value === "string" ? `"${value.value}"` : value.value;

      lines.push(`  ${deprecated}${value.key}: ${constValue} as const${comma}`);
    }

    lines.push("} as const;");

    return lines;
  }

  /**
   * Generate const assertions
   */
  private generateConstAssertions(name: string, values: EnumValue[]): string[] {
    const lines: string[] = [];

    // Generate const tuple
    lines.push(`export const ${name}Values = [`);
    for (let i = 0; i < values.length; i++) {
      const value = values[i];
      const comma = i < values.length - 1 ? "," : "";
      const constValue =
        typeof value.value === "string" ? `"${value.value}"` : value.value;
      lines.push(`  ${constValue}${comma}`);
    }
    lines.push("] as const;");

    lines.push("");

    // Generate type from tuple
    lines.push(`export type ${name} = typeof ${name}Values[number];`);

    lines.push("");

    // Generate const object
    lines.push(`export const ${name} = {`);
    for (let i = 0; i < values.length; i++) {
      const value = values[i];
      const comma = i < values.length - 1 ? "," : "";

      if (this.options.generateComments && value.description) {
        lines.push(`  /** ${value.description} */`);
      }

      const deprecated = value.deprecated ? "/** @deprecated */ " : "";
      const constValue =
        typeof value.value === "string" ? `"${value.value}"` : value.value;

      lines.push(`  ${deprecated}${value.key}: ${constValue}${comma}`);
    }
    lines.push("} as const;");

    return lines;
  }

  /**
   * Generate branded type for extra type safety
   */
  private generateBrandedType(name: string, values: EnumValue[]): string[] {
    const lines: string[] = [];

    // Generate brand symbol
    lines.push(`declare const ${name}Brand: unique symbol;`);
    lines.push("");

    // Generate base union type
    const unionValues = values
      .map((v) =>
        typeof v.value === "string" ? `"${v.value}"` : String(v.value)
      )
      .join(" | ");

    // Generate branded type
    lines.push(
      `export type ${name} = (${unionValues}) & { readonly [${name}Brand]: never };`
    );
    lines.push("");

    // Generate const object with type assertion
    lines.push(`export const ${name} = {`);
    for (let i = 0; i < values.length; i++) {
      const value = values[i];
      const comma = i < values.length - 1 ? "," : "";

      if (this.options.generateComments && value.description) {
        lines.push(`  /** ${value.description} */`);
      }

      const deprecated = value.deprecated ? "/** @deprecated */ " : "";
      const constValue =
        typeof value.value === "string" ? `"${value.value}"` : value.value;

      lines.push(
        `  ${deprecated}${value.key}: ${constValue} as ${name}${comma}`
      );
    }
    lines.push("} as const;");

    return lines;
  }

  /**
   * Generate helper functions
   */
  private generateHelpers(name: string, values: EnumValue[]): string[] {
    const helpers: string[] = [];

    // Values array
    helpers.push(`/**`);
    helpers.push(` * All ${name} values as array`);
    helpers.push(` */`);
    helpers.push(`export const ${name}Values: ${name}[] = [`);

    const valuesList = values
      .map((v) => {
        const accessor =
          this.options.strategy === "enum"
            ? `${name}.${v.key}`
            : `${name}.${v.key}`;
        return `  ${accessor}`;
      })
      .join(",\n");

    helpers.push(valuesList);
    helpers.push("];");
    helpers.push("");

    // Type guard
    helpers.push(`/**`);
    helpers.push(` * Type guard for ${name}`);
    helpers.push(` */`);
    helpers.push(`export function is${name}(value: any): value is ${name} {`);

    if (this.options.strategy === "branded") {
      helpers.push(`  return ${name}Values.includes(value as ${name});`);
    } else {
      helpers.push(`  return ${name}Values.includes(value);`);
    }

    helpers.push("}");
    helpers.push("");

    // Parser function
    helpers.push(`/**`);
    helpers.push(` * Parse string to ${name} with validation`);
    helpers.push(` */`);
    helpers.push(
      `export function parse${name}(value: string): ${name} | null {`
    );
    helpers.push(`  const candidate = value as ${name};`);
    helpers.push(`  return is${name}(candidate) ? candidate : null;`);
    helpers.push("}");
    helpers.push("");

    // Safe parser with default
    helpers.push(`/**`);
    helpers.push(` * Parse string to ${name} with default fallback`);
    helpers.push(` */`);
    helpers.push(
      `export function parse${name}WithDefault(value: string, defaultValue: ${name}): ${name} {`
    );
    helpers.push(`  return parse${name}(value) ?? defaultValue;`);
    helpers.push("}");
    helpers.push("");

    // Get description function
    if (values.some((v) => v.description)) {
      helpers.push(`/**`);
      helpers.push(` * Get description for ${name} value`);
      helpers.push(` */`);
      helpers.push(
        `export function get${name}Description(value: ${name}): string | undefined {`
      );
      helpers.push(`  switch (value) {`);

      for (const value of values) {
        if (value.description) {
          const caseValue =
            this.options.strategy === "enum"
              ? `${name}.${value.key}`
              : `${name}.${value.key}`;
          helpers.push(`    case ${caseValue}:`);
          helpers.push(`      return "${value.description}";`);
        }
      }

      helpers.push(`    default:`);
      helpers.push(`      return undefined;`);
      helpers.push(`  }`);
      helpers.push(`}`);
      helpers.push("");
    }

    return helpers;
  }

  /**
   * Generate validation functions
   */
  private generateValidation(name: string, values: EnumValue[]): string[] {
    const validation: string[] = [];

    // Validation result type
    validation.push(`export interface ${name}ValidationResult {`);
    validation.push(`  isValid: boolean;`);
    validation.push(`  error?: string;`);
    validation.push(`  suggestion?: ${name};`);
    validation.push(`}`);
    validation.push("");

    // Main validation function
    validation.push(`/**`);
    validation.push(` * Validate ${name} value with detailed result`);
    validation.push(` */`);
    validation.push(
      `export function validate${name}(value: any): ${name}ValidationResult {`
    );
    validation.push(`  if (is${name}(value)) {`);
    validation.push(`    return { isValid: true };`);
    validation.push(`  }`);
    validation.push("");
    validation.push(`  // Try to find close match`);
    validation.push(`  if (typeof value === 'string') {`);
    validation.push(`    const lowerValue = value.toLowerCase();`);
    validation.push(`    for (const enumValue of ${name}Values) {`);
    validation.push(
      `      if (String(enumValue).toLowerCase() === lowerValue) {`
    );
    validation.push(`        return {`);
    validation.push(`          isValid: false,`);
    validation.push(
      `          error: 'Invalid case - did you mean this value?',`
    );
    validation.push(`          suggestion: enumValue`);
    validation.push(`        };`);
    validation.push(`      }`);
    validation.push(`    }`);
    validation.push(`  }`);
    validation.push("");
    validation.push(`  return {`);
    validation.push(`    isValid: false,`);
    validation.push(
      `    error: \`Invalid ${name} value: \${value}. Valid values: \${${name}Values.join(', ')}\``
    );
    validation.push(`  };`);
    validation.push(`}`);
    validation.push("");

    // Assert function
    validation.push(`/**`);
    validation.push(` * Assert value is valid ${name} (throws on invalid)`);
    validation.push(` */`);
    validation.push(
      `export function assert${name}(value: any): asserts value is ${name} {`
    );
    validation.push(`  const result = validate${name}(value);`);
    validation.push(`  if (!result.isValid) {`);
    validation.push(`    throw new Error(result.error);`);
    validation.push(`  }`);
    validation.push(`}`);

    return validation;
  }

  /**
   * Generate mapping functions
   */
  private generateMapping(name: string, values: EnumValue[]): string[] {
    const mapping: string[] = [];

    // Key to value mapping
    mapping.push(`/**`);
    mapping.push(` * Map ${name} to display name`);
    mapping.push(` */`);
    mapping.push(
      `export const ${name}DisplayNames: Record<${name}, string> = {`
    );

    for (const value of values) {
      const enumRef =
        this.options.strategy === "enum"
          ? `${name}.${value.key}`
          : `${name}.${value.key}`;
      const displayName = this.generateDisplayName(value.originalValue);
      mapping.push(`  [${enumRef}]: "${displayName}",`);
    }

    mapping.push(`};`);
    mapping.push("");

    // Reverse mapping (value to key)
    mapping.push(`/**`);
    mapping.push(` * Reverse mapping from value to key`);
    mapping.push(` */`);
    mapping.push(
      `export const ${name}Keys: Record<string | number, string> = {`
    );

    for (const value of values) {
      const key =
        typeof value.value === "string" ? `"${value.value}"` : value.value;
      mapping.push(`  [${key}]: "${value.key}",`);
    }

    mapping.push(`};`);
    mapping.push("");

    // Get display name function
    mapping.push(`/**`);
    mapping.push(` * Get display name for ${name} value`);
    mapping.push(` */`);
    mapping.push(
      `export function get${name}DisplayName(value: ${name}): string {`
    );
    mapping.push(`  return ${name}DisplayNames[value] || String(value);`);
    mapping.push(`}`);

    return mapping;
  }

  /**
   * Utility methods
   */
  private generateEnumKey(value: any): string {
    let key = String(value);

    if (!this.options.preserveCase) {
      // Convert to UPPER_SNAKE_CASE
      key = key
        .replace(/[^a-zA-Z0-9]/g, "_")
        .replace(/([a-z])([A-Z])/g, "$1_$2")
        .toUpperCase();
    }

    // Clean up multiple underscores
    key = key.replace(/_+/g, "_").replace(/^_|_$/g, "");

    return key;
  }

  private ensureValidIdentifier(key: string): string {
    // Ensure key starts with letter or underscore
    if (!/^[a-zA-Z_]/.test(key)) {
      key = "_" + key;
    }

    // Replace invalid characters
    key = key.replace(/[^a-zA-Z0-9_]/g, "_");

    return key;
  }

  private generateDisplayName(value: any): string {
    return String(value)
      .replace(/[_-]/g, " ")
      .replace(/\b\w/g, (l) => l.toUpperCase());
  }

  private extractValueDescription(value: any, schema: any): string | undefined {
    // In a real implementation, this might extract descriptions from
    // custom extensions or documentation
    return undefined;
  }

  private isValueDeprecated(value: any, schema: any): boolean {
    // In a real implementation, this might check for deprecation markers
    return false;
  }
}
