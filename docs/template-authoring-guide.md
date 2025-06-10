# FARM Framework Template Authoring Guidelines

This document provides comprehensive guidelines for creating and maintaining templates in the FARM framework.

## Template Structure

### Directory Organization

```
templates/
├── basic/                    # Basic full-stack template
├── ai-chat/                 # AI-powered chat application
├── ai-dashboard/            # AI analytics dashboard
├── ecommerce/               # E-commerce platform
├── cms/                     # Content management system
├── api-only/                # Backend-only template
└── frontend/                # Frontend-only templates
    ├── basic/
    └── advanced/
```

### Required Files

Every template must include:

- `package.json.hbs` - Project configuration
- `farm.config.ts.hbs` - FARM framework configuration
- `README.md.hbs` - Documentation
- `.gitignore.hbs` - Git ignore patterns

### File Naming Conventions

- Use lowercase with hyphens: `user-profile.component.tsx.hbs`
- Add `.hbs` extension to template files: `config.ts.hbs`
- Use descriptive names that reflect the file's purpose
- Group related files in directories: `components/`, `pages/`, `utils/`

## Handlebars Syntax

### Available Helpers

#### Feature Checking

```handlebars
{{#if_feature "ai"}}
  // AI-specific code
{{/if_feature}}

{{#unless_feature "auth"}}
  // Code when auth is disabled
{{/unless_feature}}

{{#has_features}}
  // Code when any features are enabled
{{/has_features}}
```

#### Template Type Checking

```handlebars
{{#if_template "ai-chat"}}
  // AI chat specific code
{{/if_template}}

{{#is_basic}}
  // Basic template specific code
{{/is_basic}}
```

#### Database Helpers

```handlebars
{{#if_database "mongodb"}}
  // MongoDB specific configuration
{{/if_database}}

{{#is_postgresql}}
  // PostgreSQL specific code
{{/is_postgresql}}
```

#### AI Provider Helpers

```handlebars
{{#has_ollama}}
  // Ollama configuration
{{/has_ollama}}

{{#if_ai_provider "openai"}}
  // OpenAI specific setup
{{/if_ai_provider}}
```

#### String Manipulation

```handlebars
{{kebab_case projectName}}
// my-project
{{snake_case projectName}}
// my_project
{{camel_case projectName}}
// myProject
{{pascal_case projectName}}
// MyProject
{{capitalize projectName}}
// My project
{{lowercase projectName}}
// my project
{{uppercase projectName}}
// MY PROJECT
```

#### Project Helpers

```handlebars
{{project_name}}
// Original project name
{{project_name_kebab}}
// kebab-case version
{{project_name_snake}}
// snake_case version
{{project_name_camel}}
// camelCase version
{{project_name_pascal}}
// PascalCase version
```

#### Array and Object Helpers

```handlebars
{{join features ", "}}
// Join array with separator
{{length features}}
// Array length
{{#includes features "ai"}}
  // Check if array includes value
{{/includes}}
```

#### Logic Helpers

```handlebars
{{#and condition1 condition2}}
  // Logical AND
{{/and}}

{{#or condition1 condition2}}
  // Logical OR
{{/or}}

{{#not condition}}
  // Logical NOT
{{/not}}

{{#eq value1 value2}}
  // Equality check
{{/eq}}

{{#gt number1 number2}}
  // Greater than
{{/gt}}
```

#### Environment Helpers

```handlebars
{{#is_development}}
  // Development environment code
{{/is_development}}

{{#if_env "production"}}
  // Production specific code
{{/if_env}}
```

#### Utility Helpers

```handlebars
{{timestamp}}
// Current ISO timestamp
{{year}}
// Current year
{{farm_version}}
// FARM framework version
{{default value "fallback"}}
// Default value if empty
{{json object}}
// JSON stringify
```

### Advanced Helpers

#### Switch/Case Logic

```handlebars
{{#switch database.type}}
  {{#case "mongodb"}}
    mongodb://localhost:27017/{{project_name_snake}}
  {{/case}}
  {{#case "postgresql"}}
    postgresql://localhost:5432/{{project_name_snake}}
  {{/case}}
{{/switch}}
```

#### Code Formatting

