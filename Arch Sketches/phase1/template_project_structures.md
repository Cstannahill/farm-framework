# Template Project Structures

## Base Project Structure

All templates share this foundational structure, with template-specific additions:

```
my-farm-app/
├── apps/
│   ├── web/                      # React frontend (omitted in api-only)
│   └── api/                      # FastAPI backend
├── packages/                     # Shared packages (when applicable)
├── tools/                        # Build tools and scripts
├── docs/                         # Auto-generated documentation
├── farm.config.ts                # Framework configuration
├── docker-compose.yml            # Local development environment
├── package.json                  # Workspace root
├── .gitignore                    # Git ignore patterns
└── README.md                     # Project documentation
```

---

## Template Specifications

### 1. Basic Template (`--template basic`)

**Description:** Simple React + FastAPI + MongoDB setup for general web applications.

**Project Structure:**
```
my-farm-app/
├── apps/
│   ├── web/
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── ui/           # Basic UI components
│   │   │   │   └── layout/       # Layout components
│   │   │   ├── pages/
│   │   │   │   ├── Home.tsx
│   │   │   │   └── About.tsx
│   │   │   ├── hooks/            # Custom React hooks
│   │   │   ├── stores/           # Zustand stores
│   │   │   ├── services/         # API client (auto-generated)
│   │   │   ├── types/            # TypeScript types (auto-generated)
│   │   │   ├── utils/            # Utility functions
│   │   │   ├── App.tsx
│   │   │   └── main.tsx
│   │   ├── public/
│   │   │   ├── favicon.ico
│   │   │   └── index.html
│   │   ├── package.json
│   │   ├── vite.config.ts
│   │   ├── tailwind.config.js
│   │   └── tsconfig.json
│   └── api/
│       ├── src/
│       │   ├── routes/
│       │   │   ├── __init__.py
│       │   │   ├── health.py     # Health check endpoints
│       │   │   └── users.py      # Basic user endpoints
│       │   ├── models/
│       │   │   ├── __init__.py
│       │   │   ├── base.py       # Base model classes
│       │   │   └── user.py       # User model
│       │   ├── database/
│       │   │   ├── __init__.py
│       │   │   └── connection.py # Database connection
│       │   ├── core/
│       │   │   ├── __init__.py
│       │   │   ├── config.py     # Configuration
│       │   │   └── security.py   # Security utilities
│       │   └── main.py           # FastAPI app entry point
│       ├── tests/
│       │   ├── __init__.py
│       │   └── test_health.py
│       ├── requirements.txt
│       └── pyproject.toml
└── farm.config.ts
```

**Key Dependencies:**
- **Frontend:** React, TypeScript, Vite, Tailwind CSS, Zustand, TanStack Query
- **Backend:** FastAPI, Pydantic, Motor (MongoDB), Uvicorn, Pytest

---

### 2. AI Chat Template (`--template ai-chat`)

**Description:** Chat application with streaming AI responses and conversation management.

