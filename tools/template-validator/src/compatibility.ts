// tools/template-validator/src/compatibility.ts
export interface ProviderCompatibility {
  provider: string;
  template: string;
  features: string[];
  models: string[];
  status: "supported" | "partial" | "unsupported";
  limitations?: string[];
  notes?: string;
}

export const COMPATIBILITY_MATRIX: ProviderCompatibility[] = [
  {
    provider: "ollama",
    template: "ai-chat",
    features: ["ai", "auth", "realtime"],
    models: ["llama3.1", "codestral", "phi3", "mistral"],
    status: "supported",
    notes: "Full local development support",
  },
  {
    provider: "openai",
    template: "ai-chat",
    features: ["ai", "auth", "realtime"],
    models: ["gpt-4", "gpt-3.5-turbo", "gpt-4-turbo"],
    status: "supported",
    notes: "Production-ready with API key required",
  },
  {
    provider: "huggingface",
    template: "ai-chat",
    features: ["ai", "auth"],
    models: ["microsoft/DialoGPT-medium", "gpt2"],
    status: "partial",
    limitations: ["No streaming support", "Limited model selection"],
    notes: "Good for experimentation",
  },
  {
    provider: "ollama",
    template: "ai-dashboard",
    features: ["ai", "auth"],
    models: ["llama3.1", "codestral"],
    status: "supported",
    notes: "Excellent for data analysis workflows",
  },
  {
    provider: "openai",
    template: "ai-dashboard",
    features: ["ai", "auth"],
    models: ["gpt-4", "gpt-3.5-turbo"],
    status: "supported",
    notes: "Best for production analytics",
  },
];

export function checkCompatibility(
  template: string,
  provider: string,
  features: string[]
): ProviderCompatibility | null {
  return (
    COMPATIBILITY_MATRIX.find(
      (c) =>
        c.template === template &&
        c.provider === provider &&
        features.every((f) => c.features.includes(f))
    ) || null
  );
}

export function getRecommendedConfiguration(
  template: string,
  environment: "development" | "staging" | "production"
): ProviderCompatibility[] {
  const compatible = COMPATIBILITY_MATRIX.filter(
    (c) => c.template === template
  );

  switch (environment) {
    case "development":
      return compatible.filter((c) => c.provider === "ollama");
    case "staging":
    case "production":
      return compatible.filter((c) => c.provider === "openai");
    default:
      return compatible;
  }
}