```handlebars
{{indent code 4}}
// Indent code by 4 spaces
{{comment "This is a comment" "js"}}
// Add language-specific comment
{{import_path "./utils" true}}
// Format import path
```

#### Validation

```handlebars
{{#validate_name projectName}}
  // Valid project name
{{else}}
  // Invalid project name
{{/validate_name}}
```

## Best Practices

### 1. Conditional File Generation

Use file path patterns to conditionally include files:

```
apps/web/                          # Skip for api-only template
src/ai/                           # Only for AI features
src/auth/                         # Only for auth features
```

### 2. Feature-Driven Development

Structure templates around features:

```handlebars
{{#if_feature "ai"}}
  import { AIProvider } from '@farm/ai';
{{/if_feature}}

{{#if_feature "auth"}}
  import { AuthProvider } from '@farm/auth';
{{/if_feature}}
```

### 3. Configuration Management

Use nested configuration objects:

```handlebars
// AI configuration
{{#if_feature "ai"}}
  ai: { providers: {
  {{#has_ollama}}
    ollama: { enabled: true, url: 'http://localhost:11434', models: [{{#each
      ai.providers.ollama.models
    }}'{{this}}'{{#unless @last}}, {{/unless}}{{/each}}] },
  {{/has_ollama}}
  {{#has_openai}}
    openai: { enabled: true, apiKey: process.env.OPENAI_API_KEY, models: [{{#each
      ai.providers.openai.models
    }}'{{this}}'{{#unless @last}}, {{/unless}}{{/each}}] }
  {{/has_openai}}
  } },
{{/if_feature}}
```

### 4. Performance Optimization

- Keep templates under 10KB when possible
- Limit nesting depth to 5 levels
- Use partials for repeated code
- Cache complex computations in helpers

### 5. Error Handling

Always provide fallbacks:

```handlebars
{{#if projectName}}
  "name": "{{projectName}}",
{{else}}
  "name": "farm-app",
{{/if}}
```

### 6. Documentation

Include comments in templates:

```handlebars
{{! Database configuration based on selected type }}
{{#switch database.type}}
  {{#case "mongodb"}}
    {{! MongoDB connection string }}
    "url": "mongodb://localhost:27017/{{project_name_snake}}"
  {{/case}}
{{/switch}}
```

## Template Development Workflow

### 1. Create Template Structure

```bash
mkdir templates/my-template
cd templates/my-template
```

### 2. Add Required Files

```bash
touch package.json.hbs
touch farm.config.ts.hbs
touch README.md.hbs
touch .gitignore.hbs
```

### 3. Implement Template Logic

Start with basic structure, then add conditional logic:

```handlebars
{ "name": "{{project_name_kebab}}", "version": "0.1.0", "scripts": {
{{#unless (eq template "api-only")}}
  "dev": "concurrently \"npm run dev:api\" \"npm run dev:web\"", "dev:web": "cd
  apps/web && npm run dev",
{{/unless}}
"dev:api": "cd apps/api && uvicorn src.main:app --reload" } }
```

### 4. Test Template

```bash
# Validate template syntax
farm validate-template my-template

# Generate test project
farm create test-project --template my-template --features ai,auth
```

### 5. Performance Testing

```bash
# Test with large projects
farm create large-project --template my-template --features ai,auth,realtime,payments

# Measure generation time
time farm create perf-test --template my-template
```

## Debugging Templates

### 1. Syntax Validation

Use the template validator:

```bash
farm validate-template my-template --strict
```

### 2. Debug Helpers

Add debug output to templates:

```handlebars
{{debug features}}
// Log features array
{{log "Processing AI config"}}
// Log message
```

### 3. Dry Run Generation

Test without creating files:

```bash
farm create test-project --template my-template --dry-run
```

### 4. Verbose Output

Get detailed generation information:

```bash
farm create test-project --template my-template --verbose
```

## Common Patterns

### 1. Package.json Dependencies

```handlebars
"dependencies": { "@farm/core": "^1.0.0"
{{#if_feature "ai"}}, "@farm/ai": "^1.0.0"
{{/if_feature}}
{{#if_feature "auth"}}, "@farm/auth": "^1.0.0"
{{/if_feature}}
}
```

### 2. Import Statements

