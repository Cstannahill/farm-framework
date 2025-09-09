# Tests Overview

This document describes the automated tests included in the repository. It lists every test file, outlines what each suite checks, and provides notes on potential failure causes.

## Summary

- Test runner: **vitest** (see `vitest.config.ts`)
- Some tests rely on Docker or Python tooling and may fail if those dependencies are unavailable.
- Two files (`service-orchestration.test.ts` and `template-generation.test.ts`) are empty placeholders.

## Test Files

### tools/codegen/src/__tests__/schema.test.ts
Validates the OpenAPI schema extraction system and watcher utilities.

Tests include:
1. **should extract valid OpenAPI schema from FastAPI app** – spawns a test FastAPI project and verifies the extracted schema structure.
2. **should cache schemas correctly** – ensures cached extraction is faster and returns identical schemas.
3. **should force refresh when requested** – verifies bypassing the cache works.
4. **should validate schema structure** – checks required OpenAPI fields are present.
5. **should handle extraction errors gracefully** – invalid path should reject.
6. **should provide cache statistics** – confirms stats contain file counts and size.
7. **should clear cache successfully** – verifies cache directory cleaning.
8. **should start and stop watcher successfully** – validates watcher lifecycle and statistics.
9. **should extract initial schema on start** – watcher emits a `schema-extracted` event.
10. **should detect file changes and trigger extraction** – modifies a file and expects change events.
11. **should handle extraction errors gracefully** – watcher emits an error when extraction fails.
12. **should force extraction on demand** – manual extraction via watcher.
13. **should work end-to-end with real FastAPI app** – spins up a real FastAPI server and extracts a schema.

Failures usually indicate Python or FastAPI is missing, ports are in use, or file permissions prevent creating fixtures.

### tools/codegen/src/__tests__/typescript-generation.test.ts
Comprehensive tests for the TypeScript type generation pipeline.

Key cases:
1. **should generate TypeScript interfaces from OpenAPI schema**
2. **should handle enums correctly**
3. **should generate enum types with different strategies**
4. **should handle date types correctly**
5. **should generate API request/response types**
6. **should generate proper index file**
7. **should handle complex types and references**
8. **should include JSDoc comments when enabled**
9. **should skip comments when disabled**
10. **should perform initial generation**
11. **should skip regeneration when schema unchanged**
12. **should regenerate when schema changes**
13. **should force regeneration when requested**
14. **should track generation statistics**
15. **should handle missing files**
16. **should work end-to-end with schema extraction**
17. **should handle schema watching integration**
18. **performance test utility** (helper functions at bottom)

These tests write temporary TypeScript output and compare file contents. Failures may arise from file system permissions or if the generator code changes.

### tools/codegen/typescript-generation.test.ts
Higher level generator tests using a mocked schema.

Cases:
1. **should generate TypeScript interfaces from OpenAPI schema**
2. **should handle optional and required properties correctly**
3. **should generate enum types correctly**
4. **should generate API client when requested**
5. **should generate React hooks when requested**
6. **should handle references correctly**
7. **should generate proper imports and exports**
8. **should handle generation errors gracefully**
9. **should support incremental generation**
10. **should work end-to-end with schema extraction**

Failures often point to changes in the generator’s output paths or formatting.

### tools/dev-server/src/__tests__/docker-manager.test.ts
Unit tests for the Docker manager using mocked `child_process.spawn`.

Cases:
1. **should start Ollama container with correct parameters** – verifies docker run arguments.
2. **should add GPU support when enabled** – ensures `--gpus all` is passed.
3. **should pull specified models** – checks docker exec commands for each model.

Failures suggest changed CLI arguments or spawn not being mocked correctly.

### tools/dev-server/src/__tests__/service-orchestration.test.ts
_Empty file – no tests implemented._

### tools/testing/src/docker-integration.test.ts
Integration tests that run `docker-compose` on example projects.

Cases:
1. **should start all services successfully** – launches containers and checks health endpoints.
2. **should persist MongoDB data across restarts** – placeholder for persistence check.
3. **should start all AI services including Ollama** – ensures the Ollama service starts for the AI template.

Failures typically indicate Docker is not available or services failed to start within the timeout.

### tools/testing/src/e2e-docker.test.ts
End-to-end workflow using the CLI and Docker.

Case:
1. **should complete full development cycle with Docker** – creates a project, runs `farm dev`, waits for services, then performs an AI chat request.

This heavy test requires Docker, Node, and Python. It may fail if network ports are busy or images are missing.

### tools/testing/src/platform-docker.test.ts
Cross-platform Docker scenarios (mostly placeholders with platform guards).

Cases:
1. **should handle Windows Docker Desktop** – skipped unless running on Windows.
2. **should handle Docker Desktop on macOS** – skipped unless macOS.
3. **should handle native Docker on Linux** – skipped unless Linux.

### tools/testing/src/template-docker.test.ts
Checks that project templates produce valid Docker setups.

Cases:
1. **should generate working docker-compose.yml** – runs the CLI with `--template basic` and verifies the compose file.
2. **should build Docker images successfully** – optional test that builds images if Docker is running.
3. **should include Ollama service in docker-compose.yml** – ensures the AI template outputs the expected service definition.

### tools/testing/src/template-generation.test.ts
_Empty file – no tests implemented._

## Overall Observations

- Many tests rely on external tools (Docker, Python, FastAPI). Ensure those dependencies are installed before running `pnpm test`.
- Missing packages such as `fs-extra` or `node-fetch` will cause module resolution errors.
- Two placeholder files contain no tests. Removing or completing them would avoid “No test suite found” errors.

