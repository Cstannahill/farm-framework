# AI Feature (`--features ai`)

**Adds to any template:**

```plaintext
├── apps/
│   ├── web/src/
│   │   ├── components/ai/
│   │   │   ├── AIResponse.tsx
│   │   │   ├── ModelSelector.tsx
│   │   │   └── InferenceStatus.tsx
│   │   └── hooks/
│   │       ├── useAIInference.ts
│   │       └── useStreamingAI.ts
│   └── api/src/
│       ├── routes/
│       │   └── ai.py
│       ├── ai/
│       │   ├── __init__.py
│       │   ├── model_manager.py
│       │   ├── inference.py
│       │   ├── gpu_utils.py
│       │   └── ollama_client.py
│       └── models/
│           ├── .gitkeep
│           └── ollama/
│               └── .gitkeep
```
