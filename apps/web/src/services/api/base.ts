// apps/web/src/services/api/base.ts
// Base API client for FARM Framework
// Provides common HTTP client functionality

export class ApiClient {
  public baseURL: string;
  private timeout: number;

  constructor(config: { baseURL?: string; timeout?: number } = {}) {
    this.baseURL = config.baseURL || "http://localhost:8000";
    this.timeout = config.timeout || 30000;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          ...options.headers,
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error("Request timeout");
      }
      throw error;
    }
  }

  async get<T>(
    endpoint: string,
    options: { params?: Record<string, any> } = {}
  ): Promise<T> {
    let url = endpoint;

    if (options.params) {
      const searchParams = new URLSearchParams();
      Object.entries(options.params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      });
      url += `?${searchParams.toString()}`;
    }

    return this.request<T>(url, { method: "GET" });
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: "PUT",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async patch<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: "PATCH",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string, options: { data?: any } = {}): Promise<T> {
    return this.request<T>(endpoint, {
      method: "DELETE",
      body: options.data ? JSON.stringify(options.data) : undefined,
    });
  }

  // Streaming endpoint for Server-Sent Events
  streamPost(endpoint: string, data?: any): EventSource {
    const url = `${this.baseURL}${endpoint}`;

    // For POST streaming, we need to send data via query params
    // since EventSource doesn't support POST body
    if (data) {
      const searchParams = new URLSearchParams();
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (typeof value === "object") {
            searchParams.append(key, JSON.stringify(value));
          } else {
            searchParams.append(key, String(value));
          }
        }
      });

      return new EventSource(`${url}?${searchParams.toString()}`);
    }

    return new EventSource(url);
  }
}
