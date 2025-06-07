// apps/web/src/hooks/ai.ts
// AI Hooks for FARM Framework - Missing implementation
// This provides the hooks that the components are trying to import

import { useState, useCallback, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { aiApi } from "../services/api/ai";
import type * as AI from "../types/ai";

// =============================================================================
// useStreamingChat Hook
// =============================================================================

function useStreamingChat(
  options: {
    provider?: "ollama" | "openai" | "huggingface";
    model?: string;
    initialMessages?: AI.ChatMessage[];
    onMessage?: (message: AI.ChatMessage) => void;
    onError?: (error: Error) => void;
  } = {}
) {
  const [messages, setMessages] = useState<AI.ChatMessage[]>(
    options.initialMessages || []
  );
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentResponse, setCurrentResponse] = useState("");
  const eventSourceRef = useRef<EventSource | null>(null);

  // Default to Ollama in development, OpenAI in production
  const defaultProvider =
    process.env.NODE_ENV === "development" ? "ollama" : "openai";
  const provider = options.provider || defaultProvider;

  const sendMessage = useCallback(
    async (content: string, messageOptions: Partial<AI.ChatRequest> = {}) => {
      const userMessage: AI.ChatMessage = { role: "user", content };
      const newMessages = [...messages, userMessage];
      setMessages(newMessages);
      setIsStreaming(true);
      setCurrentResponse("");

      try {
        // Cancel any existing stream
        if (eventSourceRef.current) {
          eventSourceRef.current.close();
        }

        // Create streaming request (mock implementation for now)
        const streamRequest: AI.ChatRequest = {
          messages: newMessages,
          model: options.model || "llama3.1",
          provider,
          stream: true,
          ...messageOptions,
        };

        // TODO: Replace with actual streaming implementation
        // For now, simulate streaming response
        const mockResponse =
          "This is a mock AI response. The actual streaming implementation will connect to your FastAPI backend.";

        let currentIndex = 0;
        const streamInterval = setInterval(() => {
          if (currentIndex < mockResponse.length) {
            const chunk = mockResponse.slice(0, currentIndex + 1);
            setCurrentResponse(chunk);
            currentIndex += Math.random() > 0.5 ? 2 : 1;
          } else {
            clearInterval(streamInterval);
            setIsStreaming(false);

            const finalMessage: AI.ChatMessage = {
              role: "assistant",
              content: mockResponse,
            };

            setMessages((prev) => [...prev, finalMessage]);
            options.onMessage?.(finalMessage);
            setCurrentResponse("");
          }
        }, 50);
      } catch (error) {
        setIsStreaming(false);
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        options.onError?.(new Error(errorMessage));

        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `❌ Error: ${errorMessage}`,
          },
        ]);
      }
    },
    [messages, provider, options.model, options.onMessage, options.onError]
  );

  const stopGeneration = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsStreaming(false);
    setCurrentResponse("");
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setCurrentResponse("");
    stopGeneration();
  }, [stopGeneration]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopGeneration();
    };
  }, [stopGeneration]);

  return {
    messages,
    currentResponse,
    isStreaming,
    sendMessage,
    stopGeneration,
    clearMessages,
    provider,
  };
}

// =============================================================================
// useAIModels Hook
// =============================================================================

function useAIModels(provider?: "ollama" | "openai" | "huggingface") {
  return useQuery({
    queryKey: ["ai-models", provider],
    queryFn: async () => {
      // Mock data for now - replace with actual API call
      const mockModels: AI.ModelInfo[] = [
        {
          name: "llama3.1",
          provider: "ollama",
          size: "4.7GB",
          description: "Llama 3.1 model for general chat",
          capabilities: ["text-generation", "chat"],
        },
        {
          name: "gpt-3.5-turbo",
          provider: "openai",
          description: "OpenAI GPT-3.5 Turbo",
          capabilities: ["text-generation", "chat"],
        },
      ];

      if (provider) {
        return mockModels.filter((model) => model.provider === provider);
      }
      return mockModels;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
}

// =============================================================================
// useAIHealth Hook
// =============================================================================

function useAIHealth() {
  return useQuery({
    queryKey: ["ai-health"],
    queryFn: async () => {
      // Mock health data - replace with actual API call
      const mockHealth: AI.ProviderHealthResponse = {
        ollama: {
          name: "ollama",
          status: "healthy",
          models: ["llama3.1", "codestral"],
          lastChecked: new Date().toISOString(),
        },
        openai: {
          name: "openai",
          status: "healthy",
          models: ["gpt-3.5-turbo", "gpt-4"],
          lastChecked: new Date().toISOString(),
        },
      };

      return mockHealth;
    },
    refetchInterval: 30000, // Check every 30 seconds
    retry: 1,
  });
}

// =============================================================================
// useAIProvider Hook
// =============================================================================

function useAIProvider() {
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);

  const { data: health } = useAIHealth();
  const { data: models } = useAIModels(selectedProvider as any);

  // Auto-select healthy provider if none selected
  useEffect(() => {
    if (!selectedProvider && health) {
      const healthyProvider = Object.entries(health).find(
        ([_, status]) => status.status === "healthy"
      );
      if (healthyProvider) {
        setSelectedProvider(healthyProvider[0]);
      }
    }
  }, [health, selectedProvider]);

  // Auto-select default model when provider changes
  useEffect(() => {
    if (models && models.length > 0 && !selectedModel) {
      setSelectedModel(models[0].name);
    }
  }, [models, selectedModel]);

  const switchProvider = useCallback((provider: string, model?: string) => {
    setSelectedProvider(provider);
    if (model) {
      setSelectedModel(model);
    } else {
      setSelectedModel(null); // Will auto-select in useEffect
    }
  }, []);

  return {
    selectedProvider,
    selectedModel,
    availableProviders: health ? Object.keys(health) : [],
    availableModels: models || [],
    switchProvider,
    setSelectedModel,
    providerHealth: health,
  };
}

// =============================================================================
// Export all hooks
// =============================================================================

export { useStreamingChat, useAIModels, useAIHealth, useAIProvider };
