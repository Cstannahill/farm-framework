// tools/codegen/src/cli-integration.ts
import { promises as fs } from "fs";
import path from "path";
import { spawn } from "child_process";
import chokidar from "chokidar";
import { OpenAPIV3 } from "openapi-types";
import {
  ApiMethodGenerator,
  generateApiClientFromSchema,
} from "./method-generator";
import {
  TypeGenerator,
  generateTypesFromSchema,
  commonTypes,
} from "./type-generator";
import { getErrorMessage } from "@farm/cli";

export interface CodegenConfig {
  apiPath: string; // Path to FastAPI main.py
  outputDir: string; // Output directory for generated files
  typesDir: string; // Types directory
  servicesDir: string; // Services directory
  schemaFile: string; // Cached schema file location
  watch: boolean; // Enable file watching
  verbose: boolean; // Verbose logging
}

export class FarmCodeGenerator {
  private config: CodegenConfig;
  private watcher?: chokidar.FSWatcher;
  private isGenerating = false;

  constructor(config: Partial<CodegenConfig> = {}) {
    this.config = {
      apiPath: path.resolve("apps/api/src/main.py"),
      outputDir: path.resolve("apps/web/src"),
      typesDir: path.resolve("apps/web/src/types"),
      servicesDir: path.resolve("apps/web/src/services"),
      schemaFile: path.resolve(".farm/openapi-schema.json"),
      watch: false,
      verbose: false,
      ...config,
    };
  }

  async generate(): Promise<void> {
    if (this.isGenerating) {
      this.log("Generation already in progress, skipping...");
      return;
    }

    this.isGenerating = true;

    try {
      this.log("🏗️  Starting FARM code generation...");

      // Extract OpenAPI schema from FastAPI
      const schema = await this.extractOpenAPISchema();

      // Cache the schema
      await this.cacheSchema(schema);

      // Generate TypeScript types
      await this.generateTypes(schema);

      // Generate API client
      await this.generateApiClient(schema);

      // Generate React hooks
      await this.generateReactHooks(schema);

      // Update package exports
      await this.updatePackageExports();

      this.log("✅ Code generation completed successfully!");
    } catch (error) {
      this.log(`❌ Code generation failed: ${getErrorMessage(error)}`);
      if (this.config.verbose) {
        console.error(error);
      }
      throw error;
    } finally {
      this.isGenerating = false;
    }
  }

