import fs from "fs-extra";
import path from "path";
import crypto from "crypto";
import type { OpenAPISchema } from "@farm-framework/types";

/** Options for the {@link AIHookGenerator}. */
export interface AIHookGeneratorOptions {
  outputDir: string;
  generateComments?: boolean;
  includeSessionManagement?: boolean;
  includeBatchInference?: boolean;
  includeAdvancedFeatures?: boolean;
  supportedProviders?: Array<"ollama" | "openai" | "huggingface">;
  defaultProvider?: "ollama" | "openai" | "huggingface";
  enableErrorHandling?: boolean;
  enableOptimisticUpdates?: boolean;
}

export interface AIGenerationResult {
  path: string;
  content?: string;
  size?: number;
  checksum?: string;
  generatedAt?: Date;
  type?: string;
  hooks?: string[];
}

/**
 * Generates comprehensive React hooks for interacting with AI endpoints.
 * Provides streaming chat, model management, health monitoring, and session persistence.
 */
export class AIHookGenerator {
  private options: AIHookGeneratorOptions;

  constructor(options?: Partial<AIHookGeneratorOptions>) {
    this.options = {
      outputDir: "./src/hooks",
      generateComments: true,
      includeSessionManagement: true,
      includeBatchInference: true,
      includeAdvancedFeatures: true,
      supportedProviders: ["ollama", "openai", "huggingface"],
      defaultProvider: "ollama",
      enableErrorHandling: true,
      enableOptimisticUpdates: true,
      ...options,
    };
  }

  /**
   * Generate AI hook source files from an OpenAPI schema.
   *
   * @param schema - Parsed OpenAPI schema
   * @param opts - Generation options
   * @returns Path to the generated file
   */
  async generate(
    schema: OpenAPISchema,
    opts: AIHookGeneratorOptions
  ): Promise<AIGenerationResult> {
    const finalOpts = { ...this.options, ...opts };
    await fs.ensureDir(finalOpts.outputDir);

    const content = this.generateAIHooksContent(schema, finalOpts);
    const outPath = path.join(finalOpts.outputDir, "ai-hooks.ts");

    await fs.writeFile(outPath, content);

    return {
      path: outPath,
      content,
      size: content.length,
      checksum: this.generateChecksum(content),
      generatedAt: new Date(),
      type: "ai-hooks",
      hooks: this.extractHookNames(content),
    };
  }

  private generateAIHooksContent(
    schema: OpenAPISchema,
    opts: AIHookGeneratorOptions
  ): string {
    const aiEndpoints = this.detectAIEndpoints(schema);
    const hooks: string[] = [];

    // File header
    let content = this.generateFileHeader(opts);

    // Core hooks
    hooks.push(this.generateStreamingChatHook(opts));
    hooks.push(this.generateAIModelsHook(opts));
    hooks.push(this.generateAIHealthHook(opts));
    hooks.push(this.generateAIProviderHook(opts));

    // Optional hooks based on configuration
    if (opts.includeBatchInference) {
      hooks.push(this.generateAIInferenceHook(opts));
    }

    if (opts.includeSessionManagement) {
      hooks.push(this.generateChatSessionHook(opts));
    }

    if (opts.includeAdvancedFeatures) {
      hooks.push(this.generateModelLoaderHook(opts));
      hooks.push(this.generateAIConfigHook(opts));
      hooks.push(this.generateTokenCounterHook(opts));
    }

    // Custom hooks for detected AI endpoints
    for (const endpoint of aiEndpoints) {
      hooks.push(this.generateCustomEndpointHook(endpoint, opts));
    }

    content += hooks.join("\n\n");
    content += this.generateExports(opts);

    return content;
  }

  private generateFileHeader(opts: AIHookGeneratorOptions): string {
    if (!opts.generateComments) return "";

    return `/**
 * Auto-generated AI hooks for FARM framework
 * Generated at: ${new Date().toISOString()}
 * DO NOT EDIT - This file is auto-generated
 * 
 * Provides comprehensive React hooks for AI functionality:
 * - Streaming chat with real-time responses
 * - Model management and loading
 * - Provider health monitoring
 * - Session persistence
 * - Batch inference
 * - Error handling and recovery
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { aiApi } from '../services/api';
import type * as AI from '../types/ai';

// =============================================================================
// AI Hooks
// =============================================================================

`;
  }

