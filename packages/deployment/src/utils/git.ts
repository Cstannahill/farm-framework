import { execSync } from "child_process";
import * as path from "path";

/**
 * Git information utility for deployment context
 */
export class GitInfo {
  private workingDir: string;

  constructor(workingDir: string = process.cwd()) {
    this.workingDir = workingDir;
  }

  /**
   * Get current git branch
   */
  async getBranch(): Promise<string> {
    try {
      const result = execSync("git rev-parse --abbrev-ref HEAD", {
        cwd: this.workingDir,
        encoding: "utf-8",
      });
      return result.trim();
    } catch {
      return "main";
    }
  }

  /**
   * Get current git commit hash
   */
  async getCommit(): Promise<string> {
    try {
      const result = execSync("git rev-parse HEAD", {
        cwd: this.workingDir,
        encoding: "utf-8",
      });
      return result.trim();
    } catch {
      return "unknown";
    }
  }

  /**
   * Get short commit hash
   */
  async getShortCommit(): Promise<string> {
    try {
      const result = execSync("git rev-parse --short HEAD", {
        cwd: this.workingDir,
        encoding: "utf-8",
      });
      return result.trim();
    } catch {
      return "unknown";
    }
  }

  /**
   * Get list of contributors
   */
  async getContributors(): Promise<string[]> {
    try {
      const result = execSync('git log --format="%an" | sort -u', {
        cwd: this.workingDir,
        encoding: "utf-8",
      });
      return result.trim().split("\n").filter(Boolean);
    } catch {
      return [];
    }
  }

  /**
   * Check if working directory is clean
   */
  async isClean(): Promise<boolean> {
    try {
      const result = execSync("git status --porcelain", {
        cwd: this.workingDir,
        encoding: "utf-8",
      });
      return result.trim().length === 0;
    } catch {
      return false;
    }
  }

  /**
   * Get remote URL
   */
  async getRemoteUrl(): Promise<string | null> {
    try {
      const result = execSync("git config --get remote.origin.url", {
        cwd: this.workingDir,
        encoding: "utf-8",
      });
      return result.trim();
    } catch {
      return null;
    }
  }

  /**
   * Check if directory is a git repository
   */
  async isGitRepository(): Promise<boolean> {
    try {
      execSync("git rev-parse --git-dir", {
        cwd: this.workingDir,
        stdio: "ignore",
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get last commit message
   */
  async getLastCommitMessage(): Promise<string> {
    try {
      const result = execSync('git log -1 --pretty=format:"%s"', {
        cwd: this.workingDir,
        encoding: "utf-8",
      });
      return result.trim();
    } catch {
      return "No commit message";
    }
  }

  /**
   * Get commit count
   */
  async getCommitCount(): Promise<number> {
    try {
      const result = execSync("git rev-list --count HEAD", {
        cwd: this.workingDir,
        encoding: "utf-8",
      });
      return parseInt(result.trim(), 10);
    } catch {
      return 0;
    }
  }
}
