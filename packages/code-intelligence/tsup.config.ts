import { defineConfig } from "tsup";

export default defineConfig({
  entry: [
    "src/index.ts",
    "src/client.ts",
    "src/test/test-explanation.ts",
    "src/test/demo.ts",
    "src/test/test-vector-db.ts",
  ],
  format: ["esm"],
  dts: false, // Disable for now
  splitting: false,
  sourcemap: true,
  clean: true,
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
});
