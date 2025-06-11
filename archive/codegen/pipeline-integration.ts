// tools/codegen/pipeline-integration.ts
import { ReactHookGenerator } from "./react-hook-generator";
import { OpenAPIExtractor } from "./openapi-extractor";
import { TypeScriptGenerator } from "./typescript-generator";
import { APIClientGenerator } from "./api-client-generator";
import { readFile, writeFile, ensureDir } from "fs-extra";
import { join } from "path";
import chokidar from "chokidar";

interface CodeGenerationConfig {
  apiPath: string;
  webPath: string;
  outputPaths: {
    types: string;
    apiClient: string;
    hooks: string;
    schemas: string;
  };
  features: {
    ai: boolean;
    realtime: boolean;
    auth: boolean;
  };
}

export class FarmCodeGenerationPipeline {
  private config: CodeGenerationConfig;
  private watcher?: chokidar.FSWatcher;

  constructor(config: CodeGenerationConfig) {
    this.config = config;
  }

  async runFullGeneration(): Promise<void> {
    console.log("🏗️  Starting FARM code generation pipeline...");

    try {
      // Step 1: Extract OpenAPI schema
      console.log("📊 Extracting OpenAPI schema...");
      const schemaPath = await this.extractSchema();

      // Step 2: Generate TypeScript types
      console.log("🔧 Generating TypeScript types...");
      await this.generateTypes(schemaPath);

      // Step 3: Generate API client
      console.log("🌐 Generating API client...");
      await this.generateAPIClient(schemaPath);

      // Step 4: Generate React hooks
      console.log("⚡ Generating React hooks...");
      await this.generateReactHooks(schemaPath);

      // Step 5: Update package.json dependencies
      console.log("📦 Updating dependencies...");
      await this.updateDependencies();

      // Step 6: Generate provider setup
      console.log("🔌 Generating provider setup...");
      await this.generateProviderSetup();

      console.log("✅ Code generation completed successfully!");
    } catch (error) {
      console.error("❌ Code generation failed:", error);
      throw error;
    }
  }

  private async extractSchema(): Promise<string> {
    const extractor = new OpenAPIExtractor();
    const schemaPath = join(this.config.outputPaths.schemas, "openapi.json");

    await ensureDir(this.config.outputPaths.schemas);
    await extractor.extractFromFastAPI(this.config.apiPath, schemaPath);

    return schemaPath;
  }

  private async generateTypes(schemaPath: string): Promise<void> {
    // Read and parse the schema
    const schemaContent = await readFile(schemaPath, "utf-8");
    const schema = JSON.parse(schemaContent);

    const generator = new TypeScriptGenerator(schema, {
      outputDir: this.config.outputPaths.types,
    });

    await generator.generateTypes();
  }

  private async generateAPIClient(schemaPath: string): Promise<void> {
    const generator = new APIClientGenerator();
    await generator.generateFromSchema(
      schemaPath,
      this.config.outputPaths.apiClient,
      {
        enableAI: this.config.features.ai,
      }
    );
  }

  private async generateReactHooks(schemaPath: string): Promise<void> {
    const schema = JSON.parse(await readFile(schemaPath, "utf-8"));

    const generator = new ReactHookGenerator(schema, {
      outputDir: this.config.outputPaths.hooks,
      apiClientImportPath: "../services/api",
      typesImportPath: "../types",
      enableAI: this.config.features.ai,
    });

    await generator.generateHooks();
  }

