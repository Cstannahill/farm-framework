# ztest-app

A FARM Stack application using basic template

Generated with [FARM Stack Framework](https://github.com/farm-stack/framework) - AI-First Full-Stack Development Platform.

## 🏗️ Architecture

- **F**astAPI - Modern Python web framework with automatic API documentation
- **A**I/ML - Ready for AI/ML integration
- **R**eact - Component-based frontend with TypeScript and Vite
- **M**ongoDB - Document database with ODM integration

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and pnpm
- Python 3.11+
- 
- 


### Development Setup

1. **Install dependencies:**
   ```bash
   pnpm install
   ```

2. **Set up environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start development server:**
   ```bash
   pnpm dev
   ```

   This will start:
   - 🌐 Frontend: http://localhost:3000
   - ⚡ Backend: http://localhost:8000
   - 📚 API Docs: http://localhost:8000/docs
   

## 📁 Project Structure

```
ztest-app/
├── apps/
│   ├── web/                    # React frontend
│   │   ├── src/
│   │   │   ├── components/     # Reusable components
│   │   │   ├── pages/          # Page components
│   │   │   ├── hooks/          # Custom hooks
│   │   │   ├── stores/         # State management
│   │   │   ├── services/       # API client (auto-generated)
│   │   │   └── types/          # TypeScript types (auto-generated)
│   │   └── package.json
│   └── api/                    # FastAPI backend
│       ├── src/
│       │   ├── routes/         # API endpoints
│       │   ├── models/         # Pydantic models

│       │   ├── database/       # Database connection
│       │   └── core/           # Core utilities
│       └── requirements.txt

├── farm.config.ts             # Framework configuration
└── README.md                  # This file
```

## 🔧 Features




## 🛠️ Development

### Available Commands

```bash
# Development
pnpm dev                 # Start development server
pnpm dev:frontend        # Frontend only
pnpm dev:backend         # Backend only

# Building
pnpm build               # Build for production
pnpm preview             # Preview production build

# Testing
pnpm test                # Run tests
pnpm test:ui             # Run tests with UI
pnpm test:coverage       # Run tests with coverage

# Code Quality
pnpm lint                # Lint code
pnpm lint:fix            # Fix linting issues
pnpm type-check          # TypeScript type checking

```

### Type-Safe Development

The framework automatically generates TypeScript types from your Python models:

1. **Define a model in Python:**
   ```python
   # apps/api/src/models/user.py
   from farm.database import Document

   class User(Document):
       name: str
       email: str
       age: int
   ```

2. **Use generated types in React:**
   ```typescript
   // apps/web/src/components/UserProfile.tsx
   import { User } from '../types'; // Auto-generated

   interface Props {
     user: User; // Fully typed!
   }
   ```

3. **Call type-safe APIs:**
   ```typescript
   import { userApi } from '../services'; // Auto-generated

   const users = await userApi.list(); // Fully typed response
   ```


## 🚢 Deployment

### Production Build
```bash
pnpm build
```

### Docker Deployment
Docker configuration not included in this template.

### Platform Deployment
```bash
# Vercel (recommended for frontend)
pnpm deploy:vercel

# AWS
pnpm deploy:aws

# Railway
pnpm deploy:railway
```

## 📖 Documentation

- [FARM Framework Docs](https://farm-stack.dev/docs)
- [API Documentation](http://localhost:8000/docs) (when running)

- [Deployment Guide](https://farm-stack.dev/docs/deployment)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙋 Support

- [Discord Community](https://discord.gg/farm-stack)
- [GitHub Issues](https://github.com/farm-stack/framework/issues)
- [Documentation](https://farm-stack.dev)

---

**Built with ❤️ using [FARM Stack Framework](https://farm-stack.dev)**