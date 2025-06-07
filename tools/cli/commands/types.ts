// tools/cli/commands/types.ts
export interface GenerateOptions {
  watch?: boolean;
  config?: string;
  schema?: string;
  output?: string;
  ai?: boolean;
}

export interface GenerateAllOptions extends GenerateOptions {
  watch?: boolean;
  config?: string;
}

export interface GenerateHooksOptions extends GenerateOptions {
  schema?: string;
  output?: string;
  ai?: boolean;
}

export interface GenerateTypesOptions extends GenerateOptions {
  schema?: string;
  output?: string;
}

export interface GenerateClientOptions extends GenerateOptions {
  schema?: string;
  output?: string;
  ai?: boolean;
}
