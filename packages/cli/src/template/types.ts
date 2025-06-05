// src/template/types.ts
export interface TemplateContext {
  projectName: string;
  template: TemplateType;
  features: FeatureType[];
  database: DatabaseType;
  author?: string;
  description?: string;
  typescript: boolean;
  docker: boolean;
  testing: boolean;
  git: boolean;
  install: boolean;
}

export type TemplateType =
  | "basic"
  | "ai-chat"
  | "ai-dashboard"
  | "ecommerce"
  | "cms"
  | "api-only";

export type FeatureType =
  | "auth"
  | "ai"
  | "realtime"
  | "payments"
  | "email"
  | "storage"
  | "search"
  | "analytics";

export type DatabaseType = "mongodb" | "postgresql" | "mysql" | "sqlite";

export interface TemplateFile {
  sourcePath: string;
  targetPath: string;
  transform?: boolean;
  condition?: (context: TemplateContext) => boolean;
  rename?: (context: TemplateContext) => string;
}

export interface TemplateDefinition {
  name: string;
  description: string;
  requiredFeatures: FeatureType[];
  supportedFeatures: FeatureType[];
  defaultFeatures: FeatureType[];
  supportedDatabases: DatabaseType[];
  defaultDatabase: DatabaseType;
  files: TemplateFile[];
  dependencies: TemplateDependencies;
  postGeneration?: string[];
}

export interface TemplateDependencies {
  frontend: {
    dependencies: Record<string, string>;
    devDependencies: Record<string, string>;
  };
  backend: {
    dependencies: string[];
    devDependencies: string[];
  };
}

export interface GenerationResult {
  success: boolean;
  projectPath: string;
  generatedFiles: string[];
  installedDependencies: boolean;
  gitInitialized: boolean;
  errors: string[];
  warnings: string[];
}
