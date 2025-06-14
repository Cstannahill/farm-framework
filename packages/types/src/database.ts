/**
 * Database Integration Types
 */

export type DatabaseType =
  | "mongodb"
  | "postgresql"
  | "mysql"
  | "sqlite"
  | "sqlserver";

export interface DatabaseOptions {
  poolSize?: number;
  timeout?: number;
  ssl?: boolean;
  replicaSet?: string;
  authSource?: string;
  schema?: string;
  synchronize?: boolean;
  logging?: boolean;
}

export interface MigrationConfig {
  enabled: boolean;
  directory: string;
  tableName?: string;
  collectionName?: string;
}

export interface DatabaseConnection {
  type: DatabaseType;
  url: string;
  options?: Record<string, any>;
}

export interface DatabaseConfig {
  type: DatabaseType;
  url?: string;
  options?: DatabaseOptions;
  migrations?: MigrationConfig;
}

export interface DatabaseDependencies {
  python: string[];
  javascript?: string[];
}

export interface DockerServiceConfig {
  image: string;
  environment: Record<string, string>;
  ports: string[];
  volumes: string[];
  healthCheck?: {
    test: string[];
    interval: string;
    timeout: string;
    retries: number;
  };
}

export type DatabaseFeature =
  | "transactions"
  | "fulltext"
  | "json"
  | "arrays"
  | "relations";

export interface TemplateConfig {
  baseConfigFile: string;
  modelBaseClass: string;
  migrationSupport: boolean;
  features: DatabaseFeature[];
}

export interface DatabaseProvider {
  type: DatabaseType;
  connectionUrl: string;
  dependencies: DatabaseDependencies;
  dockerConfig: DockerServiceConfig;
  templateConfig: TemplateConfig;
}

export interface DatabaseModel {
  name: string;
  collection?: string;
  table?: string;
  fields: DatabaseField[];
  indexes?: DatabaseIndex[];
  relationships?: DatabaseRelationship[];
}

export interface DatabaseField {
  name: string;
  type: "string" | "number" | "boolean" | "date" | "object" | "array";
  required?: boolean;
  unique?: boolean;
  default?: any;
  validation?: FieldValidation;
}

export interface FieldValidation {
  min?: number;
  max?: number;
  pattern?: string;
  enum?: any[];
  custom?: string;
}

export interface DatabaseIndex {
  fields: string[];
  unique?: boolean;
  sparse?: boolean;
  name?: string;
}

export interface DatabaseRelationship {
  type: "oneToOne" | "oneToMany" | "manyToMany";
  target: string;
  field: string;
  foreignField?: string;
}
