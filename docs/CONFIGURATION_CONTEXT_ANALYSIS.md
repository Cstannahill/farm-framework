# Configuration Context Analysis: Scaffolding vs Runtime

## Investigation Summary

This analysis examined the relationship between `template`, `features`, and `plugins` properties in FARM configuration, specifically whether they belong in runtime configuration or are only needed during scaffolding.

## Key Findings

### `template` Property

- **Usage**: 🔄 **Scaffolding + Runtime**
- **Scaffolding**: Determines which base template files to copy during project generation
- **Runtime**: Used by dev server for service configuration defaults and conditional service startup
- **Evidence**:
  ```typescript
  // tools/dev-server/src/service-configs.ts
  if (farmConfig.template !== "api-only") {
    configs.push(this.getFrontendConfig(farmConfig, projectPath));
  }
  ```
- **Recommendation**: **Keep in runtime configuration**

### `features` Property

- **Usage**: 🔄 **Scaffolding + Runtime**
- **Scaffolding**: Determines which directories, files, and dependencies to include
- **Runtime**: Exported as environment variables, used by dev server and build tools
- **Evidence**:

  ```typescript
  // Frontend environment variables
  if (farmConfig.features) {
    env.VITE_FEATURES = farmConfig.features.join(",");
  }

  // Type generation
  aiHooks: farmConfig.features?.includes("ai") || false;
  ```

- **Recommendation**: **Definitely keep in runtime configuration**

### `plugins` Property

- **Usage**: ⚡ **Runtime-only**
- **Scaffolding**: Not used during project generation
- **Runtime**: Used by plugin manager for activation/deactivation of components, hooks, and backend integrations
- **Evidence**: Plugin system architecture shows plugins are activated at runtime, not during scaffolding
- **Recommendation**: **Keep in runtime configuration**

## Configuration Context Documentation

Updated `FARM_CONFIG_OPTIONS.md` to include usage indicators:

- 🏗️ **Scaffolding-only**: Used during project generation
- 🔄 **Scaffolding + Runtime**: Used during generation AND by dev tools
- ⚡ **Runtime-only**: Used by running application and dev tools

## Rationale for Keeping All Properties

1. **Dev Server Integration**: The dev server uses `template` and `features` for conditional service startup and environment variable generation

2. **Build Tool Integration**: Build tools and type generation systems use `features` to determine what to include/generate

3. **Plugin System**: Plugins are inherently runtime components that extend application functionality

4. **Environment Variables**: `features` are exported to frontend as `VITE_FEATURES` for runtime feature toggling

5. **Consistency**: Having all configuration in one place simplifies development and debugging

## Updated Documentation

The configuration documentation now clearly indicates:

- Which properties are used at which times
- The distinction between scaffolding-time and runtime usage
- Examples showing both contexts

## Conclusion

**All three properties (`template`, `features`, `plugins`) should remain in the runtime farm.config.ts** because they serve important functions beyond just scaffolding. The framework's architecture is designed around having this information available at runtime for proper service orchestration, environment configuration, and plugin management.

This design provides a cohesive developer experience where the same configuration file serves both project generation and runtime needs, eliminating the complexity of maintaining separate scaffolding and runtime configurations.