  private generateStreamingChatHook(opts: AIHookGeneratorOptions): string {
    const providers =
      opts.supportedProviders?.map((p) => `'${p}'`).join(" | ") ||
      "'ollama' | 'openai' | 'huggingface'";
    const defaultProvider = opts.defaultProvider || "ollama";

    return `/**
 * Hook for real-time streaming chat with AI providers
 * Supports ${opts.supportedProviders?.join(", ")} with automatic provider routing
 * Features: Real-time streaming, error recovery, message persistence
 */
export function useStreamingChat(options: {
  provider?: ${providers};
  model?: string;
  initialMessages?: AI.ChatMessage[];
  onMessage?: (message: AI.ChatMessage) => void;
  onError?: (error: Error) => void;
  onStreamStart?: () => void;
  onStreamEnd?: () => void;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
} = {}) {
  const [messages, setMessages] = useState<AI.ChatMessage[]>(
    options.initialMessages || []
  );
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentResponse, setCurrentResponse] = useState('');
  const eventSourceRef = useRef<EventSource | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Default to ${defaultProvider} in development, configurable in production
  const defaultProvider = process.env.NODE_ENV === 'development' ? '${defaultProvider}' : (process.env.REACT_APP_AI_PROVIDER || '${defaultProvider}');
  const provider = options.provider || defaultProvider;

  const sendMessage = useCallback(async (
    content: string, 
    messageOptions: Partial<AI.ChatRequest> = {}
  ) => {
    const userMessage: AI.ChatMessage = { 
      role: 'user', 
      content,
      timestamp: new Date().toISOString()
    };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setIsStreaming(true);
    setCurrentResponse('');
    options.onStreamStart?.();

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
        temperature: options.temperature || 0.7,
        maxTokens: options.maxTokens || 1000,
        systemPrompt: options.systemPrompt,
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
          options.onStreamEnd?.();
          
          // Finalize the assistant message
          const finalMessage: AI.ChatMessage = {
            role: 'assistant',
            content: assistantMessage,
            timestamp: new Date().toISOString()
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
                lastMessage.timestamp = new Date().toISOString();
              } else {
                updated.push({
                  role: 'assistant',
                  content: assistantMessage,
                  timestamp: new Date().toISOString()
                });
              }
              
              return updated;
            });

            if (isFirstChunk) {
              isFirstChunk = false;
              options.onMessage?.({
                role: 'assistant',
                content: data.content,
                timestamp: new Date().toISOString()
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
        options.onStreamEnd?.();
        const errorMessage = 'Failed to connect to AI service';
        options.onError?.(new Error(errorMessage));
        
        // Add error message to chat
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: \`❌ \${errorMessage}. Please try again.\`,
          timestamp: new Date().toISOString()
        }]);
      };

    } catch (error) {
      setIsStreaming(false);
      options.onStreamEnd?.();
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      options.onError?.(new Error(errorMessage));
      
      // Add error message to chat
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: \`❌ Error: \${errorMessage}\`,
        timestamp: new Date().toISOString()
      }]);
    }
  }, [messages, provider, options.model, options.onMessage, options.onError, options.onStreamStart, options.onStreamEnd]);

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
    options.onStreamEnd?.();
  }, [options.onStreamEnd]);

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
    provider,
    model: options.model
  };
}`;
  }

  private generateAIModelsHook(opts: AIHookGeneratorOptions): string {
    const providers =
      opts.supportedProviders?.map((p) => `'${p}'`).join(" | ") ||
      "'ollama' | 'openai' | 'huggingface'";

    return `/**
 * Hook for managing AI models across different providers
 * Provides model listing, filtering, and metadata
 */
export function useAIModels(provider?: ${providers}) {
  return useQuery({
    queryKey: ['ai-models', provider],
    queryFn: () => aiApi.listModels(provider),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    retry: 2,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000)
  });
}`;
  }

  private generateAIHealthHook(opts: AIHookGeneratorOptions): string {
    return `/**
 * Hook for monitoring AI provider health and status
 * Provides real-time health monitoring with automatic retries
 */
export function useAIHealth() {
  return useQuery({
    queryKey: ['ai-health'],
    queryFn: () => aiApi.healthCheck(),
    refetchInterval: 30000, // Check every 30 seconds
    retry: 1,
    staleTime: 15000, // Consider data stale after 15 seconds
    cacheTime: 60000, // Keep in cache for 1 minute
    ${
      opts.enableErrorHandling
        ? `
    onError: (error) => {
      console.warn('AI health check failed:', error);
    }`
        : ""
    }
  });
}`;
  }

