import { describe, it, expect, vi } from "vitest";
import { generateTypesFromSchema } from "./src/type-generator";

vi.mock("change-case", () => ({
  pascalCase: (s: string) => s.charAt(0).toUpperCase() + s.slice(1),
  camelCase: (s: string) => s.charAt(0).toLowerCase() + s.slice(1),
}));

const schema = {
  openapi: "3.0.0",
  info: { title: "Demo", version: "1.0.0" },
  paths: {},
  components: {
    schemas: {
      B: {
        type: "object",
        properties: { id: { type: "string" }, a: { $ref: "#/components/schemas/A" } },
      },
      A: { type: "object", properties: { id: { type: "string" } }, required: ["id"] },
    },
  },
};

describe("generateTypesFromSchema order", () => {
  it("sorts types so dependencies come first", () => {
    const output = generateTypesFromSchema(schema as any);
    const indexA = output.indexOf("interface A");
    const indexB = output.indexOf("interface B");
    expect(indexA).toBeLessThan(indexB);
  });
});
