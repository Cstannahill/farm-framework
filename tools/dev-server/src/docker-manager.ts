// tools/dev-server/src/docker-manager.ts
import { spawn } from "child_process";
import { EventEmitter } from "events";

export class DockerManager extends EventEmitter {
  private containers = new Map<string, any>();

  async startOllama(config: any): Promise<void> {
    const args = [
      "run",
      "-d",
      "--name",
      "farm-ollama",
      "-p",
      "11434:11434",
      "-v",
      "ollama_models:/root/.ollama",
      "--restart",
      "unless-stopped",
    ];

    // Add GPU support if available
    if (config.ai?.providers?.ollama?.gpu) {
      args.push("--gpus", "all");
    }

    args.push("ollama/ollama");

    const process = spawn("docker", args);
    this.containers.set("ollama", process);

    // Auto-pull configured models
    if (config.ai?.providers?.ollama?.autoPull) {
      await this.pullOllamaModels(config.ai.providers.ollama.autoPull);
    }
  }

  async pullOllamaModels(models: string[]): Promise<void> {
    for (const model of models) {
      console.log(`📥 Pulling Ollama model: ${model}`);
      await this.execInContainer("ollama", ["ollama", "pull", model]);
    }
  }

  async stopAll(): Promise<void> {
    const stopPromises = Array.from(this.containers.keys()).map((name) =>
      this.stopContainer(name)
    );
    await Promise.all(stopPromises);
  }
}
