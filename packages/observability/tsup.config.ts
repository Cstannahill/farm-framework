import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs", "esm"],
  dts: false, // Disable due to workspace complexity, use tsc instead
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
    "http",
    "https",
    "url",

    // OpenTelemetry packages (should not be bundled)
    "@opentelemetry/api",
    "@opentelemetry/auto-instrumentations-node",
    "@opentelemetry/exporter-console",
    "@opentelemetry/exporter-jaeger",
    "@opentelemetry/exporter-otlp-http",
    "@opentelemetry/instrumentation",
    "@opentelemetry/resources",
    "@opentelemetry/sdk-node",
    "@opentelemetry/semantic-conventions",

    // External packages that should not be bundled
    "fs-extra",
    "lodash-es",
    "node-fetch",
    "chalk",

    // React (peer dependencies)
    "react",
    "react-dom",

    // FARM framework packages
    "@farm-framework/types",
    "@farm-framework/core",
  ],
  banner: {
    js: `import { createRequire } from 'module'; const require = createRequire(import.meta.url);`,
  },
});
