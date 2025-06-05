// tools/codegen/react-hook-generator.ts
import { OpenAPIV3 } from "openapi-types";
import { writeFile, ensureDir, readFile } from "fs-extra";
import { join } from "path";

interface HookGenerationOptions {
  outputDir: string;
  apiClientImportPath: string;
  typesImportPath: string;
  enableAI?: boolean;
}

interface GeneratedHook {
  name: string;
  type: "query" | "mutation" | "infiniteQuery";
  method: string;
  path: string;
  operationId: string;
  requestType?: string;
  responseType: string;
  pathParams?: string[];
  queryParams?: string[];
}

export class ReactHookGenerator {
  private schema: OpenAPIV3.Document;
  private options: HookGenerationOptions;

  constructor(schema: OpenAPIV3.Document, options: HookGenerationOptions) {
    this.schema = schema;
    this.options = options;
  }

  async generateHooks(): Promise<void> {
    const hooks = this.extractHooksFromSchema();
    await this.writeHookFiles(hooks);
  }

  private extractHooksFromSchema(): GeneratedHook[] {
    const hooks: GeneratedHook[] = [];

    for (const [path, pathItem] of Object.entries(this.schema.paths || {})) {
      if (!pathItem) continue;

      for (const [method, operation] of Object.entries(pathItem)) {
        if (
          !operation ||
          typeof operation !== "object" ||
          !("operationId" in operation) ||
          !operation.operationId
        )
          continue;

        const hook = this.createHookFromOperation(
          method as string,
          path,
          operation as OpenAPIV3.OperationObject
        );

        if (hook) {
          hooks.push(hook);
        }
      }
    }

    return hooks;
  }

  private createHookFromOperation(
    method: string,
    path: string,
    operation: OpenAPIV3.OperationObject
  ): GeneratedHook | null {
    const isQuery = method.toLowerCase() === "get";
    const isMutation = ["post", "put", "patch", "delete"].includes(
      method.toLowerCase()
    );

    if (!isQuery && !isMutation) return null;

    const operationId = operation.operationId!;
    const pathParams = this.extractPathParameters(path, operation);
    const queryParams = this.extractQueryParameters(operation);

    return {
      name: this.generateHookName(operationId, isQuery ? "query" : "mutation"),
      type: isQuery ? "query" : "mutation",
      method: method.toLowerCase(),
      path,
      operationId,
      requestType: this.getRequestType(operation),
      responseType: this.getResponseType(operation),
      pathParams,
      queryParams,
    };
  }

  private extractPathParameters(
    path: string,
    operation: OpenAPIV3.OperationObject
  ): string[] {
    const pathParams: string[] = [];
    const pathMatches = path.match(/\{([^}]+)\}/g);

    if (pathMatches) {
      pathParams.push(...pathMatches.map((match) => match.slice(1, -1)));
    }

