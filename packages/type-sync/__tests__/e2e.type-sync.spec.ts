// @ts-nocheck
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { TypeSyncOrchestrator } from "@farm-framework/type-sync";

/* ------------------------------------------------------------------ */
/* Setup temporary workspace                                          */
/* ------------------------------------------------------------------ */
let tmpDir: string;
let outDir: string;

beforeAll(async () => {
  tmpDir = mkdtempSync(path.join(os.tmpdir(), "farm-typesync-"));
  outDir = path.join(tmpDir, "generated");
  await fs.mkdir(outDir, { recursive: true });

  // Minimal OpenAPI spec so the extractor hits cached/static path
  await fs.writeFile(
    path.join(outDir, "openapi.json"),
    JSON.stringify(
      {
        openapi: "3.0.0",
        info: { title: "Test", version: "1.0.0" },
        paths: {
          "/health": {
            get: {
              operationId: "getHealth",
              responses: { 200: { description: "OK" } },
            },
          },
        },
      },
      null,
      2
    ),
    "utf8"
  );

  const orchestrator = new TypeSyncOrchestrator();
  // Cast/ignore extra fields to keep the file tiny & avoid type headaches
  await orchestrator.initialize({
    apiUrl: "file://openapi.json",
    outputDir: outDir,
    features: { client: true, hooks: true, streaming: false, aiHooks: false },
    /** @ts-ignore */
    generators: {
      typescript: { outputDir: outDir },
      apiClient: { outputDir: outDir },
      reactHooks: { outputDir: outDir },
    },
    performance: { enableMonitoring: false },
  } as any);

  await orchestrator.syncOnce();
});

afterAll(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

/* ------------------------------------------------------------------ */
/* Minimal assertion                                                  */
/* ------------------------------------------------------------------ */
it("generates at least one .ts file", async () => {
  const files = await fs.readdir(outDir);
  expect(files.some((f) => f.endsWith(".ts"))).toBe(true);
});
