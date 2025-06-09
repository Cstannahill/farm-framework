# Tools: CLI helpers

Command modules used internally by the monorepo.  The `generate` command
relies on the type-sync utilities provided by `@farm/type-sync`.

## Structure

- **commands/generate.ts** – implements `generate` subcommands for
  generating types, API clients and hooks from an OpenAPI schema.
- **commands/types.ts** – TypeScript interfaces describing the command
  options.
- **package.json** and **tsconfig.json** – build metadata.
