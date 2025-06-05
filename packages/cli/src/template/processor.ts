// src/template/processor.ts
import Handlebars from "handlebars";
import { TemplateContext, TemplateFile } from "./types.js";
import { TemplateLoader } from "./loader.js";

export class TemplateProcessor {
  private loader: TemplateLoader;
  private handlebars: typeof Handlebars;

  constructor() {
    this.loader = new TemplateLoader();
    this.handlebars = Handlebars.create();
    this.registerHelpers();
  }

  async processFile(
    file: TemplateFile,
    context: TemplateContext
  ): Promise<{
    content: string | Buffer;
    targetPath: string;
  }> {
    // Check condition if provided
    if (file.condition && !file.condition(context)) {
      throw new Error("File condition not met");
    }

    // Determine target path
    let targetPath = file.targetPath;
    if (file.rename) {
      targetPath = file.rename(context);
    }

    // Process template variables in target path
    targetPath = this.handlebars.compile(targetPath)(context);

    // Load and process file content
    let content: string | Buffer;

    if (file.transform) {
      // Load as text and apply Handlebars transformation
      const templateContent = await this.loader.loadTemplate(file.sourcePath);
      content = this.handlebars.compile(templateContent)(context);
    } else {
      // Check if it's a binary file or text file
      const extension = file.sourcePath.split(".").pop()?.toLowerCase();
      const binaryExtensions = [
        "png",
        "jpg",
        "jpeg",
        "gif",
        "ico",
        "woff",
        "woff2",
        "ttf",
      ];

      if (binaryExtensions.includes(extension || "")) {
        content = await this.loader.loadBinaryTemplate(file.sourcePath);
      } else {
        content = await this.loader.loadTemplate(file.sourcePath);
      }
    }

    return { content, targetPath };
  }

  async expandFilePatterns(files: TemplateFile[]): Promise<TemplateFile[]> {
    const expandedFiles: TemplateFile[] = [];

    for (const file of files) {
      if (file.sourcePath.includes("*")) {
        // Handle glob patterns
        const matchedPaths = await this.loader.expandGlobPattern(
          file.sourcePath
        );

        for (const matchedPath of matchedPaths) {
          // Skip if it's a directory
          if (await this.loader.isDirectory(matchedPath)) {
            continue;
          }

          // Calculate relative target path
          const relativeSourcePath = matchedPath.replace(
            file.sourcePath.replace("/**/*", ""),
            ""
          );
          const targetPath = join(file.targetPath, relativeSourcePath);

          expandedFiles.push({
            sourcePath: matchedPath,
            targetPath: targetPath,
            transform: file.transform,
            condition: file.condition,
            rename: file.rename,
          });
        }
      } else if (await this.loader.isDirectory(file.sourcePath)) {
        // Handle directory patterns
        const fileList = await this.loader.listFiles(file.sourcePath);

        for (const filePath of fileList) {
          const targetPath = join(file.targetPath, filePath);

          expandedFiles.push({
            sourcePath: join(file.sourcePath, filePath),
            targetPath: targetPath,
            transform: file.transform,
            condition: file.condition,
            rename: file.rename,
          });
        }
      } else {
        // Regular file
        expandedFiles.push(file);
      }
    }

    return expandedFiles;
  }

  private registerHelpers(): void {
    // Helper for conditional content
    this.handlebars.registerHelper(
      "if_feature",
      function (
        this: TemplateContext,
        feature: string,
        options: Handlebars.HelperOptions
      ) {
        const context = this as TemplateContext;
        return context.features.includes(feature as any)
          ? options.fn(this)
          : options.inverse(this);
      }
    );

    // Helper for database-specific content
    this.handlebars.registerHelper(
      "if_database",
      function (
        this: TemplateContext,
        database: string,
        options: Handlebars.HelperOptions
      ) {
        const context = this as TemplateContext;
        return context.database === database
          ? options.fn(this)
          : options.inverse(this);
      }
    );

    // Helper for template-specific content
    this.handlebars.registerHelper(
      "if_template",
      function (
        this: TemplateContext,
        template: string,
        options: Handlebars.HelperOptions
      ) {
        const context = this as TemplateContext;
        return context.template === template
          ? options.fn(this)
          : options.inverse(this);
      }
    );

    // Helper for uppercase
    this.handlebars.registerHelper("uppercase", function (str: string) {
      return str.toUpperCase();
    });

    // Helper for lowercase
    this.handlebars.registerHelper("lowercase", function (str: string) {
      return str.toLowerCase();
    });

    // Helper for Pascal case
    this.handlebars.registerHelper("pascalCase", function (str: string) {
      return str.charAt(0).toUpperCase() + str.slice(1);
    });

    // Helper for kebab case
    this.handlebars.registerHelper("kebabCase", function (str: string) {
      return str.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
    });

    // Helper for JSON stringify
    this.handlebars.registerHelper("json", function (obj: any) {
      return JSON.stringify(obj, null, 2);
    });
  }
}

function join(...paths: string[]): string {
  return paths.join("/").replace(/\/+/g, "/");
}
