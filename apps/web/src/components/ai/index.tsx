// apps/web/src/components/ai/index.tsx
// AI Components for FARM Framework - FIXED VERSION
// ✅ Correct file extension: .tsx (not .ts)
// ✅ Proper imports from existing files

import React, { useState, useEffect, useRef } from "react";
import {
  useStreamingChat,
  useAIModels,
  useAIHealth,
  useAIProvider,
} from "../../hooks/ai";
import type * as AI from "../../types/ai";

// =============================================================================
// StreamingChatWindow Component
// =============================================================================

interface StreamingChatWindowProps {
  provider?: "ollama" | "openai" | "huggingface";
  model?: string;
  placeholder?: string;
  className?: string;
  onMessageSent?: (message: string) => void;
  onResponseReceived?: (response: string) => void;
  maxHeight?: string;
  showProviderInfo?: boolean;
}

export function StreamingChatWindow({
  provider,
  model,
  placeholder = "Type your message...",
  className = "",
  onMessageSent,
  onResponseReceived,
  maxHeight = "500px",
  showProviderInfo = true,
}: StreamingChatWindowProps) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    messages,
    currentResponse,
    isStreaming,
    sendMessage,
    stopGeneration,
    clearMessages,
    provider: activeProvider,
  } = useStreamingChat({
    provider,
    model: model || "llama3.1",
    onMessage: (message) => {
      if (message.role === "assistant") {
        onResponseReceived?.(message.content);
      }
    },
  });

  const { data: health } = useAIHealth();
  const providerStatus = health?.[activeProvider];

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, currentResponse]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;

    const message = input.trim();
    setInput("");
    onMessageSent?.(message);
    await sendMessage(message);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className={`farm-chat-window ${className}`}>
      {/* Provider Status Bar */}
      {showProviderInfo && (
        <div className="flex items-center justify-between p-3 bg-gray-50 border-b">
          <div className="flex items-center space-x-2">
            <div
              className={`w-2 h-2 rounded-full ${
                providerStatus?.status === "healthy"
                  ? "bg-green-500"
                  : "bg-red-500"
              }`}
            />
            <span className="text-sm font-medium">
              {activeProvider} ({model || "default model"})
            </span>
          </div>
          <button
            onClick={clearMessages}
            className="text-xs text-gray-500 hover:text-gray-700"
            disabled={isStreaming}
          >
            Clear Chat
          </button>
        </div>
      )}

      {/* Messages Area */}
      <div
        className="flex-1 overflow-y-auto p-4 space-y-4"
        style={{ maxHeight }}
      >
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${
              message.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                message.role === "user"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200 text-gray-900"
              }`}
            >
              <div className="whitespace-pre-wrap">{message.content}</div>
            </div>
          </div>
        ))}

        {/* Current streaming response */}
        {currentResponse && (
          <div className="flex justify-start">
            <div className="max-w-xs lg:max-w-md px-4 py-2 rounded-lg bg-gray-200 text-gray-900">
              <div className="whitespace-pre-wrap">{currentResponse}</div>
              <div className="flex items-center mt-2">
                <div className="animate-pulse text-blue-500">●</div>
                <span className="text-xs text-gray-500 ml-2">
                  AI is typing...
                </span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <form onSubmit={handleSubmit} className="border-t p-4">
        <div className="flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={placeholder}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isStreaming}
          />
          {isStreaming ? (
            <button
              type="button"
              onClick={stopGeneration}
              className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              Stop
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim()}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Send
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

// =============================================================================
// AIModelSelector Component
// =============================================================================

interface AIModelSelectorProps {
  onProviderChange?: (provider: string) => void;
  onModelChange?: (model: string) => void;
  className?: string;
  showHealth?: boolean;
}

export function AIModelSelector({
  onProviderChange,
  onModelChange,
  className = "",
  showHealth = true,
}: AIModelSelectorProps) {
  const {
    selectedProvider,
    selectedModel,
    availableProviders,
    availableModels,
    switchProvider,
    setSelectedModel,
    providerHealth,
  } = useAIProvider();

  const handleProviderChange = (provider: string) => {
    switchProvider(provider);
    onProviderChange?.(provider);
  };

  const handleModelChange = (model: string) => {
    setSelectedModel(model);
    onModelChange?.(model);
  };

  return (
    <div className={`farm-model-selector ${className}`}>
      <div className="space-y-4">
        {/* Provider Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            AI Provider
          </label>
          <select
            value={selectedProvider || ""}
            onChange={(e) => handleProviderChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select Provider...</option>
            {availableProviders.map((provider) => (
              <option key={provider} value={provider}>
                {provider.charAt(0).toUpperCase() + provider.slice(1)}
                {showHealth &&
                  providerHealth?.[provider] &&
                  ` (${providerHealth[provider].status})`}
              </option>
            ))}
          </select>
        </div>

        {/* Model Selection */}
        {selectedProvider && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Model
            </label>
            <select
              value={selectedModel || ""}
              onChange={(e) => handleModelChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Model...</option>
              {availableModels.map((model) => (
                <option key={model.name} value={model.name}>
                  {model.name}
                  {model.size && ` (${model.size})`}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Provider Health Status */}
        {showHealth &&
          selectedProvider &&
          providerHealth?.[selectedProvider] && (
            <div className="text-sm">
              <div className="flex items-center space-x-2">
                <div
                  className={`w-2 h-2 rounded-full ${
                    providerHealth[selectedProvider].status === "healthy"
                      ? "bg-green-500"
                      : "bg-red-500"
                  }`}
                />
                <span className="capitalize">
                  {providerHealth[selectedProvider].status}
                </span>
              </div>
              {providerHealth[selectedProvider].models.length > 0 && (
                <div className="text-gray-500 mt-1">
                  {providerHealth[selectedProvider].models.length} models
                  available
                </div>
              )}
            </div>
          )}
      </div>
    </div>
  );
}

// =============================================================================
// AIHealthDashboard Component
// =============================================================================

export function AIHealthDashboard({ className = "" }: { className?: string }) {
  const { data: health, isLoading, error } = useAIHealth();

  if (isLoading) {
    return (
      <div className={`farm-health-dashboard ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-8 bg-gray-200 rounded"></div>
            <div className="h-8 bg-gray-200 rounded"></div>
            <div className="h-8 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`farm-health-dashboard ${className}`}>
        <div className="text-red-600">❌ Failed to load AI provider health</div>
      </div>
    );
  }

  return (
    <div className={`farm-health-dashboard ${className}`}>
      <h3 className="text-lg font-semibold mb-4">AI Provider Status</h3>

      <div className="space-y-3">
        {health &&
          Object.entries(health).map(([provider, status]) => (
            <div
              key={provider}
              className="flex items-center justify-between p-3 border rounded-lg"
            >
              <div className="flex items-center space-x-3">
                <div
                  className={`w-3 h-3 rounded-full ${
                    status.status === "healthy"
                      ? "bg-green-500"
                      : status.status === "loading"
                      ? "bg-yellow-500"
                      : "bg-red-500"
                  }`}
                />
                <div>
                  <div className="font-medium capitalize">{provider}</div>
                  <div className="text-sm text-gray-500">
                    {status.models.length} models • {status.status}
                  </div>
                </div>
              </div>

              <div className="text-right">
                {status.status === "healthy" && (
                  <span className="text-green-600 text-sm">✓ Ready</span>
                )}
                {status.status === "loading" && (
                  <span className="text-yellow-600 text-sm">⏳ Loading</span>
                )}
                {status.status === "unhealthy" && (
                  <span className="text-red-600 text-sm">❌ Error</span>
                )}
              </div>
            </div>
          ))}
      </div>

      {/* Quick Stats */}
      {health && (
        <div className="mt-6 grid grid-cols-2 gap-4 text-center">
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {
                Object.values(health).filter((s) => s.status === "healthy")
                  .length
              }
            </div>
            <div className="text-sm text-gray-600">Healthy Providers</div>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">
              {Object.values(health).reduce(
                (acc, s) => acc + s.models.length,
                0
              )}
            </div>
            <div className="text-sm text-gray-600">Total Models</div>
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// AIInferenceStatus Component
// =============================================================================

interface AIInferenceStatusProps {
  provider?: string;
  model?: string;
  showDetails?: boolean;
  className?: string;
}

export function AIInferenceStatus({
  provider,
  model,
  showDetails = false,
  className = "",
}: AIInferenceStatusProps) {
  const { data: health } = useAIHealth();

  if (!provider) {
    return (
      <div className={`farm-inference-status ${className}`}>
        <span className="text-gray-500">No provider selected</span>
      </div>
    );
  }

  const providerHealth = health?.[provider];
  const isHealthy = providerHealth?.status === "healthy";
  const modelAvailable = providerHealth?.models.includes(model || "");

  return (
    <div className={`farm-inference-status ${className}`}>
      <div className="flex items-center space-x-2">
        <div
          className={`w-2 h-2 rounded-full ${
            isHealthy ? "bg-green-500" : "bg-red-500"
          }`}
        />
        <span className="text-sm">
          {provider} {model && `(${model})`}
        </span>
        {isHealthy ? (
          <span className="text-green-600 text-xs">Ready</span>
        ) : (
          <span className="text-red-600 text-xs">Unavailable</span>
        )}
      </div>

      {showDetails && (
        <div className="mt-2 text-xs text-gray-500">
          {model && !modelAvailable && (
            <div className="text-yellow-600">⚠️ Model not loaded</div>
          )}
          {!isHealthy && (
            <div className="text-red-600">❌ Provider offline</div>
          )}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Export all components
// =============================================================================

export {
  StreamingChatWindow,
  AIModelSelector,
  AIHealthDashboard,
  AIInferenceStatus,
};

// Default export for convenience
export default {
  StreamingChatWindow,
  AIModelSelector,
  AIHealthDashboard,
  AIInferenceStatus,
};
