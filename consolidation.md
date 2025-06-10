# FARM Framework Code Generation Consolidation Guide

This document describes the comprehensive refactor plan to consolidate and organize the FARM framework's code generation systems, including type synchronization, project scaffolding, and template processing.

## Current Architecture Analysis

### Project Creation (`farm --create`)
The `farm --create` command uses a sophisticated template system:
- **Command Entry**: `packages/cli/src/commands/create.ts` handles CLI options and validation
- **Project Scaffolding**: `ProjectScaffolder` coordinates the entire generation process
- **Template Processing**: `TemplateProcessor` handles Handlebars rendering from `templates/` directory
- **File Generation**: `ProjectFileGenerator` creates project files with dynamic content
- **Structure Generation**: `ProjectStructureGenerator` creates directory hierarchies

### Type Synchronization (`farm types:sync`) 
Two overlapping implementations exist:
- **packages/type-sync**: Standalone library with `TypeSyncOrchestrator`, generators, and watcher
- **packages/core/src/codegen**: Thin wrapper that re-exports from `@farm/type-sync`
- **archive/codegen** (formerly tools/codegen): Legacy implementation with rich features
- **CLI Integration**: `packages/cli/src/commands/types/sync.ts` imports from `@farm/core`

### Current Issues
1. **Duplication**: Multiple orchestrators with similar functionality
2. **Fragmentation**: Features scattered across different packages
3. **Legacy Code**: `archive/codegen` contains advanced features not yet migrated
4. **Inconsistent APIs**: Different interfaces between components

## Consolidation Strategy

### Phase 1: Strengthen Core Type-Sync Package
**Objective**: Make `packages/type-sync` the definitive source for all type generation logic.

**Actions**:
- Migrate missing features from `archive/codegen` (CLI helpers, pipeline integration, examples)
- Enhance generator implementations with advanced features
- Consolidate caching, diffing, and watch functionality
- Ensure comprehensive test coverage

### Phase 2: Standardize CLI Integration  
**Objective**: Create consistent CLI experience across all generation commands.

**Actions**:
- Keep `packages/core/src/codegen` as the framework integration layer
- Ensure all CLI commands (`create`, `types:sync`, `generate`) use consistent patterns
- Consolidate common CLI utilities and error handling
- Maintain backward compatibility

### Phase 3: Optimize Template System
**Objective**: Improve template processing efficiency and maintainability.

**Actions**:
- Enhance `TemplateProcessor` performance for large projects
- Expand Handlebars helper system for more complex use cases  
- Improve template validation and error reporting
- Document template authoring guidelines

### Phase 4: Clean Up Legacy Code
**Objective**: Remove redundant code and clarify architecture.

**Actions**:
- Archive `archive/codegen` after feature migration is complete
- Remove any unused wrapper code in `packages/core`
- Update documentation to reflect final architecture
- Create migration guides for external users

## Detailed Implementation Plan

### Step 1: Audit and Prepare (Duration: 1-2 days)

#### 1.1 Create Working Branch
```bash
git checkout -b consolidate-codegen
git push -u origin consolidate-codegen
```

#### 1.2 Run Full Test Suite
```bash
npm run test
npm run test:api  
npm run test:web
farm types:sync --dry-run  # Verify current functionality
```

#### 1.3 Document Current State
- Map all imports/exports between packages
- Identify all files that depend on `archive/codegen`
- List all CLI commands that use type generation
- Document current API surface area

### Step 2: Enhance Type-Sync Package (Duration: 3-4 days)

#### 2.1 Migrate Advanced Features from Archive
**From `archive/codegen/src/cli-integration.ts`**:
- `FarmCodeGenerator` class
- CLI integration helpers
- Performance monitoring
- Enhanced error reporting

**From `archive/codegen/src/pipeline-integration.ts`**:
- Pipeline coordination logic
- Incremental generation strategies
- Build tool integrations

**From `archive/codegen/src/type-generator.ts`**:
- Advanced type generation algorithms
- OpenAPI schema optimization
- Custom type transformations

#### 2.2 Strengthen Generator Implementations
**Location**: `packages/type-sync/src/generators/`

**Enhance TypeScriptGenerator**:
```typescript
// packages/type-sync/src/generators/typescript.ts
export class TypeScriptGenerator {
  async generate(schema: OpenAPISchema, opts: TypeScriptGenerationOptions): Promise<GenerationResult> {
    // Migrate advanced features from archive
    // - Complex type unions
    // - Nested object handling  
    // - Enum optimizations
    // - Comment preservation
  }
}
```

