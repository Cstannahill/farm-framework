/**
 * CI/CD integration utilities for type-sync
 * Provides GitHub Actions, pre-commit hooks, and automation helpers
 */

import fs from "fs-extra";
import path from "path";
import { execSync } from "child_process";
import type { TypeSyncConfig } from "../config/validation";

export interface CICDConfig {
  provider: "github" | "gitlab" | "azure" | "jenkins";
  autoCommit?: boolean;
  validateOnPR?: boolean;
  deployOnMain?: boolean;
  slackWebhook?: string;
  discordWebhook?: string;
}

export interface GitHubActionsConfig {
  name?: string;
  triggers?: string[];
  nodeVersion?: string;
  pythonVersion?: string;
  environment?: Record<string, string>;
  secrets?: string[];
  artifacts?: string[];
}

/**
 * GitHub Actions workflow generator
 */
export class GitHubActionsGenerator {
  private config: GitHubActionsConfig;
  private typeSyncConfig: TypeSyncConfig;

  constructor(config: GitHubActionsConfig, typeSyncConfig: TypeSyncConfig) {
    this.config = {
      name: "Type Sync",
      triggers: ["push", "pull_request", "schedule"],
      nodeVersion: "18",
      pythonVersion: "3.9",
      environment: {},
      secrets: ["FASTAPI_URL"],
      artifacts: ["generated-types"],
      ...config,
    };
    this.typeSyncConfig = typeSyncConfig;
  }

  /**
   * Generate GitHub Actions workflow file
   */
  generateWorkflow(): string {
    return `name: ${this.config.name}

on:
  ${this.generateTriggers()}

env:
  NODE_VERSION: '${this.config.nodeVersion}'
  PYTHON_VERSION: '${this.config.pythonVersion}'
  ${this.generateEnvironmentVariables()}

jobs:
  type-sync:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0
          token: \${{ secrets.GITHUB_TOKEN }}

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: \${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: \${{ env.PYTHON_VERSION }}

      - name: Install Node.js dependencies
        run: npm ci

      - name: Install Python dependencies
        run: |
          pip install -r requirements.txt
          pip install uvicorn[standard]

      - name: Start FastAPI server
        run: |
          uvicorn main:app --host 0.0.0.0 --port 8000 &
          echo "FASTAPI_PID=\$!" >> \$GITHUB_ENV
          sleep 10

      - name: Wait for server to be ready
        run: |
          timeout 30 sh -c 'until curl -f http://localhost:8000/health; do sleep 1; done'

      - name: Run type synchronization
        run: |
          npx type-sync sync --config type-sync.config.js
        env:
          FASTAPI_URL: http://localhost:8000

      - name: Validate generated types
        run: |
          npx type-sync validate
          npm run type-check

      - name: Check for changes
        id: changes
        run: |
          if [[ -n \$(git status --porcelain) ]]; then
            echo "changes=true" >> \$GITHUB_OUTPUT
            echo "Files changed:"
            git status --porcelain
          else
            echo "changes=false" >> \$GITHUB_OUTPUT
            echo "No changes detected"
          fi

      - name: Commit changes
        if: steps.changes.outputs.changes == 'true' && github.event_name != 'pull_request'
        run: |
          git config --local user.email "action@github.com"
          git config --local user.name "GitHub Action"
          git add .
          git commit -m "chore: update generated types [skip ci]"
          git push

      - name: Upload artifacts
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: \${{ join(fromJson('${JSON.stringify(this.config.artifacts)}'), '-') }}
          path: |
            ${this.typeSyncConfig.outputDir}/**
            .type-sync-cache/**
          retention-days: 7

      - name: Cleanup
        if: always()
        run: |
          if [[ -n "\$FASTAPI_PID" ]]; then
            kill \$FASTAPI_PID || true
          fi

  validate-pr:
    if: github.event_name == 'pull_request'
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: \${{ env.NODE_VERSION }}

      - name: Install dependencies
        run: npm ci

      - name: Validate configuration
        run: npx type-sync validate

      - name: Check types are up to date
        run: |
          npx type-sync sync --dry-run
          if [[ -n \$(git status --porcelain) ]]; then
            echo "❌ Generated types are out of date!"
            echo "Please run 'npm run type-sync' and commit the changes."
            exit 1
          else
            echo "✅ Generated types are up to date"
          fi

  ${this.generateNotificationJob()}
`;
  }

