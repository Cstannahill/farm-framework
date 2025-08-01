import type { OpenAPISchema } from "@farm-framework/types";
import {
  APIClientGenerator,
  type APIClientGeneratorOptions,
  type GenerationResult,
} from "./api-client";

export interface EnhancedAPIClientOptions
  extends Omit<APIClientGeneratorOptions, "authentication"> {
  // HTTP Client Configuration
  httpClient?: "fetch" | "axios" | "custom";

  // Authentication
  authentication?: {
    type?: "bearer" | "basic" | "oauth" | "api-key" | "custom";
    tokenProperty?: string;
    refreshToken?: boolean;
    customHeaders?: Record<string, string>;
  };

  // Error Handling
  errorHandling?: {
    throwOnError?: boolean;
    retryStrategy?: {
      maxRetries?: number;
      backoffStrategy?: "linear" | "exponential";
      retryCondition?: (error: any) => boolean;
    };
    globalErrorHandler?: boolean;
  };

  // Request/Response Interceptors
  interceptors?: {
    request?: boolean;
    response?: boolean;
    custom?: string[];
  };

  // Type Safety
  typeSafety?: {
    strictTypes?: boolean;
    validateRequests?: boolean;
    validateResponses?: boolean;
    generatedValidators?: boolean;
  };

  // Code Generation
  codeGen?: {
    clientName?: string;
    useGenerics?: boolean;
    includeJSDoc?: boolean;
    modularity?: "single" | "grouped" | "operation";
    treeShaking?: boolean;
  };

  // Performance
  performance?: {
    caching?: boolean;
    requestDeduplication?: boolean;
    batchRequests?: boolean;
    streaming?: boolean;
  };

  // Development Features
  development?: {
    mockSupport?: boolean;
    debugMode?: boolean;
    requestLogging?: boolean;
    devtools?: boolean;
  };
}

/**
 * Enhanced API client generator with advanced features and optimizations
 */
export class EnhancedAPIClientGenerator {
  private enhancedOptions: EnhancedAPIClientOptions;
  private baseGenerator: APIClientGenerator;

  constructor(options?: Partial<EnhancedAPIClientOptions>) {
    const baseOptions = {
      outputDir: "./src/api",
      enableAI: false,
      outputFormat: "typescript" as const,
      includeTypes: true,
      baseURL: "http://localhost:8000",
      authentication: "bearer" as const,
      enableInterceptors: true,
      enableStreaming: false,
    };

    this.baseGenerator = new APIClientGenerator(baseOptions);

    this.enhancedOptions = {
      ...baseOptions,
      httpClient: "fetch",
      authentication: {
        type: "bearer",
        tokenProperty: "token",
        refreshToken: false,
        customHeaders: {},
      },
      errorHandling: {
        throwOnError: true,
        retryStrategy: {
          maxRetries: 3,
          backoffStrategy: "exponential",
        },
        globalErrorHandler: true,
      },
      interceptors: {
        request: true,
        response: true,
        custom: [],
      },
      typeSafety: {
        strictTypes: true,
        validateRequests: false,
        validateResponses: false,
        generatedValidators: false,
      },
      codeGen: {
        clientName: "ApiClient",
        useGenerics: true,
        includeJSDoc: true,
        modularity: "grouped",
        treeShaking: true,
      },
      performance: {
        caching: false,
        requestDeduplication: true,
        batchRequests: false,
        streaming: false,
      },
      development: {
        mockSupport: false,
        debugMode: false,
        requestLogging: false,
        devtools: false,
      },
      ...options,
    };
  }

  /**
   * Generate API client - compatible with base class interface
   */
  async generate(schema: OpenAPISchema): Promise<GenerationResult[]> {
    return this.generateEnhanced(schema);
  }

