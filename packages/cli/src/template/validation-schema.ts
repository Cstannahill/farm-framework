// packages/cli/src/template/validation-schema.ts
/**
 * JSON Schema for template validation
 * This schema can be used by external tools and IDEs to validate template context
 */

import { TEMPLATE_VARIABLES, TEMPLATE_HELPERS, getAllHelpers, getAllVariables } from "./template-specification.js";

/**
 * JSON Schema for template context validation
 */
export const TEMPLATE_CONTEXT_SCHEMA = {
    $schema: "http://json-schema.org/draft-07/schema#",
    $id: "https://farm-framework.dev/schemas/template-context.json",
    title: "FARM Framework Template Context",
    description: "Schema for validating template context variables and helpers",
    type: "object",
    properties: {
        // Core project properties
        projectName: {
            type: "string",
            description: "The project name (camelCase)",
            examples: ["myApp", "farmProject"],
            minLength: 1
        },
        name: {
            type: "string",
            description: "Alias for projectName",
            minLength: 1
        },
        template: {
            type: "string",
            description: "The template name being used",
            enum: ["basic", "ai-chat", "ai-dashboard", "ecommerce", "cms", "api-only"],
            examples: ["basic", "ai-chat", "ai-dashboard"]
        },
        database: {
            type: "string",
            description: "The database type selected",
            enum: ["mongodb", "postgresql", "mysql", "sqlite"],
            examples: ["mongodb", "postgresql"]
        },
        features: {
            type: "array",
            description: "Array of selected features",
            items: {
                type: "string",
                enum: [
                    "auth", "api", "ai", "realtime", "payments", "email",
                    "storage", "search", "analytics", "testing", "docker", "typescript"
                ]
            },
            examples: [["auth", "api"], ["ai", "realtime"]]
        },

        // Optional metadata
        description: {
            type: "string",
            description: "Project description",
            examples: ["A modern web application", "AI-powered chat system"]
        },
        author: {
            type: "string",
            description: "Project author name",
            examples: ["John Doe", "Jane Smith"]
        },
        environment: {
            type: "string",
            description: "Target environment",
            enum: ["development", "staging", "production"],
            default: "development"
        },

        // Timestamps and versions
        timestamp: {
            type: "string",
            format: "date-time",
            description: "ISO timestamp of project creation",
            examples: ["2024-01-15T10:30:00.000Z"]
        },
        farmVersion: {
            type: "string",
            description: "FARM framework version",
            pattern: "^\\d+\\.\\d+\\.\\d+$",
            examples: ["1.0.0", "1.2.3"]
        },

        // Development flags
        typescript: {
            type: "boolean",
            description: "Whether TypeScript is enabled",
            default: true
        },
        docker: {
            type: "boolean",
            description: "Whether Docker is enabled",
            default: true
        },
        git: {
            type: "boolean",
            description: "Whether Git is enabled",
            default: true
        },
        install: {
            type: "boolean",
            description: "Whether to install dependencies",
            default: true
        },
        testing: {
            type: "boolean",
            description: "Whether testing is enabled",
            default: true
        },

        // CLI-specific options
        interactive: {
            type: "boolean",
            description: "Whether CLI is running in interactive mode",
            default: true
        },
        verbose: {
            type: "boolean",
            description: "Whether verbose output is enabled",
            default: false
        },
        setupScript: {
            type: "boolean",
            description: "Whether to generate setup scripts",
            default: true
        }
    },
    required: ["projectName", "template", "database", "features", "timestamp", "farmVersion"],
    additionalProperties: false
} as const;

/**
 * JSON Schema for available Handlebars helpers
 */
