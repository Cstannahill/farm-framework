import { describe, it, expect } from "vitest";
import { TemplateValidator } from "../template-validator";

describe("TemplateValidator", () => {
  it("reports error when template missing", async () => {
    const validator = new TemplateValidator("/tmp/farm-tests");
    const result = await validator.validateTemplate("missing", {
      template: "basic",
      features: [],
      database: { type: "mongodb" },
    });
    expect(result.isValid).toBe(false);
    expect(result.errors[0].type).toBe("STRUCTURE_ERROR");
  });
});
