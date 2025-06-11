import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@farm-framework/cli", () => ({ wrapError: (e: any) => String(e) }));

import { DockerManager } from "../docker-manager";

describe("DockerManager", () => {
  let manager: DockerManager;

  beforeEach(() => {
    manager = new DockerManager();
    vi.spyOn(manager as any, "runDockerCommand").mockResolvedValue("");
    vi.spyOn(manager as any, "waitForContainer").mockResolvedValue();
    vi.spyOn(manager, "pullOllamaModels").mockResolvedValue();
    vi.spyOn(manager as any, "isDockerAvailable").mockResolvedValue(true);
  });

  it("passes GPU flag when enabled", async () => {
    await manager.startOllama({ gpu: true });
    const args = (manager as any).runDockerCommand.mock.calls[0][0];
    expect(args).toContain("--gpus");
    expect(args).toContain("all");
  });

  it("pulls models from environment", async () => {
    await manager.startOllama({ environment: { OLLAMA_MODELS: "a,b" } });
    expect(manager.pullOllamaModels).toHaveBeenCalledWith(["a", "b"]);
  });
});
