/**
 * OpenAPI Schema and Type Definitions for @farm/type-sync
 * These types are used throughout the orchestrator, generators, and extractors.
 */

export type OpenAPISchema = {
  openapi: string;
  info: {
    title: string;
    version: string;
    description?: string;
    [key: string]: any;
  };
  servers?: Array<{ url: string; description?: string }>;
  paths: Record<string, Record<string, OpenAPIOperation>>;
  components?: {
    schemas?: Record<string, OpenAPIType>;
    responses?: Record<string, OpenAPIResponse>;
    parameters?: Record<string, OpenAPIParameter>;
    requestBodies?: Record<string, OpenAPIRequestBody>;
    securitySchemes?: Record<string, OpenAPISecurityScheme>;
    [key: string]: any;
  };
  tags?: Array<{ name: string; description?: string }>;
  [key: string]: any;
};

export type OpenAPIOperation = {
  tags?: string[];
  summary?: string;
  description?: string;
  operationId?: string;
  parameters?: (OpenAPIParameter | OpenAPIReference)[];
  requestBody?: OpenAPIRequestBody | OpenAPIReference;
  responses: Record<string, OpenAPIResponse | OpenAPIReference>;
  deprecated?: boolean;
  security?: Array<Record<string, string[]>>;
  [key: string]: any;
};

export type OpenAPIType = {
  type?: string;
  format?: string;
  enum?: string[];
  items?: OpenAPIType | OpenAPIReference;
  properties?: Record<string, OpenAPIType | OpenAPIReference>;
  required?: string[];
  description?: string;
  nullable?: boolean;
  allOf?: (OpenAPIType | OpenAPIReference)[];
  anyOf?: (OpenAPIType | OpenAPIReference)[];
  oneOf?: (OpenAPIType | OpenAPIReference)[];
  $ref?: string;
  [key: string]: any;
};

export type OpenAPIParameter = {
  name: string;
  in: "query" | "header" | "path" | "cookie";
  description?: string;
  required?: boolean;
  deprecated?: boolean;
  allowEmptyValue?: boolean;
  schema?: OpenAPIType | OpenAPIReference;
  [key: string]: any;
};

export type OpenAPIRequestBody = {
  description?: string;
  content: Record<
    string,
    { schema: OpenAPIType | OpenAPIReference; example?: any }
  >;
  required?: boolean;
  [key: string]: any;
};

export type OpenAPIResponse = {
  description: string;
  headers?: Record<string, OpenAPIHeader | OpenAPIReference>;
  content?: Record<
    string,
    { schema: OpenAPIType | OpenAPIReference; example?: any }
  >;
  links?: Record<string, OpenAPILink | OpenAPIReference>;
  [key: string]: any;
};

export type OpenAPIHeader = {
  description?: string;
  required?: boolean;
  deprecated?: boolean;
  schema?: OpenAPIType | OpenAPIReference;
  [key: string]: any;
};

export type OpenAPILink = {
  operationId?: string;
  parameters?: Record<string, any>;
  requestBody?: any;
  description?: string;
  [key: string]: any;
};

export type OpenAPISecurityScheme = {
  type: string;
  description?: string;
  name?: string;
  in?: string;
  scheme?: string;
  bearerFormat?: string;
  flows?: any;
  openIdConnectUrl?: string;
  [key: string]: any;
};

export type OpenAPIReference = { $ref: string };

// Generator Context Types
export type TypeSyncGeneratorContext = {
  schema: OpenAPISchema;
  outputDir: string;
  cacheDir: string;
  logger?: (...args: any[]) => void;
  [key: string]: any;
};

// Orchestrator Types
export type TypeSyncOrchestratorOptions = {
  schemaPath: string;
  outputDir: string;
  cacheDir?: string;
  watch?: boolean;
  logger?: (...args: any[]) => void;
  [key: string]: any;
};

// Watcher Types
export type TypeSyncWatcherOptions = {
  schemaPath: string;
  onChange: () => void;
  debounceMs?: number;
};

// Cache Types
export type TypeSyncCacheEntry = {
  hash: string;
  generatedAt: number;
  [key: string]: any;
};

// Utility Types
export type DeepPartial<T> = {
  [P in keyof T]?: DeepPartial<T[P]>;
};

// Re-export types from @farm/types as needed
export * from "@farm/types";