  /**
   * Generate enhanced API client with advanced features
   */
  async generateEnhanced(schema: OpenAPISchema): Promise<GenerationResult[]> {
    const results: GenerationResult[] = [];

    // Analyze schema for optimization opportunities
    const analysis = this.analyzeSchema(schema);

    switch (this.enhancedOptions.codeGen?.modularity) {
      case "single":
        const singleResult = await this.generateSingleClient(schema, analysis);
        results.push(singleResult);
        break;

      case "grouped":
        const groupedResults = await this.generateGroupedClients(
          schema,
          analysis
        );
        results.push(...groupedResults);
        break;

      case "operation":
        const operationResults = await this.generateOperationClients(
          schema,
          analysis
        );
        results.push(...operationResults);
        break;

      default:
        const defaultResult = await this.generateSingleClient(schema, analysis);
        results.push(defaultResult);
    }

    // Generate additional files
    if (this.enhancedOptions.typeSafety?.generatedValidators) {
      const validatorResult = await this.generateValidators(schema);
      results.push(validatorResult);
    }

    if (this.enhancedOptions.development?.mockSupport) {
      const mockResult = await this.generateMockClient(schema);
      results.push(mockResult);
    }

    // Generate index file for modular approach
    if (results.length > 1) {
      const indexResult = await this.generateIndexFile(results);
      results.push(indexResult);
    }

    return results;
  }

  private analyzeSchema(schema: OpenAPISchema): SchemaAnalysis {
    return {
      totalOperations: this.countOperations(schema),
      operationsByTag: this.groupOperationsByTag(schema),
      operationsByPath: this.groupOperationsByPath(schema),
      authenticationMethods: this.detectAuthMethods(schema),
      responseTypes: this.analyzeResponseTypes(schema),
      requestTypes: this.analyzeRequestTypes(schema),
      complexityScore: this.calculateComplexityScore(schema),
    };
  }

  private async generateSingleClient(
    schema: OpenAPISchema,
    analysis: SchemaAnalysis
  ): Promise<GenerationResult> {
    const content = await this.generateSingleClientContent(schema, analysis);
    const fileName = `${this.formatClassName(this.enhancedOptions.codeGen?.clientName || "ApiClient")}.ts`;
    const filePath = this.getOutputPath(fileName);

    await this.writeFile(filePath, content);

    return {
      path: filePath,
      content,
      size: content.length,
      checksum: this.generateChecksum(content),
      generatedAt: new Date(),
      type: "api-client-single",
    };
  }

  private async generateSingleClientContent(
    schema: OpenAPISchema,
    analysis: SchemaAnalysis
  ): Promise<string> {
    let content = "";

    // Generate imports
    content += this.generateEnhancedImports();

    // Generate types
    content += this.generateClientTypes(schema);

    // Generate configuration interface
    content += this.generateConfigInterface();

    // Generate main client class
    content += this.generateMainClientClass(schema, analysis);

    // Generate operation methods
    content += this.generateOperationMethods(schema);

    // Generate utility methods
    content += this.generateUtilityMethods();

    return content;
  }

  private generateEnhancedImports(): string {
    const imports: string[] = [];

    // Base imports
    if (this.enhancedOptions.httpClient === "axios") {
      imports.push(
        "import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';"
      );
    } else {
      imports.push("// Using native fetch API");
    }

    // Type imports
    if (this.enhancedOptions.includeTypes) {
      imports.push("import type * as Types from './types';");
    }

    // Validation imports
    if (this.enhancedOptions.typeSafety?.generatedValidators) {
      imports.push("import * as Validators from './validators';");
    }

    return imports.join("\n") + "\n\n";
  }

  private generateClientTypes(schema: OpenAPISchema): string {
    return `/**
 * Client Configuration Types
 */

export interface RequestConfig {
  timeout?: number;
  headers?: Record<string, string>;
  params?: Record<string, any>;
  signal?: AbortSignal;
}

export interface ClientConfig {
  baseURL?: string;
  timeout?: number;
  headers?: Record<string, string>;
  auth?: AuthConfig;
  interceptors?: InterceptorConfig;
  retry?: RetryConfig;
  cache?: CacheConfig;
}

export interface AuthConfig {
  type: 'bearer' | 'basic' | 'oauth' | 'api-key';
  token?: string;
  username?: string;
  password?: string;
  apiKey?: string;
  refreshToken?: string;
}

export interface InterceptorConfig {
  request?: (config: RequestConfig) => RequestConfig | Promise<RequestConfig>;
  response?: <T>(response: T) => T | Promise<T>;
  error?: (error: any) => any;
}

export interface RetryConfig {
  maxRetries: number;
  backoffStrategy: 'linear' | 'exponential';
  retryCondition?: (error: any) => boolean;
}

export interface CacheConfig {
  enabled: boolean;
  ttl?: number;
  storage?: 'memory' | 'localStorage' | 'sessionStorage';
}

`;
  }