  /**
   * Generate triggers section
   */
  private generateTriggers(): string {
    const triggers = [];

    if (this.config.triggers!.includes("push")) {
      triggers.push(`  push:
    branches: [ main, master, develop ]
    paths:
      - '**/*.py'
      - 'type-sync.config.*'
      - '.github/workflows/type-sync.yml'`);
    }

    if (this.config.triggers!.includes("pull_request")) {
      triggers.push(`  pull_request:
    branches: [ main, master, develop ]
    paths:
      - '**/*.py'
      - 'type-sync.config.*'`);
    }

    if (this.config.triggers!.includes("schedule")) {
      triggers.push(`  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM UTC`);
    }

    return triggers.join("\n");
  }

  /**
   * Generate environment variables
   */
  private generateEnvironmentVariables(): string {
    return Object.entries(this.config.environment!)
      .map(([key, value]) => `  ${key}: '${value}'`)
      .join("\n");
  }

  /**
   * Generate notification job
   */
  private generateNotificationJob(): string {
    return `  notify:
    if: failure()
    runs-on: ubuntu-latest
    needs: [type-sync, validate-pr]
    
    steps:
      - name: Notify Slack
        if: env.SLACK_WEBHOOK_URL
        uses: 8398a7/action-slack@v3
        with:
          status: failure
          text: 'Type sync failed! 🚨'
        env:
          SLACK_WEBHOOK_URL: \${{ secrets.SLACK_WEBHOOK_URL }}

      - name: Notify Discord
        if: env.DISCORD_WEBHOOK_URL
        uses: sarisia/actions-status-discord@v1
        with:
          webhook: \${{ secrets.DISCORD_WEBHOOK_URL }}
          status: Failure
          title: 'Type Sync Failed'
          description: 'Check the workflow logs for details'`;
  }
}

/**
 * Pre-commit hook generator
 */
export class PreCommitHookGenerator {
  private typeSyncConfig: TypeSyncConfig;

  constructor(typeSyncConfig: TypeSyncConfig) {
    this.typeSyncConfig = typeSyncConfig;
  }

  /**
   * Generate pre-commit hook script
   */
  generatePreCommitHook(): string {
    return `#!/bin/sh
# Type-sync pre-commit hook
# Automatically sync types when Python files are committed

set -e

# Colors for output
RED='\\033[0;31m'
GREEN='\\033[0;32m'
YELLOW='\\033[1;33m'
NC='\\033[0m' # No Color

echo "🔄 Running type-sync pre-commit hook..."

# Check if Python files have been modified
PYTHON_FILES=\$(git diff --cached --name-only --diff-filter=ACM | grep '\\.py$' || true)

if [ -z "\$PYTHON_FILES" ]; then
  echo "\${GREEN}✅ No Python files modified, skipping type sync\${NC}"
  exit 0
fi

echo "\${YELLOW}📝 Python files modified:\${NC}"
echo "\$PYTHON_FILES"

# Check if FastAPI server is running
if ! curl -s http://localhost:8000/health > /dev/null 2>&1; then
  echo "\${RED}❌ FastAPI server is not running at http://localhost:8000\${NC}"
  echo "\${YELLOW}💡 Please start your FastAPI server before committing\${NC}"
  exit 1
fi

# Run type sync
echo "\${YELLOW}🔄 Synchronizing types...\${NC}"
if npx type-sync sync --config type-sync.config.js; then
  echo "\${GREEN}✅ Type sync completed successfully\${NC}"
else
  echo "\${RED}❌ Type sync failed\${NC}"
  exit 1
fi

# Check if any files were generated/modified
GENERATED_FILES=\$(git status --porcelain ${this.typeSyncConfig.outputDir} || true)

if [ -n "\$GENERATED_FILES" ]; then
  echo "\${YELLOW}📁 Generated files updated:\${NC}"
  git status --porcelain ${this.typeSyncConfig.outputDir}
  
  # Add generated files to commit
  git add ${this.typeSyncConfig.outputDir}
  echo "\${GREEN}✅ Generated files added to commit\${NC}"
fi

echo "\${GREEN}🎉 Pre-commit hook completed successfully\${NC}"
exit 0
`;
  }

