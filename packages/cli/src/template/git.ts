// src/template/git.ts
import { execSync } from "child_process";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { TemplateContext } from "./types.js";
import { getErrorMessage, isErrorInstance } from "../utils/error-utils.js";

export class GitInitializer {
  async initializeRepository(
    projectPath: string,
    context: TemplateContext
  ): Promise<void> {
    try {
      // Initialize git repository
      execSync("git init", { cwd: projectPath, stdio: "pipe" });

      // Create .gitignore if it doesn't exist
      await this.createGitignore(projectPath, context);

      // Create initial commit
      execSync("git add .", { cwd: projectPath, stdio: "pipe" });
      execSync('git commit -m "Initial commit from FARM framework"', {
        cwd: projectPath,
        stdio: "pipe",
      });

      // Create development branch
      execSync("git checkout -b develop", { cwd: projectPath, stdio: "pipe" });
      execSync("git checkout main", { cwd: projectPath, stdio: "pipe" });
    } catch (error) {
      throw new Error(`Git initialization failed: ${getErrorMessage(error)}`);
    }
  }

  private async createGitignore(
    projectPath: string,
    context: TemplateContext
  ): Promise<void> {
    const gitignoreContent = this.generateGitignoreContent(context);
    const gitignorePath = join(projectPath, ".gitignore");
    await writeFile(gitignorePath, gitignoreContent, "utf-8");
  }

  private generateGitignoreContent(context: TemplateContext): string {
    const sections = [
      "# Dependencies",
      "node_modules/",
      "__pycache__/",
      "*.pyc",
      ".Python",
      "build/",
      "develop-eggs/",
      "dist/",
      "downloads/",
      "eggs/",
      ".eggs/",
      "lib/",
      "lib64/",
      "parts/",
      "sdist/",
      "var/",
      "wheels/",
      "*.egg-info/",
      ".installed.cfg",
      "*.egg",
      "",
      "# Environment files",
      ".env",
      ".env.local",
      ".env.development.local",
      ".env.test.local",
      ".env.production.local",
      ".venv",
      "venv/",
      "ENV/",
      "env/",
      "",
      "# Build outputs",
      "dist/",
      "build/",
      ".next/",
      ".nuxt/",
      ".vuepress/dist",
      "",
      "# IDE files",
      ".vscode/",
      ".idea/",
      "*.swp",
      "*.swo",
      "*~",
      "",
      "# OS files",
      ".DS_Store",
      ".DS_Store?",
      "._*",
      ".Spotlight-V100",
      ".Trashes",
      "ehthumbs.db",
      "Thumbs.db",
      "",
      "# Logs",
      "logs/",
      "*.log",
      "npm-debug.log*",
      "yarn-debug.log*",
      "yarn-error.log*",
      "",
    ];

    // Add feature-specific ignores
    if (context.features.includes("ai")) {
      sections.push(
        "# AI/ML files",
        "models/*.bin",
        "models/*.safetensors",
        "*.onnx",
        "ollama-data/",
        ""
      );
    }

    if (context.docker) {
      sections.push("# Docker", ".dockerignore", "");
    }

    if (context.features.includes("storage")) {
      sections.push("# Uploads", "uploads/*", "!uploads/.gitkeep", "");
    }

    return sections.join("\n");
  }
}
