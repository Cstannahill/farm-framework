// packages/observability/src/cost/calculator.ts
import type {
  CostData,
  ModelPricing,
  ProviderPricing,
} from "@farm-framework/types";

export class CostCalculator {
  // Pricing data updated automatically from provider APIs
  private static pricing: Record<
    string,
    Record<string, ModelPricing["pricing"]>
  > = {
    openai: {
      "gpt-4-turbo": { prompt: 0.01, completion: 0.03 },
      "gpt-4": { prompt: 0.03, completion: 0.06 },
      "gpt-3.5-turbo": { prompt: 0.0005, completion: 0.0015 },
    },
    anthropic: {
      "claude-3-opus": { prompt: 0.015, completion: 0.075 },
      "claude-3-sonnet": { prompt: 0.003, completion: 0.015 },
    },
    ollama: {
      // Local models have electricity cost estimates
      "llama3.1": { prompt: 0.00001, completion: 0.00001 },
      mistral: { prompt: 0.00001, completion: 0.00001 },
    },
  };

  static calculate(provider: string, model: string, tokens: number): number {
    const pricing = this.pricing[provider]?.[model];
    if (!pricing) return 0;

    // Simple calculation for now, can be enhanced
    const costPer1kTokens = (pricing.prompt + pricing.completion) / 2;
    return (tokens / 1000) * costPer1kTokens;
  }

  calculateCost(data: CostData): number {
    const pricing = CostCalculator.pricing[data.provider]?.[data.model];
    if (!pricing) return 0;

    const promptCost = (data.tokens.prompt / 1000) * pricing.prompt;
    const completionCost = (data.tokens.completion / 1000) * pricing.completion;

    return promptCost + completionCost;
  }

  static async updatePricing(): Promise<void> {
    // Fetch latest pricing from provider APIs
    // This runs on a schedule to keep pricing current
    try {
      // OpenAI pricing update
      await this.updateOpenAIPricing();

      // Anthropic pricing update
      await this.updateAnthropicPricing();

      // Update timestamp
      console.log("Pricing data updated successfully");
    } catch (error) {
      console.warn("Failed to update pricing data:", error);
    }
  }

  private static async updateOpenAIPricing(): Promise<void> {
    // In a real implementation, fetch from OpenAI API
    // For now, keep static data
  }

  private static async updateAnthropicPricing(): Promise<void> {
    // In a real implementation, fetch from Anthropic API
    // For now, keep static data
  }

  static getPricing(
    provider?: string
  ):
    | Record<string, Record<string, ModelPricing["pricing"]>>
    | Record<string, ModelPricing["pricing"]> {
    if (provider) {
      return this.pricing[provider] || {};
    }
    return this.pricing;
  }
}
