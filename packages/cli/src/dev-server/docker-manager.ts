// tools/dev-server/src/docker-manager.ts
import { spawn, ChildProcess } from "child_process";
import { EventEmitter } from "events";
// Local error wrapper to avoid circular dependency with CLI
const wrapError = (error: unknown): Error => {
  if (error instanceof Error) return error;
  if (typeof error === 'string') return new Error(error);
  return new Error(String(error));
};
export interface DockerOptions {
  gpu?: boolean;
  volumes?: string[];
  ports?: string[];
  environment?: Record<string, string>;
}

export class DockerManager extends EventEmitter {
  private containers = new Map<string, ChildProcess>();

  /**
   * Check if a port is in use and return the process using it
   */
  async checkPortInUse(port: number): Promise<{ inUse: boolean; process?: string }> {
    try {
      // Check if port is bound by Docker containers
      const dockerContainers = await this.getContainersUsingPort(port);
      if (dockerContainers.length > 0) {
        return { inUse: true, process: `Docker container(s): ${dockerContainers.join(', ')}` };
      }

      // Check if port is bound by system processes
      const systemProcess = await this.getSystemProcessUsingPort(port);
      if (systemProcess) {
        return { inUse: true, process: `System process: ${systemProcess}` };
      }

      return { inUse: false };
    } catch (error) {
      console.warn(`⚠️ Failed to check port ${port}:`, wrapError(error));
      return { inUse: false };
    }
  }

  /**
   * Get Docker containers using a specific port
   */
  private async getContainersUsingPort(port: number): Promise<string[]> {
    try {
      const stdout = await this.runDockerCommand([
        "ps",
        "--format",
        "{{.Names}} {{.Ports}}",
        "--filter",
        "status=running"
      ]);

      const containers: string[] = [];
      const lines = stdout.trim().split('\n');

      for (const line of lines) {
        if (line.includes(`:${port}->`) || line.includes(`:${port}/`)) {
          const containerName = line.split(' ')[0];
          if (containerName) {
            containers.push(containerName);
          }
        }
      }

      return containers;
    } catch {
      return [];
    }
  }

  /**
   * Get system process using a specific port (Windows/Linux/macOS)
   */
  private async getSystemProcessUsingPort(port: number): Promise<string | null> {
    try {
      const { spawn } = await import("child_process");
      const { platform } = await import("os");

      let command: string;
      let args: string[];

      if (platform() === "win32") {
        command = "netstat";
        args = ["-ano"];
      } else {
        command = "lsof";
        args = ["-i", `:${port}`];
      }

      return new Promise((resolve) => {
        const process = spawn(command, args, { stdio: "pipe" });
        let stdout = "";

        process.stdout?.on("data", (data) => {
          stdout += data.toString();
        });

        process.on("close", (code) => {
          if (code === 0) {
            if (platform() === "win32") {
              // Parse Windows netstat output
              const lines = stdout.split('\n');
              for (const line of lines) {
                if (line.includes(`:${port} `) && line.includes('LISTENING')) {
                  const parts = line.trim().split(/\s+/);
                  const pid = parts[parts.length - 1];
                  if (pid && pid !== '0') {
                    resolve(`PID ${pid}`);
                    return;
                  }
                }
              }
            } else {
              // Parse Unix lsof output
              const lines = stdout.split('\n');
              for (const line of lines) {
                if (line.includes(`:${port}`)) {
                  const parts = line.trim().split(/\s+/);
                  const processName = parts[0];
                  const pid = parts[1];
                  if (processName && pid) {
                    resolve(`${processName} (PID ${pid})`);
                    return;
                  }
                }
              }
            }
          }
          resolve(null);
        });

        process.on("error", () => resolve(null));
      });
    } catch {
      return null;
    }
  }

