# Scripts Directory

This directory contains various utility scripts for the FARM Framework project. Scripts are organized by purpose and frequency of use.

## Directory Structure

### `/scripts` (Active Scripts)
Frequently used scripts for daily development and maintenance:

- **`build.sh`** - Main build script for the entire workspace
- **`check-and-update-deps.js`** - Check and update dependencies across packages
- **`check-and-update-deps.sh`** - Shell wrapper for dependency checking
- **`check-engines.js`** - Validate Node.js and npm version requirements
- **`check-packages.sh`** - Verify package integrity and workspace structure
- **`clear-cache.sh`** - Clear various caches (node_modules, build artifacts)
- **`ensure-packages.sh`** - Ensure all required packages are installed
- **`pre-release-check.sh`** - Pre-release validation and checks
- **`rebuild.sh`** - Clean rebuild of all packages
- **`release-alpha.sh`** - Alpha release automation
- **`test-dev-setup.sh`** - Test development environment setup
- **`test-prod-build.sh`** - Test production build process
- **`validate.sh`** - General validation script
- **`workspace-info.js`** - Display workspace information and status

### `/scripts/templates` (Template Management)
Scripts specifically for template system management:

- **`fix-templates.js`** - Fix handlebars template syntax issues
- **`manage-frontend-deps.js`** - Manage frontend dependencies with inheritance support
- **`validate-templates.js`** - Validate template inheritance compliance

### `/scripts/inactive` (Inactive Scripts)
One-time use scripts, migration tools, and rarely used utilities:

- **`devprodval.sh`** - Development/production validation (legacy)
- **`download-ruff-binaries.sh`** - Download Ruff linter binaries (setup)
- **`fix-package-tsconfigs.sh`** - Fix TypeScript configurations (one-time)
- **`fix-tsconfig.sh`** - Fix TypeScript configurations (one-time)
- **`handlebars-test.cjs`** - Handlebars testing utility (debugging)
- **`handlebars-test.js`** - Handlebars testing utility (debugging)
- **`npm-setup.sh`** - Initial npm setup (setup)
- **`rename-to-farm-framework.sh`** - Project rename migration (one-time)
- **`s-build.sh`** - Alternative build script (legacy)
- **`standardize-build.sh`** - Build standardization (one-time)

## Usage Guidelines

### Active Scripts
These scripts are meant for regular use during development:

```bash
# Check dependencies
./scripts/check-and-update-deps.js

# Build entire workspace
./scripts/build.sh

# Validate workspace
./scripts/validate.sh

# Clean rebuild
./scripts/rebuild.sh
```

### Template Scripts
For template system maintenance:

```bash
# Validate template inheritance
./scripts/templates/validate-templates.js

# Check frontend dependencies
./scripts/templates/manage-frontend-deps.js check

# Fix template syntax issues
./scripts/templates/fix-templates.js
```

### Inactive Scripts
These scripts are preserved for reference but should rarely be needed:

```bash
# If you need to run an inactive script:
./scripts/inactive/script-name.sh
```

## Adding New Scripts

- **Active scripts**: Place in `/scripts` root for frequently used utilities
- **Template scripts**: Place in `/scripts/templates` for template-related functionality
- **Inactive scripts**: Place in `/scripts/inactive` for one-time or rarely used scripts

## Script Dependencies

Most scripts expect to be run from the workspace root:

```bash
# Correct usage from workspace root
cd /path/to/farm-framework
./scripts/build.sh

# Or with full path
/path/to/farm-framework/scripts/build.sh
```

Some scripts may have additional dependencies:
- Node.js and npm/pnpm
- bash shell
- git (for version-related scripts)
- Python (for some analysis scripts)