  private generateConfigInterface(): string {
    return `/**
 * API Client Configuration
 */
export interface ApiClientOptions {
  baseURL?: string;
  timeout?: number;
  headers?: Record<string, string>;
  auth?: AuthConfig;
  debug?: boolean;
}

`;
  }

  private generateMainClientClass(
    schema: OpenAPISchema,
    analysis: SchemaAnalysis
  ): string {
    const clientName = this.enhancedOptions.codeGen?.clientName || "ApiClient";

    return `/**
 * ${clientName} - Generated API Client
 * 
 * This client provides typed methods for all API operations defined in the OpenAPI specification.
 * 
 * @example
 * \`\`\`typescript
 * const client = new ${clientName}({
 *   baseURL: 'https://api.example.com',
 *   auth: { type: 'bearer', token: 'your-token' }
 * });
 * 
 * const users = await client.getUsers();
 * \`\`\`
 */
export class ${clientName} {
  private config: ClientConfig;
  private httpClient: ${this.getHttpClientType()};
  
  constructor(config: ApiClientOptions = {}) {
    this.config = {
      baseURL: '${this.enhancedOptions.baseURL}',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      ...config,
    };
    
    this.httpClient = this.createHttpClient();
    this.setupInterceptors();
  }

  private createHttpClient(): ${this.getHttpClientType()} {
    ${this.generateHttpClientCreation()}
  }

  private setupInterceptors(): void {
    ${this.generateInterceptorSetup()}
  }

  ${this.generateAuthMethods()}

  ${this.generateErrorHandlingMethods()}

`;
  }

  private generateOperationMethods(schema: OpenAPISchema): string {
    let content = "";

    if (!schema.paths) return content;

    for (const [path, methods] of Object.entries(schema.paths)) {
      for (const [method, operation] of Object.entries(methods as any)) {
        const operationDef = operation as any;
        if (!operationDef.operationId) continue;

        content += this.generateOperationMethod(path, method, operationDef);
      }
    }

    return content;
  }

  private generateOperationMethod(
    path: string,
    method: string,
    operation: any
  ): string {
    const operationId = operation.operationId;
    const methodName = this.formatMethodName(operationId);
    const returnType = this.getOperationReturnType(operation);
    const parameterType = this.getOperationParameterType(operation);

    let methodContent = "";

    // Add JSDoc
    if (this.enhancedOptions.codeGen?.includeJSDoc) {
      methodContent += this.generateMethodJSDoc(operation);
    }

    // Method signature
    methodContent += `  async ${methodName}(`;

    if (parameterType !== "void") {
      methodContent += `request: ${parameterType}, `;
    }

    methodContent += `config?: RequestConfig): Promise<${returnType}> {\n`;

    // Method body
    methodContent += this.generateMethodBody(path, method, operation);

    methodContent += "  }\n\n";

    return methodContent;
  }

  private generateMethodJSDoc(operation: any): string {
    let jsdoc = "  /**\n";

    if (operation.summary) {
      jsdoc += `   * ${operation.summary}\n`;
    }

    if (operation.description) {
      jsdoc += `   * \n   * ${operation.description}\n`;
    }

    if (operation.parameters) {
      jsdoc += "   * \n";
      for (const param of operation.parameters) {
        jsdoc += `   * @param ${param.name} ${param.description || ""}\n`;
      }
    }

    if (operation.responses) {
      const successResponse =
        operation.responses["200"] || operation.responses["201"];
      if (successResponse?.description) {
        jsdoc += `   * @returns ${successResponse.description}\n`;
      }
    }

    if (operation.deprecated) {
      jsdoc += "   * @deprecated\n";
    }

    jsdoc += "   */\n";
    return jsdoc;
  }