    return pathParams;
  }

  private extractQueryParameters(
    operation: OpenAPIV3.OperationObject
  ): string[] {
    const queryParams: string[] = [];

    if (operation.parameters) {
      for (const param of operation.parameters) {
        if ("in" in param && param.in === "query") {
          queryParams.push(param.name);
        }
      }
    }

    return queryParams;
  }

  private generateHookName(
    operationId: string,
    type: "query" | "mutation"
  ): string {
    // Convert operationId to hook name
    // e.g., "getUserById" -> "useGetUserById" or "useUser"
    // e.g., "createUser" -> "useCreateUser"

    if (type === "query") {
      // For queries, try to simplify the name
      const simplified = operationId
        .replace(/^(get|fetch|list|find)/, "")
        .replace(/ById$/, "");

      if (simplified && simplified !== operationId) {
        return `use${simplified}`;
      }
    }

    return `use${operationId.charAt(0).toUpperCase()}${operationId.slice(1)}`;
  }

  private getRequestType(
    operation: OpenAPIV3.OperationObject
  ): string | undefined {
    const requestBody = operation.requestBody;
    if (requestBody && "content" in requestBody) {
      const content = requestBody.content;
      const jsonContent = content["application/json"];
      if (jsonContent && jsonContent.schema) {
        return this.getTypeFromSchema(jsonContent.schema);
      }
    }
    return undefined;
  }

  private getResponseType(operation: OpenAPIV3.OperationObject): string {
    const responses = operation.responses;
    const successResponse =
      responses["200"] || responses["201"] || responses["204"];

    if (successResponse && "content" in successResponse) {
      const content = successResponse.content;
      const jsonContent = content?.["application/json"];
      if (jsonContent && jsonContent.schema) {
        return this.getTypeFromSchema(jsonContent.schema);
      }
    }

    return "unknown";
  }

  private getTypeFromSchema(schema: any): string {
    if (schema.$ref) {
      // Extract type name from $ref
      const refParts = schema.$ref.split("/");
      return refParts[refParts.length - 1];
    }

    if (schema.type === "array" && schema.items) {
      const itemType = this.getTypeFromSchema(schema.items);
      return `${itemType}[]`;
    }

    return schema.type || "unknown";
  }

  private async writeHookFiles(hooks: GeneratedHook[]): Promise<void> {
    await ensureDir(this.options.outputDir);

    // Group hooks by resource/domain
    const hookGroups = this.groupHooksByDomain(hooks);

    // Generate main hooks index file
    await this.writeHooksIndex(hookGroups);

    // Generate domain-specific hook files
    for (const [domain, domainHooks] of Object.entries(hookGroups)) {
      await this.writeDomainHooks(domain, domainHooks);
    }

    // Generate AI-specific hooks if AI is enabled
    if (this.options.enableAI) {
      await this.writeAIHooks();
    }
  }

  private groupHooksByDomain(
    hooks: GeneratedHook[]
  ): Record<string, GeneratedHook[]> {
    const groups: Record<string, GeneratedHook[]> = {};

    for (const hook of hooks) {
      const domain = this.extractDomainFromPath(hook.path);
      if (!groups[domain]) {
        groups[domain] = [];
      }
      groups[domain].push(hook);
    }

    return groups;
  }

  private extractDomainFromPath(path: string): string {
    // Extract domain from path like /api/users/{id} -> users
    const parts = path
      .split("/")
      .filter((part) => part && !part.startsWith("{"));
    return parts[parts.length - 1] || "general";
  }

  private async writeHooksIndex(
    hookGroups: Record<string, GeneratedHook[]>
  ): Promise<void> {
    const content = `// Generated React hooks - DO NOT EDIT MANUALLY
import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import type * as Types from '${this.options.typesImportPath}';

// Re-export domain-specific hooks
${Object.keys(hookGroups)
  .map((domain) => `export * from './${domain}';`)
  .join("\n")}

// Common hook types
export interface QueryConfig<TData = unknown> extends Omit<UseQueryOptions<TData>, 'queryKey' | 'queryFn'> {}
export interface MutationConfig<TData = unknown, TVariables = unknown> extends Omit<UseMutationOptions<TData, Error, TVariables>, 'mutationFn'> {}

// Query key factory
export const queryKeys = {
  all: ['api'] as const,
  ${Object.keys(hookGroups)
    .map(
      (domain) => `${domain}: () => [...queryKeys.all, '${domain}'] as const,`
    )
    .join("\n  ")}
};
`;

    await writeFile(join(this.options.outputDir, "index.ts"), content);
  }

  private async writeDomainHooks(
    domain: string,
    hooks: GeneratedHook[]
  ): Promise<void> {
    const queryHooks = hooks.filter((h) => h.type === "query");
    const mutationHooks = hooks.filter((h) => h.type === "mutation");

    const content = `// Generated ${domain} hooks - DO NOT EDIT MANUALLY
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ${domain}Api } from '${this.options.apiClientImportPath}';
import type * as Types from '${this.options.typesImportPath}';
import { queryKeys, type QueryConfig, type MutationConfig } from './index';

${this.generateQueryHooks(domain, queryHooks)}

${this.generateMutationHooks(domain, mutationHooks)}
`;

    await writeFile(join(this.options.outputDir, `${domain}.ts`), content);
  }

  private generateQueryHooks(domain: string, hooks: GeneratedHook[]): string {
    return hooks
      .map((hook) => {
        const hasPathParams = hook.pathParams && hook.pathParams.length > 0;
        const hasQueryParams = hook.queryParams && hook.queryParams.length > 0;

        let paramType = "";
        let queryKeyParams = "";
        let apiCallParams = "";

        if (hasPathParams || hasQueryParams) {
          const pathParamTypes =
            hook.pathParams?.map((param) => `${param}: string`).join(", ") ||
            "";
          const queryParamTypes =
            hook.queryParams?.map((param) => `${param}?: unknown`).join(", ") ||
            "";

          const allParams = [pathParamTypes, queryParamTypes]
            .filter(Boolean)
            .join(", ");
          paramType = `params: { ${allParams} }`;

          if (hasPathParams) {
            apiCallParams = hook
              .pathParams!.map((param) => `params.${param}`)
              .join(", ");
            queryKeyParams = `[${hook
              .pathParams!.map((param) => `params.${param}`)
              .join(", ")}]`;
          }

          if (hasQueryParams) {
            const queryParamsObj = `{ ${hook
              .queryParams!.map((param) => `${param}: params.${param}`)
              .join(", ")} }`;
            apiCallParams = apiCallParams
              ? `${apiCallParams}, ${queryParamsObj}`
              : queryParamsObj;
          }
        }

        return `
// ${hook.operationId}
export function ${hook.name}(
  ${paramType}${paramType ? ", " : ""}options?: QueryConfig<Types.${
          hook.responseType
        }>
) {
  return useQuery({
    queryKey: [...queryKeys.${domain}()${
          queryKeyParams ? `, ${queryKeyParams}` : ""
        }],
    queryFn: () => ${domain}Api.${hook.operationId}(${apiCallParams}),
    ...options,
  });
}`;
      })
      .join("\n");
  }

  private generateMutationHooks(
    domain: string,
    hooks: GeneratedHook[]
  ): string {
    const content = hooks
      .map((hook) => {
        const hasRequest = hook.requestType && hook.requestType !== "unknown";
        const requestTypeParam = hasRequest
          ? `data: Types.${hook.requestType}`
          : "";

        const hasPathParams = hook.pathParams && hook.pathParams.length > 0;
        let variablesType = "";

        if (hasPathParams && hasRequest) {
          const pathParamTypes = hook
            .pathParams!.map((param) => `${param}: string`)
            .join(", ");
          variablesType = `{ ${pathParamTypes}, data: Types.${hook.requestType} }`;
        } else if (hasPathParams) {
          const pathParamTypes = hook
            .pathParams!.map((param) => `${param}: string`)
            .join(", ");
          variablesType = `{ ${pathParamTypes} }`;
        } else if (hasRequest) {
          variablesType = `Types.${hook.requestType}`;
        } else {
          variablesType = "void";
        }

        return `
// ${hook.operationId}
export function ${hook.name}(options?: MutationConfig<Types.${
          hook.responseType
        }, ${variablesType}>) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ${this.generateMutationFunction(hook)},
    onSuccess: (data, variables) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: queryKeys.${domain}() });
      options?.onSuccess?.(data, variables);
    },
    ...options,
  });
}`;
      })
      .join("\n");

    return content;
  }

  private generateMutationFunction(hook: GeneratedHook): string {
    const hasRequest = hook.requestType && hook.requestType !== "unknown";
    const hasPathParams = hook.pathParams && hook.pathParams.length > 0;

    if (hasPathParams && hasRequest) {
      return `(variables) => ${this.extractDomainFromPath(hook.path)}Api.${
        hook.operationId
      }(${hook
        .pathParams!.map((param) => `variables.${param}`)
        .join(", ")}, variables.data)`;
    } else if (hasPathParams) {
      return `(variables) => ${this.extractDomainFromPath(hook.path)}Api.${
        hook.operationId
      }(${hook.pathParams!.map((param) => `variables.${param}`).join(", ")})`;
    } else if (hasRequest) {
      return `(data) => ${this.extractDomainFromPath(hook.path)}Api.${
        hook.operationId
      }(data)`;
    } else {
      return `() => ${this.extractDomainFromPath(hook.path)}Api.${
        hook.operationId
      }()`;
    }
  }

  private async writeAIHooks(): Promise<void> {
    const aiHooksContent = `// Generated AI hooks - DO NOT EDIT MANUALLY
import { useState, useCallback, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { aiApi } from '${this.options.apiClientImportPath}';
import type * as Types from '${this.options.typesImportPath}';
import { queryKeys, type QueryConfig, type MutationConfig } from './index';

// Streaming chat hook
export function useStreamingChat(options?: {
  provider?: 'ollama' | 'openai' | 'huggingface';
  model?: string;
  initialMessages?: Types.ChatMessage[];
  onMessage?: (message: Types.ChatMessage) => void;
  onError?: (error: Error) => void;
}) {
  const [messages, setMessages] = useState<Types.ChatMessage[]>(options?.initialMessages || []);
  const [isStreaming, setIsStreaming] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  const sendMessage = useCallback(async (content: string, messageOptions?: Partial<Types.ChatRequest>) => {
    const userMessage: Types.ChatMessage = { role: 'user', content };
    setMessages(prev => [...prev, userMessage]);
    setIsStreaming(true);

    try {
      const request: Types.ChatRequest = {
        messages: [...messages, userMessage],
        model: options?.model || 'llama3.1',
        provider: options?.provider || 'ollama',
        stream: true,
        ...messageOptions,
      };

      const eventSource = aiApi.chatStream(request);
      eventSourceRef.current = eventSource;

      let assistantMessage = '';
      let hasStartedResponse = false;

      eventSource.onmessage = (event) => {
        if (event.data === '[DONE]') {
          setIsStreaming(false);
          eventSource.close();
          return;
        }

        try {
          const data = JSON.parse(event.data);
          if (data.content) {
            assistantMessage += data.content;
            
            setMessages(prev => {
              const newMessages = [...prev];
              
              if (!hasStartedResponse) {
                // Add new assistant message
                newMessages.push({ role: 'assistant', content: assistantMessage });
                hasStartedResponse = true;
              } else {
                // Update existing assistant message
                const lastMessage = newMessages[newMessages.length - 1];
                if (lastMessage?.role === 'assistant') {
                  lastMessage.content = assistantMessage;
                }
              }
              
              return newMessages;
            });

            // Call onMessage callback for each chunk
            options?.onMessage?.({ role: 'assistant', content: data.content });
          }
        } catch (error) {
          console.error('Failed to parse streaming data:', error);
        }
      };

      eventSource.onerror = (error) => {
        setIsStreaming(false);
        eventSource.close();
        const errorMessage = new Error('Streaming connection failed');
        options?.onError?.(errorMessage);
      };

    } catch (error) {
      setIsStreaming(false);
      options?.onError?.(error as Error);
    }
  }, [messages, options]);

  const stopStreaming = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
      setIsStreaming(false);
    }
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  return {
    messages,
    sendMessage,
    isStreaming,
    stopStreaming,
    clearMessages,
  };
}

// AI models hook
export function useAIModels(provider?: 'ollama' | 'openai' | 'huggingface', options?: QueryConfig<Types.ModelInfo[]>) {
  return useQuery({
    queryKey: [...queryKeys.all, 'ai-models', provider],
    queryFn: () => aiApi.listModels(provider),
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
}

// AI provider health hook
export function useAIProviderHealth(options?: QueryConfig<Record<string, Types.ProviderStatus>>) {
  return useQuery({
    queryKey: [...queryKeys.all, 'ai-health'],
    queryFn: () => aiApi.healthCheck(),
    refetchInterval: 30000, // Check every 30 seconds
    ...options,
  });
}

// AI chat mutation (non-streaming)
export function useAIChat(options?: MutationConfig<Types.ChatResponse, Types.ChatRequest>) {
  return useMutation({
    mutationFn: (request: Types.ChatRequest) => aiApi.chat(request),
    ...options,
  });
}

// Load AI model hook
export function useLoadAIModel(options?: MutationConfig<{message: string}, {modelName: string; provider?: string}>) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (variables) => aiApi.loadModel(variables.modelName, variables.provider),
    onSuccess: (data, variables) => {
      // Invalidate models query to refresh available models
      queryClient.invalidateQueries({ queryKey: [...queryKeys.all, 'ai-models'] });
      options?.onSuccess?.(data, variables);
    },
    ...options,
  });
}

// Custom hook for AI configuration
export function useAIConfig() {
  const healthQuery = useAIProviderHealth();
  const ollamaModels = useAIModels('ollama');
  const openaiModels = useAIModels('openai');

  return {
    health: healthQuery.data,
    isLoading: healthQuery.isLoading || ollamaModels.isLoading || openaiModels.isLoading,
    error: healthQuery.error || ollamaModels.error || openaiModels.error,
    providers: {
      ollama: {
        status: healthQuery.data?.ollama?.status,
        models: ollamaModels.data || [],
      },
      openai: {
        status: healthQuery.data?.openai?.status,
        models: openaiModels.data || [],
      },
    },
    refetch: () => {
      healthQuery.refetch();
      ollamaModels.refetch();
      openaiModels.refetch();
    },
  };
}
`;

    await writeFile(join(this.options.outputDir, "ai.ts"), aiHooksContent);
  }
}

// CLI integration
export async function generateReactHooks(
  schemaPath: string,
  outputDir: string,
  options: Partial<HookGenerationOptions> = {}
): Promise<void> {
  const schema = JSON.parse(await readFile(schemaPath, "utf-8"));

  const generator = new ReactHookGenerator(schema, {
    outputDir,
    apiClientImportPath: "../services/api",
    typesImportPath: "../types",
    ...options,
  });

  await generator.generateHooks();
  console.log("✅ React hooks generated successfully");
}
