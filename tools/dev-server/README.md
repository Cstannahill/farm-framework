# FARM Development Server Foundation

## Overview

The FARM Development Server Foundation provides a unified development experience by orchestrating multiple services, managing their lifecycles, and providing comprehensive logging and health monitoring. This is the core system that powers the `farm dev` command.

## ✅ Completed Implementation

### Core Components

1. **Process Manager** (`process-manager.ts`)

   - Spawns and monitors multiple services (MongoDB, FastAPI, React, Ollama)
   - Handles graceful startup, shutdown, and restart logic
   - Provides automatic error recovery and health monitoring
   - Supports both required and optional services

2. **Health Checker** (`health-checker.ts`)

   - Verifies service availability through HTTP health checks
   - Specialized checks for MongoDB, Ollama, FastAPI, and Vite
   - Provides detailed health status with response times and error messages
   - Supports timeout and retry logic

3. **Logger System** (`logger.ts`)

   - Unified logging across all services with color-coded output
   - Service-specific log aggregation and filtering
   - Progress indicators and status formatting
   - Verbose mode with detailed debugging information

4. **Service Configuration Manager** (`service-configs.ts`)

   - Dynamic service configuration based on FARM project settings
   - Environment-specific service parameters
   - Docker integration for database and Ollama services
   - Automatic model pulling for Ollama

5. **Main Development Server** (`dev-server.ts`)

   - Orchestrates all components into a cohesive system
   - Phased startup (Infrastructure → AI Services → Application)
   - Configuration loading and validation
   - Event-driven architecture with comprehensive error handling

6. **Updated CLI Integration** (`dev.ts`)
   - Enhanced `farm dev` command with full option support
   - Helpful error messages and troubleshooting guidance
   - Service filtering and startup mode selection
   - Graceful shutdown handling

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    FARM Development Server                      │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────┐ │
│  │    Vite     │  │  FastAPI    │  │  MongoDB    │  │ Ollama  │ │
│  │   (3000)    │  │   (8000)    │  │ (Docker)    │  │(11434)  │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────┘ │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────┐ │
│  │   Process   │  │   Health    │  │   Logger    │  │ Config  │ │
│  │  Manager    │  │  Checker    │  │  System     │ │Manager  │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## Features Implemented

### ✅ Process Management

- **Service Orchestration**: Manages multiple services with dependency ordering
- **Health Monitoring**: Continuous health checks with automatic recovery
- **Graceful Shutdown**: Clean termination of all services on exit
- **Auto-Restart**: Automatic restart of failed critical services
- **Log Aggregation**: Unified logging from all services with color coding

### ✅ Service Configuration

- **Dynamic Configuration**: Services configured based on `farm.config.ts`
- **Docker Integration**: Automatic Docker container management for MongoDB and Ollama
- **Environment Variables**: Proper environment setup for each service
- **Port Management**: Configurable ports with conflict detection
- **Feature-Based Services**: Services started based on enabled features

### ✅ Health Checking

- **HTTP Health Checks**: Verifies service availability via HTTP endpoints
- **Service-Specific Checks**: Specialized health checks for each service type
- **Timeout Handling**: Configurable timeouts with graceful fallbacks
- **Detailed Reporting**: Response times and error diagnostics
- **Continuous Monitoring**: Background health monitoring during development

### ✅ Ollama Integration

- **Auto-Start**: Ollama Docker container started automatically when AI features enabled
- **Model Management**: Automatic downloading of configured models
- **GPU Support**: Automatic GPU detection and configuration
- **Health Monitoring**: Specialized Ollama API health checks
- **Graceful Degradation**: Continues without Ollama if not available

### ✅ Error Handling & Recovery

- **Comprehensive Error Messages**: Clear, actionable error reporting
- **Service Recovery**: Automatic restart of failed services
- **Fallback Modes**: Graceful degradation when optional services fail
- **Troubleshooting Guidance**: Helpful suggestions for common issues
- **Verbose Debugging**: Detailed debugging information in verbose mode

## Usage

### Basic Commands