  private generateAIProviderHook(opts: AIHookGeneratorOptions): string {
    const defaultProvider = opts.defaultProvider || "ollama";

    return `/**
 * Hook for managing AI provider selection and configuration
 * Handles automatic provider detection and fallback logic
 */
export function useAIProvider() {
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  
  const { data: health } = useAIHealth();
  const { data: models } = useAIModels(selectedProvider as any);

  // Auto-select healthy provider if none selected
  useEffect(() => {
    if (!selectedProvider && health) {
      // Priority order: ${opts.supportedProviders?.join(", ")}
      const providerPriority = [${opts.supportedProviders?.map((p) => `'${p}'`).join(", ")}];
      
      for (const provider of providerPriority) {
        if (health[provider]?.status === 'healthy') {
          setSelectedProvider(provider);
          break;
        }
      }
      
      // Fallback to first healthy provider
      if (!selectedProvider) {
        const healthyProvider = Object.entries(health).find(
          ([_, status]) => status.status === 'healthy'
        );
        if (healthyProvider) {
          setSelectedProvider(healthyProvider[0]);
        }
      }
    }
  }, [health, selectedProvider]);

  // Auto-select default model when provider changes
  useEffect(() => {
    if (models && models.length > 0 && !selectedModel) {
      // Try to find a recommended model, fallback to first available
      const recommendedModel = models.find(m => 
        m.name.includes('llama') || m.name.includes('gpt') || m.name.includes('claude')
      );
      setSelectedModel(recommendedModel?.name || models[0].name);
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
    isHealthy: selectedProvider ? health?.[selectedProvider]?.status === 'healthy' : false
  };
}`;
  }

  private generateAIInferenceHook(opts: AIHookGeneratorOptions): string {
    return `/**
 * Hook for single AI inference requests (non-streaming)
 * Optimized for batch processing and caching
 */
export function useAIInference(options: {
  provider?: string;
  model?: string;
  enableCaching?: boolean;
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
    ${
      opts.enableOptimisticUpdates
        ? `
    onMutate: async (variables) => {
      // Optimistic update for immediate UI feedback
      return { timestamp: Date.now() };
    },`
        : ""
    }
    onSuccess: (data, variables) => {
      if (options.enableCaching !== false) {
        // Cache successful responses for potential reuse
        const cacheKey = JSON.stringify({
          messages: variables.messages,
          model: variables.model,
          provider: variables.provider
        });
        queryClient.setQueryData(['ai-inference', cacheKey], data);
      }
    },
    ${
      opts.enableErrorHandling
        ? `
    onError: (error, variables) => {
      console.error('AI inference failed:', error);
      // Could add toast notification here
    },`
        : ""
    }
    retry: 1,
    retryDelay: 2000
  });
}`;
  }

  private generateChatSessionHook(opts: AIHookGeneratorOptions): string {
    return `/**
 * Hook for managing persistent chat sessions
 * Provides session storage, loading, and synchronization
 */
export function useChatSession(sessionId?: string) {
  const [session, setSession] = useState<{
    id: string;
    messages: AI.ChatMessage[];
    provider: string;
    model: string;
    createdAt: Date;
    lastActivity: Date;
    metadata?: Record<string, any>;
  } | null>(null);

  const saveSession = useCallback((
    messages: AI.ChatMessage[], 
    provider: string, 
    model: string,
    metadata?: Record<string, any>
  ) => {
    const newSession = {
      id: sessionId || \`session-\${Date.now()}\`,
      messages,
      provider,
      model,
      createdAt: new Date(),
      lastActivity: new Date(),
      metadata
    };
    
    setSession(newSession);
    
    // Save to localStorage for persistence
    try {
      localStorage.setItem(\`farm-chat-session-\${newSession.id}\`, JSON.stringify({
        ...newSession,
        createdAt: newSession.createdAt.toISOString(),
        lastActivity: newSession.lastActivity.toISOString()
      }));
    } catch (error) {
      console.warn('Failed to save chat session:', error);
    }
    
    return newSession.id;
  }, [sessionId]);

  const loadSession = useCallback((id: string) => {
    try {
      const saved = localStorage.getItem(\`farm-chat-session-\${id}\`);
      if (saved) {
        const parsed = JSON.parse(saved);
        setSession({
          ...parsed,
          createdAt: new Date(parsed.createdAt),
          lastActivity: new Date(parsed.lastActivity)
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

  const updateSessionMetadata = useCallback((metadata: Record<string, any>) => {
    if (session) {
      const updatedSession = {
        ...session,
        metadata: { ...session.metadata, ...metadata },
        lastActivity: new Date()
      };
      setSession(updatedSession);
      saveSession(updatedSession.messages, updatedSession.provider, updatedSession.model, updatedSession.metadata);
    }
  }, [session, saveSession]);

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
    clearSession,
    updateSessionMetadata,
    isLoaded: Boolean(session)
  };
}`;
  }

