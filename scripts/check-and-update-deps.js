#!/usr/bin/env node

/**
 * FARM Framework Dependency Checker and Updater
 * Checks for outdated dependencies and optionally updates them
 */

import { readFileSync, existsSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { execSync, spawn } from "child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const WORKSPACE_ROOT = dirname(__dirname);

// Colors for terminal output
const colors = {
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  purple: "\x1b[35m",
  cyan: "\x1b[36m",
  reset: "\x1b[0m",
  bold: "\x1b[1m",
};

// Print colored text
function printColor(color, text) {
  console.log(`${colors[color]}${text}${colors.reset}`);
}

// Print section headers
function printHeader(text) {
  console.log("");
  printColor("cyan", "=".repeat(50));
  printColor("cyan", text);
  printColor("cyan", "=".repeat(50));
  console.log("");
}

// Get latest version from npm registry
async function getLatestVersion(packageName) {
  try {
    const result = execSync(`npm view "${packageName}" version`, {
      encoding: "utf8",
      stdio: "pipe",
    });
    return result.trim();
  } catch (error) {
    return "unknown";
  }
}

// Parse version from package.json version string (removes ^ ~ etc.)
function parseVersion(versionString) {
  if (!versionString) return "unknown";
  const match = versionString.match(/[\d.]+/);
  return match ? match[0] : "unknown";
}

// Compare versions using semver logic
function compareVersions(current, latest) {
  if (current === latest) return "up-to-date";
  if (current === "unknown" || latest === "unknown") return "unknown";

  try {
    // Use npm semver for comparison if available
    const result = execSync(`npx semver "${current}" -r ">=${latest}"`, {
      encoding: "utf8",
      stdio: "pipe",
    });
    return result.trim() ? "up-to-date" : "outdated";
  } catch {
    // Fallback to simple string comparison
    return current === latest ? "up-to-date" : "check-needed";
  }
}

// Check dependencies in a package.json file
async function checkPackageDependencies(packageJsonPath, packageName) {
  if (!existsSync(packageJsonPath)) {
    printColor("red", `❌ package.json not found at: ${packageJsonPath}`);
    return { outdated: 0, total: 0, updates: [] };
  }

  printHeader(`Checking: ${packageName}`);

  let packageJson;
  try {
    packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
  } catch (error) {
    printColor("red", `❌ Error reading package.json: ${error.message}`);
    return { outdated: 0, total: 0, updates: [] };
  }

  let outdatedCount = 0;
  let totalCount = 0;
  const updatesAvailable = [];

  // Check different dependency types
  const depTypes = [
    { key: "dependencies", label: "📦 Dependencies" },
    { key: "devDependencies", label: "🔧 Dev Dependencies" },
    { key: "peerDependencies", label: "🤝 Peer Dependencies" },
  ];

  for (const { key, label } of depTypes) {
    const deps = packageJson[key];
    if (!deps || Object.keys(deps).length === 0) continue;

    printColor("blue", label + ":");
    console.log("");

    for (const [depName, currentVersionRaw] of Object.entries(deps)) {
      const currentVersion = parseVersion(currentVersionRaw);
      const latestVersion = await getLatestVersion(depName);
      const status = compareVersions(currentVersion, latestVersion);

      totalCount++;

      const statusSymbol = {
        "up-to-date": colors.green + "✓" + colors.reset,
        outdated: colors.yellow + "⚠" + colors.reset,
        unknown: colors.purple + "?" + colors.reset,
        "check-needed": colors.purple + "?" + colors.reset,
      }[status];

      console.log(
        `  ${depName.padEnd(40)} ${currentVersion} -> ${latestVersion} ${statusSymbol}`
      );

      if (status === "outdated") {
        outdatedCount++;
        updatesAvailable.push(`${depName}:${latestVersion}`);
      }
    }
    console.log("");
  }

  printColor("cyan", `Summary for ${packageName}:`);
  printColor("green", `  ✓ Up to date: ${totalCount - outdatedCount}`);
  if (outdatedCount > 0) {
    printColor("yellow", `  ⚠ Outdated: ${outdatedCount}`);
  }
  printColor("blue", `  📊 Total dependencies: ${totalCount}`);

  return {
    outdated: outdatedCount,
    total: totalCount,
    updates: updatesAvailable,
  };
}

// Update dependencies for a package
async function updatePackageDependencies(packageDir, packageName) {
  printHeader(`Updating dependencies for: ${packageName}`);

  try {
    process.chdir(packageDir);

    // Check if pnpm is available (preferred for this workspace)
    let updateCommand;
    try {
      execSync("pnpm --version", { stdio: "pipe" });
      updateCommand = "pnpm update --latest";
    } catch {
      updateCommand = "npm update";
    }

    printColor("blue", `🔄 Running: ${updateCommand}`);
    execSync(updateCommand, { stdio: "inherit" });
    printColor("green", `✅ Dependencies updated for ${packageName}`);

    return true;
  } catch (error) {
    printColor("red", `❌ Failed to update ${packageName}: ${error.message}`);
    return false;
  }
}

// Show usage information
function showUsage() {
  console.log("Usage: node check-and-update-deps.js [OPTIONS]");
  console.log("");
  console.log("Options:");
  console.log("  -h, --help              Show this help message");
  console.log("  -c, --check             Check dependencies only (default)");
  console.log("  -u, --update            Update all outdated dependencies");
  console.log("  -p, --package <name>    Check/update specific package only");
  console.log("  -r, --root              Check/update root workspace only");
  console.log(
    "  -i, --interactive       Interactive mode - ask before each update"
  );
  console.log("  -v, --verbose           Verbose output");
  console.log("");
  console.log("Examples:");
  console.log(
    "  node check-and-update-deps.js                      # Check all packages"
  );
  console.log(
    "  node check-and-update-deps.js -u                   # Update all packages"
  );
  console.log(
    "  node check-and-update-deps.js -p observability     # Check only observability package"
  );
  console.log(
    "  node check-and-update-deps.js -p observability -u  # Update only observability package"
  );
  console.log(
    "  node check-and-update-deps.js -r -u                # Update only root workspace"
  );
}

// Prompt user for input
function askQuestion(question) {
  return new Promise((resolve) => {
    process.stdout.write(question);
    process.stdin.once("data", (data) => {
      resolve(data.toString().trim().toLowerCase());
    });
  });
}

// Main function
async function main() {
  const args = process.argv.slice(2);

  // Parse arguments
  let checkOnly = true;
  let updateAll = false;
  let specificPackage = "";
  let rootOnly = false;
  let interactive = false;
  let verbose = false;

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "-h":
      case "--help":
        showUsage();
        process.exit(0);
        break;
      case "-c":
      case "--check":
        checkOnly = true;
        updateAll = false;
        break;
      case "-u":
      case "--update":
        checkOnly = false;
        updateAll = true;
        break;
      case "-p":
      case "--package":
        specificPackage = args[++i];
        break;
      case "-r":
      case "--root":
        rootOnly = true;
        break;
      case "-i":
      case "--interactive":
        interactive = true;
        break;
      case "-v":
      case "--verbose":
        verbose = true;
        break;
      default:
        printColor("red", `Unknown option: ${args[i]}`);
        showUsage();
        process.exit(1);
    }
  }

  printHeader("FARM Framework Dependency Checker");

  // Check if required tools are available
  try {
    execSync("npm --version", { stdio: "pipe" });
  } catch {
    printColor(
      "red",
      "❌ npm is required but not installed. Please install it first."
    );
    process.exit(1);
  }

  process.chdir(WORKSPACE_ROOT);

  let totalOutdated = 0;
  const packagesToUpdate = [];

  // Check root workspace
  if (rootOnly || !specificPackage) {
    const rootResult = await checkPackageDependencies(
      join(WORKSPACE_ROOT, "package.json"),
      "Root Workspace"
    );
    totalOutdated += rootResult.outdated;

    if (rootResult.outdated > 0) {
      packagesToUpdate.push({
        path: WORKSPACE_ROOT,
        name: "Root Workspace",
        updates: rootResult.updates,
      });
    }
  }

  // Check packages
  if (!rootOnly) {
    const packagesDir = join(WORKSPACE_ROOT, "packages");

    if (specificPackage) {
      // Check specific package
      const packagePath = join(packagesDir, specificPackage);
      if (existsSync(packagePath)) {
        const result = await checkPackageDependencies(
          join(packagePath, "package.json"),
          specificPackage
        );
        totalOutdated += result.outdated;

        if (result.outdated > 0) {
          packagesToUpdate.push({
            path: packagePath,
            name: specificPackage,
            updates: result.updates,
          });
        }
      } else {
        printColor("red", `❌ Package not found: ${specificPackage}`);
        process.exit(1);
      }
    } else {
      // Check all packages
      if (existsSync(packagesDir)) {
        const packages = readdirSync(packagesDir, { withFileTypes: true })
          .filter((dirent) => dirent.isDirectory())
          .map((dirent) => dirent.name);

        for (const packageName of packages) {
          const packagePath = join(packagesDir, packageName);
          const result = await checkPackageDependencies(
            join(packagePath, "package.json"),
            packageName
          );
          totalOutdated += result.outdated;

          if (result.outdated > 0) {
            packagesToUpdate.push({
              path: packagePath,
              name: packageName,
              updates: result.updates,
            });
          }
        }
      }
    }
  }

  // Final summary
  printHeader("FINAL SUMMARY");

  if (totalOutdated === 0) {
    printColor("green", "🎉 All dependencies are up to date!");
  } else {
    printColor(
      "yellow",
      `⚠️  Found ${totalOutdated} outdated dependencies across ${packagesToUpdate.length} packages`
    );

    if (packagesToUpdate.length > 0) {
      console.log("");
      printColor("blue", "Packages with updates available:");
      packagesToUpdate.forEach((pkg) => {
        printColor("yellow", `  • ${pkg.name}`);
      });
    }

    // Update logic
    if (updateAll) {
      console.log("");

      if (interactive) {
        const answer = await askQuestion(
          "Do you want to update all outdated dependencies? (y/N): "
        );
        if (!["y", "yes"].includes(answer)) {
          updateAll = false;
        }
      }

      if (updateAll) {
        printHeader("UPDATING DEPENDENCIES");

        for (const pkg of packagesToUpdate) {
          if (interactive) {
            const answer = await askQuestion(`Update ${pkg.name}? (y/N): `);
            if (!["y", "yes"].includes(answer)) {
              continue;
            }
          }

          await updatePackageDependencies(pkg.path, pkg.name);
        }

        printColor("green", "✅ All updates completed!");
      }
    } else {
      console.log("");
      printColor("cyan", "💡 To update all dependencies, run:");
      printColor("cyan", "   node scripts/check-and-update-deps.js --update");
      console.log("");
      printColor("cyan", "💡 To update interactively, run:");
      printColor(
        "cyan",
        "   node scripts/check-and-update-deps.js --update --interactive"
      );
    }
  }
}

// Run the script
main().catch((error) => {
  printColor("red", `❌ Error: ${error.message}`);
  process.exit(1);
});
