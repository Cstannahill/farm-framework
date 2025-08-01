import type {
  QueryRequest,
  QueryResponse,
  ExplanationResponse,
  IndexStatus,
  CodeIntelligenceClientConfig,
  ClientQueryRequest,
  ClientExplainRequest,
  ClientSearchOptions,
} from "../types/index";

export class CodeIntelligenceClient {
  private baseUrl: string;
  private timeout: number;
  private apiKey?: string;
  private retries: number;
  private cache: Map<string, any>;
  private cacheEnabled: boolean;

  constructor(config: CodeIntelligenceClientConfig = {}) {
    this.baseUrl =
      config.baseUrl || "http://localhost:8001/api/code-intelligence";
    this.timeout = config.timeout || 30000;
    this.apiKey = config.apiKey;
    this.retries = config.retries || 3;
    this.cacheEnabled = config.cache !== false;
    this.cache = new Map();
  }

  /**
   * Execute a natural language query against the codebase
   */
  async query(
    request: ClientQueryRequest,
    options: ClientSearchOptions = {}
  ): Promise<QueryResponse> {
    const cacheKey = this.getCacheKey("query", request);

    if (this.cacheEnabled && this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const queryRequest: QueryRequest = {
      query: request.query,
      maxResults: request.maxResults || 5,
      includeContext: request.includeContext || false,
      filters: request.filters,
      options: {
        useAiSynthesis: true,
        includeRelationships: true,
      },
    };

    const response = await this.makeRequest<QueryResponse>(
      "/query",
      "POST",
      queryRequest,
      options
    );

    if (this.cacheEnabled && response) {
      this.cache.set(cacheKey, response);
    }

    return response;
  }

  /**
   * Get detailed explanation of a code entity
   */
  async explain(request: ClientExplainRequest): Promise<ExplanationResponse> {
    const cacheKey = this.getCacheKey("explain", request);

    if (this.cacheEnabled && this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const response = await this.makeRequest<ExplanationResponse>(
      "/explain",
      "POST",
      request
    );

    if (this.cacheEnabled && response) {
      this.cache.set(cacheKey, response);
    }

    return response;
  }

  /**
   * Get current status of the code intelligence index
   */
  async getStatus(): Promise<IndexStatus> {
    return this.makeRequest<IndexStatus>("/status", "GET");
  }

  /**
   * Trigger a full reindex of the codebase
   */
  async reindex(): Promise<{ message: string; taskId: string }> {
    return this.makeRequest<{ message: string; taskId: string }>(
      "/reindex",
      "POST"
    );
  }

  /**
   * Stream query results for real-time feedback
   */
  async *streamQuery(
    request: ClientQueryRequest,
    options: ClientSearchOptions = {}
  ): AsyncGenerator<any, void, unknown> {
    const url = new URL("/stream", this.baseUrl);

    // Convert HTTP URL to WebSocket URL
    const wsUrl = url.toString().replace(/^http/, "ws");

    const ws = new WebSocket(wsUrl);

    const results: any[] = [];

    await new Promise<void>((resolve, reject) => {
      ws.onopen = () => {
        ws.send(JSON.stringify(request));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === "result") {
            results.push(data.data);
          } else if (data.type === "complete") {
            ws.close();
            resolve();
          } else if (data.type === "error") {
            ws.close();
            reject(new Error(data.error));
          }
        } catch (error) {
          reject(error);
        }
      };

      ws.onerror = (error) => {
        reject(error);
      };

      if (options.signal) {
        options.signal.addEventListener("abort", () => {
          ws.close();
          reject(new Error("Request aborted"));
        });
      }

      setTimeout(() => {
        if (ws.readyState !== WebSocket.CLOSED) {
          ws.close();
          reject(new Error("Request timeout"));
        }
      }, options.timeout || this.timeout);
    });

    // Yield all collected results
    for (const result of results) {
      yield result;
    }
  }

  /**
   * Search for entities by name or pattern
   */
  async searchEntities(
    pattern: string,
    maxResults = 10
  ): Promise<QueryResponse> {
    return this.query({
      query: `find entities matching "${pattern}"`,
      maxResults,
      includeContext: false,
    });
  }

  /**
   * Find all usages of a specific entity
   */
  async findUsages(entityName: string): Promise<QueryResponse> {
    return this.query({
      query: `find all usages of ${entityName}`,
      maxResults: 50,
      includeContext: true,
    });
  }

  /**
   * Get architecture overview of the codebase
   */
  async getArchitecture(): Promise<QueryResponse> {
    return this.query({
      query: "show architecture overview",
      maxResults: 20,
      includeContext: true,
    });
  }

  /**
   * Clear the client-side cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }

  private async makeRequest<T>(
    endpoint: string,
    method: "GET" | "POST" | "PUT" | "DELETE",
    body?: any,
    options: ClientSearchOptions = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (this.apiKey) {
      headers["Authorization"] = `Bearer ${this.apiKey}`;
    }

    const requestInit: RequestInit = {
      method,
      headers,
      signal: options.signal,
      ...(body && { body: JSON.stringify(body) }),
    };

    for (let attempt = 0; attempt <= this.retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          controller.abort();
        }, options.timeout || this.timeout);

        const response = await fetch(url, {
          ...requestInit,
          signal: options.signal || controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const error = await response.text();
          throw new Error(`HTTP ${response.status}: ${error}`);
        }

        return await response.json();
      } catch (error) {
        if (attempt === this.retries) {
          throw error;
        }

        // Exponential backoff
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw new Error("Max retries exceeded");
  }

  private getCacheKey(operation: string, request: any): string {
    return `${operation}:${JSON.stringify(request)}`;
  }
}
