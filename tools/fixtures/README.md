# FARM Fixtures

## Overview

This directory contains sample configuration files and mock responses used by the FARM test suite and example projects. Fixtures are used to simulate real-world configurations and external service responses, enabling robust and repeatable testing.

## ✅ Completed Implementation

### Core Components

1. **Mock FARM Config** (`mock-farm-config.ts`)

   - Example `farm.config.ts` demonstrating a fully populated AI section and all supported features.
   - Used by tests to validate configuration parsing and project generation.

2. **Docker Responses** (`docker-responses.json`)
   - Placeholder for mocked Docker API responses.
   - Used to simulate Docker service interactions in tests.

## Structure

```
fixtures/
  mock-farm-config.ts     # Example FARM config with AI providers
  docker-responses.json   # Mocked Docker API responses
```
