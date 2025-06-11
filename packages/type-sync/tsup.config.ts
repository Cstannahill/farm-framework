import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs", "esm"],
  dts: false, // We'll handle this with tsc separately
  clean: true,
  sourcemap: true,
  target: "es2022",
  outDir: "dist",
  external: [
    // Node.js built-ins
    "fs",
    "path",
    "os",
    "crypto",
    "util",
    "events",
    "stream",
    "child_process",
    // External packages that should not be bundled
    "fs-extra",
    "chokidar",
    "lodash-es",
    "openapi-types",
  ],
});
