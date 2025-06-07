// packages/cli/src/utils/exec.ts
import { spawn } from "child_process";

export interface ExecOptions {
  cwd?: string;
  env?: Record<string, string>;
  timeout?: number;
}

export function execAsync(
  command: string,
  args: string[] = [],
  options: ExecOptions = {}
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd || process.cwd(),
      env: { ...process.env, ...options.env },
      stdio: "pipe",
    });

    let stdout = "";
    let stderr = "";

    child.stdout?.on("data", (data) => {
      stdout += data.toString();
    });

    child.stderr?.on("data", (data) => {
      stderr += data.toString();
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(new Error(`Command failed with code ${code}: ${stderr}`));
      }
    });

    child.on("error", reject);

    if (options.timeout) {
      setTimeout(() => {
        child.kill();
        reject(new Error(`Command timed out after ${options.timeout}ms`));
      }, options.timeout);
    }
  });
}