  /**
   * Stop containers that are using conflicting ports
   */
  async resolvePortConflicts(ports: number[]): Promise<void> {
    console.log("🔍 Checking for port conflicts...");

    for (const port of ports) {
      const portCheck = await this.checkPortInUse(port);
      if (portCheck.inUse) {
        console.log(`⚠️ Port ${port} is in use by: ${portCheck.process}`);

        // If it's a Docker container, try to stop it
        if (portCheck.process?.includes('Docker container')) {
          const containerNames = portCheck.process
            .replace('Docker container(s): ', '')
            .split(', ')
            .map(name => name.trim());

          for (const containerName of containerNames) {
            try {
              console.log(`🛑 Stopping conflicting container: ${containerName}`);
              await this.runDockerCommand(["stop", containerName]);
              console.log(`✅ Stopped container: ${containerName}`);
            } catch (error) {
              console.warn(`⚠️ Failed to stop container ${containerName}:`, wrapError(error));
            }
          }
        } else {
          console.log(`💡 Please manually stop the process using port ${port}: ${portCheck.process}`);
        }
      }
    }
  }

  async startOllama(options: DockerOptions = {}): Promise<void> {
    const {
      gpu = false,
      volumes = [],
      ports = ["11434:11434"],
      environment = {},
    } = options;

    console.log("🐳 Starting Ollama container...");

    // Check if Docker is available first
    if (!(await this.isDockerAvailable())) {
      throw new Error("Docker is not available or not running");
    }

    // Resolve port conflicts before starting
    const portNumbers = ports.map(p => parseInt(p.split(':')[0]));
    await this.resolvePortConflicts(portNumbers);

    const args = [
      "run",
      "--rm",
      "--name",
      "farm-ollama",
      "-d",
      ...ports.map((p) => ["-p", p]).flat(),
      ...volumes.map((v) => ["-v", v]).flat(),
      ...Object.entries(environment)
        .map(([k, v]) => ["-e", `${k}=${v}`])
        .flat(),
    ];

    if (gpu) {
      args.push("--gpus", "all");
    }

    args.push("ollama/ollama:latest");

    try {
      await this.runDockerCommand(args);
      console.log("✅ Ollama container started");

      // Wait for container to be ready (with shorter timeout for tests)
      await this.waitForContainer("farm-ollama", 10000);

      // Pull initial models if specified
      const models = options.environment?.OLLAMA_MODELS?.split(",") || [
        "llama3.1",
      ];
      if (models.length > 0 && models[0] !== "") {
        await this.pullOllamaModels(models);
      }
    } catch (error) {
      throw new Error(`Failed to start Ollama container: ${wrapError(error)}`);
    }
  }

  async pullOllamaModels(models: string[]): Promise<void> {
    console.log("📥 Pulling Ollama models...");

    for (const model of models) {
      console.log(`📥 Pulling Ollama model: ${model}`);
      try {
        await this.execInContainer("farm-ollama", ["ollama", "pull", model]);
      } catch (error) {
        console.warn(`⚠️ Failed to pull model ${model}:`, wrapError(error));
        // Don't fail the entire operation if one model fails
      }
    }
  }

