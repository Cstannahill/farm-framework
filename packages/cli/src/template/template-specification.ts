// packages/cli/src/template/template-specification.ts
/**
 * Single Source of Truth for FARM Framework Template Variables and Helpers
 * 
 * This file defines all available variables and helpers that templates can use.
 * It serves as the authoritative reference for:
 * - Error handling and suggestions
 * - Preflight validation
 * - Template documentation
 * - Helper registration
 */

import { TemplateContext, CLITemplateContext } from "@farm-framework/types";

// =============================================================================
// TEMPLATE VARIABLES SPECIFICATION
// =============================================================================

/**
 * Core template variables available in all templates
 * These correspond to properties in TemplateContext and CLITemplateContext
 */
export const TEMPLATE_VARIABLES = {
    // Project identification
    projectName: {
        type: 'string',
        description: 'The project name (camelCase)',
        examples: ['myApp', 'farmProject'],
        aliases: ['name'],
        required: true
    },

    // Template information
    template: {
        type: 'string',
        description: 'The template name being used',
        examples: ['basic', 'ai-chat', 'ai-dashboard'],
        required: true
    },

    // Database configuration
    database: {
        type: 'string',
        description: 'The database type selected',
        examples: ['mongodb', 'postgresql', 'mysql', 'sqlite'],
        required: true
    },

    // Features array
    features: {
        type: 'array',
        description: 'Array of selected features',
        examples: [['auth', 'api'], ['ai', 'realtime']],
        required: true
    },

    // Optional project metadata
    description: {
        type: 'string',
        description: 'Project description',
        examples: ['A modern web application', 'AI-powered chat system'],
        required: false
    },

    author: {
        type: 'string',
        description: 'Project author name',
        examples: ['John Doe', 'Jane Smith'],
        required: false
    },

    // Environment and configuration
    environment: {
        type: 'string',
        description: 'Target environment',
        examples: ['development', 'staging', 'production'],
        required: false,
        default: 'development'
    },

    // Timestamps and versions
    timestamp: {
        type: 'string',
        description: 'ISO timestamp of project creation',
        examples: ['2024-01-15T10:30:00.000Z'],
        required: true
    },

    farmVersion: {
        type: 'string',
        description: 'FARM framework version',
        examples: ['1.0.0', '1.2.3'],
        required: true
    },

    // Development flags
    typescript: {
        type: 'boolean',
        description: 'Whether TypeScript is enabled',
        examples: [true, false],
        required: false,
        default: true
    },

    docker: {
        type: 'boolean',
        description: 'Whether Docker is enabled',
        examples: [true, false],
        required: false,
        default: true
    },

    git: {
        type: 'boolean',
        description: 'Whether Git is enabled',
        examples: [true, false],
        required: false,
        default: true
    },

    install: {
        type: 'boolean',
        description: 'Whether to install dependencies',
        examples: [true, false],
        required: false,
        default: true
    },

    testing: {
        type: 'boolean',
        description: 'Whether testing is enabled',
        examples: [true, false],
        required: false,
        default: true
    },

    // CLI-specific options
    interactive: {
        type: 'boolean',
        description: 'Whether CLI is running in interactive mode',
        examples: [true, false],
        required: false,
        default: true
    },

    verbose: {
        type: 'boolean',
        description: 'Whether verbose output is enabled',
        examples: [true, false],
        required: false,
        default: false
    },

    setupScript: {
        type: 'boolean',
        description: 'Whether to generate setup scripts',
        examples: [true, false],
        required: false,
        default: true
    }
} as const;

// =============================================================================
// HANDLEBARS HELPERS SPECIFICATION
// =============================================================================

/**
 * All available Handlebars helpers organized by category
 */
export const TEMPLATE_HELPERS = {
    // Built-in Handlebars helpers (always available)
    builtin: [
        'if', 'else', 'unless', 'each', 'with', 'lookup', 'log'
    ],

    // Comparison helpers
    comparison: [
        'eq', 'ne', 'gt', 'lt', 'gte', 'lte', 'and', 'or', 'not'
    ],

    // String manipulation helpers
    string: [
        'capitalize', 'lowercase', 'uppercase', 'kebab_case', 'snake_case',
        'camel_case', 'pascal_case', 'pluralize', 'join', 'length'
    ],

    // Project name helpers (various formats)
    projectName: [
        'project_name', 'project_name_kebab', 'project_name_snake',
        'project_name_camel', 'project_name_pascal'
    ],

    // Feature detection helpers
    features: [
        'if_feature', 'unless_feature', 'has_features'
    ],

    // Database detection helpers
    database: [
        'if_database', 'unless_database', 'is_mongodb', 'is_postgresql',
        'is_mysql', 'is_sqlite'
    ],

    // Template detection helpers
    template: [
        'if_template', 'is_basic', 'is_ai_chat', 'is_ai_dashboard',
        'is_ecommerce', 'is_cms', 'is_api_only'
    ],

    // Environment detection helpers
    environment: [
        'if_env', 'is_development', 'is_production', 'is_staging'
    ],

    // AI provider detection helpers
    ai: [
        'if_ai_provider', 'has_ollama', 'has_openai', 'has_huggingface', 'has_ai_enabled'
    ],

    // Utility helpers
    utility: [
        'default', 'get_config', 'json', 'debug', 'timestamp', 'year',
        'has_typescript', 'has_docker', 'has_testing', 'if_plugin',
        'safeDescription', 'safeEnvironment', 'safeDatabase', 'defaultBlock'
    ],

    // Template processing helpers
    processing: [
        'switch', 'case', 'indent', 'comment', 'import_path', 'validate_name', 'lazy'
    ],

    // Missing helper aliases (for backward compatibility)
    aliases: [
        'projectName', 'projectNameKebab', 'author', 'description', 'template',
        'database', 'now', 'name', 'ai', 'this'
    ]
} as const;

