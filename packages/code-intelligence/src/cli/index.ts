// CLI integration for code intelligence
import type {
  QueryRequest,
  QueryResponse,
  ExplanationResponse,
  IndexStatus,
} from "../types/index";
import { CodeIntelligenceClient } from "../client/api-client";

export interface CLIConfig {
  baseUrl?: string;
  apiKey?: string;
  timeout?: number;
  verbose?: boolean;
}

export class IntelligenceCLI {
  private client: CodeIntelligenceClient;
  private config: CLIConfig;

  constructor(config: CLIConfig = {}) {
    this.config = config;
    this.client = new CodeIntelligenceClient({
      baseUrl: config.baseUrl || "http://localhost:8001/api/code-intelligence",
      apiKey: config.apiKey,
      timeout: config.timeout || 30000,
    });
  }

  /**
   * Register CLI commands with any commander-compatible interface
   */
  registerCommands(program: any): void {
    const intel = program
      .command("intel")
      .alias("ai")
      .description("🧠 AI-powered code intelligence");

    // Search command
    intel
      .command("search <query>")
      .description("Search codebase using natural language")
      .action(async (query: string) => {
        try {
          const request: QueryRequest = {
            query,
            maxResults: 5,
            includeContext: false,
          };

          const response = await this.client.query(request);
          console.log(JSON.stringify(response, null, 2));
        } catch (error) {
          console.error(`Search failed: ${error}`);
          process.exit(1);
        }
      });

    console.log("✅ Intelligence CLI commands registered");
  }
}

// Factory function for CLI integration
export function createIntelligenceCLI(config?: CLIConfig): IntelligenceCLI {
  return new IntelligenceCLI(config);
}
