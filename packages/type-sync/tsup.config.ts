import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs", "esm"],
  dts: false, // Use tsc for declarations in dist/ts
  clean: false, // Don't clean to preserve tsc output in dist/ts
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
    "lodash",
    "openapi-types",
  ],
});
