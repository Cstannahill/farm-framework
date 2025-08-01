// API router for code intelligence - compatible with Express/Fastify
import type {
  QueryRequest,
  QueryResponse,
  ExplanationResponse,
  IndexStatus,
} from "../types/index";
import { CodeIntelligenceServer } from "../server";

export interface APIRouterConfig {
  server: CodeIntelligenceServer;
  rateLimit?: {
    requests: number;
    window: number;
  };
  auth?: {
    enabled: boolean;
    apiKey?: string;
  };
}

export class CodeIntelligenceAPIRouter {
  private server: CodeIntelligenceServer;
  private config: APIRouterConfig;

  constructor(config: APIRouterConfig) {
    this.server = config.server;
    this.config = config;
  }

  /**
   * Register routes with FastAPI app
   */
  registerRoutes(app: any): void {
    // Query endpoint
    app.post("/api/code-intelligence/query", async (request: any) => {
      try {
        const queryRequest: QueryRequest = await request.json();

        // Validate request
        this.validateQueryRequest(queryRequest);

        // Execute query
        const response = await this.server.query(queryRequest);

        return {
          status: "success",
          data: response,
        };
      } catch (error) {
        console.error("Query endpoint error:", error);
        return {
          status: "error",
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    });

    // Explain endpoint
    app.post("/api/code-intelligence/explain", async (request: any) => {
      try {
        const {
          entityName,
          includeExamples = true,
          includeTests = true,
        } = await request.json();

        if (!entityName) {
          throw new Error("entityName is required");
        }

        const response = await this.server.explain(entityName, {
          includeExamples,
          includeTests,
        });

        return {
          status: "success",
          data: response,
        };
      } catch (error) {
        console.error("Explain endpoint error:", error);
        return {
          status: "error",
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    });

    // Status endpoint
    app.get("/api/code-intelligence/status", async () => {
      try {
        const status = await this.server.getStatus();

        return {
          status: "success",
          data: status,
        };
      } catch (error) {
        console.error("Status endpoint error:", error);
        return {
          status: "error",
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    });

    // Reindex endpoint
    app.post("/api/code-intelligence/reindex", async () => {
      try {
        const result = await this.server.reindex();

        return {
          status: "success",
          data: result,
        };
      } catch (error) {
        console.error("Reindex endpoint error:", error);
        return {
          status: "error",
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    });

    // Search entities shortcut
    app.get("/api/code-intelligence/search/:pattern", async (request: any) => {
      try {
        const { pattern } = request.params;
        const { maxResults = 10 } = request.query;

        const entities = await this.server.searchEntities(
          pattern,
          parseInt(maxResults)
        );

        return {
          status: "success",
          data: entities,
        };
      } catch (error) {
        console.error("Search endpoint error:", error);
        return {
          status: "error",
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    });

    // Find usages shortcut
    app.get(
      "/api/code-intelligence/usages/:entityName",
      async (request: any) => {
        try {
          const { entityName } = request.params;

          const usages = await this.server.findUsages(entityName);

          return {
            status: "success",
            data: usages,
          };
        } catch (error) {
          console.error("Usages endpoint error:", error);
          return {
            status: "error",
            error: error instanceof Error ? error.message : "Unknown error",
          };
        }
      }
    );

    // WebSocket endpoint for streaming
    app.websocket("/api/code-intelligence/stream", (websocket: any) => {
      websocket.accept();

      websocket.on("message", async (data: string) => {
        try {
          const request = JSON.parse(data);

          // Stream results as they're found
          for await (const result of this.server.streamQuery(request)) {
            await websocket.send(
              JSON.stringify({
                type: "result",
                data: result,
              })
            );
          }

          await websocket.send(JSON.stringify({ type: "complete" }));
        } catch (error) {
          await websocket.send(
            JSON.stringify({
              type: "error",
              error: error instanceof Error ? error.message : "Unknown error",
            })
          );
        }
      });

      websocket.on("close", () => {
        console.log("WebSocket connection closed");
      });
    });

    console.log("✅ Code Intelligence API routes registered");
  }

  private validateQueryRequest(request: QueryRequest): void {
    if (!request.query) {
      throw new Error("query is required");
    }

    if (
      request.maxResults &&
      (request.maxResults < 1 || request.maxResults > 100)
    ) {
      throw new Error("maxResults must be between 1 and 100");
    }

    // Validate filters if present
    if (request.filters) {
      if (
        request.filters.entityTypes &&
        !Array.isArray(request.filters.entityTypes)
      ) {
        throw new Error("filters.entityTypes must be an array");
      }

      if (
        request.filters.filePatterns &&
        !Array.isArray(request.filters.filePatterns)
      ) {
        throw new Error("filters.filePatterns must be an array");
      }

      if (
        request.filters.languages &&
        !Array.isArray(request.filters.languages)
      ) {
        throw new Error("filters.languages must be an array");
      }
    }
  }

  private authenticateRequest(request: any): boolean {
    if (!this.config.auth?.enabled) {
      return true;
    }

    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return false;
    }

    const token = authHeader.substring(7);
    return token === this.config.auth.apiKey;
  }

  private checkRateLimit(clientId: string): boolean {
    // TODO: Implement rate limiting
    // For now, always allow
    return true;
  }
}

// Middleware functions
export function createAuthMiddleware(apiKey: string) {
  return (request: any, response: any, next: any) => {
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return response.status(401).json({
        status: "error",
        error: "Authorization header required",
      });
    }

    const token = authHeader.substring(7);
    if (token !== apiKey) {
      return response.status(401).json({
        status: "error",
        error: "Invalid API key",
      });
    }

    next();
  };
}

export function createRateLimitMiddleware(config: {
  requests: number;
  window: number;
}) {
  const requests = new Map<string, number[]>();

  return (request: any, response: any, next: any) => {
    const clientId = request.ip || "unknown";
    const now = Date.now();
    const windowStart = now - config.window * 1000;

    // Get or initialize request history for this client
    if (!requests.has(clientId)) {
      requests.set(clientId, []);
    }

    const clientRequests = requests.get(clientId)!;

    // Remove old requests outside the window
    const validRequests = clientRequests.filter((time) => time > windowStart);
    requests.set(clientId, validRequests);

    // Check rate limit
    if (validRequests.length >= config.requests) {
      return response.status(429).json({
        status: "error",
        error: "Rate limit exceeded",
      });
    }

    // Add current request
    validRequests.push(now);
    requests.set(clientId, validRequests);

    next();
  };
}

export function createCorsMiddleware() {
  return (request: any, response: any, next: any) => {
    response.setHeader("Access-Control-Allow-Origin", "*");
    response.setHeader(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, DELETE, OPTIONS"
    );
    response.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization"
    );

    if (request.method === "OPTIONS") {
      return response.status(200).end();
    }

    next();
  };
}
