# farm-framework

## 1.5.0

### Minor Changes

- CLI improvements: Enhanced template resolution, loading indicators, and error handling

  - Fixed global CLI template path resolution with multiple fallback strategies
  - Added progress indicators for file generation and formatting processes
  - Improved error handling with detailed diagnostics and recovery options
  - Enhanced file generation pipeline with separate handling for templates vs static files
  - Optimized template caching and performance metrics tracking
  - Better user experience with cleaner git output and formatted progress displays
  - Added comprehensive template root resolution for different installation scenarios

## 1.4.0

### Minor Changes

- Fix critical template path resolution for globally installed CLI

  - Fixed project-file-generator to look for templates in dist/templates directory first
  - Resolves "Template directory not found" errors when using globally installed CLI
  - Ensures templates are found correctly in both bundled and development scenarios
  - Critical fix for CLI reliability and user experience

## 1.3.0

### Minor Changes

- Fix template path resolution and package installation issues

  - **Template Resolution**: Fixed critical template path resolution issue where globally installed CLI was looking for templates in npm global directory instead of bundled templates
  - **Windows Package Manager**: Fixed Windows compatibility issues with package manager executable detection (pnpm.cmd, npm.cmd)
  - **Git Command Execution**: Fixed git commit message parsing issues by using shell:false for direct command execution
  - **Build Process**: Updated tsup config to properly copy templates from CLI package to dist/templates during build
  - **Template Processor**: Enhanced template directory resolution with better fallback logic and error messages

  These fixes resolve the "Template directory not found" and "spawn EINVAL" errors that were preventing project creation.

## 1.2.0

### Minor Changes

- Pathing fix for package globally installed

## 1.1.0

### Minor Changes

- Fixed a template pathing error due to previous package location.

## 1.0.0

### Major Changes

- f404dbd: Rename CLI package from @farm-framework/cli to farm-framework for better developer experience