  private generateModelLoaderHook(opts: AIHookGeneratorOptions): string {
    return `/**
 * Hook for loading/downloading AI models (primarily for Ollama)
 * Provides progress tracking and error handling
 */
export function useModelLoader() {
  const queryClient = useQueryClient();
  const [loadingProgress, setLoadingProgress] = useState<Record<string, number>>({});

  return useMutation({
    mutationFn: async ({ modelName, provider }: { modelName: string; provider?: string }) => {
      setLoadingProgress(prev => ({ ...prev, [modelName]: 0 }));
      
      // Simulate progress for demonstration
      const progressInterval = setInterval(() => {
        setLoadingProgress(prev => ({
          ...prev,
          [modelName]: Math.min((prev[modelName] || 0) + Math.random() * 20, 95)
        }));
      }, 1000);

      try {
        const result = await aiApi.loadModel(modelName, provider);
        clearInterval(progressInterval);
        setLoadingProgress(prev => ({ ...prev, [modelName]: 100 }));
        return result;
      } catch (error) {
        clearInterval(progressInterval);
        setLoadingProgress(prev => {
          const newProgress = { ...prev };
          delete newProgress[modelName];
          return newProgress;
        });
        throw error;
      }
    },
    onSuccess: () => {
      // Invalidate models list to show newly loaded model
      queryClient.invalidateQueries({ queryKey: ['ai-models'] });
      queryClient.invalidateQueries({ queryKey: ['ai-health'] });
    },
    ${
      opts.enableErrorHandling
        ? `
    onError: (error, variables) => {
      console.error(\`Failed to load model \${variables.modelName}:\`, error);
    }`
        : ""
    }
  });
}`;
  }

  private generateAIConfigHook(opts: AIHookGeneratorOptions): string {
    return `/**
 * Hook for managing AI configuration and settings
 * Provides centralized configuration management
 */
export function useAIConfig() {
  const [config, setConfig] = useState({
    defaultProvider: '${opts.defaultProvider || "ollama"}',
    defaultModel: 'llama3.1',
    temperature: 0.7,
    maxTokens: 1000,
    enableStreaming: true,
    enableCaching: true,
    retryAttempts: 2
  });

  const updateConfig = useCallback((updates: Partial<typeof config>) => {
    setConfig(prev => ({ ...prev, ...updates }));
    
    // Persist to localStorage
    try {
      localStorage.setItem('farm-ai-config', JSON.stringify({ ...config, ...updates }));
    } catch (error) {
      console.warn('Failed to save AI config:', error);
    }
  }, [config]);

  // Load config from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('farm-ai-config');
      if (saved) {
        setConfig(prev => ({ ...prev, ...JSON.parse(saved) }));
      }
    } catch (error) {
      console.warn('Failed to load AI config:', error);
    }
  }, []);

  return {
    config,
    updateConfig,
    resetConfig: () => setConfig({
      defaultProvider: '${opts.defaultProvider || "ollama"}',
      defaultModel: 'llama3.1',
      temperature: 0.7,
      maxTokens: 1000,
      enableStreaming: true,
      enableCaching: true,
      retryAttempts: 2
    })
  };
}`;
  }

  private generateTokenCounterHook(opts: AIHookGeneratorOptions): string {
    return `/**
 * Hook for estimating and tracking token usage
 * Provides cost estimation and usage analytics
 */
