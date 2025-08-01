# @farm-framework/code-intelligence

## 0.2.0

### Minor Changes

- c705542: Fix code-intelligence package build setup and resolve TypeScript errors

  - Add missing `build:bundle` script to package.json for monorepo integration
  - Enable TypeScript declarations generation with proper DTS configuration
  - Create separate tsconfig.build.json for library builds
  - Fix all TypeScript type errors in server components
  - Refactor to use vector-based API (SemanticSearchEngine, CodeExplanationEngine)
  - Update entity construction to match CodeEntity interface
  - Map VectorStoreStats to IndexStatus correctly
  - Split tsup config to separate library files from test files

- c705542: Major packages (ai, observability, deployment, code-intelligence, api-client, core, type-sync, types, ui-components) working and integrated together.

### Patch Changes

- Updated dependencies [c705542]
  - @farm-framework/observability@0.2.0
  - @farm-framework/core@0.2.0
  - @farm-framework/types@0.2.0
