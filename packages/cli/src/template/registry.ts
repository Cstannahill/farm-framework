/**
 * Template and Feature Registry System
 */

import path from "path";
import fs from "fs-extra";
import { logger } from "../utils/logger.js";

export interface TemplateFile {
  path: string;
  templatePath: string;
  required: boolean;
  features?: string[];
  inheritFromBase?: boolean;
}

export interface TemplateDefinition {
  name: string;
  description: string;
  baseTemplate?: string;
  files: TemplateFile[];
  defaultFeatures?: string[];
  requiredFeatures?: string[];
}

export class TemplateRegistry {
  private templates: Map<string, TemplateDefinition> = new Map();
  private templatesDir: string;

  constructor(templatesDir: string) {
    this.templatesDir = templatesDir;
    this.initializeRegistry();
  }

  private initializeRegistry(): void {
    logger.debug("🔧 Initializing template registry...");
    this.registerBaseTemplate();
    this.registerTemplates();
    logger.debug(`✅ Registry initialized with ${this.templates.size} templates`);
  }

  private registerBaseTemplate(): void {
    const baseTemplate: TemplateDefinition = {
      name: "base",
      description: "Base template with core FARM framework files",
      files: [
        { path: "farm.config.ts", templatePath: "base/farm.config.ts.hbs", required: true },
        { path: "package.json", templatePath: "base/package.json.hbs", required: true },
        { path: "docker-compose.yml", templatePath: "base/docker-compose.yml.hbs", required: true },
        { path: "Dockerfile", templatePath: "base/Dockerfile.hbs", required: true },
        { path: ".gitignore", templatePath: "base/.gitignore.hbs", required: true },
        { path: "README.md", templatePath: "base/README.md.hbs", required: true },
        { path: "apps/api/requirements.txt", templatePath: "base/apps/api/requirements.txt.hbs", required: true },
        { path: "apps/api/pyproject.toml", templatePath: "base/apps/api/pyproject.toml.hbs", required: true },
        { path: "apps/api/src/main.py", templatePath: "base/apps/api/src/main.py.hbs", required: true },
        { path: "apps/api/src/core/config.py", templatePath: "base/apps/api/src/core/config.py.hbs", required: true },
        { path: "apps/api/src/core/logging.py", templatePath: "base/apps/api/src/core/logging.py.hbs", required: true },
        { path: "apps/api/src/core/security.py", templatePath: "base/apps/api/src/core/security.py.hbs", required: true },
        { path: "apps/api/src/auth/oauth.py", templatePath: "base/apps/api/src/auth/oauth.py.hbs", required: true },
        { path: "apps/api/src/database/connection.py", templatePath: "base/apps/api/src/database/connection.py.hbs", required: true },
        { path: "apps/api/src/models/user.py", templatePath: "base/apps/api/src/models/user.py.hbs", required: true },
        { path: "apps/api/src/routes/auth.py", templatePath: "base/apps/api/src/routes/auth.py.hbs", required: true },
        { path: "apps/api/src/routes/health.py", templatePath: "base/apps/api/src/routes/health.py.hbs", required: true },
        { path: "apps/api/src/routes/users.py", templatePath: "base/apps/api/src/routes/users.py.hbs", required: true },
        { path: "apps/web/package.json", templatePath: "base/apps/web/package.json.hbs", required: true },
        { path: "apps/web/vite.config.ts", templatePath: "base/apps/web/vite.config.ts.hbs", required: true },
        { path: "apps/web/index.html", templatePath: "base/apps/web/index.html.hbs", required: true },
        { path: "apps/web/src/main.tsx", templatePath: "base/apps/web/src/main.tsx.hbs", required: true },
        { path: "apps/web/src/App.tsx", templatePath: "base/apps/web/src/App.tsx.hbs", required: true },
        { path: "apps/web/src/index.css", templatePath: "base/apps/web/src/index.css.hbs", required: true },
        { path: "apps/web/src/components/layout/Layout.tsx", templatePath: "base/apps/web/src/components/layout/Layout.tsx.hbs", required: true },
        { path: "apps/web/src/pages/Home.tsx", templatePath: "base/apps/web/src/pages/Home.tsx.hbs", required: true },
        { path: "apps/web/src/pages/About.tsx", templatePath: "base/apps/web/src/pages/About.tsx.hbs", required: true },
        // Static assets
        { path: "apps/web/public/farm.svg", templatePath: "base/apps/web/public/farm.svg", required: true },
        { path: "apps/web/public/farm-c.svg", templatePath: "base/apps/web/public/farm-c.svg", required: true },
        { path: "apps/web/src/assets/farm.svg", templatePath: "base/apps/web/src/assets/farm.svg", required: true },
      ]
    };
    this.templates.set("base", baseTemplate);
  }

