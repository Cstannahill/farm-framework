import { spawn, ChildProcess } from "child_process";
import fsExtra from "fs-extra";
import { join } from "path";
import { performance } from "perf_hooks";

const { readFile, writeFile, ensureDir, pathExists } = fsExtra;

export interface OpenAPIExtractionOptions {
  include?: string[];
  exclude?: string[];
  host?: string;
  port?: number;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  enableCache?: boolean;
  cacheTimeout?: number;
  serverStartupTime?: number;
  healthCheckEndpoint?: string;
}

export interface ExtractionResult {
  schema: any;
  source: "running-server" | "temp-server" | "cache" | "static-file";
  extractionTime: number;
  serverStartupTime?: number;
  retryCount?: number;
}

export class OpenAPIExtractor {
  private options: Required<OpenAPIExtractionOptions>;
  private runningServer?: ChildProcess;
  private lastSchemaCache?: { schema: any; timestamp: number; path: string };

  constructor(options: OpenAPIExtractionOptions = {}) {
    this.options = {
      host: "localhost",
      port: 8000,
      timeout: 30000,
      retries: 3,
      retryDelay: 2000,
      enableCache: true,
      cacheTimeout: 60000, // 1 minute
      serverStartupTime: 5000,
      healthCheckEndpoint: "/health",
      include: [],
      exclude: [],
      ...options,
    };
  }

