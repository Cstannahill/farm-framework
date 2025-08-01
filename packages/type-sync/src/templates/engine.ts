import { promises as fs } from "fs";
import path from "path";
import Handlebars from "handlebars";

export interface Template {
  name: string;
  content: string;
  variables?: Record<string, any>;
  helpers?: Record<string, Handlebars.HelperDelegate>;
}

export interface TemplateContext {
  [key: string]: any;
}

export interface TemplateOptions {
  templatesDir?: string;
  customHelpers?: Record<string, Handlebars.HelperDelegate>;
  partials?: Record<string, string>;
}

/**
 * Template engine for generating code from templates
 */
export class TemplateEngine {
  private handlebars: typeof Handlebars;
  private templatesDir: string;
  private templates: Map<string, Template> = new Map();

  constructor(options: TemplateOptions = {}) {
    this.handlebars = Handlebars.create();
    this.templatesDir =
      options.templatesDir || path.join(__dirname, "templates");

    // Register built-in helpers
    this.registerBuiltInHelpers();

    // Register custom helpers
    if (options.customHelpers) {
      Object.entries(options.customHelpers).forEach(([name, helper]) => {
        this.handlebars.registerHelper(name, helper);
      });
    }

    // Register partials
    if (options.partials) {
      Object.entries(options.partials).forEach(([name, content]) => {
        this.handlebars.registerPartial(name, content);
      });
    }
  }

  /**
   * Load template from file
   */
  async loadTemplate(name: string, filePath?: string): Promise<Template> {
    const templatePath =
      filePath || path.join(this.templatesDir, `${name}.hbs`);
    const content = await fs.readFile(templatePath, "utf-8");

    const template: Template = {
      name,
      content,
    };

    this.templates.set(name, template);
    return template;
  }

  /**
   * Register template from string
   */
  registerTemplate(
    name: string,
    content: string,
    options?: { helpers?: Record<string, Handlebars.HelperDelegate> }
  ): Template {
    const template: Template = {
      name,
      content,
      helpers: options?.helpers,
    };

    this.templates.set(name, template);
    return template;
  }

  /**
   * Render template with context
   */
  render(templateName: string, context: TemplateContext): string {
    const template = this.templates.get(templateName);
    if (!template) {
      throw new Error(`Template not found: ${templateName}`);
    }

    // Register template-specific helpers if any
    if (template.helpers) {
      Object.entries(template.helpers).forEach(([name, helper]) => {
        this.handlebars.registerHelper(name, helper);
      });
    }

    const compiledTemplate = this.handlebars.compile(template.content);
    return compiledTemplate(context);
  }

  /**
   * Render template string directly
   */
  renderString(templateString: string, context: TemplateContext): string {
    const compiledTemplate = this.handlebars.compile(templateString);
    return compiledTemplate(context);
  }

  /**
   * Load all templates from directory
   */
  async loadTemplatesFromDirectory(directory: string): Promise<void> {
    try {
      const files = await fs.readdir(directory);
      const templateFiles = files.filter((file) => file.endsWith(".hbs"));

      for (const file of templateFiles) {
        const name = path.basename(file, ".hbs");
        await this.loadTemplate(name, path.join(directory, file));
      }
    } catch (error) {
      console.warn(
        `Failed to load templates from directory: ${directory}`,
        error
      );
    }
  }

  /**
   * Get list of registered templates
   */
  getTemplateNames(): string[] {
    return Array.from(this.templates.keys());
  }

  /**
   * Check if template exists
   */
  hasTemplate(name: string): boolean {
    return this.templates.has(name);
  }

