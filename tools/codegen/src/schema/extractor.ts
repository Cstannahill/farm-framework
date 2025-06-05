// tools/codegen/src/schema/extractor.ts
import { spawn, ChildProcess } from "child_process";
import { readFile, writeFile, mkdir, access } from "fs/promises";
import { join, dirname } from "path";
import { createHash } from "crypto";
import fetch from "node-fetch";
import { getErrorMessage } from "@farm/cli";

export interface OpenAPISchema {
  openapi: string;
  info: {
    title: string;
    version: string;
    description?: string;
  };
  paths: Record<string, any>;
  components?: {
    schemas?: Record<string, any>;
    responses?: Record<string, any>;
    parameters?: Record<string, any>;
  };
  servers?: Array<{
    url: string;
    description?: string;
  }>;
}

export interface SchemaExtractionOptions {
  apiPath?: string;
  port?: number;
  timeout?: number;
  cacheDir?: string;
  forceRefresh?: boolean;
}

export interface SchemaMetadata {
  checksum: string;
  timestamp: number;
  source: string;
  version: string;
}

export class OpenAPISchemaExtractor {
  private readonly defaultOptions: Required<SchemaExtractionOptions> = {
    apiPath: "apps/api/src/main.py",
    port: 8001, // Use different port for extraction
    timeout: 30000,
    cacheDir: ".farm/cache/schemas",
    forceRefresh: false,
  };

  private options: Required<SchemaExtractionOptions>;
  private fastApiProcess?: ChildProcess;

  constructor(options: SchemaExtractionOptions = {}) {
    this.options = { ...this.defaultOptions, ...options };
  }

  /**
   * Extract OpenAPI schema from FastAPI application
   */
  async extractSchema(): Promise<OpenAPISchema> {
    const cacheKey = await this.generateCacheKey();

    // Check cache first unless force refresh
    if (!this.options.forceRefresh) {
      const cachedSchema = await this.getCachedSchema(cacheKey);
      if (cachedSchema) {
        console.log("📋 Using cached OpenAPI schema");
        return cachedSchema;
      }
    }

    console.log("🔍 Extracting OpenAPI schema from FastAPI app...");

    try {
      // Start temporary FastAPI server for schema extraction
      await this.startTemporaryServer();

      // Extract schema from running server
      const schema = await this.fetchSchemaFromServer();

      // Validate extracted schema
      this.validateSchema(schema);

      // Cache the schema
      await this.cacheSchema(cacheKey, schema);

      console.log("✅ OpenAPI schema extracted successfully");
      return schema;
    } finally {
      // Always cleanup the temporary server
      await this.stopTemporaryServer();
    }
  }

