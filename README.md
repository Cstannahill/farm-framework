# 🌾 FARM Framework

FARM is an AI-first full-stack development platform that combines a React/TypeScript frontend with a Python/FastAPI backend. It ships batteries-included tooling for running local AI models, generating typed clients and hooks, and orchestrating services during development.

## What is FARM?

- **F**astAPI – modern Python web framework with automatic docs
- **A**I/ML – local Ollama or cloud providers (OpenAI, HuggingFace)  
- **R**eact – component-based frontend with modern tooling
- **M**ongoDB – default database (other databases supported)

## 🚀 Quick Start

```bash
# Install the CLI
npm install -g @farm/cli

# Create your first AI app
farm create my-ai-app --template ai-chat

# Start development
cd my-ai-app
farm dev
```

## ✨ Key Features

- **Zero-cost AI development** with local Ollama integration
- **Type-safe code** with automatic client and hook generation  
- **Hot reload** across backend, frontend and AI models
- **Seamless provider switching** between local and cloud
- **Next.js-quality developer experience** for AI applications

## 🏗️ Templates

FARM provides several production-ready templates:

- **[Basic](docs/guides/templates/basic.md)** - Minimal full-stack setup
- **[AI Chat](docs/guides/templates/ai-chat.md)** - Chat application with streaming AI
- **[AI Dashboard](docs/guides/templates/ai-dashboard.md)** - Data visualization dashboard
- **[CMS](docs/guides/templates/cms.md)** - Content management system
- **[E-commerce](docs/guides/templates/ecommerce.md)** - E-commerce with Stripe integration
- **[API Only](docs/guides/templates/api-only.md)** - Backend-only template

## 📚 Documentation

- **[Getting Started](docs/getting-started/README.md)** - Installation and first project
- **[Guides](docs/guides/README.md)** - Comprehensive how-to guides
- **[Reference](docs/reference/README.md)** - Technical reference
- **[Examples](docs/examples/README.md)** - Complete example applications
- **[API Documentation](https://farm-rho-green.vercel.app/docs/getting-started)** - Live documentation site

## 🛠️ Development

```bash
# Start the entire stack
farm dev

# Start only frontend
farm dev --frontend-only

# Start only backend  
farm dev --backend-only

# Build for production
farm build
```

## 📦 Packages

| Package | Description |
|---------|-------------|
| **[@farm/cli](packages/cli/README.md)** | Interactive CLI for scaffolding and managing projects |
| **[@farm/core](packages/core/README.md)** | Framework utilities and configuration helpers |
| **[@farm/type-sync](packages/type-sync/README.md)** | Type synchronization between FastAPI and TypeScript |
| **[@farm/ai](packages/ai/README.md)** | AI orchestration layer with Ollama and cloud support |
| **[@farm/api-client](packages/api-client/README.md)** | Axios wrapper with retry logic and streaming |
| **[@farm/ui-components](packages/ui-components/README.md)** | Reusable React components |
| **[@farm/observability](packages/observability/README.md)** | Telemetry and monitoring |
| **[@farm/deployment](packages/deployment/README.md)** | Deployment automation |

## 🤝 Contributing

We build in the open! Check out our [Contributing Guide](docs/contributing/README.md) for details on how to:

- Report bugs or request features
- Contribute code or documentation  
- Set up your development environment
- Follow our coding standards

## 📄 License

MIT © FARM Framework

---

**Ready to get started?** Check out our [Getting Started Guide](docs/getting-started/README.md) or jump straight to [Creating Your First Project](docs/getting-started/first-project.md).
