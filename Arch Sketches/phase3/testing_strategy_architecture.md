# Testing Strategy Architecture

## Overview

The FARM testing strategy encompasses three layers: **framework-level testing** (testing FARM itself), **auto-generated application testing** (testing user code), and **AI-specific testing** (validating AI provider integrations and model behaviors). The system provides comprehensive test generation, cross-stack validation, and AI-aware testing capabilities while maintaining excellent developer experience.

---

## Multi-Layer Testing Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    FARM Testing Architecture                    │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────┐ │
│  │Framework    │  │Application  │  │Integration  │  │   AI    │ │
│  │Tests        │  │Tests        │  │Tests        │  │ Tests   │ │
│  │(FARM Core)  │  │(Generated)  │  │(Cross-Stack)│  │(Models) │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────┘ │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────┐ │
│  │ Unit Tests  │  │ API Tests   │  │ E2E Tests   │  │Contract │ │
│  │            │  │            │  │            │  │ Tests   │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────┘ │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────┐ │
│  │Test Runner  │  │Mock Manager │  │ Coverage    │  │ Report  │ │
│  │Orchestrator │  │(AI Models)  │  │ Analyzer    │  │ System  │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## Core Testing Components

### 1. Framework-Level Testing Suite

**Purpose:** Test FARM framework internals and core functionality

**Structure:**

```
packages/farm-core/tests/
├── cli/
│   ├── create.test.ts          # Project scaffolding tests
│   ├── generate.test.ts        # Code generation tests
│   └── dev-server.test.ts      # Development server tests
├── codegen/
│   ├── typescript-gen.test.ts  # Type generation tests
│   ├── api-client-gen.test.ts  # API client generation tests
│   └── schema-validation.test.ts
├── ai/
│   ├── provider-router.test.ts # AI provider routing tests
│   ├── ollama-integration.test.ts
│   ├── model-manager.test.ts   # Model loading/switching tests
│   └── streaming.test.ts       # AI streaming response tests
├── config/
│   ├── loader.test.ts          # Configuration loading tests
│   ├── validation.test.ts      # Config validation tests
│   └── hot-reload.test.ts      # Config hot reload tests
└── dev-server/
    ├── service-manager.test.ts # Service orchestration tests
    ├── file-watcher.test.ts    # File watching tests
    └── proxy.test.ts           # Request proxying tests
```

**Example Framework Test:**

```typescript
// packages/farm-core/tests/codegen/typescript-gen.test.ts
import { TypeScriptGenerator } from "../../src/codegen/typescript-generator";
import { OpenAPISchema } from "../../src/types";

describe("TypeScript Generator", () => {
  let generator: TypeScriptGenerator;

  beforeEach(() => {
    generator = new TypeScriptGenerator();
  });

  test("generates correct interfaces from Pydantic models", async () => {
    const openApiSchema: OpenAPISchema = {
      components: {
        schemas: {
          User: {
            type: "object",
            properties: {
              id: { type: "string" },
              name: { type: "string" },
              email: { type: "string", format: "email" },
              createdAt: { type: "string", format: "date-time" },
            },
            required: ["id", "name", "email"],
          },
        },
      },
    };

    const result = await generator.generateTypes(openApiSchema);

    expect(result.interfaces).toContain(`
      export interface User {
        id: string;
        name: string;
        email: string;
        createdAt?: string;
      }
    `);
  });

  test("handles optional fields correctly", async () => {
    // Test optional field generation logic
  });

  test("generates AI provider types correctly", async () => {
    // Test AI-specific type generation
  });
});
```

### 2. Auto-Generated Application Testing

**Purpose:** Automatically generate comprehensive test suites for user applications

**Test Generation Triggers:**

```typescript
// When user runs: farm generate model User
// Auto-generates:
export interface TestGenerationConfig {
  model: {
    unitTests: boolean; // Test model validation
    factoryTests: boolean; // Test data factories
    migrationTests: boolean; // Test database migrations
  };
  api: {
    endpointTests: boolean; // Test all CRUD endpoints
    authTests: boolean; // Test authentication
    validationTests: boolean; // Test request validation
  };
  frontend: {
    componentTests: boolean; // Test React components
    hookTests: boolean; // Test custom hooks
    integrationTests: boolean; // Test API integration
  };
  ai: {
    providerTests: boolean; // Test AI provider switching
    modelTests: boolean; // Test model interactions
    streamingTests: boolean; // Test streaming responses
  };
}
```

**Generated Test Structure:**

