# Type-Sync Consolidation Guide

This document describes how to merge the existing type generation logic into a single maintainable package. The goal is to minimize breakage while moving code to its new home.

## Implementation Strategy

### Phase 1: Consolidate Core Logic
- **packages/type-sync** becomes the source of truth for type synchronization.
- Move real generator implementations from `tools/codegen` here.
- Export `TypeSyncOrchestrator`, `TypescriptGenerator`, and `APIClientGenerator` from this package.

### Phase 2: CLI Integration
- `packages/core/src/codegen` acts as a thin wrapper.
- Re-export `TypeSyncOrchestrator`, `SyncOptions`, and `TypeSyncWatcher` from `@farm/type-sync`.
- Introduce a small `CodegenOrchestrator` that instantiates `TypeSyncOrchestrator` and adds any framework-specific hooks.
- Update CLI commands in `packages/cli` to import from `@farm/core`.

### Phase 3: Template Generation Remains Separate
- `farm --create` templates continue to live under `templates/`.
- Type synchronization is an independent development-time tool.

## Benefits
- **Single source of truth** for type generation.
- **Clean public API** via `@farm/core`.
- **Reusable** `type-sync` package that can be published on its own.
- Existing commands keep working with minimal changes.

## Potential Concerns & Solutions
- **Framework-specific needs in type-sync?** Keep the core generic and let `@farm/core` pass configuration down.
- **Duplicate folder in `packages/core`?** Remove it only after confirming nothing imports it.
- **Legacy `tools/codegen`?** Keep it as a reference until all features are ported, then archive.

## Step-by-Step Plan

1. **Create a working branch.** Ensure current tests pass before starting.
2. **Move generators.** Copy the real generator logic from `tools/codegen` into `packages/type-sync/src/generators` and update imports.
3. **Wire up exports.** Re-export these generators from `packages/type-sync`.
4. **Adapt `@farm/core`.** Replace duplicated logic with thin wrappers that call into `@farm/type-sync`.
5. **Update CLI commands.** Point `packages/cli/src/commands/types/sync.ts` to the new orchestrator via `@farm/core`.
6. **Test thoroughly.** Run `farm types:sync` and watch mode in a sample app. Verify generated files match previous output.
7. **Search for stray imports.** Ensure no code depends on the soon-to-be removed paths.
8. **Archive old directories.** After confirming functionality, move `tools/codegen` to an `archive/` folder and delete `packages/core/src/codegen/type-sync`.
9. **Document final structure.** Update READMEs to show:
   \`\`\`
packages/
├── type-sync/      # core implementation
├── core/
│   └── src/codegen/  # thin wrapper + orchestrator
└── cli/
    └── commands/
        ├── create.ts  # project scaffolding
        └── types/     # uses @farm/core
   \`\`\`
10. **Tag the repo.** Create a git tag before deleting old code so recovery is easy.

## Cautious Practices
- **Incremental removal.** Only delete a directory after confirming the new path works and no other code depends on it.
- **Back up.** Keep a branch or tag with the original files during the transition.
- **Automated tests.** Run the full test suite at every step to catch regressions early.

Following this guide will consolidate code generation while keeping the framework stable.
