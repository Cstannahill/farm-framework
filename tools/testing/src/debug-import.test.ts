// Debug test to understand what's happening with imports
import { describe, it, expect } from "vitest";

describe("Debug Import Test", () => {
  it("should import TypeSyncOrchestrator from source", async () => {
    try {
      const { TypeSyncOrchestrator } = await import(
        "../../../packages/type-sync/src/orchestrator"
      );
      console.log("TypeSyncOrchestrator:", TypeSyncOrchestrator);
      expect(TypeSyncOrchestrator).toBeDefined();

      const orchestrator = new TypeSyncOrchestrator();
      console.log("orchestrator instance:", orchestrator);
      console.log("orchestrator.initialize:", orchestrator.initialize);
      console.log(
        "orchestrator.registerGenerator:",
        orchestrator.registerGenerator
      );

      expect(orchestrator).toBeDefined();
      expect(typeof orchestrator.initialize).toBe("function");
      expect(typeof orchestrator.registerGenerator).toBe("function");
    } catch (error) {
      console.error("Import error:", error);
      throw error;
    }
  });

  it("should import GenerationCache from source", async () => {
    try {
      const { GenerationCache } = await import(
        "../../../packages/type-sync/src/cache"
      );
      console.log("GenerationCache:", GenerationCache);
      expect(GenerationCache).toBeDefined();

      const cache = new GenerationCache("./test");
      console.log("cache instance:", cache);
      console.log("cache.initialize:", cache.initialize);
      console.log("cache.get:", cache.get);
      console.log("cache.set:", cache.set);

      expect(cache).toBeDefined();
      expect(typeof cache.initialize).toBe("function");
      expect(typeof cache.get).toBe("function");
      expect(typeof cache.set).toBe("function");
    } catch (error) {
      console.error("Import error:", error);
      throw error;
    }
  });
});
