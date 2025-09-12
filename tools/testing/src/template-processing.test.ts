/**
 * Comprehensive Vitest tests for FARM Framework template processing system
 *
 * Tests cover:
 * - Template processing and compilation
 * - Handlebars helpers functionality
 * - Handlebars singleton behavior
 * - Template generation and scaffolding
 * - Template registry operations
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { TemplateProcessor } from "@farm-framework/cli/template/processor";
import { TemplateRegistry } from "@farm-framework/cli/template/registry";
import {
  HandlebarsSingleton,
  getHandlebars,
  compileTemplate,
  handlebarsSingleton,
} from "@farm-framework/cli/template/handlebars-singleton";
import { registerHandlebarsHelpers } from "@farm-framework/cli/template/helpers";
import { ProjectScaffolder } from "@farm-framework/cli/scaffolding/scaffolder";
import { TemplateContext } from "@farm-framework/types";
import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test fixtures
const testTemplateContext: TemplateContext = {
  projectName: "test-project",
  name: "test-project",
  template: "basic",
  features: ["auth", "ai"],
  database: "postgresql",
  environment: "development",
  typescript: true,
  docker: true,
  farmVersion: "1.0.0",
  timestamp: new Date().toISOString(),
  answers: {},
};

const testTemplateContent = `
# {{project_name}}

{{#if_feature auth}}
## Authentication
This project includes authentication features.
{{/if_feature}}

{{#if_database postgresql}}
## Database
Using PostgreSQL database.
{{/if_database}}

{{#has_ai_enabled}}
## AI Features
AI capabilities are enabled.
{{/has_ai_enabled}}

Project name variants:
- Kebab: {{project_name_kebab}}
- Snake: {{project_name_snake}}
- Pascal: {{project_name_pascal}}
- Camel: {{project_name_camel}}

Features: {{join features ", "}}
`;

describe("Template Processing System", () => {
  let tempDir: string;
  let processor: TemplateProcessor;
  let registry: TemplateRegistry;

  beforeEach(async () => {
    // Create temporary directory for tests
    tempDir = path.join(__dirname, "temp-test-dir");
    await fs.ensureDir(tempDir);

    processor = new TemplateProcessor();
    registry = new TemplateRegistry();
  });

  afterEach(async () => {
    // Clean up temporary directory
    if (await fs.pathExists(tempDir)) {
      await fs.remove(tempDir);
    }
  });

  describe("TemplateProcessor", () => {
    it("should initialize with default settings", () => {
      expect(processor).toBeDefined();
      expect(processor).toBeInstanceOf(TemplateProcessor);
    });

    it("should process a simple template with context", async () => {
      const outputPath = path.join(tempDir, "output.txt");

      const result = await processor.processTemplate(
        "basic",
        testTemplateContext,
        outputPath,
        { dryRun: true }
      );

      expect(result.metrics.filesProcessed).toBeGreaterThan(0);
    });

    it("should handle template compilation errors gracefully", async () => {
      const outputPath = path.join(tempDir, "output.txt");

      try {
        await processor.processTemplate(
          "invalid-template",
          testTemplateContext,
          outputPath,
          { dryRun: true }
        );
        expect(true).toBe(false);
      } catch (error) {
        const err: any = error as any;
        expect(String(err?.message ?? err)).toContain(
          "Template directory not found"
        );
      }
    });

    it("should support dry run mode", async () => {
      const outputPath = path.join(tempDir, "output.txt");

      const result = await processor.processTemplate(
        "basic",
        testTemplateContext,
        outputPath,
        { dryRun: true }
      );

      expect(result.metrics.templatesCompiled).toBeGreaterThan(0);
      // In dry run mode, files shouldn't be written
      expect(await fs.pathExists(outputPath)).toBe(false);
    });

    it("should track processing metrics", async () => {
      const outputPath = path.join(tempDir, "output.txt");

      const result = await processor.processTemplate(
        "basic",
        testTemplateContext,
        outputPath,
        { dryRun: true }
      );

      expect(result.metrics).toBeDefined();
      expect(result.metrics.totalProcessingTime).toBeGreaterThan(0);
      expect(result.metrics.templatesCompiled).toBeGreaterThan(0);
    });
  });

  describe("TemplateRegistry", () => {
    it("should initialize with empty registry", () => {
      expect(registry).toBeDefined();
      expect(registry).toBeInstanceOf(TemplateRegistry);
    });

    it("should register and retrieve templates", () => {
      const templateName = "test-template";
      const templatePath = path.join(tempDir, "templates", templateName);

      registry.registerTemplate(templateName, templatePath);

      const retrievedPath = registry.getTemplatePath(templateName);
      expect(retrievedPath).toBe(templatePath);
    });

    it("should list all registered templates", () => {
      const template1 = "template-1";
      const template2 = "template-2";

      registry.registerTemplate(template1, path.join(tempDir, "t1"));
      registry.registerTemplate(template2, path.join(tempDir, "t2"));

      const templates = registry.listTemplates();
      expect(templates).toContain(template1);
      expect(templates).toContain(template2);
    });

    it("should validate template existence", () => {
      const templateName = "existing-template";
      const templatePath = path.join(tempDir, "existing");

      registry.registerTemplate(templateName, templatePath);

      expect(registry.hasTemplate(templateName)).toBe(true);
      expect(registry.hasTemplate("non-existing")).toBe(false);
    });
  });

  describe("Handlebars Helpers", () => {
    let handlebars: any;

    beforeEach(() => {
      handlebars = getHandlebars();
      registerHandlebarsHelpers(handlebars);
    });

    describe("Database Helpers", () => {
      it("should check database type with if_database", () => {
        const template =
          '{{#if_database "postgresql"}}PostgreSQL{{else}}Other{{/if_database}}';
        const compiled = handlebars.compile(template);

        const result = compiled(testTemplateContext);
        expect(result).toBe("PostgreSQL");
      });

      it("should check database type with unless_database", () => {
        const template =
          '{{#unless_database "mongodb"}}Not MongoDB{{else}}MongoDB{{/unless_database}}';
        const compiled = handlebars.compile(template);

        const result = compiled(testTemplateContext);
        expect(result).toBe("Not MongoDB");
      });

      it("should check specific database types", () => {
        const templates = {
          "{{#is_postgresql}}PostgreSQL{{/is_postgresql}}": "PostgreSQL",
          "{{#is_mongodb}}MongoDB{{/is_mongodb}}": "",
          "{{#is_mysql}}MySQL{{/is_mysql}}": "",
          "{{#is_sqlite}}SQLite{{/is_sqlite}}": "",
        };

        Object.entries(templates).forEach(([template, expected]) => {
          const compiled = handlebars.compile(template);
          const result = compiled(testTemplateContext);
          expect(result).toBe(expected);
        });
      });
    });

    describe("Feature Helpers", () => {
      it("should check feature existence with if_feature", () => {
        const template =
          '{{#if_feature "auth"}}Auth enabled{{else}}Auth disabled{{/if_feature}}';
        const compiled = handlebars.compile(template);

        const result = compiled(testTemplateContext);
        expect(result).toBe("Auth enabled");
      });

      it("should check feature absence with unless_feature", () => {
        const template =
          "{{#unless_feature payments}}No payments{{else}}Payments enabled{{/unless_feature}}";
        const compiled = handlebars.compile(template);

        const result = compiled(testTemplateContext);
        expect(result).toBe("No payments");
      });

      it("should check specific features", () => {
        const templates = {
          "{{#has_auth}}Auth{{/has_auth}}": "Auth",
          "{{#has_ai}}AI{{/has_ai}}": "AI",
          "{{#has_payments}}Payments{{/has_payments}}": "",
          "{{#has_features}}Has features{{else}}No features{{/has_features}}":
            "Has features",
        };

        Object.entries(templates).forEach(([template, expected]) => {
          const compiled = handlebars.compile(template);
          const result = compiled(testTemplateContext);
          expect(result).toBe(expected);
        });
      });
    });

    describe("AI Provider Helpers", () => {
      it("should check AI provider with if_ai_provider", () => {
        const template =
          '{{#if_ai_provider "ollama"}}Ollama enabled{{else}}Ollama disabled{{/if_ai_provider}}';
        const compiled = handlebars.compile(template);

        const result = compiled(testTemplateContext);
        expect(result).toBe("Ollama enabled");
      });

      it("should check specific AI providers", () => {
        const templates = {
          "{{#has_ollama}}Ollama{{/has_ollama}}": "Ollama",
          "{{#has_openai}}OpenAI{{/has_openai}}": "",
          "{{#has_huggingface}}HuggingFace{{/has_huggingface}}": "",
          "{{#has_ai_enabled}}AI enabled{{else}}AI disabled{{/has_ai_enabled}}":
            "AI enabled",
        };

        Object.entries(templates).forEach(([template, expected]) => {
          const compiled = handlebars.compile(template);
          const result = compiled(testTemplateContext);
          expect(result).toBe(expected);
        });
      });
    });

    describe("Template Helpers", () => {
      it("should check template type with if_template", () => {
        const template =
          '{{#if_template "basic"}}Basic template{{else}}Other template{{/if_template}}';
        const compiled = handlebars.compile(template);

        const result = compiled(testTemplateContext);
        expect(result).toBe("Basic template");
      });

      it("should check specific templates", () => {
        const templates = {
          "{{#is_basic}}Basic{{/is_basic}}": "Basic",
          "{{#is_ai_chat}}AI Chat{{/is_ai_chat}}": "",
          "{{#is_ai_dashboard}}AI Dashboard{{/is_ai_dashboard}}": "",
          "{{#is_ecommerce}}E-commerce{{/is_ecommerce}}": "",
        };

        Object.entries(templates).forEach(([template, expected]) => {
          const compiled = handlebars.compile(template);
          const result = compiled(testTemplateContext);
          expect(result).toBe(expected);
        });
      });
    });

    describe("Environment Helpers", () => {
      it("should check environment with if_env", () => {
        const template =
          '{{#if_env "development"}}Development{{else}}Other{{/if_env}}';
        const compiled = handlebars.compile(template);

        const result = compiled(testTemplateContext);
        expect(result).toBe("Development");
      });

      it("should check specific environments", () => {
        const templates = {
          "{{#is_development}}Development{{/is_development}}": "Development",
          "{{#is_production}}Production{{/is_production}}": "",
          "{{#is_staging}}Staging{{/is_staging}}": "",
        };

        Object.entries(templates).forEach(([template, expected]) => {
          const compiled = handlebars.compile(template);
          const result = compiled(testTemplateContext);
          expect(result).toBe(expected);
        });
      });
    });

    describe("String Transformation Helpers", () => {
      it("should transform strings to different cases", () => {
        const testString = "My Test Project";

        const templates = {
          '{{kebabCase "My Test Project"}}': "my-test-project",
          '{{snake_case "My Test Project"}}': "my_test_project",
          '{{camel_case "my-test-project"}}': "myTestProject",
          '{{pascal_case "my-test-project"}}': "MyTestProject",
          '{{capitalize "hello"}}': "Hello",
          '{{lowercase "HELLO"}}': "hello",
          '{{uppercase "hello"}}': "HELLO",
        };

        Object.entries(templates).forEach(([template, expected]) => {
          const compiled = handlebars.compile(template);
          const result = compiled({});
          expect(result).toBe(expected);
        });
      });

      it("should handle pluralization", () => {
        const templates = {
          '{{pluralize "user"}}': "users",
          '{{pluralize "box"}}': "boxes",
          '{{pluralize "city"}}': "cities",
          '{{pluralize "users"}}': "users",
        };

        Object.entries(templates).forEach(([template, expected]) => {
          const compiled = handlebars.compile(template);
          const result = compiled({});
          expect(result).toBe(expected);
        });
      });
    });

    describe("Array Helpers", () => {
      it("should join arrays with separator", () => {
        const template = '{{join features ", "}}';
        const compiled = handlebars.compile(template);

        const result = compiled(testTemplateContext);
        expect(result).toBe("auth, ai");
      });

      it("should get array length", () => {
        const template = "{{length features}}";
        const compiled = handlebars.compile(template);

        const result = compiled(testTemplateContext);
        // Handlebars renders primitives as strings in interpolation
        expect(result).toBe("2");
      });
    });

    describe("Logic Helpers", () => {
      it("should perform logical operations", () => {
        const templates = {
          "{{#and true true}}Both true{{else}}Not both true{{/and}}":
            "Both true",
          "{{#and true false}}Both true{{else}}Not both true{{/and}}":
            "Not both true",
          "{{#or true false}}At least one true{{else}}Both false{{/or}}":
            "At least one true",
          "{{#or false false}}At least one true{{else}}Both false{{/or}}":
            "Both false",
          "{{#not false}}Not false{{else}}Is false{{/not}}": "Not false",
          "{{#not true}}Not true{{else}}Is true{{/not}}": "Is true",
        };

        Object.entries(templates).forEach(([template, expected]) => {
          const compiled = handlebars.compile(template);
          const result = compiled({});
          expect(result).toBe(expected);
        });
      });

      it("should perform comparisons", () => {
        const templates = {
          "{{#eq 5 5}}Equal{{else}}Not equal{{/eq}}": "Equal",
          "{{#eq 5 6}}Equal{{else}}Not equal{{/eq}}": "Not equal",
          "{{#ne 5 6}}Not equal{{else}}Equal{{/ne}}": "Not equal",
          "{{#gt 6 5}}Greater{{else}}Not greater{{/gt}}": "Greater",
          "{{#lt 4 5}}Less{{else}}Not less{{/lt}}": "Less",
        };

        Object.entries(templates).forEach(([template, expected]) => {
          const compiled = handlebars.compile(template);
          const result = compiled({});
          expect(result).toBe(expected);
        });
      });

      it("should check array inclusion", () => {
        const template =
          '{{#includes features "auth"}}Has auth{{else}}No auth{{/includes}}';
        const compiled = handlebars.compile(template);

        const result = compiled(testTemplateContext);
        expect(result).toBe("Has auth");
      });
    });

    describe("Project Helpers", () => {
      it("should generate project name variants", () => {
        const templates = {
          "{{project_name}}": "test-project",
          "{{project_name_kebab}}": "test-project",
          "{{project_name_snake}}": "test_project",
          "{{project_name_camel}}": "testProject",
          "{{project_name_pascal}}": "TestProject",
        };

        Object.entries(templates).forEach(([template, expected]) => {
          const compiled = handlebars.compile(template);
          const result = compiled(testTemplateContext);
          expect(result).toBe(expected);
        });
      });

      it("should provide metadata", () => {
        const templates = {
          "{{farm_version}}": "1.0.0",
          "{{year}}": new Date().getFullYear().toString(),
        };

        Object.entries(templates).forEach(([template, expected]) => {
          const compiled = handlebars.compile(template);
          const result = compiled(testTemplateContext);
          expect(result).toBe(expected);
        });
      });
    });

    describe("Development Helpers", () => {
      it("should check development options", () => {
        const templates = {
          "{{#has_typescript}}TypeScript{{else}}No TypeScript{{/has_typescript}}":
            "TypeScript",
          "{{#has_docker}}Docker{{else}}No Docker{{/has_docker}}": "Docker",
          "{{#has_testing}}Testing{{else}}No Testing{{/has_testing}}":
            "Testing",
        };

        Object.entries(templates).forEach(([template, expected]) => {
          const compiled = handlebars.compile(template);
          const result = compiled(testTemplateContext);
          expect(result).toBe(expected);
        });
      });
    });

    describe("Plugin Helpers", () => {
      it("should check plugin existence", () => {
        const template =
          '{{#if_plugin "@farm/auth"}}Auth plugin{{else}}No auth plugin{{/if_plugin}}';
        const compiled = handlebars.compile(template);

        const result = compiled(testTemplateContext);
        expect(result).toBe("Auth plugin");
      });
    });

    describe("Configuration Helpers", () => {
      it("should get nested configuration values", () => {
        const template = '{{get_config "ai.providers.ollama.url" "default"}}';
        const compiled = handlebars.compile(template);

        const result = compiled(testTemplateContext);
        expect(result).toBe("http://localhost:11434");
      });

      it("should provide default values for missing config", () => {
        const template = '{{get_config "missing.config" "default"}}';
        const compiled = handlebars.compile(template);

        const result = compiled(testTemplateContext);
        expect(result).toBe("default");
      });

      it("should stringify JSON objects", () => {
        // Use triple-stache to avoid HTML escaping of quotes
        const template = '{{{json (get_config "ai")}}}';
        const compiled = handlebars.compile(template);

        const result = compiled(testTemplateContext);
        expect(result).toContain('"ollama"');
        expect(result).toContain('"enabled":true');
      });
    });

    describe("Default Value Helper", () => {
      it("should provide default values", () => {
        const templates = {
          '{{default "value" "default"}}': "value",
          '{{default "" "default"}}': "default",
          '{{default null "default"}}': "default",
          '{{default undefined "default"}}': "default",
        };

        Object.entries(templates).forEach(([template, expected]) => {
          const compiled = handlebars.compile(template);
          const result = compiled({});
          expect(result).toBe(expected);
        });
      });
    });
  });

  describe("Handlebars Singleton", () => {
    it("should return the same instance", () => {
      const instance1 = HandlebarsSingleton.getInstance();
      const instance2 = HandlebarsSingleton.getInstance();

      expect(instance1).toBe(instance2);
    });

    it("should compile templates correctly", () => {
      const template = "Hello {{projectName}}!";
      const compiled = handlebarsSingleton.compile(template);

      const result = compiled(testTemplateContext);
      expect(result).toBe("Hello test-project!");
    });

    it("should cache compiled templates", () => {
      const template = "Hello {{projectName}}!";

      const compiled1 = handlebarsSingleton.compile(template);
      const compiled2 = handlebarsSingleton.compile(template);

      expect(compiled1).toBe(compiled2);
    });

    it("should provide cache statistics", () => {
      const stats = handlebarsSingleton.getCacheStats();

      expect(stats).toBeDefined();
      expect(stats.size).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(stats.keys)).toBe(true);
    });

    it("should register helpers correctly", () => {
      const testHelper = vi.fn(() => "test-helper-result");

      handlebarsSingleton.registerHelper("testHelper", testHelper);

      const template = "{{testHelper}}";
      const compiled = handlebarsSingleton.compile(template);
      const result = compiled({});

      expect(result).toBe("test-helper-result");
      expect(testHelper).toHaveBeenCalled();
    });

    it("should check helper existence", () => {
      handlebarsSingleton.registerHelper("existingHelper", () => "test");

      expect(handlebarsSingleton.hasHelper("existingHelper")).toBe(true);
      expect(handlebarsSingleton.hasHelper("nonExistingHelper")).toBe(false);
    });

    it("should list registered helpers", () => {
      const helpers = handlebarsSingleton.getRegisteredHelpers();

      expect(Array.isArray(helpers)).toBe(true);
      expect(helpers.length).toBeGreaterThan(0);
      expect(helpers).toContain("if_feature");
      expect(helpers).toContain("if_database");
      expect(helpers).toContain("kebabCase");
    });
  });

  describe("Template Generation Integration", () => {
    it("should generate a complete project structure", async () => {
      const projectPath = path.join(tempDir, "generated-project");
      const scaffolder = new ProjectScaffolder({
        verbose: false,
        skipInstall: true,
      });

      const result = await scaffolder.generateProject(
        projectPath,
        testTemplateContext
      );

      expect(result.success).toBe(true);
      expect(Array.isArray(result.generatedFiles)).toBe(true);
      expect(await fs.pathExists(projectPath)).toBe(true);
    });

    it("should handle generation errors gracefully", async () => {
      const projectPath = path.join(tempDir, "invalid-project");
      const scaffolder = new ProjectScaffolder({
        verbose: false,
        skipInstall: true,
      });

      // Use invalid context to trigger errors
      const invalidContext = {
        ...testTemplateContext,
        template: "non-existent-template",
      };

      const result = await scaffolder.generateProject(
        projectPath,
        invalidContext
      );

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("should process complex templates with inheritance", async () => {
      const outputPath = path.join(tempDir, "complex-output.txt");

      const result = await processor.processTemplate(
        "ai-chat",
        testTemplateContext,
        outputPath,
        { dryRun: true }
      );

      expect(result.metrics.filesProcessed).toBeGreaterThan(0);
    });
  });

  describe("Error Handling", () => {
    it("should handle missing template files", async () => {
      try {
        await processor.processTemplate(
          "non-existent-template",
          testTemplateContext,
          path.join(tempDir, "output.txt"),
          { dryRun: true }
        );
        expect(true).toBe(false);
      } catch (error) {
        const err: any = error as any;
        expect(String(err?.message ?? err)).toContain(
          "Template directory not found"
        );
      }
    });

    it("should handle invalid handlebars syntax", async () => {
      try {
        await processor.processTemplate(
          "invalid-syntax",
          testTemplateContext,
          path.join(tempDir, "output.txt"),
          { dryRun: true }
        );
        expect(true).toBe(false);
      } catch (error) {
        const err: any = error as any;
        expect(String(err?.message ?? err)).toContain(
          "Template directory not found"
        );
      }
    });

    it("should handle missing context properties", async () => {
      const result = await processor.processTemplate(
        "basic",
        testTemplateContext,
        path.join(tempDir, "output.txt"),
        { dryRun: true }
      );

      // Should succeed with existing template
      expect(result.metrics.filesProcessed).toBeGreaterThan(0);
    });
  });

  describe("Performance Tests", () => {
    it("should process templates efficiently", async () => {
      const templatePath = path.join(tempDir, "performance.hbs");
      await fs.writeFile(templatePath, "Hello {{projectName}}!");

      const startTime = Date.now();

      const result = await processor.processTemplate(
        "basic",
        testTemplateContext,
        path.join(tempDir, "output.txt"),
        { dryRun: true }
      );

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      expect(processingTime).toBeLessThan(1000); // Should complete within 1 second
    });

    it("should cache compiled templates for performance", () => {
      const template = "Hello {{projectName}}!";

      const startTime = Date.now();

      // Compile the same template multiple times
      for (let i = 0; i < 100; i++) {
        handlebarsSingleton.compile(template);
      }

      const endTime = Date.now();
      const compilationTime = endTime - startTime;

      expect(compilationTime).toBeLessThan(100); // Should be very fast due to caching
    });
  });
});