  async startWatching(): Promise<void> {
    if (this.watcher) {
      this.log("File watcher already running");
      return;
    }

    this.log("👀 Starting file watcher for automatic code generation...");

    // Watch Python files in the API directory
    this.watcher = chokidar.watch(
      [
        "apps/api/src/**/*.py",
        "apps/api/src/models/**/*.py",
        "apps/api/src/routes/**/*.py",
      ],
      {
        ignoreInitial: true,
        persistent: true,
      }
    );

    let debounceTimer: NodeJS.Timeout;

    this.watcher.on("change", (filePath) => {
      this.log(`📝 File changed: ${filePath}`);

      // Debounce changes to avoid excessive regeneration
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        this.generate().catch((error) => {
          this.log(`⚠️ Auto-generation failed: ${error.message}`);
        });
      }, 1000);
    });

    this.watcher.on("add", (filePath) => {
      this.log(`➕ File added: ${filePath}`);
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        this.generate().catch((error) => {
          this.log(`⚠️ Auto-generation failed: ${error.message}`);
        });
      }, 1000);
    });

    this.watcher.on("unlink", (filePath) => {
      this.log(`➖ File removed: ${filePath}`);
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        this.generate().catch((error) => {
          this.log(`⚠️ Auto-generation failed: ${error.message}`);
        });
      }, 1000);
    });

    this.watcher.on("error", (error) => {
      this.log(`❌ File watcher error: ${error.message}`);
    });
  }

  async stopWatching(): Promise<void> {
    if (this.watcher) {
      await this.watcher.close();
      this.watcher = undefined;
      this.log("⏹️  File watcher stopped");
    }
  }

  private async extractOpenAPISchema(): Promise<OpenAPIV3.Document> {
    this.log("📡 Extracting OpenAPI schema from FastAPI...");

    // Start the FastAPI server temporarily to extract schema
    const serverPort = await this.findFreePort(8001);
    const serverProcess = spawn(
      "uvicorn",
      [
        "src.main:app",
        "--host",
        "0.0.0.0",
        "--port",
        serverPort.toString(),
        "--reload=false",
      ],
      {
        cwd: path.dirname(this.config.apiPath),
        stdio: this.config.verbose ? "inherit" : "pipe",
      }
    );

    try {
      // Wait for server to start
      await this.waitForServer(`http://localhost:${serverPort}/health`, 30000);

      // Fetch OpenAPI schema
      const response = await fetch(
        `http://localhost:${serverPort}/openapi.json`
      );
      if (!response.ok) {
        throw new Error(
          `Failed to fetch OpenAPI schema: ${response.statusText}`
        );
      }

      const schema = (await response.json()) as OpenAPIV3.Document;
      this.log(
        `✅ Schema extracted (${
          Object.keys(schema.paths || {}).length
        } endpoints)`
      );

      return schema;
    } finally {
      // Clean up server process
      serverProcess.kill("SIGTERM");

      // Wait a bit for graceful shutdown
      await new Promise((resolve) => setTimeout(resolve, 1000));

      if (!serverProcess.killed) {
        serverProcess.kill("SIGKILL");
      }
    }
  }

  private async cacheSchema(schema: OpenAPIV3.Document): Promise<void> {
    this.log("💾 Caching OpenAPI schema...");

    await fs.mkdir(path.dirname(this.config.schemaFile), { recursive: true });
    await fs.writeFile(this.config.schemaFile, JSON.stringify(schema, null, 2));
  }

  private async generateTypes(schema: OpenAPIV3.Document): Promise<void> {
    this.log("🔧 Generating TypeScript types...");

    const generator = new TypeGenerator(schema);
    const typesCode = generateTypesFromSchema(schema);

    // Ensure types directory exists
    await fs.mkdir(this.config.typesDir, { recursive: true });

    // Write generated types
    await fs.writeFile(path.join(this.config.typesDir, "api.ts"), typesCode);

    // Write common types
    await fs.writeFile(
      path.join(this.config.typesDir, "common.ts"),
      commonTypes
    );

    // Write types index file
    const indexContent = `// Auto-generated type exports
export * from './api';
export * from './common';
`;

    await fs.writeFile(
      path.join(this.config.typesDir, "index.ts"),
      indexContent
    );

    this.log(`✅ Types generated in ${this.config.typesDir}`);
  }

  private async generateApiClient(schema: OpenAPIV3.Document): Promise<void> {
    this.log("🔌 Generating API client...");

    const clientCode = generateApiClientFromSchema(schema);

    // Ensure services directory exists
    await fs.mkdir(this.config.servicesDir, { recursive: true });

    // Write API client
    await fs.writeFile(
      path.join(this.config.servicesDir, "api.ts"),
      clientCode
    );

    this.log(`✅ API client generated in ${this.config.servicesDir}`);
  }

  private async generateReactHooks(schema: OpenAPIV3.Document): Promise<void> {
    this.log("🪝 Generating React hooks...");

    const generator = new ApiMethodGenerator(schema);
    const client = generator.generateApiClient();

    // Generate React Query hooks
    const hooksCode = this.generateReactQueryHooks(client);

    // Write hooks file
    await fs.writeFile(
      path.join(this.config.servicesDir, "hooks.ts"),
      hooksCode
    );

    this.log(`✅ React hooks generated in ${this.config.servicesDir}`);
  }

  private generateReactQueryHooks(client: any): string {
    return `// Auto-generated React hooks for API operations
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import api from './api';
import type * as Types from '../types';

// Authentication hooks
export function useLogin() {
  return useMutation({
    mutationFn: api.auth.login,
    onSuccess: (response) => {
      // Store auth token
      localStorage.setItem('auth_token', response.data.accessToken);
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: api.auth.logout,
    onSuccess: () => {
      localStorage.removeItem('auth_token');
      queryClient.clear();
    },
  });
}

export function useProfile() {
  return useQuery({
    queryKey: ['auth', 'profile'],
    queryFn: () => api.auth.getProfile(),
    retry: false,
  });
}

// User hooks
export function useUsers(params?: { page?: number; size?: number; search?: string }) {
  return useQuery({
    queryKey: ['users', params],
    queryFn: () => api.users.listUsers(params),
  });
}

export function useUser(id: string) {
  return useQuery({
    queryKey: ['users', id],
    queryFn: () => api.users.getUserById(id),
    enabled: !!id,
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: api.users.createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Types.UpdateUserRequest }) =>
      api.users.updateUser(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['users', id] });
    },
  });
}

// AI hooks with provider support
export function useAIChat(defaultProvider: 'ollama' | 'openai' = 'ollama') {
  return useMutation({
    mutationFn: ({ request, provider = defaultProvider }: { 
      request: Types.ChatRequest; 
      provider?: 'ollama' | 'openai' | 'huggingface' 
    }) => api.ai.chat(request, provider),
  });
}

export function useStreamingChat(defaultProvider: 'ollama' | 'openai' = 'ollama') {
  const [messages, setMessages] = useState<Types.ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = async (
    content: string, 
    options: {
      model?: string;
      provider?: 'ollama' | 'openai' | 'huggingface';
      temperature?: number;
    } = {}
  ) => {
    const userMessage: Types.ChatMessage = {
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsStreaming(true);
    setError(null);

    try {
      const eventSource = api.ai.chatStream({
        messages: [...messages, userMessage],
        model: options.model || 'llama3.1',
        temperature: options.temperature || 0.7,
      }, options.provider || defaultProvider);

      let assistantMessage = '';

      eventSource.onmessage = (event) => {
        if (event.data === '[DONE]') {
          setIsStreaming(false);
          eventSource.close();
          return;
        }

        try {
          const data = JSON.parse(event.data);
          assistantMessage += data.content;

          setMessages(prev => {
            const newMessages = [...prev];
            const lastMessage = newMessages[newMessages.length - 1];

            if (lastMessage?.role === 'assistant') {
              lastMessage.content = assistantMessage;
            } else {
              newMessages.push({
                role: 'assistant',
                content: assistantMessage,
                timestamp: new Date().toISOString(),
              });
            }

            return newMessages;
          });
        } catch (parseError) {
          console.error('Failed to parse streaming response:', parseError);
        }
      };

      eventSource.onerror = (error) => {
        setIsStreaming(false);
        setError('Connection error occurred');
        eventSource.close();
      };

    } catch (error) {
      setIsStreaming(false);
      setError(error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const clearMessages = () => {
    setMessages([]);
    setError(null);
  };

  return {
    messages,
    sendMessage,
    isStreaming,
    error,
    clearMessages,
  };
}

export function useAIModels(provider?: 'ollama' | 'openai' | 'huggingface') {
  return useQuery({
    queryKey: ['ai', 'models', provider],
    queryFn: () => api.ai.listModels(provider),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useAIHealth() {
  return useQuery({
    queryKey: ['ai', 'health'],
    queryFn: () => api.ai.healthCheck(),
    refetchInterval: 30000, // 30 seconds
  });
}

export function useLoadModel() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ modelName, provider }: { modelName: string; provider?: string }) =>
      api.ai.loadModel(modelName, provider),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai', 'models'] });
      queryClient.invalidateQueries({ queryKey: ['ai', 'health'] });
    },
  });
}

// File upload hooks
export function useFileUpload() {
  return useMutation({
    mutationFn: ({ file, metadata }: { file: File; metadata?: Types.FileMetadata }) =>
      api.files.uploadFile(file, metadata),
  });
}

export function useFiles(params?: { page?: number; size?: number; type?: string }) {
  return useQuery({
    queryKey: ['files', params],
    queryFn: () => api.files.listFiles(params),
  });
}

// Conversation hooks
export function useConversations(params?: { page?: number; size?: number }) {
  return useQuery({
    queryKey: ['conversations', params],
    queryFn: () => api.conversations.listConversations(params),
  });
}

export function useConversation(id: string) {
  return useQuery({
    queryKey: ['conversations', id],
    queryFn: () => api.conversations.getConversationById(id),
    enabled: !!id,
  });
}

export function useCreateConversation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: api.conversations.createConversation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

// Analytics hooks
export function useDashboardMetrics(params?: { period?: 'day' | 'week' | 'month' }) {
  return useQuery({
    queryKey: ['analytics', 'dashboard', params],
    queryFn: () => api.analytics.getDashboardMetrics(params),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

export function useConversationAnalytics(params?: { period?: 'day' | 'week' | 'month' }) {
  return useQuery({
    queryKey: ['analytics', 'conversations', params],
    queryFn: () => api.analytics.getConversationAnalytics(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
`;
  }

  private async updatePackageExports(): Promise<void> {
    this.log("📦 Updating package exports...");

    // Update package.json exports if needed
    // This would add the generated files to the package exports
    // Implementation depends on the specific package structure
  }

  private async waitForServer(url: string, timeout: number): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      try {
        const response = await fetch(url);
        if (response.ok) {
          return;
        }
      } catch {
        // Server not ready yet
      }

      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    throw new Error(`Server did not start within ${timeout}ms`);
  }

  private async findFreePort(startPort: number): Promise<number> {
    // Simple port finding logic - in a real implementation,
    // you'd want to use a proper port-finding library
    return startPort;
  }

  private log(message: string): void {
    if (this.config.verbose || process.env.FARM_VERBOSE === "true") {
      console.log(`[FARM Codegen] ${message}`);
    }
  }
}

// CLI command implementation
export async function codegenCommand(options: {
  watch?: boolean;
  verbose?: boolean;
  outputDir?: string;
}): Promise<void> {
  const generator = new FarmCodeGenerator({
    watch: options.watch || false,
    verbose: options.verbose || false,
    outputDir: options.outputDir,
  });

  if (options.watch) {
    // Run initial generation
    await generator.generate();

    // Start watching for changes
    await generator.startWatching();

    // Keep the process running
    process.on("SIGINT", async () => {
      console.log("\n⏹️  Stopping code generation...");
      await generator.stopWatching();
      process.exit(0);
    });

    console.log("Press Ctrl+C to stop watching");

    // Keep process alive
    await new Promise(() => {});
  } else {
    // Run generation once
    await generator.generate();
  }
}
