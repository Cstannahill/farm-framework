# AI/ML Integration Points

## Overview

FARM provides first-class AI/ML integration with seamless local-to-cloud workflows. The framework supports multiple AI providers (Ollama, OpenAI, HuggingFace) with automatic provider switching, unified APIs, and intelligent resource management. This enables developers to use local models (Ollama) during development and cloud models in production without code changes.

---

## High-Level AI Integration Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      FARM AI Integration Layer                  │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────┐ │
│  │   Ollama    │  │   OpenAI    │  │ HuggingFace │  │ Custom  │ │
│  │  (Local)    │  │  (Cloud)    │  │  (Cloud)    │  │Provider │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────┘ │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────┐ │
│  │ Provider    │  │ Model       │  │ GPU         │  │Streaming│ │
│  │ Router      │  │ Manager     │  │ Manager     │  │ Handler │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────┘ │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────┐ │
│  │ Response    │  │ Error       │  │ Performance │  │ Type    │ │
│  │ Cache       │  │ Handler     │  │ Monitor     │  │ Safety  │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## Core Components

### 1. AI Provider Abstraction Layer

**Purpose:** Unified interface across different AI providers

**Implementation:**
```python
# apps/api/src/ai/providers/base.py
from abc import ABC, abstractmethod
from typing import AsyncIterator, Dict, Any, Optional
from pydantic import BaseModel

class AIProvider(ABC):
    """Base class for all AI providers"""
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.models = {}
        
    @abstractmethod
    async def load_model(self, model_name: str) -> bool:
        """Load a specific model"""
        pass
        
    @abstractmethod
    async def generate(self, prompt: str, model: str, **kwargs) -> str:
        """Generate text completion"""
        pass
        
    @abstractmethod
    async def generate_stream(self, prompt: str, model: str, **kwargs) -> AsyncIterator[str]:
        """Generate streaming text completion"""
        pass
        
    @abstractmethod
    async def embed(self, text: str, model: str) -> List[float]:
        """Generate embeddings"""
        pass
        
    @abstractmethod
    async def health_check(self) -> bool:
        """Check if provider is healthy"""
        pass

class ChatMessage(BaseModel):
    role: str  # system, user, assistant
    content: str

class GenerationRequest(BaseModel):
    messages: List[ChatMessage]
    model: str
    temperature: float = 0.7
    max_tokens: int = 1000
    stream: bool = False
```

### 2. Ollama Provider Implementation

**Purpose:** Local AI model serving with Ollama

