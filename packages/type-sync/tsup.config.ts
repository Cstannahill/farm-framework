import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    cli: "src/cli/index.ts",
  },
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
    "worker_threads",
    // External packages that should not be bundled
    "fs-extra",
    "chokidar",
    "lodash-es",
    "openapi-types",
    // VS Code extension API
    "vscode",
    // Dependencies that should remain external
    "commander",
    "inquirer",
    "chalk",
    "ora",
    "handlebars",
    "prettier",
    "eslint",
  ],
});
