# FARM Testing Helpers

## Overview

This directory contains utilities and automated tests for FARM project templates and Docker-based infrastructure. It provides a comprehensive suite of tests to verify template generation, Docker integration, and project structure, ensuring the reliability of the FARM framework.

## ✅ Completed Implementation

### Core Components

1. **Vitest Test Suite** (`src/`)

   - Contains end-to-end and integration tests for template generation, Docker workflows, and platform compatibility.
   - Includes test utilities for running the FARM CLI and managing test environments.

2. **Template Validator** (`template-validator.ts`)

   - Helper class that generates a project from a template and checks its structure and compilation.
   - Used by tests to automate validation of generated projects.

3. **Setup Script** (`setup.ts`)

   - Vitest setup file for initializing the test environment and global hooks.

4. **Type Definitions** (`types.ts`)

   - TypeScript definitions for template configs, validation results, and test utilities.

5. **Exports** (`index.ts`)
   - Barrel file re-exporting the validator and types for external use in tests.

## Structure

```
testing/
  src/                  # Vitest test suite and utilities
  template-validator.ts # Template validation helper
  setup.ts              # Vitest setup script
  types.ts              # Type definitions
  index.ts              # Barrel file for exports
```
