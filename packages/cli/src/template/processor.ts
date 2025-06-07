// packages/cli/src/template/processor.ts
import path from "path";
import fs from "fs-extra";
import { fileURLToPath } from "url";
import Handlebars from "handlebars";
import { glob } from "glob";
import { TemplateContext, TemplateFile } from "./types.js";
import { logger } from "../utils/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class TemplateProcessor {
  private templatesDir: string;
  private handlebars: typeof Handlebars;
  private switch_value?: any;
  private switch_break?: boolean;
  constructor() {
    // Point to the actual templates directory
    this.templatesDir = path.resolve(__dirname, "../../../templates");
    this.handlebars = Handlebars.create();
    this.registerHelpers();
  }

  async processTemplate(
    templateName: string,
    context: TemplateContext,
    outputPath: string
  ): Promise<string[]> {
    const templatePath = path.join(this.templatesDir, templateName);

    if (!(await fs.pathExists(templatePath))) {
      throw new Error(`Template directory not found: ${templatePath}`);
    }

    logger.info(`📂 Processing template: ${templateName}`);

    const generatedFiles: string[] = [];

    // Get all template files
    const templateFiles = await this.getTemplateFiles(templatePath);

    for (const templateFile of templateFiles) {
      const sourcePath = path.join(templatePath, templateFile);
      const relativePath = templateFile.replace(/\.hbs$/, ""); // Remove .hbs extension
      const targetPath = path.join(outputPath, relativePath);

      // Skip if condition doesn't match
      if (!this.shouldProcessFile(templateFile, context)) {
        continue;
      }

      // Ensure target directory exists
      await fs.ensureDir(path.dirname(targetPath));

      try {
        // Process the file
        if (templateFile.endsWith(".hbs")) {
          // Process Handlebars template
          const templateContent = await fs.readFile(sourcePath, "utf-8");

          // Add better error context
          logger.debug(`Processing template file: ${templateFile}`);

          const compiled = this.handlebars.compile(templateContent);
          const output = compiled(this.createTemplateData(context));

          await fs.writeFile(targetPath, output);
          logger.debug(`✅ Generated: ${relativePath}`);
        } else {
          // Copy binary files as-is
          await fs.copy(sourcePath, targetPath);
          logger.debug(`📋 Copied: ${relativePath}`);
        }

        generatedFiles.push(relativePath);
      } catch (error) {
        // Enhanced error reporting
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        throw new Error(
          `Failed to process template file "${templateFile}": ${errorMessage}`
        );
      }
    }

    return generatedFiles;
  }

  private async getTemplateFiles(templatePath: string): Promise<string[]> {
    const pattern = path.join(templatePath, "**/*").replace(/\\/g, "/");

    const files = await glob(pattern, {
      ignore: [
        "**/node_modules/**",
        "**/dist/**",
        "**/build/**",
        "**/.git/**",
        "**/coverage/**",
        "**/*.log",
      ],
      nodir: true,
      dot: true,
    });

    return files.map((file) => path.relative(templatePath, file));
  }

  private shouldProcessFile(
    filePath: string,
    context: TemplateContext
  ): boolean {
    // Skip frontend files for api-only template
    if (context.template === "api-only" && filePath.includes("apps/web")) {
      return false;
    }

    // Skip AI files if AI feature not enabled
    if (
      !context.features.includes("ai") &&
      (filePath.includes("/ai/") || filePath.includes("/chat/"))
    ) {
      return false;
    }

    // Skip auth files if auth feature not enabled
    if (!context.features.includes("auth") && filePath.includes("/auth/")) {
      return false;
    }

    return true;
  }

  private createTemplateData(context: TemplateContext) {
    const kebabName = this.toKebabCase(context?.projectName as string);

    return {
      // Basic project info
      projectName: context.projectName,
      projectNamePascal: this.toPascalCase(context.projectName as string),
      projectNameKebab: kebabName,
      template: context.template,
      version: "0.1.0",
      description:
        context.description ||
        `A FARM Stack application using ${context.template} template`,

      // Features
      features: context.features,
      hasFeature: (feature: string) =>
        context.features.includes(feature as any),

      // Database configuration
      database: {
        type: context.database,
        url: this.getDatabaseUrl(
          typeof context.database === "string"
            ? context.database
            : context.database.type,
          kebabName
        ),
        options: this.getDatabaseOptions(
          typeof context.database === "string"
            ? context.database
            : context.database.type
        ),
      },

      // AI configuration (only if AI feature enabled)
      ai: context.features.includes("ai")
        ? {
            providers: {
              ollama: {
                enabled: true,
                url: "http://localhost:11434",
                models:
                  context.template === "ai-chat"
                    ? ["llama3.1", "codestral"]
                    : ["llama3.1"],
                defaultModel: "llama3.1",
                autoStart: true,
                autoPull: ["llama3.1"],
                gpu: true,
              },
              openai: {
                enabled: true,
                models: ["gpt-4", "gpt-3.5-turbo"],
                defaultModel: "gpt-3.5-turbo",
                rateLimiting: {
                  requestsPerMinute: 60,
                  tokensPerMinute: 40000,
                },
              },
            },
            routing: {
              development: "ollama",
              staging: "openai",
              production: "openai",
            },
            features: {
              streaming: true,
              caching: true,
              rateLimiting: true,
              fallback: true,
            },
          }
        : undefined,

      // Development configuration
      development: {
        ports: {
          frontend: context.template !== "api-only" ? 3000 : undefined,
          backend: 8000,
          proxy: 4000,
          ai: context.features.includes("ai") ? 11434 : undefined,
        },
        hotReload: {
          enabled: true,
          typeGeneration: true,
          aiModels: context.features.includes("ai"),
        },
        ssl: false,
      },

      // Build configuration
      build: {
        target: "node18",
        sourcemap: true,
        minify: true,
        splitting: true,
        outDir: "dist",
      },

      // Deployment (optional)
      deployment:
        context.template !== "basic"
          ? {
              platform: "vercel",
              regions: ["us-east-1"],
              environment: {
                NODE_ENV: "production",
              },
            }
          : undefined,

      // Plugins (optional)
      plugins: (() => {
        const pluginList = this.getPluginsForTemplate(context);
        return pluginList.length > 0 ? pluginList : undefined;
      })(),

      // Helper flags
      typescript: context.typescript,
      docker: context.docker,
      git: context.git,
      currentYear: new Date().getFullYear(),
      isApiOnly: context.template === "api-only",
      hasAI: context.features.includes("ai"),
      hasAuth: context.features.includes("auth"),
      hasRealtime: context.features.includes("realtime"),
    };
  }

  private getDatabaseUrl(database: string, projectName: string): string {
    switch (database) {
      case "mongodb":
        return `mongodb://localhost:27017/${projectName}`;
      case "postgresql":
        return `postgresql://user:password@localhost:5432/${projectName}`;
      case "mysql":
        return `mysql://user:password@localhost:3306/${projectName}`;
      case "sqlite":
        return `sqlite:///${projectName}.db`;
      default:
        return `mongodb://localhost:27017/${projectName}`;
    }
  }

  private getDatabaseOptions(database: string): any {
    switch (database) {
      case "mongodb":
        return {
          maxPoolSize: 10,
          serverSelectionTimeoutMS: 5000,
        };
      default:
        return undefined;
    }
  }

  private getPluginsForTemplate(context: TemplateContext): any[] {
    const plugins: any[] = [];

    if (context.features.includes("auth")) {
      plugins.push("@farm/plugin-auth");
    }

    if (context.features.includes("storage")) {
      plugins.push(["@farm/plugin-storage", { provider: "s3" }]);
    }

    return plugins;
  }

  private registerHelpers(): void {
    // Existing helpers...
    this.handlebars.registerHelper("eq", (a, b) => a === b);
    this.handlebars.registerHelper(
      "includes",
      (array, value) => Array.isArray(array) && array.includes(value)
    );
    this.handlebars.registerHelper("toUpperCase", (str) =>
      String(str).toUpperCase()
    );
    this.handlebars.registerHelper("toLowerCase", (str) =>
      String(str).toLowerCase()
    );
    this.handlebars.registerHelper("capitalize", (str) => {
      const s = String(str);
      return s.charAt(0).toUpperCase() + s.slice(1);
    });

    // Join helper for arrays
    this.handlebars.registerHelper("join", (array, separator = ", ") => {
      return Array.isArray(array) ? array.join(separator) : "";
    });

    // JSON helper (lowercase)
    this.handlebars.registerHelper("json", (obj) => {
      try {
        return JSON.stringify(obj, null, 2);
      } catch (error) {
        return "{}";
      }
    });

    // NEW: Add missing custom helpers
    this.handlebars.registerHelper("kebabCase", (str) => {
      return String(str)
        .replace(/([a-z])([A-Z])/g, "$1-$2")
        .replace(/[\s_]+/g, "-")
        .toLowerCase();
    });

    this.handlebars.registerHelper("isArray", (value) => {
      return Array.isArray(value);
    });

    // Feature checking helpers
    this.handlebars.registerHelper("if_feature", (feature, options) => {
      const context = options.data.root;
      if (context.features && context.features.includes(feature)) {
        return options.fn(this);
      }
      return options.inverse(this);
    });

    this.handlebars.registerHelper("if_template", (template, options) => {
      const context = options.data.root;
      if (context.template === template) {
        return options.fn(this);
      }
      return options.inverse(this);
    });

    // Switch/case helpers for database URLs
    this.handlebars.registerHelper("switch", (value, options) => {
      this.switch_value = value;
      this.switch_break = false;
      const result = options.fn(this);
      delete this.switch_break;
      delete this.switch_value;
      return result;
    });

    this.handlebars.registerHelper("case", (value, options) => {
      if (value === this.switch_value) {
        this.switch_break = true;
        return options.fn(this);
      }
      return "";
    });
  }

  private toPascalCase(str: string): string {
    return str
      .split(/[-_]/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join("");
  }

  private toKebabCase(str: string): string {
    return str
      .replace(/([a-z])([A-Z])/g, "$1-$2")
      .replace(/[\s_]+/g, "-")
      .toLowerCase();
  }
}