  /**
   * Register built-in helpers
   */
  private registerBuiltInHelpers(): void {
    // String manipulation helpers
    this.handlebars.registerHelper("capitalize", (str: string) => {
      if (typeof str !== "string") return str;
      return str.charAt(0).toUpperCase() + str.slice(1);
    });

    this.handlebars.registerHelper("camelCase", (str: string) => {
      if (typeof str !== "string") return str;
      return str.replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) => chr.toUpperCase());
    });

    this.handlebars.registerHelper("pascalCase", (str: string) => {
      if (typeof str !== "string") return str;
      const camelCase = str.replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) =>
        chr.toUpperCase()
      );
      return camelCase.charAt(0).toUpperCase() + camelCase.slice(1);
    });

    this.handlebars.registerHelper("kebabCase", (str: string) => {
      if (typeof str !== "string") return str;
      return str
        .replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)
        .replace(/^-/, "");
    });

    this.handlebars.registerHelper("snakeCase", (str: string) => {
      if (typeof str !== "string") return str;
      return str
        .replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)
        .replace(/^_/, "");
    });

    this.handlebars.registerHelper("upperCase", (str: string) => {
      if (typeof str !== "string") return str;
      return str.toUpperCase();
    });

    this.handlebars.registerHelper("lowerCase", (str: string) => {
      if (typeof str !== "string") return str;
      return str.toLowerCase();
    });

    // Array helpers
    this.handlebars.registerHelper(
      "join",
      (array: any[], separator: string = ", ") => {
        if (!Array.isArray(array)) return "";
        return array.join(separator);
      }
    );

    this.handlebars.registerHelper("length", (array: any[]) => {
      if (!Array.isArray(array)) return 0;
      return array.length;
    });

    this.handlebars.registerHelper("first", (array: any[]) => {
      if (!Array.isArray(array) || array.length === 0) return null;
      return array[0];
    });

    this.handlebars.registerHelper("last", (array: any[]) => {
      if (!Array.isArray(array) || array.length === 0) return null;
      return array[array.length - 1];
    });

    // Conditional helpers
    this.handlebars.registerHelper("eq", (a: any, b: any) => a === b);
    this.handlebars.registerHelper("ne", (a: any, b: any) => a !== b);
    this.handlebars.registerHelper("gt", (a: any, b: any) => a > b);
    this.handlebars.registerHelper("gte", (a: any, b: any) => a >= b);
    this.handlebars.registerHelper("lt", (a: any, b: any) => a < b);
    this.handlebars.registerHelper("lte", (a: any, b: any) => a <= b);
    this.handlebars.registerHelper("and", (a: any, b: any) => a && b);
    this.handlebars.registerHelper("or", (a: any, b: any) => a || b);
    this.handlebars.registerHelper("not", (a: any) => !a);

    // Type helpers for TypeScript generation
    this.handlebars.registerHelper("tsType", (schema: any) => {
      return this.mapToTypeScriptType(schema);
    });

    this.handlebars.registerHelper(
      "optional",
      (required: string[], fieldName: string) => {
        if (!Array.isArray(required)) return "?";
        return required.includes(fieldName) ? "" : "?";
      }
    );

    this.handlebars.registerHelper(
      "indent",
      (text: string, spaces: number = 2) => {
        if (typeof text !== "string") return text;
        const indent = " ".repeat(spaces);
        return text
          .split("\n")
          .map((line) => (line ? indent + line : line))
          .join("\n");
      }
    );

    // JSON helpers
    this.handlebars.registerHelper(
      "json",
      (obj: any, pretty: boolean = false) => {
        return pretty ? JSON.stringify(obj, null, 2) : JSON.stringify(obj);
      }
    );

    // Date helpers
    this.handlebars.registerHelper("now", () => new Date().toISOString());
    this.handlebars.registerHelper("year", () => new Date().getFullYear());

    // Comment helpers
    this.handlebars.registerHelper(
      "jsDoc",
      (description: string, params?: any[]) => {
        let jsdoc = "/**\n";
        if (description) {
          jsdoc += ` * ${description}\n`;
        }
        if (params && Array.isArray(params)) {
          params.forEach((param) => {
            jsdoc += ` * @param ${param.name} ${param.description || ""}\n`;
          });
        }
        jsdoc += " */";
        return new this.handlebars.SafeString(jsdoc);
      }
    );

    // Code generation helpers
    this.handlebars.registerHelper("methodName", (operationId: string) => {
      return operationId.charAt(0).toLowerCase() + operationId.slice(1);
    });

    this.handlebars.registerHelper("className", (name: string) => {
      return name.charAt(0).toUpperCase() + name.slice(1);
    });

    this.handlebars.registerHelper("interfaceName", (name: string) => {
      const className = name.charAt(0).toUpperCase() + name.slice(1);
      return className.endsWith("Interface")
        ? className
        : className + "Interface";
    });
  }

  private mapToTypeScriptType(schema: any): string {
    if (!schema) return "any";

    if (schema.$ref) {
      return schema.$ref.split("/").pop();
    }

    switch (schema.type) {
      case "string":
        if (schema.format === "date-time") return "Date";
        return "string";
      case "number":
      case "integer":
        return "number";
      case "boolean":
        return "boolean";
      case "array":
        return `${this.mapToTypeScriptType(schema.items)}[]`;
      case "object":
        return "Record<string, any>";
      default:
        return "any";
    }
  }
}

/**
 * Built-in template registry
 */
export class BuiltInTemplates {
  static getTypeScriptInterfaceTemplate(): string {
    return `{{#if description}}
/**
 * {{description}}
 {{#if examples}}
 * @example
 * {{#each examples}}
 * {{this}}
 * {{/each}}
 {{/if}}
 */
{{/if}}
export interface {{pascalCase name}} {
{{#each properties}}
  {{#if description}}
  /** {{description}} */
  {{/if}}
  {{name}}{{optional required name}}: {{tsType schema}};
{{/each}}
}`;
  }

  static getTypeScriptEnumTemplate(): string {
    return `{{#if description}}
/**
 * {{description}}
 */
{{/if}}
export enum {{pascalCase name}} {
{{#each values}}
  {{upperCase this}} = '{{this}}',
{{/each}}
}`;
  }

  static getAPIClientMethodTemplate(): string {
    return `{{jsDoc summary parameters}}
async {{methodName operationId}}({{#if hasParams}}request: {{className operationId}}Request{{/if}}): Promise<{{className operationId}}Response> {
  const url = this.buildUrl('{{path}}', request?.path);
  const config = {
    method: '{{upperCase method}}',
    {{#if hasQuery}}params: request?.query,{{/if}}
    {{#if hasBody}}data: request?.body,{{/if}}
  };
  
  return this.executeRequest(url, config);
}`;
  }

  static getReactHookTemplate(): string {
    return `{{jsDoc summary}}
export function {{camelCase operationId}}({{#if hasParams}}params: {{className operationId}}Params{{/if}}) {
  return useQuery({
    queryKey: ['{{kebabCase operationId}}'{{#if hasParams}}, params{{/if}}],
    queryFn: () => api.{{methodName operationId}}({{#if hasParams}}params{{/if}}),
  });
}`;
  }

  static getValidationSchemaTemplate(): string {
    return `export const {{camelCase name}}Schema = z.object({
{{#each properties}}
  {{name}}: {{zodType schema}}{{#unless (includes ../required name)}}.optional(){{/unless}},
{{/each}}
});

export type {{pascalCase name}} = z.infer<typeof {{camelCase name}}Schema>;`;
  }
}

export default TemplateEngine;
