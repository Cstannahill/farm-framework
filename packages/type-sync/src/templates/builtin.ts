/**
 * Built-in templates for common code generation patterns
 * Provides ready-to-use templates for various frameworks and use cases
 */

export const BUILTIN_TEMPLATES: Record<string, string> = {
  // React Query hooks template
  "react-query-hooks": `
\{{#each operations}}
/**
 * \{{#if summary}}\{{summary}}\{{else}}\{{operationId}} hook\{{/if}}
 \{{#if description}} * \{{description}}\{{/if}}
 */
export function use\{{pascalCase operationId}}(
  \{{#if hasParameters}}params: \{{operationId}}Params,\{{/if}}
  options?: UseQueryOptions<\{{responseType}}, Error>
) {
  return useQuery({
    queryKey: ['\{{operationId}}'\{{#if hasParameters}}, params\{{/if}}],
    queryFn: () => client.\{{camelCase operationId}}(\{{#if hasParameters}}params\{{/if}}),
    ...options
  });
}

\{{#if (eq method 'post')}}
/**
 * Mutation hook for \{{operationId}}
 */
export function use\{{pascalCase operationId}}Mutation(
  options?: UseMutationOptions<\{{responseType}}, Error, \{{#if requestBodyType}}\{{requestBodyType}}\{{else}}void\{{/if}}>
) {
  return useMutation({
    mutationFn: (data: \{{#if requestBodyType}}\{{requestBodyType}}\{{else}}void\{{/if}}) => 
      client.\{{camelCase operationId}}(data),
    ...options
  });
}
\{{/if}}

\{{/each}}
`,

  // Zustand store template
  "zustand-store": `
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
\{{#each schemas}}
import type { \{{name}} } from './types';
\{{/each}}

export interface \{{storeName}}State {
  {{#each stateProperties}}
  {{name}}: {{type}};
  {{/each}}
  
  // Actions
  {{#each actions}}
  {{name}}: ({{#each parameters}}{{name}}: {{type}}{{#unless @last}}, {{/unless}}{{/each}}) => {{returnType}};
  {{/each}}
}

export const use{{storeName}} = create<{{storeName}}State>()(
  devtools(
    persist(
      (set, get) => ({
        {{#each stateProperties}}
        {{name}}: {{defaultValue}},
        {{/each}}
        
        {{#each actions}}
        {{name}}: ({{#each parameters}}{{name}}{{#unless @last}}, {{/unless}}{{/each}}) => {
          {{body}}
        },
        {{/each}}
      }),
      {
        name: '{{kebabCase storeName}}-storage',
        {{#if persistedKeys}}
        partialize: (state) => ({
          {{#each persistedKeys}}
          {{.}}: state.{{.}},
          {{/each}}
        }),
        {{/if}}
      }
    ),
    {
      name: '{{storeName}}',
    }
  )
);
`,

  // Redux Toolkit slice template
  "redux-toolkit-slice": `
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
{{#each schemas}}
import type { {{name}} } from './types';
{{/each}}

// Async thunks
{{#each asyncActions}}
export const {{name}} = createAsyncThunk(
  '{{../sliceName}}/{{name}}',
  async ({{#if hasPayload}}payload: {{payloadType}}{{/if}}) => {
    {{body}}
  }
);
{{/each}}

export interface {{sliceName}}State {
  {{#each stateProperties}}
  {{name}}: {{type}};
  {{/each}}
  loading: boolean;
  error: string | null;
}

const initialState: {{sliceName}}State = {
  {{#each stateProperties}}
  {{name}}: {{defaultValue}},
  {{/each}}
  loading: false,
  error: null,
};

const {{camelCase sliceName}}Slice = createSlice({
  name: '{{sliceName}}',
  initialState,
  reducers: {
    {{#each syncActions}}
    {{name}}: (state, action: PayloadAction<{{payloadType}}>) => {
      {{body}}
    },
    {{/each}}
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    {{#each asyncActions}}
    builder
      .addCase({{name}}.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase({{name}}.fulfilled, (state, action) => {
        state.loading = false;
        {{fulfilledBody}}
      })
      .addCase({{name}}.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'An error occurred';
      });
    {{/each}}
  },
});

export const { {{#each syncActions}}{{name}}{{#unless @last}}, {{/unless}}{{/each}}, clearError } = {{camelCase sliceName}}Slice.actions;
export default {{camelCase sliceName}}Slice.reducer;
`,

  // Vue Composition API template
  "vue-composables": `
<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue';
import { useQuery, useMutation } from '@tanstack/vue-query';
{{#each schemas}}
import type { {{name}} } from './types';
{{/each}}

{{#each operations}}
/**
 * Composable for {{operationId}}
 */
export function use{{pascalCase operationId}}({{#if hasParameters}}params: Ref<{{operationId}}Params>{{/if}}) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['{{operationId}}'{{#if hasParameters}}, params{{/if}}],
    queryFn: () => client.{{camelCase operationId}}({{#if hasParameters}}params.value{{/if}}),
    {{#if hasParameters}}enabled: computed(() => !!params.value),{{/if}}
  });

  return {
    data,
    isLoading,
    error,
    refetch,
  };
}

{{#if (eq method 'post')}}
/**
 * Mutation composable for {{operationId}}
 */
export function use{{pascalCase operationId}}Mutation() {
  return useMutation({
    mutationFn: (data: {{#if requestBodyType}}{{requestBodyType}}{{else}}void{{/if}}) => 
      client.{{camelCase operationId}}(data),
  });
}
{{/if}}

{{/each}}
</script>
`,

  // Svelte stores template
  "svelte-stores": `
import { writable, derived, get } from 'svelte/store';
import type { Writable, Derived } from 'svelte/store';
{{#each schemas}}
import type { {{name}} } from './types';
{{/each}}

\{{#each stores}}
// \{{name}} store
export const \{{camelCase name}}: Writable<\{{type}}> = writable(\{{defaultValue}});

\{{#each derivedStores}}
export const \{{camelCase name}}: Derived<\{{type}}> = derived(
  [\{{#each dependencies}}\{{camelCase .}}\{{#unless @last}}, \{{/unless}}\{{/each}}],
  ([\{{#each dependencies}}$\{{camelCase .}}\{{#unless @last}}, \{{/unless}}\{{/each}}]) => {
    \{{body}}
  }
);
\{{/each}}

{{#if hasActions}}
// Actions for {{name}}
export const {{camelCase name}}Actions = {
  {{#each actions}}
  {{name}}: ({{#each parameters}}{{name}}: {{type}}{{#unless @last}}, {{/unless}}{{/each}}) => {
    {{camelCase ../name}}.{{operation}}({{body}});
  },
  {{/each}}
};
{{/if}}

{{/each}}
`,

  // Express.js middleware template
  "express-middleware": `
import { Request, Response, NextFunction } from 'express';
{{#each schemas}}
import type { {{name}} } from './types';
{{/each}}

{{#each middlewares}}
/**
 * {{description}}
 */
export function {{camelCase name}}(
  req: Request{{#if hasCustomRequest}} & { {{customRequestProperties}} }{{/if}},
  res: Response{{#if hasCustomResponse}}<{{responseType}}>{{/if}},
  next: NextFunction
): {{returnType}} {
  {{body}}
}

{{/each}}

// Validation middleware
{{#each validationMiddlewares}}
export function validate{{pascalCase schemaName}}(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const validatedData = {{schemaName}}Schema.parse(req.{{sourceProperty}});
    req.{{targetProperty}} = validatedData;
    next();
  } catch (error) {
    res.status(400).json({
      error: 'Validation failed',
      details: error.errors
    });
  }
}
{{/each}}
`,

  // FastAPI Python client template
  "python-client": `
"""
Generated Python client for {{serviceName}}
"""

import httpx
from typing import Optional, Dict, Any, List, Union
from pydantic import BaseModel, ValidationError
{{#each schemas}}
from .models import {{name}}
{{/each}}

class {{clientName}}Error(Exception):
    """Base exception for {{clientName}}"""
    pass

class {{clientName}}ValidationError({{clientName}}Error):
    """Validation error"""
    pass

class {{clientName}}HTTPError({{clientName}}Error):
    """HTTP error"""
    pass

class {{clientName}}:
    """
    Generated client for {{serviceName}}
    """
    
    def __init__(
        self,
        base_url: str = "{{baseUrl}}",
        timeout: float = 30.0,
        headers: Optional[Dict[str, str]] = None,
    ):
        self.base_url = base_url.rstrip('/')
        self.client = httpx.Client(
            base_url=self.base_url,
            timeout=timeout,
            headers=headers or {}
        )
    
    def __enter__(self):
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        self.client.close()
    
    def close(self):
        """Close the HTTP client"""
        self.client.close()
    
    {{#each operations}}
    def {{snake_case operationId}}(
        self,
        {{#each parameters}}
        {{snake_case name}}: {{pythonType}}{{#if optional}} = None{{/if}},
        {{/each}}
        {{#if hasRequestBody}}
        data: {{requestBodyType}},
        {{/if}}
    ) -> {{responseType}}:
        """
        {{#if summary}}{{summary}}{{/if}}
        {{#if description}}
        
        {{description}}
        {{/if}}
        """
        {{#if hasParameters}}
        params = {}
        {{#each parameters}}
        {{#if (eq in 'query')}}
        if {{snake_case name}} is not None:
            params['{{name}}'] = {{snake_case name}}
        {{/if}}
        {{/each}}
        {{/if}}
        
        {{#if hasPathParameters}}
        path_params = {
            {{#each parameters}}
            {{#if (eq in 'path')}}
            '{{name}}': {{snake_case name}},
            {{/if}}
            {{/each}}
        }
        url = "{{path}}".format(**path_params)
        {{else}}
        url = "{{path}}"
        {{/if}}
        
        try:
            response = self.client.{{method}}(
                url,
                {{#if hasParameters}}params=params,{{/if}}
                {{#if hasRequestBody}}json=data.dict() if hasattr(data, 'dict') else data,{{/if}}
            )
            response.raise_for_status()
            
            {{#if (eq responseType 'None')}}
            return None
            {{else}}
            return {{responseType}}.parse_obj(response.json())
            {{/if}}
            
        except httpx.HTTPStatusError as e:
            raise {{clientName}}HTTPError(f"HTTP {e.response.status_code}: {e.response.text}")
        except ValidationError as e:
            raise {{clientName}}ValidationError(f"Response validation failed: {e}")
        except Exception as e:
            raise {{clientName}}Error(f"Request failed: {e}")
    
    {{/each}}
`,

  // GraphQL resolver template
  "graphql-resolvers": `
import { Resolver, Query, Mutation, Arg, Ctx, FieldResolver, Root } from 'type-graphql';
{{#each schemas}}
import { {{name}} } from './types';
{{/each}}

{{#each resolvers}}
@Resolver({{ofType}})
export class {{name}}Resolver {
  {{#each queries}}
  @Query(() => {{returnType}})
  async {{name}}(
    {{#each args}}
    @Arg('{{name}}') {{name}}: {{type}},
    {{/each}}
    @Ctx() ctx: Context
  ): Promise<{{returnType}}> {
    {{body}}
  }
  {{/each}}

  {{#each mutations}}
  @Mutation(() => {{returnType}})
  async {{name}}(
    {{#each args}}
    @Arg('{{name}}') {{name}}: {{type}},
    {{/each}}
    @Ctx() ctx: Context
  ): Promise<{{returnType}}> {
    {{body}}
  }
  {{/each}}

  {{#each fieldResolvers}}
  @FieldResolver(() => {{returnType}})
  async {{name}}(
    @Root() {{camelCase ../ofType}}: {{../ofType}},
    {{#each args}}
    @Arg('{{name}}') {{name}}: {{type}},
    {{/each}}
    @Ctx() ctx: Context
  ): Promise<{{returnType}}> {
    {{body}}
  }
  {{/each}}
}
{{/each}}
`,

  // Test fixtures template
  "test-fixtures": `
{{#each schemas}}
/**
 * Test fixtures for {{name}}
 */
export const {{camelCase name}}Fixtures = {
  valid: {
    {{#each validExamples}}
    {{name}}: {{json .}} as {{../name}},
    {{/each}}
  },
  
  invalid: {
    {{#each invalidExamples}}
    {{name}}: {{json .}},
    {{/each}}
  },
  
  // Factory function
  create: (overrides: Partial<{{name}}> = {}): {{name}} => ({
    {{#each properties}}
    {{name}}: {{defaultValue}},
    {{/each}}
    ...overrides
  }),
  
  // Mock data generator
  generate: (count: number = 1): {{name}}[] => {
    return Array.from({ length: count }, (_, i) => ({
      {{#each properties}}
      {{name}}: {{mockValue i}},
      {{/each}}
    }));
  }
};

{{/each}}

// Combined fixtures
export const testFixtures = {
  {{#each schemas}}
  {{camelCase name}}: {{camelCase name}}Fixtures,
  {{/each}}
};

// Setup helpers
export function setupTestData() {
  return {
    {{#each schemas}}
    {{camelCase name}}: {{camelCase name}}Fixtures.create(),
    {{/each}}
  };
}

export function cleanupTestData() {
  // Cleanup logic here
}
`,
};

