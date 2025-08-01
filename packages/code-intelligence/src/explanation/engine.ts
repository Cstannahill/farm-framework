// AI-powered code explanation engine
import * as fs from "fs/promises";
import * as path from "path";
import type { CodeEntity, ExplanationResponse, CodeExample } from "../types/index";

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

  constructor(aiProvider: AIProvider, codeParser: CodeParser, projectRoot: string) {
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

    console.log(`✅ Found ${entity.entityType}: ${entity.name} in ${entity.filePath}`);

    // Generate AI explanation
    const explanation = await this.generateExplanation(entity, options);

    // Find examples if requested
    let examples: CodeExample[] = [];
    if (options.includeExamples) {
      examples = await this.findUsageExamples(entity);
    }

    return {
      entity,
      explanation,
      examples,
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
          const found = entities.find((e) =>
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
    options: {
      includeExamples?: boolean;
      includeTests?: boolean;
      includeContext?: boolean;
    }
  ): Promise<string> {
    const prompt = this.buildExplanationPrompt(entity, options);

    console.log(`🤖 Generating AI explanation for ${entity.name}...`);

    const explanation = await this.aiProvider.generateExplanation(prompt, entity.content);
    return explanation;
  }

  /**
   * Build a comprehensive prompt for AI explanation
   */
  private buildExplanationPrompt(
    entity: CodeEntity,
    options: {
      includeExamples?: boolean;
      includeTests?: boolean;
      includeContext?: boolean;
    }
  ): string {
    const parts = [
      `Please explain this ${entity.entityType} called "${entity.name}":`,
      "",
      "Code:",
      "```" + (entity.metadata.language || "typescript"),
      entity.content,
      "```",
      "",
    ];

    if (entity.docstring) {
      parts.push("Documentation:", entity.docstring, "");
    }

    if (entity.signature) {
      parts.push("Signature:", entity.signature, "");
    }

    parts.push(
      "Please provide:",
      "1. A clear explanation of what this code does",
      "2. Key parameters and return values (if applicable)",
      "3. Any important patterns or techniques used",
      "4. Potential use cases or examples"
    );

    if (options.includeContext) {
      parts.push("5. How this fits into the larger codebase");
    }

    return parts.join("\n");
  }

  /**
   * Find usage examples of the entity in the codebase
   */
  private async findUsageExamples(entity: CodeEntity): Promise<CodeExample[]> {
    const examples: CodeExample[] = [];
    const searchPatterns = ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx"];

    for (const pattern of searchPatterns) {
      const files = await this.globFiles(pattern);

      for (const filePath of files) {
        // Skip the file where the entity is defined
        if (filePath === entity.filePath) continue;

        try {
          const content = await fs.readFile(filePath, "utf-8");
          const lines = content.split("\n");

          lines.forEach((line, index) => {
            // Simple search for entity name usage
            if (line.includes(entity.name) && examples.length < 5) {
              const context = this.extractUsageContext(lines, index);
              examples.push({
                description: `Usage in ${path.basename(filePath)}`,
                code: context,
                file: filePath,
                line: index + 1,
              });
            }
          });
        } catch (error) {
          // Skip files that can't be read
          continue;
        }
      }
    }

    return examples;
  }

  /**
   * Extract context around a usage line
   */
  private extractUsageContext(lines: string[], targetLine: number): string {
    const start = Math.max(0, targetLine - 2);
    const end = Math.min(lines.length, targetLine + 3);
    return lines.slice(start, end).join("\n");
  }

  /**
   * Calculate rough complexity score
   */
  private calculateComplexity(entity: CodeEntity): number {
    let complexity = 1;

    // Simple complexity calculation based on content
    const content = entity.content.toLowerCase();

    // Control flow statements
    complexity += (content.match(/\b(if|else|for|while|switch|case)\b/g) || []).length;

    // Function calls
    complexity += (content.match(/\w+\(/g) || []).length * 0.5;

    // Nested structures
    complexity += (content.match(/\{/g) || []).length * 0.3;

    return Math.round(complexity);
  }

  /**
   * Simple glob file matching (simplified implementation)
   */
  private async globFiles(pattern: string): Promise<string[]> {
    // Mock implementation - would use actual glob library in production
    const files: string[] = [];

    async function walkDir(dir: string): Promise<void> {
      try {
        const items = await fs.readdir(dir, { withFileTypes: true });

        for (const item of items) {
          const fullPath = path.join(dir, item.name);

          if (item.isDirectory() && !item.name.startsWith(".") && item.name !== "node_modules") {
            await walkDir(fullPath);
          } else if (item.isFile()) {
            // Simple pattern matching
            if (pattern.includes("*.ts") && fullPath.endsWith(".ts")) {
              files.push(fullPath);
            } else if (pattern.includes("*.tsx") && fullPath.endsWith(".tsx")) {
              files.push(fullPath);
            } else if (pattern.includes("*.js") && fullPath.endsWith(".js")) {
              files.push(fullPath);
            } else if (pattern.includes("*.jsx") && fullPath.endsWith(".jsx")) {
              files.push(fullPath);
            }
          }
        }
      } catch (error) {
        // Skip directories that can't be read
      }
    }

    await walkDir(this.projectRoot);
    return files;
  }
}