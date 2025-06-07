// tools/codegen/ai_hook_generator.ts
import { OpenAPISchema } from "../types/openapi";
import { generateTypeScript } from "./typescript_generator";

export class AIHookGenerator {
  constructor(private schema: OpenAPISchema) {}

  generateAIHooks(): string {
    const hooks = [
      this.generateStreamingChatHook(),
      this.generateAIModelsHook(),
      this.generateAIHealthHook(),
      this.generateAIProviderHook(),
      this.generateAIInferenceHook(),
    ];

    return `// Auto-generated AI hooks for FARM framework
// Do not edit directly - regenerated from API schema

import { useState, useCallback, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { aiApi } from '../services/api';
import type * as AI from '../types/ai';

${hooks.join("\n\n")}

// Export all AI hooks
export {
  useStreamingChat,
  useAIModels,
  useAIHealth,
  useAIProvider,
  useAIInference,
  useChatSession,
  useModelLoader
};
`;
  }

  private generateStreamingChatHook(): string {
    return `/**
 * Hook for real-time streaming chat with AI providers
 * Supports Ollama (local) and OpenAI (cloud) with automatic provider routing
 */
export function useStreamingChat(options: {
  provider?: 'ollama' | 'openai' | 'huggingface';
  model?: string;
  initialMessages?: AI.ChatMessage[];
  onMessage?: (message: AI.ChatMessage) => void;
  onError?: (error: Error) => void;
} = {}) {
  const [messages, setMessages] = useState<AI.ChatMessage[]>(
    options.initialMessages || []
  );
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentResponse, setCurrentResponse] = useState('');
  const eventSourceRef = useRef<EventSource | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Default to Ollama in development, OpenAI in production
  const defaultProvider = process.env.NODE_ENV === 'development' ? 'ollama' : 'openai';
  const provider = options.provider || defaultProvider;

  const sendMessage = useCallback(async (
    content: string, 
    messageOptions: Partial<AI.ChatRequest> = {}
  ) => {
    const userMessage: AI.ChatMessage = { role: 'user', content };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setIsStreaming(true);
    setCurrentResponse('');

    try {
      // Cancel any existing stream
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();

      // Create streaming request
      const streamRequest: AI.ChatRequest = {
        messages: newMessages,
        model: options.model || 'llama3.1',
        provider,
        stream: true,
        ...messageOptions
      };

      const eventSource = aiApi.chatStream(streamRequest);
      eventSourceRef.current = eventSource;

      let assistantMessage = '';
      let isFirstChunk = true;

      eventSource.onmessage = (event) => {
        if (event.data === '[DONE]') {
          setIsStreaming(false);
          eventSource.close();
          
          // Finalize the assistant message
          const finalMessage: AI.ChatMessage = {
            role: 'assistant',
            content: assistantMessage
          };
          
          setMessages(prev => {
            const updated = [...prev];
            if (updated[updated.length - 1]?.role === 'assistant') {
              updated[updated.length - 1] = finalMessage;
            } else {
              updated.push(finalMessage);
            }
            return updated;
          });
          
          options.onMessage?.(finalMessage);
          setCurrentResponse('');
          return;
        }

        try {
          const data = JSON.parse(event.data);
          if (data.content) {
            assistantMessage += data.content;
            setCurrentResponse(assistantMessage);

            // Add or update the assistant message in real-time
            setMessages(prev => {
              const updated = [...prev];
              const lastMessage = updated[updated.length - 1];
              
              if (lastMessage?.role === 'assistant') {
                lastMessage.content = assistantMessage;
              } else {
                updated.push({
                  role: 'assistant',
                  content: assistantMessage
                });
              }
              
              return updated;
            });

            if (isFirstChunk) {
              isFirstChunk = false;
              // Notify about first response chunk
              options.onMessage?.({
                role: 'assistant',
                content: data.content
              });
            }
          }
        } catch (error) {
          console.warn('Failed to parse streaming response:', error);
        }
      };

      eventSource.onerror = (error) => {
        setIsStreaming(false);
        eventSource.close();
        const errorMessage = 'Failed to connect to AI service';
        options.onError?.(new Error(errorMessage));
        
        // Add error message to chat
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: \`❌ \${errorMessage}. Please try again.\`
        }]);
      };

    } catch (error) {
      setIsStreaming(false);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      options.onError?.(new Error(errorMessage));
      
      // Add error message to chat
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: \`❌ Error: \${errorMessage}\`
      }]);
    }
  }, [messages, provider, options.model, options.onMessage, options.onError]);

  const stopGeneration = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
    setCurrentResponse('');
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setCurrentResponse('');
    stopGeneration();
  }, [stopGeneration]);

  const regenerateLastResponse = useCallback(() => {
    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
    if (lastUserMessage) {
      // Remove last assistant response if it exists
      const filteredMessages = messages.filter((_, index) => 
        index < messages.length - 1 || messages[index].role !== 'assistant'
      );
      setMessages(filteredMessages);
      sendMessage(lastUserMessage.content);
    }
  }, [messages, sendMessage]);

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
    regenerateLastResponse,
    provider
  };
}`;
  }

