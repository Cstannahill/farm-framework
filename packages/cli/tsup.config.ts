import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"], // ESM only for CLI (import.meta support)
  dts: true,
  clean: true,
  sourcemap: true,
  external: ["@farm/types", "@farm/core"],
  outDir: "dist",
  tsconfig: "./tsconfig.json",
  target: "node18",
  platform: "node",
  banner: {
    js: "#!/usr/bin/env node",
  },
});
