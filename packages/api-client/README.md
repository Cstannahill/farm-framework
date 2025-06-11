# @farm/api-client

## Overview

`@farm/api-client` provides a thin wrapper around [Axios](https://axios-http.com/) with helpful utilities for FARM applications. It simplifies HTTP requests, adds smart retry logic, streaming helpers and file upload support while exposing a clean interface for extending request and response interceptors.

This library underpins the generated API clients and React hooks used throughout FARM projects.

## ✅ Completed Implementation

### Core Components

1. **`ApiClient`** (`src/base-client.ts`)
   - Wraps an Axios instance with sane defaults
   - Supports all standard HTTP verbs
   - Handles retry logic and error formatting
   - Provides streaming and file upload helpers
   - Allows runtime configuration updates

2. **`createApiClient`** (`src/base-client.ts`)
   - Factory function returning a pre-configured `ApiClient`
   - Registers default `auth` and `logging` interceptors
   - Enables custom overrides via `ApiClientConfig`

3. **Interceptors**
   - **`authInterceptor`** – attaches a bearer token from local storage
   - **`loggingInterceptor`** – logs requests and responses in development mode

### Additional Utilities

- Type definitions for `ApiResponse`, `ApiError` and `PaginatedResponse`
- Helper types for building request and response interceptors

## Architecture

```
┌─────────────────────────────────────────────┐
│                 ApiClient                   │
├─────────────────────────────────────────────┤
│  Axios Instance                             │
│   ├─ Request Interceptors (auth, custom)    │
│   ├─ Response Interceptors (logging, custom)│
│   ├─ Retry Handler                          │
│   └─ Error Formatter                        │
├─────────────────────────────────────────────┤
│  Utility Methods                            │
│   ├─ get/post/put/patch/delete              │
│   ├─ stream/streamPost                      │
│   └─ uploadFile                             │
└─────────────────────────────────────────────┘
              ▲
              │ createApiClient()
              ▼
      Preconfigured ApiClient instance
```

## Features Implemented

- **HTTP Helpers** – concise methods for all HTTP verbs
- **Request/Response Interceptors** – attach custom logic to every request
- **Retry with Exponential Backoff** – configurable retry conditions
- **Detailed Error Messages** – normalized errors with status-aware messages
- **Streaming Support** – `stream` and `streamPost` for SSE endpoints
- **File Uploads** – multipart helper with progress callbacks
- **Runtime Configuration Updates** – modify base URL, headers and timeout
- **Default Auth & Logging Interceptors** – sensible defaults for FARM apps

## Usage

### Basic Commands

```bash
# Build the library
pnpm run --filter @farm/api-client build

# Watch and rebuild on changes
pnpm run --filter @farm/api-client build:watch

# Type-check the source
pnpm run --filter @farm/api-client type-check
```

### Example

```typescript
import { createApiClient } from "@farm/api-client";

const api = createApiClient({ baseURL: "http://localhost:8000/api" });

const result = await api.get("/users");
console.log(result.data);
```

## Next Steps

Future enhancements include:

1. **Generated Typed Clients** – automatic client generation from OpenAPI schemas
2. **Advanced Caching Layer** – optional caching for GET requests
3. **Batch Request Support** – combine multiple calls into a single request

## Files Structure

```
packages/api-client/
├── src/
│   ├── base-client.ts     # ApiClient implementation and helpers
│   └── index.ts           # Main exports
├── package.json           # Package configuration
├── tsconfig.json          # TypeScript configuration
└── tsup.config.ts         # Build configuration
```

## Integration

`@farm/api-client` is used by:

- Generated API clients in FARM applications
- React hooks within `@farm/ui-components`
- Any custom frontend or Node.js service that communicates with the FARM backend

## File Overview

- **src/base-client.ts** – main `ApiClient` class and helpers
- **src/index.ts** – public exports for consumers
- **package.json** – scripts and dependencies
- **tsup.config.ts** – build pipeline configuration

