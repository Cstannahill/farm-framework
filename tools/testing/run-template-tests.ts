#!/usr/bin/env node

/**
 * Test runner for FARM Framework template processing tests
 * 
 * This script runs all template-related tests including:
 * - Template processing and compilation
 * - Handlebars helpers functionality
 * - Handlebars singleton behavior
 * - Template generation and scaffolding
 * - Template registry operations
 */

import { execSync } from 'child_process';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = resolve(__filename, '..');

const testFiles = [
    'src/template-processing.test.ts',
    'src/handlebars-singleton.test.ts',
    'src/template-registry.test.ts',
    'src/template-generation.test.ts'
];

async function runTests() {
    console.log('🧪 Running FARM Framework Template Tests...\n');

    let totalTests = 0;
    let passedTests = 0;
    let failedTests = 0;

    for (const testFile of testFiles) {
        const testPath = resolve(__dirname, testFile);
        console.log(`📋 Running ${testFile}...`);

        try {
            const result = execSync(`npx vitest run ${testPath} --reporter=verbose`, {
                cwd: __dirname,
                stdio: 'pipe',
                encoding: 'utf-8'
            });

            console.log(`✅ ${testFile} - PASSED`);
            console.log(result);
            passedTests++;
        } catch (error: any) {
            console.log(`❌ ${testFile} - FAILED`);
            console.log(error.stdout || error.message);
            failedTests++;
        }

        totalTests++;
        console.log(''); // Add spacing
    }

    console.log('📊 Test Summary:');
    console.log(`   Total: ${totalTests}`);
    console.log(`   Passed: ${passedTests}`);
    console.log(`   Failed: ${failedTests}`);

    if (failedTests > 0) {
        console.log('\n❌ Some tests failed. Please check the output above.');
        process.exit(1);
    } else {
        console.log('\n✅ All tests passed!');
        process.exit(0);
    }
}

// Handle command line arguments
const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
    console.log(`
FARM Framework Template Test Runner

Usage:
  npm run test:templates          # Run all template tests
  npm run test:templates --watch  # Run tests in watch mode
  npm run test:templates --coverage # Run tests with coverage

Test Files:
  - template-processing.test.ts    # Template processing and compilation
  - handlebars-singleton.test.ts   # Handlebars singleton functionality
  - template-registry.test.ts      # Template registry operations
  - template-generation.test.ts    # Template generation and scaffolding

Options:
  --help, -h     Show this help message
  --watch, -w    Run tests in watch mode
  --coverage, -c Run tests with coverage report
  --verbose, -v  Run tests with verbose output
`);
    process.exit(0);
}

if (args.includes('--watch') || args.includes('-w')) {
    console.log('👀 Running tests in watch mode...');
    execSync('npx vitest --watch', { stdio: 'inherit', cwd: __dirname });
} else if (args.includes('--coverage') || args.includes('-c')) {
    console.log('📊 Running tests with coverage...');
    execSync('npx vitest run --coverage', { stdio: 'inherit', cwd: __dirname });
} else {
    runTests().catch(console.error);
}
