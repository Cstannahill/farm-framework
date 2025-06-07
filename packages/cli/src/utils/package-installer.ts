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

  async detectPackageManager(): Promise<"pnpm" | "npm" | "yarn"> {
    try {
      // Check if pnpm is available
      await this.runCommand("pnpm", ["--version"], { silent: true });
      return "pnpm";
    } catch {
      try {
        // Check if yarn is available
        await this.runCommand("yarn", ["--version"], { silent: true });
        return "yarn";
      } catch {
        // Fall back to npm
        return "npm";
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

  async installDependencies(
    projectPath: string,
    options: PackageInstallOptions = {}
  ): Promise<void> {
    const startTime = Date.now();

    try {
      const args = this.getInstallArgs(options);

      if (options.verbose) {
        console.log(
          chalk.blue(`📦 Running: ${this.packageManager} ${args.join(" ")}`)
        );
      }

      await this.runCommand(this.packageManager, args, {
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

        // Provide helpful suggestions
        this.provideTroubleshootingSuggestions();
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
        // Add performance optimizations
        args.push("--reporter=silent");
        break;

      case "yarn":
        if (options.frozen) args.push("--frozen-lockfile");
        if (options.preferOffline) args.push("--prefer-offline");
        if (options.production) args.push("--production");
        if (!options.verbose) args.push("--silent");
        break;

      case "npm":
        if (options.frozen) args.push("--ci");
        if (options.preferOffline) args.push("--prefer-offline");
        if (options.production) args.push("--only=production");
        if (!options.verbose) args.push("--silent");
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
      const child = spawn(command, args, {
        cwd: options.cwd || process.cwd(),
        stdio: options.stdio || "pipe",
        shell: true, // Important for Windows compatibility
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
          reject(error);
        }
      });

      child.on("error", (error) => {
        reject(error);
      });
    });
  }

  private provideTroubleshootingSuggestions(): void {
    console.log(chalk.yellow("\n💡 Troubleshooting suggestions:"));

    if (this.packageManager === "pnpm") {
      console.log(
        chalk.yellow("   • Make sure pnpm is installed: npm install -g pnpm")
      );
      console.log(
        chalk.yellow("   • Try clearing pnpm cache: pnpm store prune")
      );
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

    await this.runCommand(this.packageManager, args, { cwd: projectPath });
  }

  async removeDependency(
    projectPath: string,
    packageName: string
  ): Promise<void> {
    const args =
      this.packageManager === "yarn"
        ? ["remove", packageName]
        : ["uninstall", packageName];
    await this.runCommand(this.packageManager, args, { cwd: projectPath });
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