**Enhance APIClientGenerator**:
```typescript
// packages/type-sync/src/generators/api-client.ts
export class APIClientGenerator {
  async generate(schema: OpenAPISchema, opts: APIClientGeneratorOptions): Promise<GenerationResult> {
    // Migrate features from archive
    // - Authentication handling
    // - Request/response interceptors
    // - Error handling patterns
    // - Streaming support
  }
}
```

**Create New Generators**:
```typescript
// packages/type-sync/src/generators/react-hooks.ts
export class ReactHookGenerator {
  async generate(schema: OpenAPISchema, opts: ReactHookGeneratorOptions): Promise<GenerationResult> {
    // Generate React Query hooks
    // Generate custom hooks for API calls
    // Generate streaming hooks for real-time data
  }
}

// packages/type-sync/src/generators/ai-hooks.ts  
export class AIHookGenerator {
  async generate(schema: OpenAPISchema, opts: AIHookGeneratorOptions): Promise<GenerationResult> {
    // Generate AI-specific hooks
    // Generate streaming chat hooks
    // Generate model management hooks
  }
}
```

#### 2.3 Enhance Core Orchestrator
```typescript
// packages/type-sync/src/orchestrator.ts
export class TypeSyncOrchestrator {
  // Add from archive/codegen
  private performanceMonitor: PerformanceMonitor;
  private incrementalCache: IncrementalCache;
  private pipelineIntegration: PipelineIntegration;

  async syncOnce(opts?: Partial<SyncOptions>): Promise<SyncResult> {
    // Enhanced with performance monitoring
    // Incremental generation support
    // Better error recovery
    // Progress reporting
  }

  async startWatchMode(): Promise<void> {
    // Enhanced file watching
    // Debounced regeneration
    // Smart dependency tracking
  }
}
```

#### 2.4 Strengthen Utilities
```typescript
// packages/type-sync/src/cache.ts
export class GenerationCache {
  // Migrate advanced caching from archive
  // - Schema fingerprinting
  // - Dependency tracking
  // - Invalidation strategies
}

// packages/type-sync/src/extractors/openapi.ts
export class OpenAPIExtractor {
  // Migrate enhanced extraction from archive
  // - FastAPI introspection
  // - Schema validation
  // - Error handling
}
```

### Step 3: Update CLI Integration (Duration: 1-2 days)

#### 3.1 Enhance Core Wrapper
```typescript
// packages/core/src/codegen/orchestrator.ts
export class CodegenOrchestrator {
  private typeSync = new TypeSyncOrchestrator();
  
  constructor(private frameworkConfig?: FarmConfig) {
    // Framework-specific initialization
  }

  async initialize(config: CodegenOptions) {
    // Apply framework-specific configuration
    const enhancedConfig = this.applyFrameworkDefaults(config);
    await this.typeSync.initialize(enhancedConfig);
  }

  private applyFrameworkDefaults(config: CodegenOptions): SyncOptions {
    // Add framework-specific defaults
    // Integrate with farm.config.ts settings
    // Apply environment-specific configurations
  }
}
```

#### 3.2 Update CLI Commands
```typescript
// packages/cli/src/commands/types/sync.ts
import { CodegenOrchestrator } from "@farm/core";

export function createTypeSyncCommand(): Command {
  // Enhanced CLI with better options
  // Progress reporting
  // Configuration validation
  // Performance metrics
}
```

#### 3.3 Enhance Generate Command
```typescript
// packages/cli/src/commands/generate.ts
export function createGenerateCommand(): Command {
  // Consolidate all generation commands
  // - farm generate types
  // - farm generate client  
  // - farm generate hooks
  // - farm generate models
}
```

### Step 4: Improve Template System (Duration: 2-3 days)

#### 4.1 Optimize TemplateProcessor Performance
```typescript
// packages/cli/src/template/processor.ts
export class TemplateProcessor {
  private templateCache = new Map<string, HandlebarsTemplate>();
  private helperRegistry = new HelperRegistry();

  async processTemplate(templateName: string, context: TemplateContext, outputPath: string): Promise<string[]> {
    // Implement template caching
    // Parallel file processing
    // Progress reporting
    // Better error handling
  }

  private async processFilesBatch(files: TemplateFile[], batchSize = 10): Promise<void> {
    // Process files in parallel batches
    // Reduce I/O bottlenecks
  }
}
```

#### 4.2 Expand Handlebars Helpers
```typescript
// packages/cli/src/template/helpers.ts
export function registerAdvancedHelpers(handlebars: HandlebarsInstance): void {
  // Add more sophisticated helpers
  // - Code formatting helpers
  // - Import/export helpers
  // - Validation helpers
  // - AI-specific helpers
}
```

#### 4.3 Improve Template Validation
```typescript
// packages/cli/src/template/validator.ts
export class TemplateValidator {
  async validateTemplate(templatePath: string): Promise<ValidationResult> {
    // Validate template syntax
    // Check required files exist
    // Validate Handlebars expressions
    // Check for circular dependencies
  }
}
```

