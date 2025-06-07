import { describe, it, expect, vi } from "vitest";
import { validateAllTemplates, TemplateValidator } from "../template-validator";

describe("validateAllTemplates", () => {
  it("aggregates validation results", async () => {
    vi.spyOn(TemplateValidator.prototype, "validateTemplate").mockImplementation(async (name: string) => ({
      templateName: name,
      isValid: true,
      errors: [],
      warnings: [],
      timestamp: new Date().toISOString(),
    }));

    const results = await validateAllTemplates();
    expect(results.length).toBeGreaterThan(0);
    results.forEach((r) => expect(r.isValid).toBe(true));
  });
});
