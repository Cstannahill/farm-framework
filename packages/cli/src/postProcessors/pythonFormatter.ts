// packages/cli/src/postProcessors/pythonFormatter.ts
import { execa } from "execa";
import path from "node:path";
import { existsSync, readdirSync } from "node:fs";
import chalk from "chalk";
import { moduleDirname } from "../utils/modulePath.js";

const __dirname = moduleDirname(import.meta.url);

export interface PythonFormatterOptions {
  projectRoot: string;
  verbose?: boolean;
}

/**
 * Format Python files using Ruff (preferred) or Black (fallback)
 * Uses bundled Ruff binary to avoid requiring Python installation
 */
export async function formatPython(
  options: PythonFormatterOptions
): Promise<void> {
  const { projectRoot, verbose = false } = options;

  // Check if project has Python files
  const hasPyFiles = hasAnyPythonFiles(projectRoot);
  if (!hasPyFiles) {
    if (verbose) {
      console.log(
        chalk.gray("🐍 No Python files found, skipping Python formatting")
      );
    }
    return;
  }

  if (verbose) {
    console.log(chalk.blue("🐍 Formatting Python files..."));
  }

  try {
    // Try Ruff first (preferred)
    await formatWithRuff(projectRoot, verbose);
  } catch (ruffError) {
    if (verbose) {
      console.log(chalk.yellow("⚠️ Ruff not available, trying Black..."));
    }

    try {
      // Fallback to Black
      await formatWithBlack(projectRoot, verbose);
    } catch (blackError) {
      console.warn(
        chalk.yellow(
          "⚠️ Python formatting failed. Install Ruff or Black for automatic formatting:\n" +
            "   pip install ruff  # or\n" +
            "   pip install black"
        )
      );
    }
  }
}

/**
 * Check if project contains any Python files
 */
function hasAnyPythonFiles(projectRoot: string): boolean {
  const commonPythonPaths = [
    "apps/api/src",
    "apps/api",
    "backend/src",
    "backend",
    "api/src",
    "api",
    "src",
  ];

  return commonPythonPaths.some((relativePath) => {
    const fullPath = path.join(projectRoot, relativePath);
    return existsSync(fullPath) && containsPythonFiles(fullPath);
  });
}

/**
 * Recursively check if directory contains .py files
 */
function containsPythonFiles(dirPath: string): boolean {
  if (!existsSync(dirPath)) return false;

  try {
    const entries = readdirSync(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith(".py")) {
        return true;
      }
      if (entry.isDirectory()) {
        const subDirPath = path.join(dirPath, entry.name);
        if (containsPythonFiles(subDirPath)) {
          return true;
        }
      }
    }
  } catch {
    // Ignore errors (permission issues, etc.)
  }

  return false;
}

/**
 * Format Python files using Ruff
 */
async function formatWithRuff(
  projectRoot: string,
  verbose: boolean
): Promise<void> {
  // Try bundled Ruff first, then system Ruff
  const ruffCommand = await getRuffCommand();

  // Format code
  await execa(ruffCommand, ["format", projectRoot], {
    stdio: verbose ? "inherit" : "pipe",
  });

  // Fix imports
  await execa(ruffCommand, ["check", projectRoot, "--fix", "--select", "I"], {
    stdio: verbose ? "inherit" : "pipe",
  });

  if (verbose) {
    console.log(chalk.green("✨ Python files formatted with Ruff"));
  }
}

/**
 * Format Python files using Black (fallback)
 */
async function formatWithBlack(
  projectRoot: string,
  verbose: boolean
): Promise<void> {
  await execa("python", ["-m", "black", "--quiet", projectRoot], {
    stdio: verbose ? "inherit" : "pipe",
  });

  if (verbose) {
    console.log(chalk.green("✨ Python files formatted with Black"));
  }
}

/**
 * Get the Ruff command to use (bundled binary or system installation)
 */
async function getRuffCommand(): Promise<string> {
  // First try bundled binary
  const bundledRuff = getBundledRuffPath();
  if (bundledRuff && existsSync(bundledRuff)) {
    return bundledRuff;
  }

  // Fallback to system Ruff
  return "ruff";
}

/**
 * Get path to bundled Ruff binary for current platform
 */
function getBundledRuffPath(): string | null {
  const platform = process.platform;
  const arch = process.arch;

  let binaryName: string;

  if (platform === "win32") {
    binaryName = "ruff.exe";
  } else {
    binaryName = "ruff";
  }

  // Construct path to bundled binary
  const binDir = path.join(__dirname, "..", "..", "bin");
  const platformDir = `${platform}-${arch}`;
  const binaryPath = path.join(binDir, platformDir, binaryName);

  return binaryPath;
}

/**
 * Legacy export for backwards compatibility
 */
export { formatPython as formatPythonCode };
