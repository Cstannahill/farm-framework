import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("chokidar", () => ({ watch: vi.fn(() => ({ on: vi.fn(), close: vi.fn(), getWatched: () => ({}) })) }));
vi.mock("change-case", () => ({
  pascalCase: (s: string) => s.charAt(0).toUpperCase() + s.slice(1),
  camelCase: (s: string) => s.charAt(0).toLowerCase() + s.slice(1),
}));
vi.mock("lodash", () => ({ debounce: (fn: any) => fn }));

import { SchemaWatcher } from "../schema/watcher";

const mockSchema = {
  openapi: "3.0.0",
  info: { title: "Test", version: "1.0.0" },
  paths: { "/ping": { get: {} } },
};

vi.mock("../schema/extractor", () => {
  return {
    OpenAPISchemaExtractor: vi.fn().mockImplementation(() => ({
      extractSchema: vi.fn().mockResolvedValue(mockSchema),
      clearCache: vi.fn(),
    })),
  };
});

describe("SchemaWatcher", () => {
  let watcher: SchemaWatcher;

  beforeEach(() => {
    watcher = new SchemaWatcher({ projectRoot: process.cwd(), debounceMs: 10 });
  });

  it("emits schema-extracted on forceExtraction", async () => {
    let emitted = false;
    watcher.on("schema-extracted", (evt) => {
      emitted = true;
      expect(evt.schema).toEqual(mockSchema);
    });

    await watcher.forceExtraction();
    expect(emitted).toBe(true);
  });
});
