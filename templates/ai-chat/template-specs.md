### 2. AI Chat Template (`--template ai-chat`)

**Description:** Chat application with streaming AI responses and conversation management.

**Additional Structure:**

```plaintext

├── apps/
│   ├── web/
│   │   └── src/
│   │       ├── components/
│   │       │   ├── chat/
│   │       │   │   ├── ChatWindow.tsx
│   │       │   │   ├── MessageList.tsx
│   │       │   │   ├── MessageInput.tsx
│   │       │   │   └── TypingIndicator.tsx
│   │       │   └── ai/
│   │       │       ├── ModelSelector.tsx
│   │       │       └── AISettings.tsx
│   │       ├── hooks/
│   │       │   ├── useStreamingChat.ts
│   │       │   ├── useWebSocket.ts
│   │       │   └── useAIModels.ts
│   │       └── stores/
│   │           ├── chatStore.ts
│   │           └── aiStore.ts
│   └── api/
│       ├── src/
│       │   ├── routes/
│       │   │   ├── chat.py        # Chat endpoints
│       │   │   ├── ai.py          # AI model endpoints
│       │   │   └── websocket.py   # WebSocket handlers
│       │   ├── models/
│       │   │   ├── conversation.py
│       │   │   ├── message.py
│       │   │   └── ai_model.py
│       │   ├── ai/
│       │   │   ├── __init__.py
│       │   │   ├── model_manager.py
│       │   │   ├── inference.py
│       │   │   ├── streaming.py
│       │   │   └── ollama_client.py
│       │   └── websocket/
│       │       ├── __init__.py
│       │       ├── manager.py
│       │       └── handlers.py
│       ├── models/               # AI model storage (Ollama models cached here)
│       │   ├── .gitkeep
│       │   └── ollama/           # Ollama model cache directory
│       │       └── .gitkeep
│       └── docker/               # Docker configurations
│           ├── ollama.dockerfile
│           └── docker-compose.ai.yml
```

**Additional Dependencies:**

- **Frontend:** WebSocket client, markdown rendering
- **Backend:** WebSocket support, Ollama client, AI libraries (transformers, torch), streaming utilities

---