**Implementation:**
```python
# apps/api/src/ai/providers/ollama.py
import asyncio
import httpx
from typing import AsyncIterator, List
from .base import AIProvider, ChatMessage

class OllamaProvider(AIProvider):
    """Ollama local AI provider"""
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.base_url = config.get('url', 'http://localhost:11434')
        self.client = httpx.AsyncClient(base_url=self.base_url, timeout=60.0)
        
    async def load_model(self, model_name: str) -> bool:
        """Load/pull model if not available"""
        try:
            # Check if model exists
            response = await self.client.get('/api/tags')
            models = [m['name'] for m in response.json().get('models', [])]
            
            if model_name not in models:
                print(f"📥 Pulling Ollama model: {model_name}")
                # Pull model (this can take time for large models)
                async with self.client.stream('POST', '/api/pull', 
                    json={'name': model_name}) as response:
                    async for chunk in response.aiter_lines():
                        if chunk:
                            data = json.loads(chunk)
                            if 'status' in data:
                                print(f"📦 {data['status']}")
                                
            self.models[model_name] = True
            return True
        except Exception as e:
            print(f"❌ Failed to load Ollama model {model_name}: {e}")
            return False
    
    async def generate(self, prompt: str, model: str, **kwargs) -> str:
        """Generate completion using Ollama"""
        if model not in self.models:
            await self.load_model(model)
            
        response = await self.client.post('/api/generate', json={
            'model': model,
            'prompt': prompt,
            'stream': False,
            'options': {
                'temperature': kwargs.get('temperature', 0.7),
                'num_predict': kwargs.get('max_tokens', 1000)
            }
        })
        
        result = response.json()
        return result.get('response', '')
    
    async def generate_stream(self, prompt: str, model: str, **kwargs) -> AsyncIterator[str]:
        """Stream completion from Ollama"""
        if model not in self.models:
            await self.load_model(model)
            
        async with self.client.stream('POST', '/api/generate', json={
            'model': model,
            'prompt': prompt,
            'stream': True,
            'options': {
                'temperature': kwargs.get('temperature', 0.7),
                'num_predict': kwargs.get('max_tokens', 1000)
            }
        }) as response:
            async for chunk in response.aiter_lines():
                if chunk:
                    data = json.loads(chunk)
                    if 'response' in data:
                        yield data['response']
    
    async def chat(self, messages: List[ChatMessage], model: str, **kwargs) -> str:
        """Chat completion using Ollama"""
        if model not in self.models:
            await self.load_model(model)
            
        response = await self.client.post('/api/chat', json={
            'model': model,
            'messages': [{'role': msg.role, 'content': msg.content} for msg in messages],
            'stream': False,
            'options': {
                'temperature': kwargs.get('temperature', 0.7),
                'num_predict': kwargs.get('max_tokens', 1000)
            }
        })
        
        result = response.json()
        return result.get('message', {}).get('content', '')
    
    async def chat_stream(self, messages: List[ChatMessage], model: str, **kwargs) -> AsyncIterator[str]:
        """Stream chat completion from Ollama"""
        if model not in self.models:
            await self.load_model(model)
            
        async with self.client.stream('POST', '/api/chat', json={
            'model': model,
            'messages': [{'role': msg.role, 'content': msg.content} for msg in messages],
            'stream': True,
            'options': {
                'temperature': kwargs.get('temperature', 0.7),
                'num_predict': kwargs.get('max_tokens', 1000)
            }
        }) as response:
            async for chunk in response.aiter_lines():
                if chunk:
                    data = json.loads(chunk)
                    if 'message' in data and 'content' in data['message']:
                        yield data['message']['content']
    
    async def health_check(self) -> bool:
        """Check if Ollama is running"""
        try:
            response = await self.client.get('/api/tags')
            return response.status_code == 200
        except:
            return False
```

### 3. OpenAI Provider Implementation

**Purpose:** Cloud AI provider for production

**Implementation:**
```python
# apps/api/src/ai/providers/openai.py
import openai
from typing import AsyncIterator, List
from .base import AIProvider, ChatMessage

class OpenAIProvider(AIProvider):
    """OpenAI cloud AI provider"""
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        openai.api_key = config.get('api_key')
        self.client = openai.AsyncClient()
        
    async def load_model(self, model_name: str) -> bool:
        """OpenAI models don't need explicit loading"""
        self.models[model_name] = True
        return True
    
    async def generate(self, prompt: str, model: str, **kwargs) -> str:
        """Generate completion using OpenAI"""
        response = await self.client.completions.create(
            model=model,
            prompt=prompt,
            temperature=kwargs.get('temperature', 0.7),
            max_tokens=kwargs.get('max_tokens', 1000)
        )
        return response.choices[0].text
    
    async def generate_stream(self, prompt: str, model: str, **kwargs) -> AsyncIterator[str]:
        """Stream completion from OpenAI"""
        response = await self.client.completions.create(
            model=model,
            prompt=prompt,
            temperature=kwargs.get('temperature', 0.7),
            max_tokens=kwargs.get('max_tokens', 1000),
            stream=True
        )
        
        async for chunk in response:
            if chunk.choices[0].text:
                yield chunk.choices[0].text
    
    async def chat(self, messages: List[ChatMessage], model: str, **kwargs) -> str:
        """Chat completion using OpenAI"""
        response = await self.client.chat.completions.create(
            model=model,
            messages=[{"role": msg.role, "content": msg.content} for msg in messages],
            temperature=kwargs.get('temperature', 0.7),
            max_tokens=kwargs.get('max_tokens', 1000)
        )
        return response.choices[0].message.content
    
    async def chat_stream(self, messages: List[ChatMessage], model: str, **kwargs) -> AsyncIterator[str]:
        """Stream chat completion from OpenAI"""
        response = await self.client.chat.completions.create(
            model=model,
            messages=[{"role": msg.role, "content": msg.content} for msg in messages],
            temperature=kwargs.get('temperature', 0.7),
            max_tokens=kwargs.get('max_tokens', 1000),
            stream=True
        )
        
        async for chunk in response:
            if chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content
    
    async def health_check(self) -> bool:
        """Check OpenAI API availability"""
        try:
            await self.client.models.list()
            return True
        except:
            return False
```

