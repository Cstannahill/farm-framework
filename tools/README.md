# FARM Framework – Tools Directory

This directory contains internal tools, utilities, and helpers that support development, testing, and validation workflows for the FARM Stack Framework monorepo. Each subdirectory provides a focused set of scripts or services used by the framework’s CLI, test suite, or development server.

## Directory Overview

- **cli/**  
  Command-line helpers and code generation modules used internally by the monorepo. Implements commands for generating types, API clients, and React hooks from OpenAPI schemas.  
  _Key files: `commands/generate.ts`, `commands/types.ts`_

- **dev-server/**  
  The core development server foundation that powers the `farm dev` command. Orchestrates multiple services (FastAPI, React, MongoDB, Ollama), manages their lifecycles, provides unified logging, health checks, and dynamic configuration for a seamless local development experience.  
  _Key files: `process-manager.ts`, `health-checker.ts`, `logger.ts`, `service-configs.ts`, `dev-server.ts`_

- **fixtures/**  
  Sample configuration and response files used by tests and examples. Includes mock FARM config files and placeholder Docker API responses for testing.  
  _Key files: `mock-farm-config.ts`, `docker-responses.json`_

- **template-validator/**  
  Tools for validating FARM project templates and configurations. Provides CLI commands and scripts to check template structure, configuration compatibility, and provider connectivity.  
  _Key files: `src/cli.ts`, `src/validator.ts`, `commands.md`_

- **testing/**  
  Utilities and automated tests for project templates and Docker-based infrastructure. Contains vitest tests, template validation helpers, and TypeScript definitions for test automation.  
  _Key files: `src/`, `template-validator.ts`, `setup.ts`, `types.ts`, `index.ts`_

- **utils/**  
  Reusable utility scripts for the test suite, including helpers for running the FARM CLI, interacting with Docker, and cleaning up containers during integration tests.  
  _Key files: `cli-runner.ts`, `docker-test-utils.ts`, `container-cleanup.ts`, `index.ts`_

---

Each subdirectory contains its own `README.md` with more details about its structure and usage.