  private registerTemplates(): void {
    this.templates.set("basic", {
      name: "basic",
      description: "Basic full-stack template with minimal features",
      baseTemplate: "base",
      files: [
        // Basic template overrides - these files exist in basic template and override base
        { path: ".env.example", templatePath: "basic/.env.example.hbs", required: true },
        { path: ".gitignore", templatePath: "basic/.gitignore.hbs", required: true },
        { path: ".prettierignore", templatePath: "basic/.prettierignore.hbs", required: true },
        { path: ".prettierrc", templatePath: "basic/.prettierrc.hbs", required: true },
        { path: "apps/api/requirements.txt", templatePath: "basic/apps/api/requirements.txt.hbs", required: true },
        { path: "apps/api/src/core/config.py", templatePath: "basic/apps/api/src/core/config.py.hbs", required: true },
        { path: "apps/api/src/core/logging.py", templatePath: "basic/apps/api/src/core/logging.py.hbs", required: true },
        { path: "apps/api/src/database/connection.py", templatePath: "basic/apps/api/src/database/connection.py.hbs", required: true },
        { path: "apps/api/src/main.py", templatePath: "basic/apps/api/src/main.py.hbs", required: true },
        { path: "apps/api/src/models/user.py", templatePath: "basic/apps/api/src/models/user.py.hbs", required: true },
        { path: "apps/api/src/routes/health.py", templatePath: "basic/apps/api/src/routes/health.py.hbs", required: true },
        { path: "apps/api/src/routes/users.py", templatePath: "basic/apps/api/src/routes/users.py.hbs", required: true },
        { path: "apps/api/src/auth/oauth.py", templatePath: "basic/apps/api/src/auth/oauth.py.hbs", required: true },
        { path: "apps/api/src/core/security.py", templatePath: "basic/apps/api/src/core/security.py.hbs", required: true },
        { path: "apps/api/src/routes/auth.py", templatePath: "basic/apps/api/src/routes/auth.py.hbs", required: true },
        { path: "apps/web/eslint.config.js", templatePath: "basic/apps/web/eslint.config.js.hbs", required: true },
        { path: "apps/web/index.html", templatePath: "basic/apps/web/index.html.hbs", required: true },
        { path: "apps/web/package.json", templatePath: "basic/apps/web/package.json.hbs", required: true },
        { path: "apps/web/src/App.tsx", templatePath: "basic/apps/web/src/App.tsx.hbs", required: true },
        { path: "apps/web/src/components/error-boundary.tsx", templatePath: "basic/apps/web/src/components/error-boundary.tsx.hbs", required: true },
        { path: "apps/web/src/components/layout/Layout.tsx", templatePath: "basic/apps/web/src/components/layout/Layout.tsx.hbs", required: true },
        { path: "apps/web/src/components/ui/button.tsx", templatePath: "basic/apps/web/src/components/ui/button.tsx.hbs", required: true },
        { path: "apps/web/src/components/ui/card.tsx", templatePath: "basic/apps/web/src/components/ui/card.tsx.hbs", required: true },
        { path: "apps/web/src/components/ui/input.tsx", templatePath: "basic/apps/web/src/components/ui/input.tsx.hbs", required: true },
        { path: "apps/web/src/components/ui/loading.tsx", templatePath: "basic/apps/web/src/components/ui/loading.tsx.hbs", required: true },
        { path: "apps/web/src/index.css", templatePath: "basic/apps/web/src/index.css.hbs", required: true },
        { path: "apps/web/src/main.tsx", templatePath: "basic/apps/web/src/main.tsx.hbs", required: true },
        { path: "apps/web/src/pages/About.tsx", templatePath: "basic/apps/web/src/pages/About.tsx.hbs", required: true },
        { path: "apps/web/src/pages/Home.tsx", templatePath: "basic/apps/web/src/pages/Home.tsx.hbs", required: true },
        { path: "apps/web/src/hooks/use-api.ts", templatePath: "basic/apps/web/src/hooks/use-api.ts.hbs", required: true },
        { path: "apps/web/src/hooks/use-common.ts", templatePath: "basic/apps/web/src/hooks/use-common.ts.hbs", required: true },
        { path: "apps/web/src/lib/api-client.ts", templatePath: "basic/apps/web/src/lib/api-client.ts.hbs", required: true },
        { path: "apps/web/src/lib/utils.ts", templatePath: "basic/apps/web/src/lib/utils.ts.hbs", required: true },
        { path: "apps/web/src/stores/app-store.ts", templatePath: "basic/apps/web/src/stores/app-store.ts.hbs", required: true },
        { path: "apps/web/tailwind.config.js", templatePath: "basic/apps/web/tailwind.config.js.hbs", required: true },
        { path: "apps/web/tsconfig.json", templatePath: "basic/apps/web/tsconfig.json.hbs", required: true },
        { path: "apps/web/tsconfig.node.json", templatePath: "basic/apps/web/tsconfig.node.json.hbs", required: true },
        { path: "docker-compose.yml", templatePath: "basic/docker-compose.yml.hbs", required: true },
        { path: "Dockerfile", templatePath: "basic/Dockerfile.hbs", required: true },
        { path: "ENVIRONMENT_VARIABLES_GUIDE.md", templatePath: "basic/ENVIRONMENT_VARIABLES_GUIDE.md.hbs", required: true },
        { path: "farm.config.ts", templatePath: "basic/farm.config.ts.hbs", required: true },
        { path: "pnpm-workspace.yaml", templatePath: "basic/pnpm-workspace.yaml.hbs", required: true },
        { path: "README.md", templatePath: "basic/README.md.hbs", required: true },
        // Static assets
        { path: "apps/web/public/farm.svg", templatePath: "basic/apps/web/public/farm.svg", required: true },
        { path: "apps/web/public/farm-c.svg", templatePath: "basic/apps/web/public/farm-c.svg", required: true },
        { path: "apps/web/src/assets/farm.svg", templatePath: "basic/apps/web/src/assets/farm.svg", required: true },
      ],
      defaultFeatures: []
    });
  }

