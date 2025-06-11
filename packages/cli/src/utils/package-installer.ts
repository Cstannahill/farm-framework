// packages/cli/src/utils/package-installer.ts
import { spawn } from "child_process";
import fs from "fs-extra";
import path from "path";
import chalk from "chalk";

export interface PackageInstallOptions {
  verbose?: boolean;
  preferOffline?: boolean;
  frozen?: boolean;
  production?: boolean;
}

export class PackageInstaller {
  private packageManager: "pnpm" | "npm" | "yarn";
  constructor() {
    this.packageManager = "pnpm"; // Default to pnpm for performance
  }

  private async fixVersionConflicts(
    projectPath: string,
    options: PackageInstallOptions,
    force: boolean = false
  ): Promise<void> {
    const packageJsonPath = path.join(projectPath, "package.json");
    const packageJson = await fs.readJSON(packageJsonPath);
    let modified = false;

    // Check both dependencies and devDependencies
    const dependencyTypes = ["dependencies", "devDependencies"] as const;

    for (const depType of dependencyTypes) {
      const deps = packageJson[depType];
      if (!deps) continue;

      for (const [packageName, version] of Object.entries(deps)) {
        if (typeof version !== "string") continue;

        try {
          // Get the latest available version for this package
          const latestVersion = await this.getLatestVersion(packageName);

          if (
            latestVersion &&
            this.shouldUpdateVersion(version as string, latestVersion, force)
          ) {
            if (options.verbose || force) {
              console.log(
                chalk.yellow(
                  `🔄 Updating ${packageName}: ${version} -> ^${latestVersion}`
                )
              );
            }

            deps[packageName] = `^${latestVersion}`;
            modified = true;
          }
        } catch (error) {
          if (options.verbose) {
            console.log(
              chalk.red(
                `⚠️  Could not check version for ${packageName}: ${error}`
              )
            );
          }
        }
      }
    }

    if (modified) {
      await fs.writeJSON(packageJsonPath, packageJson, { spaces: 2 });
      console.log(
        chalk.green("✅ Updated package.json with available versions")
      );
    }
  }

  private async getLatestVersion(packageName: string): Promise<string | null> {
    try {
      const result = await this.runCommand(
        this.getExecutableName(this.packageManager),
        ["view", packageName, "version"],
        { silent: true }
      );
      return result.trim();
    } catch {
      return null;
    }
  }

  private shouldUpdateVersion(
    currentVersion: string,
    latestVersion: string,
    force: boolean
  ): boolean {
    // Always update if forced (after a failed install)
    if (force) return true;

    // Parse versions to compare
    const currentMatch = currentVersion.match(/(\d+)\.(\d+)\.(\d+)/);
    const latestMatch = latestVersion.match(/(\d+)\.(\d+)\.(\d+)/);

    if (!currentMatch || !latestMatch) return false;

    const [, currentMajor, currentMinor, currentPatch] =
      currentMatch.map(Number);
    const [, latestMajor, latestMinor, latestPatch] = latestMatch.map(Number);

    // Only update if the requested version is higher than what's available
    if (currentMajor > latestMajor) return true;
    if (currentMajor === latestMajor && currentMinor > latestMinor) return true;
    if (
      currentMajor === latestMajor &&
      currentMinor === latestMinor &&
      currentPatch > latestPatch
    )
      return true;

    return false;
  }

  private getExecutableName(packageManager: string): string {
    // On Windows, package managers are typically .cmd files
    if (process.platform === "win32") {
      return `${packageManager}.cmd`;
    }
    return packageManager;
  }

  async detectPackageManager(): Promise<"pnpm" | "npm" | "yarn"> {
    // Test if pnpm is actually available
    try {
      await this.runCommand(this.getExecutableName("pnpm"), ["--version"], {
        silent: true,
      });
      return "pnpm";
    } catch {
      // Fall back to npm if pnpm isn't available
      try {
        await this.runCommand(this.getExecutableName("npm"), ["--version"], {
          silent: true,
        });
        return "npm";
      } catch {
        // Final fallback to yarn
        return "yarn";
      }
    }
  }

