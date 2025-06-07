// packages/cli/src/generators/project-structure.ts
import { join } from "path";
import { mkdir } from "fs/promises";
import { TemplateContext, TemplateName } from "../template/types.js";

export interface DirectoryStructure {
  [path: string]: {
    condition?: (context: TemplateContext) => boolean;
    description?: string;
  };
}

export class ProjectStructureGenerator {
  private baseStructure: DirectoryStructure = {
    // Core directories (always created)
    "apps/api/src/routes": { description: "FastAPI route handlers" },
    "apps/api/src/models": { description: "Pydantic models" },
    "apps/api/src/core": { description: "Core utilities and config" },
    "apps/api/src/database": { description: "Database connection and ODM" },
    "apps/api/tests": { description: "Backend test suite" },
    packages: { description: "Shared packages" },
    tools: { description: "Build tools and scripts" },
    docs: { description: "Documentation" },
  };

  private frontendStructure: DirectoryStructure = {
    "apps/web/src/components": {
      condition: (ctx) => ctx.template !== "api-only",
      description: "React components",
    },
    "apps/web/src/pages": {
      condition: (ctx) => ctx.template !== "api-only",
      description: "Page components",
    },
    "apps/web/src/hooks": {
      condition: (ctx) => ctx.template !== "api-only",
      description: "Custom React hooks",
    },
    "apps/web/src/services": {
      condition: (ctx) => ctx.template !== "api-only",
      description: "API client services (auto-generated)",
    },
    "apps/web/src/types": {
      condition: (ctx) => ctx.template !== "api-only",
      description: "TypeScript types (auto-generated)",
    },
    "apps/web/src/utils": {
      condition: (ctx) => ctx.template !== "api-only",
      description: "Frontend utilities",
    },
    "apps/web/src/stores": {
      condition: (ctx) => ctx.template !== "api-only",
      description: "State management (Zustand)",
    },
    "apps/web/public": {
      condition: (ctx) => ctx.template !== "api-only",
      description: "Static assets",
    },
  };

  private featureStructures: Record<string, DirectoryStructure> = {
    ai: {
      "apps/api/src/ai": { description: "AI/ML services and providers" },
      "apps/api/src/ai/providers": {
        description: "AI provider implementations",
      },
      "apps/api/src/ai/models": { description: "AI model configurations" },
      "apps/api/models": { description: "AI model storage (Ollama cache)" },
      "apps/api/models/ollama": { description: "Ollama model cache" },
      "apps/web/src/components/chat": {
        condition: (ctx) => ctx.template !== "api-only",
        description: "Chat UI components",
      },
      "apps/web/src/components/ai": {
        condition: (ctx) => ctx.template !== "api-only",
        description: "AI-specific components",
      },
    },

    auth: {
      "apps/api/src/auth": { description: "Authentication services" },
      "apps/api/src/auth/providers": {
        description: "Auth provider implementations",
      },
      "apps/web/src/components/auth": {
        condition: (ctx) => ctx.template !== "api-only",
        description: "Authentication components",
      },
    },

    realtime: {
      "apps/api/src/websocket": { description: "WebSocket handlers" },
      "apps/web/src/hooks/realtime": {
        condition: (ctx) => ctx.template !== "api-only",
        description: "Real-time hooks",
      },
    },

    payments: {
      "apps/api/src/payments": { description: "Payment processing" },
      "apps/api/src/payments/providers": {
        description: "Payment provider integrations",
      },
      "apps/web/src/components/payments": {
        condition: (ctx) => ctx.template !== "api-only",
        description: "Payment UI components",
      },
    },

    storage: {
      "apps/api/src/storage": { description: "File storage services" },
      "apps/api/uploads": { description: "Local file uploads" },
      "apps/web/src/components/upload": {
        condition: (ctx) => ctx.template !== "api-only",
        description: "File upload components",
      },
    },

    email: {
      "apps/api/src/email": { description: "Email services" },
      "apps/api/src/email/templates": { description: "Email templates" },
    },

    search: {
      "apps/api/src/search": { description: "Search services" },
      "apps/web/src/components/search": {
        condition: (ctx) => ctx.template !== "api-only",
        description: "Search UI components",
      },
    },

    analytics: {
      "apps/api/src/analytics": { description: "Analytics services" },
      "apps/web/src/components/analytics": {
        condition: (ctx) => ctx.template !== "api-only",
        description: "Analytics components",
      },
    },
  };

