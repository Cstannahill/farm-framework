/**
 * Execution utilities for running shell commands
 */

import { spawn } from 'child_process';
import { promisify } from 'util';

export interface ExecOptions {
  cwd?: string;
  env?: Record<string, string>;
  timeout?: number;
}

export interface ExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export async function execAsync(
  command: string,
  options: ExecOptions = {}
): Promise<ExecResult> {
  return new Promise((resolve, reject) => {
    const [cmd, ...args] = command.split(' ');
    
    const child = spawn(cmd, args, {
      cwd: options.cwd || process.cwd(),
      env: { ...process.env, ...options.env },
      stdio: 'pipe'
    });

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    // Handle timeout
    let timeoutId: NodeJS.Timeout | undefined;
    if (options.timeout) {
      timeoutId = setTimeout(() => {
        child.kill('SIGTERM');
        reject(new Error(`Command timed out after ${options.timeout}ms: ${command}`));
      }, options.timeout);
    }

    child.on('close', (code) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      resolve({
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        exitCode: code || 0
      });
    });

    child.on('error', (error) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      reject(new Error(`Failed to execute command: ${command}\n${error.message}`));
    });
  });
}

export async function execWithOutput(
  command: string,
  options: ExecOptions = {}
): Promise<void> {
  return new Promise((resolve, reject) => {
    const [cmd, ...args] = command.split(' ');
    
    const child = spawn(cmd, args, {
      cwd: options.cwd || process.cwd(),
      env: { ...process.env, ...options.env },
      stdio: 'inherit' // Show output in real-time
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with exit code ${code}: ${command}`));
      }
    });

    child.on('error', (error) => {
      reject(new Error(`Failed to execute command: ${command}\n${error.message}`));
    });
  });
}