  async installAll(
    projectPath: string,
    options: PackageInstallOptions = {}
  ): Promise<void> {
    this.packageManager = await this.detectPackageManager();

    if (options.verbose) {
      console.log(
        chalk.blue(`📦 Using ${this.packageManager} as package manager`)
      );
    }

    // Check for workspace version conflicts first (proactively)
    await this.fixWorkspaceVersionConflicts(projectPath, options, false);

    // Install root dependencies
    await this.installDependencies(projectPath, options);

    // Check if it's a monorepo and install workspace dependencies
    const packageJsonPath = path.join(projectPath, "package.json");
    if (await fs.pathExists(packageJsonPath)) {
      const packageJson = await fs.readJSON(packageJsonPath);

      if (packageJson.workspaces) {
        if (options.verbose) {
          console.log(chalk.blue("📦 Installing workspace dependencies..."));
        }

        // For monorepos, pnpm install at root installs all workspace dependencies
        // No need to install in individual workspaces
      }
    }
  }

  private async fixWorkspaceVersionConflicts(
    projectPath: string,
    options: PackageInstallOptions,
    force: boolean = false
  ): Promise<void> {
    const packageJsonPath = path.join(projectPath, "package.json");
    if (!(await fs.pathExists(packageJsonPath))) return;

    const packageJson = await fs.readJSON(packageJsonPath);
    if (!packageJson.workspaces) return;

    // Handle both array and object workspace definitions
    const workspaces = Array.isArray(packageJson.workspaces)
      ? packageJson.workspaces
      : packageJson.workspaces.packages || [];

    for (const workspace of workspaces) {
      const workspacePaths = await this.expandGlob(projectPath, workspace);

      for (const workspacePath of workspacePaths) {
        const fullWorkspacePath = path.resolve(projectPath, workspacePath);
        const workspacePackageJson = path.join(
          fullWorkspacePath,
          "package.json"
        );

        if (await fs.pathExists(workspacePackageJson)) {
          if (options.verbose || force) {
            console.log(chalk.blue(`🔍 Checking workspace: ${workspacePath}`));
          }
          await this.fixVersionConflicts(fullWorkspacePath, options, force);
        }
      }
    }
  }

  private async expandGlob(
    basePath: string,
    pattern: string
  ): Promise<string[]> {
    // Simple glob expansion for common patterns like "apps/*", "packages/*"
    if (pattern.includes("*")) {
      const baseDir = pattern.replace("/*", "");
      const fullBaseDir = path.join(basePath, baseDir);

      try {
        const entries = await fs.readdir(fullBaseDir, { withFileTypes: true });
        return entries
          .filter((entry) => entry.isDirectory())
          .map((entry) => path.join(baseDir, entry.name));
      } catch {
        return [];
      }
    }

    return [pattern];
  }

