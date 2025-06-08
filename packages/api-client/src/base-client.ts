// packages/api-client/src/base-client.ts
import axios, {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  AxiosError,
  InternalAxiosRequestConfig,
  AxiosProgressEvent,
} from "axios";

// Base types for API responses
/**
 * Standard API response returned from the server.
 *
 * @template T - Shape of the response payload
 */
export interface ApiResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
}

/**
 * Error object describing a failed API request.
 */
export interface ApiError {
  message: string;
  status: number;
  code?: string;
  details?: any;
  timestamp: string;
}

/**
 * Generic structure for paginated API responses.
 *
 * @template T - Shape of each item in the paginated list
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/**
 * Configuration for an Axios request interceptor.
 */
export interface RequestInterceptor {
  name: string;
  onRequest?: (
    config: InternalAxiosRequestConfig
  ) => InternalAxiosRequestConfig | Promise<InternalAxiosRequestConfig>;
  onRequestError?: (error: any) => any;
}

/**
 * Configuration for an Axios response interceptor.
 */
export interface ResponseInterceptor {
  name: string;
  onResponse?: (
    response: AxiosResponse
  ) => AxiosResponse | Promise<AxiosResponse>;
  onResponseError?: (error: AxiosError) => any;
}

/**
 * Options used when instantiating the {@link ApiClient}.
 */
export interface ApiClientConfig {
  baseURL: string;
  timeout?: number;
  headers?: Record<string, string>;
  withCredentials?: boolean;
  requestInterceptors?: RequestInterceptor[];
  responseInterceptors?: ResponseInterceptor[];
  retryConfig?: {
    retries: number;
    retryDelay: number;
    retryCondition?: (error: AxiosError) => boolean;
  };
}

/**
 * Lightweight wrapper around Axios with sane defaults and helper utilities.
 */
export class ApiClient {
  private instance: AxiosInstance;
  private config: ApiClientConfig;

  /**
   * Create a new API client instance.
   *
   * @param config - Runtime configuration for the client
   */
  constructor(config: ApiClientConfig) {
    this.config = config;
    this.instance = axios.create({
      baseURL: config.baseURL,
      timeout: config.timeout || 10000,
      headers: {
        "Content-Type": "application/json",
        ...config.headers,
      },
      withCredentials: config.withCredentials || false,
    });

    this.setupInterceptors();
  }

  /**
   * Register request/response interceptors with the underlying Axios instance.
   */
  private setupInterceptors(): void {
    // Setup request interceptors
    this.config.requestInterceptors?.forEach((interceptor) => {
      this.instance.interceptors.request.use(
        interceptor.onRequest,
        interceptor.onRequestError
      );
    });

    // Setup response interceptors
    this.config.responseInterceptors?.forEach((interceptor) => {
      this.instance.interceptors.response.use(
        interceptor.onResponse,
        interceptor.onResponseError
      );
    });

    // Default error handling interceptor
    this.instance.interceptors.response.use(
      (response) => response,
      this.handleResponseError.bind(this)
    );
  }

  /**
   * Handle an HTTP error returned from Axios.
   *
   * @param error - The Axios error object
   * @returns A promise that rejects with a normalized {@link ApiError}
   */
  private async handleResponseError(
    error: AxiosError
  ): Promise<AxiosResponse | never> {
    const apiError: ApiError = {
      message: error.message,
      status: error.response?.status || 0,
      code: error.code,
      details: error.response?.data,
      timestamp: new Date().toISOString(),
    };

    // Enhanced error messages based on status codes
    if (error.response?.status) {
      switch (error.response.status) {
        case 400:
          apiError.message = "Bad Request: Please check your input";
          break;
        case 401:
          apiError.message = "Unauthorized: Please login to continue";
          break;
        case 403:
          apiError.message =
            "Forbidden: You don't have permission to access this resource";
          break;
        case 404:
          apiError.message = "Not Found: The requested resource was not found";
          break;
        case 429:
          apiError.message = "Too Many Requests: Please try again later";
          break;
        case 500:
          apiError.message =
            "Internal Server Error: Something went wrong on our end";
          break;
        case 502:
          apiError.message = "Bad Gateway: Service temporarily unavailable";
          break;
        case 503:
          apiError.message = "Service Unavailable: Please try again later";
          break;
        default:
          apiError.message = `Request failed with status ${error.response.status}`;
      }
    }

    // Retry logic
    if (this.config.retryConfig && this.shouldRetry(error)) {
      return this.retryRequest(error);
    }

    throw apiError;
  }