  private templateSpecificStructures: Record<TemplateName, DirectoryStructure> =
    {
      "ai-chat": {
        "apps/web/src/components/chat/windows": {
          condition: (ctx) => ctx.template !== "api-only",
          description: "Chat window components",
        },
        "apps/web/src/components/chat/messages": {
          condition: (ctx) => ctx.template !== "api-only",
          description: "Message components",
        },
        "apps/api/src/ai/chat": { description: "Chat-specific AI services" },
      },

      "ai-dashboard": {
        "apps/web/src/components/dashboard": {
          condition: (ctx) => ctx.template !== "api-only",
          description: "Dashboard components",
        },
        "apps/web/src/components/charts": {
          condition: (ctx) => ctx.template !== "api-only",
          description: "Chart components",
        },
        "apps/api/src/analytics/ml": { description: "ML analytics services" },
        "apps/api/datasets": { description: "Sample datasets" },
      },

      ecommerce: {
        "apps/web/src/components/products": {
          condition: (ctx) => ctx.template !== "api-only",
          description: "Product components",
        },
        "apps/web/src/components/cart": {
          condition: (ctx) => ctx.template !== "api-only",
          description: "Shopping cart components",
        },
        "apps/web/src/components/checkout": {
          condition: (ctx) => ctx.template !== "api-only",
          description: "Checkout components",
        },
        "apps/api/src/ecommerce": { description: "E-commerce services" },
        "apps/api/src/inventory": { description: "Inventory management" },
      },

      cms: {
        "apps/web/src/components/editor": {
          condition: (ctx) => ctx.template !== "api-only",
          description: "Content editor components",
        },
        "apps/web/src/components/content": {
          condition: (ctx) => ctx.template !== "api-only",
          description: "Content display components",
        },
        "apps/api/src/cms": { description: "CMS services" },
        "apps/api/src/content": { description: "Content management" },
        "apps/api/uploads/media": { description: "Media files" },
      },

      basic: {},
      "api-only": {},
    };

  async generateProjectStructure(
    projectPath: string,
    context: TemplateContext
  ): Promise<string[]> {
    const createdDirectories: string[] = [];

    console.log("📁 Creating project directory structure...");

    // Collect all directories to create
    const allDirectories = this.getAllDirectoriesToCreate(context);

    // Create directories in optimal order (parent before child)
    const sortedDirectories = this.sortDirectoriesByDepth(allDirectories);

    for (const dirPath of sortedDirectories) {
      const fullPath = join(projectPath, dirPath);
      await mkdir(fullPath, { recursive: true });
      createdDirectories.push(dirPath);

      // Log with description if available
      const description = this.getDirectoryDescription(dirPath, context);
      if (description) {
        console.log(`✅ Created: ${dirPath} (${description})`);
      } else {
        console.log(`✅ Created: ${dirPath}`);
      }
    }

    console.log(`📁 Created ${createdDirectories.length} directories`);
    return createdDirectories;
  }

  private getAllDirectoriesToCreate(context: TemplateContext): string[] {
    const directories = new Set<string>();

    // Add base structure
    this.addStructureToSet(directories, this.baseStructure, context);

    // Add frontend structure
    this.addStructureToSet(directories, this.frontendStructure, context);

    // Add feature-specific structures
    for (const feature of context.features) {
      if (this.featureStructures[feature]) {
        this.addStructureToSet(
          directories,
          this.featureStructures[feature],
          context
        );
      }
    }

    // Add template-specific structure
    if (this.templateSpecificStructures[context.template]) {
      this.addStructureToSet(
        directories,
        this.templateSpecificStructures[context.template],
        context
      );
    }

    return Array.from(directories);
  }

  private addStructureToSet(
    directories: Set<string>,
    structure: DirectoryStructure,
    context: TemplateContext
  ): void {
    for (const [dirPath, config] of Object.entries(structure)) {
      if (!config.condition || config.condition(context)) {
        directories.add(dirPath);
      }
    }
  }

  private sortDirectoriesByDepth(directories: string[]): string[] {
    return directories.sort((a, b) => {
      const depthA = a.split("/").length;
      const depthB = b.split("/").length;
      return depthA - depthB; // Shallow directories first
    });
  }

  private getDirectoryDescription(
    dirPath: string,
    context: TemplateContext
  ): string | undefined {
    // Check all structures for description
    const allStructures = [
      this.baseStructure,
      this.frontendStructure,
      ...Object.values(this.featureStructures),
      ...Object.values(this.templateSpecificStructures),
    ];

    for (const structure of allStructures) {
      if (structure[dirPath]?.description) {
        return structure[dirPath].description;
      }
    }

    return undefined;
  }

  // Helper method to get structure overview
  getStructureOverview(
    context: TemplateContext
  ): { path: string; description: string }[] {
    const directories = this.getAllDirectoriesToCreate(context);

    return directories.map((dirPath) => ({
      path: dirPath,
      description:
        this.getDirectoryDescription(dirPath, context) || "Generated directory",
    }));
  }
}
