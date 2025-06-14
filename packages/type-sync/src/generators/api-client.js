import fs from "fs-extra";
import path from "path";
import crypto from "crypto";
/**
 * Generates a typed API client based on the provided OpenAPI schema.
 */
export class APIClientGenerator {
    options;
    constructor(options) {
        this.options = {
            outputDir: "./src/api",
            enableAI: false,
            outputFormat: "typescript",
            includeTypes: true,
            baseURL: "http://localhost:8000",
            authentication: "bearer",
            enableInterceptors: true,
            enableStreaming: false,
            ...options,
        };
    }
    /**
     * Generate the client file.
     *
     * @param schema - Parsed OpenAPI schema
     * @param opts - Generation options
     * @returns Path to the generated file
     */
    async generate(schema, opts) {
        const finalOpts = { ...this.options, ...opts };
        await fs.ensureDir(finalOpts.outputDir);
        const content = this.generateClientCode(schema, finalOpts);
        const outPath = path.join(finalOpts.outputDir, "client.ts");
        await fs.writeFile(outPath, content);
        return {
            path: outPath,
            content,
            size: content.length,
            checksum: this.generateChecksum(content),
            generatedAt: new Date(),
            type: "api-client",
        };
    }
    generateClientCode(schema, opts) {
        const imports = this.generateImports(opts);
        const classDefinition = this.generateClassDefinition(schema, opts);
        const methods = this.generateMethods(schema, opts);
        const exports = this.generateExports(opts);
        return `${imports}\n\n${classDefinition}\n${methods}\n}\n\n${exports}`;
    }
    generateImports(opts) {
        let imports = `import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';\n`;
        if (opts.includeTypes) {
            imports += `import * as Types from './types';\n`;
        }
        if (opts.enableStreaming) {
            imports += `import { EventSource } from 'eventsource';\n`;
        }
        return imports;
    }
    generateClassDefinition(schema, opts) {
        const className = "APIClient";
        const baseURL = opts.baseURL || "http://localhost:8000";
        let classContent = `/**\n * Auto-generated API client for ${schema.info?.title || "API"}\n * Version: ${schema.info?.version || "1.0.0"}\n */\nexport class ${className} {\n`;
        classContent += `  private axios: AxiosInstance;\n`;
        if (opts.enableStreaming) {
            classContent += `  private eventSources: Map<string, EventSource> = new Map();\n`;
        }
        classContent += `\n  constructor(baseURL: string = '${baseURL}', config?: AxiosRequestConfig) {\n`;
        classContent += `    this.axios = axios.create({\n`;
        classContent += `      baseURL,\n`;
        classContent += `      timeout: 30000,\n`;
        classContent += `      headers: {\n`;
        classContent += `        'Content-Type': 'application/json',\n`;
        classContent += `      },\n`;
        classContent += `      ...config,\n`;
        classContent += `    });\n\n`;
        if (opts.enableInterceptors) {
            classContent += this.generateInterceptors(opts);
        }
        classContent += `  }\n`;
        return classContent;
    }
    generateInterceptors(opts) {
        let interceptors = `    // Request interceptor for authentication\n`;
        interceptors += `    this.axios.interceptors.request.use(\n`;
        interceptors += `      (config) => {\n`;
        if (opts.authentication === "bearer") {
            interceptors += `        const token = this.getAuthToken();\n`;
            interceptors += `        if (token) {\n`;
            interceptors += `          config.headers.Authorization = \`Bearer \${token}\`;\n`;
            interceptors += `        }\n`;
        }
        else if (opts.authentication === "cookie") {
            interceptors += `        // Cookie authentication handled by browser\n`;
        }
        interceptors += `        return config;\n`;
        interceptors += `      },\n`;
        interceptors += `      (error) => Promise.reject(error)\n`;
        interceptors += `    );\n\n`;
        interceptors += `    // Response interceptor for error handling\n`;
        interceptors += `    this.axios.interceptors.response.use(\n`;
        interceptors += `      (response) => response,\n`;
        interceptors += `      (error) => {\n`;
        interceptors += `        if (error.response?.status === 401) {\n`;
        interceptors += `          this.handleAuthError();\n`;
        interceptors += `        }\n`;
        interceptors += `        return Promise.reject(error);\n`;
        interceptors += `      }\n`;
        interceptors += `    );\n\n`;
        return interceptors;
    }
    generateMethods(schema, opts) {
        let methods = "";
        // Generate utility methods
        methods += this.generateUtilityMethods(opts);
        // Generate API methods from paths
        if (schema.paths) {
            for (const [path, pathItem] of Object.entries(schema.paths)) {
                if (pathItem) {
                    methods += this.generatePathMethods(path, pathItem, opts);
                }
            }
        }
        return methods;
    }
    generateUtilityMethods(opts) {
        let methods = "";
        if (opts.authentication === "bearer") {
            methods += `\n  private getAuthToken(): string | null {\n`;
            methods += `    return localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');\n`;
            methods += `  }\n\n`;
            methods += `  public setAuthToken(token: string, persistent: boolean = true): void {\n`;
            methods += `    if (persistent) {\n`;
            methods += `      localStorage.setItem('auth_token', token);\n`;
            methods += `    } else {\n`;
            methods += `      sessionStorage.setItem('auth_token', token);\n`;
            methods += `    }\n`;
            methods += `  }\n\n`;
            methods += `  public clearAuthToken(): void {\n`;
            methods += `    localStorage.removeItem('auth_token');\n`;
            methods += `    sessionStorage.removeItem('auth_token');\n`;
            methods += `  }\n\n`;
        }
        methods += `  private handleAuthError(): void {\n`;
        methods += `    this.clearAuthToken();\n`;
        methods += `    // Emit auth error event or redirect to login\n`;
        methods += `    window.dispatchEvent(new CustomEvent('auth-error'));\n`;
        methods += `  }\n\n`;
        if (opts.enableStreaming) {
            methods += this.generateStreamingMethods();
        }
        return methods;
    }
    generateStreamingMethods() {
        return (`\n  public createEventStream(path: string, onMessage: (data: any) => void, onError?: (error: Event) => void): string {\n` +
            `    const streamId = \`stream_\${Date.now()}_\${Math.random().toString(36).substr(2, 9)}\`;\n` +
            `    const eventSource = new EventSource(\`\${this.axios.defaults.baseURL}\${path}\`);\n` +
            `    \n` +
            `    eventSource.onmessage = (event) => {\n` +
            `      try {\n` +
            `        const data = JSON.parse(event.data);\n` +
            `        onMessage(data);\n` +
            `      } catch (error) {\n` +
            `        console.error('Failed to parse SSE data:', error);\n` +
            `      }\n` +
            `    };\n` +
            `    \n` +
            `    eventSource.onerror = (error) => {\n` +
            `      if (onError) onError(error);\n` +
            `      this.closeEventStream(streamId);\n` +
            `    };\n` +
            `    \n` +
            `    this.eventSources.set(streamId, eventSource);\n` +
            `    return streamId;\n` +
            `  }\n\n` +
            `  public closeEventStream(streamId: string): void {\n` +
            `    const eventSource = this.eventSources.get(streamId);\n` +
            `    if (eventSource) {\n` +
            `      eventSource.close();\n` +
            `      this.eventSources.delete(streamId);\n` +
            `    }\n` +
            `  }\n\n`);
    }
    generatePathMethods(path, pathItem, opts) {
        let methods = "";
        const httpMethods = ["get", "post", "put", "delete", "patch"];
        for (const method of httpMethods) {
            const operation = pathItem[method];
            if (operation) {
                // Skip AI-specific endpoints if AI is not enabled
                if (!opts.enableAI && this.isAIEndpoint(path, operation)) {
                    continue;
                }
                const methodName = this.generateMethodName(method, path, operation);
                const parameters = this.generateMethodParameters(operation);
                const returnType = this.generateReturnType(operation);
                const methodCall = this.generateMethodCall(method, path, operation);
                methods += `\n  /**\n   * ${operation.summary || `${method.toUpperCase()} ${path}`}\n   */\n`;
                methods += `  async ${methodName}(${parameters}): Promise<${returnType}> {\n`;
                methods += `    const response = await this.axios.${method}${methodCall};\n`;
                methods += `    return response.data;\n`;
                methods += `  }\n`;
            }
        }
        return methods;
    }
    generateMethodName(method, path, operation) {
        if (operation.operationId) {
            return operation.operationId;
        }
        // Generate method name from path and HTTP method
        const pathParts = path
            .split("/")
            .filter((part) => part && !part.startsWith("{"))
            .map((part) => part.replace(/[^a-zA-Z0-9]/g, ""));
        const pathName = pathParts.length > 0 ? pathParts.join("") : "endpoint";
        return `${method}${pathName.charAt(0).toUpperCase() + pathName.slice(1)}`;
    }
    generateMethodParameters(operation) {
        const params = [];
        // Path parameters
        if (operation.parameters) {
            for (const param of operation.parameters) {
                if (param.in === "path") {
                    params.push(`${param.name}: string | number`);
                }
            }
        }
        // Query parameters
        const queryParams = operation.parameters?.filter((p) => p.in === "query");
        if (queryParams && queryParams.length > 0) {
            params.push(`params?: { ${queryParams.map((p) => `${p.name}?: any`).join("; ")} }`);
        }
        // Request body
        if (operation.requestBody?.content?.["application/json"]) {
            params.push(`data?: any`);
        }
        // Config parameter
        params.push(`config?: AxiosRequestConfig`);
        return params.join(", ");
    }
    generateReturnType(operation) {
        const successResponse = operation.responses?.["200"] || operation.responses?.["201"];
        if (successResponse?.content?.["application/json"]) {
            return "any"; // Could be enhanced to use actual types
        }
        return "void";
    }
    generateMethodCall(method, path, operation) {
        const pathParams = operation.parameters?.filter((p) => p.in === "path") || [];
        let processedPath = path;
        // Replace path parameters
        for (const param of pathParams) {
            processedPath = processedPath.replace(`{${param.name}}`, `\${${param.name}}`);
        }
        const args = [`\`${processedPath}\``];
        if (method === "post" || method === "put" || method === "patch") {
            args.push("data");
        }
        // Add config parameter
        const configObj = [];
        const queryParams = operation.parameters?.filter((p) => p.in === "query");
        if (queryParams && queryParams.length > 0) {
            configObj.push("params");
        }
        if (configObj.length > 0) {
            args.push(`{ ${configObj.join(", ")}, ...config }`);
        }
        else {
            args.push("config");
        }
        return `(${args.join(", ")})`;
    }
    isAIEndpoint(path, operation) {
        const aiKeywords = [
            "ai",
            "chat",
            "completion",
            "model",
            "llm",
            "embedding",
        ];
        const fullPath = `${path} ${operation.summary || ""} ${operation.description || ""}`.toLowerCase();
        return aiKeywords.some((keyword) => fullPath.includes(keyword));
    }
    generateExports(opts) {
        return `export default APIClient;\n`;
    }
    generateChecksum(content) {
        return crypto.createHash("md5").update(content).digest("hex").slice(0, 8);
    }
}
//# sourceMappingURL=api-client.js.map