---
"@farm-framework/code-intelligence": minor
---

Fix code-intelligence package build setup and resolve TypeScript errors

- Add missing `build:bundle` script to package.json for monorepo integration
- Enable TypeScript declarations generation with proper DTS configuration  
- Create separate tsconfig.build.json for library builds
- Fix all TypeScript type errors in server components
- Refactor to use vector-based API (SemanticSearchEngine, CodeExplanationEngine)
- Update entity construction to match CodeEntity interface
- Map VectorStoreStats to IndexStatus correctly
- Split tsup config to separate library files from test files