```handlebars
{{#if_feature "ai"}}
  import { AIHooks } from '@farm/ai';
{{/if_feature}}
{{#if_feature "auth"}}
  import { useAuth } from '@farm/auth';
{{/if_feature}}
```

### 3. Environment Variables

```handlebars
# Database DATABASE_URL={{database.url}}

{{#if_feature "ai"}}
  # AI Configuration
  {{#has_ollama}}
    OLLAMA_URL=http://localhost:11434
  {{/has_ollama}}
  {{#has_openai}}
    OPENAI_API_KEY=your_openai_key_here
  {{/has_openai}}
{{/if_feature}}
```

### 4. Configuration Files

```handlebars
export default defineConfig({ name: '{{project_name}}', features: [{{#each
  features
}}'{{this}}'{{#unless @last}}, {{/unless}}{{/each}}],

{{#if_feature "ai"}}
  ai: { providers: {
  {{#has_ollama}}
    ollama: { enabled: true, models: [{{#each
      ai.providers.ollama.models
    }}'{{this}}'{{#unless @last}}, {{/unless}}{{/each}}] }
  {{/has_ollama}}
  } },
{{/if_feature}}

database: { type: '{{database.type}}', url: process.env.DATABASE_URL } });
```

## Performance Guidelines

### Template Size Limits

- Individual templates: < 10KB
- Total template directory: < 1MB
- Maximum nesting depth: 5 levels
- Maximum helpers per template: 50

### Optimization Techniques

1. **Use Partials**: Break large templates into reusable parts
2. **Cache Complex Logic**: Move complex computations to helpers
3. **Minimize Conditionals**: Reduce branching complexity
4. **Lazy Loading**: Use lazy helper for expensive operations

### Memory Management

- Clear template cache periodically
- Limit concurrent template processing
- Use streaming for large file generation

## Security Considerations

### Input Validation

Always validate user input in templates:

```handlebars
{{#validate_name projectName}}
  "name": "{{projectName}}"
{{else}}
  "name": "farm-app"
{{/validate_name}}
```

### Path Traversal Prevention

Never use user input directly in file paths:

```handlebars
<!-- Bad -->
{{userInput}}/config.json

<!-- Good -->
config/{{kebab_case userInput}}.json
```

### Environment Variable Security

Don't expose sensitive data in templates:

```handlebars
<!-- Bad -->
API_KEY={{apiKey}}

<!-- Good -->
API_KEY=your_api_key_here
```

## Maintenance

### Regular Updates

1. Update helper documentation
2. Test templates with new framework versions
3. Validate against security best practices
4. Performance testing with large projects

### Deprecation Process

1. Mark deprecated features in templates
2. Provide migration guides
3. Maintain backward compatibility for 2 major versions
4. Remove deprecated features with clear warnings

### Version Control

- Tag template versions with framework releases
- Maintain compatibility matrix
- Document breaking changes
- Provide upgrade instructions

## Advanced Topics

### Custom Helper Development

Create specialized helpers for complex logic:

```typescript
// In helpers.ts
handlebars.registerHelper("generate_api_routes", (endpoints) => {
  return endpoints
    .map(
      (endpoint) =>
        `app.${endpoint.method.toLowerCase()}('${endpoint.path}', ${endpoint.handler});`
    )
    .join("\n");
});
```

### Template Inheritance

Use partials for template inheritance:

```handlebars
<!-- base.hbs -->
<!DOCTYPE html>
<html>
<head>
  {{> head}}
</head>
<body>
  {{> body}}
</body>
</html>
```

### Dynamic Content Generation

Generate content based on external data:

```handlebars
{{#each endpoints}}
  //
  {{capitalize method}}
  {{path}}
  app.{{lowercase method}}('{{path}}', async (req, res) => { // Implementation
  for
  {{description}}
  {{#if_feature "auth"}}
    const user = await authenticateUser(req);
  {{/if_feature}}

  {{#switch method}}
    {{#case "GET"}}
      const data = await get{{pascal_case name}}(); res.json(data);
    {{/case}}
    {{#case "POST"}}
      const result = await create{{pascal_case name}}(req.body);
      res.status(201).json(result);
    {{/case}}
  {{/switch}}
  });

{{/each}}
```

This comprehensive guide ensures consistent, maintainable, and efficient template development in the FARM framework.
