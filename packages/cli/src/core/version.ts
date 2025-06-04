import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import semver from "semver";
import chalk from "chalk";
import { FarmError } from "./errors.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function getVersion(): string {
  try {
    // When built, we need to go from dist/* back to package.json
    // Try multiple possible paths to find package.json
    const possiblePaths = [
      join(__dirname, "../../package.json"), // from dist/core/
      join(__dirname, "../package.json"), // from dist/
      join(__dirname, "package.json"), // if in root
    ];

    let packageJson: any;
    let packagePath: string | null = null;

    for (const path of possiblePaths) {
      try {
        packageJson = JSON.parse(readFileSync(path, "utf-8"));
        packagePath = path;
        break;
      } catch {
        // Try next path
        continue;
      }
    }

    if (!packageJson || !packagePath) {
      throw new Error("package.json not found in any expected location");
    }

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
    console.log(chalk.blue(`Current version: ${currentVersion}`));
  } catch (error) {
    // Silently fail - updates check is not critical
  }
}

export function displayVersionInfo(): void {
  const farmVersion = getVersion();
  const nodeVersion = getNodeVersion();

  console.log(chalk.green("🌾 FARM Stack Framework"));
  console.log(`CLI Version: ${farmVersion}`);
  console.log(`Node.js Version: ${nodeVersion}`);
  console.log(`Platform: ${process.platform} ${process.arch}`);
}
