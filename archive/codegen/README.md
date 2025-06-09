# Tools: Code Generation

Utilities for generating TypeScript types, API clients and React hooks
from a FastAPI OpenAPI schema.

Key modules include:

- **openapi-extractor.ts** – extracts an OpenAPI document from a running
  FastAPI server or from a static file.
- **typescript-generator.ts** – wrapper around the TypeScript generation
  utilities under `src/generators`.
- **api-client-generator.ts** – produces an axios based client library
  from a schema.
- **react-hook-generator.ts** – creates React hooks wrapping the client
  methods.
- **pipeline-integration.ts** – orchestrates full generation pipeline
  and watching logic used by `farm codegen`.
- **examples/** – demonstration scripts of the workflow.
- **src/** – implementation details split into generators, schema
  utilities and CLI helpers.
