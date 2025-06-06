export interface ScaffoldingOptions {
  template: string;
  targetDir: string;
  projectName: string;
  features: string[];
  database: string;
  overwrite?: boolean;
  skipInstall?: boolean;
  skipGit?: boolean;
}

export interface ScaffoldingResult {
  success: boolean;
  projectPath: string;
  generatedFiles: string[];
  errors: string[];
  warnings: string[];
}
