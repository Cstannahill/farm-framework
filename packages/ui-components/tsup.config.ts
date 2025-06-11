import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.tsx"],
  format: ["cjs", "esm"],
  dts: false, // Use tsc for declarations
  clean: false, // Don't clean to preserve tsc output in dist/ts
  sourcemap: true,
  external: ["@farm-framework/types", "react", "react-dom"],
  outDir: "dist",
  tsconfig: "./tsconfig.json",
  target: "es2020",
  platform: "browser",
  esbuildOptions(options) {
    options.jsx = "automatic";
  },
});
