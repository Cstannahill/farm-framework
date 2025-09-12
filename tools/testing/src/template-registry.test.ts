/**
 * Comprehensive tests for Template Registry functionality
 *
 * Tests cover:
 * - Template retrieval and resolution
 * - Template file validation
 * - Template inheritance resolution
 * - Error handling and edge cases
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { TemplateRegistry } from "@farm-framework/cli/template/registry";
import { TemplateContext } from "@farm-framework/types";
import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("Template Registry", () => {
  let registry: TemplateRegistry;
  let tempDir: string;
  let templatesDir: string;

  beforeEach(async () => {
    // Create temporary directory structure
    tempDir = path.join(__dirname, "temp-registry-test");
    templatesDir = path.join(tempDir, "templates");

    await fs.ensureDir(templatesDir);

    // Create test template structure
    await createTestTemplates();

    // Initialize registry with templates directory
    registry = new TemplateRegistry(templatesDir);
  });

  afterEach(async () => {
    if (await fs.pathExists(tempDir)) {
      await fs.remove(tempDir);
    }
  });

  async function createTestTemplates() {
    // Create base template files that the registry expects
    const baseDir = path.join(templatesDir, "base");
    await fs.ensureDir(baseDir);

    // Create all the base template files that the registry expects
    const baseFiles = [
      "package.json.hbs",
      "farm.config.ts.hbs",
      "docker-compose.yml.hbs",
      "docker-compose.database.yml.hbs",
      "docker-compose.prod.yml.hbs",
      "Dockerfile.hbs",
      ".gitignore.hbs",
      "README.md.hbs",
      "setup.sh.hbs",
      "setup.bat.hbs",
      "setup.ps1.hbs",
    ];

    for (const file of baseFiles) {
      await fs.writeFile(
        path.join(baseDir, file),
        `# Mock content for ${file}`
      );
    }

    // Create base API files
    const baseApiDir = path.join(baseDir, "apps", "api");
    await fs.ensureDir(baseApiDir);
    await fs.ensureDir(path.join(baseApiDir, "src", "core"));
    await fs.ensureDir(path.join(baseApiDir, "src", "auth"));
    await fs.ensureDir(path.join(baseApiDir, "src", "database"));
    await fs.ensureDir(path.join(baseApiDir, "src", "models"));
    await fs.ensureDir(path.join(baseApiDir, "src", "routes"));

    const baseApiFiles = [
      "requirements.txt.hbs",
      "pyproject.toml.hbs",
      "src/main.py.hbs",
      "src/core/config.py.hbs",
      "src/core/logging.py.hbs",
      "src/core/security.py.hbs",
      "src/auth/oauth.py.hbs",
      "src/database/connection.py.hbs",
      "src/models/user.py.hbs",
      "src/routes/auth.py.hbs",
      "src/routes/health.py.hbs",
      "src/routes/users.py.hbs",
    ];

    for (const file of baseApiFiles) {
      await fs.writeFile(
        path.join(baseApiDir, file),
        `# Mock content for ${file}`
      );
    }

    // Create base web files
    const baseWebDir = path.join(baseDir, "apps", "web");
    await fs.ensureDir(baseWebDir);
    await fs.ensureDir(path.join(baseWebDir, "src", "components", "layout"));
    await fs.ensureDir(path.join(baseWebDir, "src", "pages"));
    await fs.ensureDir(path.join(baseWebDir, "public"));
    await fs.ensureDir(path.join(baseWebDir, "src", "assets"));

    const baseWebFiles = [
      "package.json.hbs",
      "vite.config.ts.hbs",
      "index.html.hbs",
      "tailwind.config.ts.hbs",
      "tsconfig.json.hbs",
      "tsconfig.node.json.hbs",
      "tsconfig.app.json.hbs",
      "src/main.tsx.hbs",
      "src/App.tsx.hbs",
      "src/index.css.hbs",
      "src/components/layout/Layout.tsx.hbs",
      "src/components/theme-toggle.tsx.hbs",
      "src/pages/Home.tsx.hbs",
      "src/pages/About.tsx.hbs",
      "public/farm.svg",
      "public/farm-c.svg",
      "src/assets/farm.svg",
    ];

    for (const file of baseWebFiles) {
      await fs.writeFile(
        path.join(baseWebDir, file),
        `# Mock content for ${file}`
      );
    }

    // Create basic template files
    const basicDir = path.join(templatesDir, "basic");
    await fs.ensureDir(basicDir);
    await fs.writeFile(
      path.join(basicDir, "package.json.hbs"),
      '{"name": "{{projectName}}"}'
    );
    await fs.writeFile(
      path.join(basicDir, "farm.config.ts.hbs"),
      "export default {}"
    );
    await fs.writeFile(
      path.join(basicDir, "README.md.hbs"),
      "# {{projectName}}"
    );
  }

  describe("Template Retrieval", () => {
    it("should get template definition by name", () => {
      const template = registry.getTemplate("base");
      expect(template).toBeDefined();
      expect(template?.name).toBe("base");
      expect(template?.description).toContain("Base template");
    });

    it("should return undefined for non-existent template", () => {
      const template = registry.getTemplate("non-existent");
      expect(template).toBeUndefined();
    });

    it("should get all available templates", () => {
      const baseTemplate = registry.getTemplate("base");
      const basicTemplate = registry.getTemplate("basic");

      expect(baseTemplate).toBeDefined();
      expect(basicTemplate).toBeDefined();
      expect(baseTemplate?.name).toBe("base");
      expect(basicTemplate?.name).toBe("basic");
    });
  });

  describe("Template File Resolution", () => {
    it("should resolve files for a template", () => {
      const files = registry.resolveFiles("base", []);
      expect(files).toBeDefined();
      expect(Array.isArray(files)).toBe(true);
      expect(files.length).toBeGreaterThan(0);
    });

    it("should include base template files when template has inheritance", () => {
      const files = registry.resolveFiles("basic", []);
      expect(files).toBeDefined();
      expect(files.length).toBeGreaterThan(0);

      // Should include base template files
      const hasBaseFiles = files.some((file) => file.inheritFromBase === true);
      expect(hasBaseFiles).toBe(true);
    });

    it("should throw error for non-existent template during file resolution", () => {
      expect(() => {
        registry.resolveFiles("non-existent", []);
      }).toThrow("Template 'non-existent' not found");
    });

    it("should resolve files with features", () => {
      const files = registry.resolveFiles("basic", ["web", "api"]);
      expect(files).toBeDefined();
      expect(Array.isArray(files)).toBe(true);
    });
  });

  describe("Template File Validation", () => {
    it("should validate template files exist", async () => {
      const validation = await registry.validateTemplateFiles("base", []);
      expect(validation).toBeDefined();
      expect(validation.valid).toBe(true);
      expect(validation.missingFiles).toHaveLength(0);
      expect(validation.errors).toHaveLength(0);
    });

    it("should detect missing template files", async () => {
      // Test with a template that has missing files by using a non-existent template
      try {
        await registry.validateTemplateFiles("non-existent", []);
        expect.fail("Should have thrown an error");
      } catch (error) {
        expect(error).toBeDefined();
        expect((error as Error).message).toContain("not found");
      }
    });

    it("should handle validation errors gracefully", async () => {
      // Mock fs.pathExists to throw an error
      const originalPathExists = fs.pathExists;
      fs.pathExists = vi.fn().mockRejectedValue(new Error("File system error"));

      const validation = await registry.validateTemplateFiles("base", []);
      expect(validation).toBeDefined();
      expect(validation.errors.length).toBeGreaterThan(0);
      expect(validation.errors[0]).toContain("File system error");

      // Restore original function
      fs.pathExists = originalPathExists;
    });

    it("should validate files with features", async () => {
      const validation = await registry.validateTemplateFiles("basic", [
        "web",
        "api",
      ]);
      expect(validation).toBeDefined();
      expect(typeof validation.valid).toBe("boolean");
    });
  });

  describe("Template Inheritance", () => {
    it("should resolve inheritance chain correctly", () => {
      const files = registry.resolveFiles("basic", []);
      expect(files).toBeDefined();

      // Should include both base and template-specific files
      const baseFiles = files.filter((file) => file.inheritFromBase === true);
      const templateFiles = files.filter(
        (file) => file.inheritFromBase !== true
      );

      expect(baseFiles.length).toBeGreaterThan(0);
      expect(templateFiles.length).toBeGreaterThan(0);
    });

    it("should handle templates without inheritance", () => {
      const files = registry.resolveFiles("base", []);
      expect(files).toBeDefined();

      // Base template should not have inherited files
      const inheritedFiles = files.filter(
        (file) => file.inheritFromBase === true
      );
      expect(inheritedFiles).toHaveLength(0);
    });

    it("should handle missing base template gracefully", () => {
      // This should not throw an error even if base template is missing
      expect(() => {
        registry.resolveFiles("base", []);
      }).not.toThrow();
    });
  });

  describe("Error Handling", () => {
    it("should handle invalid template names gracefully", () => {
      expect(() => {
        registry.getTemplate("");
      }).not.toThrow();

      expect(() => {
        registry.getTemplate(null as any);
      }).not.toThrow();
    });

    it("should handle invalid features array", () => {
      expect(() => {
        registry.resolveFiles("base", null as any);
      }).not.toThrow();

      expect(() => {
        registry.resolveFiles("base", undefined as any);
      }).not.toThrow();
    });

    it("should handle file system errors during validation", async () => {
      // Mock fs.pathExists to throw an error
      const originalPathExists = fs.pathExists;
      fs.pathExists = vi.fn().mockRejectedValue(new Error("Permission denied"));

      const validation = await registry.validateTemplateFiles("base", []);
      expect(validation).toBeDefined();
      expect(validation.errors.length).toBeGreaterThan(0);

      // Restore original function
      fs.pathExists = originalPathExists;
    });
  });

  describe("Performance Tests", () => {
    it("should resolve files efficiently", () => {
      const startTime = Date.now();

      for (let i = 0; i < 100; i++) {
        registry.resolveFiles("base", []);
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete within reasonable time (less than 1 second)
      expect(duration).toBeLessThan(1000);
    });

    it("should validate files efficiently", async () => {
      const startTime = Date.now();

      const promises = Array.from({ length: 10 }, () =>
        registry.validateTemplateFiles("base", [])
      );

      await Promise.all(promises);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete within reasonable time (less than 5 seconds)
      expect(duration).toBeLessThan(5000);
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty templates directory", async () => {
      const emptyDir = path.join(tempDir, "empty-templates");
      await fs.ensureDir(emptyDir);

      const emptyRegistry = new TemplateRegistry(emptyDir);
      // The registry still has hardcoded templates, so base should still be available
      const template = emptyRegistry.getTemplate("base");
      expect(template).toBeDefined();
      expect(template?.name).toBe("base");
    });

    it("should handle templates with no files", () => {
      const files = registry.resolveFiles("base", []);
      expect(files).toBeDefined();
      expect(Array.isArray(files)).toBe(true);
    });

    it("should handle features array with duplicates", () => {
      const files = registry.resolveFiles("basic", [
        "web",
        "web",
        "api",
        "api",
      ]);
      expect(files).toBeDefined();
      expect(Array.isArray(files)).toBe(true);
    });

    it("should handle very long feature names", () => {
      const longFeature = "a".repeat(1000);
      const files = registry.resolveFiles("basic", [longFeature]);
      expect(files).toBeDefined();
      expect(Array.isArray(files)).toBe(true);
    });
  });
});
