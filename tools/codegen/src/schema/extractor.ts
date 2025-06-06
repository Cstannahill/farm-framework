// tools/codegen/src/schema/extractor.ts
import { spawn, ChildProcess } from "child_process";
import { join, dirname, resolve } from "path";
import { fileURLToPath } from "url";
import fetch from "node-fetch";
import { writeFile, readFile, ensureDir, pathExists } from "fs-extra";
import { createHash } from "crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface SchemaExtractionOptions {
  apiModule?: string;
  host?: string;
  port?: number;
  timeout?: number;
  forceRefresh?: boolean;
  cacheDir?: string;
}

export interface SchemaExtractionResult {
  schema: any;
  cached: boolean;
  extractionTime: number;
}

export class OpenAPISchemaExtractor {
  private cacheDir: string;

  constructor() {
    this.cacheDir = join(process.cwd(), ".farm", "cache", "schemas");
  }

  async setCacheDir(dir: string): Promise<void> {
    this.cacheDir = dir;
    await ensureDir(this.cacheDir);
  }

  async extractSchema(
    options: SchemaExtractionOptions = {}
  ): Promise<SchemaExtractionResult> {
    console.log("🔍 Extracting OpenAPI schema from FastAPI app...");

    const {
      apiModule = join(__dirname, "../__tests__/test-fixtures/fastapi-app.py"),
      host = "localhost",
      port = 8899,
      timeout = 30000,
      forceRefresh = false,
    } = options;

    const startTime = Date.now();

    try {
      // Check cache first
      if (!forceRefresh) {
        const cached = await this.getCachedSchema(apiModule);
        if (cached) {
          console.log("📦 Using cached schema");
          return {
            schema: cached,
            cached: true,
            extractionTime: Date.now() - startTime,
          };
        }
      }

      // Start FastAPI server
      const server = await this.startFastAPIServer(apiModule, port, timeout);

      try {
        // Extract schema from running server
        const schema = await this.fetchSchemaFromServer(host, port, timeout);

        // Validate schema
        if (!this.validateSchema(schema)) {
          throw new Error("Invalid OpenAPI schema structure");
        }

        // Cache the schema
        await this.cacheSchema(apiModule, schema);

        console.log("✅ Schema extracted successfully");
        return {
          schema,
          cached: false,
          extractionTime: Date.now() - startTime,
        };
      } finally {
        // Always cleanup the server
        await this.stopFastAPIServer(server);
      }
    } catch (error: any) {
      throw new Error(`Schema extraction failed: ${error.message}`);
    }
  }

  private async startFastAPIServer(
    apiModule: string,
    port: number,
    timeout: number
  ): Promise<ChildProcess> {
    return new Promise<ChildProcess>((resolve, reject) => {
      console.log(`🚀 Starting FastAPI server from: ${apiModule}`);

      // Resolve the absolute path
      const absolutePath = resolve(apiModule);

      // Start uvicorn with the Python file - use explicit typing to avoid overload conflicts
      const server: ChildProcess = spawn("python", [absolutePath], {
        stdio: "pipe" as const,
        env: {
          ...process.env,
          PORT: port.toString(),
          PYTHONPATH: dirname(absolutePath), // Add the directory to Python path
          PYTHONUNBUFFERED: "1", // Ensure output is not buffered
        },
        cwd: dirname(absolutePath), // Set working directory to the file's directory
      });

      let started = false;
      const timeoutId = setTimeout(() => {
        if (!started) {
          server.kill?.();
          reject(
            new Error(`FastAPI server failed to start within ${timeout}ms`)
          );
        }
      }, timeout);

      if (server.stdout) {
        server.stdout.on("data", (data: Buffer) => {
          const output = data.toString();
          console.log(`📡 FastAPI: ${output.trim()}`);

          // Look for server startup indicators
          if (
            output.includes("Uvicorn running on") ||
            output.includes("Application startup complete")
          ) {
            if (!started) {
              started = true;
              clearTimeout(timeoutId);
              // Give it a moment to fully initialize
              setTimeout(() => resolve(server), 1000);
            }
          }
        });
      }

      if (server.stderr) {
        server.stderr.on("data", (data: Buffer) => {
          const error = data.toString();
          console.error(`🔥 FastAPI Error: ${error.trim()}`);

          // Check for critical errors that should fail immediately
          if (error.includes("Error") || error.includes("Exception")) {
            clearTimeout(timeoutId);
            reject(new Error(`FastAPI server error: ${error}`));
          }
        });
      }

      server.on("close", (code: number | null) => {
        clearTimeout(timeoutId);
        if (!started) {
          reject(new Error(`FastAPI server exited with code ${code}`));
        }
      });

      server.on("error", (error: Error) => {
        clearTimeout(timeoutId);
        reject(new Error(`Failed to start FastAPI server: ${error.message}`));
      });
    });
  }