  async extractFromFastAPI(
    apiPath: string,
    outputPath: string,
    options: OpenAPIExtractionOptions = {}
  ): Promise<ExtractionResult> {
    const mergedOptions = { ...this.options, ...options };
    const startTime = performance.now();

    try {
      await ensureDir(join(outputPath, ".."));

      // Try extraction methods in order of preference
      const extractionMethods = [
        () => this.tryRunningServer(mergedOptions),
        () => this.tryStaticFile(apiPath),
        () => this.tryCachedSchema(outputPath, mergedOptions),
        () =>
          this.generateSchemaWithTempServer(apiPath, outputPath, mergedOptions),
      ];

      let lastError: Error | null = null;

      for (const method of extractionMethods) {
        try {
          const result = await method();
          if (result) {
            const extractionTime = performance.now() - startTime;

            // Save to output file
            await writeFile(outputPath, JSON.stringify(result.schema, null, 2));

            // Update cache
            if (mergedOptions.enableCache && result.source !== "cache") {
              this.lastSchemaCache = {
                schema: result.schema,
                timestamp: Date.now(),
                path: outputPath,
              };
            }

            return {
              ...result,
              extractionTime,
            };
          }
        } catch (error) {
          lastError = error as Error;
          console.warn(
            `Extraction method failed: ${error instanceof Error ? error.message : "Unknown error"}`
          );
        }
      }

      throw lastError || new Error("All extraction methods failed");
    } catch (error) {
      throw new Error(
        `Failed to extract OpenAPI schema: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Try to fetch schema from already running server
   */
  private async tryRunningServer(
    options: OpenAPIExtractionOptions
  ): Promise<ExtractionResult | null> {
    try {
      // First check if server is healthy
      if (options.healthCheckEndpoint) {
        await this.checkServerHealth(options);
      }

      const schema = await this.fetchSchemaFromServer(options);
      if (schema) {
        return {
          schema,
          source: "running-server",
          extractionTime: 0, // Will be set by caller
        };
      }
    } catch (error) {
      // Server not available, try other methods
    }
    return null;
  }

  /**
   * Try to load schema from static file (like openapi.json in repo)
   */
  private async tryStaticFile(
    apiPath: string
  ): Promise<ExtractionResult | null> {
    const staticPaths = [
      join(apiPath, "openapi.json"),
      join(apiPath, "src", "openapi.json"),
      join(apiPath, "docs", "openapi.json"),
      join(apiPath, "static", "openapi.json"),
    ];

    for (const staticPath of staticPaths) {
      try {
        if (await pathExists(staticPath)) {
          const content = await readFile(staticPath, "utf8");
          const schema = JSON.parse(content);

          // Basic validation
          if (schema.openapi || schema.swagger) {
            return {
              schema,
              source: "static-file",
              extractionTime: 0,
            };
          }
        }
      } catch (error) {
        // Continue to next path
      }
    }

    return null;
  }

  /**
   * Try to use cached schema if recent enough
   */
  private async tryCachedSchema(
    outputPath: string,
    options: OpenAPIExtractionOptions
  ): Promise<ExtractionResult | null> {
    if (!options.enableCache) return null;

    // Check memory cache first
    if (
      this.lastSchemaCache &&
      this.lastSchemaCache.path === outputPath &&
      Date.now() - this.lastSchemaCache.timestamp < options.cacheTimeout!
    ) {
      return {
        schema: this.lastSchemaCache.schema,
        source: "cache",
        extractionTime: 0,
      };
    }

    // Check if output file exists and is recent
    try {
      if (await pathExists(outputPath)) {
        const stats = await fsExtra.stat(outputPath);
        const fileAge = Date.now() - stats.mtime.getTime();

        if (fileAge < options.cacheTimeout!) {
          const content = await readFile(outputPath, "utf8");
          const schema = JSON.parse(content);

          // Update memory cache
          this.lastSchemaCache = {
            schema,
            timestamp: stats.mtime.getTime(),
            path: outputPath,
          };

          return {
            schema,
            source: "cache",
            extractionTime: 0,
          };
        }
      }
    } catch (error) {
      // Cache invalid, continue
    }

    return null;
  }

  /**
   * Check if server is healthy before attempting schema extraction
   */
  private async checkServerHealth(
    options: OpenAPIExtractionOptions
  ): Promise<boolean> {
    try {
      const healthUrl = `http://${options.host}:${options.port}${options.healthCheckEndpoint}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(healthUrl, {
        signal: controller.signal,
        headers: { Accept: "application/json" },
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * Fetch schema from running server with retries
   */
  private async fetchSchemaFromServer(
    options: OpenAPIExtractionOptions
  ): Promise<any | null> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= options.retries!; attempt++) {
      try {
        const url = `http://${options.host}:${options.port}/openapi.json`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), options.timeout);

        const response = await fetch(url, {
          signal: controller.signal,
          headers: {
            Accept: "application/json",
            "User-Agent": "FARM-TypeSync/1.0",
          },
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const schema = await response.json();

          // Basic validation
          if (!schema.openapi && !schema.swagger) {
            throw new Error("Invalid OpenAPI schema format");
          }

          return schema;
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      } catch (error) {
        lastError = error as Error;

        if (attempt < options.retries!) {
          console.warn(
            `Schema fetch attempt ${attempt + 1} failed, retrying in ${options.retryDelay}ms...`
          );
          await this.delay(options.retryDelay!);
        }
      }
    }

    throw lastError || new Error("Failed to fetch schema after all retries");
  }

  /**
   * Generate schema by starting temporary server
   */
  private async generateSchemaWithTempServer(
    apiPath: string,
    outputPath: string,
    options: OpenAPIExtractionOptions
  ): Promise<ExtractionResult> {
    const serverStartTime = performance.now();
    let serverProcess: ChildProcess | null = null;

    return new Promise((resolve, reject) => {
      try {
        // Find Python executable
        const pythonCmd = this.findPythonExecutable();

        // Start server
        serverProcess = spawn(
          pythonCmd,
          [
            "-m",
            "uvicorn",
            "src.main:app",
            "--host",
            options.host || "localhost",
            "--port",
            String(options.port || 8000),
            "--log-level",
            "error", // Reduce noise
          ],
          {
            cwd: apiPath,
            stdio: ["ignore", "pipe", "pipe"],
            detached: false,
          }
        );

        this.runningServer = serverProcess;

        // Handle server errors
        serverProcess.on("error", (error) => {
          reject(new Error(`Failed to start server: ${error.message}`));
        });

        // Wait for server startup then fetch schema
        setTimeout(async () => {
          try {
            const serverStartupTime = performance.now() - serverStartTime;
            const schema = await this.fetchSchemaFromServer(options);

            if (schema) {
              resolve({
                schema,
                source: "temp-server",
                extractionTime: 0, // Will be set by caller
                serverStartupTime,
                retryCount: 0,
              });
            } else {
              reject(new Error("Failed to fetch schema from temporary server"));
            }
          } catch (err) {
            reject(err);
          } finally {
            this.cleanupServer(serverProcess);
          }
        }, options.serverStartupTime);

        // Cleanup timeout
        setTimeout(() => {
          if (serverProcess && !serverProcess.killed) {
            this.cleanupServer(serverProcess);
            reject(new Error("Server startup timeout"));
          }
        }, options.timeout);
      } catch (error) {
        if (serverProcess) {
          this.cleanupServer(serverProcess);
        }
        reject(error);
      }
    });
  }

  /**
   * Find available Python executable
   */
  private findPythonExecutable(): string {
    const candidates = ["python3", "python", "py"];

    // On Windows, prefer 'py' launcher
    if (process.platform === "win32") {
      return "py";
    }

    return "python3";
  }

  /**
   * Clean up server process
   */
  private cleanupServer(serverProcess: ChildProcess | null): void {
    if (serverProcess && !serverProcess.killed) {
      try {
        serverProcess.kill("SIGTERM");

        // Force kill after delay if not terminated
        setTimeout(() => {
          if (serverProcess && !serverProcess.killed) {
            serverProcess.kill("SIGKILL");
          }
        }, 3000);
      } catch (error) {
        console.warn("Error cleaning up server process:", error);
      }
    }

    if (this.runningServer === serverProcess) {
      this.runningServer = undefined;
    }
  }

  /**
   * Delay utility
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Cleanup any running servers
   */
  async cleanup(): Promise<void> {
    if (this.runningServer) {
      this.cleanupServer(this.runningServer);
    }
  }

  /**
   * Clear cached schema
   */
  clearCache(): void {
    this.lastSchemaCache = undefined;
  }
}
