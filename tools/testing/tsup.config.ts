import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["index.ts", "template-validator.ts"],
  format: ["cjs", "esm"],
  dts: true,
  clean: true,
  target: "node18",
  splitting: false,
  sourcemap: true,
});
