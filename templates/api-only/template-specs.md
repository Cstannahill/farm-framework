# 6. API Only Template (`--template api-only`)

**Description:** FastAPI backend only, no React frontend - ideal for microservices or mobile app backends.

**Project Structure:**

```plaintext

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