  /**
   * Start temporary FastAPI server for schema extraction
   */
  private async startTemporaryServer(): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(
          new Error(
            `FastAPI server failed to start within ${this.options.timeout}ms`
          )
        );
      }, this.options.timeout);

      // Start FastAPI server with uvicorn
      this.fastApiProcess = spawn(
        "uvicorn",
        [
          "src.main:app",
          "--host",
          "0.0.0.0",
          "--port",
          this.options.port.toString(),
          "--log-level",
          "warning", // Reduce noise
        ],
        {
          cwd: dirname(this.options.apiPath),
          stdio: ["pipe", "pipe", "pipe"],
          env: {
            ...process.env,
            FARM_SCHEMA_EXTRACTION: "true", // Signal to app it's for schema extraction
          },
        }
      );

      let serverReady = false;

      // Monitor stdout for server ready signal
      this.fastApiProcess.stdout?.on("data", (data) => {
        const output = data.toString();
        if (
          output.includes("Uvicorn running on") ||
          output.includes("Application startup complete")
        ) {
          if (!serverReady) {
            serverReady = true;
            clearTimeout(timeout);
            // Give server a moment to fully initialize
            setTimeout(resolve, 1000);
          }
        }
      });

      // Handle errors
      this.fastApiProcess.stderr?.on("data", (data) => {
        const error = data.toString();
        if (error.includes("Error") || error.includes("Exception")) {
          clearTimeout(timeout);
          reject(new Error(`FastAPI server error: ${error}`));
        }
      });

      this.fastApiProcess.on("error", (error) => {
        clearTimeout(timeout);
        reject(new Error(`Failed to start FastAPI server: ${error.message}`));
      });

      this.fastApiProcess.on("exit", (code) => {
        if (code !== 0 && !serverReady) {
          clearTimeout(timeout);
          reject(new Error(`FastAPI server exited with code ${code}`));
        }
      });
    });
  }

  /**
   * Fetch OpenAPI schema from running server
   */
  private async fetchSchemaFromServer(): Promise<OpenAPISchema> {
    const schemaUrl = `http://localhost:${this.options.port}/openapi.json`;

    try {
      const response = await fetch(schemaUrl);

      if (!response.ok) {
        throw new Error(
          `Failed to fetch schema: ${response.status} ${response.statusText}`
        );
      }

      const schema = (await response.json()) as OpenAPISchema;
      return schema;
    } catch (error) {
      throw new Error(
        `Failed to fetch OpenAPI schema from ${schemaUrl}: ${getErrorMessage(
          error
        )}`
      );
    }
  }

  /**
   * Stop temporary FastAPI server
   */
  private async stopTemporaryServer(): Promise<void> {
    if (this.fastApiProcess) {
      this.fastApiProcess.kill("SIGTERM");

      // Wait for graceful shutdown
      await new Promise<void>((resolve) => {
        const timeout = setTimeout(() => {
          this.fastApiProcess?.kill("SIGKILL"); // Force kill if needed
          resolve();
        }, 5000);

        this.fastApiProcess?.on("exit", () => {
          clearTimeout(timeout);
          resolve();
        });
      });

      this.fastApiProcess = undefined;
    }
  }

  /**
   * Validate extracted OpenAPI schema
   */
  private validateSchema(schema: any): asserts schema is OpenAPISchema {
    if (!schema || typeof schema !== "object") {
      throw new Error("Invalid schema: not an object");
    }

    if (!schema.openapi) {
      throw new Error("Invalid schema: missing openapi version");
    }

    if (!schema.info || !schema.info.title) {
      throw new Error("Invalid schema: missing info.title");
    }

    if (!schema.paths || typeof schema.paths !== "object") {
      throw new Error("Invalid schema: missing or invalid paths");
    }

    // Validate paths structure
    for (const [path, methods] of Object.entries(schema.paths)) {
      if (!path.startsWith("/")) {
        throw new Error(`Invalid path: ${path} (must start with /)`);
      }

      if (!methods || typeof methods !== "object") {
        throw new Error(`Invalid path methods for ${path}`);
      }
    }

    console.log(
      `📋 Schema validation passed: ${
        Object.keys(schema.paths).length
      } paths found`
    );
  }

  /**
   * Generate cache key based on API file content
   */
  private async generateCacheKey(): Promise<string> {
    try {
      const apiContent = await readFile(this.options.apiPath, "utf-8");
      const hash = createHash("md5").update(apiContent).digest("hex");
      return `schema-${hash}`;
    } catch (error) {
      // If we can't read the API file, use timestamp as cache key
      const timestamp = Math.floor(Date.now() / 1000).toString();
      return `schema-${timestamp}`;
    }
  }

  /**
   * Get cached schema if available and valid
   */
  private async getCachedSchema(
    cacheKey: string
  ): Promise<OpenAPISchema | null> {
    try {
      const cacheFile = join(this.options.cacheDir, `${cacheKey}.json`);
      const metadataFile = join(this.options.cacheDir, `${cacheKey}.meta.json`);

      // Check if cache files exist
      await access(cacheFile);
      await access(metadataFile);

      // Read and validate metadata
      const metadataContent = await readFile(metadataFile, "utf-8");
      const metadata: SchemaMetadata = JSON.parse(metadataContent);

      // Check if cache is still fresh (24 hours)
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours in ms
      if (Date.now() - metadata.timestamp > maxAge) {
        console.log("📋 Cache expired, extracting fresh schema");
        return null;
      }

      // Read and return cached schema
      const schemaContent = await readFile(cacheFile, "utf-8");
      const schema: OpenAPISchema = JSON.parse(schemaContent);

      return schema;
    } catch (error) {
      // Cache miss or error reading cache
      return null;
    }
  }

  /**
   * Cache extracted schema with metadata
   */
  private async cacheSchema(
    cacheKey: string,
    schema: OpenAPISchema
  ): Promise<void> {
    try {
      // Ensure cache directory exists
      await mkdir(this.options.cacheDir, { recursive: true });

      const cacheFile = join(this.options.cacheDir, `${cacheKey}.json`);
      const metadataFile = join(this.options.cacheDir, `${cacheKey}.meta.json`);

      // Create metadata
      const metadata: SchemaMetadata = {
        checksum: createHash("md5")
          .update(JSON.stringify(schema))
          .digest("hex"),
        timestamp: Date.now(),
        source: this.options.apiPath,
        version: schema.info.version,
      };

      // Write schema and metadata to cache
      await writeFile(cacheFile, JSON.stringify(schema, null, 2));
      await writeFile(metadataFile, JSON.stringify(metadata, null, 2));

      console.log(`💾 Schema cached: ${cacheKey}`);
    } catch (error) {
      console.warn(`⚠️ Failed to cache schema: ${getErrorMessage(error)}`);
      // Don't throw - caching is not critical
    }
  }

  /**
   * Clear all cached schemas
   */
  async clearCache(): Promise<void> {
    try {
      const { rmdir } = await import("fs/promises");
      await rmdir(this.options.cacheDir, { recursive: true });
      console.log("🗑️ Schema cache cleared");
    } catch (error) {
      console.warn(`⚠️ Failed to clear cache: ${getErrorMessage(error)}`);
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    files: number;
    totalSize: number;
    lastModified: Date | null;
  }> {
    try {
      const { readdir, stat } = await import("fs/promises");
      const files = await readdir(this.options.cacheDir);

      let totalSize = 0;
      let lastModified: Date | null = null;

      for (const file of files) {
        const filePath = join(this.options.cacheDir, file);
        const stats = await stat(filePath);
        totalSize += stats.size;

        if (!lastModified || stats.mtime > lastModified) {
          lastModified = stats.mtime;
        }
      }

      return {
        files: files.length,
        totalSize,
        lastModified,
      };
    } catch (error) {
      return { files: 0, totalSize: 0, lastModified: null };
    }
  }
}