  private generateMethodBody(
    path: string,
    method: string,
    operation: any
  ): string {
    let body = "";

    // Validation
    if (this.enhancedOptions.typeSafety?.validateRequests) {
      body += "    // Validate request\n";
      body += "    if (request) {\n";
      body += `      Validators.validate${this.capitalize(operation.operationId)}Request(request);\n`;
      body += "    }\n\n";
    }

    // Build URL
    body += "    // Build URL\n";
    body += `    const url = this.buildUrl('${path}', request?.path);\n\n`;

    // Build request config
    body += "    // Build request configuration\n";
    body += "    const requestConfig: RequestConfig = {\n";
    body += "      method: '" + method.toUpperCase() + "',\n";
    body += "      ...config,\n";
    body += "      headers: {\n";
    body += "        ...this.config.headers,\n";
    body += "        ...config?.headers,\n";
    body += "      },\n";

    if (this.hasQueryParameters(operation)) {
      body += "      params: request?.query,\n";
    }

    if (this.hasRequestBody(operation)) {
      body += "      data: request?.body,\n";
    }

    body += "    };\n\n";

    // Execute request
    body += "    // Execute request\n";
    if (this.enhancedOptions.errorHandling?.retryStrategy) {
      body += "    return this.executeWithRetry(url, requestConfig);\n";
    } else {
      body += "    return this.executeRequest(url, requestConfig);\n";
    }

    return body;
  }

  private generateUtilityMethods(): string {
    return `
  /**
   * Utility Methods
   */

  private buildUrl(path: string, pathParams?: Record<string, any>): string {
    let url = path;
    
    if (pathParams) {
      for (const [key, value] of Object.entries(pathParams)) {
        url = url.replace(\`{\${key}}\`, encodeURIComponent(String(value)));
      }
    }
    
    return url;
  }

  private async executeRequest<T>(url: string, config: RequestConfig): Promise<T> {
    ${this.generateRequestExecution()}
  }

  ${this.generateRetryLogic()}

  ${this.generateCacheLogic()}

  ${this.generateErrorHandling()}
}
`;
  }

  private generateHttpClientCreation(): string {
    if (this.enhancedOptions.httpClient === "axios") {
      return `
    return axios.create({
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
      headers: this.config.headers,
    });`;
    } else {
      return `
    // Using native fetch - no client creation needed
    return null as any;`;
    }
  }

  private generateInterceptorSetup(): string {
    if (
      !this.enhancedOptions.interceptors?.request &&
      !this.enhancedOptions.interceptors?.response
    ) {
      return "// No interceptors configured";
    }

    return `
    // Setup request interceptor
    ${this.enhancedOptions.interceptors?.request ? this.generateRequestInterceptor() : ""}
    
    // Setup response interceptor  
    ${this.enhancedOptions.interceptors?.response ? this.generateResponseInterceptor() : ""}`;
  }

  private generateRequestInterceptor(): string {
    return `
    if (this.config.interceptors?.request) {
      // Custom request interceptor
    } else {
      // Default request interceptor for authentication
      ${this.generateDefaultRequestInterceptor()}
    }`;
  }

  private generateResponseInterceptor(): string {
    return `
    if (this.config.interceptors?.response) {
      // Custom response interceptor
    } else {
      // Default response interceptor for error handling
      ${this.generateDefaultResponseInterceptor()}
    }`;
  }

  private generateDefaultRequestInterceptor(): string {
    const authType = this.enhancedOptions.authentication?.type;

    switch (authType) {
      case "bearer":
        return `
      // Add bearer token to requests
      if (this.config.auth?.token) {
        config.headers = {
          ...config.headers,
          'Authorization': \`Bearer \${this.config.auth.token}\`
        };
      }`;
      case "basic":
        return `
      // Add basic auth to requests
      if (this.config.auth?.username && this.config.auth?.password) {
        const credentials = btoa(\`\${this.config.auth.username}:\${this.config.auth.password}\`);
        config.headers = {
          ...config.headers,
          'Authorization': \`Basic \${credentials}\`
        };
      }`;
      default:
        return "// No default authentication configured";
    }
  }

  private generateDefaultResponseInterceptor(): string {
    return `
    // Handle common response scenarios
    if (response.status >= 200 && response.status < 300) {
      return response.data;
    } else {
      throw new Error(\`Request failed with status \${response.status}\`);
    }`;
  }

