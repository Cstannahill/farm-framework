/**
 * Database Integration Types
 */

export interface DatabaseConnection {
  type: "mongodb" | "postgresql" | "mysql" | "sqlite";
  url: string;
  options?: Record<string, any>;
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