/**
 * Template metadata for better discovery and usage
 */
export const TEMPLATE_METADATA = {
  "react-query-hooks": {
    name: "React Query Hooks",
    description: "Generates React Query hooks for API operations",
    category: "React",
    dependencies: ["@tanstack/react-query"],
    language: "typescript",
    framework: "react",
  },

  "zustand-store": {
    name: "Zustand Store",
    description: "Creates Zustand store with TypeScript support",
    category: "State Management",
    dependencies: ["zustand"],
    language: "typescript",
    framework: "react",
  },

  "redux-toolkit-slice": {
    name: "Redux Toolkit Slice",
    description: "Generates Redux Toolkit slice with async thunks",
    category: "State Management",
    dependencies: ["@reduxjs/toolkit"],
    language: "typescript",
    framework: "react",
  },

  "vue-composables": {
    name: "Vue Composables",
    description: "Creates Vue 3 composables with Composition API",
    category: "Vue",
    dependencies: ["vue", "@tanstack/vue-query"],
    language: "typescript",
    framework: "vue",
  },

  "svelte-stores": {
    name: "Svelte Stores",
    description: "Generates Svelte stores and actions",
    category: "Svelte",
    dependencies: ["svelte"],
    language: "typescript",
    framework: "svelte",
  },

  "express-middleware": {
    name: "Express Middleware",
    description: "Creates Express.js middleware with validation",
    category: "Backend",
    dependencies: ["express"],
    language: "typescript",
    framework: "express",
  },

  "python-client": {
    name: "Python Client",
    description: "Generates Python client using httpx and Pydantic",
    category: "Client",
    dependencies: ["httpx", "pydantic"],
    language: "python",
    framework: null,
  },

  "graphql-resolvers": {
    name: "GraphQL Resolvers",
    description: "Creates TypeGraphQL resolvers",
    category: "GraphQL",
    dependencies: ["type-graphql"],
    language: "typescript",
    framework: "graphql",
  },

  "test-fixtures": {
    name: "Test Fixtures",
    description: "Generates test fixtures and mock data",
    category: "Testing",
    dependencies: [],
    language: "typescript",
    framework: null,
  },
};

/**
 * Get templates by category
 */
export function getTemplatesByCategory(category: string): string[] {
  return Object.entries(TEMPLATE_METADATA)
    .filter(([, metadata]) => metadata.category === category)
    .map(([templateName]) => templateName);
}

/**
 * Get template by framework
 */
export function getTemplatesByFramework(framework: string): string[] {
  return Object.entries(TEMPLATE_METADATA)
    .filter(([, metadata]) => metadata.framework === framework)
    .map(([templateName]) => templateName);
}

/**
 * Get template dependencies
 */
export function getTemplateDependencies(templateName: string): string[] {
  return (
    (TEMPLATE_METADATA as Record<string, any>)[templateName]?.dependencies || []
  );
}

/**
 * Validate template exists
 */
export function isValidTemplate(templateName: string): boolean {
  return templateName in BUILTIN_TEMPLATES;
}

export default BUILTIN_TEMPLATES;
