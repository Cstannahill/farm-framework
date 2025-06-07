// tools/testing/src/utils/cli-runner.ts
import { spawn } from "child_process";
import { join } from "path";

export interface CLIRunOptions {
  cwd?: string;
  timeout?: number;
  env?: Record<string, string>;
}

export interface CLIResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  success: boolean;
}

export async function runCLI(
  args: string[],
  cwd?: string,
  options: CLIRunOptions = {}
): Promise<CLIResult> {
  const { timeout = 60000, env = {} } = options;

  return new Promise((resolve, reject) => {
    const workingDir = cwd || options.cwd || process.cwd();

    // Find the CLI binary - adjust path as needed
    const cliBinary = join(__dirname, "../../../packages/cli/src/index.ts");

    console.log(`🧪 Running CLI: tsx ${cliBinary} ${args.join(" ")}`);
    console.log(`📁 Working directory: ${workingDir}`);

    const child = spawn("tsx", [cliBinary, ...args], {
      cwd: workingDir,
      env: { ...process.env, ...env },
      stdio: "pipe",
    });

    let stdout = "";
    let stderr = "";

    child.stdout?.on("data", (data) => {
      const output = data.toString();
      stdout += output;
      console.log(`CLI stdout: ${output.trim()}`);
    });

    child.stderr?.on("data", (data) => {
      const output = data.toString();
      stderr += output;
      console.error(`CLI stderr: ${output.trim()}`);
    });

    const timeoutId = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error(`CLI command timed out after ${timeout}ms`));
    }, timeout);

    child.on("close", (code) => {
      clearTimeout(timeoutId);

      const result: CLIResult = {
        exitCode: code || 0,
        stdout,
        stderr,
        success: (code || 0) === 0,
      };

      if (result.success) {
        console.log(`✅ CLI command completed successfully`);
        resolve(result);
      } else {
        console.error(`❌ CLI command failed with exit code ${code}`);
        resolve(result); // Don't reject, let the test handle the failure
      }
    });

    child.on("error", (error) => {
      clearTimeout(timeoutId);
      reject(new Error(`Failed to run CLI: ${error.message}`));
    });
  });
}

// Export the function to fix the "runCLI is not defined" errors
export { runCLI as default };

// tools/testing/src/utils/docker-helpers.ts
import { spawn } from "child_process";

export async function isDockerRunning(): Promise<boolean> {
  try {
    await runDockerCommand(["version"]);
    return true;
  } catch {
    return false;
  }
}

export async function runDockerCommand(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const process = spawn("docker", args, { stdio: "pipe" });

    let stdout = "";
    let stderr = "";

    process.stdout?.on("data", (data) => {
      stdout += data.toString();
    });

    process.stderr?.on("data", (data) => {
      stderr += data.toString();
    });

    process.on("close", (code) => {
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(new Error(`Docker command failed: ${stderr || stdout}`));
      }
    });

    process.on("error", (error) => {
      reject(new Error(`Failed to run docker command: ${error.message}`));
    });
  });
}

export async function dockerCompose(
  command: string,
  options: { cwd?: string } = {}
): Promise<string> {
  return new Promise((resolve, reject) => {
    const args = ["compose", ...command.split(" ")];
    const process = spawn("docker", args, {
      stdio: "pipe",
      cwd: options.cwd || process.cwd(),
    });

    let stdout = "";
    let stderr = "";

    process.stdout?.on("data", (data) => {
      stdout += data.toString();
    });

    process.stderr?.on("data", (data) => {
      stderr += data.toString();
    });

    process.on("close", (code) => {
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(new Error(`Docker compose command failed: ${stderr || stdout}`));
      }
    });

    process.on("error", (error) => {
      reject(new Error(`Failed to run docker compose: ${error.message}`));
    });
  });
}

// tools/testing/src/utils/temp-project.ts
import { join } from "path";
import { tmpdir } from "os";
import { mkdtemp, remove, pathExists } from "fs-extra";

export class TempProject {
  public readonly path: string;

  constructor(path: string) {
    this.path = path;
  }

  static async create(prefix: string = "farm-test-"): Promise<TempProject> {
    const tempPath = await mkdtemp(join(tmpdir(), prefix));
    return new TempProject(tempPath);
  }

  async cleanup(): Promise<void> {
    try {
      if (await pathExists(this.path)) {
        await remove(this.path);
      }
    } catch (error) {
      console.warn(`Failed to cleanup temp project ${this.path}:`, error);
    }
  }

  getPath(...segments: string[]): string {
    return join(this.path, ...segments);
  }

  async exists(...segments: string[]): Promise<boolean> {
    return pathExists(this.getPath(...segments));
  }
}

// tools/testing/src/utils/index.ts
export * from "./cli-runner.js";
export * from "./docker-helpers.js";
export * from "./temp-project.js";
