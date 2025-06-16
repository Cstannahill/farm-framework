// AI-powered code explanation engine
import * as fs from "fs/promises";
import * as path from "path";
import type {
  CodeEntity,
  ExplanationResponse,
  EntityType,
} from "../types/index";

export interface AIProvider {
  generateExplanation(prompt: string, context: string): Promise<string>;
}

export interface CodeParser {
  parseFile(filePath: string, content: string): Promise<CodeEntity[]>;
}

export class CodeExplanationEngine {
  private aiProvider: AIProvider;
  private codeParser: CodeParser;
  private projectRoot: string;

  constructor(
    aiProvider: AIProvider,
    codeParser: CodeParser,
    projectRoot: string
  ) {
    this.aiProvider = aiProvider;
    this.codeParser = codeParser;
    this.projectRoot = projectRoot;
  }

  /**
   * Explain a specific code entity by name
   */
  async explainEntity(
    entityName: string,
    options: {
      includeExamples?: boolean;
      includeTests?: boolean;
      includeContext?: boolean;
    } = {}
  ): Promise<ExplanationResponse> {
    console.log(`🔍 Searching for entity: ${entityName}`);

    // Find the entity in the codebase
    const entity = await this.findEntity(entityName);
    if (!entity) {
      throw new Error(`Entity '${entityName}' not found in codebase`);
    }

    console.log(
      `✅ Found ${entity.entityType}: ${entity.name} in ${entity.filePath}`
    );

    // Generate AI explanation
    const explanation = await this.generateExplanation(entity, options);

    // Find examples if requested
    let examples: any[] = [];
    if (options.includeExamples) {
      examples = await this.findUsageExamples(entity);
    }

    return {
      entity,
      explanation,
      examples,
      metadata: {
        language: entity.metadata.language || "typescript",
        complexity: this.calculateComplexity(entity),
        lastUpdated: new Date(),
      },
    };
  }

  /**
   * Find a code entity by name in the project
   */
  private async findEntity(entityName: string): Promise<CodeEntity | null> {
    const searchPatterns = ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx"];

    for (const pattern of searchPatterns) {
      const files = await this.globFiles(pattern);

      for (const filePath of files) {
        try {
          const content = await fs.readFile(filePath, "utf-8");
          const entities = await this.codeParser.parseFile(filePath, content);

          // Look for exact name match or similar
          const found = entities.find(
            (e) =>
              e.name === entityName ||
              e.name.toLowerCase() === entityName.toLowerCase() ||
              e.name.includes(entityName)
          );

          if (found) {
            return found;
          }
        } catch (error) {
          // Skip files that can't be parsed
          continue;
        }
      }
    }

    return null;
  }

  /**
   * Generate AI explanation for a code entity
   */
  private async generateExplanation(
    entity: CodeEntity,
    options: any
  ): Promise<string> {
    const prompt = this.buildExplanationPrompt(entity, options);

    console.log(`🤖 Generating AI explanation for ${entity.name}...`);

    const explanation = await this.aiProvider.generateExplanation(
      prompt,
      entity.content
    );

    return explanation;
  }

  /**
   * Build a comprehensive prompt for AI explanation
   */
  private buildExplanationPrompt(entity: CodeEntity, options: any): string {
    const contextInfo = [
      `Entity Type: ${entity.entityType}`,
      `Name: ${entity.name}`,
      `File: ${entity.filePath}`,
      `Language: ${entity.metadata.language || "typescript"}`,
    ].join("\n");

    return `Please provide a clear, comprehensive explanation of this ${entity.entityType}:

Context:
${contextInfo}

Code:
\`\`\`${entity.metadata.language || "typescript"}
${entity.content}
\`\`\`

Please explain:
1. **Purpose**: What this code does and why it exists
2. **Functionality**: How it works step by step
3. **Parameters**: Input parameters and their purposes${entity.entityType === "function" ? "" : " (if applicable)"}
4. **Return Value**: What it returns${entity.entityType === "function" ? "" : " (if applicable)"}
5. **Dependencies**: Key dependencies and relationships
6. **Usage Pattern**: How this should typically be used
7. **Important Notes**: Any important considerations, side effects, or gotchas

Make the explanation accessible to developers who may not be familiar with this specific code.`;
  }

  /**
   * Find usage examples of the entity in the codebase
   */
  private async findUsageExamples(entity: CodeEntity): Promise<any[]> {
    console.log(`🔍 Finding usage examples for ${entity.name}...`);

    const examples: any[] = [];
    const searchPatterns = ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx"];

    for (const pattern of searchPatterns) {
      const files = await this.globFiles(pattern);

      for (const filePath of files.slice(0, 10)) {
        // Limit to first 10 files for performance
        try {
          const content = await fs.readFile(filePath, "utf-8");

          // Simple text search for entity name usage
          if (content.includes(entity.name) && filePath !== entity.filePath) {
            const lines = content.split("\n");
            const usageLines = lines
              .map((line, index) => ({ line: line.trim(), number: index + 1 }))
              .filter(
                ({ line }) =>
                  line.includes(entity.name) && !line.startsWith("//")
              );

            if (usageLines.length > 0) {
              examples.push({
                file: path.relative(this.projectRoot, filePath),
                line: usageLines[0].number,
                code: this.extractUsageContext(lines, usageLines[0].number - 1),
                description: `Usage in ${path.basename(filePath)}`,
              });
            }
          }
        } catch (error) {
          continue;
        }
      }

      if (examples.length >= 3) break; // Limit to 3 examples
    }

    return examples;
  }

  /**
   * Extract context around a usage line
   */
  private extractUsageContext(lines: string[], lineIndex: number): string {
    const start = Math.max(0, lineIndex - 2);
    const end = Math.min(lines.length, lineIndex + 3);

    return lines
      .slice(start, end)
      .map((line, i) => `${start + i + 1}: ${line}`)
      .join("\n");
  }

  /**
   * Calculate rough complexity score
   */
  private calculateComplexity(entity: CodeEntity): "low" | "medium" | "high" {
    const content = entity.content;
    const lines = content.split("\n").length;
    const complexity = (content.match(/if|for|while|switch|catch/g) || [])
      .length;

    if (lines > 50 || complexity > 10) return "high";
    if (lines > 20 || complexity > 5) return "medium";
    return "low";
  }

  /**
   * Simple glob file matching (simplified implementation)
   */
  private async globFiles(pattern: string): Promise<string[]> {
    const files: string[] = [];

    async function walkDir(dir: string): Promise<void> {
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);

          if (entry.isDirectory()) {
            // Skip common directories to ignore
            if (
              !["node_modules", ".git", "dist", ".next", ".nuxt"].includes(
                entry.name
              )
            ) {
              await walkDir(fullPath);
            }
          } else if (entry.isFile()) {
            // Simple pattern matching for TypeScript/JavaScript files
            if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) {
              files.push(fullPath);
            }
          }
        }
      } catch (error) {
        // Skip directories we can't read
      }
    }

    await walkDir(this.projectRoot);
    return files;
  }
}