  private async updateDependencies(): Promise<void> {
    const packageJsonPath = join(this.config.webPath, "package.json");
    const packageJson = JSON.parse(await readFile(packageJsonPath, "utf-8"));

    // Ensure required dependencies are present
    const requiredDeps: Record<string, string> = {
      "@tanstack/react-query": "^5.28.0",
      "@tanstack/react-query-devtools": "^5.28.0",
    };

    if (this.config.features.ai) {
      requiredDeps["@ai-sdk/core"] = "^3.0.0";
    }

    if (this.config.features.realtime) {
      requiredDeps["socket.io-client"] = "^4.7.0";
    }

    packageJson.dependencies = {
      ...packageJson.dependencies,
      ...requiredDeps,
    };

    await writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));
  }

  private async generateProviderSetup(): Promise<void> {
    const appPath = join(this.config.webPath, "src", "App.tsx");
    const mainPath = join(this.config.webPath, "src", "main.tsx");

    // Generate provider wrapper
    const providerSetup = `// Generated provider setup - DO NOT EDIT MANUALLY
import React from 'react';
import { FarmQueryProvider, QueryErrorBoundary } from '@farm-stack/ui-components';

interface AppProvidersProps {
  children: React.ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <QueryErrorBoundary>
      <FarmQueryProvider enableDevtools={process.env.NODE_ENV === 'development'}>
        {children}
      </FarmQueryProvider>
    </QueryErrorBoundary>
  );
}
`;

    await writeFile(
      join(this.config.webPath, "src", "providers", "AppProviders.tsx"),
      providerSetup
    );

    // Generate example usage component
    const exampleUsage = `// Example of using generated hooks
import React from 'react';
import { useUsers, useCreateUser } from '../hooks';

export function UsersList() {
  const { data: users, isLoading, error } = useUsers();
  const createUserMutation = useCreateUser();

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  const handleCreateUser = (userData: { name: string; email: string }) => {
    createUserMutation.mutate(userData, {
      onSuccess: () => {
        console.log('User created successfully!');
      },
      onError: (error) => {
        console.error('Failed to create user:', error);
      },
    });
  };

  return (
    <div>
      <h2>Users</h2>
      <ul>
        {users?.map((user) => (
          <li key={user.id}>
            {user.name} - {user.email}
          </li>
        ))}
      </ul>
      <button
        onClick={() => handleCreateUser({ 
          name: 'New User', 
          email: 'user@example.com' 
        })}
        disabled={createUserMutation.isPending}
      >
        {createUserMutation.isPending ? 'Creating...' : 'Add User'}
      </button>
    </div>
  );
}
`;

    await ensureDir(join(this.config.webPath, "src", "examples"));
    await writeFile(
      join(this.config.webPath, "src", "examples", "UsersList.tsx"),
      exampleUsage
    );
  }

  // File watching for development
  async startWatching(): Promise<void> {
    console.log("👀 Starting file watcher for code generation...");

    this.watcher = chokidar.watch(
      [
        join(this.config.apiPath, "src/models/**/*.py"),
        join(this.config.apiPath, "src/routes/**/*.py"),
        join(this.config.apiPath, "src/main.py"),
      ],
      {
        ignoreInitial: true,
        persistent: true,
      }
    );

    let timeout: NodeJS.Timeout;

    this.watcher.on("change", (path) => {
      console.log(`🔄 File changed: ${path}`);

      // Debounce file changes
      clearTimeout(timeout);
      timeout = setTimeout(async () => {
        try {
          await this.runFullGeneration();
          console.log("🔥 Hot reload completed");
        } catch (error) {
          console.error("❌ Hot reload failed:", error);
        }
      }, 1000);
    });

    this.watcher.on("error", (error) => {
      console.error("❌ File watcher error:", error);
    });
  }

  async stopWatching(): Promise<void> {
    if (this.watcher) {
      await this.watcher.close();
      console.log("🛑 File watcher stopped");
    }
  }
}

// CLI integration
export async function runCodeGeneration(configPath: string): Promise<void> {
  const config = JSON.parse(await readFile(configPath, "utf-8"));
  const pipeline = new FarmCodeGenerationPipeline(config);

  await pipeline.runFullGeneration();
}

export async function startCodeGenerationWatcher(
  configPath: string
): Promise<void> {
  const config = JSON.parse(await readFile(configPath, "utf-8"));
  const pipeline = new FarmCodeGenerationPipeline(config);

  await pipeline.startWatching();

  // Keep process alive
  process.on("SIGINT", async () => {
    await pipeline.stopWatching();
    process.exit(0);
  });
}

// Template for farm.config.ts integration
export const FARM_CONFIG_CODEGEN_TEMPLATE = `
// Code generation configuration
export const codegenConfig = {
  apiPath: './apps/api',
  webPath: './apps/web',
  outputPaths: {
    types: './apps/web/src/types',
    apiClient: './apps/web/src/services',
    hooks: './apps/web/src/hooks',
    schemas: './apps/web/src/schemas',
  },
  features: {
    ai: true,
    realtime: false,
    auth: true,
  },
};
`;
