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
   * Register routes with FastAPI app or Express-like framework
   */
  registerRoutes(app: any): void {
    // Apply middleware
    if (this.config.auth?.enabled) {
      app.use(createAuthMiddleware(this.config.auth.apiKey || ""));
    }

    if (this.config.rateLimit) {
      app.use(createRateLimitMiddleware(this.config.rateLimit));
    }

    app.use(createCorsMiddleware());

    // Health check endpoint
    app.get("/health", async (req: any, res: any) => {
      res.json({
        status: "healthy",
        timestamp: new Date().toISOString(),
        version: "1.0.0"
      });
    });

    // Query endpoint
    app.post("/query", async (req: any, res: any) => {
      try {
        // Validate request
        const queryRequest = this.validateQueryRequest(req.body);
        
        // Execute query
        const response = await this.server.query(queryRequest);
        
        res.json(response);
      } catch (error) {
        console.error("Query error:", error);
        res.status(500).json({
          error: error instanceof Error ? error.message : "Internal server error"
        });
      }
    });

    // Explain endpoint
    app.post("/explain", async (req: any, res: any) => {
      try {
        const { entityName, options } = req.body;
        
        if (!entityName) {
          return res.status(400).json({ error: "entityName is required" });
        }

        const response = await this.server.explainEntity(entityName, options || {});
        res.json(response);
      } catch (error) {
        console.error("Explain error:", error);
        res.status(500).json({
          error: error instanceof Error ? error.message : "Internal server error"
        });
      }
    });

    // Status endpoint
    app.get("/status", async (req: any, res: any) => {
      try {
        const status = await this.server.getStatus();
        res.json(status);
      } catch (error) {
        console.error("Status error:", error);
        res.status(500).json({
          error: error instanceof Error ? error.message : "Internal server error"
        });
      }
    });

    // Index endpoint
    app.post("/index", async (req: any, res: any) => {
      try {
        const { files } = req.body;
        
        if (!Array.isArray(files)) {
          return res.status(400).json({ error: "files array is required" });
        }

        await this.server.indexFiles(files);
        res.json({ success: true, message: `Indexed ${files.length} files` });
      } catch (error) {
        console.error("Index error:", error);
        res.status(500).json({
          error: error instanceof Error ? error.message : "Internal server error"
        });
      }
    });

    // Reset endpoint
    app.post("/reset", async (req: any, res: any) => {
      try {
        await this.server.reset();
        res.json({ success: true, message: "Index reset successfully" });
      } catch (error) {
        console.error("Reset error:", error);
        res.status(500).json({
          error: error instanceof Error ? error.message : "Internal server error"
        });
      }
    });
  }

  private validateQueryRequest(body: any): any {
    if (!body.query || typeof body.query !== "string") {
      throw new Error("Query string is required");
    }

    return {
      query: body.query,
      maxResults: body.maxResults || 10,
      includeContext: body.includeContext || false,
      filters: body.filters || {},
      options: body.options || {}
    };
  }

  private authenticateRequest(apiKey: string): boolean {
    return apiKey === this.config.auth?.apiKey;
  }

  private checkRateLimit(clientId: string): boolean {
    // Simple in-memory rate limiting
    // In production, use Redis or similar
    return true;
  }
}

export function createAuthMiddleware(apiKey: string) {
  return (request: any, response: any, next: any) => {
    const providedKey = request.headers["x-api-key"] || request.headers["authorization"]?.replace("Bearer ", "");
    
    if (!providedKey || providedKey !== apiKey) {
      return response.status(401).json({ error: "Unauthorized: Invalid API key" });
    }
    
    next();
  };
}

export function createRateLimitMiddleware(config: { requests: number; window: number }) {
  const clients = new Map<string, { count: number; resetTime: number }>();
  
  return (request: any, response: any, next: any) => {
    const clientId = request.ip || request.connection.remoteAddress || "unknown";
    const now = Date.now();
    
    let clientData = clients.get(clientId);
    
    if (!clientData || now > clientData.resetTime) {
      clientData = {
        count: 0,
        resetTime: now + config.window
      };
      clients.set(clientId, clientData);
    }
    
    if (clientData.count >= config.requests) {
      return response.status(429).json({
        error: "Rate limit exceeded",
        resetTime: new Date(clientData.resetTime).toISOString()
      });
    }
    
    clientData.count++;
    next();
  };
}

export function createCorsMiddleware() {
  return (request: any, response: any, next: any) => {
    response.header("Access-Control-Allow-Origin", "*");
    response.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    response.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization, x-api-key");
    
    if (request.method === "OPTIONS") {
      return response.sendStatus(200);
    }
    
    next();
  };
}