```
apps/api/tests/
├── models/
│   ├── test_user.py          # Generated model tests
│   └── test_conversation.py   # AI model tests
├── routes/
│   ├── test_users.py         # Generated API tests
│   ├── test_auth.py          # Generated auth tests
│   └── test_ai.py            # Generated AI endpoint tests
├── ai/
│   ├── test_providers.py     # AI provider tests
│   ├── test_model_manager.py # Model management tests
│   └── test_streaming.py     # Streaming tests
└── factories/
    ├── user_factory.py       # Test data factories
    └── conversation_factory.py

apps/web/tests/
├── components/
│   ├── UserList.test.tsx     # Generated component tests
│   ├── ChatWindow.test.tsx   # Generated AI component tests
│   └── forms/
│       └── UserForm.test.tsx
├── hooks/
│   ├── useUsers.test.ts      # Generated hook tests
│   ├── useStreamingChat.test.ts # Generated AI hook tests
│   └── useAuth.test.ts
├── services/
│   ├── api.test.ts           # Generated API client tests
│   └── aiApi.test.ts         # Generated AI API tests
└── utils/
    └── test-utils.tsx        # Testing utilities
```

### 3. AI-Specific Testing Framework

**Purpose:** Comprehensive testing for AI providers and model interactions

**AI Test Categories:**

```typescript
// AI Provider Testing
export interface AITestSuite {
  providerHealth: {
    ollamaConnection: boolean;
    openaiConnection: boolean;
    huggingfaceConnection: boolean;
    providerSwitching: boolean;
  };
  modelOperations: {
    modelLoading: boolean;
    modelCaching: boolean;
    modelHotSwap: boolean;
    memoryManagement: boolean;
  };
  inference: {
    syncResponse: boolean;
    streamingResponse: boolean;
    errorHandling: boolean;
    responseValidation: boolean;
  };
  performance: {
    responseTime: boolean;
    throughput: boolean;
    memoryUsage: boolean;
    gpuUtilization: boolean;
  };
}
```

**AI Provider Mock System:**

```python
# apps/api/tests/ai/mocks/providers.py
from farm.ai.providers.base import AIProvider
from typing import AsyncIterator, List
import asyncio

class MockOllamaProvider(AIProvider):
    """Mock Ollama provider for testing"""

    def __init__(self, config: dict):
        super().__init__(config)
        self.mock_responses = {}
        self.call_log = []

    async def chat(self, messages: List[ChatMessage], model: str, **kwargs) -> str:
        self.call_log.append({
            'method': 'chat',
            'messages': messages,
            'model': model,
            'kwargs': kwargs
        })

        # Return mock response based on input
        if 'hello' in messages[-1].content.lower():
            return "Hello! How can I help you today?"

        return self.mock_responses.get(model, "Mock response")

    async def chat_stream(self, messages: List[ChatMessage], model: str, **kwargs) -> AsyncIterator[str]:
        """Mock streaming response"""
        response = await self.chat(messages, model, **kwargs)
        words = response.split()

        for word in words:
            yield word + " "
            await asyncio.sleep(0.01)  # Simulate streaming delay

    async def health_check(self) -> bool:
        return True  # Always healthy in tests

    def set_mock_response(self, model: str, response: str):
        """Set mock response for specific model"""
        self.mock_responses[model] = response

class MockOpenAIProvider(AIProvider):
    """Mock OpenAI provider for testing"""
    # Similar implementation for OpenAI testing
    pass
```

**AI Integration Tests:**

```python
# apps/api/tests/ai/test_provider_integration.py
import pytest
from farm.ai.router import AIRouter
from .mocks.providers import MockOllamaProvider, MockOpenAIProvider

class TestAIProviderIntegration:

    @pytest.fixture
    async def ai_router(self):
        """Setup AI router with mock providers"""
        router = AIRouter()
        router.providers['ollama'] = MockOllamaProvider({})
        router.providers['openai'] = MockOpenAIProvider({})
        router.default_provider = 'ollama'
        return router

    async def test_provider_switching(self, ai_router):
        """Test switching between AI providers"""
        # Test Ollama provider
        ollama_provider = ai_router.get_provider('ollama')
        ollama_response = await ollama_provider.chat([
            ChatMessage(role="user", content="Hello")
        ], "llama3.1")

        assert "Hello" in ollama_response

        # Test OpenAI provider
        openai_provider = ai_router.get_provider('openai')
        openai_response = await openai_provider.chat([
            ChatMessage(role="user", content="Hello")
        ], "gpt-3.5-turbo")

        assert openai_response is not None

    async def test_environment_routing(self, ai_router, monkeypatch):
        """Test automatic provider selection based on environment"""
        # Test development environment (should use Ollama)
        monkeypatch.setenv('FARM_ENV', 'development')
        provider = ai_router.get_provider()
        assert isinstance(provider, MockOllamaProvider)

        # Test production environment (should use OpenAI)
        monkeypatch.setenv('FARM_ENV', 'production')
        # Would need configuration to specify production provider

    async def test_fallback_behavior(self, ai_router):
        """Test fallback when primary provider fails"""
        # Simulate Ollama failure
        ai_router.providers['ollama'].health_check = lambda: False

        # Should fallback to OpenAI
        fallback_provider = ai_router.get_fallback_provider('ollama')
        assert fallback_provider is not None

    async def test_streaming_response(self, ai_router):
        """Test AI streaming response functionality"""
        provider = ai_router.get_provider('ollama')

        collected_chunks = []
        async for chunk in provider.chat_stream([
            ChatMessage(role="user", content="Hello")
        ], "llama3.1"):
            collected_chunks.append(chunk)

        assert len(collected_chunks) > 0
        assert "".join(collected_chunks).strip() == "Hello! How can I help you today?"
```

