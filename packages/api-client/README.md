# @farm/api-client

The FARM Framework API client package provides a thin wrapper around Axios with retry logic, streaming helpers, and file upload support. It underpins the generated clients and React hooks used in FARM applications.

## 🚀 Quick Start

```bash
npm install @farm/api-client
```

```typescript
import { ApiClient } from '@farm/api-client';

const client = new ApiClient({
  baseURL: 'http://localhost:8000',
  timeout: 10000
});

const response = await client.get('/users');
```

## 📋 Core Features

### HTTP Client
- Axios-based HTTP client with enhanced features
- Automatic retry logic with exponential backoff
- Request/response interceptors
- Timeout handling and error management

### Streaming Support
- Server-sent events (SSE) support
- WebSocket integration
- Real-time data streaming
- Chunk processing and aggregation

### File Upload
- Multipart file upload support
- Progress tracking
- File validation and type checking
- Batch upload capabilities

### Error Handling
- Comprehensive error handling
- Retry logic for transient failures
- Error transformation and logging
- Fallback mechanisms

## 🏗️ Architecture

```
@farm/api-client
├── ApiClient              # Main HTTP client
├── StreamClient           # Streaming client
├── FileUploadClient       # File upload client
├── RetryHandler           # Retry logic
├── ErrorHandler           # Error handling
├── Interceptors           # Request/response interceptors
└── Utilities              # Helper utilities
```

## 📚 API Reference

### ApiClient

Main HTTP client with enhanced features.

```typescript
import { ApiClient } from '@farm/api-client';

const client = new ApiClient({
  baseURL: 'http://localhost:8000',
  timeout: 10000,
  retries: 3,
  retryDelay: 1000
});

// GET request
const users = await client.get('/users');

// POST request
const user = await client.post('/users', {
  name: 'John Doe',
  email: 'john@example.com'
});

// PUT request
const updated = await client.put('/users/1', {
  name: 'Jane Doe'
});

// DELETE request
await client.delete('/users/1');
```

### StreamClient

Client for streaming data and real-time updates.

```typescript
import { StreamClient } from '@farm/api-client';

const streamClient = new StreamClient({
  baseURL: 'http://localhost:8000',
  timeout: 30000
});

// Server-sent events
const eventSource = streamClient.createEventSource('/stream');
eventSource.onmessage = (event) => {
  console.log('Received:', event.data);
};

// WebSocket connection
const ws = streamClient.createWebSocket('/ws');
ws.onmessage = (event) => {
  console.log('WebSocket message:', event.data);
};
```

### FileUploadClient

Client for file uploads with progress tracking.

```typescript
import { FileUploadClient } from '@farm/api-client';

const uploadClient = new FileUploadClient({
  baseURL: 'http://localhost:8000',
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedTypes: ['image/jpeg', 'image/png', 'application/pdf']
});

// Single file upload
const result = await uploadClient.upload('/upload', file, {
  onProgress: (progress) => {
    console.log(`Upload progress: ${progress.percentage}%`);
  }
});

// Multiple file upload
const results = await uploadClient.uploadMultiple('/upload', files, {
  onProgress: (progress) => {
    console.log(`Upload progress: ${progress.percentage}%`);
  }
});
```

### RetryHandler

Handles retry logic for failed requests.

```typescript
import { RetryHandler } from '@farm/api-client';

const retryHandler = new RetryHandler({
  maxRetries: 3,
  retryDelay: 1000,
  backoffFactor: 2,
  retryCondition: (error) => {
    return error.response?.status >= 500;
  }
});

const client = new ApiClient({
  retryHandler
});
```

### ErrorHandler

Comprehensive error handling and transformation.

```typescript
import { ErrorHandler } from '@farm/api-client';

const errorHandler = new ErrorHandler({
  transform: (error) => {
    if (error.response?.status === 404) {
      return new Error('Resource not found');
    }
    return error;
  },
  log: true
});

const client = new ApiClient({
  errorHandler
});
```