  private generateAuthMethods(): string {
    return `
  /**
   * Authentication Methods
   */

  setAuthToken(token: string): void {
    if (!this.config.auth) {
      this.config.auth = { type: 'bearer' };
    }
    this.config.auth.token = token;
  }

  clearAuth(): void {
    this.config.auth = undefined;
  }

  ${this.enhancedOptions.authentication?.refreshToken ? this.generateRefreshTokenMethod() : ""}`;
  }

  private generateRefreshTokenMethod(): string {
    return `
  async refreshAuthToken(): Promise<void> {
    if (!this.config.auth?.refreshToken) {
      throw new Error('No refresh token available');
    }
    
    // Implementation would depend on your auth flow
    // This is a placeholder
    throw new Error('Refresh token method not implemented');
  }`;
  }

  private generateErrorHandlingMethods(): string {
    return `
  /**
   * Error Handling Methods
   */

  private handleError(error: any): never {
    ${
      this.enhancedOptions.errorHandling?.globalErrorHandler
        ? "if (this.config.globalErrorHandler) { this.config.globalErrorHandler(error); }"
        : ""
    }
    
    if (error.response) {
      // Server responded with error status
      const apiError = new Error(\`API Error: \${error.response.status} - \${error.response.statusText}\`);
      (apiError as any).response = error.response;
      throw apiError;
    } else if (error.request) {
      // Request was made but no response received
      throw new Error('Network Error: No response received');
    } else {
      // Something else happened
      throw error;
    }
  }`;
  }

  private generateRequestExecution(): string {
    if (this.enhancedOptions.httpClient === "axios") {
      return `
    try {
      const response = await this.httpClient.request({
        url,
        ...config,
      });
      
      ${
        this.enhancedOptions.typeSafety?.validateResponses
          ? "this.validateResponse(response.data);"
          : ""
      }
      
      return response.data;
    } catch (error) {
      return this.handleError(error);
    }`;
    } else {
      return `
    try {
      const response = await fetch(\`\${this.config.baseURL}\${url}\`, {
        method: config.method || 'GET',
        headers: config.headers,
        body: config.data ? JSON.stringify(config.data) : undefined,
        signal: config.signal,
      });
      
      if (!response.ok) {
        throw new Error(\`HTTP \${response.status}: \${response.statusText}\`);
      }
      
      const data = await response.json();
      
      ${
        this.enhancedOptions.typeSafety?.validateResponses
          ? "this.validateResponse(data);"
          : ""
      }
      
      return data;
    } catch (error) {
      return this.handleError(error);
    }`;
    }
  }

  private generateRetryLogic(): string {
    if (!this.enhancedOptions.errorHandling?.retryStrategy) {
      return "";
    }

    return `
  private async executeWithRetry<T>(url: string, config: RequestConfig): Promise<T> {
    const maxRetries = ${this.enhancedOptions.errorHandling.retryStrategy.maxRetries};
    let lastError: any;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await this.executeRequest<T>(url, config);
      } catch (error) {
        lastError = error;
        
        // Check if we should retry
        if (attempt === maxRetries || !this.shouldRetry(error)) {
          break;
        }
        
        // Wait with backoff
        await this.delay(this.calculateBackoff(attempt));
      }
    }
    
    throw lastError;
  }
  
  private shouldRetry(error: any): boolean {
    // Default retry condition - retry on network errors and 5xx status codes
    if (error.code === 'NETWORK_ERROR') return true;
    if (error.response?.status >= 500) return true;
    return false;
  }
  
  private calculateBackoff(attempt: number): number {
    const baseDelay = 1000; // 1 second
    
    ${
      this.enhancedOptions.errorHandling?.retryStrategy?.backoffStrategy ===
      "exponential"
        ? "return baseDelay * Math.pow(2, attempt);"
        : "return baseDelay * (attempt + 1);"
    }
  }
  
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }`;
  }

  private generateCacheLogic(): string {
    if (!this.enhancedOptions.performance?.caching) {
      return "";
    }

    return `
  /**
   * Cache Methods
   */
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  
  private getCacheKey(url: string, config: RequestConfig): string {
    return \`\${config.method || 'GET'}:\${url}:\${JSON.stringify(config.params || {})}\`;
  }
  
  private getCachedResponse<T>(cacheKey: string): T | null {
    const cached = this.cache.get(cacheKey);
    if (!cached) return null;
    
    if (Date.now() - cached.timestamp > cached.ttl) {
      this.cache.delete(cacheKey);
      return null;
    }
    
    return cached.data;
  }
  
  private setCachedResponse(cacheKey: string, data: any, ttl: number = 300000): void {
    this.cache.set(cacheKey, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }`;
  }

