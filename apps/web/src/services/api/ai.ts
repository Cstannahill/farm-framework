// apps/web/src/services/api/ai.ts
// Type-safe AI API client with proper base client import

import { ApiClient } from "./base";
import type * as AI from "../../types/ai";

// Initialize API client
const client = new ApiClient({
  baseURL: process.env.VITE_API_URL || "http://localhost:8000",
  timeout: 60000, // 60 seconds for AI operations
});

// =============================================================================
// Core AI API Client
// =============================================================================

export const aiApi = {
  /**
   * Send a chat completion request
   */
  async chat(request: AI.ChatRequest): Promise<AI.ChatResponse> {
    if (request.stream) {
      throw new Error("Use chatStream() for streaming requests");
    }

    return client.post<AI.ChatResponse>("/api/ai/chat", {
      ...request,
      stream: false,
    });
  },

  /**
   * Send a streaming chat completion request
   */
  chatStream(request: AI.ChatRequest): EventSource {
    return client.streamPost("/api/ai/chat/stream", {
      ...request,
      stream: true,
    });
  },

  /**
   * List available models for a specific provider
   */
  async listModels(provider?: AI.AIProviderName): Promise<AI.ModelInfo[]> {
    const params = provider ? { provider } : {};
    const response = await client.get<{ models: AI.ModelInfo[] }>(
      "/api/ai/models",
      { params }
    );
    return response.models;
  },

  /**
   * Get health status of all AI providers
   */
  async healthCheck(): Promise<AI.ProviderHealthResponse> {
    return client.get<AI.ProviderHealthResponse>("/api/ai/health");
  },

  /**
   * Load/download a specific model
   */
  async loadModel(
    modelName: string,
    provider?: string
  ): Promise<AI.ModelLoadResponse> {
    return client.post<AI.ModelLoadResponse>(
      `/api/ai/models/${modelName}/load`,
      {
        provider: provider || "ollama",
      }
    );
  },

  /**
   * Remove/unload a model
   */
  async removeModel(
    modelName: string,
    provider?: string
  ): Promise<{ message: string }> {
    return client.delete(`/api/ai/models/${modelName}`, {
      data: { provider: provider || "ollama" },
    });
  },

  /**
   * Get detailed information about a specific model
   */
  async getModelInfo(
    modelName: string,
    provider: AI.AIProviderName
  ): Promise<AI.ModelInfo> {
    return client.get<AI.ModelInfo>(`/api/ai/models/${modelName}`, {
      params: { provider },
    });
  },
};

// Export the API client
export default aiApi;