  async installDependencies(
    projectPath: string,
    options: PackageInstallOptions = {}
  ): Promise<void> {
    const startTime = Date.now();

    // Get install args outside try block so they're available in catch
    const args = this.getInstallArgs(options);

    try {
      // Verify package.json exists
      const packageJsonPath = path.join(projectPath, "package.json");
      if (!(await fs.pathExists(packageJsonPath))) {
        throw new Error(`package.json not found in ${projectPath}`);
      }

      // Try to fix version conflicts before installing
      await this.fixVersionConflicts(projectPath, options);

      if (options.verbose) {
        console.log(
          chalk.blue(`📦 Running: ${this.packageManager} ${args.join(" ")}`)
        );
        console.log(chalk.blue(`📦 Working directory: ${projectPath}`));
      }

      await this.runCommand(this.getExecutableName(this.packageManager), args, {
        cwd: projectPath,
        stdio: options.verbose ? "inherit" : "pipe",
      });

      const duration = Date.now() - startTime;
      const durationText =
        duration > 1000 ? `${(duration / 1000).toFixed(1)}s` : `${duration}ms`;

      console.log(
        chalk.green(`✅ Dependencies installed successfully (${durationText})`)
      );
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(
        chalk.red(`❌ Failed to install dependencies after ${duration}ms`)
      );

      if (error instanceof Error) {
        console.error(chalk.red(`Error: ${error.message}`));

        // Always show stderr if available for debugging
        if ((error as any).stderr) {
          console.error(chalk.red(`STDERR: ${(error as any).stderr}`));
        }

        // Also show stdout which might contain useful info
        if ((error as any).stdout) {
          console.error(chalk.yellow(`STDOUT: ${(error as any).stdout}`));
        }

        // Check if it's a version conflict and try to resolve it
        const stdout = (error as any).stdout || "";
        const stderr = (error as any).stderr || "";
        const combinedOutput = stdout + stderr;

        if (
          combinedOutput.includes("No matching version found") ||
          combinedOutput.includes("ERR_PNPM_NO_MATCHING_VERSION")
        ) {
          console.log(
            chalk.yellow(
              "🔄 Detected version conflicts, attempting to resolve..."
            )
          );

          try {
            await this.fixVersionConflicts(projectPath, options, true);

            // Retry the installation
            console.log(
              chalk.blue("🔄 Retrying installation with resolved versions...")
            );
            await this.runCommand(
              this.getExecutableName(this.packageManager),
              args,
              {
                cwd: projectPath,
                stdio: options.verbose ? "inherit" : "pipe",
              }
            );

            const retryDuration = Date.now() - startTime;
            const retryDurationText =
              retryDuration > 1000
                ? `${(retryDuration / 1000).toFixed(1)}s`
                : `${retryDuration}ms`;

            console.log(
              chalk.green(
                `✅ Dependencies installed successfully after version resolution (${retryDurationText})`
              )
            );
            return; // Success on retry
          } catch (retryError) {
            console.error(chalk.red("❌ Failed to resolve version conflicts"));
          }
        }

        // Provide helpful suggestions
        await this.provideTroubleshootingSuggestions(projectPath);
      }

      throw error;
    }
  }

  private getInstallArgs(options: PackageInstallOptions): string[] {
    const args = ["install"];

    switch (this.packageManager) {
      case "pnpm":
        if (options.frozen) args.push("--frozen-lockfile");
        if (options.preferOffline) args.push("--prefer-offline");
        if (options.production) args.push("--prod");
        // Remove problematic reporter flags that can hide errors
        break;

      case "yarn":
        if (options.frozen) args.push("--frozen-lockfile");
        if (options.preferOffline) args.push("--prefer-offline");
        if (options.production) args.push("--production");
        break;

      case "npm":
        if (options.frozen) args.push("--ci");
        if (options.preferOffline) args.push("--prefer-offline");
        if (options.production) args.push("--only=production");
        break;
    }

    return args;
  }