  private generateErrorHandling(): string {
    return `
  private validateResponse(data: any): void {
    // Response validation would be implemented here
    // This could use the generated validators if enabled
  }`;
  }

  // Helper methods
  private getHttpClientType(): string {
    return this.enhancedOptions.httpClient === "axios"
      ? "AxiosInstance"
      : "any";
  }

  private getOperationReturnType(operation: any): string {
    const successResponse =
      operation.responses?.["200"] || operation.responses?.["201"];
    if (successResponse?.content?.["application/json"]?.schema) {
      return `Types.${this.capitalize(operation.operationId)}Response`;
    }
    return "void";
  }

  private getOperationParameterType(operation: any): string {
    if (operation.parameters?.length > 0 || operation.requestBody) {
      return `Types.${this.capitalize(operation.operationId)}Request`;
    }
    return "void";
  }

  private hasQueryParameters(operation: any): boolean {
    return operation.parameters?.some((p: any) => p.in === "query") || false;
  }

  private hasRequestBody(operation: any): boolean {
    return !!operation.requestBody;
  }

  private formatClassName(name: string): string {
    return name.charAt(0).toUpperCase() + name.slice(1);
  }

  private formatMethodName(operationId: string): string {
    return operationId.charAt(0).toLowerCase() + operationId.slice(1);
  }

  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  // Placeholder implementations for remaining methods
  private async generateGroupedClients(
    schema: OpenAPISchema,
    analysis: SchemaAnalysis
  ): Promise<GenerationResult[]> {
    // Implementation would generate separate clients for each tag/group
    return [];
  }

  private async generateOperationClients(
    schema: OpenAPISchema,
    analysis: SchemaAnalysis
  ): Promise<GenerationResult[]> {
    // Implementation would generate separate files for each operation
    return [];
  }

  private async generateValidators(
    schema: OpenAPISchema
  ): Promise<GenerationResult> {
    // Implementation would generate validation schemas
    return {
      path: "validators.ts",
      generatedAt: new Date(),
      type: "validators",
    };
  }

  private async generateMockClient(
    schema: OpenAPISchema
  ): Promise<GenerationResult> {
    // Implementation would generate mock client for testing
    return {
      path: "mock-client.ts",
      generatedAt: new Date(),
      type: "mock-client",
    };
  }

  private async generateIndexFile(
    results: GenerationResult[]
  ): Promise<GenerationResult> {
    // Implementation would generate index file
    return {
      path: "index.ts",
      generatedAt: new Date(),
      type: "index",
    };
  }

  private countOperations(schema: OpenAPISchema): number {
    // Implementation would count total operations
    return 0;
  }

  private groupOperationsByTag(schema: OpenAPISchema): Record<string, any> {
    // Implementation would group operations by tag
    return {};
  }

  private groupOperationsByPath(schema: OpenAPISchema): Record<string, any> {
    // Implementation would group operations by path
    return {};
  }

  private detectAuthMethods(schema: OpenAPISchema): string[] {
    // Implementation would detect authentication methods from schema
    return [];
  }

  private analyzeResponseTypes(schema: OpenAPISchema): any {
    // Implementation would analyze response types
    return {};
  }

  private analyzeRequestTypes(schema: OpenAPISchema): any {
    // Implementation would analyze request types
    return {};
  }

  private calculateComplexityScore(schema: OpenAPISchema): number {
    // Implementation would calculate complexity score
    return 0;
  }

  private generateChecksum(content: string): string {
    // Implementation would generate checksum
    return "";
  }

  private getOutputPath(fileName: string): string {
    // Implementation would return full path
    return fileName;
  }

  private async writeFile(filePath: string, content: string): Promise<void> {
    // Implementation would write file
  }
}

interface SchemaAnalysis {
  totalOperations: number;
  operationsByTag: Record<string, any>;
  operationsByPath: Record<string, any>;
  authenticationMethods: string[];
  responseTypes: any;
  requestTypes: any;
  complexityScore: number;
}
