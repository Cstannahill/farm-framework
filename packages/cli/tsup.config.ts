import { defineConfig } from "tsup";
import fs from "fs-extra";
import path from "path";

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
  async onSuccess() {
    // Copy templates from CLI package to dist directory
    const templatesSource = path.join(__dirname, "templates");
    const templatesTarget = path.join(__dirname, "dist", "templates");

    if (await fs.pathExists(templatesSource)) {
      await fs.copy(templatesSource, templatesTarget, { overwrite: true });
      console.log("✅ Templates copied to CLI build");
    } else {
      console.warn("⚠️ Templates directory not found at:", templatesSource);
    }
  },
});
