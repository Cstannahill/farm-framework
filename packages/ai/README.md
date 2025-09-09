# @farm/ai

The FARM Framework AI package provides comprehensive AI integration with support for local Ollama models and cloud providers.

## 🚀 Quick Start

```bash
npm install @farm/ai
```

```typescript
import { AIOrchestrator } from '@farm/ai';

const ai = new AIOrchestrator({
  providers: {
    ollama: {
      model: 'llama3.2:3b',
      baseUrl: 'http://localhost:11434'
    }
  }
});

const response = await ai.generate('Hello, how are you?');
```

## 📋 Core Features

### Multi-Provider Support
- **Ollama**: Local AI models for zero-cost development
- **OpenAI**: Cloud-based GPT models
- **HuggingFace**: Open-source model access

### Streaming Responses
Real-time streaming of AI responses for better UX.

```typescript
const stream = await ai.generateStream('Tell me a story');
for await (const chunk of stream) {
  console.log(chunk.content);
}
```

### Model Management
- Health checks and monitoring
- Automatic fallbacks
- Model listing and management

### Chat Interface
Built-in chat with conversation management.

```typescript
import { ChatInterface } from '@farm/ai';

const chat = new ChatInterface({
  provider: 'ollama',
  model: 'llama3.2:3b'
});

await chat.start();
const response = await chat.sendMessage('Hello!');
```

## 🏗️ Architecture

```
@farm/ai
├── AIOrchestrator         # Main coordination
├── ProviderManager        # Provider management
├── OllamaProvider         # Local Ollama integration
├── OpenAIProvider         # OpenAI API integration
├── HuggingFaceProvider    # HuggingFace integration
├── StreamManager          # Streaming support
├── ChatInterface          # Chat interface
└── HealthChecker          # Health monitoring
```

## 📚 API Reference

### AIOrchestrator

Main orchestrator for AI operations.

```typescript
const ai = new AIOrchestrator({
  providers: {
    ollama: { model: 'llama3.2:3b' },
    openai: { apiKey: process.env.OPENAI_API_KEY }
  },
  defaultProvider: 'ollama'
});

// Generate response
const response = await ai.generate('Hello!');

// Stream response
const stream = await ai.generateStream('Hello!');
```

### Providers

#### OllamaProvider
```typescript
const provider = new OllamaProvider({
  model: 'llama3.2:3b',
  baseUrl: 'http://localhost:11434'
});

const response = await provider.generate('Hello!');
const models = await provider.listModels();
```

#### OpenAIProvider
```typescript
const provider = new OpenAIProvider({
  apiKey: process.env.OPENAI_API_KEY,
  model: 'gpt-4'
});

const response = await provider.generate('Hello!');
```

### Chat Interface
```typescript
const chat = new ChatInterface({
  provider: 'ollama',
  model: 'llama3.2:3b',
  systemPrompt: 'You are a helpful assistant.'
});

await chat.start();
const response = await chat.sendMessage('Hello!');
const history = chat.getHistory();
```

## 🔧 Configuration

```typescript
const ai = new AIOrchestrator({
  providers: {
    ollama: {
      model: 'llama3.2:3b',
      baseUrl: 'http://localhost:11434',
      timeout: 30000
    },
    openai: {
      apiKey: process.env.OPENAI_API_KEY,
      model: 'gpt-4'
    }
  },
  defaultProvider: 'ollama',
  timeout: 30000,
  retries: 3,
  fallback: true
});
```

## 🐛 Troubleshooting

### Ollama Issues
```typescript
// Check Ollama status
const health = await provider.checkHealth();
if (!health.available) {
  console.error('Ollama not available');
}
```

### Model Issues
```typescript
// List available models
const models = await provider.listModels();

// Pull missing model
if (!models.includes('llama3.2:3b')) {
  await provider.pullModel('llama3.2:3b');
}
```

## 📄 License

MIT © FARM Framework