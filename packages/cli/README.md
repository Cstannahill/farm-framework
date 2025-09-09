# @farm/cli

The FARM Framework CLI is the primary interface for creating, managing, and developing FARM applications. It provides commands for project scaffolding, development server management, and build processes.

## 🚀 Quick Start

```bash
# Install globally
npm install -g @farm/cli

# Create a new project
farm create my-app --template ai-chat

# Start development
cd my-app
farm dev
```

## 📋 Commands

### `farm create`

Creates a new FARM project from a template.

```bash
farm create <project-name> [options]
```

**Options:**
- `--template <template>` - Template to use (basic, ai-chat, ai-dashboard, cms, ecommerce, api-only)
- `--database <database>` - Database type (mongodb, postgresql, mysql, sqlite)
- `--features <features>` - Comma-separated list of features to include
- `--output <path>` - Output directory (default: current directory)
- `--no-git` - Skip Git initialization
- `--no-install` - Skip dependency installation

**Examples:**
```bash
# Create basic project
farm create my-app --template basic

# Create AI chat app with PostgreSQL
farm create chat-app --template ai-chat --database postgresql

# Create project with specific features
farm create my-app --template basic --features auth,ai
```

### `farm dev`

Starts the development server with hot reload.

```bash
farm dev [options]
```

**Options:**
- `--frontend-only` - Start only the frontend
- `--backend-only` - Start only the backend and dependencies
- `--verbose` - Enable detailed logging
- `--port <port>` - Custom port for frontend (default: 3000)
- `--api-port <port>` - Custom port for backend (default: 8000)

**Examples:**
```bash
# Start full development environment
farm dev

# Start only frontend
farm dev --frontend-only

# Start with custom ports
farm dev --port 3001 --api-port 8001
```

### `farm build`

Builds the project for production.

```bash
farm build [options]
```

**Options:**
- `--frontend-only` - Build only the frontend
- `--backend-only` - Build only the backend
- `--output <path>` - Output directory
- `--minify` - Minify output (default: true in production)

### `farm start`

Starts the production server.

```bash
farm start [options]
```

**Options:**
- `--port <port>` - Port for the server
- `--host <host>` - Host to bind to

### `farm types`

Manages type synchronization between frontend and backend.

```bash
farm types sync [options]
```

**Options:**
- `--watch` - Watch for changes and auto-sync
- `--force` - Force regeneration of types
- `--output <path>` - Output directory for generated types

### `farm generate`

Generates code from templates or schemas.

```bash
farm generate <generator> [options]
```

**Available generators:**
- `api-client` - Generate API client from OpenAPI schema
- `types` - Generate TypeScript types
- `hooks` - Generate React Query hooks

## 🏗️ Templates

The CLI supports several built-in templates:

### Basic Template
Minimal full-stack setup with React frontend and FastAPI backend.

```bash
farm create my-app --template basic
```

**Features:**
- React 19 with TypeScript
- FastAPI backend
- Tailwind CSS styling
- Hot reload development
- Type synchronization

### AI Chat Template
Chat application with streaming AI responses.

```bash
farm create my-app --template ai-chat
```

**Features:**
- Real-time chat interface
- Streaming AI responses
- Markdown rendering
- Syntax highlighting
- WebSocket support

### AI Dashboard Template
Data visualization dashboard with AI integration.

```bash
farm create my-app --template ai-dashboard
```

**Features:**
- Interactive charts and graphs
- Real-time data updates
- AI-powered insights
- Responsive design
- Data export capabilities

### CMS Template
Content management system with rich text editing.

```bash
farm create my-app --template cms
```

**Features:**
- Rich text editor (TipTap)
- Content management
- Media handling
- User management
- SEO optimization

### E-commerce Template
E-commerce application with payment processing.

```bash
farm create my-app --template ecommerce
```

**Features:**
- Product catalog
- Shopping cart
- Stripe payment integration
- Order management
- User accounts

### API Only Template
Backend-only template for APIs and microservices.

```bash
farm create my-app --template api-only
```