  /**
   * Determine whether a request should be retried based on configuration.
   *
   * @param error - The error returned by Axios
   * @returns `true` if the request is retryable
   */
  private shouldRetry(error: AxiosError): boolean {
    if (!this.config.retryConfig) return false;

    const { retryCondition } = this.config.retryConfig;
    if (retryCondition) {
      return retryCondition(error);
    }

    // Default retry conditions
    const retryableStatuses = [408, 429, 500, 502, 503, 504];
    return retryableStatuses.includes(error.response?.status || 0);
  }

  /**
   * Execute a retry with exponential backoff for a failed request.
   *
   * @param error - The original Axios error
   * @returns A promise resolving to the Axios response once retried
   */
  private async retryRequest(error: AxiosError): Promise<AxiosResponse> {
    const { retries, retryDelay } = this.config.retryConfig!;
    const currentRetry = (error.config as any).__retryCount || 0;

    if (currentRetry >= retries) {
      throw error;
    }

    (error.config as any).__retryCount = currentRetry + 1;

    await new Promise((resolve) =>
      setTimeout(resolve, retryDelay * Math.pow(2, currentRetry))
    );

    return this.instance.request(error.config!);
  }

  // Core HTTP methods
  /**
   * Perform a HTTP GET request.
   *
   * @param url - Endpoint URL relative to the base URL
   * @param config - Optional Axios request configuration
   * @returns The formatted API response
   */
  async get<T = any>(
    url: string,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    const response = await this.instance.get<T>(url, config);
    return this.formatResponse(response);
  }