### 4. HuggingFace Provider Implementation

**Purpose:** Open-source models and inference

**Implementation:**
```python
# apps/api/src/ai/providers/huggingface.py
from transformers import pipeline, AutoTokenizer, AutoModelForCausalLM
import torch
from typing import AsyncIterator, List
from .base import AIProvider, ChatMessage

class HuggingFaceProvider(AIProvider):
    """HuggingFace local/cloud AI provider"""
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.pipelines = {}
        
    async def load_model(self, model_name: str) -> bool:
        """Load HuggingFace model"""
        try:
            print(f"📥 Loading HuggingFace model: {model_name}")
            
            # Load tokenizer and model
            tokenizer = AutoTokenizer.from_pretrained(model_name)
            model = AutoModelForCausalLM.from_pretrained(
                model_name,
                device_map="auto" if self.device == "cuda" else None,
                torch_dtype=torch.float16 if self.device == "cuda" else torch.float32
            )
            
            # Create pipeline
            self.pipelines[model_name] = pipeline(
                "text-generation",
                model=model,
                tokenizer=tokenizer,
                device=0 if self.device == "cuda" else -1
            )
            
            self.models[model_name] = True
            print(f"✅ HuggingFace model {model_name} loaded successfully")
            return True
        except Exception as e:
            print(f"❌ Failed to load HuggingFace model {model_name}: {e}")
            return False
    
    async def generate(self, prompt: str, model: str, **kwargs) -> str:
        """Generate completion using HuggingFace"""
        if model not in self.pipelines:
            await self.load_model(model)
            
        pipeline = self.pipelines[model]
        result = pipeline(
            prompt,
            max_length=len(prompt.split()) + kwargs.get('max_tokens', 100),
            temperature=kwargs.get('temperature', 0.7),
            do_sample=True,
            pad_token_id=pipeline.tokenizer.eos_token_id
        )
        
        generated_text = result[0]['generated_text']
        # Return only the new text (remove the prompt)
        return generated_text[len(prompt):].strip()
    
    async def health_check(self) -> bool:
        """Check if HuggingFace is available"""
        return True  # Always available if properly configured
```

### 5. AI Provider Router

**Purpose:** Route requests to appropriate AI providers based on configuration

**Implementation:**
```python
# apps/api/src/ai/router.py
from typing import Dict, Any, Optional
from .providers.ollama import OllamaProvider
from .providers.openai import OpenAIProvider
from .providers.huggingface import HuggingFaceProvider
from ..core.config import settings

class AIRouter:
    """Routes AI requests to appropriate providers"""
    
    def __init__(self):
        self.providers = {}
        self.default_provider = None
        self.setup_providers()
    
    def setup_providers(self):
        """Initialize AI providers based on configuration"""
        ai_config = settings.ai
        
        # Setup Ollama (local development)
        if ai_config.get('ollama', {}).get('enabled', False):
            self.providers['ollama'] = OllamaProvider(ai_config['ollama'])
            
        # Setup OpenAI (cloud)
        if ai_config.get('openai', {}).get('enabled', False):
            self.providers['openai'] = OpenAIProvider(ai_config['openai'])
            
        # Setup HuggingFace
        if ai_config.get('huggingface', {}).get('enabled', False):
            self.providers['huggingface'] = HuggingFaceProvider(ai_config['huggingface'])
        
        # Set default provider based on environment
        routing = ai_config.get('routing', {})
        env = settings.environment
        self.default_provider = routing.get(env, 'ollama')
    
    def get_provider(self, provider_name: Optional[str] = None) -> AIProvider:
        """Get AI provider by name or use default"""
        provider_name = provider_name or self.default_provider
        
        if provider_name not in self.providers:
            raise ValueError(f"AI provider '{provider_name}' not configured")
            
        return self.providers[provider_name]
    
    async def health_check_all(self) -> Dict[str, bool]:
        """Check health of all providers"""
        results = {}
        for name, provider in self.providers.items():
            results[name] = await provider.health_check()
        return results

# Global router instance
ai_router = AIRouter()
```

