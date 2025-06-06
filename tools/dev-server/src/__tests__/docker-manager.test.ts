// tools/dev-server/src/__tests__/docker-manager.test.ts
import { DockerManager } from "../docker-manager";
import { spawn } from "child_process";
import { EventEmitter } from "events";

jest.mock("child_process");
const mockSpawn = spawn as jest.MockedFunction<typeof spawn>;

describe("DockerManager", () => {
  let dockerManager: DockerManager;
  let mockProcess: any;

  beforeEach(() => {
    dockerManager = new DockerManager();
    mockProcess = new EventEmitter();
    mockProcess.stdout = new EventEmitter();
    mockProcess.stderr = new EventEmitter();
    mockSpawn.mockReturnValue(mockProcess as any);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("startOllama", () => {
    it("should start Ollama container with correct parameters", async () => {
      const config = {
        ai: {
          providers: {
            ollama: {
              enabled: true,
              gpu: false,
              autoPull: ["llama3.1"],
            },
          },
        },
      };

      await dockerManager.startOllama(config);

      expect(mockSpawn).toHaveBeenCalledWith("docker", [
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
        "ollama/ollama",
      ]);
    });

    it("should add GPU support when enabled", async () => {
      const config = {
        ai: {
          providers: {
            ollama: {
              enabled: true,
              gpu: true,
              autoPull: [],
            },
          },
        },
      };

      await dockerManager.startOllama(config);

      expect(mockSpawn).toHaveBeenCalledWith(
        "docker",
        expect.arrayContaining(["--gpus", "all"])
      );
    });
  });

  describe("pullOllamaModels", () => {
    it("should pull specified models", async () => {
      const models = ["llama3.1", "codestral"];

      await dockerManager.pullOllamaModels(models);

      expect(mockSpawn).toHaveBeenCalledTimes(2);
      expect(mockSpawn).toHaveBeenCalledWith("docker", [
        "exec",
        "farm-ollama",
        "ollama",
        "pull",
        "llama3.1",
      ]);
      expect(mockSpawn).toHaveBeenCalledWith("docker", [
        "exec",
        "farm-ollama",
        "ollama",
        "pull",
        "codestral",
      ]);
    });
  });
});