### 4. Cross-Stack Integration Testing

**Purpose:** Validate consistency between Python backend and TypeScript frontend

**Type Consistency Tests:**

```typescript
// tools/codegen/tests/type-consistency.test.ts
import { generateTypesFromOpenAPI } from "../src/typescript-generator";
import { extractOpenAPIFromPython } from "../src/openapi-extractor";

describe("Cross-Stack Type Consistency", () => {
  test("Python models generate correct TypeScript types", async () => {
    // Start test FastAPI server
    const testServer = await startTestFastAPIServer();

    try {
      // Extract OpenAPI schema from running server
      const openApiSchema = await extractOpenAPIFromPython(testServer.url);

      // Generate TypeScript types
      const generatedTypes = await generateTypesFromOpenAPI(openApiSchema);

      // Validate User model consistency
      expect(generatedTypes).toContain(`
        export interface User {
          id: string;
          name: string;
          email: string;
          createdAt: string;
          updatedAt: string;
        }
      `);

      // Validate AI-specific types
      expect(generatedTypes).toContain(`
        export interface ChatRequest {
          messages: ChatMessage[];
          model: string;
          provider?: 'ollama' | 'openai' | 'huggingface';
          temperature?: number;
          maxTokens?: number;
        }
      `);
    } finally {
      await testServer.stop();
    }
  });

  test("API client methods match FastAPI routes", async () => {
    // Test that generated API client has correct methods
    const apiClient = await import("../generated/api-client");

    // Validate CRUD operations exist
    expect(apiClient.userApi.create).toBeDefined();
    expect(apiClient.userApi.getById).toBeDefined();
    expect(apiClient.userApi.update).toBeDefined();
    expect(apiClient.userApi.delete).toBeDefined();
    expect(apiClient.userApi.list).toBeDefined();

    // Validate AI operations exist
    expect(apiClient.aiApi.chat).toBeDefined();
    expect(apiClient.aiApi.chatStream).toBeDefined();
    expect(apiClient.aiApi.listModels).toBeDefined();
    expect(apiClient.aiApi.healthCheck).toBeDefined();
  });

  test("React hooks work with generated API client", async () => {
    // Test generated hooks against mock API
    const { renderHook, waitFor } = require("@testing-library/react");
    const { useUsers, useStreamingChat } = require("../generated/hooks");

    const { result } = renderHook(() => useUsers());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toBeDefined();
  });
});
```

### 5. End-to-End Testing Framework

**Purpose:** Test complete user workflows including AI interactions

**E2E Test Structure:**

```
tests/e2e/
├── scaffolding/
│   ├── basic-project.spec.ts     # Test project creation
│   ├── ai-chat-project.spec.ts   # Test AI template
│   └── template-switching.spec.ts
├── development/
│   ├── hot-reload.spec.ts        # Test hot reload functionality
│   ├── type-generation.spec.ts   # Test type generation pipeline
│   └── ai-model-switching.spec.ts # Test AI model hot-swap
├── ai-workflows/
│   ├── local-chat.spec.ts        # Test Ollama chat functionality
│   ├── provider-switching.spec.ts # Test provider switching
│   ├── streaming-responses.spec.ts # Test streaming AI responses
│   └── model-management.spec.ts   # Test model loading/unloading
└── deployment/
    ├── build-process.spec.ts      # Test production builds
    ├── docker-deployment.spec.ts  # Test Docker deployment
    └── cloud-deployment.spec.ts   # Test cloud deployment
```

