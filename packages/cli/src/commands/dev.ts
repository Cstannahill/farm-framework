import type { DevCommandOptions } from "@farm/types";
import { logger } from "../utils/logger.js";

export async function devCommand(options: DevCommandOptions): Promise<void> {
  logger.info("🌾 Starting FARM development server...");

  // TODO: Implement development server (section 1.5)
  logger.warn("Development server not implemented yet");
  logger.info("This will start the unified FARM development server");

  if (options.verbose) {
    logger.info("Verbose mode enabled");
  }

  if (options.frontendOnly) {
    logger.info("Frontend-only mode");
  }

  if (options.backendOnly) {
    logger.info("Backend-only mode");
  }
}
