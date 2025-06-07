// packages/ui-components/src/providers/query-provider.tsx
import React, { ReactNode, Component, ErrorInfo } from "react";
import {
  QueryClient,
  QueryClientProvider,
  useQueryClient,
} from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

interface QueryErrorInfo {
  error: Error | null;
}

interface QueryProviderProps {
  children: ReactNode;
  client?: QueryClient;
}

// Error handler functions with proper typing
const defaultQueryErrorHandler = (error: Error, query: any) => {
  console.error("Query error:", error, query);
};

const defaultMutationErrorHandler = (
  error: Error,
  variables: any,
  context: any,
  mutation: any
) => {
  console.error("Mutation error:", error, { variables, context, mutation });
};

// Default retry function
const defaultRetryFunction = (failureCount: number, error: Error) => {
  if (failureCount < 3) {
    return true;
  }
  return false;
};

// Default retry delay function
const defaultRetryDelay = (attemptIndex: number) => {
  return Math.min(1000 * 2 ** attemptIndex, 30000);
};

// Create default query client
const createQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: defaultRetryFunction,
        retryDelay: defaultRetryDelay,
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes
      },
      mutations: {
        retry: defaultRetryFunction,
        retryDelay: defaultRetryDelay,
      },
    },
  });
};

export function QueryProvider({ children, client }: QueryProviderProps) {
  const queryClient = client || createQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}

// Query invalidation helper hook
export function useInvalidateQueries() {
  const queryClient = useQueryClient();

  return {
    invalidateQueries: (queryKey: any[]) => {
      return queryClient.invalidateQueries({ queryKey });
    },
    invalidateAll: () => {
      const queries = queryClient.getQueryCache().getAll();
      queries.forEach((query) => {
        queryClient.invalidateQueries({ queryKey: query.queryKey });
      });
    },
  };
}

// Error boundary for query errors
interface QueryErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

interface QueryErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error) => ReactNode;
}

export class QueryErrorBoundary extends Component<
  QueryErrorBoundaryProps,
  QueryErrorBoundaryState
> {
  constructor(props: QueryErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): QueryErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Query Error Boundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error);
      }

      return (
        <div className="error-boundary">
          <h2>Something went wrong with data loading.</h2>
          <details>
            <summary>Error details</summary>
            <pre>{this.state.error.message}</pre>
          </details>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
