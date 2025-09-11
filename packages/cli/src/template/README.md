# FARM Framework Template System - Single Source of Truth

This directory contains the single source of truth for all template variables, helpers, and validation logic in the FARM Framework.

## Overview

The template system has been refactored to provide a centralized, authoritative specification for all available template variables and Handlebars helpers. This eliminates confusion and ensures consistent error handling across the entire framework.

## Key Files

### 1. `template-specification.ts` - The Single Source of Truth

This file defines:
- **TEMPLATE_VARIABLES**: All available context variables with types, descriptions, and examples
- **TEMPLATE_HELPERS**: All available Handlebars helpers organized by category
- **HELPER_ALIASES**: Mapping of common variable names to their corresponding helpers
- **Validation functions**: Helper functions for checking validity and generating suggestions

### 2. `validation-schema.ts` - JSON Schema Definitions

Provides JSON Schema definitions for:
- Template context validation
- Helper validation
- Complete specification schema
- Runtime schema generation

### 3. `error-handler.ts` - Enhanced Error Handling

Updated to use the template specification for:
- Better error suggestions
- Consistent error messages
- Authoritative helper validation

### 4. `helpers.ts` - Helper Registration

Contains all Handlebars helper implementations, including:
- Original framework helpers
- New missing helper aliases for backward compatibility

### 5. `validator.ts` - Template Validation

Updated to use the authoritative helper list from the specification.

## Available Template Variables

### Core Variables (Required)
- `projectName`: The project name (camelCase)
- `template`: The template name being used
- `database`: The database type selected
- `features`: Array of selected features
- `timestamp`: ISO timestamp of project creation
- `farmVersion`: FARM framework version

### Optional Variables
- `description`: Project description
- `author`: Project author name
- `environment`: Target environment (development/staging/production)
- `typescript`: Whether TypeScript is enabled
- `docker`: Whether Docker is enabled
- `git`: Whether Git is enabled
- `install`: Whether to install dependencies
- `testing`: Whether testing is enabled
- `interactive`: Whether CLI is running in interactive mode
- `verbose`: Whether verbose output is enabled
- `setupScript`: Whether to generate setup scripts

## Available Handlebars Helpers

### Built-in Handlebars Helpers
- `if`, `unless`, `each`, `with`, `lookup`, `log`

### Comparison Helpers
- `eq`, `ne`, `gt`, `lt`, `gte`, `lte`, `and`, `or`, `not`

### String Manipulation
- `capitalize`, `lowercase`, `uppercase`, `kebab_case`, `snake_case`, `camel_case`, `pascal_case`, `pluralize`, `join`, `length`

### Project Name Helpers
- `project_name`, `project_name_kebab`, `project_name_snake`, `project_name_camel`, `project_name_pascal`

### Feature Detection
- `if_feature`, `unless_feature`, `has_features`

### Database Detection
- `if_database`, `unless_database`, `is_mongodb`, `is_postgresql`, `is_mysql`, `is_sqlite`

### Template Detection
- `if_template`, `is_basic`, `is_ai_chat`, `is_ai_dashboard`, `is_ecommerce`, `is_cms`, `is_api_only`

### Environment Detection
- `if_env`, `is_development`, `is_production`, `is_staging`

### AI Provider Detection
- `if_ai_provider`, `has_ollama`, `has_openai`, `has_huggingface`, `has_ai_enabled`

### Utility Helpers
- `default`, `get_config`, `json`, `debug`, `timestamp`, `year`, `has_typescript`, `has_docker`, `has_testing`, `if_plugin`

### Template Processing
- `switch`, `case`, `indent`, `comment`, `import_path`, `validate_name`, `lazy`

### Backward Compatibility Aliases
- `projectName`, `projectNameKebab`, `author`, `description`, `template`, `database`, `now`, `name`, `ai`, `this`

## Error Handling Improvements

### Before
- Inconsistent error messages
- Poor suggestions for missing helpers
- Hardcoded helper lists in multiple places
- No single source of truth

### After
- Consistent error messages using the specification
- Intelligent suggestions based on similarity and aliases
- Single authoritative helper list
- Centralized validation logic

## Usage Examples

### Checking if a helper is valid
```typescript
import { isValidHelper } from './template-specification.js';

if (!isValidHelper('projectName')) {
  console.log('Helper not found, but projectName is available as an alias');
}
```

### Getting suggestions for missing helpers
```typescript
import { getHelperSuggestions } from './template-specification.js';

const suggestions = getHelperSuggestions('projectNameKebab');
// Returns: ['project_name_kebab', 'project_name', 'kebab_case']
```

### Generating error messages
```typescript
import { generateErrorMessage } from './template-specification.js';

const error = generateErrorMessage('helper', 'projectName', { 
  filePath: 'template.hbs', 
  line: 5 
});
```

### Validating template context
```typescript
import { TEMPLATE_CONTEXT_SCHEMA } from './validation-schema.js';

// Use with any JSON Schema validator
const isValid = validate(context, TEMPLATE_CONTEXT_SCHEMA);
```

## Migration Guide

### For Template Authors
1. **Use the new helper aliases**: Templates can now use `{{projectName}}` instead of `{{project_name}}`
2. **Check error messages**: Error messages now provide better suggestions
3. **Reference the specification**: Use the schema files for IDE support

### For Developers
1. **Import from specification**: Use functions from `template-specification.ts` instead of hardcoded lists
2. **Update error handling**: Use the new error generation functions
3. **Validate consistently**: Use the centralized validation logic

## Benefits

1. **Single Source of Truth**: All template variables and helpers are defined in one place
2. **Better Error Messages**: More helpful suggestions and consistent formatting
3. **Backward Compatibility**: Existing templates continue to work with new aliases
4. **IDE Support**: JSON schemas enable better editor support
5. **Maintainability**: Changes to helpers/variables only need to be made in one place
6. **Documentation**: Self-documenting code with comprehensive examples

## Future Enhancements

1. **IDE Extensions**: Create VS Code extensions using the JSON schemas
2. **Template Linting**: Build linting rules based on the specification
3. **Auto-completion**: Generate auto-completion data from the specification
4. **Documentation Generation**: Auto-generate documentation from the specification
5. **Testing**: Automated tests to ensure specification accuracy

## Error Log Analysis Results

Based on the analysis of `template-logs/error-log.json`, the most common missing helpers were:

1. `else` (47 occurrences) - Now handled as part of if/unless blocks
2. `projectName` (36 occurrences) - Now available as helper alias
3. `database` (11 occurrences) - Now available as helper alias
4. `ai` (11 occurrences) - Now available as helper alias
5. `name` (10 occurrences) - Now available as helper alias
6. `now` (8 occurrences) - Now available as helper alias
7. `author` (6 occurrences) - Now available as helper alias
8. `description` (5 occurrences) - Now available as helper alias

All of these have been addressed in the new system.