/**
 * Helper aliases for common variable access patterns
 * These map template variable names to their corresponding helpers
 */
export const HELPER_ALIASES = {
    // Direct variable access (these should be available as context properties, not helpers)
    projectName: 'project_name',
    projectNameKebab: 'project_name_kebab',
    projectNameSnake: 'project_name_snake',
    projectNameCamel: 'project_name_camel',
    projectNamePascal: 'project_name_pascal',

    // Feature and configuration aliases
    template: 'if_template',
    database: 'if_database',
    ai: 'has_ai_enabled',

    // Time and metadata aliases
    now: 'timestamp',
    name: 'project_name',

    // Common missing helpers that templates expect
    else: 'if', // 'else' is part of if/unless blocks, not a standalone helper
    this: 'project_name', // 'this' should refer to current context, usually project name
    author: 'author', // Should be available as context property
    description: 'description' // Should be available as context property
} as const;

// =============================================================================
// VALIDATION AND ERROR HANDLING
// =============================================================================

/**
 * Get all available helpers as a flat array
 */
export function getAllHelpers(): string[] {
    const allHelpers: string[] = [];

    // Add built-in helpers
    allHelpers.push(...TEMPLATE_HELPERS.builtin);

    // Add all other helper categories
    Object.values(TEMPLATE_HELPERS).forEach(category => {
        if (Array.isArray(category)) {
            allHelpers.push(...category);
        }
    });

    return [...new Set(allHelpers)]; // Remove duplicates
}

/**
 * Get all available variables as a flat array
 */
export function getAllVariables(): string[] {
    return Object.keys(TEMPLATE_VARIABLES);
}

/**
 * Check if a helper name is valid
 */
export function isValidHelper(helperName: string): boolean {
    const allHelpers = getAllHelpers();
    return allHelpers.includes(helperName);
}

/**
 * Check if a variable name is valid
 */
export function isValidVariable(variableName: string): boolean {
    return variableName in TEMPLATE_VARIABLES;
}

/**
 * Get suggestions for a missing helper
 */
export function getHelperSuggestions(missingHelper: string): string[] {
    const suggestions: string[] = [];

    // Check if it's an alias
    if (missingHelper in HELPER_ALIASES) {
        suggestions.push(HELPER_ALIASES[missingHelper as keyof typeof HELPER_ALIASES]);
    }

    // Find similar helpers using fuzzy matching
    const allHelpers = getAllHelpers();
    const similar = allHelpers.filter(helper => {
        const similarity = calculateSimilarity(missingHelper.toLowerCase(), helper.toLowerCase());
        return similarity > 0.6;
    });

    suggestions.push(...similar.slice(0, 3));

    return [...new Set(suggestions)]; // Remove duplicates
}

/**
 * Get suggestions for a missing variable
 */
export function getVariableSuggestions(missingVariable: string): string[] {
    const suggestions: string[] = [];

    // Find similar variables
    const allVariables = getAllVariables();
    const similar = allVariables.filter(variable => {
        const similarity = calculateSimilarity(missingVariable.toLowerCase(), variable.toLowerCase());
        return similarity > 0.6;
    });

    suggestions.push(...similar.slice(0, 3));

    return suggestions;
}

/**
 * Calculate string similarity (Levenshtein distance)
 */
function calculateSimilarity(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1)
        .fill(null)
        .map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
        for (let i = 1; i <= str1.length; i++) {
            const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
            matrix[j][i] = Math.min(
                matrix[j][i - 1] + 1,
                matrix[j - 1][i] + 1,
                matrix[j - 1][i - 1] + indicator
            );
        }
    }

    const maxLength = Math.max(str1.length, str2.length);
    return maxLength === 0
        ? 1
        : (maxLength - matrix[str2.length][str1.length]) / maxLength;
}

/**
 * Generate a comprehensive error message for missing helpers/variables
 */
export function generateErrorMessage(
    type: 'helper' | 'variable',
    name: string,
    context?: { filePath?: string; line?: number }
): string {
    const suggestions = type === 'helper'
        ? getHelperSuggestions(name)
        : getVariableSuggestions(name);

    let message = `Unknown ${type}: "${name}"`;

    if (context?.filePath) {
        const fileName = context.filePath.split(/[/\\]/).pop() || context.filePath;
        message += ` in ${fileName}`;
        if (context.line) {
            message += `:${context.line}`;
        }
    }

    if (suggestions.length > 0) {
        message += `\nDid you mean: ${suggestions.join(', ')}?`;
    }

    if (type === 'helper') {
        message += `\nAvailable helpers: ${getAllHelpers().slice(0, 10).join(', ')}...`;
    } else {
        message += `\nAvailable variables: ${getAllVariables().slice(0, 10).join(', ')}...`;
    }

    return message;
}

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type TemplateVariableName = keyof typeof TEMPLATE_VARIABLES;
export type TemplateHelperName = string; // Union of all helper names
export type HelperCategory = keyof typeof TEMPLATE_HELPERS;

/**
 * Template specification interface for external use
 */
export interface TemplateSpecification {
    variables: typeof TEMPLATE_VARIABLES;
    helpers: typeof TEMPLATE_HELPERS;
    aliases: typeof HELPER_ALIASES;
    getAllHelpers: typeof getAllHelpers;
    getAllVariables: typeof getAllVariables;
    isValidHelper: typeof isValidHelper;
    isValidVariable: typeof isValidVariable;
    getHelperSuggestions: typeof getHelperSuggestions;
    getVariableSuggestions: typeof getVariableSuggestions;
    generateErrorMessage: typeof generateErrorMessage;
}
