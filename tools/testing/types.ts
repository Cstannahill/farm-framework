// tools/testing/types.ts

/**
 * @deprecated Moved to `@farm/types` package
 */
export interface TemplateConfig {
  template:
    | "basic"
    | "ai-chat"
    | "ai-dashboard"
    | "ecommerce"
    | "cms"
    | "api-only";
  features: string[];
  database: {
    type: "mongodb" | "postgresql" | "mysql" | "sqlite";
    url?: string;
    options?: Record<string, any>;
  };
  ai?: {
    providers?: {
      ollama?: {
        enabled: boolean;
        models: string[];
        defaultModel: string;
      };
      openai?: {
        enabled: boolean;
        models: string[];
        defaultModel: string;
      };
    };
    routing?: {
      development?: string;
      production?: string;
    };
  };
}

export interface ValidationError {
  type:
    | "STRUCTURE_ERROR"
    | "MISSING_FILE"
    | "MISSING_GENERATED_FILE"
    | "SYNTAX_ERROR"
    | "COMPILATION_ERROR"
    | "INVALID_PACKAGE_JSON"
    | "TYPESCRIPT_ERROR"
    | "INVALID_CONFIG"
    | "MISSING_CONFIG"
    | "VALIDATION_ERROR";
  message: string;
  file: string;
}

export interface TemplateValidationResult {
  templateName: string;
  isValid: boolean;
  errors: ValidationError[];
  warnings: string[];
  timestamp: string;
}

export interface TestProject {
  name: string;
  path: string;
  config: TemplateConfig;
}
