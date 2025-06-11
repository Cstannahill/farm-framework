# FARM Template Validator

## Overview

This directory provides tools for validating FARM project templates and configurations. It includes a CLI for running template validation, compatibility checks, and provider connectivity tests, ensuring that all templates are production-ready and compatible with supported environments.

## ✅ Completed Implementation

### Core Components

1. **CLI Entrypoint** (`src/cli.ts`)

   - Provides commands for validating all templates, specific templates, or configurations.
   - Supports options for skipping AI provider tests, running in parallel, and generating reports.
   - Includes commands for testing AI provider connectivity and running performance benchmarks.

2. **Template Validator** (`src/validator.ts`)

   - Core logic for validating templates by generating projects, running health checks, and verifying structure.
   - Handles error reporting, result aggregation, and temporary project management.

3. **Configurations** (`src/configurations.ts`)

   - Defines all supported template configurations and their variants.
   - Used to drive validation coverage and compatibility checks.

4. **Types** (`src/types.ts`)

   - TypeScript definitions for template configs, validation results, and provider settings.

5. **Usage** (`commands.md`)

```bash
# Run all template validations

farm validate

# Validate specific template

farm validate --template ai-chat

# Validate specific configuration

farm validate --template ai-chat --config ollama-only

# Skip AI provider tests (for CI environments without GPU)

farm validate --skip-ai

# Test AI provider connectivity

farm validate:providers

# Test specific provider

farm validate:providers --provider ollama

# Run performance benchmarks

farm validate:performance

# Generate compatibility report

farm validate:compatibility

# Validate against specific environments

farm validate --env development
farm validate --env production
```

## Structure

```
template-validator/
  src/
    cli.ts              # CLI entrypoint for validation
    validator.ts        # Template validation logic
    configurations.ts   # Supported template configs
    types.ts            # Type definitions
  commands.md           # Command usage and examples
```
