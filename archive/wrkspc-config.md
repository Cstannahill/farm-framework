# FARM Framework Monorepo TypeScript Build Structure (as of June 2025)

## 1. Solution Build Orchestration

- **tsconfig.build.json** at the root is the orchestrator for all TypeScript composite packages.
- It references all buildable packages in `packages/*` (and can be extended for `apps/*`):
  - `packages/types`
  - `packages/type-sync`
  - `packages/core`
  - `packages/cli`
  - `packages/ui-components`
- Run `tsc -b tsconfig.build.json` to build all packages in correct dependency order, emitting `.d.ts` for consumers.

## 2. Per-Package tsconfig.json

- Each package has a `tsconfig.json` with:
  - `composite: true` (except for non-build/test-only packages)
  - `outDir: "dist"`, `rootDir: "src"`
  - `declaration`, `declarationMap`, `sourceMap` enabled
  - `references` to any local dependencies (e.g., `type-sync` references `types`)
- Example for `type-sync`:
  ```json
  {
    "extends": "../../tsconfig.base.json",
    "compilerOptions": {
      "composite": true,
      "outDir": "dist",
      "rootDir": "src",
      "declaration": true,
      "declarationMap": true,
      "sourceMap": true
    },
    "include": ["src/**/*"],
    "references": [{ "path": "../types" }]
  }
  ```

## 3. Root tsconfig.base.json

- Shared compiler options for all packages.
- No longer sets `allowJs: true` (prevents JS input confusion).
- Path aliases only point to `src/` (never to `dist/`).

## 4. Package Scripts

- Each package's `package.json` only bundles with `tsup` (or similar):
  - `build`: `tsup`
  - `build:bundle`: `tsup`
  - No direct `tsc` build; type-checking is via root orchestrator.

## 5. Root Scripts

- `package.json` at root:
  - `build`: `tsc -b tsconfig.build.json && turbo run build:bundle`
  - `clean`: `tsc -b tsconfig.build.json --clean && turbo run clean && pnpm run clean:cache`

## 6. Turbo Pipeline

- `turbo.json`:
  - `build:bundle` depends on `^build:bundle` (ensures bundles are built after types)
  - `build` is for TypeScript output only

## 7. Dependency Flow

- All TypeScript build order and declaration generation is handled by `tsc -b tsconfig.build.json`.
- Bundling (with `tsup`) happens after type builds, per package.

## 8. Intra-Package Imports

- Always use relative imports within a package (never import your own package name).
- Path aliases are for cross-package imports only.

## 9. Cleanliness

- All `dist/` folders are in `.gitignore`.
- No direct references to `dist/` in any `paths` or imports.

## 10. Adding a New Package

- Add to `tsconfig.build.json` references.
- Add `composite: true`, `outDir`, `rootDir`, and `references` as needed in its `tsconfig.json`.

---

## Example Build Flow

1. `pnpm run clean` (cleans all outputs)
2. `pnpm run build` (runs orchestrated type build, then bundles)

---

## Troubleshooting

- If you see TS5055 or missing declaration errors, ensure:
  - All referenced packages are built first (use `tsc -b` from root)
  - No `allowJs: true` in any composite package
  - No path aliases point to `dist/`
  - All `references` are correct and point to composite projects

---

## References

- [TypeScript Project References](https://www.typescriptlang.org/docs/handbook/project-references.html)
- [Turborepo Caching](https://turbo.build/repo/docs/features/caching)
- [pnpm Workspaces](https://pnpm.io/workspaces)
