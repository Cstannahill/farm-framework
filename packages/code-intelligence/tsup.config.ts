import { defineConfig } from "tsup";

export default defineConfig([
  // Main library build with DTS
  {
    entry: ["src/index.ts", "src/client.ts"],
    format: ["esm"],
    dts: {
      entry: ["src/index.ts", "src/client.ts"],
      resolve: true,
    },
    splitting: false,
    sourcemap: true,
    clean: true,
    target: "node18",
    platform: "node",
    tsconfig: "tsconfig.build.json",
    external: [
      // External Python dependencies
      "chromadb",
      "sentence-transformers",
      "networkx",
      "numpy",
      "torch",
      "fastapi",
      // Node.js built-ins that should not be bundled
      "typescript",
    ],
    env: {
      NODE_ENV: "production",
    },
  },
  // Test files build without DTS
  {
    entry: [
      "src/test/test-explanation.ts",
      "src/test/demo.ts",
      "src/test/test-vector-db.ts",
    ],
    format: ["esm"],
    dts: false, // No DTS for test files
    splitting: false,
    sourcemap: true,
    clean: false, // Don't clean since main build already cleaned
    target: "node18",
    platform: "node",
    external: [
      // External Python dependencies
      "chromadb",
      "sentence-transformers",
      "networkx",
      "numpy",
      "torch",
      "fastapi",
      // Node.js built-ins that should not be bundled
      "typescript",
    ],
    env: {
      NODE_ENV: "production",
    },
  },
]);
