// Debug script to check what methods are available
import {
  TypeSyncOrchestrator,
  GenerationCache,
} from "./packages/type-sync/dist/index.js";

console.log("=== TypeSyncOrchestrator Debug ===");
const orchestrator = new TypeSyncOrchestrator();
console.log("orchestrator instance:", typeof orchestrator);
console.log("orchestrator.initialize:", typeof orchestrator.initialize);
console.log("orchestrator.syncOnce:", typeof orchestrator.syncOnce);
console.log(
  "orchestrator.registerGenerator:",
  typeof orchestrator.registerGenerator
);
console.log(
  "orchestrator methods:",
  Object.getOwnPropertyNames(Object.getPrototypeOf(orchestrator))
);

console.log("\n=== GenerationCache Debug ===");
const cache = new GenerationCache("./test-cache");
console.log("cache instance:", typeof cache);
console.log("cache.initialize:", typeof cache.initialize);
console.log("cache.get:", typeof cache.get);
console.log("cache.set:", typeof cache.set);
console.log(
  "cache methods:",
  Object.getOwnPropertyNames(Object.getPrototypeOf(cache))
);
