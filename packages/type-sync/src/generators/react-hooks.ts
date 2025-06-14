import fs from "fs-extra";
import path from "path";
import crypto from "crypto";
import type { OpenAPISchema } from "@farm-framework/types";

export interface ReactHookGeneratorOptions {
  outputDir: string;
  apiClientImportPath?: string;
  typesImportPath?: string;
  enableAI?: boolean;
  enableInfiniteQueries?: boolean;
  enableOptimisticUpdates?: boolean;
}

export interface GenerationResult {
  path: string;
  content?: string;
  size?: number;
  checksum?: string;
  generatedAt?: Date;
  type?: string;
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

/**
 * Generates typed React hooks for interacting with the generated API client.
 */
export class ReactHookGenerator {
  private options: ReactHookGeneratorOptions;

  constructor(options?: Partial<ReactHookGeneratorOptions>) {
    this.options = {
      outputDir: "./src/hooks",
      apiClientImportPath: "../api/client",
      typesImportPath: "../api/types",
      enableAI: false,
      enableInfiniteQueries: true,
      enableOptimisticUpdates: true,
      ...options,
    };
  }

  /**
   * Generate hook source files.
   *
   * @param schema - Parsed OpenAPI schema
   * @param opts - Generation options
   * @returns Path to the generated file
   */
  async generate(
    schema: OpenAPISchema,
    opts: ReactHookGeneratorOptions
  ): Promise<GenerationResult> {
    const finalOpts = { ...this.options, ...opts };
    await fs.ensureDir(finalOpts.outputDir);

    const hooks = this.extractHooksFromSchema(schema, finalOpts);
    const content = this.generateHooksContent(hooks, finalOpts);
    const outPath = path.join(finalOpts.outputDir, "hooks.ts");

    await fs.writeFile(outPath, content);

    return {
      path: outPath,
      content,
      size: content.length,
      checksum: this.generateChecksum(content),
      generatedAt: new Date(),
      type: "react-hooks",
    };
  }

  private extractHooksFromSchema(
    schema: OpenAPISchema,
    opts: ReactHookGeneratorOptions
  ): GeneratedHook[] {
    const hooks: GeneratedHook[] = [];

    if (schema.paths) {
      for (const [path, pathItem] of Object.entries(schema.paths)) {
        if (!pathItem) continue;

        for (const [method, operation] of Object.entries(pathItem)) {
          if (!operation || typeof operation !== "object") continue;

          // Skip AI-specific endpoints if AI is not enabled
          if (!opts.enableAI && this.isAIEndpoint(path, operation)) {
            continue;
          }

          const hook = this.createHookFromOperation(
            method,
            path,
            operation as any,
            opts
          );
          if (hook) {
            hooks.push(hook);
          }
        }
      }
    }

    return hooks;
  }

  private createHookFromOperation(
    method: string,
    path: string,
    operation: any,
    opts: ReactHookGeneratorOptions
  ): GeneratedHook | null {
    const isQuery = method.toLowerCase() === "get";
    const isMutation = ["post", "put", "patch", "delete"].includes(
      method.toLowerCase()
    );

    if (!isQuery && !isMutation) return null;

    const operationId =
      operation.operationId || this.generateOperationId(method, path);
    const pathParams = this.extractPathParameters(path);
    const queryParams = this.extractQueryParameters(operation);

    // Determine if this should be an infinite query
    const isInfiniteQuery =
      isQuery &&
      opts.enableInfiniteQueries &&
      this.isInfiniteQueryCandidate(operation, path);

    return {
      name: this.generateHookName(
        operationId,
        isInfiniteQuery ? "infiniteQuery" : isQuery ? "query" : "mutation"
      ),
      type: isInfiniteQuery ? "infiniteQuery" : isQuery ? "query" : "mutation",
      method: method.toLowerCase(),
      path,
      operationId,
      requestType: this.getRequestType(operation),
      responseType: this.getResponseType(operation),
      pathParams,
      queryParams,
    };
  }

