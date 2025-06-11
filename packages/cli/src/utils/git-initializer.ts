// packages/cli/src/utils/git-initializer.ts
import { spawn } from "child_process";
import fs from "fs-extra";
import path from "path";
import chalk from "chalk";

export interface GitInitOptions {
  verbose?: boolean;
  initialBranch?: string;
  addOrigin?: string;
  makeInitialCommit?: boolean;
}

export class GitInitializer {
  async initialize(
    projectPath: string,
    options: GitInitOptions = {}
  ): Promise<void> {
    try {
      // Check if git is available
      await this.checkGitAvailable();

      // Check if already a git repository
      if (await this.isGitRepository(projectPath)) {
        if (options.verbose) {
          console.log(
            chalk.yellow(
              "⚠️ Git repository already exists, skipping initialization"
            )
          );
        }
        return;
      }

      // Initialize git repository
      await this.initRepository(projectPath, options);

      // Add initial files
      if (options.makeInitialCommit !== false) {
        await this.makeInitialCommit(projectPath, options);
      }

      // Add remote origin if provided
      if (options.addOrigin) {
        await this.addRemoteOrigin(projectPath, options.addOrigin, options);
      }

      // Success message is now handled in makeInitialCommit method for better information
    } catch (error) {
      if (error instanceof Error) {
        console.error(
          chalk.red(`❌ Failed to initialize git repository: ${error.message}`)
        );

        // Provide helpful suggestions
        this.provideTroubleshootingSuggestions(error);
      }
      throw error;
    }
  }

  private async checkGitAvailable(): Promise<void> {
    try {
      await this.runGitCommand(["--version"], { silent: true });
    } catch (error) {
      throw new Error(
        "Git is not installed or not available in PATH. Please install Git first."
      );
    }
  }

  private async isGitRepository(projectPath: string): Promise<boolean> {
    const gitDir = path.join(projectPath, ".git");
    return await fs.pathExists(gitDir);
  }
  private async initRepository(
    projectPath: string,
    options: GitInitOptions
  ): Promise<void> {
    const args = ["init"];

    // Set initial branch name if specified
    if (options.initialBranch) {
      args.push("--initial-branch", options.initialBranch);
    } else {
      // Use 'main' as default branch name
      args.push("--initial-branch", "main");
    }

    if (options.verbose) {
      console.log(chalk.blue(`🔧 Running: git ${args.join(" ")}`));
    }

    // Run git init silently for cleaner output
    await this.runGitCommand(args, {
      cwd: projectPath,
      silent: true, // Always run silently for cleaner UX
    });

    if (options.verbose) {
      console.log(chalk.green("✅ Git repository initialized"));
    }
  }
  private async makeInitialCommit(
    projectPath: string,
    options: GitInitOptions
  ): Promise<void> {
    try {
      // Configure git user if not already configured (locally for this repo)
      await this.configureGitUser(projectPath, options);

      // Add all files (silently)
      await this.runGitCommand(["add", "."], {
        cwd: projectPath,
        silent: true,
      });

      if (options.verbose) {
        console.log(chalk.blue("📁 Added all files to git staging"));
      }

      // Make initial commit (silently)
      const commitOutput = await this.runGitCommand(
        ["commit", "-m", "Initial commit - FARM project created"],
        { cwd: projectPath, silent: true }
      );

      // Parse the commit output to get file count
      const fileCountMatch = commitOutput.match(/(\d+) files? changed/);
      const fileCount = fileCountMatch ? parseInt(fileCountMatch[1]) : 0;

      // Display clean success message
      if (fileCount > 0) {
        console.log(
          chalk.green(
            `✅ Git initialization successful - ${fileCount} files added and committed`
          )
        );
      } else {
        console.log(chalk.green("✅ Git repository initialized successfully"));
      }
    } catch (error) {
      if (options.verbose) {
        console.warn(
          chalk.yellow(
            "⚠️ Could not create initial commit - this is usually not a problem"
          )
        );
      }
      // Don't throw error for commit failures, as they're not critical
    }
  }

  private async configureGitUser(
    projectPath: string,
    options: GitInitOptions
  ): Promise<void> {
    try {
      // Check if user.name is configured globally
      try {
        await this.runGitCommand(["config", "user.name"], { silent: true });
      } catch {
        // Set a default local user name for this repository
        await this.runGitCommand(["config", "user.name", "FARM Developer"], {
          cwd: projectPath,
        });
      }

      // Check if user.email is configured globally
      try {
        await this.runGitCommand(["config", "user.email"], { silent: true });
      } catch {
        // Set a default local email for this repository
        await this.runGitCommand(
          ["config", "user.email", "developer@farm-project.local"],
          { cwd: projectPath }
        );
      }
    } catch (error) {
      if (options.verbose) {
        console.warn(
          chalk.yellow("⚠️ Could not configure git user, using git defaults")
        );
      }
    }
  }

