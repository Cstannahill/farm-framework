// tools/cli/commands/types.ts
/**
 * @deprecated Moved to `@farm/types` package
 */
export interface GenerateOptions {
  watch?: boolean;
  config?: string;
  schema?: string;
  output?: string;
  ai?: boolean;
}

/**
 * @deprecated Moved to `@farm/types` package
 */
export interface GenerateAllOptions extends GenerateOptions {
  watch?: boolean;
  config?: string;
}

/**
 * @deprecated Moved to `@farm/types` package
 */
export interface GenerateHooksOptions extends GenerateOptions {
  schema?: string;
  output?: string;
  ai?: boolean;
}

/**
 * @deprecated Moved to `@farm/types` package
 */
export interface GenerateTypesOptions extends GenerateOptions {
  schema?: string;
  output?: string;
}

/**
 * @deprecated Moved to `@farm/types` package
 */
export interface GenerateClientOptions extends GenerateOptions {
  schema?: string;
  output?: string;
  ai?: boolean;
}