  private generateHooksContent(
    hooks: GeneratedHook[],
    opts: ReactHookGeneratorOptions
  ): string {
    let content = this.generateImports(opts);
    content += "\n\n";

    // Group hooks by domain/resource
    const hookGroups = this.groupHooksByDomain(hooks);

    for (const [domain, domainHooks] of hookGroups) {
      content += `// ${domain} hooks\n`;

      for (const hook of domainHooks) {
        content += this.generateHookImplementation(hook, opts);
        content += "\n";
      }

      content += "\n";
    }

    return content;
  }

  private generateImports(opts: ReactHookGeneratorOptions): string {
    let imports = `import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';\n`;

    if (opts.apiClientImportPath) {
      imports += `import { APIClient } from '${opts.apiClientImportPath}';\n`;
    }

    if (opts.typesImportPath) {
      imports += `import * as Types from '${opts.typesImportPath}';\n`;
    }

    imports += `\n// Create a default API client instance\n`;
    imports += `const apiClient = new APIClient();\n`;

    return imports;
  }

  private generateHookImplementation(
    hook: GeneratedHook,
    opts: ReactHookGeneratorOptions
  ): string {
    switch (hook.type) {
      case "query":
        return this.generateQueryHook(hook, opts);
      case "infiniteQuery":
        return this.generateInfiniteQueryHook(hook, opts);
      case "mutation":
        return this.generateMutationHook(hook, opts);
      default:
        return "";
    }
  }

  private generateQueryHook(
    hook: GeneratedHook,
    opts: ReactHookGeneratorOptions
  ): string {
    const params = this.generateHookParameters(hook);
    const queryKey = this.generateQueryKey(hook);
    const queryFn = this.generateQueryFunction(hook);

    let hookContent = `export function ${hook.name}(${params}) {\n`;
    hookContent += `  return useQuery({\n`;
    hookContent += `    queryKey: ${queryKey},\n`;
    hookContent += `    queryFn: ${queryFn},\n`;

    // Add conditional enabling for hooks with required parameters
    if (hook.pathParams && hook.pathParams.length > 0) {
      const enabledCondition = hook.pathParams
        .map((param) => `!!${param}`)
        .join(" && ");
      hookContent += `    enabled: ${enabledCondition},\n`;
    }

    hookContent += `    ...options,\n`;
    hookContent += `  });\n`;
    hookContent += `}\n`;

    return hookContent;
  }

  private generateInfiniteQueryHook(
    hook: GeneratedHook,
    opts: ReactHookGeneratorOptions
  ): string {
    const params = this.generateHookParameters(hook);
    const queryKey = this.generateQueryKey(hook);

    let hookContent = `export function ${hook.name}(${params}) {\n`;
    hookContent += `  return useInfiniteQuery({\n`;
    hookContent += `    queryKey: ${queryKey},\n`;
    hookContent += `    queryFn: ({ pageParam = 1 }) => apiClient.${hook.operationId}({ ...params, page: pageParam }),\n`;
    hookContent += `    getNextPageParam: (lastPage, allPages) => {\n`;
    hookContent += `      // Adjust based on your pagination response structure\n`;
    hookContent += `      return lastPage.hasNext ? allPages.length + 1 : undefined;\n`;
    hookContent += `    },\n`;
    hookContent += `    ...options,\n`;
    hookContent += `  });\n`;
    hookContent += `}\n`;

    return hookContent;
  }

  private generateMutationHook(
    hook: GeneratedHook,
    opts: ReactHookGeneratorOptions
  ): string {
    const params = this.generateMutationParameters(hook);
    const mutationFn = this.generateMutationFunction(hook);

    let hookContent = `export function ${hook.name}(${params}) {\n`;
    hookContent += `  const queryClient = useQueryClient();\n\n`;
    hookContent += `  return useMutation({\n`;
    hookContent += `    mutationFn: ${mutationFn},\n`;

    if (opts.enableOptimisticUpdates) {
      hookContent += this.generateOptimisticUpdates(hook);
    }

    hookContent += `    onSuccess: (data, variables, context) => {\n`;
    hookContent += `      // Invalidate and refetch related queries\n`;
    hookContent += `      ${this.generateInvalidationLogic(hook)}\n`;
    hookContent += `      if (options?.onSuccess) options.onSuccess(data, variables, context);\n`;
    hookContent += `    },\n`;
    hookContent += `    ...options,\n`;
    hookContent += `  });\n`;
    hookContent += `}\n`;

    return hookContent;
  }