## 🔧 Configuration

### Basic Configuration

```typescript
const client = new ApiClient({
  baseURL: 'http://localhost:8000',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer token'
  }
});
```

### Advanced Configuration

```typescript
const client = new ApiClient({
  baseURL: 'http://localhost:8000',
  timeout: 10000,
  retries: 3,
  retryDelay: 1000,
  retryCondition: (error) => error.response?.status >= 500,
  interceptors: {
    request: (config) => {
      config.headers.Authorization = `Bearer ${getToken()}`;
      return config;
    },
    response: (response) => {
      return response;
    },
    error: (error) => {
      if (error.response?.status === 401) {
        // Handle unauthorized
        redirectToLogin();
      }
      return Promise.reject(error);
    }
  }
});
```

## 🎯 Advanced Usage

### Custom Interceptors

```typescript
const client = new ApiClient({
  baseURL: 'http://localhost:8000',
  interceptors: {
    request: [
      (config) => {
        // Add timestamp
        config.metadata = { timestamp: Date.now() };
        return config;
      },
      (config) => {
        // Add request ID
        config.headers['X-Request-ID'] = generateId();
        return config;
      }
    ],
    response: [
      (response) => {
        // Log response time
        const duration = Date.now() - response.config.metadata.timestamp;
        console.log(`Request took ${duration}ms`);
        return response;
      }
    ]
  }
});
```

### Streaming with WebSocket

```typescript
const streamClient = new StreamClient({
  baseURL: 'http://localhost:8000'
});

const ws = streamClient.createWebSocket('/chat', {
  protocols: ['chat'],
  onOpen: () => console.log('Connected'),
  onMessage: (event) => {
    const data = JSON.parse(event.data);
    console.log('Message:', data);
  },
  onError: (error) => console.error('WebSocket error:', error),
  onClose: () => console.log('Disconnected')
});

// Send message
ws.send(JSON.stringify({
  type: 'message',
  content: 'Hello, world!'
}));
```

### File Upload with Progress

```typescript
const uploadClient = new FileUploadClient({
  baseURL: 'http://localhost:8000'
});

const uploadFile = async (file: File) => {
  try {
    const result = await uploadClient.upload('/upload', file, {
      onProgress: (progress) => {
        console.log(`Upload: ${progress.percentage}%`);
        updateProgressBar(progress.percentage);
      },
      onSuccess: (response) => {
        console.log('Upload successful:', response);
      },
      onError: (error) => {
        console.error('Upload failed:', error);
      }
    });
    return result;
  } catch (error) {
    console.error('Upload error:', error);
  }
};
```

## 🐛 Troubleshooting

### Common Issues

#### Connection Timeout
```typescript
const client = new ApiClient({
  baseURL: 'http://localhost:8000',
  timeout: 30000, // Increase timeout
  retries: 3
});
```

#### CORS Issues
```typescript
const client = new ApiClient({
  baseURL: 'http://localhost:8000',
  headers: {
    'Access-Control-Allow-Origin': '*'
  }
});
```

#### File Upload Issues
```typescript
const uploadClient = new FileUploadClient({
  baseURL: 'http://localhost:8000',
  maxFileSize: 10 * 1024 * 1024,
  allowedTypes: ['image/jpeg', 'image/png']
});
```

### Getting Help

- **GitHub Issues**: [Report bugs](https://github.com/farm-stack/framework/issues)
- **Documentation**: [API Client Reference](../docs/reference/api-client/)
- **Discussions**: [Community help](https://github.com/farm-stack/framework/discussions)

## 🔄 Changelog

### v0.2.0
- Enhanced retry logic with exponential backoff
- Improved streaming support
- Better error handling and transformation
- Enhanced file upload capabilities

### v0.1.0
- Initial release with basic HTTP client
- Axios wrapper with retry logic
- Basic streaming support
- File upload functionality

## 📄 License

MIT © FARM Framework