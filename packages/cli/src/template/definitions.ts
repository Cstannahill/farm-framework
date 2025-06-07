// packages/cli/src/templates/definitions.ts
export interface TemplateDefinition {
  name: string;
  displayName: string;
  description: string;
  features: string[];
  database: string[];
  structure: TemplateStructure;
}

export interface TemplateStructure {
  frontend: boolean;
  backend: boolean;
  ai: boolean;
  database: boolean;
}

export const TEMPLATES: Record<string, TemplateDefinition> = {
  basic: {
    name: "basic",
    displayName: "Basic Web App",
    description: "Simple React + FastAPI + MongoDB setup",
    features: [],
    database: ["mongodb", "postgresql", "mysql", "sqlite"],
    structure: {
      frontend: true,
      backend: true,
      ai: false,
      database: true,
    },
  },

  "ai-chat": {
    name: "ai-chat",
    displayName: "AI Chat Application",
    description:
      "Chat application with streaming AI responses and conversation management",
    features: ["ai", "realtime"],
    database: ["mongodb", "postgresql"],
    structure: {
      frontend: true,
      backend: true,
      ai: true,
      database: true,
    },
  },

  "ai-dashboard": {
    name: "ai-dashboard",
    displayName: "AI Dashboard",
    description: "Data dashboard with ML insights, charts, and analytics",
    features: ["ai", "analytics"],
    database: ["mongodb", "postgresql"],
    structure: {
      frontend: true,
      backend: true,
      ai: true,
      database: true,
    },
  },

  ecommerce: {
    name: "ecommerce",
    displayName: "E-commerce Platform",
    description:
      "E-commerce platform with products, cart, and payment processing",
    features: ["auth", "payments", "storage"],
    database: ["mongodb", "postgresql"],
    structure: {
      frontend: true,
      backend: true,
      ai: false,
      database: true,
    },
  },

  cms: {
    name: "cms",
    displayName: "Content Management System",
    description: "CMS with rich text editing and media management",
    features: ["auth", "storage", "search"],
    database: ["mongodb", "postgresql"],
    structure: {
      frontend: true,
      backend: true,
      ai: false,
      database: true,
    },
  },

  "api-only": {
    name: "api-only",
    displayName: "API Only (Backend)",
    description: "FastAPI backend only, no React frontend",
    features: [],
    database: ["mongodb", "postgresql", "mysql", "sqlite"],
    structure: {
      frontend: false,
      backend: true,
      ai: false,
      database: true,
    },
  },
};

export function getTemplateDefinition(name: string): TemplateDefinition | null {
  return TEMPLATES[name] || null;
}

export function getAllTemplates(): TemplateDefinition[] {
  return Object.values(TEMPLATES);
}

export function getTemplatesWithFeature(feature: string): TemplateDefinition[] {
  return Object.values(TEMPLATES).filter((template) =>
    template.features.includes(feature)
  );
}