**AI Workflow E2E Test:**

```typescript
// tests/e2e/ai-workflows/local-chat.spec.ts
import { test, expect } from "@playwright/test";

test.describe("Local AI Chat Workflow", () => {
  test.beforeEach(async ({ page }) => {
    // Start FARM development server with Ollama
    await page.goto("http://localhost:4000");
  });

  test("creates AI chat application and tests chat functionality", async ({
    page,
  }) => {
    // Navigate to chat interface
    await page.click('[data-testid="chat-tab"]');

    // Verify Ollama is connected
    await expect(page.locator('[data-testid="ai-status"]')).toContainText(
      "Ollama: Connected"
    );

    // Test model selection
    await page.selectOption('[data-testid="model-selector"]', "llama3.1");

    // Send a test message
    await page.fill(
      '[data-testid="chat-input"]',
      "Hello, can you help me with React?"
    );
    await page.click('[data-testid="send-button"]');

    // Verify message appears in chat
    await expect(
      page.locator('[data-testid="user-message"]').last()
    ).toContainText("Hello, can you help me with React?");

    // Wait for AI response (streaming)
    await expect(page.locator('[data-testid="ai-message"]').last()).toBeVisible(
      { timeout: 10000 }
    );
    await expect(
      page.locator('[data-testid="ai-message"]').last()
    ).toContainText("React", { timeout: 15000 });

    // Test provider switching
    await page.selectOption('[data-testid="provider-selector"]', "openai");
    await page.fill('[data-testid="chat-input"]', "Switch to OpenAI");
    await page.click('[data-testid="send-button"]');

    // Verify provider switch worked
    await expect(page.locator('[data-testid="ai-status"]')).toContainText(
      "OpenAI: Connected"
    );
  });

  test("handles Ollama model loading and switching", async ({ page }) => {
    // Test model management interface
    await page.click('[data-testid="ai-settings"]');

    // Load a new model
    await page.click('[data-testid="load-model-button"]');
    await page.fill('[data-testid="model-name-input"]', "codestral");
    await page.click('[data-testid="confirm-load"]');

    // Wait for model loading
    await expect(
      page.locator('[data-testid="loading-indicator"]')
    ).toBeVisible();
    await expect(page.locator('[data-testid="loading-indicator"]')).toBeHidden({
      timeout: 60000,
    });

    // Verify model is available
    await expect(page.locator('[data-testid="model-selector"]')).toContainText(
      "codestral"
    );
  });
});
```

---

## Test Generation System

### 1. Model-Based Test Generation

**Automatic Test Generation from Pydantic Models:**

```python
# tools/codegen/test_generator.py
from typing import Dict, Any
import ast
from jinja2 import Template

class ModelTestGenerator:
    def __init__(self):
        self.test_templates = {
            'model_validation': '''
def test_{{model_name|lower}}_validation():
    """Test {{model_name}} model validation"""

    # Test valid data
    valid_data = {{valid_example}}
    model = {{model_name}}(**valid_data)
    assert model.{{primary_field}} == valid_data['{{primary_field}}']

    # Test invalid data
    {% for field, validation in validations.items() %}
    with pytest.raises(ValidationError):
        {{model_name}}({{invalid_examples[field]}})
    {% endfor %}
''',
            'model_serialization': '''
def test_{{model_name|lower}}_serialization():
    """Test {{model_name}} serialization/deserialization"""

    data = {{valid_example}}
    model = {{model_name}}(**data)

    # Test dict conversion
    model_dict = model.dict()
    assert model_dict['{{primary_field}}'] == data['{{primary_field}}']

    # Test JSON serialization
    json_str = model.json()
    assert json_str is not None

    # Test JSON deserialization
    recreated = {{model_name}}.parse_raw(json_str)
    assert recreated.{{primary_field}} == model.{{primary_field}}
'''
        }

    def generate_tests_for_model(self, model_info: Dict[str, Any]) -> str:
        """Generate comprehensive tests for a Pydantic model"""

        # Extract model information
        model_name = model_info['name']
        fields = model_info['fields']
        validations = model_info['validations']

        # Generate test data
        valid_example = self.generate_valid_example(fields)
        invalid_examples = self.generate_invalid_examples(fields, validations)

        # Render test templates
        tests = []
        for template_name, template_str in self.test_templates.items():
            template = Template(template_str)
            test_code = template.render(
                model_name=model_name,
                valid_example=valid_example,
                invalid_examples=invalid_examples,
                validations=validations,
                primary_field=self.get_primary_field(fields)
            )
            tests.append(test_code)

        return '\n\n'.join(tests)

    def generate_valid_example(self, fields: Dict[str, Any]) -> Dict[str, Any]:
        """Generate valid test data for model fields"""
        example = {}

        for field_name, field_info in fields.items():
            field_type = field_info['type']

            if field_type == 'str':
                example[field_name] = f"test_{field_name}"
            elif field_type == 'int':
                example[field_name] = 42
            elif field_type == 'float':
                example[field_name] = 3.14
            elif field_type == 'bool':
                example[field_name] = True
            elif field_type == 'datetime':
                example[field_name] = "2025-06-04T12:00:00Z"
            # Add more type handlers

        return example
```