### 6. FastAPI Integration

**Purpose:** Expose AI services through REST API

**Implementation:**
```python
# apps/api/src/routes/ai.py
from fastapi import APIRouter, HTTPException, BackgroundTasks
from fastapi.responses import StreamingResponse
from typing import List, Optional
from ..ai.router import ai_router
from ..ai.providers.base import ChatMessage, GenerationRequest
from ..models.ai import (
    ChatRequest, ChatResponse, GenerateRequest, GenerateResponse,
    ModelInfo, ProviderStatus
)

router = APIRouter(prefix="/ai", tags=["AI"])

@router.post("/chat", response_model=ChatResponse)
async def chat_completion(request: ChatRequest):
    """Generate chat completion"""
    try:
        provider = ai_router.get_provider(request.provider)
        
        response = await provider.chat(
            messages=request.messages,
            model=request.model,
            temperature=request.temperature,
            max_tokens=request.max_tokens
        )
        
        return ChatResponse(
            response=response,
            model=request.model,
            provider=request.provider or ai_router.default_provider
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/chat/stream")
async def chat_completion_stream(request: ChatRequest):
    """Stream chat completion"""
    try:
        provider = ai_router.get_provider(request.provider)
        
        async def generate_stream():
            async for chunk in provider.chat_stream(
                messages=request.messages,
                model=request.model,
                temperature=request.temperature,
                max_tokens=request.max_tokens
            ):
                yield f"data: {json.dumps({'content': chunk})}\n\n"
            yield "data: [DONE]\n\n"
        
        return StreamingResponse(
            generate_stream(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/models", response_model=List[ModelInfo])
async def list_models(provider: Optional[str] = None):
    """List available models for a provider"""
    try:
        if provider:
            ai_provider = ai_router.get_provider(provider)
            # Implementation depends on provider capabilities
            return []
        else:
            # Return models from all providers
            return []
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/health", response_model=Dict[str, ProviderStatus])
async def health_check():
    """Check health of all AI providers"""
    health_results = await ai_router.health_check_all()
    
    return {
        name: ProviderStatus(
            name=name,
            status="healthy" if healthy else "unhealthy",
            models=list(ai_router.providers[name].models.keys()) if healthy else []
        )
        for name, healthy in health_results.items()
    }

@router.post("/models/{model_name}/load")
async def load_model(model_name: str, provider: Optional[str] = None, background_tasks: BackgroundTasks):
    """Load a specific model"""
    try:
        ai_provider = ai_router.get_provider(provider)
        
        # Load model in background to avoid request timeout
        background_tasks.add_task(ai_provider.load_model, model_name)
        
        return {"message": f"Loading model {model_name}..."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

---

## Configuration System

### FARM Configuration for AI

**Local Development with Ollama:**
```javascript
// farm.config.js
module.exports = {
  ai: {
    providers: {
      ollama: {
        enabled: true,
        url: 'http://localhost:11434',
        models: ['llama3.1', 'codestral', 'phi3', 'mistral'],
        defaultModel: 'llama3.1',
        autoStart: true,  // Start Ollama service with farm dev
        autoPull: ['llama3.1']  // Auto-pull these models on first run
      },
      openai: {
        enabled: true,
        apiKey: process.env.OPENAI_API_KEY,
        models: ['gpt-4', 'gpt-3.5-turbo'],
        defaultModel: 'gpt-3.5-turbo'
      },
      huggingface: {
        enabled: true,
        models: ['microsoft/DialoGPT-medium', 'gpt2'],
        device: 'auto'  // auto, cpu, cuda
      }
    },
    routing: {
      development: 'ollama',     // Use local Ollama in dev
      staging: 'openai',         // Use OpenAI in staging
      production: 'openai'       // Use OpenAI in production
    },
    features: {
      streaming: true,           // Enable streaming responses
      caching: true,            // Cache responses
      rateLimiting: true,       // Rate limit requests
      fallback: true            // Fallback to other providers on failure
    }
  }
}
```

### Environment-Specific Configuration

**Development (.env.development):**
```bash
# Local development with Ollama
AI_PROVIDER=ollama
OLLAMA_URL=http://localhost:11434
AI_DEFAULT_MODEL=llama3.1

