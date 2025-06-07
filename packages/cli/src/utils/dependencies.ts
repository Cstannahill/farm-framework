// packages/cli/src/utils/dependencies.ts
import path from "path";
import fs from "fs-extra";
import chalk from "chalk";
import { execAsync } from "./exec.js";

export class DependencyManager {
  async install(projectPath: string): Promise<void> {
    // Check if pnpm is available, fallback to npm
    const packageManager = await this.detectPackageManager();

    console.log(
      chalk.blue(`📦 Installing dependencies with ${packageManager}...`)
    );

    try {
      if (packageManager === "pnpm") {
        await this.installWithPnpm(projectPath);
      } else {
        await this.installWithNpm(projectPath);
      }
    } catch (error) {
      if (error instanceof Error) {
        // Log the error message
        console.error(chalk.red(`Error: ${error.message}`));
      } else if (error instanceof String) {
        console.error(chalk.red(`Failed to install dependencies: ${error}`));
      }
    }
  }

  private async detectPackageManager(): Promise<string> {
    try {
      await execAsync("pnpm", ["--version"]);
      return "pnpm";
    } catch {
      return "npm";
    }
  }

  private async installWithPnpm(projectPath: string): Promise<void> {
    // Create .npmrc for pnpm optimization
    const npmrcContent = `package-import-method=hardlink
prefer-offline=true
auto-install-peers=true
`;

    await fs.writeFile(path.join(projectPath, ".npmrc"), npmrcContent);

    // Install dependencies
    await execAsync("pnpm", ["install"], { cwd: projectPath });
  }

  private async installWithNpm(projectPath: string): Promise<void> {
    await execAsync("npm", ["install"], { cwd: projectPath });
  }
}