  getTemplate(name: string): TemplateDefinition | undefined {
    return this.templates.get(name);
  }

  resolveFiles(templateName: string, features: string[]): TemplateFile[] {
    const template = this.getTemplate(templateName);
    if (!template) {
      throw new Error(`Template '${templateName}' not found`);
    }

    const resolvedFiles = new Map<string, TemplateFile>();

    if (template.baseTemplate) {
      const baseTemplate = this.getTemplate(template.baseTemplate);
      if (baseTemplate) {
        for (const file of baseTemplate.files) {
          resolvedFiles.set(file.path, { ...file, inheritFromBase: true });
        }
      }
    }

    for (const file of template.files) {
      resolvedFiles.set(file.path, file);
    }

    return Array.from(resolvedFiles.values());
  }

  async validateTemplateFiles(templateName: string, features: string[]): Promise<{
    valid: boolean;
    missingFiles: string[];
    errors: string[];
  }> {
    const files = this.resolveFiles(templateName, features);
    const missingFiles: string[] = [];
    const errors: string[] = [];

    for (const file of files) {
      const fullPath = path.join(this.templatesDir, file.templatePath);

      try {
        const exists = await fs.pathExists(fullPath);
        if (!exists) {
          missingFiles.push(file.templatePath);
          if (file.required) {
            errors.push(`Required template file missing: ${file.templatePath}`);
          }
        }
      } catch (error) {
        errors.push(`Error checking file ${file.templatePath}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    return {
      valid: errors.length === 0,
      missingFiles,
      errors
    };
  }
}