### Step 5: Testing and Validation (Duration: 2-3 days)

#### 5.1 Enhanced Test Coverage
```typescript
// packages/type-sync/src/__tests__/integration.test.ts
describe('Type-Sync Integration', () => {
  // Test complete workflows
  // Test performance benchmarks  
  // Test error scenarios
  // Test watch mode functionality
});

// packages/cli/src/__tests__/e2e.test.ts
describe('CLI End-to-End', () => {
  // Test project creation
  // Test type generation
  // Test template processing
  // Test error handling
});
```

#### 5.2 Performance Testing
```typescript
// tools/testing/src/performance.test.ts
describe('Performance Benchmarks', () => {
  // Measure template processing speed
  // Measure type generation speed
  // Memory usage tests
  // Large project tests
});
```

#### 5.3 Migration Testing
```bash
# Test existing projects still work
farm types:sync  # Should work unchanged
farm create test-project  # Should work unchanged
farm generate client  # Should work unchanged
```

### Step 6: Documentation and Cleanup (Duration: 1-2 days)

#### 6.1 Update Documentation
```markdown
# docs/code-generation.md
## Code Generation Architecture

### Type Synchronization
- Package: `@farm/type-sync`
- CLI: `farm types:sync`
- Configuration: `farm.config.ts`

### Project Creation  
- Package: `@farm/cli`
- CLI: `farm create`
- Templates: `templates/`

### Advanced Generation
- Package: `@farm/core`
- CLI: `farm generate`
- Extensions: Custom generators
```

#### 6.2 Archive Legacy Code
```bash
# Only after confirming all features migrated
git mv tools/codegen archive/codegen-legacy
git commit -m "Archive legacy codegen implementation"
```

#### 6.3 Update Package.json Files
```json
// packages/type-sync/package.json
{
  "name": "@farm/type-sync",
  "description": "Standalone type synchronization for FARM framework",
  "keywords": ["farm", "typescript", "codegen", "openapi"],
  "exports": {
    ".": "./dist/index.js",
    "./generators": "./dist/generators/index.js",
    "./extractors": "./dist/extractors/index.js"
  }
}
```

## Final Architecture

```
farm-framework/
├── packages/
│   ├── type-sync/              # 🎯 Core type generation library
│   │   ├── src/
│   │   │   ├── orchestrator.ts     # Main coordination
│   │   │   ├── generators/         # All code generators
│   │   │   │   ├── typescript.ts
│   │   │   │   ├── api-client.ts
│   │   │   │   ├── react-hooks.ts
│   │   │   │   └── ai-hooks.ts
│   │   │   ├── extractors/         # Schema extraction
│   │   │   ├── cache.ts            # Caching system
│   │   │   ├── watcher.ts          # File watching
│   │   │   └── index.ts            # Public exports
│   │   └── package.json
│   │
│   ├── core/                   # 🔧 Framework integration
│   │   └── src/codegen/
│   │       ├── orchestrator.ts     # Framework wrapper
│   │       └── index.ts            # Re-exports from type-sync
│   │
│   └── cli/                    # 🖥️ Command line interface
│       └── src/commands/
│           ├── create.ts           # Project scaffolding (unchanged)
│           ├── generate.ts         # Enhanced generation commands
│           └── types/
│               └── sync.ts         # Type sync command
│
├── templates/                  # 📁 Project templates (unchanged)
│   ├── basic/
│   ├── ai-chat/
│   └── ...
│
└── archive/                    # 📚 Legacy code (reference only)
    └── codegen-legacy/
```

## Migration Benefits

1. **Unified API**: Single source of truth for type generation
2. **Better Performance**: Optimized template processing and caching  
3. **Enhanced Features**: Migrated advanced capabilities from legacy code
4. **Maintainability**: Clear separation of concerns and responsibilities
5. **Extensibility**: Easy to add new generators and features
6. **Backward Compatibility**: Existing commands continue to work

## Risk Mitigation

1. **Incremental Migration**: Features migrated one at a time with testing
2. **Rollback Plan**: Archive preserves original implementation
3. **Comprehensive Testing**: Full test coverage before any deletions
4. **Documentation**: Clear migration guide for external users
5. **Version Tagging**: Git tags mark safe rollback points

## Success Criteria

- [ ] All existing CLI commands work unchanged
- [ ] Performance equals or exceeds current implementation
- [ ] Full test coverage for new consolidated code
- [ ] Documentation accurately reflects new architecture
- [ ] Zero breaking changes for end users
- [ ] Legacy code safely archived with migration path documented

This consolidation will significantly improve the FARM framework's code generation capabilities while maintaining stability and backward compatibility.