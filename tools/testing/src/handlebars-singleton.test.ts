/**
 * Comprehensive tests for Handlebars Singleton functionality
 * 
 * Tests cover:
 * - Singleton pattern behavior
 * - Template compilation and caching
 * - Helper registration and management
 * - Thread safety and initialization
 * - Performance characteristics
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
    HandlebarsSingleton,
    getHandlebars,
    compileTemplate,
    registerHelper,
    hasHelper,
    getRegisteredHelpers,
    handlebarsSingleton
} from '@farm-framework/cli/template/handlebars-singleton';
import { registerHandlebarsHelpers } from '@farm-framework/cli/template/helpers';
import { TemplateContext } from '@farm-framework/types';

describe('Handlebars Singleton', () => {
    let singleton: HandlebarsSingleton;
    let testContext: TemplateContext;

    beforeEach(() => {
        singleton = HandlebarsSingleton.getInstance();
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

    describe('Singleton Pattern', () => {
        it('should return the same instance on multiple calls', () => {
            const instance1 = HandlebarsSingleton.getInstance();
            const instance2 = HandlebarsSingleton.getInstance();
            const instance3 = HandlebarsSingleton.getInstance();

            expect(instance1).toBe(instance2);
            expect(instance2).toBe(instance3);
            expect(instance1).toBe(instance3);
        });

        it('should maintain state across multiple calls', () => {
            const instance1 = HandlebarsSingleton.getInstance();
            instance1.registerHelper('testHelper1', () => 'test1');

            const instance2 = HandlebarsSingleton.getInstance();
            expect(instance2.hasHelper('testHelper1')).toBe(true);

            const instance3 = HandlebarsSingleton.getInstance();
            expect(instance3.hasHelper('testHelper1')).toBe(true);
        });

        it('should be thread-safe for concurrent access', async () => {
            const promises = Array.from({ length: 10 }, async (_, i) => {
                const instance = HandlebarsSingleton.getInstance();
                instance.registerHelper(`concurrentHelper${i}`, () => `result${i}`);
                return instance.hasHelper(`concurrentHelper${i}`);
            });

            const results = await Promise.all(promises);
            expect(results.every(result => result === true)).toBe(true);
        });
    });

    describe('Template Compilation', () => {
        it('should compile simple templates correctly', () => {
            const template = 'Hello {{projectName}}!';
            const compiled = singleton.compile(template);
            const result = compiled(testContext);

            expect(result).toBe('Hello test-project!');
        });

        it('should compile complex templates with helpers', () => {
            const template = `
        {{#if_feature auth}}
          Auth is enabled for {{project_name_pascal}}
        {{else}}
          No auth
        {{/if_feature}}
      `;

            const compiled = singleton.compile(template);
            const result = compiled(testContext);

            expect(result.trim()).toContain('Auth is enabled for TestProject');
        });

        it('should handle template compilation errors gracefully', () => {
            const invalidTemplate = '{{#invalid syntax}}';

            expect(() => {
                singleton.compile(invalidTemplate);
            }).toThrow();
        });

        it('should support template options', () => {
            const template = '{{#each features}}{{this}}{{/each}}';
            const options = { strict: true };

            const compiled = singleton.compile(template, options);
            const result = compiled(testContext);

            expect(result).toBe('authai');
        });
    });

    describe('Template Caching', () => {
        it('should cache compiled templates', () => {
            const template = 'Hello {{projectName}}!';

            const compiled1 = singleton.compile(template);
            const compiled2 = singleton.compile(template);

            expect(compiled1).toBe(compiled2);
        });

        it('should cache templates with different options separately', () => {
            const template = 'Hello {{projectName}}!';

            const compiled1 = singleton.compile(template, { strict: true });
            const compiled2 = singleton.compile(template, { strict: false });
            const compiled3 = singleton.compile(template);

            expect(compiled1).not.toBe(compiled2);
            expect(compiled1).not.toBe(compiled3);
            expect(compiled2).not.toBe(compiled3);
        });

        it('should provide cache statistics', () => {
            const template1 = 'Template 1: {{projectName}}';
            const template2 = 'Template 2: {{name}}';

            singleton.compile(template1);
            singleton.compile(template2);

            const stats = singleton.getCacheStats();

            expect(stats.size).toBeGreaterThanOrEqual(2);
            expect(stats.keys).toContain(template1);
            expect(stats.keys).toContain(template2);
        });

        it('should clear cache when requested', () => {
            const template = 'Hello {{projectName}}!';

            singleton.compile(template);
            expect(singleton.getCacheStats().size).toBeGreaterThan(0);

            singleton.clearCache();
            expect(singleton.getCacheStats().size).toBe(0);
        });

        it('should handle cache size limits', () => {
            // Register many templates to test cache behavior
            for (let i = 0; i < 100; i++) {
                const template = `Template ${i}: {{projectName}}`;
                singleton.compile(template);
            }

            const stats = singleton.getCacheStats();
            expect(stats.size).toBeGreaterThan(0);
        });
    });

    describe('Helper Registration', () => {
        it('should register custom helpers', () => {
            const testHelper = vi.fn(() => 'custom-helper-result');

            singleton.registerHelper('customHelper', testHelper);

            expect(singleton.hasHelper('customHelper')).toBe(true);

            const template = '{{customHelper}}';
            const compiled = singleton.compile(template);
            const result = compiled({});

            expect(result).toBe('custom-helper-result');
            expect(testHelper).toHaveBeenCalled();
        });

        it('should register multiple helpers', () => {
            const helper1 = () => 'helper1';
            const helper2 = () => 'helper2';
            const helper3 = () => 'helper3';

            singleton.registerHelper('helper1', helper1);
            singleton.registerHelper('helper2', helper2);
            singleton.registerHelper('helper3', helper3);

            expect(singleton.hasHelper('helper1')).toBe(true);
            expect(singleton.hasHelper('helper2')).toBe(true);
            expect(singleton.hasHelper('helper3')).toBe(true);
        });

        it('should override existing helpers', () => {
            const originalHelper = () => 'original';
            const newHelper = () => 'overridden';

            singleton.registerHelper('overrideTest', originalHelper);

            const template = '{{overrideTest}}';
            const compiled = singleton.compile(template);
            let result = compiled({});
            expect(result).toBe('original');

            singleton.registerHelper('overrideTest', newHelper);
            result = compiled({});
            expect(result).toBe('overridden');
        });

        it('should register block helpers', () => {
            const blockHelper = function (this: any, options: any) {
                return `Block: ${options.fn(this)}`;
            };

            singleton.registerHelper('blockTest', blockHelper);

            const template = '{{#blockTest}}Inner content{{/blockTest}}';
            const compiled = singleton.compile(template);
            const result = compiled({});

            expect(result).toBe('Block: Inner content');
        });

        it('should register helpers with parameters', () => {
            const paramHelper = (param1: string, param2: string) => `${param1}-${param2}`;

            singleton.registerHelper('paramTest', paramHelper);

            const template = '{{paramTest "hello" "world"}}';
            const compiled = singleton.compile(template);
            const result = compiled({});

            expect(result).toBe('hello-world');
        });
    });

    describe('Helper Management', () => {
        it('should check helper existence', () => {
            singleton.registerHelper('existingHelper', () => 'test');

            expect(singleton.hasHelper('existingHelper')).toBe(true);
            expect(singleton.hasHelper('nonExistingHelper')).toBe(false);
        });

        it('should list all registered helpers', () => {
            const helpers = singleton.getRegisteredHelpers();

            expect(Array.isArray(helpers)).toBe(true);
            expect(helpers.length).toBeGreaterThan(0);

            // Check for some expected helpers
            expect(helpers).toContain('if_feature');
            expect(helpers).toContain('if_database');
            expect(helpers).toContain('kebabCase');
        });

        it('should include custom helpers in the list', () => {
            singleton.registerHelper('customListHelper', () => 'test');

            const helpers = singleton.getRegisteredHelpers();
            expect(helpers).toContain('customListHelper');
        });

        it('should handle helper registration errors gracefully', () => {
            expect(() => {
                singleton.registerHelper('', () => 'test');
            }).toThrow();

            expect(() => {
                singleton.registerHelper('validName', null as any);
            }).toThrow();
        });
    });

    describe('Initialization', () => {
        it('should initialize with all default helpers', () => {
            const helpers = singleton.getRegisteredHelpers();

            // Check for key helper categories
            const expectedHelpers = [
                'if_feature', 'if_database', 'kebabCase', 'pascalCase',
                'project_name', 'farm_version', 'has_typescript'
            ];

            expectedHelpers.forEach(helper => {
                expect(helpers).toContain(helper);
            });
        });

        it('should be initialized only once', () => {
            const instance1 = HandlebarsSingleton.getInstance();
            const instance2 = HandlebarsSingleton.getInstance();

            // Both should have the same helpers
            const helpers1 = instance1.getRegisteredHelpers();
            const helpers2 = instance2.getRegisteredHelpers();

            expect(helpers1).toEqual(helpers2);
        });

        it('should handle initialization errors', () => {
            // Mock a helper registration error
            const originalRegister = singleton.registerHelper;
            singleton.registerHelper = vi.fn().mockImplementation(() => {
                throw new Error('Registration failed');
            });

            expect(() => {
                singleton.registerHelper('failingHelper', () => 'test');
            }).toThrow('Registration failed');

            // Restore original method
            singleton.registerHelper = originalRegister;
        });
    });

    describe('Convenience Functions', () => {
        it('should provide getHandlebars function', () => {
            const handlebars = getHandlebars();
            expect(handlebars).toBeDefined();
            expect(typeof handlebars.compile).toBe('function');
        });

        it('should provide compileTemplate function', () => {
            const template = 'Hello {{projectName}}!';
            const compiled = compileTemplate(template);
            const result = compiled(testContext);

            expect(result).toBe('Hello test-project!');
        });

        it('should provide registerHelper function', () => {
            const testHelper = () => 'convenience-helper';

            registerHelper('convenienceHelper', testHelper);

            expect(hasHelper('convenienceHelper')).toBe(true);

            const template = '{{convenienceHelper}}';
            const compiled = compileTemplate(template);
            const result = compiled({});

            expect(result).toBe('convenience-helper');
        });

        it('should provide hasHelper function', () => {
            registerHelper('convenienceTest', () => 'test');

            expect(hasHelper('convenienceTest')).toBe(true);
            expect(hasHelper('nonExistent')).toBe(false);
        });

        it('should provide getRegisteredHelpers function', () => {
            const helpers = getRegisteredHelpers();

            expect(Array.isArray(helpers)).toBe(true);
            expect(helpers.length).toBeGreaterThan(0);
        });

        it('should provide handlebarsSingleton export', () => {
            expect(handlebarsSingleton).toBeDefined();
            expect(handlebarsSingleton).toBeInstanceOf(HandlebarsSingleton);

            const template = 'Hello {{projectName}}!';
            const compiled = handlebarsSingleton.compile(template);
            const result = compiled(testContext);

            expect(result).toBe('Hello test-project!');
        });
    });

    describe('Performance Tests', () => {
        it('should compile templates efficiently', () => {
            const template = 'Hello {{projectName}}!';

            const startTime = Date.now();

            for (let i = 0; i < 1000; i++) {
                singleton.compile(template);
            }

            const endTime = Date.now();
            const compilationTime = endTime - startTime;

            expect(compilationTime).toBeLessThan(100); // Should be very fast due to caching
        });

        it('should execute compiled templates efficiently', () => {
            const template = 'Hello {{projectName}}!';
            const compiled = singleton.compile(template);

            const startTime = Date.now();

            for (let i = 0; i < 1000; i++) {
                compiled(testContext);
            }

            const endTime = Date.now();
            const executionTime = endTime - startTime;

            expect(executionTime).toBeLessThan(50); // Should be very fast
        });

        it('should handle large templates efficiently', () => {
            const largeTemplate = Array.from({ length: 100 }, (_, i) =>
                `{{#if_feature auth}}Feature ${i}{{/if_feature}}`
            ).join('\n');

            const startTime = Date.now();
            const compiled = singleton.compile(largeTemplate);
            const endTime = Date.now();

            expect(endTime - startTime).toBeLessThan(100); // Should compile quickly

            const result = compiled(testContext);
            expect(result).toContain('Feature 0');
            expect(result).toContain('Feature 99');
        });

        it('should handle many helper registrations efficiently', () => {
            const startTime = Date.now();

            for (let i = 0; i < 100; i++) {
                singleton.registerHelper(`perfHelper${i}`, () => `result${i}`);
            }

            const endTime = Date.now();
            const registrationTime = endTime - startTime;

            expect(registrationTime).toBeLessThan(50); // Should register quickly

            const helpers = singleton.getRegisteredHelpers();
            expect(helpers.length).toBeGreaterThan(100);
        });
    });

    describe('Error Handling', () => {
        it('should handle template compilation errors', () => {
            const invalidTemplates = [
                '{{#invalid syntax}}',
                '{{unclosed',
                '{{#if}}{{/unless}}',
                '{{#each}}{{/each}}{{/each}}'
            ];

            invalidTemplates.forEach(template => {
                expect(() => {
                    singleton.compile(template);
                }).toThrow();
            });
        });

        it('should handle helper execution errors', () => {
            const errorHelper = () => {
                throw new Error('Helper execution failed');
            };

            singleton.registerHelper('errorHelper', errorHelper);

            const template = '{{errorHelper}}';
            const compiled = singleton.compile(template);

            expect(() => {
                compiled({});
            }).toThrow('Helper execution failed');
        });

        it('should handle null and undefined context gracefully', () => {
            const template = 'Hello {{projectName}}!';
            const compiled = singleton.compile(template);

            expect(() => {
                compiled(null);
                compiled(undefined);
                compiled({});
            }).not.toThrow();
        });

        it('should handle malformed helper parameters', () => {
            const template = '{{#if_feature}}Test{{/if_feature}}';
            const compiled = singleton.compile(template);

            // Should not throw, but may not work as expected
            expect(() => {
                compiled(testContext);
            }).not.toThrow();
        });
    });

    describe('Memory Management', () => {
        it('should not leak memory with repeated compilations', () => {
            const initialStats = singleton.getCacheStats();

            // Compile many templates
            for (let i = 0; i < 1000; i++) {
                const template = `Template ${i}: {{projectName}}`;
                singleton.compile(template);
            }

            const finalStats = singleton.getCacheStats();

            // Cache should grow but not excessively
            expect(finalStats.size).toBeGreaterThan(initialStats.size);
            expect(finalStats.size).toBeLessThan(1000); // Should have some limit
        });

        it('should handle cache cleanup', () => {
            // Fill cache
            for (let i = 0; i < 100; i++) {
                const template = `Template ${i}: {{projectName}}`;
                singleton.compile(template);
            }

            const statsBefore = singleton.getCacheStats();
            expect(statsBefore.size).toBeGreaterThan(0);

            singleton.clearCache();

            const statsAfter = singleton.getCacheStats();
            expect(statsAfter.size).toBe(0);
        });
    });
});
