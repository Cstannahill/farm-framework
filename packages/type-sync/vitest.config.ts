import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    testTimeout: 30000,
    hookTimeout: 10000,
    teardownTimeout: 5000,

    // Test file patterns
    include: [
      "__tests__/**/*.{test,spec}.{js,ts}",
      "src/**/*.{test,spec}.{js,ts}",
    ],
    exclude: ["node_modules", "dist", ".git"],

    // Coverage configuration
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      reportsDirectory: "coverage",
      include: ["src/**/*.ts"],
      exclude: [
        "src/**/*.d.ts",
        "src/**/*.test.ts",
        "src/**/*.spec.ts",
        "src/test/**",
        "src/**/__tests__/**",
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
      },
    },

    // Setup files
    setupFiles: ["./__tests__/setup.ts"],

    // Mock configuration
    clearMocks: true,
    restoreMocks: true,
    mockReset: true,

    // Parallel execution
    pool: "threads",
    poolOptions: {
      threads: {
        maxThreads: 4,
        minThreads: 1,
      },
    },

    // Reporter configuration
    reporter: ["verbose", "json", "html"],
    outputFile: {
      json: "./test-results.json",
      html: "./test-report.html",
    },

    // Watch options
    watch: false,
    watchExclude: ["node_modules/**", "dist/**", "coverage/**"],
  },

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@tests": path.resolve(__dirname, "./__tests__"),
    },
  },

  esbuild: {
    target: "node18",
  },
});
