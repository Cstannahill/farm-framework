// packages/ui-components/src/providers/query-provider.tsx
import React, { ReactNode } from "react";
import {
  QueryClient,
  QueryClientProvider,
  QueryCache,
  MutationCache,
} from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

// Default query client configuration optimized for FARM apps
const createQueryClient = () => {
  return new QueryClient({
    queryCache: new QueryCache({
      onError: (error, query) => {
        // Global error handling
        console.error("Query Error:", error, "Query Key:", query.queryKey);
      },
    }),
    mutationCache: new MutationCache({
      onError: (error, variables, context, mutation) => {
        // Global mutation error handling
        console.error("Mutation Error:", error, "Variables:", variables);
      },
    }),
    defaultOptions: {
      queries: {
        // 24 hours stale time for most queries
        staleTime: 1000 * 60 * 60 * 24,
        // 5 minutes cache time
        gcTime: 1000 * 60 * 5,
        // Retry configuration
        retry: (failureCount, error: any) => {
          // Don't retry on 4xx errors except 408, 429
          if (error?.status >= 400 && error?.status < 500) {
            return error?.status === 408 || error?.status === 429
              ? failureCount < 2
              : false;
          }
          // Retry on 5xx errors and network errors
          return failureCount < 3;
        },
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        // Background refetch configuration
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
        refetchOnMount: true,
      },
      mutations: {
        retry: 1,
        retryDelay: 1000,
      },
    },
  });
};

interface FarmQueryProviderProps {
  children: ReactNode;
  client?: QueryClient;
  enableDevtools?: boolean;
}

export function FarmQueryProvider({
  children,
  client,
  enableDevtools = process.env.NODE_ENV === "development",
}: FarmQueryProviderProps) {
  const queryClient = client || createQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {enableDevtools && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}

// Hook for accessing query client
export { useQueryClient } from "@tanstack/react-query";

// Utility hook for invalidating queries by pattern
export function useInvalidateQueries() {
  const queryClient = useQueryClient();

  return {
    invalidateAll: () => queryClient.invalidateQueries(),
    invalidateByKey: (queryKey: unknown[]) =>
      queryClient.invalidateQueries({ queryKey }),
    invalidateByPattern: (pattern: string) =>
      queryClient.invalidateQueries({
        predicate: (query) =>
          query.queryKey.some(
            (key) => typeof key === "string" && key.includes(pattern)
          ),
      }),
  };
}

// Error boundary for query errors
import { Component, ErrorInfo, ReactNode } from "react";

interface QueryErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface QueryErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error) => ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

export class QueryErrorBoundary extends Component<
  QueryErrorBoundaryProps,
  QueryErrorBoundaryState
> {
  constructor(props: QueryErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): QueryErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.props.onError?.(error, errorInfo);
  }

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error);
      }

      return (
        <div className="p-4 border border-red-200 rounded-lg bg-red-50">
          <h3 className="text-lg font-semibold text-red-800 mb-2">
            Something went wrong
          </h3>
          <p className="text-red-600 mb-4">{this.state.error.message}</p>
          <button
            onClick={() => this.setState({ hasError: false, error: undefined })}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Template generation for query provider setup
export const QUERY_PROVIDER_TEMPLATE = `// Generated query provider setup
import React from 'react';
import { FarmQueryProvider, QueryErrorBoundary } from '@farm/ui-components';

export function AppQueryProvider({ children }: { children: React.ReactNode }) {
  return (
    <QueryErrorBoundary>
      <FarmQueryProvider enableDevtools={process.env.NODE_ENV === 'development'}>
        {children}
      </FarmQueryProvider>
    </QueryErrorBoundary>
  );
}
`;