### 2. API Route Test Generation

**Automatic API Tests from FastAPI Routes:**

```python
# tools/codegen/api_test_generator.py
class APITestGenerator:
    def generate_crud_tests(self, route_info: Dict[str, Any]) -> str:
        """Generate CRUD API tests for a resource"""

        template = '''
class Test{{resource_name}}API:
    """Auto-generated tests for {{resource_name}} API"""

    @pytest.fixture
    async def client(self):
        """Test client fixture"""
        return TestClient(app)

    @pytest.fixture
    async def sample_{{resource_name|lower}}(self):
        """Sample {{resource_name}} data"""
        return {{sample_data}}

    async def test_create_{{resource_name|lower}}(self, client, sample_{{resource_name|lower}}):
        """Test creating a {{resource_name}}"""
        response = await client.post("{{base_path}}", json=sample_{{resource_name|lower}})
        assert response.status_code == 201

        data = response.json()
        assert data["{{primary_field}}"] is not None
        {% for field, expected in sample_data.items() %}
        assert data["{{field}}"] == "{{expected}}"
        {% endfor %}

    async def test_get_{{resource_name|lower}}(self, client, sample_{{resource_name|lower}}):
        """Test retrieving a {{resource_name}}"""
        # Create resource first
        create_response = await client.post("{{base_path}}", json=sample_{{resource_name|lower}})
        created_id = create_response.json()["{{primary_field}}"]

        # Retrieve resource
        response = await client.get(f"{{base_path}}/{created_id}")
        assert response.status_code == 200

        data = response.json()
        assert data["{{primary_field}}"] == created_id

    async def test_update_{{resource_name|lower}}(self, client, sample_{{resource_name|lower}}):
        """Test updating a {{resource_name}}"""
        # Create and update logic
        pass

    async def test_delete_{{resource_name|lower}}(self, client, sample_{{resource_name|lower}}):
        """Test deleting a {{resource_name}}"""
        # Create and delete logic
        pass

    async def test_list_{{resource_name|lower}}s(self, client):
        """Test listing {{resource_name}}s"""
        response = await client.get("{{base_path}}")
        assert response.status_code == 200

        data = response.json()
        assert "items" in data
        assert "total" in data
        assert isinstance(data["items"], list)
'''

        return Template(template).render(**route_info)
```

### 3. Frontend Test Generation

**React Component and Hook Tests:**

```typescript
// tools/codegen/frontend-test-generator.ts
export class FrontendTestGenerator {
  generateComponentTests(componentInfo: ComponentInfo): string {
    return `
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ${componentInfo.name} } from './${componentInfo.name}';
import { mockApi } from '../utils/test-utils';

describe('${componentInfo.name}', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    
    mockApi.reset();
  });

  const renderComponent = (props = {}) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <${componentInfo.name} {...props} />
      </QueryClientProvider>
    );
  };

  test('renders correctly with default props', () => {
    renderComponent();
    
    ${componentInfo.testElements
      .map(
        (element) =>
          `expect(screen.getByTestId('${element}')).toBeInTheDocument();`
      )
      .join("\n    ")}
  });

  ${componentInfo.interactions
    .map(
      (interaction) => `
  test('handles ${interaction.action} correctly', async () => {
    ${interaction.setup || ""}
    renderComponent();
    
    ${interaction.trigger}
    
    await waitFor(() => {
      ${interaction.assertion}
    });
  });`
    )
    .join("\n")}
});
`;
  }

  generateHookTests(hookInfo: HookInfo): string {
    return `
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ${hookInfo.name} } from './${hookInfo.name}';
import { mockApiClient } from '../utils/test-utils';