export function useTokenCounter() {
  const [usage, setUsage] = useState({
    totalTokens: 0,
    promptTokens: 0,
    completionTokens: 0,
    estimatedCost: 0
  });

  const estimateTokens = useCallback((text: string): number => {
    // Simple estimation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }, []);

  const trackUsage = useCallback((promptTokens: number, completionTokens: number, provider?: string) => {
    const totalTokens = promptTokens + completionTokens;
    
    // Basic cost estimation (adjust rates as needed)
    const rates = {
      openai: { prompt: 0.0005, completion: 0.0015 }, // per 1K tokens
      ollama: { prompt: 0, completion: 0 }, // Local, free
      huggingface: { prompt: 0.0001, completion: 0.0002 }
    };
    
    const rate = rates[provider as keyof typeof rates] || rates.ollama;
    const cost = (promptTokens / 1000) * rate.prompt + (completionTokens / 1000) * rate.completion;

    setUsage(prev => ({
      totalTokens: prev.totalTokens + totalTokens,
      promptTokens: prev.promptTokens + promptTokens,
      completionTokens: prev.completionTokens + completionTokens,
      estimatedCost: prev.estimatedCost + cost
    }));
  }, []);

  const resetUsage = useCallback(() => {
    setUsage({
      totalTokens: 0,
      promptTokens: 0,
      completionTokens: 0,
      estimatedCost: 0
    });
  }, []);

  return {
    usage,
    estimateTokens,
    trackUsage,
    resetUsage
  };
}`;
  }

  private generateCustomEndpointHook(
    endpoint: any,
    opts: AIHookGeneratorOptions
  ): string {
    // Generate hooks for custom AI endpoints detected in the schema
    const hookName = this.generateHookName(endpoint.path);

    return `/**
 * Custom hook for ${endpoint.path}
 * Auto-generated from OpenAPI schema
 */
export function ${hookName}() {
  return useMutation({
    mutationFn: (params: any) => aiApi.customRequest('${endpoint.path}', params),
    ${
      opts.enableErrorHandling
        ? `
    onError: (error) => {
      console.error('${hookName} failed:', error);
    }`
        : ""
    }
  });
}`;
  }

  private generateExports(opts: AIHookGeneratorOptions): string {
    const hooks = [
      "useStreamingChat",
      "useAIModels",
      "useAIHealth",
      "useAIProvider",
    ];

    if (opts.includeBatchInference) {
      hooks.push("useAIInference");
    }

    if (opts.includeSessionManagement) {
      hooks.push("useChatSession");
    }

    if (opts.includeAdvancedFeatures) {
      hooks.push("useModelLoader", "useAIConfig", "useTokenCounter");
    }

    return `

// =============================================================================
// Exports
// =============================================================================

export {
  ${hooks.join(",\n  ")}
};

export type {
  // Re-export AI types for convenience
  AI.ChatMessage,
  AI.ChatRequest,
  AI.ChatResponse,
  AI.ModelInfo,
  AI.ProviderHealthResponse
} from '../types/ai';
`;
  }

  private detectAIEndpoints(schema: OpenAPISchema): any[] {
    const aiEndpoints: any[] = [];

    if (schema.paths) {
      for (const [path, methods] of Object.entries(schema.paths)) {
        if (
          path.includes("/ai/") ||
          path.includes("/chat/") ||
          path.includes("/completion/")
        ) {
          for (const [method, operation] of Object.entries(methods as any)) {
            const operationDef = operation as any;
            aiEndpoints.push({
              path,
              method,
              operation: operationDef,
              operationId: operationDef.operationId,
            });
          }
        }
      }
    }

    return aiEndpoints;
  }

  private generateHookName(path: string): string {
    // Convert "/ai/custom/endpoint" to "useAICustomEndpoint"
    return (
      "use" +
      path
        .split("/")
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join("")
    );
  }

  private extractHookNames(content: string): string[] {
    const hookRegex = /export function (use\w+)/g;
    const hooks: string[] = [];
    let match;

    while ((match = hookRegex.exec(content)) !== null) {
      hooks.push(match[1]);
    }

    return hooks;
  }

  private generateChecksum(content: string): string {
    return crypto.createHash("md5").update(content).digest("hex").slice(0, 8);
  }
}