  /**
   * Generate commit-msg hook for conventional commits
   */
  generateCommitMsgHook(): string {
    return `#!/bin/sh
# Type-sync commit message hook
# Adds type-sync information to commit messages

COMMIT_MSG_FILE=\$1

# Check if this is a type-sync generated commit
if grep -q "type-sync" "\$COMMIT_MSG_FILE"; then
  exit 0
fi

# Check if generated files are being committed
GENERATED_FILES=\$(git diff --cached --name-only | grep "${this.typeSyncConfig.outputDir}" || true)

if [ -n "\$GENERATED_FILES" ]; then
  # Count the number of generated files
  FILE_COUNT=\$(echo "\$GENERATED_FILES" | wc -l)
  
  # Append type-sync info to commit message
  echo "" >> "\$COMMIT_MSG_FILE"
  echo "Generated \$FILE_COUNT type files via type-sync" >> "\$COMMIT_MSG_FILE"
fi

exit 0
`;
  }
}

/**
 * Package.json scripts generator
 */
export class PackageScriptsGenerator {
  private typeSyncConfig: TypeSyncConfig;

  constructor(typeSyncConfig: TypeSyncConfig) {
    this.typeSyncConfig = typeSyncConfig;
  }

  /**
   * Generate package.json scripts
   */
  generateScripts(): Record<string, string> {
    return {
      "type-sync": "type-sync sync",
      "type-sync:watch": "type-sync watch",
      "type-sync:validate": "type-sync validate",
      "type-sync:clean": "type-sync clean",
      "type-sync:analyze": "type-sync analyze",
      precommit: "type-sync sync && git add " + this.typeSyncConfig.outputDir,
      postinstall:
        'type-sync validate || echo "Warning: type-sync validation failed"',
      "dev:with-types": 'concurrently "npm run dev" "npm run type-sync:watch"',
      "build:with-types": "npm run type-sync && npm run build",
      "test:types": "tsc --noEmit && type-sync validate",
    };
  }

  /**
   * Generate husky configuration
   */
  generateHuskyConfig(): Record<string, any> {
    return {
      hooks: {
        "pre-commit": "lint-staged && npm run type-sync",
        "commit-msg": "commitlint -E HUSKY_GIT_PARAMS",
        "post-merge": "npm run type-sync",
      },
    };
  }

  /**
   * Generate lint-staged configuration
   */
  generateLintStagedConfig(): Record<string, string[]> {
    return {
      "*.py": [
        "python -m black",
        "python -m isort",
        "python -m flake8",
        "npm run type-sync",
      ],
      [`${this.typeSyncConfig.outputDir}/**/*.ts`]: [
        "eslint --fix",
        "prettier --write",
      ],
    };
  }
}

/**
 * CI/CD integration manager
 */
export class CICDIntegrationManager {
  private config: CICDConfig;
  private typeSyncConfig: TypeSyncConfig;
  private projectRoot: string;

  constructor(
    config: CICDConfig,
    typeSyncConfig: TypeSyncConfig,
    projectRoot: string = process.cwd()
  ) {
    this.config = config;
    this.typeSyncConfig = typeSyncConfig;
    this.projectRoot = projectRoot;
  }

  /**
   * Setup complete CI/CD integration
   */
  async setupIntegration(): Promise<void> {
    console.log("🔧 Setting up CI/CD integration...");

    switch (this.config.provider) {
      case "github":
        await this.setupGitHubActions();
        break;
      case "gitlab":
        await this.setupGitLabCI();
        break;
      default:
        throw new Error(`Provider ${this.config.provider} not yet supported`);
    }

    await this.setupGitHooks();
    await this.setupPackageScripts();

    console.log("✅ CI/CD integration setup complete!");
  }

  /**
   * Setup GitHub Actions
   */
  private async setupGitHubActions(): Promise<void> {
    const workflowsDir = path.join(this.projectRoot, ".github", "workflows");
    await fs.ensureDir(workflowsDir);

    const generator = new GitHubActionsGenerator({}, this.typeSyncConfig);
    const workflow = generator.generateWorkflow();

    const workflowPath = path.join(workflowsDir, "type-sync.yml");
    await fs.writeFile(workflowPath, workflow);

    console.log("📄 Created GitHub Actions workflow");
  }