# Optional cloud providers for testing
OPENAI_API_KEY=sk-...
HUGGINGFACE_TOKEN=hf_...
```

**Production (.env.production):**
```bash
# Production with OpenAI
AI_PROVIDER=openai
OPENAI_API_KEY=sk-...
AI_DEFAULT_MODEL=gpt-3.5-turbo

# Fallback configurations
AI_FALLBACK_PROVIDER=huggingface
AI_RATE_LIMIT=100
```

---

## Development Server Integration

### Ollama Service Management

**Auto-start Ollama with Development Server:**
```javascript
// Addition to tools/dev-server/service_config.js
export const SERVICES = {
  // ... existing services
  
  ollama: {
    name: 'Ollama',
    command: {
      cmd: 'docker',
      args: ['run', '-d', '--name', 'farm-ollama', '-p', '11434:11434', 
             '-v', 'ollama:/root/.ollama', 'ollama/ollama']
    },
    healthCheck: 'http://localhost:11434/api/tags',
    required: false, // Only if AI + Ollama enabled
    order: 1.5, // Start after database, before backend
    autoStart: true,
    postStart: async () => {
      // Auto-pull configured models
      const config = await loadFarmConfig();
      const autoPull = config.ai?.providers?.ollama?.autoPull || [];
      
      for (const model of autoPull) {
        console.log(`📥 Auto-pulling Ollama model: ${model}`);
        // Trigger model pull in background
      }
    }
  }
};
```

### Hot Model Reloading

**Model Hot-Swap Without Service Restart:**
```python
# apps/api/src/ai/hot_reload.py
class AIModelHotReloader:
    def __init__(self, ai_router):
        self.ai_router = ai_router
        
    async def reload_model(self, provider_name: str, model_name: str):
        """Hot reload a specific model"""
        try:
            provider = self.ai_router.get_provider(provider_name)
            
            # Unload existing model if needed
            if model_name in provider.models:
                await self.unload_model(provider, model_name)
            
            # Load new/updated model
            success = await provider.load_model(model_name)
            
            if success:
                print(f"🔥 Hot-reloaded model: {model_name}")
                return True
            else:
                print(f"❌ Failed to hot-reload model: {model_name}")
                return False
                
        except Exception as e:
            print(f"❌ Model hot-reload error: {e}")
            return False
    
    async def unload_model(self, provider, model_name: str):
        """Unload model to free resources"""
        if hasattr(provider, 'unload_model'):
            await provider.unload_model(model_name)
        else:
            # Generic cleanup
            if model_name in provider.models:
                del provider.models[model_name]
```

---

## Frontend Integration

### Generated TypeScript Types

**Auto-generated AI Types:**
```typescript
// apps/web/src/types/ai.ts (generated)
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  messages: ChatMessage[];
  model: string;
  provider?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

