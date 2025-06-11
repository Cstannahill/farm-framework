# FARM Utility Helpers

## Overview

This directory contains reusable utility scripts employed by the FARM test suite and development tools. These helpers provide functionality for running the FARM CLI in test environments, managing Docker containers, and cleaning up resources during integration tests.

## ✅ Completed Implementation

### Core Components

1. **CLI Runner** (`cli-runner.ts`)

   - Spawns the FARM CLI within tests and captures output for validation.
   - Supports custom working directories, environment variables, and timeouts.
   - Used by integration and end-to-end tests to automate CLI workflows.

2. **Docker Test Utilities** (`docker-test-utils.ts`)

   - Helper functions for interacting with Docker containers during tests.
   - (Currently a stub, intended for future Docker management utilities.)

3. **Container Cleanup** (`container-cleanup.ts`)

   - Placeholder for logic to clean up Docker containers after tests.
   - Ensures a clean test environment for each run.

4. **Exports** (`index.ts`)
   - Barrel file re-exporting all utility functions for easy import in tests.

## Structure

```
utils/
  cli-runner.ts         # CLI runner for test automation
  docker-test-utils.ts  # Docker helpers (stub)
  container-cleanup.ts  # Docker cleanup logic (stub)
  index.ts              # Barrel file for exports
```