  private generateAIModelsHook(): string {
    return `/**
 * Hook for managing AI models across different providers
 */
export function useAIModels(provider?: 'ollama' | 'openai' | 'huggingface') {
  return useQuery({
    queryKey: ['ai-models', provider],
    queryFn: () => aiApi.listModels(provider),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false
  });
}

/**
 * Hook for loading/downloading AI models (primarily for Ollama)
 */
export function useModelLoader() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ modelName, provider }: { modelName: string; provider?: string }) =>
      aiApi.loadModel(modelName, provider),
    onSuccess: () => {
      // Invalidate models list to show newly loaded model
      queryClient.invalidateQueries({ queryKey: ['ai-models'] });
    }
  });
}`;
  }

  private generateAIHealthHook(): string {
    return `/**
 * Hook for monitoring AI provider health and status
 */
export function useAIHealth() {
  return useQuery({
    queryKey: ['ai-health'],
    queryFn: () => aiApi.healthCheck(),
    refetchInterval: 30000, // Check every 30 seconds
    retry: 1
  });
}

/**
 * Hook for managing AI provider selection and configuration
 */
export function useAIProvider() {
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  
  const { data: health } = useAIHealth();
  const { data: models } = useAIModels(selectedProvider as any);

  // Auto-select healthy provider if none selected
  useEffect(() => {
    if (!selectedProvider && health) {
      const healthyProvider = Object.entries(health).find(
        ([_, status]) => status.status === 'healthy'
      );
      if (healthyProvider) {
        setSelectedProvider(healthyProvider[0]);
      }
    }
  }, [health, selectedProvider]);

  // Auto-select default model when provider changes
  useEffect(() => {
    if (models && models.length > 0 && !selectedModel) {
      // Select the first available model as default
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
    providerHealth: health
  };
}`;
  }

  private generateAIInferenceHook(): string {
    return `/**
 * Hook for single AI inference requests (non-streaming)
 */
export function useAIInference(options: {
  provider?: string;
  model?: string;
} = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: AI.ChatRequest) => {
      const response = await aiApi.chat({
        ...request,
        provider: options.provider,
        model: options.model || request.model,
        stream: false
      });
      return response;
    },
    onSuccess: (data, variables) => {
      // Cache successful responses for potential reuse
      const cacheKey = JSON.stringify({
        messages: variables.messages,
        model: variables.model,
        provider: variables.provider
      });
      queryClient.setQueryData(['ai-inference', cacheKey], data);
    }
  });
}

/**
 * Hook for managing persistent chat sessions
 */
export function useChatSession(sessionId?: string) {
  const [session, setSession] = useState<{
    id: string;
    messages: AI.ChatMessage[];
    provider: string;
    model: string;
    createdAt: Date;
  } | null>(null);

  const saveSession = useCallback((messages: AI.ChatMessage[], provider: string, model: string) => {
    const newSession = {
      id: sessionId || \`session-\${Date.now()}\`,
      messages,
      provider,
      model,
      createdAt: new Date()
    };
    
    setSession(newSession);
    
    // Save to localStorage for persistence
    localStorage.setItem(\`farm-chat-session-\${newSession.id}\`, JSON.stringify(newSession));
    
    return newSession.id;
  }, [sessionId]);

  const loadSession = useCallback((id: string) => {
    try {
      const saved = localStorage.getItem(\`farm-chat-session-\${id}\`);
      if (saved) {
        const parsed = JSON.parse(saved);
        setSession({
          ...parsed,
          createdAt: new Date(parsed.createdAt)
        });
        return parsed;
      }
    } catch (error) {
      console.warn('Failed to load chat session:', error);
    }
    return null;
  }, []);

  const clearSession = useCallback(() => {
    if (session) {
      localStorage.removeItem(\`farm-chat-session-\${session.id}\`);
    }
    setSession(null);
  }, [session]);

  // Load session on mount if sessionId provided
  useEffect(() => {
    if (sessionId) {
      loadSession(sessionId);
    }
  }, [sessionId, loadSession]);

  return {
    session,
    saveSession,
    loadSession,
    clearSession
  };
}`;
  }
}
