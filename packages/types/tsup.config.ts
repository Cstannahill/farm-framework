import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs", "esm"],
  dts: false, // Use tsc for declarations in dist/ts
  splitting: false,
  sourcemap: true,
  clean: false, // Don't clean to preserve tsc output in dist/ts
  outDir: "dist",
});
