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
export interface ApiResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
}

export interface ApiError {
  message: string;
  status: number;
  code?: string;
  details?: any;
  timestamp: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface RequestInterceptor {
  name: string;
  onRequest?: (
    config: InternalAxiosRequestConfig
  ) => InternalAxiosRequestConfig | Promise<InternalAxiosRequestConfig>;
  onRequestError?: (error: any) => any;
}

export interface ResponseInterceptor {
  name: string;
  onResponse?: (
    response: AxiosResponse
  ) => AxiosResponse | Promise<AxiosResponse>;
  onResponseError?: (error: AxiosError) => any;
}

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

export class ApiClient {
  private instance: AxiosInstance;
  private config: ApiClientConfig;

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
  async get<T = any>(
    url: string,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    const response = await this.instance.get<T>(url, config);
    return this.formatResponse(response);
  }

  async post<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    const response = await this.instance.post<T>(url, data, config);
    return this.formatResponse(response);
  }

  async put<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    const response = await this.instance.put<T>(url, data, config);
    return this.formatResponse(response);
  }

  async patch<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    const response = await this.instance.patch<T>(url, data, config);
    return this.formatResponse(response);
  }

  async delete<T = any>(
    url: string,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    const response = await this.instance.delete<T>(url, config);
    return this.formatResponse(response);
  }

  // Streaming support for AI responses
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
  private formatResponse<T>(response: AxiosResponse<T>): ApiResponse<T> {
    return {
      data: response.data,
      status: response.status,
      statusText: response.statusText,
      headers: response.headers as Record<string, string>,
    };
  }

  // Add interceptor dynamically
  addRequestInterceptor(interceptor: RequestInterceptor): void {
    this.instance.interceptors.request.use(
      interceptor.onRequest,
      interceptor.onRequestError
    );
  }

  addResponseInterceptor(interceptor: ResponseInterceptor): void {
    this.instance.interceptors.response.use(
      interceptor.onResponse,
      interceptor.onResponseError
    );
  }

  // Get the underlying axios instance for advanced usage
  getInstance(): AxiosInstance {
    return this.instance;
  }

  // Update base configuration
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
