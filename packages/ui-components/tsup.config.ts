import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.tsx"],
  format: ["cjs", "esm"],
  dts: true,
  clean: true,
  sourcemap: true,
  external: ["@farm/types", "react", "react-dom"],
  outDir: "dist",
  tsconfig: "./tsconfig.json",
  target: "es2020",
  platform: "browser",
  esbuildOptions(options) {
    options.jsx = "automatic";
  },
});
