# Real-time Feature (`--features realtime`)

**Adds to any template:**

```plaintext
├── apps/
│   ├── web/src/
│   │   ├── hooks/
│   │   │   ├── useWebSocket.ts
│   │   │   └── useRealtime.ts
│   │   └── components/realtime/
│   │       ├── LiveUpdates.tsx
│   │       └── ConnectionStatus.tsx
│   └── api/src/
│       ├── routes/
│       │   └── websocket.py
│       └── websocket/
│           ├── __init__.py
│           ├── manager.py
│           └── handlers.py
```
