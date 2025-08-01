// Ollama AI provider for code intelligence
import type { AIProvider } from "../explanation/engine";

export interface OllamaConfig {
  baseUrl?: string;
  model?: string;
  timeout?: number;
}

export class OllamaProvider implements AIProvider {
  private baseUrl: string;
  private model: string;
  private timeout: number;

  constructor(config: OllamaConfig = {}) {
    this.baseUrl =
      config.baseUrl || process.env.OLLAMA_URL || "http://localhost:11434";
    this.model = config.model || process.env.OLLAMA_MODEL || "codellama:7b";
    this.timeout = config.timeout || 30000; // 30 seconds
  }

  async generateExplanation(prompt: string, context: string): Promise<string> {
    try {
      const response = await this.callOllama(prompt, context);
      return response;
    } catch (error) {
      console.error("Ollama API error:", error);
      throw new Error(
        `Failed to generate explanation: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  private async callOllama(prompt: string, context: string): Promise<string> {
    const fullPrompt = this.buildCodeExplanationPrompt(prompt, context);

    const requestBody = {
      model: this.model,
      prompt: fullPrompt,
      stream: false,
      options: {
        temperature: 0.3, // Lower temperature for more focused, technical explanations
        top_p: 0.9,
        num_ctx: 4096, // Context window for code analysis
      },
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(
          `Ollama API returned ${response.status}: ${response.statusText}`
        );
      }

      const data = await response.json();
      return data.response || "No explanation generated";
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  private buildCodeExplanationPrompt(prompt: string, context: string): string {
    return `You are an expert code analyst. Analyze the following code and provide a comprehensive explanation.

TASK: ${prompt}

CODE TO ANALYZE:
\`\`\`
${context}
\`\`\`

Please provide a detailed explanation that includes:

1. **Purpose**: What this code does and why it exists
2. **Functionality**: How it works and key implementation details  
3. **Parameters/Inputs**: What inputs it accepts (if any)
4. **Return Value/Output**: What it returns or produces
5. **Dependencies**: What it relies on or imports
6. **Usage Context**: When and how this would typically be used
7. **Best Practices**: Any notable patterns or practices demonstrated
8. **Potential Issues**: Any concerns, improvements, or edge cases to consider

Format your response in clear, readable Markdown with appropriate headers and bullet points. Be thorough but concise, focusing on practical insights that would help a developer understand and work with this code.`;
  }

  /**
   * Check if Ollama is available and the specified model is downloaded
   */
  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      const models = data.models || [];

      // Check if our model is available
      return models.some((model: any) => model.name === this.model);
    } catch {
      return false;
    }
  }

  /**
   * Get list of available models
   */
  async getAvailableModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      const models = data.models || [];

      return models.map((model: any) => model.name);
    } catch {
      return [];
    }
  }

  /**
   * Download a model if it's not available
   */
  async pullModel(modelName?: string): Promise<boolean> {
    const targetModel = modelName || this.model;

    try {
      const response = await fetch(`${this.baseUrl}/api/pull`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: targetModel }),
      });

      return response.ok;
    } catch {
      return false;
    }
  }
}
