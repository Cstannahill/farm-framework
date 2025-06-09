// tools/codegen/openapi-extractor.ts
import { spawn } from "child_process";
import { readFile, writeFile, ensureDir } from "fs-extra";
import { join } from "path";

// Stub getErrorMessage import for build to pass
// import { getErrorMessage } from "./src/utils/error-utils";
const getErrorMessage = (e: any) => String(e);

export interface OpenAPIExtractionOptions {
  include?: string[];
  exclude?: string[];
  host?: string;
  port?: number;
  timeout?: number;
}

export class OpenAPIExtractor {
  private options: OpenAPIExtractionOptions;

  constructor(options: OpenAPIExtractionOptions = {}) {
    this.options = {
      host: "localhost",
      port: 8000,
      timeout: 30000,
      ...options,
    };
  }

  /**
   * Extract OpenAPI schema from a running FastAPI application
   */
  async extractFromFastAPI(
    apiPath: string,
    outputPath: string,
    options: OpenAPIExtractionOptions = {}
  ): Promise<void> {
    const mergedOptions = { ...this.options, ...options };

    try {
      // Ensure output directory exists
      await ensureDir(join(outputPath, ".."));

      // First, try to get schema from running server
      const schema = await this.fetchSchemaFromServer(mergedOptions);

      if (schema) {
        await writeFile(outputPath, JSON.stringify(schema, null, 2));
        return;
      }

      // Fallback: Generate schema by temporarily starting the server
      await this.generateSchemaWithTempServer(
        apiPath,
        outputPath,
        mergedOptions
      );
    } catch (error) {
      throw new Error(
        `Failed to extract OpenAPI schema: ${getErrorMessage(error)}`
      );
    }
  }

  /**
   * Try to fetch schema from already running server
   */
  private async fetchSchemaFromServer(
    options: OpenAPIExtractionOptions
  ): Promise<any | null> {
    try {
      const url = `http://${options.host}:${options.port}/openapi.json`;
      const response = await fetch(url);

      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      // Server not running, will fallback to temp server
    }

    return null;
  }

  /**
   * Generate schema by temporarily starting the FastAPI server
   */
  private async generateSchemaWithTempServer(
    apiPath: string,
    outputPath: string,
    options: OpenAPIExtractionOptions
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      // Start FastAPI server temporarily
      const serverProcess = spawn(
        "python",
        [
          "-m",
          "uvicorn",
          "src.main:app",
          "--host",
          options.host!,
          "--port",
          String(options.port!),
        ],
        {
          cwd: apiPath,
          stdio: "pipe",
        }
      );

      let serverReady = false;
      const timeout = setTimeout(() => {
        if (!serverReady) {
          serverProcess.kill();
          reject(new Error("Server startup timeout"));
        }
      }, options.timeout!);

      // Monitor server output for readiness
      serverProcess.stdout.on("data", async (data) => {
        const output = data.toString();

        if (output.includes("Uvicorn running on") && !serverReady) {
          serverReady = true;
          clearTimeout(timeout);

          try {
            // Give server a moment to fully initialize
            await new Promise((resolve) => setTimeout(resolve, 2000));

            // Fetch the schema
            const schema = await this.fetchSchemaFromServer(options);

            if (schema) {
              await writeFile(outputPath, JSON.stringify(schema, null, 2));
              serverProcess.kill();
              resolve();
            } else {
              serverProcess.kill();
              reject(new Error("Failed to fetch schema from temporary server"));
            }
          } catch (error) {
            serverProcess.kill();
            reject(error);
          }
        }
      });

      serverProcess.stderr.on("data", (data) => {
        const error = data.toString();
        if (error.includes("Error") || error.includes("Failed")) {
          serverProcess.kill();
          reject(new Error(`Server error: ${error}`));
        }
      });

      serverProcess.on("error", (error) => {
        clearTimeout(timeout);
        reject(new Error(`Failed to start server: ${getErrorMessage(error)}`));
      });

      serverProcess.on("exit", (code) => {
        clearTimeout(timeout);
        if (!serverReady && code !== 0) {
          reject(new Error(`Server exited with code ${code}`));
        }
      });
    });
  }

  /**
   * Extract schema from a static OpenAPI JSON/YAML file
   */

      let schema: any;
      if (filePath.endsWith(".json")) {
        schema = JSON.parse(content);
      } else if (filePath.endsWith(".yaml") || filePath.endsWith(".yml")) {
        // For YAML support, you'd need to add a YAML parser like js-yaml
        throw new Error(
          "YAML support not implemented yet. Please use JSON format."
        );
      } else {
        throw new Error("Unsupported file format. Use .json or .yaml files.");
      }

      await ensureDir(join(outputPath, ".."));
      await writeFile(outputPath, JSON.stringify(schema, null, 2));
    } catch (error) {
      throw new Error(
        `Failed to extract schema from file: ${getErrorMessage(error)}`
      );
    }
  }

  /**
   * Validate OpenAPI schema structure
   */
  validateSchema(schema: any): boolean {
    return !!(
      schema &&
      schema.openapi &&
      schema.info &&
      schema.info.title &&
      schema.paths
    );
  }
}