describe('${hookInfo.name}', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );

  test('returns expected data structure', () => {
    const { result } = renderHook(() => ${hookInfo.name}(), { wrapper });
    
    ${hookInfo.expectedProperties
      .map((prop) => `expect(result.current.${prop}).toBeDefined();`)
      .join("\n    ")}
  });

  ${hookInfo.operations
    .map(
      (operation) => `
  test('${operation.name} works correctly', async () => {
    mockApiClient.${operation.endpoint}.mockResolvedValue(${operation.mockResponse});
    
    const { result } = renderHook(() => ${hookInfo.name}(), { wrapper });
    
    ${operation.trigger}
    
    await waitFor(() => {
      ${operation.assertion}
    });
    
    expect(mockApiClient.${operation.endpoint}).toHaveBeenCalledWith(${operation.expectedCall});
  });`
    )
    .join("\n")}
});
`;
  }
}
```

---

## AI Testing Infrastructure

### 1. AI Provider Mock Framework

**Comprehensive AI Provider Mocking:**

```python
# packages/farm-testing/src/ai_mocks.py
from typing import Dict, List, Any, AsyncIterator
import asyncio
import json

class AITestSuite:
    """Comprehensive AI testing framework"""

    def __init__(self):
        self.mock_providers = {}
        self.test_scenarios = {}
        self.performance_metrics = {}

    def register_mock_provider(self, name: str, provider_mock: 'MockAIProvider'):
        """Register a mock AI provider for testing"""
        self.mock_providers[name] = provider_mock

    def create_test_scenario(self, name: str, scenario_config: Dict[str, Any]):
        """Create a test scenario for AI interactions"""
        self.test_scenarios[name] = {
            'inputs': scenario_config.get('inputs', []),
            'expected_outputs': scenario_config.get('expected_outputs', []),
            'provider': scenario_config.get('provider', 'ollama'),
            'model': scenario_config.get('model', 'llama3.1'),
            'streaming': scenario_config.get('streaming', False)
        }

    async def run_scenario(self, scenario_name: str) -> Dict[str, Any]:
        """Run a specific test scenario"""
        scenario = self.test_scenarios[scenario_name]
        provider = self.mock_providers[scenario['provider']]

        results = []
        for input_data in scenario['inputs']:
            if scenario['streaming']:
                output = []
                async for chunk in provider.chat_stream(input_data['messages'], scenario['model']):
                    output.append(chunk)
                results.append(''.join(output))
            else:
                output = await provider.chat(input_data['messages'], scenario['model'])
                results.append(output)

        return {
            'scenario': scenario_name,
            'results': results,
            'expected': scenario['expected_outputs'],
            'passed': results == scenario['expected_outputs']
        }

class MockOllamaProvider:
    """Advanced Ollama mock with realistic behavior"""

    def __init__(self):
        self.models = {}
        self.response_patterns = {}
        self.latency_config = {'min': 0.1, 'max': 2.0}
        self.error_simulation = {'rate': 0.0, 'types': []}

    def configure_model_responses(self, model: str, patterns: Dict[str, str]):
        """Configure response patterns for model"""
        self.response_patterns[model] = patterns

    def configure_latency(self, min_seconds: float, max_seconds: float):
        """Configure response latency simulation"""
        self.latency_config = {'min': min_seconds, 'max': max_seconds}

    def configure_error_simulation(self, error_rate: float, error_types: List[str]):
        """Configure error simulation for testing error handling"""
        self.error_simulation = {'rate': error_rate, 'types': error_types}

    async def chat(self, messages: List[ChatMessage], model: str, **kwargs) -> str:
        """Mock chat with realistic behavior simulation"""

        # Simulate network latency
        latency = random.uniform(self.latency_config['min'], self.latency_config['max'])
        await asyncio.sleep(latency)

        # Simulate errors if configured
        if random.random() < self.error_simulation['rate']:
            error_type = random.choice(self.error_simulation['types'])
            if error_type == 'connection':
                raise ConnectionError("Mock connection error")
            elif error_type == 'timeout':
                raise TimeoutError("Mock timeout error")

        # Generate response based on patterns
        user_message = messages[-1].content.lower()
        patterns = self.response_patterns.get(model, {})

        for pattern, response in patterns.items():
            if pattern in user_message:
                return response

        # Default response
        return f"Mock response from {model} for: {user_message}"

    async def chat_stream(self, messages: List[ChatMessage], model: str, **kwargs) -> AsyncIterator[str]:
        """Mock streaming with realistic chunking"""
        full_response = await self.chat(messages, model, **kwargs)
        words = full_response.split()

        for word in words:
            # Simulate streaming delay
            await asyncio.sleep(random.uniform(0.05, 0.2))
            yield word + " "
```

### 2. Performance Testing Framework

**AI Performance and Load Testing:**

