# Base Project Structure

All templates share this foundational structure, with template-specific additions:

```plaintext

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
