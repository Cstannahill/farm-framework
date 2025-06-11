/**
 * Primary exports for the `@farm-framework/ai` package. These re-export the core
 * provider base class, registry and configuration utilities used when
 * integrating AI providers within FARM applications.
 */
import { BaseAIProvider } from "./src/providers/base";

/**
 * Base class that all AI providers must extend in order to integrate with the
 * FARM AI subsystem.
 *
 * @type {typeof BaseAIProvider}
 */
export { BaseAIProvider };

import { ProviderRegistry } from "./src/registry/provider-registry";
/**
 * Singleton registry used to keep track of available AI providers at runtime.
 *
 * @type {typeof ProviderRegistry}
 */
export { ProviderRegistry };

import { AIConfigManager } from "./src/config/ai-config";
/**
 * Convenience class responsible for validating and normalising AI related
 * configuration objects for the framework.
 *
 * @type {typeof AIConfigManager}
 */
export { AIConfigManager };
