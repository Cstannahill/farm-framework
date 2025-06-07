# Tools: Testing helpers

Contains utilities and automated tests for the project templates and
Docker based infrastructure.

## Structure

- **src/** – vitest tests verifying template generation and Docker
  integration.
- **template-validator.ts** – helper class that generates a project from
  a template and checks its structure and compilation.
- **setup.ts** – vitest setup used by the tests.
- **types.ts** – TypeScript definitions used by the validator.
- **index.ts** – re-exports the validator and types for external use.
