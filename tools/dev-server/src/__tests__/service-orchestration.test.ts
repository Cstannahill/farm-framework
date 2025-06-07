import { describe, it, expect, vi } from "vitest";

vi.mock("chalk", () => ({ default: { gray: (t: string) => t, green: (t: string) => t, yellow: (t: string) => t, red: (t: string) => t } }));

import { ServiceConfigManager } from "../service-configs";
import { Logger } from "../logger";

describe("ServiceConfigManager", () => {
  const logger = new Logger("test");

  it("includes ollama when enabled", () => {
    const manager = new ServiceConfigManager(logger);
    const config: any = {
      template: "basic",
      features: ["ai"],
      ai: { providers: { ollama: { enabled: true, autoStart: true } } },
      development: {},
      database: {},
    };
    const services = manager.getServiceConfigs(config, "/app");
    expect(services.map((s) => s.key)).toContain("ollama");
  });

  it("omits ollama when disabled", () => {
    const manager = new ServiceConfigManager(logger);
    const config: any = {
      template: "basic",
      features: [],
      ai: {},
      development: {},
      database: {},
    };
    const services = manager.getServiceConfigs(config, "/app");
    expect(services.map((s) => s.key)).not.toContain("ollama");
  });
});