```bash
# Start all services (recommended)
farm dev

# Start with verbose logging
farm dev --verbose

# Frontend development only
farm dev --frontend-only

# Backend + dependencies only
farm dev --backend-only

# Use different port
farm dev --port 3001

# Start specific services
farm dev --services database,backend

# Skip health checks for faster startup
farm dev --skip-health-check
```

### Service Startup Phases

The development server starts services in three phases:

1. **Infrastructure Phase** (Sequential)

   - MongoDB (Docker container)
   - PostgreSQL (if configured)

2. **AI Services Phase** (Sequential, Optional)

   - Ollama (Docker container with model auto-pull)

3. **Application Phase** (Parallel)
   - FastAPI backend
   - React frontend (Vite)

### Configuration

Services are configured through `farm.config.ts`:

```typescript
export default defineConfig({
  development: {
    ports: {
      frontend: 3000,
      backend: 8000,
      database: 27017,
      ollama: 11434,
    },
    hotReload: {
      enabled: true,
      typeGeneration: true,
      aiModels: true,
    },
  },
  ai: {
    providers: {
      ollama: {
        enabled: true,
        autoStart: true,
        autoPull: ["llama3.1", "codestral"],
        gpu: true,
      },
    },
  },
});
```

## Service Types

### 🐳 Docker Services

- **MongoDB**: Primary database with automatic container management
- **Ollama**: Local AI models with GPU support and model auto-pull

### 🐍 Python Services

- **FastAPI**: Backend API with hot reload and automatic dependency injection

### ⚛️ Node.js Services

- **Vite**: Frontend development server with HMR

## Health Check System

Each service has specialized health checks:

- **MongoDB**: TCP connection check on database port
- **Ollama**: HTTP check on `/api/tags` endpoint
- **FastAPI**: HTTP check on `/health` endpoint (fallback to `/docs`)
- **Vite**: HTTP check on configured frontend port

## Event System

The development server emits events for integration:

```typescript
devServer.on("service-starting", (name) => {
  /* ... */
});
devServer.on("service-ready", (name) => {
  /* ... */
});
devServer.on("service-error", (name, error) => {
  /* ... */
});
devServer.on("all-services-ready", () => {
  /* ... */
});
```

## Error Recovery

### Automatic Recovery

- Critical services restart up to 3 times on failure
- Optional services (Ollama) fail gracefully without stopping development
- Health checks retry with exponential backoff

### Manual Recovery

- Services can be restarted individually
- Configuration changes trigger selective service restarts
- Full shutdown and restart available

## Logging System

### Log Levels

- **DEBUG**: Detailed debugging information
- **INFO**: General information and progress
- **WARN**: Warning messages for non-critical issues
- **ERROR**: Error messages with stack traces
- **SUCCESS**: Success confirmations

### Service Logs

- Color-coded output per service
- Timestamp and service name prefixes
- Aggregated logs with filtering capabilities
- Verbose mode with additional debugging

## Next Steps

With the Development Server Foundation complete, the next implementation phase includes:

1. **File Watching System** - Monitor changes and trigger appropriate actions
2. **Type Generation Pipeline** - Auto-generate TypeScript types from Python models
3. **Hot Reload Coordination** - Coordinate hot reload across different systems
4. **Proxy Manager** - Route requests between services during development

## Files Structure

```
tools/dev-server/
├── src/
│   ├── dev-server.ts          # Main development server orchestrator
│   ├── process-manager.ts     # Service process management
│   ├── service-configs.ts     # Service configuration management
│   ├── health-checker.ts      # Health monitoring system
│   ├── logger.ts              # Unified logging system
│   ├── types.ts               # TypeScript type definitions
│   └── index.ts               # Main exports
├── package.json               # Package configuration
├── tsconfig.json              # TypeScript configuration
└── tsup.config.ts             # Build configuration
```

## Integration

The development server integrates with:

- **CLI**: `farm dev` command with full option support
- **Configuration**: Reads and validates `farm.config.ts`
- **Templates**: Works with all template types (basic, ai-chat, api-only, etc.)
- **Docker**: Manages Docker containers for services
- **Environment**: Handles environment-specific configurations
