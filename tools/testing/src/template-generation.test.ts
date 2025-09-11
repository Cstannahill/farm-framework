/**
 * Tests for Template Generation and Scaffolding
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ProjectScaffolder } from '@farm-framework/cli/scaffolding/scaffolder';
import { TemplateProcessor } from '@farm-framework/cli/template/processor';
import { TemplateRegistry } from '@farm-framework/cli/template/registry';
import { TemplateContext } from '@farm-framework/types';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Template Generation and Scaffolding', () => {
  let scaffolder: ProjectScaffolder;
  let processor: TemplateProcessor;
  let registry: TemplateRegistry;
  let tempDir: string;
  let testContext: TemplateContext;

  beforeEach(async () => {
    tempDir = path.join(__dirname, 'temp-generation-test');
    await fs.ensureDir(tempDir);

    scaffolder = new ProjectScaffolder({ verbose: false, skipInstall: true });
    processor = new TemplateProcessor();
    registry = new TemplateRegistry(path.join(tempDir, 'templates'));

    testContext = {
      projectName: 'test-project',
      name: 'test-project',
      template: 'basic',
      features: ['auth', 'ai'],
      database: 'postgresql',
      environment: 'development',
      typescript: true,
      docker: true,
      farmVersion: '1.0.0',
      timestamp: new Date().toISOString(),
      answers: {}
    };
  });

  afterEach(async () => {
    if (await fs.pathExists(tempDir)) {
      await fs.remove(tempDir);
    }
  });

  describe('Project Scaffolding', () => {
    it('should generate a complete project structure', async () => {
      const projectPath = path.join(tempDir, 'generated-project');

      const result = await scaffolder.generateProject(projectPath, testContext);

      expect(result.success).toBe(true);
      expect(result.generatedFiles).toBeDefined();
      expect(Array.isArray(result.generatedFiles)).toBe(true);
      expect(await fs.pathExists(projectPath)).toBe(true);
    });

    it('should handle generation errors gracefully', async () => {
      const projectPath = path.join(tempDir, 'error-test');
      const invalidContext = { ...testContext, template: 'non-existent-template' };

      const result = await scaffolder.generateProject(projectPath, invalidContext);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Template Processing', () => {
    it('should process templates with context', async () => {
      const result = await processor.processTemplate(
        'basic',
        testContext,
        path.join(tempDir, 'output.txt'),
        { dryRun: true }
      );

      expect(result.generatedFiles.length).toBeGreaterThan(0);
      expect(result.metrics.filesProcessed).toBeGreaterThan(0);
    });

    it('should handle template compilation errors', async () => {
      try {
        await processor.processTemplate(
          'invalid-template',
          testContext,
          path.join(tempDir, 'output.txt'),
          { dryRun: true }
        );
        expect.fail('Expected an error to be thrown');
      } catch (error) {
        expect(error).toBeDefined();
        expect((error as Error).message).toContain('Template directory not found');
      }
    });
  });

  describe('Template Registry', () => {
    it('should get template definitions', () => {
      const basicTemplate = registry.getTemplate('basic');
      const baseTemplate = registry.getTemplate('base');

      expect(basicTemplate).toBeDefined();
      expect(baseTemplate).toBeDefined();
      expect(basicTemplate?.name).toBe('basic');
      expect(baseTemplate?.name).toBe('base');
    });

    it('should list all registered templates', () => {
      const template1 = registry.getTemplate('basic');
      const template2 = registry.getTemplate('base');

      expect(template1).toBeDefined();
      expect(template2).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle missing template files', async () => {
      try {
        await processor.processTemplate(
          'non-existent-template',
          testContext,
          path.join(tempDir, 'output.txt'),
          { dryRun: true }
        );
        expect.fail('Expected an error to be thrown');
      } catch (error) {
        expect(error).toBeDefined();
        expect((error as Error).message).toContain('Template directory not found');
      }
    });

    it('should handle file system errors', async () => {
      const originalWriteFile = fs.writeFile;
      vi.spyOn(fs, 'writeFile').mockRejectedValue(new Error('File system error'));

      const result = await scaffolder.generateProject(
        path.join(tempDir, 'fs-error-test'),
        testContext
      );

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();

      vi.restoreAllMocks();
    });
  });

  describe('Performance Tests', () => {
    it('should generate projects efficiently', async () => {
      const projectPath = path.join(tempDir, 'performance-test');

      const startTime = Date.now();
      await scaffolder.generateProject(projectPath, testContext);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(5000);
    });
  });
});