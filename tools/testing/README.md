# FARM Framework Template Testing Suite

This directory contains comprehensive tests for the FARM Framework's template processing system, including template generation, handlebars processing, and scaffolding functionality.

## Test Structure

### Core Test Files

- **`template-processing.test.ts`** - Tests for template processing and compilation
- **`handlebars-singleton.test.ts`** - Tests for handlebars singleton functionality  
- **`template-registry.test.ts`** - Tests for template registry operations
- **`template-generation.test.ts`** - Tests for template generation and scaffolding

### Test Categories

#### 1. Template Processing Tests
- Template compilation and execution
- Context processing and variable substitution
- Error handling and validation
- Performance characteristics
- Dry run functionality

#### 2. Handlebars Helpers Tests
- Database helpers (`if_database`, `is_postgresql`, etc.)
- Feature helpers (`if_feature`, `has_auth`, etc.)
- AI provider helpers (`if_ai_provider`, `has_ollama`, etc.)
- Template helpers (`if_template`, `is_basic`, etc.)
- Environment helpers (`if_env`, `is_development`, etc.)
- String transformation helpers (`kebabCase`, `pascalCase`, etc.)
- Array helpers (`join`, `length`)
- Logic helpers (`and`, `or`, `not`, `eq`, etc.)
- Project helpers (`project_name`, `farm_version`, etc.)
- Development helpers (`has_typescript`, `has_docker`, etc.)
- Plugin helpers (`if_plugin`)
- Configuration helpers (`get_config`, `json`)

#### 3. Handlebars Singleton Tests
- Singleton pattern behavior
- Template compilation and caching
- Helper registration and management
- Thread safety and initialization
- Performance characteristics
- Memory management

#### 4. Template Registry Tests
- Template registration and retrieval
- Template validation and discovery
- Template inheritance resolution
- Template metadata management
- Error handling and edge cases
- Search and filtering functionality

#### 5. Template Generation Tests
- Project scaffolding and generation
- Template inheritance and resolution
- File generation and processing
- Directory structure creation
- Dependency resolution
- Feature-based generation
- Database configuration
- Error handling and validation
- Performance tests
- Integration tests

## Running Tests

### Run All Template Tests
```bash
# From project root
pnpm test:templates

# Or from tools/testing directory
npm test
```

### Run Specific Test Categories
```bash
# Template processing only
pnpm test:template-processing

# Handlebars functionality only
pnpm test:handlebars

# Template generation only
pnpm test:template-generation

# Template registry only
pnpm test:template-registry
```

### Run Tests with Coverage
```bash
pnpm test:coverage
```

### Run Tests in Watch Mode
```bash
pnpm test:watch
```

### Run Tests with UI
```bash
pnpm test:ui
```

## Test Configuration

The tests are configured using Vitest with the following setup:

- **Environment**: Node.js
- **Timeout**: 60 seconds for tests, 30 seconds for hooks
- **Threading**: Single thread for Docker compatibility
- **Coverage**: V8 provider with HTML, LCOV, and text reports
- **Setup**: `tools/testing/setup.ts` for global test configuration

## Test Data and Fixtures

### Template Context
Tests use a comprehensive template context that includes:
- Project configuration (name, template, features)
- Database configuration (type, connection details)
- AI configuration (providers, models, settings)
- Development options (TypeScript, Docker, testing)
- Plugin configuration
- Metadata (version, timestamp)

### Test Templates
Tests create temporary template structures including:
- Base templates with inheritance
- Feature-specific templates
- Complex template hierarchies
- Invalid templates for error testing

## Writing New Tests

### Test Structure
```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('Feature Name', () => {
  beforeEach(() => {
    // Setup test data
  });

  afterEach(() => {
    // Cleanup
  });

  it('should test specific functionality', () => {
    // Test implementation
    expect(result).toBe(expected);
  });
});
```

### Best Practices
1. **Isolation**: Each test should be independent
2. **Cleanup**: Always clean up temporary files and directories
3. **Descriptive Names**: Use clear, descriptive test names
4. **Error Testing**: Include tests for error conditions
5. **Performance**: Include performance tests for critical paths
6. **Integration**: Test component interactions

### Test Utilities
- Use `fs-extra` for file system operations
- Use `path` for cross-platform path handling
- Use `vi.fn()` for mocking functions
- Use temporary directories for file operations

## Debugging Tests

### Verbose Output
```bash
pnpm test:templates --reporter=verbose
```

### Debug Specific Test
```bash
pnpm test:templates --grep "specific test name"
```

### Run Single Test File
```bash
npx vitest run tools/testing/src/template-processing.test.ts
```

## Coverage Reports

Coverage reports are generated in multiple formats:
- **HTML**: `coverage/index.html` - Interactive browser report
- **LCOV**: `coverage/lcov.info` - For CI/CD integration
- **Text**: Console output - Quick overview

## CI/CD Integration

The test suite is designed to work in CI/CD environments:
- Single-threaded execution for Docker compatibility
- Comprehensive error handling
- Performance benchmarks
- Coverage reporting
- Exit codes for success/failure

## Troubleshooting

### Common Issues

1. **Timeout Errors**: Increase timeout in vitest.config.ts
2. **File System Errors**: Ensure proper cleanup in afterEach
3. **Import Errors**: Check path aliases in vitest.config.ts
4. **Memory Issues**: Use smaller test datasets

### Debug Commands
```bash
# Check test configuration
npx vitest --config vitest.config.ts --dry-run

# Run with debug output
DEBUG=vitest pnpm test:templates

# Check file permissions
ls -la tools/testing/src/
```

## Contributing

When adding new tests:
1. Follow the existing test structure
2. Add appropriate test categories
3. Update this README if needed
4. Ensure all tests pass
5. Add performance tests for critical paths
6. Include error handling tests

## Performance Benchmarks

The test suite includes performance benchmarks for:
- Template compilation speed
- File generation efficiency
- Memory usage patterns
- Cache effectiveness

These benchmarks help ensure the template system remains performant as it grows.
