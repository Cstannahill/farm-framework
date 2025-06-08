import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs", "esm"],
  dts: false, // Use tsc for declarations
  splitting: false,
  sourcemap: true,
  clean: false, // Don't clean to preserve tsc output in dist/ts
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
