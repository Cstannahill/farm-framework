/**
 * Template and Project Structure Types
 */

export interface TemplateDefinition {
  name: string;
  description: string;
  features: string[];
  structure: ProjectStructure;
  dependencies: TemplateDependencies;
  prompts?: TemplatePrompt[];
}

export interface ProjectStructure {
  files: FileStructure[];
  directories: DirectoryStructure[];
}

export interface FileStructure {
  path: string;
  template: string;
  variables?: Record<string, any>;
  conditional?: string;
}

export interface DirectoryStructure {
  path: string;
  conditional?: string;
}

export interface TemplateDependencies {
  frontend?: PackageDependency[];
  backend?: PythonDependency[];
  dev?: PackageDependency[];
}

export interface PackageDependency {
  name: string;
  version: string;
  dev?: boolean;
}

export interface PythonDependency {
  name: string;
  version?: string;
  extras?: string[];
}

export interface TemplatePrompt {
  name: string;
  type: "input" | "select" | "multiselect" | "confirm";
  message: string;
  choices?: string[] | PromptChoice[];
  default?: any;
  validate?: (value: any) => boolean | string;
}

export interface PromptChoice {
  name: string;
  value: any;
  description?: string;
}

export interface TemplateContext {
  projectName: string;
  features: string[];
  database: string;
  answers: Record<string, any>;
  timestamp: string;
  farmVersion: string;
}
