// packages/cli/src/core/version.ts
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import semver from "semver";
import { FarmError } from "./errors.js";
import { styles, icons, messages } from "../utils/styling.js";

// Get the directory of this source file using ES module syntax
const getCurrentFileDir = (): string => {
  const __filename = fileURLToPath(import.meta.url);
  return dirname(__filename);
};

const getPackageRoot = (): string => {
  // Get the current file's directory using ES module approach
  const currentDir = getCurrentFileDir();

  try {
    // Try to find package.json relative to the CLI package
    const possiblePaths = [
      // When running from built dist (dist/index.js -> package.json)
      join(currentDir, "..", "package.json"),
      // When running from source in development (src/core/version.ts -> package.json)
      join(currentDir, "..", "..", "package.json"),
      // Alternative source path
      join(currentDir, "..", "..", "..", "package.json"),
    ];

    for (const path of possiblePaths) {
      try {
        const content = readFileSync(path, "utf-8");
        const pkg = JSON.parse(content);
        // Verify this is actually the CLI package
        if (pkg.name === "@farm/cli") {
          return path;
        }
      } catch {
        continue;
      }
    }

    throw new Error("CLI package.json not found");
  } catch {
    // Fallback: try to construct path from current file location
    return join(currentDir, "..", "package.json");
  }
};

export function getVersion(): string {
  try {
    const packagePath = getPackageRoot();
    const packageJson = JSON.parse(readFileSync(packagePath, "utf-8"));
    return packageJson.version;
  } catch (error) {
    throw new FarmError("Failed to read CLI version", "VERSION_ERROR");
  }
}

export function getNodeVersion(): string {
  return process.version;
}

export async function checkCompatibility(): Promise<void> {
  const nodeVersion = getNodeVersion();
  const minNodeVersion = "18.0.0";

  if (!semver.gte(nodeVersion, minNodeVersion)) {
    throw new FarmError(
      `Node.js ${minNodeVersion} or higher is required. You are using ${nodeVersion}.`,
      "COMPATIBILITY_ERROR"
    );
  }
}

export async function checkForUpdates(): Promise<void> {
  try {
    const currentVersion = getVersion();
    // Check npm registry for latest version (implementation)
    // This would make an HTTP request to npm registry
    console.log(styles.info(`Current version: ${currentVersion}`));
  } catch (error) {
    // Silently fail - updates check is not critical
  }
}

export function displayVersionInfo(): void {
  const farmVersion = getVersion();
  const nodeVersion = getNodeVersion();

  console.log(styles.brand("🌾 FARM Stack Framework"));
  console.log(`CLI Version: ${farmVersion}`);
  console.log(`Node.js Version: ${nodeVersion}`);
  console.log(`Platform: ${process.platform} ${process.arch}`);
}