export const TEMPLATE_HELPERS_SCHEMA = {
    $schema: "http://json-schema.org/draft-07/schema#",
    $id: "https://farm-framework.dev/schemas/template-helpers.json",
    title: "FARM Framework Template Helpers",
    description: "Schema for validating available Handlebars helpers",
    type: "object",
    properties: {
        builtin: {
            type: "array",
            description: "Built-in Handlebars helpers",
            items: { type: "string" },
            enum: ["if", "unless", "each", "with", "lookup", "log"]
        },
        comparison: {
            type: "array",
            description: "Comparison helpers",
            items: { type: "string" },
            enum: ["eq", "ne", "gt", "lt", "gte", "lte", "and", "or", "not"]
        },
        string: {
            type: "array",
            description: "String manipulation helpers",
            items: { type: "string" },
            enum: [
                "capitalize", "lowercase", "uppercase", "kebab_case", "snake_case",
                "camel_case", "pascal_case", "pluralize", "join", "length"
            ]
        },
        projectName: {
            type: "array",
            description: "Project name helpers (various formats)",
            items: { type: "string" },
            enum: [
                "project_name", "project_name_kebab", "project_name_snake",
                "project_name_camel", "project_name_pascal"
            ]
        },
        features: {
            type: "array",
            description: "Feature detection helpers",
            items: { type: "string" },
            enum: ["if_feature", "unless_feature", "has_features"]
        },
        database: {
            type: "array",
            description: "Database detection helpers",
            items: { type: "string" },
            enum: [
                "if_database", "unless_database", "is_mongodb", "is_postgresql",
                "is_mysql", "is_sqlite"
            ]
        },
        template: {
            type: "array",
            description: "Template detection helpers",
            items: { type: "string" },
            enum: [
                "if_template", "is_basic", "is_ai_chat", "is_ai_dashboard",
                "is_ecommerce", "is_cms", "is_api_only"
            ]
        },
        environment: {
            type: "array",
            description: "Environment detection helpers",
            items: { type: "string" },
            enum: ["if_env", "is_development", "is_production", "is_staging"]
        },
        ai: {
            type: "array",
            description: "AI provider detection helpers",
            items: { type: "string" },
            enum: [
                "if_ai_provider", "has_ollama", "has_openai", "has_huggingface", "has_ai_enabled"
            ]
        },
        utility: {
            type: "array",
            description: "Utility helpers",
            items: { type: "string" },
            enum: [
                "default", "get_config", "json", "debug", "timestamp", "year",
                "has_typescript", "has_docker", "has_testing", "if_plugin"
            ]
        },
        processing: {
            type: "array",
            description: "Template processing helpers",
            items: { type: "string" },
            enum: [
                "switch", "case", "indent", "comment", "import_path", "validate_name", "lazy"
            ]
        },
        aliases: {
            type: "array",
            description: "Missing helper aliases (for backward compatibility)",
            items: { type: "string" },
            enum: [
                "projectName", "projectNameKebab", "author", "description", "template",
                "database", "now", "name", "ai", "this"
            ]
        }
    },
    additionalProperties: false
} as const;

/**
 * Complete template specification schema
 */
export const COMPLETE_TEMPLATE_SCHEMA = {
    $schema: "http://json-schema.org/draft-07/schema#",
    $id: "https://farm-framework.dev/schemas/template-complete.json",
    title: "FARM Framework Complete Template Specification",
    description: "Complete specification for template context and helpers",
    type: "object",
    properties: {
        context: TEMPLATE_CONTEXT_SCHEMA,
        helpers: TEMPLATE_HELPERS_SCHEMA,
        metadata: {
            type: "object",
            properties: {
                version: {
                    type: "string",
                    description: "Schema version",
                    const: "1.0.0"
                },
                lastUpdated: {
                    type: "string",
                    format: "date-time",
                    description: "Last schema update timestamp"
                },
                totalHelpers: {
                    type: "number",
                    description: "Total number of available helpers",
                    const: getAllHelpers().length
                },
                totalVariables: {
                    type: "number",
                    description: "Total number of available variables",
                    const: getAllVariables().length
                }
            },
            required: ["version", "totalHelpers", "totalVariables"]
        }
    },
    required: ["context", "helpers", "metadata"]
} as const;

/**
 * Generate a runtime validation schema
 */
export function generateRuntimeSchema(): any {
    return {
        context: TEMPLATE_CONTEXT_SCHEMA,
        helpers: {
            all: getAllHelpers(),
            categories: TEMPLATE_HELPERS,
            variables: getAllVariables()
        },
        metadata: {
            version: "1.0.0",
            lastUpdated: new Date().toISOString(),
            totalHelpers: getAllHelpers().length,
            totalVariables: getAllVariables().length
        }
    };
}

/**
 * Export schemas for external use
 */
export const SCHEMAS = {
    context: TEMPLATE_CONTEXT_SCHEMA,
    helpers: TEMPLATE_HELPERS_SCHEMA,
    complete: COMPLETE_TEMPLATE_SCHEMA,
    runtime: generateRuntimeSchema()
} as const;