```python
# packages/farm-testing/src/performance_testing.py
import asyncio
import time
from typing import List, Dict, Any
from concurrent.futures import ThreadPoolExecutor

class AIPerformanceTestSuite:
    """Performance testing for AI operations"""

    def __init__(self, ai_router):
        self.ai_router = ai_router
        self.metrics = {}

    async def test_response_time(self, provider: str, model: str, num_requests: int = 10) -> Dict[str, float]:
        """Test average response time for AI provider"""

        async def single_request():
            start_time = time.time()
            await self.ai_router.get_provider(provider).chat([
                ChatMessage(role="user", content="Test performance")
            ], model)
            return time.time() - start_time

        # Run concurrent requests
        tasks = [single_request() for _ in range(num_requests)]
        response_times = await asyncio.gather(*tasks)

        return {
            'average_ms': sum(response_times) / len(response_times) * 1000,
            'min_ms': min(response_times) * 1000,
            'max_ms': max(response_times) * 1000,
            'total_requests': num_requests
        }

    async def test_throughput(self, provider: str, model: str, duration_seconds: int = 60) -> Dict[str, float]:
        """Test throughput (requests per second)"""

        start_time = time.time()
        completed_requests = 0

        async def continuous_requests():
            nonlocal completed_requests
            while time.time() - start_time < duration_seconds:
                try:
                    await self.ai_router.get_provider(provider).chat([
                        ChatMessage(role="user", content=f"Request {completed_requests}")
                    ], model)
                    completed_requests += 1
                except Exception:
                    pass  # Continue testing despite errors

        # Run multiple concurrent workers
        workers = 5
        await asyncio.gather(*[continuous_requests() for _ in range(workers)])

        actual_duration = time.time() - start_time

        return {
            'requests_per_second': completed_requests / actual_duration,
            'total_requests': completed_requests,
            'duration_seconds': actual_duration
        }

    async def test_memory_usage(self, provider: str, model: str) -> Dict[str, float]:
        """Test memory usage during AI operations"""
        import psutil

        process = psutil.Process()

        # Baseline memory
        baseline_memory = process.memory_info().rss / 1024 / 1024  # MB

        # Perform AI operations
        for i in range(10):
            await self.ai_router.get_provider(provider).chat([
                ChatMessage(role="user", content=f"Memory test {i}")
            ], model)

        # Peak memory
        peak_memory = process.memory_info().rss / 1024 / 1024  # MB

        return {
            'baseline_mb': baseline_memory,
            'peak_mb': peak_memory,
            'memory_increase_mb': peak_memory - baseline_memory
        }
```

### 3. Integration Testing with Real AI Services

**Testing Against Real AI Services (Optional):**

```python
# apps/api/tests/integration/test_real_ai_services.py
import pytest
import os
from farm.ai.router import AIRouter

@pytest.mark.integration
@pytest.mark.skipif(not os.getenv('INTEGRATION_TESTS'), reason="Integration tests disabled")
class TestRealAIServices:
    """Integration tests with real AI services (when available)"""

    @pytest.fixture
    async def real_ai_router(self):
        """AI router configured for real services"""
        return AIRouter()  # Uses real configuration

    @pytest.mark.skipif(not os.getenv('OLLAMA_URL'), reason="Ollama not available")
    async def test_real_ollama_connection(self, real_ai_router):
        """Test connection to real Ollama service"""
        ollama = real_ai_router.get_provider('ollama')

        health = await ollama.health_check()
        assert health is True

        # Test simple chat
        response = await ollama.chat([
            ChatMessage(role="user", content="Hello")
        ], "llama3.1")

        assert response is not None
        assert len(response) > 0

    @pytest.mark.skipif(not os.getenv('OPENAI_API_KEY'), reason="OpenAI API key not available")
    async def test_real_openai_connection(self, real_ai_router):
        """Test connection to real OpenAI service"""
        openai = real_ai_router.get_provider('openai')

        response = await openai.chat([
            ChatMessage(role="user", content="Hello")
        ], "gpt-3.5-turbo")

        assert response is not None
        assert len(response) > 0

    async def test_provider_fallback_real(self, real_ai_router):
        """Test real provider fallback behavior"""
        # This test would verify actual fallback between services
        pass
```

---

## Test Configuration & CLI Integration

### Test Runner Configuration

**FARM Test Configuration:**

