import type { 
  QueryResponse, 
  ExplanationResponse, 
  IndexStatus, 
  CodeIntelligenceClientConfig, 
  ClientQueryRequest, 
  ClientExplainRequest, 
  ClientSearchOptions 
} from "../types/index";

export class CodeIntelligenceAPIClient {
  private baseUrl: string;
  private timeout: number;
  private apiKey?: string;
  private retries: number;
  private cache: Map<string, any>;
  private cacheEnabled: boolean;

  constructor(config: CodeIntelligenceClientConfig = {}) {
    this.baseUrl = config.baseUrl || "http://localhost:8000";
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

    const response = await this.makeRequest<QueryResponse>("/query", {
      method: "POST",
      body: JSON.stringify(request),
      timeout: options.timeout,
      signal: options.signal,
    });

    if (this.cacheEnabled && !response.error) {
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

    const response = await this.makeRequest<ExplanationResponse>("/explain", {
      method: "POST",
      body: JSON.stringify(request),
    });

    if (this.cacheEnabled && response.entity) {
      this.cache.set(cacheKey, response);
    }

    return response;
  }

  /**
   * Get current status of the code intelligence index
   */
  async getStatus(): Promise<IndexStatus> {
    return this.makeRequest<IndexStatus>("/status", {
      method: "GET",
    });
  }

  /**
   * Trigger a full reindex of the codebase
   */
  async reindex(): Promise<{ message: string; taskId: string }> {
    return this.makeRequest<{ message: string; taskId: string }>("/reindex", {
      method: "POST",
    });
  }

  /**
   * Reset the code intelligence index
   */
  async reset(): Promise<{ success: boolean; message: string }> {
    this.clearCache();
    return this.makeRequest<{ success: boolean; message: string }>("/reset", {
      method: "POST",
    });
  }

  /**
   * Stream query results for real-time feedback
   */
  async* streamQuery(
    request: ClientQueryRequest, 
    options: ClientSearchOptions = {}
  ): AsyncGenerator<any, void, unknown> {
    const response = await fetch(`${this.baseUrl}/query/stream`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(this.apiKey && { "Authorization": `Bearer ${this.apiKey}` }),
      },
      body: JSON.stringify(request),
      signal: options.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("Response body is not readable");
    }

    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.trim()) {
            try {
              const data = JSON.parse(line);
              yield data;
            } catch (error) {
              console.warn("Failed to parse stream data:", line);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Search for entities by name or pattern
   */
  async searchEntities(pattern: string, maxResults: number = 10): Promise<QueryResponse> {
    return this.query({
      query: `search entities matching "${pattern}"`,
      maxResults,
      filters: {},
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
      filters: {},
    });
  }

  /**
   * Get architecture overview of the codebase
   */
  async getArchitecture(): Promise<QueryResponse> {
    return this.query({
      query: "analyze architecture patterns and structure",
      maxResults: 20,
      includeContext: true,
      filters: {},
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
    options: {
      method: string;
      body?: string;
      timeout?: number;
      signal?: AbortSignal;
    }
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const timeout = options.timeout || this.timeout;

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.retries; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      // Combine timeout signal with any provided signal
      const signal = options.signal 
        ? this.combineSignals([controller.signal, options.signal])
        : controller.signal;

      try {
        const response = await fetch(url, {
          method: options.method,
          headers: {
            "Content-Type": "application/json",
            ...(this.apiKey && { "Authorization": `Bearer ${this.apiKey}` }),
          },
          body: options.body,
          signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        return data;

      } catch (error) {
        clearTimeout(timeoutId);
        lastError = error instanceof Error ? error : new Error(String(error));

        // Don't retry on client errors or abort
        if (error instanceof Error) {
          if (error.name === "AbortError" || 
              (error.message.includes("HTTP 4") && !error.message.includes("HTTP 429"))) {
            break;
          }
        }

        // Wait before retrying (exponential backoff)
        if (attempt < this.retries - 1) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
    }

    throw lastError || new Error("Request failed after retries");
  }

  private getCacheKey(operation: string, request: any): string {
    return `${operation}:${JSON.stringify(request)}`;
  }

  private combineSignals(signals: AbortSignal[]): AbortSignal {
    const controller = new AbortController();

    const onAbort = () => controller.abort();

    signals.forEach(signal => {
      if (signal.aborted) {
        controller.abort();
        return;
      }
      signal.addEventListener("abort", onAbort);
    });

    // Clean up listeners when the combined signal is aborted
    controller.signal.addEventListener("abort", () => {
      signals.forEach(signal => signal.removeEventListener("abort", onAbort));
    });

    return controller.signal;
  }
}