**Features:**
- FastAPI backend
- Database integration
- Authentication
- API documentation
- Testing setup

## ⚙️ Configuration

The CLI uses `farm.config.ts` for project configuration:

```typescript
import { defineConfig } from '@farm/core';

export default defineConfig({
  // Project settings
  projectName: 'my-app',
  version: '1.0.0',
  
  // Development settings
  dev: {
    frontend: {
      port: 3000,
      host: 'localhost'
    },
    backend: {
      port: 8000,
      host: 'localhost'
    }
  },
  
  // AI configuration
  ai: {
    providers: {
      ollama: {
        model: 'llama3.2:3b',
        baseUrl: 'http://localhost:11434'
      }
    }
  },
  
  // Database configuration
  database: {
    type: 'mongodb',
    url: 'mongodb://localhost:27017/my-app'
  }
});
```

## 🔧 Development

### Local Development

To work on the CLI itself:

```bash
# Clone the repository
git clone https://github.com/farm-stack/framework.git
cd framework

# Install dependencies
pnpm install

# Build the CLI
cd packages/cli
pnpm build

# Link globally for testing
npm link
```

### Testing

```bash
# Run tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run specific test file
pnpm test create.test.ts
```

### Building

```bash
# Build the CLI
pnpm build

# Build in watch mode
pnpm build:watch
```

## 📁 Project Structure

```
packages/cli/
├── src/
│   ├── commands/           # CLI commands
│   │   ├── create.ts       # Project creation
│   │   ├── dev.ts          # Development server
│   │   ├── build.ts        # Build process
│   │   └── types/          # Type management
│   ├── template/           # Template system
│   │   ├── processor.ts    # Template processing
│   │   ├── inheritance.ts  # Template inheritance
│   │   └── validator.ts    # Template validation
│   ├── generators/         # Code generators
│   ├── scaffolding/        # Project scaffolding
│   └── utils/              # Utility functions
├── templates/              # Project templates
│   ├── base/               # Base template
│   ├── basic/              # Basic template
│   ├── ai-chat/            # AI chat template
│   └── ...                 # Other templates
└── bin/                    # Executable scripts
```

## 🐛 Troubleshooting

### Common Issues

#### Template Generation Fails
```bash
# Check template validation
node scripts/validate-templates.js

# Clear template cache
rm -rf .farm/cache
```

#### Development Server Won't Start
```bash
# Check if ports are in use
lsof -ti:3000 | xargs kill -9
lsof -ti:8000 | xargs kill -9

# Restart with verbose logging
farm dev --verbose
```

#### Type Synchronization Issues
```bash
# Force type regeneration
farm types sync --force

# Check OpenAPI schema
curl http://localhost:8000/openapi.json
```

### Getting Help

- **GitHub Issues**: [Report bugs](https://github.com/farm-stack/framework/issues)
- **Documentation**: [CLI Reference](../docs/reference/cli/)
- **Discussions**: [Community help](https://github.com/farm-stack/framework/discussions)

## 📚 API Reference

### CLI Class

The main CLI class that handles command execution.

```typescript
import { CLI } from '@farm/cli';

const cli = new CLI();
await cli.run(['create', 'my-app', '--template', 'basic']);
```

### Template Processor

Handles template generation and inheritance.

```typescript
import { TemplateProcessor } from '@farm/cli';

const processor = new TemplateProcessor();
await processor.processTemplate('basic', context, outputDir);
```

### Project Scaffolder

Manages project scaffolding and file generation.

```typescript
import { ProjectScaffolder } from '@farm/cli';

const scaffolder = new ProjectScaffolder();
await scaffolder.scaffoldProject(template, options);
```

## 🔄 Changelog

### v1.5.0
- Added template inheritance system
- Improved error handling and validation
- Enhanced development server with better logging
- Added support for custom templates

### v1.4.0
- Added AI dashboard template
- Improved type synchronization
- Enhanced CLI help and documentation
- Added template validation system

### v1.3.0
- Added CMS and e-commerce templates
- Improved development server performance
- Enhanced template processing
- Added support for custom features

## 📄 License

MIT © FARM Framework