```typescript
// farm.config.ts - Testing configuration
export default defineConfig({
  testing: {
    // Framework testing (for FARM development)
    framework: {
      enabled: true,
      runner: "jest",
      coverage: {
        threshold: 80,
        exclude: ["tests/**", "**/*.test.ts"],
      },
    },

    // Application testing (for user projects)
    application: {
      enabled: true,
      autoGenerate: true,
      runners: {
        backend: "pytest",
        frontend: "jest",
        e2e: "playwright",
      },
    },

    // AI-specific testing
    ai: {
      enabled: true,
      mockProviders: true,
      performanceTesting: true,
      integrationTesting: {
        enabled: false, // Disabled by default
        providers: ["ollama"], // Only test available providers
      },
    },

    // Test generation
    generation: {
      models: true, // Generate model tests
      api: true, // Generate API tests
      components: true, // Generate component tests
      hooks: true, // Generate hook tests
      e2e: false, // E2E tests not auto-generated
    },
  },
});
```

### CLI Test Commands

**Comprehensive Test CLI:**

```bash
# Run all tests
farm test

# Run specific test suites
farm test --unit                 # Unit tests only
farm test --integration          # Integration tests only
farm test --e2e                  # E2E tests only
farm test --ai                   # AI-specific tests only

# Test generation
farm test:generate               # Generate all missing tests
farm test:generate --models      # Generate model tests only
farm test:generate --api         # Generate API tests only
farm test:generate --components  # Generate component tests only

# AI testing
farm test:ai                     # Run AI provider tests
farm test:ai --provider ollama   # Test specific provider
farm test:ai --performance      # Run AI performance tests
farm test:ai --integration      # Test real AI services (if available)

# Coverage and reporting
farm test --coverage             # Run with coverage report
farm test --watch                # Watch mode for development
farm test --verbose             # Detailed output

# Cross-stack testing
farm test:types                  # Test type consistency
farm test:contracts             # Test API contracts
farm test:pipeline              # Test code generation pipeline
```

### Test Configuration Examples

**Backend Test Configuration:**

```python
# apps/api/pytest.ini
[tool:pytest]
testpaths = tests
python_files = test_*.py
python_classes = Test*
python_functions = test_*
addopts =
    --verbose
    --tb=short
    --strict-markers
    --disable-warnings
    --cov=src
    --cov-report=html
    --cov-report=term-missing
    --cov-fail-under=80

markers =
    unit: Unit tests
    integration: Integration tests
    ai: AI-specific tests
    performance: Performance tests
    slow: Slow tests (skipped in CI)
```

**Frontend Test Configuration:**

```javascript
// apps/web/jest.config.js
module.exports = {
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/tests/setup.ts"],
  testMatch: [
    "<rootDir>/src/**/__tests__/**/*.{js,jsx,ts,tsx}",
    "<rootDir>/src/**/*.{test,spec}.{js,jsx,ts,tsx}",
  ],
  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "!src/**/*.d.ts",
    "!src/types/**/*", // Generated types excluded
    "!src/services/**/*", // Generated API client excluded
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  moduleNameMapping: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  transform: {
    "^.+\\.(ts|tsx)$": "ts-jest",
  },
};
```

---

## Continuous Integration Integration

### GitHub Actions Test Workflow

```yaml
# .github/workflows/test.yml
name: FARM Test Suite

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  framework-tests:
    runs-on: ubuntu-latest
    name: Framework Core Tests

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: "18"
          cache: "npm"

      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: "3.11"

      - name: Install dependencies
        run: |
          npm ci
          pip install -r requirements.txt

      - name: Run framework tests
        run: |
          npm test -- --coverage
          pytest --cov=src --cov-report=xml

      - name: Upload coverage
        uses: codecov/codecov-action@v3

  ai-integration-tests:
    runs-on: ubuntu-latest
    name: AI Integration Tests

    services:
      ollama:
        image: ollama/ollama:latest
        ports:
          - 11434:11434

    steps:
      - uses: actions/checkout@v3

      - name: Setup test environment
        run: |
          # Wait for Ollama to be ready
          until curl -f http://localhost:11434/api/tags; do sleep 5; done

          # Pull test model
          curl -X POST http://localhost:11434/api/pull -d '{"name": "llama3.1"}'

      - name: Run AI tests
        run: |
          farm test:ai --integration
        env:
          OLLAMA_URL: http://localhost:11434
          INTEGRATION_TESTS: true

  e2e-tests:
    runs-on: ubuntu-latest
    name: End-to-End Tests

    steps:
      - uses: actions/checkout@v3

      - name: Setup environment
        run: |
          docker-compose up -d
          npm ci
          npx playwright install

      - name: Run E2E tests
        run: |
          npm run test:e2e

      - name: Upload test results
        uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```

---

_Status: ✅ Completed - Ready for implementation_
