/**
 * API Client Types
 */

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
  onRequest?: (config: any) => any | Promise<any>;
  onRequestError?: (error: any) => any;
}

/**
 * Configuration for an Axios response interceptor.
 */
export interface ResponseInterceptor {
  name: string;
  onResponse?: (response: any) => any | Promise<any>;
  onResponseError?: (error: any) => any;
}

/**
 * Options used when instantiating the ApiClient.
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
    retryCondition?: (error: any) => boolean;
  };
}

/**
 * Utility type for making all properties of an object optional recursively.
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};
