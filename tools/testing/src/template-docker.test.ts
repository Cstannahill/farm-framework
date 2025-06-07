import { describe, it, expect } from "vitest";
import { TemplateValidator } from "../template-validator";

describe("TemplateValidator getRequiredFiles", () => {
  it("includes docker compose file", () => {
    const validator = new TemplateValidator();
    const files = (validator as any).getRequiredFiles("basic");
    expect(files).toContain("docker-compose.yml.hbs");
  });
});
