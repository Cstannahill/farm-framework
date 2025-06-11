// vitest.config.ts (project root)
import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["tools/testing/setup.ts"],
    testTimeout: 60000,
    hookTimeout: 30000,
    pool: "threads",
    poolOptions: {
      threads: {
        singleThread: true, // For Docker tests that can't run in parallel
      },
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      exclude: [
        "node_modules/**",
        "dist/**",
        "**/*.d.ts",
        "templates/**",
        "examples/**",
      ],
    },
  },
  resolve: {
    alias: {
      "@farm-framework/cli": resolve(__dirname, "packages/cli/src"),
      "@farm-framework/core": resolve(__dirname, "packages/core/src"),
      "@farm-framework/type-sync": resolve(__dirname, "packages/type-sync/src"),
      "@farm-framework/types": resolve(__dirname, "packages/types/src"),
      "@farm-framework/testing": resolve(__dirname, "tools/testing"),
    },
  },
});