export interface ChatResponse {
  response: string;
  model: string;
  provider: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface ModelInfo {
  name: string;
  provider: string;
  size?: string;
  description?: string;
}

export interface ProviderStatus {
  name: string;
  status: 'healthy' | 'unhealthy' | 'loading';
  models: string[];
}
```

### Generated API Client

**Auto-generated AI API Client:**
```typescript
// apps/web/src/services/ai.ts (generated)
import { ApiClient } from '@farm/api-client';
import type * as AI from '../types/ai';

const client = new ApiClient({
  baseURL: process.env.VITE_API_URL || 'http://localhost:8000'
});

export const aiApi = {
  // Chat completion
  chat: (request: AI.ChatRequest): Promise<AI.ChatResponse> =>
    client.post('/api/ai/chat', request),

  // Streaming chat
  chatStream: (request: AI.ChatRequest): EventSource =>
    client.streamPost('/api/ai/chat/stream', request),

  // List models
  listModels: (provider?: string): Promise<AI.ModelInfo[]> =>
    client.get('/api/ai/models', { params: { provider } }),

  // Health check
  healthCheck: (): Promise<Record<string, AI.ProviderStatus>> =>
    client.get('/api/ai/health'),

  // Load model
  loadModel: (modelName: string, provider?: string): Promise<{message: string}> =>
    client.post(`/api/ai/models/${modelName}/load`, { provider })
};
```

### Generated React Hooks

**Auto-generated AI Hooks:**
```typescript
// apps/web/src/hooks/ai.ts (generated)
import { useState, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { aiApi } from '../services/ai';
import type * as AI from '../types/ai';

export function useStreamingChat(initialMessages: AI.ChatMessage[] = []) {
  const [messages, setMessages] = useState<AI.ChatMessage[]>(initialMessages);
  const [isStreaming, setIsStreaming] = useState(false);

  const sendMessage = async (content: string, options: Partial<AI.ChatRequest> = {}) => {
    const userMessage: AI.ChatMessage = { role: 'user', content };
    setMessages(prev => [...prev, userMessage]);
    setIsStreaming(true);

    try {
      const eventSource = aiApi.chatStream({
        messages: [...messages, userMessage],
        model: options.model || 'llama3.1',
        provider: options.provider || 'ollama',
        ...options
      });

      let assistantMessage = '';
      
      eventSource.onmessage = (event) => {
        if (event.data === '[DONE]') {
          setIsStreaming(false);
          eventSource.close();
          return;
        }

        const data = JSON.parse(event.data);
        assistantMessage += data.content;
        
        setMessages(prev => {
          const newMessages = [...prev];
          const lastMessage = newMessages[newMessages.length - 1];
          
          if (lastMessage?.role === 'assistant') {
            lastMessage.content = assistantMessage;
          } else {
            newMessages.push({ role: 'assistant', content: assistantMessage });
          }
          
          return newMessages;
        });
      };

      eventSource.onerror = () => {
        setIsStreaming(false);
        eventSource.close();
      };
      
    } catch (error) {
      setIsStreaming(false);
      console.error('Chat error:', error);
    }
  };

  return {
    messages,
    sendMessage,
    isStreaming,
    clearMessages: () => setMessages([])
  };
}

export function useAIModels(provider?: string) {
  return useQuery({
    queryKey: ['ai-models', provider],
    queryFn: () => aiApi.listModels(provider)
  });
}

export function useAIHealth() {
  return useQuery({
    queryKey: ['ai-health'],
    queryFn: () => aiApi.healthCheck(),
    refetchInterval: 30000 // Check every 30 seconds
  });
}

export function useLoadModel() {
  return useMutation({
    mutationFn: ({ modelName, provider }: { modelName: string; provider?: string }) =>
      aiApi.loadModel(modelName, provider)
  });
}
```

---

## Performance Optimization

### GPU Resource Management

**Intelligent GPU Allocation:**
```python
# apps/api/src/ai/gpu_manager.py
import torch
import psutil
from typing import Dict, Optional

class GPUManager:
    def __init__(self):
        self.gpu_available = torch.cuda.is_available()
        self.gpu_count = torch.cuda.device_count() if self.gpu_available else 0
        self.model_assignments = {}  # model -> gpu mapping
        
    def allocate_gpu(self, model_name: str) -> Optional[int]:
        """Allocate optimal GPU for model"""
        if not self.gpu_available:
            return None
            
        # Find GPU with most free memory
        best_gpu = 0
        max_free_memory = 0
        
        for i in range(self.gpu_count):
            torch.cuda.set_device(i)
            free_memory = torch.cuda.get_device_properties(i).total_memory - torch.cuda.memory_allocated(i)
            
            if free_memory > max_free_memory:
                max_free_memory = free_memory
                best_gpu = i
        
        self.model_assignments[model_name] = best_gpu
        return best_gpu
    
    def get_gpu_stats(self) -> Dict:
        """Get current GPU utilization"""
        if not self.gpu_available:
            return {"available": False}
            
        stats = {"available": True, "devices": []}
        
        for i in range(self.gpu_count):
            torch.cuda.set_device(i)
            props = torch.cuda.get_device_properties(i)
            
            stats["devices"].append({
                "id": i,
                "name": props.name,
                "memory_total": props.total_memory,
                "memory_used": torch.cuda.memory_allocated(i),
                "memory_free": props.total_memory - torch.cuda.memory_allocated(i)
            })
            
        return stats
```

### Response Caching

**Intelligent Response Caching:**
```python
# apps/api/src/ai/cache.py
import hashlib
import json
from typing import Optional, Any
from redis import Redis

class AIResponseCache:
    def __init__(self, redis_url: str = "redis://localhost:6379"):
        self.redis = Redis.from_url(redis_url)
        self.default_ttl = 3600  # 1 hour
        
    def _generate_key(self, prompt: str, model: str, **kwargs) -> str:
        """Generate cache key from request parameters"""
        cache_data = {
            "prompt": prompt,
            "model": model,
            **kwargs
        }
        key_string = json.dumps(cache_data, sort_keys=True)
        return f"ai_cache:{hashlib.md5(key_string.encode()).hexdigest()}"
    
    async def get(self, prompt: str, model: str, **kwargs) -> Optional[str]:
        """Get cached response if available"""
        key = self._generate_key(prompt, model, **kwargs)
        cached = self.redis.get(key)
        
        if cached:
            return cached.decode('utf-8')
        return None
    
    async def set(self, prompt: str, model: str, response: str, ttl: Optional[int] = None, **kwargs):
        """Cache AI response"""
        key = self._generate_key(prompt, model, **kwargs)
        self.redis.setex(key, ttl or self.default_ttl, response)
```

---

## Error Handling & Fallbacks

### Provider Fallback System

**Automatic Provider Switching:**
```python
# apps/api/src/ai/fallback.py
class AIFallbackManager:
    def __init__(self, ai_router):
        self.ai_router = ai_router
        self.fallback_order = ['ollama', 'openai', 'huggingface']
        
    async def execute_with_fallback(self, operation: str, *args, **kwargs):
        """Execute AI operation with automatic fallback"""
        last_error = None
        
        for provider_name in self.fallback_order:
            if provider_name not in self.ai_router.providers:
                continue
                
            try:
                provider = self.ai_router.get_provider(provider_name)
                
                # Check if provider is healthy
                if not await provider.health_check():
                    continue
                    
                # Execute operation
                if operation == 'chat':
                    return await provider.chat(*args, **kwargs)
                elif operation == 'generate':
                    return await provider.generate(*args, **kwargs)
                # ... other operations
                    
            except Exception as e:
                last_error = e
                print(f"⚠️ Provider {provider_name} failed: {e}")
                continue
        
        # All providers failed
        raise Exception(f"All AI providers failed. Last error: {last_error}")
```

---

*Status: ✅ Completed - Ready for implementation*