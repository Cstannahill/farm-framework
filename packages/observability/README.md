# @farm/observability

The FARM Framework observability package provides comprehensive monitoring, logging, and telemetry capabilities for FARM applications. It includes metrics collection, log aggregation, distributed tracing, and performance monitoring.

## 🚀 Quick Start

```bash
npm install @farm/observability
```

```typescript
import { ObservabilityManager } from '@farm/observability';

const observability = new ObservabilityManager({
  metrics: { enabled: true },
  logging: { enabled: true },
  tracing: { enabled: true }
});

// Start monitoring
await observability.start();
```

## 📋 Core Features

### Metrics Collection
- Application performance metrics
- AI model usage and performance
- Database query metrics
- System resource monitoring

### Logging
- Structured JSON logging
- Log aggregation and analysis
- Error tracking and alerting
- Performance logging

### Distributed Tracing
- Request flow tracking
- Performance profiling
- Error correlation
- Service dependency mapping

### Performance Monitoring
- Real-time performance metrics
- Bottleneck identification
- Resource usage tracking
- Alerting and notifications

## 🏗️ Architecture

```
@farm/observability
├── Metrics/
│   ├── MetricsCollector       # Metrics collection
│   ├── PerformanceMonitor     # Performance monitoring
│   └── SystemMonitor          # System resource monitoring
├── Logging/
│   ├── Logger                 # Structured logging
│   ├── LogAggregator          # Log aggregation
│   └── ErrorTracker           # Error tracking
├── Tracing/
│   ├── Tracer                 # Distributed tracing
│   ├── SpanManager            # Span management
│   └── TraceAnalyzer          # Trace analysis
├── Alerting/
│   ├── AlertManager           # Alert management
│   ├── NotificationService    # Notification delivery
│   └── ThresholdMonitor       # Threshold monitoring
└── Exporters/
    ├── PrometheusExporter     # Prometheus metrics
    ├── JaegerExporter         # Jaeger tracing
    └── ElasticsearchExporter  # Elasticsearch logging
```

## 📚 API Reference

### ObservabilityManager

Main orchestrator for observability features.

```typescript
import { ObservabilityManager } from '@farm/observability';

const observability = new ObservabilityManager({
  metrics: {
    enabled: true,
    interval: 30000,
    exporters: ['prometheus']
  },
  logging: {
    enabled: true,
    level: 'info',
    format: 'json'
  },
  tracing: {
    enabled: true,
    sampleRate: 0.1,
    exporters: ['jaeger']
  }
});

await observability.start();
```

### Metrics

#### MetricsCollector
Collect and export application metrics.

```typescript
import { MetricsCollector } from '@farm/observability';

const collector = new MetricsCollector({
  namespace: 'farm_app',
  labels: { service: 'api' }
});

// Counter metric
const requestCounter = collector.createCounter('requests_total', {
  help: 'Total number of requests',
  labelNames: ['method', 'endpoint']
});

// Histogram metric
const requestDuration = collector.createHistogram('request_duration_seconds', {
  help: 'Request duration in seconds',
  buckets: [0.1, 0.5, 1, 2, 5]
});

// Gauge metric
const activeConnections = collector.createGauge('active_connections', {
  help: 'Number of active connections'
});

// Record metrics
requestCounter.inc({ method: 'GET', endpoint: '/users' });
requestDuration.observe(0.5);
activeConnections.set(42);
```

#### PerformanceMonitor
Monitor application performance.

```typescript
import { PerformanceMonitor } from '@farm/observability';

const monitor = new PerformanceMonitor({
  enabled: true,
  interval: 1000,
  thresholds: {
    cpu: 80,
    memory: 85,
    responseTime: 1000
  }
});

// Monitor function execution
const result = await monitor.measure('user_creation', async () => {
  return await createUser(userData);
});

// Monitor AI operations
const aiResult = await monitor.measureAI('llama3.2:3b', async () => {
  return await ai.generate('Hello, world!');
});
```

### Logging

#### Logger
Structured logging with different levels.

```typescript
import { Logger } from '@farm/observability';

const logger = new Logger({
  level: 'info',
  format: 'json',
  output: './logs',
  rotation: true
});

// Log messages
logger.info('User created', { userId: 123, email: 'user@example.com' });
logger.warn('Deprecated API used', { endpoint: '/old-api' });
logger.error('Database connection failed', { error: 'Connection timeout' });

// Log with context
logger.withContext({ requestId: 'req-123' }).info('Processing request');
```

#### ErrorTracker
Track and analyze errors.

```typescript
import { ErrorTracker } from '@farm/observability';

const tracker = new ErrorTracker({
  enabled: true,
  sampleRate: 1.0,
  grouping: true
});

// Track error
tracker.trackError(new Error('Database connection failed'), {
  context: 'user_creation',
  userId: 123,
  requestId: 'req-123'
});

// Track AI errors
tracker.trackAIError(error, {
  provider: 'ollama',
  model: 'llama3.2:3b',
  prompt: 'Hello, world!'
});
```

### Tracing

#### Tracer
Distributed tracing for request flow tracking.

```typescript
import { Tracer } from '@farm/observability';

const tracer = new Tracer({
  serviceName: 'farm-api',
  sampleRate: 0.1,
  exporters: ['jaeger']
});

// Create span
const span = tracer.startSpan('user_creation');
span.setTag('user.id', 123);
span.setTag('user.email', 'user@example.com');

try {
  const user = await createUser(userData);
  span.setTag('user.created', true);
  span.finish();
} catch (error) {
  span.setTag('error', true);
  span.setTag('error.message', error.message);
  span.finish();
}
```

