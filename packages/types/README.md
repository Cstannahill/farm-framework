# @farm/types

The FARM Framework types package provides shared TypeScript definitions for configuration, CLI options, database models, authentication, and plugin hooks.

## 🚀 Quick Start

```bash
npm install @farm/types
```

```typescript
import { 
  FarmConfig, 
  TemplateContext, 
  AIProviderConfig,
  DatabaseConfig 
} from '@farm/types';

const config: FarmConfig = {
  projectName: 'my-app',
  ai: {
    providers: {
      ollama: {
        model: 'llama3.2:3b'
      }
    }
  }
};
```

## 📋 Core Features

### Configuration Types
- **FarmConfig**: Main framework configuration
- **TemplateContext**: Template generation context
- **EnvironmentConfig**: Environment-specific settings
- **BuildConfig**: Build and deployment configuration

### AI Types
- **AIProviderConfig**: AI provider configuration
- **AIModel**: AI model definitions
- **AIResponse**: AI response types
- **StreamingConfig**: Streaming configuration

### Database Types
- **DatabaseConfig**: Database configuration
- **ConnectionConfig**: Connection settings
- **MigrationConfig**: Migration configuration

### Authentication Types
- **AuthConfig**: Authentication configuration
- **UserModel**: User model definitions
- **SessionConfig**: Session management
- **RBACConfig**: Role-based access control

### CLI Types
- **CLIOptions**: CLI command options
- **CommandConfig**: Command configuration
- **TemplateOptions**: Template generation options

## 📚 API Reference

### FarmConfig
Main framework configuration interface.

```typescript
import { FarmConfig } from '@farm/types';

const config: FarmConfig = {
  projectName: 'my-farm-app',
  version: '1.0.0',
  environment: 'development',
  
  ai: {
    providers: {
      ollama: {
        model: 'llama3.2:3b',
        baseUrl: 'http://localhost:11434'
      }
    },
    defaultProvider: 'ollama',
    streaming: true
  },
  
  database: {
    type: 'mongodb',
    url: 'mongodb://localhost:27017/my-app'
  }
};
```

### AIProviderConfig
AI provider configuration.

```typescript
import { AIProviderConfig } from '@farm/types';

const ollamaConfig: AIProviderConfig = {
  type: 'ollama',
  model: 'llama3.2:3b',
  baseUrl: 'http://localhost:11434',
  timeout: 30000
};

const openaiConfig: AIProviderConfig = {
  type: 'openai',
  apiKey: process.env.OPENAI_API_KEY,
  model: 'gpt-4'
};
```

### DatabaseConfig
Database configuration.

```typescript
import { DatabaseConfig } from '@farm/types';

const dbConfig: DatabaseConfig = {
  type: 'mongodb',
  url: 'mongodb://localhost:27017/my-app',
  options: {
    useNewUrlParser: true,
    useUnifiedTopology: true
  }
};
```

### AuthConfig
Authentication configuration.

```typescript
import { AuthConfig } from '@farm/types';

const authConfig: AuthConfig = {
  type: 'session',
  session: {
    secret: process.env.SESSION_SECRET,
    maxAge: 86400000
  },
  rbac: {
    enabled: true,
    roles: ['admin', 'user', 'guest']
  }
};
```

### TemplateContext
Template generation context.

```typescript
import { TemplateContext } from '@farm/types';

const context: TemplateContext = {
  projectName: 'my-app',
  template: 'ai-chat',
  features: ['auth', 'ai'],
  database: 'postgresql'
};
```

## 🔧 Usage

### Type Guards
```typescript
import { AIProviderConfig } from '@farm/types';

function isOllamaProvider(config: AIProviderConfig): config is OllamaProviderConfig {
  return config.type === 'ollama';
}
```

### Generic Types
```typescript
import { AIResponse } from '@farm/types';

interface ResponseWrapper<T> {
  data: T;
  status: 'success' | 'error';
  timestamp: Date;
}

const aiResponse: ResponseWrapper<AIResponse> = {
  data: response,
  status: 'success',
  timestamp: new Date()
};
```

### Type Extensions
```typescript
import { FarmConfig } from '@farm/types';

interface CustomFarmConfig extends FarmConfig {
  custom: {
    feature: string;
    enabled: boolean;
  };
}
```

## 📄 License

MIT © FARM Framework