**Additional Structure:**
```
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

### 3. AI Dashboard Template (`--template ai-dashboard`)

**Description:** Data dashboard with ML insights, charts, and analytics.

**Additional Structure:**
```
├── apps/
│   ├── web/
│   │   └── src/
│   │       ├── components/
│   │       │   ├── dashboard/
│   │       │   │   ├── DashboardGrid.tsx
│   │       │   │   ├── MetricCard.tsx
│   │       │   │   └── InsightPanel.tsx
│   │       │   ├── charts/
│   │       │   │   ├── LineChart.tsx
│   │       │   │   ├── BarChart.tsx
│   │       │   │   ├── PieChart.tsx
│   │       │   │   └── HeatMap.tsx
│   │       │   └── ml/
│   │       │       ├── ModelMetrics.tsx
│   │       │       ├── PredictionViewer.tsx
│   │       │       └── DataExplorer.tsx
│   │       └── hooks/
│   │           ├── useAnalytics.ts
│   │           ├── useChartData.ts
│   │           └── useMLModels.ts
│   └── api/
│       ├── src/
│       │   ├── routes/
│       │   │   ├── analytics.py
│       │   │   ├── ml_models.py
│       │   │   └── data.py
│       │   ├── models/
│       │   │   ├── dataset.py
│       │   │   ├── metric.py
│       │   │   └── prediction.py
│       │   ├── ml/
│       │   │   ├── analytics.py
│       │   │   ├── preprocessing.py
│       │   │   ├── visualization.py
│       │   │   └── ollama_integration.py
│       │   └── data/
│       │       ├── __init__.py
│       │       ├── loaders.py
│       │       └── processors.py
│       ├── datasets/             # Sample datasets
│       │   └── .gitkeep
│       └── models/               # AI model storage (Ollama models)
│           ├── .gitkeep
│           └── ollama/
│               └── .gitkeep
```

**Additional Dependencies:**
- **Frontend:** Recharts, D3.js, data visualization libraries
- **Backend:** Pandas, NumPy, Scikit-learn, Plotly, Ollama client

---

### 4. E-commerce Template (`--template ecommerce`)

**Description:** E-commerce platform with products, cart, and payment processing.

**Additional Structure:**
```
├── apps/
│   ├── web/
│   │   └── src/
│   │       ├── components/
│   │       │   ├── products/
│   │       │   │   ├── ProductGrid.tsx
│   │       │   │   ├── ProductCard.tsx
│   │       │   │   └── ProductDetail.tsx
│   │       │   ├── cart/
│   │       │   │   ├── CartSidebar.tsx
│   │       │   │   ├── CartItem.tsx
│   │       │   │   └── CartSummary.tsx
│   │       │   ├── checkout/
│   │       │   │   ├── CheckoutForm.tsx
│   │       │   │   ├── PaymentForm.tsx
│   │       │   │   └── OrderSummary.tsx
│   │       │   └── admin/
│   │       │       ├── ProductManager.tsx
│   │       │       └── OrderManager.tsx
│   │       └── stores/
│   │           ├── productStore.ts
│   │           ├── cartStore.ts
│   │           └── orderStore.ts
│   └── api/
│       ├── src/
│       │   ├── routes/
│       │   │   ├── products.py
│       │   │   ├── cart.py
│       │   │   ├── orders.py
│       │   │   ├── payments.py
│       │   │   └── admin.py
│       │   ├── models/
│       │   │   ├── product.py
│       │   │   ├── cart.py
│       │   │   ├── order.py
│       │   │   └── payment.py
│       │   ├── payments/
│       │   │   ├── __init__.py
│       │   │   ├── stripe_client.py
│       │   │   └── paypal_client.py
│       │   └── inventory/
│       │       ├── __init__.py
│       │       └── management.py
│       └── uploads/              # Product images
│           └── .gitkeep
```

**Additional Dependencies:**
- **Frontend:** Payment UI components, image galleries
- **Backend:** Stripe SDK, PayPal SDK, image processing libraries

---

### 5. CMS Template (`--template cms`)

**Description:** Content management system with rich text editing and media management.

**Additional Structure:**
```
├── apps/
│   ├── web/
│   │   └── src/
│   │       ├── components/
│   │       │   ├── editor/
│   │       │   │   ├── RichTextEditor.tsx
│   │       │   │   ├── MediaUploader.tsx
│   │       │   │   └── ContentPreview.tsx
│   │       │   ├── content/
│   │       │   │   ├── ContentList.tsx
│   │       │   │   ├── ContentCard.tsx
│   │       │   │   └── ContentForm.tsx
│   │       │   └── admin/
│   │       │       ├── AdminDashboard.tsx
│   │       │       ├── UserManager.tsx
│   │       │       └── RoleManager.tsx
│   │       └── stores/
│   │           ├── contentStore.ts
│   │           ├── mediaStore.ts
│   │           └── adminStore.ts
│   └── api/
│       ├── src/
│       │   ├── routes/
│       │   │   ├── content.py
│       │   │   ├── media.py
│       │   │   ├── admin.py
│       │   │   └── pages.py
│       │   ├── models/
│       │   │   ├── content.py
│       │   │   ├── page.py
│       │   │   ├── media.py
│       │   │   └── category.py
│       │   ├── storage/
│       │   │   ├── __init__.py
│       │   │   ├── local.py
│       │   │   └── cloud.py
│       │   └── cms/
│       │       ├── __init__.py
│       │       ├── publishing.py
│       │       └── workflow.py
│       └── uploads/
│           ├── images/
│           ├── documents/
│           └── .gitkeep
```

**Additional Dependencies:**
- **Frontend:** Rich text editor (TipTap/Slate), file upload components
- **Backend:** File handling libraries, image processing, cloud storage SDKs

---

### 6. API Only Template (`--template api-only`)

**Description:** FastAPI backend only, no React frontend - ideal for microservices or mobile app backends.

**Project Structure:**
```
my-farm-api/
├── src/
│   ├── routes/
│   │   ├── __init__.py
│   │   ├── health.py
│   │   ├── users.py
│   │   └── api.py              # API router aggregation
│   ├── models/
│   │   ├── __init__.py
│   │   ├── base.py
│   │   └── user.py
│   ├── database/
│   │   ├── __init__.py
│   │   └── connection.py
│   ├── core/
│   │   ├── __init__.py
│   │   ├── config.py
│   │   ├── security.py
│   │   └── middleware.py
│   ├── schemas/                # Pydantic response schemas
│   │   ├── __init__.py
│   │   └── user.py
│   └── main.py
├── tests/
│   ├── __init__.py
│   ├── conftest.py
│   └── test_api.py
├── docs/                       # OpenAPI documentation
├── scripts/                    # Utility scripts
├── requirements.txt
├── pyproject.toml
├── Dockerfile
├── docker-compose.yml
├── .env.example
└── README.md
```

**Focus Areas:**
- Enhanced API documentation and testing
- Microservice-ready architecture
- Advanced authentication and authorization
- OpenAPI specification generation

---

## Feature Integration Modifications

### Authentication Feature (`--features auth`)

**Adds to any template:**
```
├── apps/
│   ├── web/src/
│   │   ├── components/auth/
│   │   │   ├── LoginForm.tsx
│   │   │   ├── RegisterForm.tsx
│   │   │   ├── ProtectedRoute.tsx
│   │   │   └── UserProfile.tsx
│   │   ├── hooks/
│   │   │   ├── useAuth.ts
│   │   │   └── useUser.ts
│   │   └── stores/
│   │       └── authStore.ts
│   └── api/src/
│       ├── routes/
│       │   ├── auth.py
│       │   └── users.py
│       ├── models/
│       │   ├── user.py
│       │   └── token.py
│       └── auth/
│           ├── __init__.py
│           ├── jwt.py
│           ├── oauth.py
│           └── middleware.py
```

### AI Feature (`--features ai`)

**Adds to any template:**
```
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