#### SpanManager
Manage spans and trace context.

```typescript
import { SpanManager } from '@farm/observability';

const spanManager = new SpanManager();

// Create child span
const parentSpan = tracer.startSpan('parent_operation');
const childSpan = spanManager.createChildSpan(parentSpan, 'child_operation');

// Set span context
spanManager.setContext({
  userId: 123,
  requestId: 'req-123'
});

// Get current span
const currentSpan = spanManager.getCurrentSpan();
```

### Alerting

#### AlertManager
Manage alerts and notifications.

```typescript
import { AlertManager } from '@farm/observability';

const alertManager = new AlertManager({
  enabled: true,
  channels: ['email', 'slack'],
  rules: [
    {
      name: 'high_error_rate',
      condition: 'error_rate > 0.05',
      duration: '5m',
      severity: 'critical'
    }
  ]
});

// Create alert
alertManager.createAlert('high_error_rate', {
  message: 'Error rate is above threshold',
  severity: 'critical',
  labels: { service: 'api' }
});
```

## 🔧 Configuration

### Basic Configuration

```typescript
const observability = new ObservabilityManager({
  metrics: {
    enabled: true,
    interval: 30000
  },
  logging: {
    enabled: true,
    level: 'info'
  },
  tracing: {
    enabled: true,
    sampleRate: 0.1
  }
});
```

### Advanced Configuration

```typescript
const observability = new ObservabilityManager({
  metrics: {
    enabled: true,
    interval: 30000,
    exporters: ['prometheus'],
    prometheus: {
      port: 9090,
      path: '/metrics'
    }
  },
  logging: {
    enabled: true,
    level: 'info',
    format: 'json',
    output: './logs',
    rotation: true,
    maxSize: '100MB',
    maxFiles: 5
  },
  tracing: {
    enabled: true,
    sampleRate: 0.1,
    exporters: ['jaeger'],
    jaeger: {
      endpoint: 'http://localhost:14268/api/traces'
    }
  },
  alerting: {
    enabled: true,
    channels: ['email', 'slack'],
    rules: [
      {
        name: 'high_error_rate',
        condition: 'error_rate > 0.05',
        duration: '5m',
        severity: 'critical'
      }
    ]
  }
});
```

## 🎯 Advanced Usage

### Custom Metrics

```typescript
import { MetricsCollector } from '@farm/observability';

const collector = new MetricsCollector({
  namespace: 'farm_app'
});

// Custom AI metrics
const aiRequestCounter = collector.createCounter('ai_requests_total', {
  help: 'Total AI requests',
  labelNames: ['provider', 'model', 'status']
});

const aiResponseTime = collector.createHistogram('ai_response_time_seconds', {
  help: 'AI response time',
  buckets: [0.1, 0.5, 1, 2, 5, 10]
});

// Record AI metrics
aiRequestCounter.inc({ 
  provider: 'ollama', 
  model: 'llama3.2:3b', 
  status: 'success' 
});

aiResponseTime.observe(1.5);
```

### Custom Logging

```typescript
import { Logger } from '@farm/observability';

const logger = new Logger({
  level: 'info',
  format: 'json'
});

// Custom log formatter
logger.addFormatter('ai', (level, message, meta) => {
  return {
    timestamp: new Date().toISOString(),
    level,
    message,
    service: 'farm-ai',
    ...meta
  };
});

// Log AI operations
logger.ai('AI request completed', {
  provider: 'ollama',
  model: 'llama3.2:3b',
  duration: 1.5,
  tokens: 150
});
```

### Custom Tracing

```typescript
import { Tracer } from '@farm/observability';

const tracer = new Tracer({
  serviceName: 'farm-ai'
});

// Custom AI tracing
const aiSpan = tracer.startSpan('ai_generation');
aiSpan.setTag('ai.provider', 'ollama');
aiSpan.setTag('ai.model', 'llama3.2:3b');
aiSpan.setTag('ai.prompt_length', prompt.length);

try {
  const response = await ai.generate(prompt);
  aiSpan.setTag('ai.response_length', response.length);
  aiSpan.setTag('ai.success', true);
  aiSpan.finish();
} catch (error) {
  aiSpan.setTag('ai.error', true);
  aiSpan.setTag('ai.error_message', error.message);
  aiSpan.finish();
}
```

## 🐛 Troubleshooting

### Common Issues

#### Metrics Not Appearing
```typescript
// Check metrics configuration
const collector = new MetricsCollector({ namespace: 'farm_app' });
console.log('Metrics enabled:', collector.isEnabled());
```

#### Logging Issues
```typescript
// Check logger configuration
const logger = new Logger({ level: 'debug' });
logger.debug('Debug message');
```

#### Tracing Issues
```typescript
// Check tracer configuration
const tracer = new Tracer({ serviceName: 'farm-app' });
console.log('Tracer enabled:', tracer.isEnabled());
```

### Getting Help

- **GitHub Issues**: [Report bugs](https://github.com/farm-stack/framework/issues)
- **Documentation**: [Observability Reference](../docs/reference/observability/)
- **Discussions**: [Community help](https://github.com/farm-stack/framework/discussions)

## 🔄 Changelog

### v0.2.0
- Added comprehensive metrics collection
- Enhanced logging with structured format
- Improved distributed tracing
- Added alerting and notification system

### v0.1.0
- Initial release with basic monitoring
- Simple logging and metrics
- Basic performance monitoring

## 📄 License

MIT © FARM Framework