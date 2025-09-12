/**
 * Type definitions for Enhanced TypeScript Generator
 */

export interface OpenAPISchemaObject {
  type?: string;
  properties?: Record<string, OpenAPISchemaObject>;
  required?: string[];
  enum?: any[];
  items?: OpenAPISchemaObject;
  allOf?: OpenAPISchemaObject[];
  oneOf?: OpenAPISchemaObject[];
  anyOf?: OpenAPISchemaObject[];
  additionalProperties?: boolean | OpenAPISchemaObject;
  format?: string;
  description?: string;
  example?: any;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  minItems?: number;
  maxItems?: number;
  $ref?: string;
  tags?: string[];
  'x-mapped-type'?: string;
}

export interface OpenAPIPathItem {
  get?: OpenAPIOperation;
  post?: OpenAPIOperation;
  put?: OpenAPIOperation;
  patch?: OpenAPIOperation;
  delete?: OpenAPIOperation;
  options?: OpenAPIOperation;
  head?: OpenAPIOperation;
  trace?: OpenAPIOperation;
}

export interface OpenAPIOperation {
  operationId?: string;
  summary?: string;
  description?: string;
  tags?: string[];
  method?: string;
  parameters?: OpenAPIParameter[];
  requestBody?: OpenAPIRequestBody;
  responses?: Record<string, OpenAPIResponse>;
}

export interface OpenAPIParameter {
  name: string;
  in: 'path' | 'query' | 'header' | 'cookie';
  required?: boolean;
  schema?: OpenAPISchemaObject;
  description?: string;
}

export interface OpenAPIRequestBody {
  required?: boolean;
  content?: {
    'application/json'?: {
      schema?: OpenAPISchemaObject;
    };
  };
}

export interface OpenAPIResponse {
  description?: string;
  content?: {
    'application/json'?: {
      schema?: OpenAPISchemaObject;
    };
  };
}

export interface OpenAPIPaths {
  [path: string]: OpenAPIPathItem;
}

export interface OpenAPIComponents {
  schemas?: Record<string, OpenAPISchemaObject>;
}

export interface OpenAPISchema {
  openapi?: string;
  swagger?: string;
  info?: {
    title?: string;
    version?: string;
    description?: string;
  };
  paths?: OpenAPIPaths;
  components?: OpenAPIComponents;
  tags?: Array<{
    name: string;
    description?: string;
  }>;
}

export interface TypeMappingFunction {
  (schema: OpenAPISchemaObject): string;
}

export interface ValidationLibrary {
  'zod': string;
  'joi': string;
  'yup': string;
}

export type ValidationLibraryType = keyof ValidationLibrary;

export interface SchemaProcessingOptions {
  customTypes?: Record<string, string>;
  typeMapping?: Record<string, TypeMappingFunction>;
  deduplicateTypes?: boolean;
}

export interface ModuleGrouping {
  [moduleName: string]: OpenAPIPaths;
}

export interface SchemaDependency {
  name: string;
  dependencies: string[];
}

export interface TypeGuardInfo {
  name: string;
  type: string;
  guardFunction: string;
}

export interface ValidationSchemaInfo {
  name: string;
  schema: string;
  library: ValidationLibraryType;
}
