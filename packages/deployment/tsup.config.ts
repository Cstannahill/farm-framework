import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs", "esm"],
  dts: false, // Disable due to workspace complexity, use tsc instead
  clean: true,
  sourcemap: true,
  external: [
    "@farm-framework/types",
    "@farm-framework/core",
    "@farm-framework/observability",
  ],
  target: "es2022",
  splitting: false,
  treeshake: true,
});
