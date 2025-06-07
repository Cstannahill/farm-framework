# Tools: CLI helpers

Command modules used internally by the monorepo.  The `generate` command
wraps the code generation pipeline defined in `@farm/codegen`.

## Structure

- **commands/generate.ts** – implements `generate` subcommands for
  generating types, API clients and hooks from an OpenAPI schema.
- **commands/types.ts** – TypeScript interfaces describing the command
  options.
- **package.json** and **tsconfig.json** – build metadata.