  private generateHookParameters(hook: GeneratedHook): string {
    const params: string[] = [];

    // Path parameters
    if (hook.pathParams && hook.pathParams.length > 0) {
      for (const param of hook.pathParams) {
        params.push(`${param}: string | number`);
      }
    }

    // Query parameters
    if (hook.queryParams && hook.queryParams.length > 0) {
      params.push(
        `params?: { ${hook.queryParams.map((p) => `${p}?: any`).join("; ")} }`
      );
    }

    // Options parameter
    params.push(
      `options?: Omit<Parameters<typeof useQuery>[0], 'queryKey' | 'queryFn'>`
    );

    return params.join(", ");
  }

  private generateMutationParameters(hook: GeneratedHook): string {
    const params: string[] = [];

    // Options parameter for mutations
    params.push(
      `options?: Omit<Parameters<typeof useMutation>[0], 'mutationFn'>`
    );

    return params.join(", ");
  }

  private generateQueryKey(hook: GeneratedHook): string {
    const keyParts = [hook.operationId];

    if (hook.pathParams && hook.pathParams.length > 0) {
      keyParts.push(...hook.pathParams);
    }

    if (hook.queryParams && hook.queryParams.length > 0) {
      keyParts.push("params");
    }

    return `[${keyParts.map((part) => `'${part}'`).join(", ")}]`;
  }

  private generateQueryFunction(hook: GeneratedHook): string {
    const callParams: string[] = [];

    if (hook.pathParams && hook.pathParams.length > 0) {
      callParams.push(...hook.pathParams);
    }

    if (hook.queryParams && hook.queryParams.length > 0) {
      callParams.push("params");
    }

    return `() => apiClient.${hook.operationId}(${callParams.join(", ")})`;
  }

  private generateMutationFunction(hook: GeneratedHook): string {
    let params = "";

    if (hook.requestType) {
      params = `(data: ${hook.requestType})`;
    } else {
      params = "(variables: any)";
    }

    return `${params} => apiClient.${hook.operationId}(${hook.requestType ? "data" : "variables"})`;
  }

  private generateOptimisticUpdates(hook: GeneratedHook): string {
    return (
      `    onMutate: async (newData) => {\n` +
      `      // Cancel any outgoing refetches so they don't overwrite optimistic update\n` +
      `      await queryClient.cancelQueries({ queryKey: ['${hook.operationId}'] });\n` +
      `      \n` +
      `      // Snapshot the previous value\n` +
      `      const previousData = queryClient.getQueryData(['${hook.operationId}']);\n` +
      `      \n` +
      `      // Optimistically update to the new value\n` +
      `      queryClient.setQueryData(['${hook.operationId}'], (old: any) => {\n` +
      `        // Implement optimistic update logic based on operation type\n` +
      `        return old;\n` +
      `      });\n` +
      `      \n` +
      `      return { previousData };\n` +
      `    },\n` +
      `    onError: (err, newData, context) => {\n` +
      `      // Rollback on error\n` +
      `      if (context?.previousData) {\n` +
      `        queryClient.setQueryData(['${hook.operationId}'], context.previousData);\n` +
      `      }\n` +
      `    },\n`
    );
  }

  private generateInvalidationLogic(hook: GeneratedHook): string {
    // Generate smart invalidation based on the operation
    const domain = this.getDomainFromOperationId(hook.operationId);
    return `queryClient.invalidateQueries({ queryKey: ['${domain}'] });`;
  }

  private groupHooksByDomain(
    hooks: GeneratedHook[]
  ): Map<string, GeneratedHook[]> {
    const groups = new Map<string, GeneratedHook[]>();

    for (const hook of hooks) {
      const domain = this.getDomainFromOperationId(hook.operationId);

      if (!groups.has(domain)) {
        groups.set(domain, []);
      }

      groups.get(domain)!.push(hook);
    }

    return groups;
  }

