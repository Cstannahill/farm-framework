import { CodeIntelligenceAPIClient } from "../client/api-client";

export interface CLIConfig {
  baseUrl?: string;
  apiKey?: string;
  timeout?: number;
  verbose?: boolean;
}

export class IntelligenceCLI {
  private client: CodeIntelligenceAPIClient;
  private config: CLIConfig;

  constructor(config: CLIConfig = {}) {
    this.config = {
      baseUrl: "http://localhost:8000",
      timeout: 30000,
      verbose: false,
      ...config
    };

    this.client = new CodeIntelligenceAPIClient({
      baseUrl: this.config.baseUrl,
      apiKey: this.config.apiKey,
      timeout: this.config.timeout
    });
  }

  /**
   * Register CLI commands with any commander-compatible interface
   */
  registerCommands(program: any): void {
    // Query command
    program
      .command("query <query>")
      .description("Search the codebase using natural language")
      .option("-l, --limit <number>", "Maximum number of results", "10")
      .option("-c, --context", "Include context in results")
      .option("-f, --format <format>", "Output format (json, table, detailed)", "table")
      .action(async (query: string, options: any) => {
        try {
          await this.handleQuery(query, options);
        } catch (error) {
          console.error("Query failed:", error);
          process.exit(1);
        }
      });

    // Explain command
    program
      .command("explain <entity>")
      .description("Get detailed explanation of a code entity")
      .option("-e, --examples", "Include usage examples")
      .option("-t, --tests", "Include test cases")
      .option("-c, --context", "Include related context")
      .option("-f, --format <format>", "Output format (json, markdown)", "markdown")
      .action(async (entity: string, options: any) => {
        try {
          await this.handleExplain(entity, options);
        } catch (error) {
          console.error("Explain failed:", error);
          process.exit(1);
        }
      });

    // Status command
    program
      .command("status")
      .description("Check the status of the code intelligence server")
      .action(async () => {
        try {
          await this.handleStatus();
        } catch (error) {
          console.error("Status check failed:", error);
          process.exit(1);
        }
      });

    // Index command
    program
      .command("index <pattern>")
      .description("Index files matching the given pattern")
      .option("-r, --recursive", "Search recursively")
      .option("-e, --exclude <patterns>", "Exclude patterns (comma-separated)")
      .action(async (pattern: string, options: any) => {
        try {
          await this.handleIndex(pattern, options);
        } catch (error) {
          console.error("Indexing failed:", error);
          process.exit(1);
        }
      });

    // Reset command
    program
      .command("reset")
      .description("Reset the code intelligence index")
      .option("--confirm", "Skip confirmation prompt")
      .action(async (options: any) => {
        try {
          await this.handleReset(options);
        } catch (error) {
          console.error("Reset failed:", error);
          process.exit(1);
        }
      });
  }

  private async handleQuery(query: string, options: any): Promise<void> {
    if (this.config.verbose) {
      console.log(`🔍 Searching for: ${query}`);
    }

    const response = await this.client.query({
      query,
      maxResults: parseInt(options.limit),
      includeContext: options.context,
    });

    if (response.error) {
      throw new Error(response.error);
    }

    this.formatQueryResults(response, options.format);
  }

  private async handleExplain(entity: string, options: any): Promise<void> {
    if (this.config.verbose) {
      console.log(`📖 Explaining: ${entity}`);
    }

    const response = await this.client.explain({
      entityName: entity,
      includeExamples: options.examples,
      includeTests: options.tests,
      includeContext: options.context,
    });

    this.formatExplanation(response, options.format);
  }

  private async handleStatus(): Promise<void> {
    const status = await this.client.getStatus();
    
    console.log("📊 Code Intelligence Status");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`Health: ${status.indexHealth}`);
    console.log(`Indexed Files: ${status.indexedFiles.toLocaleString()}`);
    console.log(`Total Entities: ${status.totalEntities.toLocaleString()}`);
    console.log(`Vector Count: ${status.vectorCount.toLocaleString()}`);
    console.log(`Processing Queue: ${status.processingQueue}`);
    console.log(`Last Updated: ${status.lastUpdated.toLocaleString()}`);

    if (status.errors.length > 0) {
      console.log("\n⚠️  Recent Errors:");
      status.errors.slice(0, 5).forEach(error => {
        console.log(`  ${error.severity.toUpperCase()}: ${error.file} - ${error.error}`);
      });
    }
  }

  private async handleIndex(pattern: string, options: any): Promise<void> {
    console.log(`📚 Indexing files matching: ${pattern}`);
    
    // This would need to be implemented to actually find and index files
    // For now, we'll show a placeholder
    console.log("⚠️  File indexing from CLI not yet implemented");
    console.log("💡 Use the server API or web interface to index files");
  }

  private async handleReset(options: any): Promise<void> {
    if (!options.confirm) {
      console.log("⚠️  This will reset the entire code intelligence index.");
      console.log("💡 Use --confirm to skip this prompt");
      return;
    }

    console.log("🔄 Resetting code intelligence index...");
    await this.client.reset();
    console.log("✅ Index reset successfully");
  }

  private formatQueryResults(response: any, format: string): void {
    if (format === "json") {
      console.log(JSON.stringify(response, null, 2));
      return;
    }

    if (!response.results || response.results.length === 0) {
      console.log("🤷 No results found");
      return;
    }

    console.log(`🔍 Found ${response.results.length} results`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    response.results.forEach((result: any, index: number) => {
      const score = (result.score * 100).toFixed(1);
      console.log(`\n${index + 1}. ${result.entity.name} (${score}% match)`);
      console.log(`   📄 ${result.entity.filePath}:${result.entity.position.line}`);
      console.log(`   🏷️  ${result.entity.entityType}`);
      
      if (result.explanation) {
        console.log(`   💡 ${result.explanation}`);
      }

      if (format === "detailed" && result.entity.content) {
        console.log(`   📝 Preview:`);
        const preview = result.entity.content.split('\n').slice(0, 3).join('\n');
        console.log(`      ${preview.replace(/\n/g, '\n      ')}`);
      }
    });

    if (response.metrics) {
      console.log(`\n⏱️  Search completed in ${response.metrics.searchTime}ms`);
    }
  }

  private formatExplanation(response: any, format: string): void {
    if (format === "json") {
      console.log(JSON.stringify(response, null, 2));
      return;
    }

    if (!response.entity) {
      console.log("❌ Entity not found");
      return;
    }

    const entity = response.entity;
    
    console.log(`📖 ${entity.name}`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`📄 File: ${entity.filePath}:${entity.position.line}`);
    console.log(`🏷️  Type: ${entity.entityType}`);
    
    if (entity.signature) {
      console.log(`✏️  Signature: ${entity.signature}`);
    }

    console.log("\n📝 Explanation:");
    console.log(response.explanation);

    if (response.examples && response.examples.length > 0) {
      console.log("\n💡 Examples:");
      response.examples.forEach((example: any, index: number) => {
        console.log(`\n${index + 1}. ${example.description}`);
        console.log(`   📄 ${example.file}:${example.line}`);
        console.log(`   \`\`\`\n   ${example.code.replace(/\n/g, '\n   ')}\n   \`\`\``);
      });
    }
  }
}

export function createIntelligenceCLI(config: CLIConfig = {}): IntelligenceCLI {
  return new IntelligenceCLI(config);
}