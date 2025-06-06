// apps/web/src/pages/AIChat.tsx
// Complete example showing all FARM AI features working together
// This demonstrates the developer experience for AI-powered apps

import React, { useState, useEffect } from "react";
import {
  StreamingChatWindow,
  AIModelSelector,
  AIHealthDashboard,
  AIInferenceStatus,
} from "../components/ai";
import {
  useStreamingChat,
  useAIModels,
  useAIHealth,
  useAIProvider,
  useChatSession,
} from "../hooks/ai";
import { aiApiExtended } from "../services/api/ai";
import type * as AI from "../types/ai";

// =============================================================================
// Main AI Chat Application
// =============================================================================

export default function AIChatPage() {
  const [selectedTab, setSelectedTab] = useState<"chat" | "models" | "health">(
    "chat"
  );
  const [autoConfigured, setAutoConfigured] = useState(false);
  const [configStatus, setConfigStatus] = useState<string>("");

  // AI provider management
  const {
    selectedProvider,
    selectedModel,
    switchProvider,
    setSelectedModel,
    providerHealth,
  } = useAIProvider();

  // Chat session management
  const { session, saveSession, loadSession } = useChatSession();

  // Auto-configure AI on first load
  useEffect(() => {
    const autoSetup = async () => {
      try {
        const config = await aiApiExtended.autoConfigureAI();
        setConfigStatus(config.message);

        if (config.ready && config.provider !== "none") {
          switchProvider(config.provider, config.model);
          setAutoConfigured(true);
        }
      } catch (error) {
        setConfigStatus("Failed to auto-configure AI");
        console.error("AI auto-configuration failed:", error);
      }
    };

    autoSetup();
  }, [switchProvider]);

  // Save chat sessions automatically
  const handleChatMessage = (message: string) => {
    console.log("User sent:", message);
  };

  const handleAIResponse = (response: string) => {
    console.log("AI responded:", response);
    // Auto-save session could go here
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">FARM AI Chat</h1>
              <p className="text-sm text-gray-600">
                {configStatus || "AI-powered chat with Ollama & OpenAI"}
              </p>
            </div>

            {/* Current AI Status */}
            <div className="flex items-center space-x-4">
              <AIInferenceStatus
                provider={selectedProvider || undefined}
                model={selectedModel || undefined}
                showDetails={true}
              />
              {!autoConfigured && (
                <div className="text-sm text-yellow-600">
                  ⚠️ Configuring AI...
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tab Navigation */}
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-6">
          {[
            { id: "chat", label: "Chat", icon: "💬" },
            { id: "models", label: "Models", icon: "🤖" },
            { id: "health", label: "Status", icon: "📊" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedTab(tab.id as any)}
              className={`flex-1 flex items-center justify-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                selectedTab === tab.id
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Content Area */}
          <div className="lg:col-span-3">
            {selectedTab === "chat" && (
              <ChatTab
                provider={selectedProvider}
                model={selectedModel}
                onMessageSent={handleChatMessage}
                onResponseReceived={handleAIResponse}
              />
            )}

            {selectedTab === "models" && <ModelsTab />}

            {selectedTab === "health" && <HealthTab />}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="space-y-6">
              {/* Model Selection */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  AI Configuration
                </h3>
                <AIModelSelector
                  onProviderChange={(provider) => switchProvider(provider)}
                  onModelChange={(model) => setSelectedModel(model)}
                  showHealth={true}
                />
              </div>

              {/* Quick Actions */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Quick Actions
                </h3>
                <div className="space-y-3">
                  <QuickActionButton
                    icon="🔄"
                    label="Auto-Configure"
                    onClick={async () => {
                      const config = await aiApiExtended.autoConfigureAI();
                      setConfigStatus(config.message);
                      if (config.ready) {
                        switchProvider(config.provider, config.model);
                      }
                    }}
                  />
                  <QuickActionButton
                    icon="📥"
                    label="Download Model"
                    onClick={() => {
                      // This would open a model download dialog
                      console.log("Download model clicked");
                    }}
                  />
                  <QuickActionButton
                    icon="🗑️"
                    label="Clear Chat"
                    onClick={() => {
                      // This would clear the current chat
                      console.log("Clear chat clicked");
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Tab Components
// =============================================================================

function ChatTab({
  provider,
  model,
  onMessageSent,
  onResponseReceived,
}: {
  provider: string | null;
  model: string | null;
  onMessageSent: (message: string) => void;
  onResponseReceived: (response: string) => void;
}) {
  const isReady = provider && model;

  if (!isReady) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <div className="text-gray-400 text-6xl mb-4">🤖</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Select AI Provider & Model
        </h3>
        <p className="text-gray-600 mb-4">
          Choose an AI provider and model from the sidebar to start chatting.
        </p>
        <div className="text-sm text-gray-500">
          💡 Tip: FARM automatically configures Ollama for local development
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <StreamingChatWindow
        provider={provider as AI.AIProviderName}
        model={model}
        placeholder={`Chat with ${model} via ${provider}...`}
        onMessageSent={onMessageSent}
        onResponseReceived={onResponseReceived}
        maxHeight="600px"
        showProviderInfo={true}
        className="h-[700px]"
      />
    </div>
  );
}

function ModelsTab() {
  const { data: ollamaModels } = useAIModels("ollama");
  const { data: openaiModels } = useAIModels("openai");
  const { data: hfModels } = useAIModels("huggingface");

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Available AI Models
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Models available across all configured providers
          </p>
        </div>

        <div className="p-6 space-y-6">
          {/* Ollama Models */}
          <ModelSection
            title="Ollama (Local)"
            icon="🏠"
            models={ollamaModels || []}
            provider="ollama"
            description="Local AI models running on your machine"
          />

          {/* OpenAI Models */}
          <ModelSection
            title="OpenAI (Cloud)"
            icon="☁️"
            models={openaiModels || []}
            provider="openai"
            description="Cloud-based models from OpenAI"
          />

          {/* HuggingFace Models */}
          <ModelSection
            title="HuggingFace (Cloud)"
            icon="🤗"
            models={hfModels || []}
            provider="huggingface"
            description="Open-source models from HuggingFace"
          />
        </div>
      </div>
    </div>
  );
}

function HealthTab() {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            AI Provider Health
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Real-time status of all AI providers and services
          </p>
        </div>

        <div className="p-6">
          <AIHealthDashboard refreshInterval={10000} showDetails={true} />
        </div>
      </div>

      {/* System Info */}
      <SystemInfoCard />
    </div>
  );
}

// =============================================================================
// Helper Components
// =============================================================================

function ModelSection({
  title,
  icon,
  models,
  provider,
  description,
}: {
  title: string;
  icon: string;
  models: AI.ModelInfo[];
  provider: string;
  description: string;
}) {
  return (
    <div>
      <div className="flex items-center mb-3">
        <span className="text-2xl mr-3">{icon}</span>
        <div>
          <h3 className="font-medium text-gray-900">{title}</h3>
          <p className="text-sm text-gray-600">{description}</p>
        </div>
      </div>

      {models.length === 0 ? (
        <div className="text-gray-500 text-sm ml-8">No models available</div>
      ) : (
        <div className="ml-8 space-y-2">
          {models.map((model) => (
            <div
              key={model.name}
              className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
            >
              <div>
                <div className="font-medium">{model.name}</div>
                {model.size && (
                  <div className="text-sm text-gray-500">
                    Size: {model.size}
                  </div>
                )}
              </div>
              <div className="flex space-x-2">
                {provider === "ollama" && (
                  <button className="text-sm text-blue-600 hover:text-blue-800">
                    Load
                  </button>
                )}
                <button className="text-sm text-gray-600 hover:text-gray-800">
                  Info
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function QuickActionButton({
  icon,
  label,
  onClick,
}: {
  icon: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md transition-colors"
    >
      <span className="mr-3">{icon}</span>
      {label}
    </button>
  );
}

function SystemInfoCard() {
  const { data: health } = useAIHealth();

  const totalModels = Object.values(health || {}).reduce(
    (acc, provider) => acc + provider.models.length,
    0
  );

  const healthyProviders = Object.values(health || {}).filter(
    (provider) => provider.status === "healthy"
  ).length;

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">
          System Information
        </h3>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-2 gap-4 text-center">
          <div className="p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">
              {healthyProviders}
            </div>
            <div className="text-sm text-blue-800">Active Providers</div>
          </div>
          <div className="p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {totalModels}
            </div>
            <div className="text-sm text-green-800">Available Models</div>
          </div>
        </div>

        <div className="mt-4 text-sm text-gray-600">
          <div>Framework: FARM Stack</div>
          <div>Environment: {process.env.NODE_ENV}</div>
          <div>
            API URL: {process.env.VITE_API_URL || "http://localhost:8000"}
          </div>
        </div>
      </div>
    </div>
  );
}