  /**
   * Setup GitLab CI (placeholder)
   */
  private async setupGitLabCI(): Promise<void> {
    const gitlabCIContent = this.generateGitLabCI();
    const ciPath = path.join(this.projectRoot, ".gitlab-ci.yml");

    if (await fs.pathExists(ciPath)) {
      // Merge with existing file
      const existing = await fs.readFile(ciPath, "utf8");
      const merged = this.mergeGitLabCI(existing, gitlabCIContent);
      await fs.writeFile(ciPath, merged);
    } else {
      await fs.writeFile(ciPath, gitlabCIContent);
    }

    console.log("📄 Created/updated GitLab CI configuration");
  }

  /**
   * Setup Git hooks
   */
  private async setupGitHooks(): Promise<void> {
    const hooksDir = path.join(this.projectRoot, ".git", "hooks");

    if (!(await fs.pathExists(hooksDir))) {
      console.warn("⚠️  Git hooks directory not found, skipping hook setup");
      return;
    }

    const hookGenerator = new PreCommitHookGenerator(this.typeSyncConfig);

    // Pre-commit hook
    const preCommitHook = hookGenerator.generatePreCommitHook();
    const preCommitPath = path.join(hooksDir, "pre-commit");
    await fs.writeFile(preCommitPath, preCommitHook);
    await fs.chmod(preCommitPath, "755");

    // Commit-msg hook
    const commitMsgHook = hookGenerator.generateCommitMsgHook();
    const commitMsgPath = path.join(hooksDir, "commit-msg");
    await fs.writeFile(commitMsgPath, commitMsgHook);
    await fs.chmod(commitMsgPath, "755");

    console.log("🪝 Set up Git hooks");
  }

  /**
   * Setup package.json scripts
   */
  private async setupPackageScripts(): Promise<void> {
    const packageJsonPath = path.join(this.projectRoot, "package.json");

    if (!(await fs.pathExists(packageJsonPath))) {
      console.warn("⚠️  package.json not found, skipping script setup");
      return;
    }

    const packageJson = await fs.readJson(packageJsonPath);
    const scriptsGenerator = new PackageScriptsGenerator(this.typeSyncConfig);

    packageJson.scripts = {
      ...packageJson.scripts,
      ...scriptsGenerator.generateScripts(),
    };

    // Add husky and lint-staged if they don't exist
    if (!packageJson.husky) {
      packageJson.husky = scriptsGenerator.generateHuskyConfig();
    }

    if (!packageJson["lint-staged"]) {
      packageJson["lint-staged"] = scriptsGenerator.generateLintStagedConfig();
    }

    await fs.writeJson(packageJsonPath, packageJson, { spaces: 2 });
    console.log("📦 Updated package.json scripts");
  }

  /**
   * Generate GitLab CI configuration
   */
  private generateGitLabCI(): string {
    return `# Type-sync GitLab CI configuration
variables:
  NODE_VERSION: "18"
  PYTHON_VERSION: "3.9"

stages:
  - setup
  - sync
  - validate
  - deploy

.node_template: &node_template
  image: node:\${NODE_VERSION}
  cache:
    paths:
      - node_modules/
      - .npm/

.python_template: &python_template
  image: python:\${PYTHON_VERSION}
  cache:
    paths:
      - .pip-cache/

setup:
  <<: *node_template
  stage: setup
  script:
    - npm ci
  artifacts:
    paths:
      - node_modules/
    expire_in: 1 hour

type_sync:
  <<: *node_template
  stage: sync
  dependencies:
    - setup
  services:
    - name: python:\${PYTHON_VERSION}
      alias: fastapi
      command: ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
  script:
    - sleep 10  # Wait for FastAPI to start
    - npx type-sync sync
  artifacts:
    paths:
      - ${this.typeSyncConfig.outputDir}/
    expire_in: 1 day
  only:
    changes:
      - "**/*.py"
      - "type-sync.config.*"

validate:
  <<: *node_template
  stage: validate
  dependencies:
    - type_sync
  script:
    - npx type-sync validate
    - npm run type-check
  only:
    - merge_requests
`;
  }

  /**
   * Merge GitLab CI configurations
   */
  private mergeGitLabCI(existing: string, newConfig: string): string {
    // Simple merge - in practice, you'd want YAML parsing
    return existing + "\n\n# Type-sync configuration\n" + newConfig;
  }
}

export default CICDIntegrationManager;
