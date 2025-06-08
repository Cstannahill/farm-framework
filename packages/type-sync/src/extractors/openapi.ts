import { spawn } from "child_process";
import fsExtra from "fs-extra";
import { join } from "path";

const { readFile, writeFile, ensureDir } = fsExtra;

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

  async extractFromFastAPI(
    apiPath: string,
    outputPath: string,
    options: OpenAPIExtractionOptions = {}
  ): Promise<void> {
    const mergedOptions = { ...this.options, ...options };
    try {
      await ensureDir(join(outputPath, ".."));
      const schema = await this.fetchSchemaFromServer(mergedOptions);
      if (schema) {
        await writeFile(outputPath, JSON.stringify(schema, null, 2));
        return;
      }
      await this.generateSchemaWithTempServer(
        apiPath,
        outputPath,
        mergedOptions
      );
    } catch (error) {
      throw new Error(`Failed to extract OpenAPI schema: ${error}`);
    }
  }

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

  private async generateSchemaWithTempServer(
    apiPath: string,
    outputPath: string,
    options: OpenAPIExtractionOptions
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const serverProcess = spawn(
        "python",
        [
          "-m",
          "uvicorn",
          "src.main:app",
          "--host",
          options.host || "localhost",
          "--port",
          String(options.port || 8000),
        ],
        { cwd: apiPath, stdio: "ignore" }
      );
      setTimeout(async () => {
        try {
          const schema = await this.fetchSchemaFromServer(options);
          if (schema) {
            await writeFile(outputPath, JSON.stringify(schema, null, 2));
            serverProcess.kill();
            resolve();
            return;
          }
          serverProcess.kill();
          reject(new Error("Failed to fetch schema from temp server"));
        } catch (err) {
          serverProcess.kill();
          reject(err);
        }
      }, 4000);
    });
  }
}