  private async stopFastAPIServer(server: ChildProcess): Promise<void> {
    return new Promise((resolve) => {
      if (!server.killed && !server.exitCode) {
        // Set up the close handler before killing
        const cleanup = () => {
          clearTimeout(forceKillTimeout);
          resolve();
        };

        server.once("close", cleanup);
        server.once("exit", cleanup);

        // Try graceful termination first
        server.kill("SIGTERM");

        // Force kill after 3 seconds
        const forceKillTimeout = setTimeout(() => {
          if (!server.killed && !server.exitCode) {
            server.kill("SIGKILL");
          }
          // Resolve anyway after force kill attempt
          setTimeout(resolve, 1000);
        }, 3000);
      } else {
        resolve();
      }
    });
  }

  private async fetchSchemaFromServer(
    host: string,
    port: number,
    timeout: number
  ): Promise<any> {
    const schemaUrl = `http://${host}:${port}/openapi.json`;

    // Wait a bit for server to be ready
    await new Promise((resolve) => setTimeout(resolve, 2000));

    try {
      // Create AbortController for timeout functionality
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(schemaUrl, {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const schema = await response.json();
      return schema;
    } catch (error: any) {
      if (error.name === "AbortError") {
        throw new Error(`Request timeout after ${timeout}ms`);
      }
      throw new Error(
        `Failed to fetch schema from ${schemaUrl}: ${error.message}`
      );
    }
  }

  private validateSchema(schema: any): boolean {
    if (!schema || typeof schema !== "object") {
      return false;
    }

    // Check required OpenAPI fields
    const requiredFields = ["openapi", "info", "paths"];
    for (const field of requiredFields) {
      if (!(field in schema)) {
        console.warn(`⚠️ Missing required field: ${field}`);
        return false;
      }
    }

    // Check OpenAPI version
    if (!schema.openapi || !schema.openapi.startsWith("3.")) {
      console.warn(`⚠️ Unsupported OpenAPI version: ${schema.openapi}`);
      return false;
    }

    return true;
  }

  private async getCachedSchema(apiModule: string): Promise<any | null> {
    try {
      await ensureDir(this.cacheDir);

      const hash = createHash("md5").update(apiModule).digest("hex");
      const cacheFile = join(this.cacheDir, `${hash}.json`);

      if (await pathExists(cacheFile)) {
        const cached = await readFile(cacheFile, "utf-8");
        return JSON.parse(cached);
      }
    } catch (error: any) {
      console.warn(`⚠️ Failed to read cached schema: ${error.message}`);
    }

    return null;
  }

  private async cacheSchema(apiModule: string, schema: any): Promise<void> {
    try {
      await ensureDir(this.cacheDir);

      const hash = createHash("md5").update(apiModule).digest("hex");
      const cacheFile = join(this.cacheDir, `${hash}.json`);

      await writeFile(cacheFile, JSON.stringify(schema, null, 2));
      console.log("💾 Schema cached successfully");
    } catch (error: any) {
      console.warn(`⚠️ Failed to cache schema: ${error.message}`);
    }
  }

  async clearCache(): Promise<void> {
    try {
      await ensureDir(this.cacheDir);
      const { remove } = await import("fs-extra");
      await remove(this.cacheDir);
      await ensureDir(this.cacheDir);
      console.log("🗑️ Schema cache cleared");
    } catch (error: any) {
      console.warn(`⚠️ Failed to clear cache: ${error.message}`);
    }
  }

  async getCacheStats(): Promise<{ files: number; totalSize: number }> {
    try {
      const { readdir, stat } = await import("fs-extra");

      if (!(await pathExists(this.cacheDir))) {
        return { files: 0, totalSize: 0 };
      }

      const files = await readdir(this.cacheDir);
      let totalSize = 0;

      for (const file of files) {
        const filePath = join(this.cacheDir, file);
        const stats = await stat(filePath);
        totalSize += stats.size;
      }

      return { files: files.length, totalSize };
    } catch (error: any) {
      console.warn(`⚠️ Failed to get cache stats: ${error.message}`);
      return { files: 0, totalSize: 0 };
    }
  }
}

// A type representing a valid OpenAPI 3.x schema object
export type OpenAPISchema = {
  openapi: string;
  info: Record<string, any>;
  paths: Record<string, any>;
  components?: Record<string, any>;
  [key: string]: any;
};