  async execInContainer(
    containerName: string,
    command: string[]
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const args = ["exec", containerName, ...command];
      const process = spawn("docker", args, { stdio: "pipe" });

      let stdout = "";
      let stderr = "";

      // Set a timeout for the exec command
      const timeout = setTimeout(() => {
        process.kill("SIGTERM");
        reject(new Error(`Command timed out: ${command.join(" ")}`));
      }, 30000); // 30 second timeout

      process.stdout?.on("data", (data) => {
        stdout += data.toString();
      });

      process.stderr?.on("data", (data) => {
        stderr += data.toString();
      });

      process.on("close", (code) => {
        clearTimeout(timeout);
        if (code === 0) {
          resolve(stdout);
        } else {
          reject(new Error(`Command failed with exit code ${code}: ${stderr}`));
        }
      });

      process.on("error", (error) => {
        clearTimeout(timeout);
        reject(new Error(`Failed to execute command: ${error.message}`));
      });
    });
  }

  async isDockerAvailable(): Promise<boolean> {
    try {
      await this.runDockerCommand(["version"], 5000); // 5 second timeout
      return true;
    } catch {
      return false;
    }
  }

  async stopOllama(): Promise<void> {
    try {
      await this.runDockerCommand(["stop", "farm-ollama"]);
      console.log("✅ Ollama container stopped");
    } catch (error) {
      console.warn("⚠️ Failed to stop Ollama container:", wrapError(error));
    }
  }

  async startMongoDB(options: DockerOptions = {}): Promise<void> {
    const {
      volumes = ["mongodb_data:/data/db"],
      ports = ["27017:27017"],
      environment = {},
    } = options;

    console.log("🐳 Starting MongoDB container...");

    // Resolve port conflicts before starting
    const portNumbers = ports.map(p => parseInt(p.split(':')[0]));
    await this.resolvePortConflicts(portNumbers);

    const args = [
      "run",
      "--rm",
      "--name",
      "farm-mongodb",
      "-d",
      ...ports.map((p) => ["-p", p]).flat(),
      ...volumes.map((v) => ["-v", v]).flat(),
      ...Object.entries(environment)
        .map(([k, v]) => ["-e", `${k}=${v}`])
        .flat(),
      "mongo:7",
    ];

    try {
      await this.runDockerCommand(args);
      await this.waitForContainer("farm-mongodb");
      console.log("✅ MongoDB container started");
    } catch (error) {
      throw new Error(`Failed to start MongoDB container: ${wrapError(error)}`);
    }
  }

  async stopMongoDB(): Promise<void> {
    try {
      await this.runDockerCommand(["stop", "farm-mongodb"]);
      console.log("✅ MongoDB container stopped");
    } catch (error) {
      console.warn("⚠️ Failed to stop MongoDB container:", wrapError(error));
    }
  }

  async isContainerRunning(containerName: string): Promise<boolean> {
    try {
      const stdout = await this.runDockerCommand([
        "ps",
        "--filter",
        `name=${containerName}`,
        "--format",
        "{{.Names}}",
      ]);
      return stdout.trim() === containerName;
    } catch {
      return false;
    }
  }

  async getContainerLogs(
    containerName: string,
    lines: number = 50
  ): Promise<string> {
    try {
      return await this.runDockerCommand([
        "logs",
        "--tail",
        lines.toString(),
        containerName,
      ]);
    } catch (error) {
      throw new Error(
        `Failed to get logs for ${containerName}: ${wrapError(error)}`
      );
    }
  }

  async cleanupAll(): Promise<void> {
    const containers = ["farm-ollama", "farm-mongodb"];

    for (const container of containers) {
      try {
        if (await this.isContainerRunning(container)) {
          await this.runDockerCommand(["stop", container]);
        }
      } catch (error) {
        console.warn(`⚠️ Failed to stop ${container}:`, wrapError(error));
      }
    }

    console.log("✅ All containers cleaned up");
  }

  private async runDockerCommand(
    args: string[],
    timeoutMs: number = 30000
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const process = spawn("docker", args, { stdio: "pipe" });

      let stdout = "";
      let stderr = "";

      // Set up timeout
      const timeout = setTimeout(() => {
        process.kill("SIGTERM");
        reject(
          new Error(
            `Docker command timed out after ${timeoutMs}ms: docker ${args.join(
              " "
            )}`
          )
        );
      }, timeoutMs);

      process.stdout?.on("data", (data) => {
        stdout += data.toString();
      });

      process.stderr?.on("data", (data) => {
        stderr += data.toString();
      });

      process.on("close", (code) => {
        clearTimeout(timeout);
        if (code === 0) {
          resolve(stdout);
        } else {
          reject(new Error(`Docker command failed: ${stderr || stdout}`));
        }
      });

      process.on("error", (error) => {
        clearTimeout(timeout);
        reject(new Error(`Failed to run docker command: ${error.message}`));
      });
    });
  }

  private async waitForContainer(
    containerName: string,
    timeout: number = 10000
  ): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      try {
        if (await this.isContainerRunning(containerName)) {
          return;
        }
      } catch {
        // Continue waiting
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    throw new Error(
      `Container ${containerName} failed to start within ${timeout}ms`
    );
  }
}
