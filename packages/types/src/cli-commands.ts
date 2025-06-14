/**
 * CLI Command Option Types
 * Specific option interfaces for each CLI command
 */

// =============================================================================
// COMMAND OPTION INTERFACES
// =============================================================================

export interface AddUIOptions {
  component?: string;
  library?: string;
  install?: boolean;
  overwrite?: boolean;
  verbose?: boolean;
  dryRun?: boolean;
}

export interface BuildCommandOptions {
  target?: string[];
  env?: string;
  dev?: boolean;
  watch?: boolean;
  analyze?: boolean;
  cache?: boolean;
  clearCache?: boolean;
  profile?: boolean;
  sizeLimit?: string;
  production?: boolean;
  verbose?: boolean;
}

export interface MigrateOptions {
  direction?: "up" | "down";
  steps?: number;
  dryRun?: boolean;
  verbose?: boolean;
  create?: string;
  upgrade?: boolean;
  downgrade?: string;
}

export interface DevCommandOptions {
  port?: number;
  frontendOnly?: boolean;
  backendOnly?: boolean;
  watch?: boolean;
  verbose?: boolean;
  ssl?: boolean;
  config?: string;
  services?: string;
  "frontend-only"?: boolean;
  "backend-only"?: boolean;
  "skip-health-check"?: boolean;
}

export interface DeployCommandOptions {
  platform?: "railway" | "fly" | "vercel" | "aws" | "gcp";
  environment?: "development" | "staging" | "production" | "preview";
  region?: string | string[];
  yes?: boolean;
  preview?: boolean;
  production?: boolean;
  branch?: string;
  config?: string;
  verbose?: boolean;
  dryRun?: boolean;
  watch?: boolean;
  gpu?: boolean;
  domains?: string | string[];
  env?: Record<string, string>;
  skipHealth?: boolean;
  rollback?: string;
  snapshot?: string;
  skipBuild?: boolean;
  force?: boolean;
}

export interface GenerateCommandOptions {
  type: "model" | "route" | "page" | "component" | "api";
  name: string;
  fields?: string;
  relations?: string;
  permissions?: string;
  overwrite?: boolean;
  verbose?: boolean;
  methods?: string;
  crud?: boolean;
}

// =============================================================================
// CONFIGURATION INTERFACES
// =============================================================================

export interface ConfigOptions {
  target?: string;
  validate?: boolean;
  init?: boolean;
  reset?: boolean;
  projectPath: string;
  projectName: string;
  template: string;
  features: string[];
  database: string;
  typescript?: boolean;
}

export interface ConfigLoadOptions {
  path?: string;
  required?: boolean;
  validate?: boolean;
  merge?: boolean;
  configPath?: string;
  cwd?: string;
}

// =============================================================================
// UTILITY INTERFACES
// =============================================================================

export interface CopyOptions {
  overwrite?: boolean;
  recursive?: boolean;
  preserveTimestamps?: boolean;
  filter?: (src: string, dest: string) => boolean;
  transform?: (content: string, filePath: string) => string;
}

export interface TemplateVariables {
  [key: string]: any;
}

export interface ProgressOptions {
  title?: string;
  total?: number;
  concurrent?: number;
  showEta?: boolean;
}

export interface StepOptions {
  title: string;
  task: () => Promise<void>;
  condition?: boolean;
}

// =============================================================================
// GENERATOR INTERFACES
// =============================================================================

export interface ExistingFileGeneratorInterface {
  generateForExistingFile(filePath: string, options: any): Promise<void>;
}

export interface ProjectFileGeneratorHooks {
  beforeGeneration?: () => Promise<void>;
  afterGeneration?: () => Promise<void>;
  onError?: (error: Error) => Promise<void>;
}

export interface GenerationMetrics {
  filesGenerated: number;
  filesSkipped: number;
  errors: number;
  duration: number;
}

export interface DirectoryStructure {
  name: string;
  path: string;
  children?: DirectoryStructure[];
  files?: string[];
}

// =============================================================================
// POST-PROCESSING INTERFACES
// =============================================================================

export interface PythonFormatterOptions {
  lineLength?: number;
  tabSize?: number;
  useTabs?: boolean;
  quote?: "single" | "double";
}

// =============================================================================
// SCAFFOLDING INTERFACES
// =============================================================================

export interface ScaffoldResult {
  success: boolean;
  message?: string;
  files?: string[];
  errors?: string[];
}

export interface ScaffoldingOptions {
  template: string;
  output: string;
  variables?: Record<string, any>;
  overwrite?: boolean;
}

export interface ScaffoldingResult {
  created: string[];
  updated: string[];
  skipped: string[];
  errors: string[];
}

// =============================================================================
// TEMPLATE PROCESSING INTERFACES
// =============================================================================

export interface TemplateProcessingOptions {
  strict?: boolean;
  allowPartials?: boolean;
  noEscape?: boolean;
  helpers?: Record<string, Function>;
}

export interface ProgressInfo {
  current: number;
  total: number;
  message: string;
}

export interface TemplateProcessingResult {
  success: boolean;
  files: string[];
  errors: string[];
  warnings: string[];
  metrics: ProcessingMetrics;
}

export interface ProcessingMetrics {
  filesProcessed: number;
  templatesRendered: number;
  duration: number;
  memoryUsed: number;
}

// =============================================================================
// VALIDATION INTERFACES
// =============================================================================

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
  code?: string;
}

export interface ValidationWarning {
  field: string;
  message: string;
  value?: any;
  code?: string;
}

export interface ValidationMetrics {
  checksPerformed: number;
  errorsFound: number;
  warningsFound: number;
  duration: number;
}

export interface ValidationOptions {
  strict?: boolean;
  skipWarnings?: boolean;
  customRules?: Record<string, Function>;
}

// =============================================================================
// UTILITY INTERFACES
// =============================================================================

export interface ErrorContext {
  command?: string;
  operation?: string;
  file?: string;
  line?: number;
  timestamp?: string;
  metadata?: Record<string, any>;
}

export interface ExecOptions {
  cwd?: string;
  env?: Record<string, string>;
  timeout?: number;
  shell?: boolean;
  stdio?: "inherit" | "pipe" | "ignore";
}

export interface GitInitOptions {
  branch?: string;
  remote?: string;
  commitMessage?: string;
  author?: {
    name: string;
    email: string;
  };
}

export interface PackageInstallOptions {
  packageManager?: "npm" | "yarn" | "pnpm";
  dev?: boolean;
  exact?: boolean;
  save?: boolean;
  global?: boolean;
}

export interface PromptChoice {
  name: string;
  value: any;
  description?: string;
  short?: string;
}

export interface PromptQuestion {
  type: string;
  name: string;
  message: string;
  choices?: PromptChoice[];
  default?: any;
  validate?: (value: any) => boolean | string;
  when?: (answers: any) => boolean;
}

// =============================================================================
// LOGGER INTERFACES
// =============================================================================

export type LogLevel = "debug" | "info" | "warn" | "error" | "success";

export interface LoggerOptions {
  level?: LogLevel;
  prefix?: string;
  timestamp?: boolean;
  colors?: boolean;
  silent?: boolean;
}

// =============================================================================
// TOOLS CLI COMMAND INTERFACES
// =============================================================================

export interface GenerateAllOptions {
  watch?: boolean;
  config?: string;
}

export interface GenerateHooksOptions {
  schema?: string;
  output?: string;
  ai?: boolean;
}

export interface GenerateTypesOptions {
  schema?: string;
  output?: string;
}

export interface GenerateClientOptions {
  schema?: string;
  output?: string;
  ai?: boolean;
}
