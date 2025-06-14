# Inactive Scripts

This directory contains scripts that are infrequently used, one-time migration tools, or legacy utilities that are preserved for reference.

## Scripts in this directory:

### Migration & Setup Scripts

- **`rename-to-farm-framework.sh`** - One-time script used to rename project references
- **`npm-setup.sh`** - Initial npm workspace setup script
- **`download-ruff-binaries.sh`** - Downloads Ruff linter binaries for all platforms
- **`standardize-build.sh`** - One-time build standardization migration

### Configuration Fix Scripts

- **`fix-package-tsconfigs.sh`** - One-time TypeScript configuration fixes
- **`fix-tsconfig.sh`** - One-time TypeScript configuration fixes

### Testing & Debugging

- **`handlebars-test.cjs`** - CommonJS handlebars testing utility
- **`handlebars-test.js`** - ES modules handlebars testing utility

### Legacy Scripts

- **`devprodval.sh`** - Legacy development/production validation
- **`s-build.sh`** - Alternative build script (superseded by main build.sh)

## Usage Warning

⚠️ **These scripts are inactive for a reason**. They may:

- Be outdated and not work with current project structure
- Have been superseded by better alternatives
- Be one-time migration scripts that shouldn't be run again
- Contain experimental or debugging code

## Before Running

If you need to run any script from this directory:

1. **Review the script carefully** to understand what it does
2. **Check if there's a newer alternative** in the active scripts
3. **Test in a safe environment** first if possible
4. **Update paths and references** if the project structure has changed

## Moving Scripts Back to Active

If a script proves useful again:

1. Update it for current project structure
2. Test thoroughly
3. Move it back to appropriate directory (`/scripts` or `/scripts/templates`)
4. Update the main scripts README
