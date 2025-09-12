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
  // Track ad-hoc template paths registered via compat API so getTemplatePath can return them
  private customTemplatePaths: Map<string, string> = new Map();

  // Support a default constructor used by older tests; default to real templates path
  constructor(templatesDir?: string) {
    this.templatesDir =
      templatesDir ||
      path.resolve(
        // packages/cli/src/template/registry.ts -> templates folder
        path.join(__dirname, "..", "..", "templates")
      );
    this.initializeRegistry();
  }

  private initializeRegistry(): void {
    logger.debug("🔧 Initializing template registry...");
    this.registerBaseTemplate();
    this.registerTemplates();
    // Also scan the templates directory and auto-register any templates
    // that aren't explicitly registered above. This keeps the registry in
    // sync with the filesystem and prevents forgetting to add new templates.
    try {
      this.scanAndRegisterTemplates();
    } catch (err) {
      logger.warn(
        `⚠️  Template scan failed: ${err instanceof Error ? err.message : String(err)}`
      );
    }
    logger.debug(
      `✅ Registry initialized with ${this.templates.size} templates`
    );
  }

  private registerBaseTemplate(): void {
    const baseTemplate: TemplateDefinition = {
      name: "base",
      description: "Base template with core FARM framework files",
      files: [
        // Core files
        {
          path: "farm.config.ts",
          templatePath: "base/farm.config.ts.hbs",
          required: true,
        },
        {
          path: "package.json",
          templatePath: "base/package.json.hbs",
          required: true,
        },
        {
          path: "docker-compose.yml",
          templatePath: "base/docker-compose.yml.hbs",
          required: true,
        },
        {
          path: "docker-compose.database.yml",
          templatePath: "base/docker-compose.database.yml.hbs",
          required: true,
        },
        {
          path: "docker-compose.prod.yml",
          templatePath: "base/docker-compose.prod.yml.hbs",
          required: true,
        },
        {
          path: "Dockerfile",
          templatePath: "base/Dockerfile.hbs",
          required: true,
        },
        {
          path: ".gitignore",
          templatePath: "base/.gitignore.hbs",
          required: true,
        },
        {
          path: "README.md",
          templatePath: "base/README.md.hbs",
          required: true,
        },

        // Backend Dependencies and configuration
        {
          path: "apps/api/requirements.txt",
          templatePath: "base/apps/api/requirements.txt.hbs",
          required: true,
        },
        {
          path: "apps/api/pyproject.toml",
          templatePath: "base/apps/api/pyproject.toml.hbs",
          required: true,
        },

        // Backend Files
        {
          path: "apps/api/src/main.py",
          templatePath: "base/apps/api/src/main.py.hbs",
          required: true,
        },
        {
          path: "apps/api/src/core/config.py",
          templatePath: "base/apps/api/src/core/config.py.hbs",
          required: true,
        },
        {
          path: "apps/api/src/core/logging.py",
          templatePath: "base/apps/api/src/core/logging.py.hbs",
          required: true,
        },
        {
          path: "apps/api/src/core/security.py",
          templatePath: "base/apps/api/src/core/security.py.hbs",
          required: true,
        },
        {
          path: "apps/api/src/auth/oauth.py",
          templatePath: "base/apps/api/src/auth/oauth.py.hbs",
          required: true,
        },
        {
          path: "apps/api/src/database/connection.py",
          templatePath: "base/apps/api/src/database/connection.py.hbs",
          required: true,
        },
        {
          path: "apps/api/src/models/user.py",
          templatePath: "base/apps/api/src/models/user.py.hbs",
          required: true,
        },
        {
          path: "apps/api/src/routes/auth.py",
          templatePath: "base/apps/api/src/routes/auth.py.hbs",
          required: true,
        },
        {
          path: "apps/api/src/routes/health.py",
          templatePath: "base/apps/api/src/routes/health.py.hbs",
          required: true,
        },
        {
          path: "apps/api/src/routes/users.py",
          templatePath: "base/apps/api/src/routes/users.py.hbs",
          required: true,
        },

        // Frontend Dependencies and configuration
        {
          path: "apps/web/package.json",
          templatePath: "base/apps/web/package.json.hbs",
          required: true,
        },
        {
          path: "apps/web/vite.config.ts",
          templatePath: "base/apps/web/vite.config.ts.hbs",
          required: true,
        },
        {
          path: "apps/web/index.html",
          templatePath: "base/apps/web/index.html.hbs",
          required: true,
        },
        {
          path: "apps/web/tailwind.config.ts",
          templatePath: "base/apps/web/tailwind.config.ts.hbs",
          required: true,
        },
        {
          path: "apps/web/tsconfig.json",
          templatePath: "base/apps/web/tsconfig.json.hbs",
          required: true,
        },
        {
          path: "apps/web/tsconfig.node.json",
          templatePath: "base/apps/web/tsconfig.node.json.hbs",
          required: true,
        },
        {
          path: "apps/web/tsconfig.app.json",
          templatePath: "base/apps/web/tsconfig.app.json.hbs",
          required: true,
        },
        // Frontend Files
        {
          path: "apps/web/src/main.tsx",
          templatePath: "base/apps/web/src/main.tsx.hbs",
          required: true,
        },
        {
          path: "apps/web/src/App.tsx",
          templatePath: "base/apps/web/src/App.tsx.hbs",
          required: true,
        },
        {
          path: "apps/web/src/index.css",
          templatePath: "base/apps/web/src/index.css.hbs",
          required: true,
        },
        {
          path: "apps/web/src/components/layout/Layout.tsx",
          templatePath: "base/apps/web/src/components/layout/Layout.tsx.hbs",
          required: true,
        },
        {
          path: "apps/web/src/components/theme-toggle.tsx",
          templatePath: "base/apps/web/src/components/theme-toggle.tsx.hbs",
          required: true,
        },
        {
          path: "apps/web/src/pages/Home.tsx",
          templatePath: "base/apps/web/src/pages/Home.tsx.hbs",
          required: true,
        },
        {
          path: "apps/web/src/pages/About.tsx",
          templatePath: "base/apps/web/src/pages/About.tsx.hbs",
          required: true,
        },

        // Static assets
        {
          path: "apps/web/public/farm.svg",
          templatePath: "base/apps/web/public/farm.svg",
          required: true,
        },
        {
          path: "apps/web/public/farm-c.svg",
          templatePath: "base/apps/web/public/farm-c.svg",
          required: true,
        },
        {
          path: "apps/web/src/assets/farm.svg",
          templatePath: "base/apps/web/src/assets/farm.svg",
          required: true,
        },

        // Setup scripts
        {
          path: "setup.sh",
          templatePath: "base/setup.sh.hbs",
          required: false,
        },
        {
          path: "setup.bat",
          templatePath: "base/setup.bat.hbs",
          required: false,
        },
        {
          path: "setup.ps1",
          templatePath: "base/setup.ps1.hbs",
          required: false,
        },
      ],
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
        {
          path: ".env.example",
          templatePath: "basic/.env.example.hbs",
          required: true,
        },
        {
          path: ".gitignore",
          templatePath: "basic/.gitignore.hbs",
          required: true,
        },
        {
          path: ".prettierignore",
          templatePath: "basic/.prettierignore.hbs",
          required: true,
        },
        {
          path: ".prettierrc",
          templatePath: "basic/.prettierrc.hbs",
          required: true,
        },
        // { path: "docker-compose.yml", templatePath: "basic/docker-compose.yml.hbs", required: true },
        // { path: "Dockerfile", templatePath: "basic/Dockerfile.hbs", required: true },
        {
          path: "ENVIRONMENT_VARIABLES_GUIDE.md",
          templatePath: "basic/ENVIRONMENT_VARIABLES_GUIDE.md.hbs",
          required: true,
        },
        {
          path: "farm.config.ts",
          templatePath: "basic/farm.config.ts.hbs",
          required: true,
        },
        {
          path: "pnpm-workspace.yaml",
          templatePath: "basic/pnpm-workspace.yaml.hbs",
          required: true,
        },
        {
          path: "README.md",
          templatePath: "basic/README.md.hbs",
          required: true,
        },
        // { path: "apps/api/requirements.txt", templatePath: "basic/apps/api/requirements.txt.hbs", required: true },
        // { path: "apps/api/pyproject.toml", templatePath: "basic/apps/api/pyproject.toml.hbs", required: true },

        // Backend Files

        // { path: "apps/api/src/core/config.py", templatePath: "basic/apps/api/src/core/config.py.hbs", required: true },
        // { path: "apps/api/src/core/logging.py", templatePath: "basic/apps/api/src/core/logging.py.hbs", required: true },
        // { path: "apps/api/src/database/connection.py", templatePath: "basic/apps/api/src/database/connection.py.hbs", required: true },
        // { path: "apps/api/src/main.py", templatePath: "basic/apps/api/src/main.py.hbs", required: true },
        // { path: "apps/api/src/models/user.py", templatePath: "basic/apps/api/src/models/user.py.hbs", required: true },
        // { path: "apps/api/src/routes/health.py", templatePath: "basic/apps/api/src/routes/health.py.hbs", required: true },
        // { path: "apps/api/src/routes/users.py", templatePath: "basic/apps/api/src/routes/users.py.hbs", required: true },
        // { path: "apps/api/src/auth/oauth.py", templatePath: "basic/apps/api/src/auth/oauth.py.hbs", required: true },
        // { path: "apps/api/src/core/security.py", templatePath: "basic/apps/api/src/core/security.py.hbs", required: true },
        // { path: "apps/api/src/routes/auth.py", templatePath: "basic/apps/api/src/routes/auth.py.hbs", required: true },

        // Frontend Files

        {
          path: "apps/web/eslint.config.js",
          templatePath: "basic/apps/web/eslint.config.js.hbs",
          required: true,
        },
        // { path: "apps/web/index.html", templatePath: "basic/apps/web/index.html.hbs", required: true },
        // { path: "apps/web/package.json", templatePath: "basic/apps/web/package.json.hbs", required: true },
        // { path: "apps/web/tailwind.config.js", templatePath: "basic/apps/web/tailwind.config.js.hbs", required: true },
        // { path: "apps/web/tsconfig.json", templatePath: "basic/apps/web/tsconfig.json.hbs", required: true },
        // { path: "apps/web/tsconfig.node.json", templatePath: "basic/apps/web/tsconfig.node.json.hbs", required: true },
        // { path: "apps/web/tsconfig.app.json", templatePath: "basic/apps/web/tsconfig.app.json.hbs", required: true },
        {
          path: "apps/web/src/App.tsx",
          templatePath: "basic/apps/web/src/App.tsx.hbs",
          required: true,
        },
        {
          path: "apps/web/src/components/error-boundary.tsx",
          templatePath: "basic/apps/web/src/components/error-boundary.tsx.hbs",
          required: true,
        },
        // { path: "apps/web/src/components/layout/Layout.tsx", templatePath: "basic/apps/web/src/components/layout/Layout.tsx.hbs", required: true },
        {
          path: "apps/web/src/components/ui/button.tsx",
          templatePath: "basic/apps/web/src/components/ui/button.tsx.hbs",
          required: true,
        },
        {
          path: "apps/web/src/components/ui/card.tsx",
          templatePath: "basic/apps/web/src/components/ui/card.tsx.hbs",
          required: true,
        },
        {
          path: "apps/web/src/components/ui/input.tsx",
          templatePath: "basic/apps/web/src/components/ui/input.tsx.hbs",
          required: true,
        },
        {
          path: "apps/web/src/components/ui/loading.tsx",
          templatePath: "basic/apps/web/src/components/ui/loading.tsx.hbs",
          required: true,
        },
        // { path: "apps/web/src/index.css", templatePath: "basic/apps/web/src/index.css.hbs", required: true },
        // { path: "apps/web/src/main.tsx", templatePath: "basic/apps/web/src/main.tsx.hbs", required: true },
        // { path: "apps/web/src/pages/About.tsx", templatePath: "basic/apps/web/src/pages/About.tsx.hbs", required: true },
        // { path: "apps/web/src/pages/Home.tsx", templatePath: "basic/apps/web/src/pages/Home.tsx.hbs", required: true },
        {
          path: "apps/web/src/hooks/use-api.ts",
          templatePath: "basic/apps/web/src/hooks/use-api.ts.hbs",
          required: true,
        },
        {
          path: "apps/web/src/hooks/use-common.ts",
          templatePath: "basic/apps/web/src/hooks/use-common.ts.hbs",
          required: true,
        },
        {
          path: "apps/web/src/lib/api-client.ts",
          templatePath: "basic/apps/web/src/lib/api-client.ts.hbs",
          required: true,
        },
        {
          path: "apps/web/src/lib/utils.ts",
          templatePath: "basic/apps/web/src/lib/utils.ts.hbs",
          required: true,
        },
        {
          path: "apps/web/src/stores/app-store.ts",
          templatePath: "basic/apps/web/src/stores/app-store.ts.hbs",
          required: true,
        },

        // Static assets
        {
          path: "apps/web/public/farm.svg",
          templatePath: "basic/apps/web/public/farm.svg",
          required: true,
        },
        {
          path: "apps/web/public/farm-c.svg",
          templatePath: "basic/apps/web/public/farm-c.svg",
          required: true,
        },
        {
          path: "apps/web/src/assets/farm.svg",
          templatePath: "basic/apps/web/src/assets/farm.svg",
          required: true,
        },
      ],
      defaultFeatures: [],
    });
  }

  /**
   * Scan the templates directory for additional templates and auto-register them.
   * Any template folder not already explicitly registered will be added with a
   * default file mapping (all files included, .hbs stripped for output paths).
   */
  private scanAndRegisterTemplates(): void {
    // Folders to ignore as standalone templates
    const IGNORE_FOLDERS = new Set<string>(["features", "README.md"]);

    let dirEntries: fs.Dirent[] = [] as any;
    try {
      // Using readdirSync with Dirent to avoid async constructor work
      dirEntries = fs.readdirSync(this.templatesDir, {
        withFileTypes: true,
      }) as unknown as fs.Dirent[];
    } catch (e) {
      // If the directory doesn't exist yet in tests, just skip
      return;
    }

    for (const entry of dirEntries) {
      if (!entry.isDirectory()) continue;
      const name = entry.name;
      if (IGNORE_FOLDERS.has(name)) continue;
      if (this.templates.has(name)) continue; // already registered explicitly

      const files: TemplateFile[] = [];
      const root = path.join(this.templatesDir, name);

      // Walk the directory recursively and collect files
      const stack: string[] = [root];
      while (stack.length) {
        const current = stack.pop()!;
        let children: fs.Dirent[] = [] as any;
        try {
          children = fs.readdirSync(current, {
            withFileTypes: true,
          }) as unknown as fs.Dirent[];
        } catch (e) {
          logger.warn(
            `⚠️  Failed to read template folder '${current}': ${e instanceof Error ? e.message : String(e)}`
          );
          continue;
        }
        for (const child of children) {
          const full = path.join(current, child.name);
          const relFromTemplate = path.relative(root, full).replace(/\\/g, "/");
          if (child.isDirectory()) {
            stack.push(full);
          } else {
            const isHbs = child.name.endsWith(".hbs");
            const templatePath = `${name}/${relFromTemplate}`;
            const outputPath = isHbs
              ? relFromTemplate.slice(0, -4) // strip .hbs
              : relFromTemplate; // static assets keep same path
            files.push({ path: outputPath, templatePath, required: true });
          }
        }
      }

      const def: TemplateDefinition = {
        name,
        description: `Auto-registered template '${name}'`,
        baseTemplate: name === "base" ? undefined : "base",
        files,
        defaultFeatures: [],
      };

      this.templates.set(name, def);
      logger.debug(
        `🧩 Auto-registered template: ${name} (${files.length} files)`
      );
    }
  }

  getTemplate(name: string): TemplateDefinition | undefined {
    return this.templates.get(name);
  }

  // ---------------------------------------------------------------------------
  // Compatibility API expected by some tests
  // ---------------------------------------------------------------------------
  /** Register an ad-hoc template path (compat wrapper). Auto-register by scanning that folder. */
  registerTemplate(name: string, templatePath: string): void {
    // If the folder doesn't exist, still create a stub to satisfy tests
    const relName = path.basename(name);
    if (templatePath && typeof templatePath === "string") {
      this.customTemplatePaths.set(relName, templatePath);
    }
    if (!this.templates.has(relName)) {
      // Create a minimal auto-registered definition using the provided path
      const files: TemplateFile[] = [];
      try {
        const walk = (root: string, base: string) => {
          const entries = fs.readdirSync(root, { withFileTypes: true });
          for (const e of entries) {
            const full = path.join(root, e.name);
            const rel = path.relative(base, full).replace(/\\/g, "/");
            if (e.isDirectory()) walk(full, base);
            else {
              const isHbs = e.name.endsWith(".hbs");
              files.push({
                path: isHbs ? rel.slice(0, -4) : rel,
                templatePath: `${relName}/${rel}`,
                required: true,
              });
            }
          }
        };
        if (fs.existsSync(templatePath)) {
          walk(templatePath, templatePath);
        }
      } catch {
        // ignore
      }
      this.templates.set(relName, {
        name: relName,
        description: `Ad-hoc registered template '${relName}'`,
        baseTemplate: relName === "base" ? undefined : "base",
        files,
        defaultFeatures: [],
      });
    }
  }

  /** Return a resolved path for a registered template name (compat wrapper). */
  getTemplatePath(name: string): string | undefined {
    if (!this.templates.has(name)) return undefined;
    // Prefer custom registered path if present (for tests using temp dirs)
    const custom = this.customTemplatePaths.get(name);
    if (custom) return custom;
    return path.join(this.templatesDir, name);
  }

  /** List all registered template names (compat wrapper). */
  listTemplates(): string[] {
    return Array.from(this.templates.keys());
  }

  /** Whether a template name is registered (compat wrapper). */
  hasTemplate(name: string): boolean {
    return this.templates.has(name);
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

  async validateTemplateFiles(
    templateName: string,
    features: string[]
  ): Promise<{
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
        errors.push(
          `Error checking file ${file.templatePath}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    return {
      valid: errors.length === 0,
      missingFiles,
      errors,
    };
  }
}
