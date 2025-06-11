// tools/template-validator/src/configurations.ts
import type { TemplateConfig } from "@farm-framework/types";

export const AI_CHAT_CONFIGURATIONS: TemplateConfig[] = [
  {
    name: "ollama-only",
    template: "ai-chat",
    features: ["ai"],
    database: "mongodb",
    ai: {
      providers: ["ollama"],
      models: ["llama3.1"],
    },
  },
  {
    name: "openai-only",
    template: "ai-chat",
    features: ["ai"],
    database: "mongodb",
    ai: {
      providers: ["openai"],
      models: ["gpt-3.5-turbo"],
    },
  },
  {
    name: "multi-provider",
    template: "ai-chat",
    features: ["ai"],
    database: "mongodb",
    ai: {
      providers: ["ollama", "openai"],
      models: ["llama3.1", "gpt-3.5-turbo"],
    },
  },
  {
    name: "full-features",
    template: "ai-chat",
    features: ["ai", "auth", "realtime"],
    database: "mongodb",
    ai: {
      providers: ["ollama", "openai"],
      models: ["llama3.1", "gpt-3.5-turbo"],
    },
  },
  {
    name: "postgresql-backend",
    template: "ai-chat",
    features: ["ai", "auth"],
    database: "postgresql",
    ai: {
      providers: ["openai"],
      models: ["gpt-3.5-turbo"],
    },
  },
];

export const AI_DASHBOARD_CONFIGURATIONS: TemplateConfig[] = [
  {
    name: "basic-dashboard",
    template: "ai-dashboard",
    features: ["ai"],
    database: "mongodb",
    ai: {
      providers: ["ollama"],
      models: ["llama3.1"],
    },
  },
  {
    name: "advanced-dashboard",
    template: "ai-dashboard",
    features: ["ai", "auth"],
    database: "mongodb",
    ai: {
      providers: ["ollama", "openai"],
      models: ["llama3.1", "gpt-4"],
    },
  },
];

export const BASIC_CONFIGURATIONS: TemplateConfig[] = [
  {
    name: "minimal",
    template: "basic",
    features: [],
    database: "mongodb",
  },
  {
    name: "with-auth",
    template: "basic",
    features: ["auth"],
    database: "mongodb",
  },
  {
    name: "postgresql",
    template: "basic",
    features: ["auth"],
    database: "postgresql",
  },
];

export const ALL_CONFIGURATIONS = {
  "ai-chat": AI_CHAT_CONFIGURATIONS,
  "ai-dashboard": AI_DASHBOARD_CONFIGURATIONS,
  basic: BASIC_CONFIGURATIONS,
};
