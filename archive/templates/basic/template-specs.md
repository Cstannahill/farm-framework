# 1. Basic Template (`--template basic`)

**Description:** Simple React + FastAPI + MongoDB setup for general web applications.

**Project Structure:**

```plaintext

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