  private async runCommand(
    command: string,
    args: string[],
    options: { cwd?: string; stdio?: "inherit" | "pipe"; silent?: boolean } = {}
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      // On Windows, use shell: true for package manager executables
      const useShell = process.platform === "win32";

      const child = spawn(command, args, {
        cwd: options.cwd || process.cwd(),
        stdio: options.stdio || "pipe",
        shell: useShell,
        // Set environment variables to help with Windows issues
        env: {
          ...process.env,
          // Ensure PATH includes common package manager locations
          PATH:
            process.env.PATH +
            (process.platform === "win32"
              ? ";C:\\npm\\bin;C:\\Users\\%USERNAME%\\AppData\\Roaming\\npm"
              : ""),
        },
      });

      let stdout = "";
      let stderr = "";

      if (child.stdout) {
        child.stdout.on("data", (data) => {
          stdout += data.toString();
        });
      }

      if (child.stderr) {
        child.stderr.on("data", (data) => {
          stderr += data.toString();
        });
      }

      child.on("close", (code) => {
        if (code === 0) {
          resolve(stdout);
        } else {
          const error = new Error(
            `Command failed with exit code ${code}: ${command} ${args.join(" ")}`
          );
          (error as any).stdout = stdout;
          (error as any).stderr = stderr;
          (error as any).code = code;
          reject(error);
        }
      });

      child.on("error", (error) => {
        // Add more context to spawn errors
        const enhancedError = new Error(
          `Failed to spawn command: ${command} ${args.join(" ")} - ${error.message}`
        );
        (enhancedError as any).originalError = error;
        reject(enhancedError);
      });
    });
  }

  private async provideTroubleshootingSuggestions(
    projectPath: string
  ): Promise<void> {
    console.log(chalk.yellow("\n💡 Troubleshooting suggestions:"));

    // Check if package.json exists and is valid
    try {
      const packageJsonPath = path.join(projectPath, "package.json");
      const packageJson = await fs.readJSON(packageJsonPath);
      console.log(chalk.green(`   ✓ package.json found and valid`));

      // Check for problematic dependencies
      const deps = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
      };
      const depCount = Object.keys(deps).length;
      console.log(chalk.blue(`   • Found ${depCount} dependencies to install`));
    } catch (error) {
      console.log(chalk.red(`   ✗ package.json issue: ${error}`));
    }

    // Test package manager availability
    try {
      const version = await this.runCommand(
        this.getExecutableName(this.packageManager),
        ["--version"],
        { silent: true }
      );
      console.log(
        chalk.green(
          `   ✓ ${this.packageManager} is available (v${version.trim()})`
        )
      );
    } catch {
      console.log(
        chalk.red(`   ✗ ${this.packageManager} is not available or not working`)
      );
    }

    if (this.packageManager === "pnpm") {
      console.log(
        chalk.yellow("   • Make sure pnpm is installed: npm install -g pnpm")
      );
      console.log(
        chalk.yellow("   • Try clearing pnpm cache: pnpm store prune")
      );
      console.log(chalk.yellow("   • Try pnpm install --no-frozen-lockfile"));
    } else if (this.packageManager === "npm") {
      console.log(
        chalk.yellow("   • Try clearing npm cache: npm cache clean --force")
      );
      console.log(
        chalk.yellow("   • Check your npm registry: npm config get registry")
      );
    } else if (this.packageManager === "yarn") {
      console.log(
        chalk.yellow("   • Try clearing yarn cache: yarn cache clean")
      );
    }

    console.log(chalk.yellow("   • Check your internet connection"));
    console.log(
      chalk.yellow(
        "   • Try running the command manually in the project directory"
      )
    );
    console.log(
      chalk.yellow(
        `   • Manual command: cd "${projectPath}" && ${this.packageManager} install`
      )
    );
    console.log();
  }

  async addDependency(
    projectPath: string,
    packageName: string,
    options: { dev?: boolean; exact?: boolean } = {}
  ): Promise<void> {
    const args = ["add", packageName];

    if (options.dev) {
      args.push(this.packageManager === "npm" ? "--save-dev" : "--dev");
    }
    if (options.exact) {
      args.push(this.packageManager === "npm" ? "--save-exact" : "--exact");
    }

    await this.runCommand(this.getExecutableName(this.packageManager), args, {
      cwd: projectPath,
    });
  }

  async removeDependency(
    projectPath: string,
    packageName: string
  ): Promise<void> {
    const args =
      this.packageManager === "yarn"
        ? ["remove", packageName]
        : ["uninstall", packageName];
    await this.runCommand(this.getExecutableName(this.packageManager), args, {
      cwd: projectPath,
    });
  }

  async getInstalledVersion(
    projectPath: string,
    packageName: string
  ): Promise<string | null> {
    try {
      const packageJsonPath = path.join(
        projectPath,
        "node_modules",
        packageName,
        "package.json"
      );
      if (await fs.pathExists(packageJsonPath)) {
        const packageJson = await fs.readJSON(packageJsonPath);
        return packageJson.version;
      }
      return null;
    } catch {
      return null;
    }
  }
}
