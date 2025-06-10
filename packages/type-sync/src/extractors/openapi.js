import { spawn } from "child_process";
import fsExtra from "fs-extra";
import { join } from "path";
const { readFile, writeFile, ensureDir } = fsExtra;
export class OpenAPIExtractor {
    options;
    constructor(options = {}) {
        this.options = {
            host: "localhost",
            port: 8000,
            timeout: 30000,
            ...options,
        };
    }
    async extractFromFastAPI(apiPath, outputPath, options = {}) {
        const mergedOptions = { ...this.options, ...options };
        try {
            await ensureDir(join(outputPath, ".."));
            const schema = await this.fetchSchemaFromServer(mergedOptions);
            if (schema) {
                await writeFile(outputPath, JSON.stringify(schema, null, 2));
                return;
            }
            await this.generateSchemaWithTempServer(apiPath, outputPath, mergedOptions);
        }
        catch (error) {
            throw new Error(`Failed to extract OpenAPI schema: ${error}`);
        }
    }
    async fetchSchemaFromServer(options) {
        try {
            const url = `http://${options.host}:${options.port}/openapi.json`;
            const response = await fetch(url);
            if (response.ok) {
                return await response.json();
            }
        }
        catch (error) {
            // Server not running, will fallback to temp server
        }
        return null;
    }
    async generateSchemaWithTempServer(apiPath, outputPath, options) {
        return new Promise((resolve, reject) => {
            const serverProcess = spawn("python", [
                "-m",
                "uvicorn",
                "src.main:app",
                "--host",
                options.host || "localhost",
                "--port",
                String(options.port || 8000),
            ], { cwd: apiPath, stdio: "ignore" });
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
                }
                catch (err) {
                    serverProcess.kill();
                    reject(err);
                }
            }, 4000);
        });
    }
}
//# sourceMappingURL=openapi.js.map