  /**
   * Perform a HTTP POST request.
   */
  async post<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    const response = await this.instance.post<T>(url, data, config);
    return this.formatResponse(response);
  }

  /**
   * Perform a HTTP PUT request.
   */
  async put<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    const response = await this.instance.put<T>(url, data, config);
    return this.formatResponse(response);
  }

  /**
   * Perform a HTTP PATCH request.
   */
  async patch<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    const response = await this.instance.patch<T>(url, data, config);
    return this.formatResponse(response);
  }

  /**
   * Perform a HTTP DELETE request.
   */
  async delete<T = any>(
    url: string,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    const response = await this.instance.delete<T>(url, config);
    return this.formatResponse(response);
  }

  // Streaming support for AI responses
  /**
   * Create an {@link EventSource} connection for GET streaming endpoints.
   */
  async stream(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<EventSource> {
    const fullUrl = this.config.baseURL + url;

    // For streaming, we use EventSource for Server-Sent Events
    const eventSource = new EventSource(fullUrl, {
      withCredentials: this.config.withCredentials || false,
    });

    return eventSource;
  }

  // WebSocket streaming for real-time AI responses
  /**
   * Create an {@link EventSource} connection for POST endpoints.
   */
  async streamPost(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<EventSource> {
    // Convert POST data to query params for EventSource
    const queryParams = new URLSearchParams();
    if (data) {
      Object.entries(data).forEach(([key, value]) => {
        queryParams.append(key, JSON.stringify(value));
      });
    }

    const fullUrl = `${this.config.baseURL}${url}?${queryParams.toString()}`;

    return new EventSource(fullUrl, {
      withCredentials: this.config.withCredentials || false,
    });
  }

  // File upload support
  /**
   * Upload a file using multipart/form-data.
   */
  async uploadFile<T = any>(
    url: string,
    file: File,
    fieldName = "file",
    additionalData?: Record<string, any>,
    onProgress?: (progressEvent: AxiosProgressEvent) => void
  ): Promise<ApiResponse<T>> {
    const formData = new FormData();
    formData.append(fieldName, file);

    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        formData.append(key, JSON.stringify(value));
      });
    }

    const response = await this.instance.post<T>(url, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      onUploadProgress: onProgress,
    });

    return this.formatResponse(response);
  }

  // Utility methods
  /**
   * Convert an Axios response into the simplified {@link ApiResponse} shape.
   */
  private formatResponse<T>(response: AxiosResponse<T>): ApiResponse<T> {
    return {
      data: response.data,
      status: response.status,
      statusText: response.statusText,
      headers: response.headers as Record<string, string>,
    };
  }

  // Add interceptor dynamically
  /**
   * Register a new request interceptor at runtime.
   */
  addRequestInterceptor(interceptor: RequestInterceptor): void {
    this.instance.interceptors.request.use(
      interceptor.onRequest,
      interceptor.onRequestError
    );
  }

  /**
   * Register a new response interceptor at runtime.
   */
  addResponseInterceptor(interceptor: ResponseInterceptor): void {
    this.instance.interceptors.response.use(
      interceptor.onResponse,
      interceptor.onResponseError
    );
  }

  // Get the underlying axios instance for advanced usage
  /**
   * Expose the underlying Axios instance for advanced customisation.
   */
  getInstance(): AxiosInstance {
    return this.instance;
  }

  // Update base configuration
  /**
   * Update the base client configuration and underlying Axios defaults.
   */
  updateConfig(updates: Partial<ApiClientConfig>): void {
    if (updates.baseURL) {
      this.instance.defaults.baseURL = updates.baseURL;
    }
    if (updates.timeout) {
      this.instance.defaults.timeout = updates.timeout;
    }
    if (updates.headers) {
      this.instance.defaults.headers = {
        ...this.instance.defaults.headers,
        ...updates.headers,
      };
    }

    Object.assign(this.config, updates);
  }
}

// Default interceptors for FARM framework
/**
 * Basic request interceptor that attaches a bearer token from local storage.
 */
export const authInterceptor: RequestInterceptor = {
  name: "auth",
  onRequest: (config) => {
    const token = localStorage.getItem("auth_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
};

/**
 * Simple response interceptor that logs requests in development mode.
 */
export const loggingInterceptor: ResponseInterceptor = {
  name: "logging",
  onResponse: (response) => {
    if (process.env.NODE_ENV === "development") {
      console.log(
        `[API] ${response.config.method?.toUpperCase()} ${
          response.config.url
        } - ${response.status}`
      );
    }
    return response;
  },
  onResponseError: (error) => {
    if (process.env.NODE_ENV === "development") {
      console.error(
        `[API Error] ${error.config?.method?.toUpperCase()} ${
          error.config?.url
        } - ${error.response?.status || "Network Error"}`
      );
    }
    throw error;
  },
};

// Factory function for creating configured API clients
/**
 * Convenience helper for creating a pre-configured {@link ApiClient}.
 *
 * @param config - Partial configuration that overrides the defaults
 */
export function createApiClient(
  config: Partial<ApiClientConfig> = {}
): ApiClient {
  const defaultConfig: ApiClientConfig = {
    baseURL: process.env.VITE_API_URL || "http://localhost:8000",
    timeout: 10000,
    withCredentials: true,
    requestInterceptors: [authInterceptor],
    responseInterceptors: [loggingInterceptor],
    retryConfig: {
      retries: 3,
      retryDelay: 1000,
      retryCondition: (error) => {
        const retryableStatuses = [408, 429, 500, 502, 503, 504];
        return retryableStatuses.includes(error.response?.status || 0);
      },
    },
  };

  return new ApiClient({ ...defaultConfig, ...config });
}