### Real-time Feature (`--features realtime`)

**Adds to any template:**
```
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

---

## Configuration Variations

### Database Configuration

**MongoDB (Default):**
```typescript
// farm.config.ts
export default defineConfig({
  database: {
    type: 'mongodb',
    url: process.env.MONGODB_URL || 'mongodb://localhost:27017/farmapp'
  }
});
```

**PostgreSQL:**
```typescript
export default defineConfig({
  database: {
    type: 'postgresql',
    url: process.env.DATABASE_URL || 'postgresql://user:pass@localhost/farmapp'
  }
});
```

### Template-Specific Config

Each template includes specific configuration in `farm.config.ts`:

```typescript
// AI Chat template example
import { defineConfig } from '@farm/core';

export default defineConfig({
  template: 'ai-chat',
  features: ['auth', 'ai', 'realtime'],
  ai: {
    providers: {
      ollama: {
        enabled: true,
        url: 'http://localhost:11434',
        models: ['llama3.1', 'codestral'],
        defaultModel: 'llama3.1',
        autoStart: true,
        autoPull: ['llama3.1']
      },
      openai: {
        enabled: true,
        apiKey: process.env.OPENAI_API_KEY,
        models: ['gpt-4', 'gpt-3.5-turbo'],
        defaultModel: 'gpt-3.5-turbo'
      }
    },
    routing: {
      development: 'ollama',
      production: 'openai'
    },
    features: {
      streaming: true,
      caching: true
    }
  },
  websocket: {
    enabled: true,
    cors: ['http://localhost:3000']
  }
});
```

---

*Status: ✅ Completed - Ready for implementation*