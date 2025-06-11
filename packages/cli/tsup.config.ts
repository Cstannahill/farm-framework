import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"], // ESM only for CLI (import.meta support)
  dts: false, // Use tsc for declarations
  clean: false, // Don't clean to preserve tsc output in dist/ts
  sourcemap: true,
  external: [
    // Farm packages
    "@farm-framework/types",
    "@farm-framework/core",
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
    "commander",
    "chalk",
    "inquirer",
    "ora",
    "execa",
    "glob",
    "handlebars",
    "@inquirer/prompts",
  ],
  outDir: "dist",
  tsconfig: "./tsconfig.json",
  target: "node18",
  platform: "node",
  banner: {
    js: "#!/usr/bin/env node",
  },
});