  private getDomainFromOperationId(operationId: string): string {
    // Extract domain from operation ID
    // e.g., "getUserById" -> "users", "createPost" -> "posts"
    const patterns = [
      /^(get|list|find|fetch)(.+?)(?:ById|All)?$/i,
      /^(create|update|delete|patch)(.+?)$/i,
    ];

    for (const pattern of patterns) {
      const match = operationId.match(pattern);
      if (match) {
        return match[2].toLowerCase();
      }
    }

    return "general";
  }

  private extractPathParameters(path: string): string[] {
    const params: string[] = [];
    const matches = path.match(/\{([^}]+)\}/g);

    if (matches) {
      params.push(...matches.map((match) => match.slice(1, -1)));
    }

    return params;
  }

  private extractQueryParameters(operation: any): string[] {
    const params: string[] = [];

    if (operation.parameters) {
      for (const param of operation.parameters) {
        if (param.in === "query") {
          params.push(param.name);
        }
      }
    }

    return params;
  }

  private generateHookName(
    operationId: string,
    type: "query" | "mutation" | "infiniteQuery"
  ): string {
    let hookName = operationId;

    if (type === "query" || type === "infiniteQuery") {
      // Simplify query hook names
      hookName = operationId
        .replace(/^(get|fetch|list|find)/, "")
        .replace(/ById$/, "");
    }

    const prefix = type === "infiniteQuery" ? "useInfinite" : "use";
    return `${prefix}${hookName.charAt(0).toUpperCase()}${hookName.slice(1)}`;
  }

  private generateOperationId(method: string, path: string): string {
    const pathParts = path
      .split("/")
      .filter((part) => part && !part.startsWith("{"))
      .map((part) => part.replace(/[^a-zA-Z0-9]/g, ""));

    const pathName = pathParts.length > 0 ? pathParts.join("") : "endpoint";
    return `${method}${pathName.charAt(0).toUpperCase() + pathName.slice(1)}`;
  }

  private getRequestType(operation: any): string | undefined {
    const requestBody = operation.requestBody;
    if (requestBody?.content?.["application/json"]?.schema) {
      return this.getTypeFromSchema(
        requestBody.content["application/json"].schema
      );
    }
    return undefined;
  }

  private getResponseType(operation: any): string {
    const responses = operation.responses;
    const successResponse =
      responses?.["200"] || responses?.["201"] || responses?.["204"];

    if (successResponse?.content?.["application/json"]?.schema) {
      return this.getTypeFromSchema(
        successResponse.content["application/json"].schema
      );
    }

    return "unknown";
  }

  private getTypeFromSchema(schema: any): string {
    if (schema.$ref) {
      const refParts = schema.$ref.split("/");
      return refParts[refParts.length - 1];
    }

    if (schema.type === "array" && schema.items) {
      const itemType = this.getTypeFromSchema(schema.items);
      return `${itemType}[]`;
    }

    return schema.type || "unknown";
  }

  private isInfiniteQueryCandidate(operation: any, path: string): boolean {
    // Detect if this is likely a paginated endpoint
    const paginationKeywords = [
      "page",
      "limit",
      "offset",
      "cursor",
      "pageSize",
    ];

    if (operation.parameters) {
      for (const param of operation.parameters) {
        if (
          param.in === "query" &&
          paginationKeywords.includes(param.name.toLowerCase())
        ) {
          return true;
        }
      }
    }

    // Check if path suggests a list endpoint
    const listKeywords = ["list", "search", "find"];
    return listKeywords.some(
      (keyword) =>
        path.toLowerCase().includes(keyword) ||
        operation.operationId?.toLowerCase().includes(keyword)
    );
  }

  private isAIEndpoint(path: string, operation: any): boolean {
    const aiKeywords = [
      "ai",
      "chat",
      "completion",
      "model",
      "llm",
      "embedding",
    ];
    const fullPath =
      `${path} ${operation.summary || ""} ${operation.description || ""}`.toLowerCase();
    return aiKeywords.some((keyword) => fullPath.includes(keyword));
  }

  private generateChecksum(content: string): string {
    return crypto.createHash("md5").update(content).digest("hex").slice(0, 8);
  }
}
