import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { TypeSyncOrchestrator } from "@farm/type-sync";
import type { SyncOptions } from "@farm/type-sync";
import fs from "fs-extra";

// Mock fs-extra
describe("TypeSync Orchestrator Minimal Test", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });
  beforeEach(() => {
    vi.mock("fs-extra");
    vi.clearAllMocks();
    vi.spyOn(fs, "ensureDir").mockImplementation(() => Promise.resolve());
    vi.spyOn(fs, "pathExists").mockImplementation(() => Promise.resolve(false));
    vi.spyOn(fs, "readdir").mockImplementation(() => Promise.resolve([]));
    vi.spyOn(fs, "readJson").mockImplementation(() => Promise.resolve({}));
    orchestrator = new TypeSyncOrchestrator();
    mockConfig = {
      apiUrl: "http://localhost:8000",
      outputDir: "./generated",
      features: {
        client: true,
        hooks: true,
        streaming: true,
        aiHooks: true,
      },
      performance: {
        enableMonitoring: true,
        enableIncrementalGeneration: false, // Disable to avoid loadFileChecksums
        maxConcurrency: 4,
        cacheTimeout: 300000,
      },
    };
  });

  let orchestrator: TypeSyncOrchestrator;
  let mockConfig: SyncOptions;

  it("should initialize orchestrator", async () => {
    await orchestrator.initialize(mockConfig);
    expect(fs.ensureDir).toHaveBeenCalledWith("./generated");
  });
});
