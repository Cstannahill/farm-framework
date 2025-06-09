import { describe, it, expect, vi } from "vitest";
import { generateTypesFromSchema } from "../type-generator";

vi.mock("change-case", () => ({
  pascalCase: (s: string) => s.charAt(0).toUpperCase() + s.slice(1),
  camelCase: (s: string) => s.charAt(0).toLowerCase() + s.slice(1),
}));

const schema = {
  openapi: "3.0.0",
  info: { title: "Demo", version: "1.0.0" },
  paths: {
    "/user": {
      get: {
        operationId: "getUser",
        responses: {
          "200": {
            description: "User",
            content: { "application/json": { schema: { $ref: "#/components/schemas/User" } } },
          },
        },
      },
    },
  },
  components: {
    schemas: {
      User: {
        type: "object",
        required: ["id", "name"],
        properties: {
          id: { type: "string" },
          name: { type: "string" },
        },
      },
    },
  },
};

describe("generateTypesFromSchema", () => {
  it("creates interfaces for schemas and responses", () => {
    const output = generateTypesFromSchema(schema as any);
    expect(output).toContain("export interface User");
    expect(output).toContain("export type GetUserResponse");
  });
});