  private async addRemoteOrigin(
    projectPath: string,
    originUrl: string,
    options: GitInitOptions
  ): Promise<void> {
    try {
      await this.runGitCommand(["remote", "add", "origin", originUrl], {
        cwd: projectPath,
      });

      if (options.verbose) {
        console.log(chalk.green(`✅ Added remote origin: ${originUrl}`));
      }
    } catch (error) {
      console.warn(
        chalk.yellow(`⚠️ Could not add remote origin: ${originUrl}`)
      );
      if (options.verbose && error instanceof Error) {
        console.warn(chalk.gray(`   ${error.message}`));
      }
    }
  }
  private async runGitCommand(
    args: string[],
    options: { cwd?: string; silent?: boolean } = {}
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      // Use shell: false to avoid shell argument parsing issues
      // This prevents commit messages with spaces from being split
      const child = spawn("git", args, {
        cwd: options.cwd || process.cwd(),
        stdio: options.silent ? "pipe" : "inherit",
        shell: false, // Use direct execution instead of shell
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
          resolve(stdout.trim());
        } else {
          const error = new Error(
            `Git command failed with exit code ${code}: git ${args.join(" ")}`
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

  private provideTroubleshootingSuggestions(error: Error): void {
    console.log(chalk.yellow("\n💡 Git troubleshooting suggestions:"));

    if (error.message.includes("not installed")) {
      console.log(chalk.yellow("   • Install Git from https://git-scm.com/"));
      console.log(chalk.yellow("   • Make sure git is in your PATH"));
    } else if (
      error.message.includes("user.name") ||
      error.message.includes("user.email")
    ) {
      console.log(
        chalk.yellow(
          '   • Configure git user: git config --global user.name "Your Name"'
        )
      );
      console.log(
        chalk.yellow(
          '   • Configure git email: git config --global user.email "your.email@example.com"'
        )
      );
    } else if (error.message.includes("remote")) {
      console.log(chalk.yellow("   • Check that the remote URL is correct"));
      console.log(
        chalk.yellow("   • Ensure you have access to the remote repository")
      );
    } else {
      console.log(chalk.yellow("   • Try running the git command manually"));
      console.log(chalk.yellow("   • Check git status: git status"));
    }

    console.log();
  }

  async getGitStatus(
    projectPath: string
  ): Promise<{ isGitRepo: boolean; hasChanges: boolean; branch?: string }> {
    try {
      if (!(await this.isGitRepository(projectPath))) {
        return { isGitRepo: false, hasChanges: false };
      }

      // Get current branch
      let branch: string | undefined;
      try {
        branch = await this.runGitCommand(["branch", "--show-current"], {
          cwd: projectPath,
          silent: true,
        });
      } catch {
        // Might be in detached HEAD state or no commits yet
        branch = undefined;
      }

      // Check for changes
      let hasChanges = false;
      try {
        const status = await this.runGitCommand(["status", "--porcelain"], {
          cwd: projectPath,
          silent: true,
        });
        hasChanges = status.trim().length > 0;
      } catch {
        hasChanges = false;
      }

      return {
        isGitRepo: true,
        hasChanges,
        branch: branch || undefined,
      };
    } catch {
      return { isGitRepo: false, hasChanges: false };
    }
  }

  async addAndCommit(
    projectPath: string,
    message: string,
    options: { addAll?: boolean } = {}
  ): Promise<void> {
    if (options.addAll) {
      await this.runGitCommand(["add", "."], { cwd: projectPath });
    }

    await this.runGitCommand(["commit", "-m", message], { cwd: projectPath });
  }

  async createGitignore(
    projectPath: string,
    template: "node" | "python" | "farm" = "farm"
  ): Promise<void> {
    const gitignorePath = path.join(projectPath, ".gitignore");

    let content = "";

    switch (template) {
      case "node":
        content = this.getNodeGitignore();
        break;
      case "python":
        content = this.getPythonGitignore();
        break;
      case "farm":
      default:
        content = this.getFarmGitignore();
        break;
    }

    await fs.writeFile(gitignorePath, content);
  }

  private getNodeGitignore(): string {
    return `# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Build outputs
dist/
build/
.next/

# Environment
.env
.env.local
.env.production

# IDE
.vscode/
.idea/

# OS
.DS_Store
Thumbs.db
`;
  }

  private getPythonGitignore(): string {
    return `# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
env/
venv/
.venv/

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db
`;
  }

  private getFarmGitignore(): string {
    return `# Dependencies
node_modules/
__pycache__/
*.py[cod]
*$py.class

# Build outputs
dist/
build/
.next/

# Environment files
.env
.env.local
.env.production
.env.staging

# Database
*.db
*.sqlite
*.db-journal

# Logs
*.log
logs/

# IDE files
.vscode/
.idea/
*.swp
*.swo

# OS files
.DS_Store
Thumbs.db

# FARM specific
.farm/
.farm-cache/

# Python virtual environments
venv/
.venv/
env/
.env/

# Coverage reports
coverage/
.coverage
.nyc_output

# Temporary files
*.tmp
*.temp
.cache/

# AI model files (if storing locally)
*.bin
*.safetensors
models/
!models/.gitkeep
`;
  }
}
