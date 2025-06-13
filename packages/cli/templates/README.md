# Template Generation Pipeline with Inheritance

This document describes the FARM Framework's template generation pipeline, including the comprehensive inheritance system that enables modular and scalable template development.

## Overview

The FARM Framework template system supports:

- **Base Template Inheritance**: Templates inherit files and configurations from a base template
- **Feature-Based Modularity**: Optional features can be added through the `features/` directory
- **Dependency Management**: Smart dependency inheritance with conflict prevention
- **File Override System**: Templates can override base files while preserving inheritance
- **Extensible Architecture**: Easy to add new templates and features without duplication

## Directory Structure

```
packages/cli/templates/
├── base/                          # Base template (inherited by all)
│   ├── apps/
│   │   ├── api/                   # Base API structure
│   │   └── web/                   # Base web app structure
│   │       ├── package.json.hbs   # Core dependencies
│   │       ├── tsconfig.json.hbs  # TypeScript config
│   │       ├── vite.config.ts.hbs # Vite configuration
│   │       ├── tailwind.config.js.hbs # Tailwind CSS config
│   │       ├── eslint.config.js.hbs   # ESLint configuration
│   │       ├── index.html.hbs     # HTML template
│   │       └── src/               # Base React components
│   ├── farm.config.ts.hbs         # Base FARM configuration
│   └── README.md.hbs              # Base documentation
│
├── basic/                         # Basic template
│   └── apps/web/
│       ├── package.json.hbs       # Inherits base + adds specific deps
│       └── src/                   # Basic-specific components
│
├── ai-chat/                       # AI Chat template
│   └── apps/web/
│       ├── package.json.hbs       # Inherits base + adds AI deps
│       └── src/                   # AI-specific components
│
├── ecommerce/                     # E-commerce template
│   └── apps/web/
│       ├── package.json.hbs       # Inherits base + adds Stripe deps
│       └── src/                   # E-commerce components
│
├── cms/                           # CMS template
│   └── apps/web/
│       ├── package.json.hbs       # Inherits base + adds TipTap deps
│       └── src/                   # CMS components
│
├── features/                      # Feature modules
│   ├── auth/                      # Authentication feature
│   │   └── apps/web/src/components/auth/
│   ├── ai/                        # AI/ML features
│   │   └── apps/web/src/components/ai/
│   ├── payments/                  # Payment processing
│   │   └── apps/web/src/components/payments/
│   ├── storage/                   # File storage
│   │   └── apps/web/src/components/storage/
│   ├── realtime/                  # Real-time features
│   │   └── apps/web/src/components/realtime/
│   └── analytics/                 # Analytics integration
│       └── apps/web/src/components/analytics/
│
└── other/                         # Additional template directories
    └── features/                  # Extended feature modules
        ├── advanced-auth/         # Advanced authentication
        ├── enterprise-features/   # Enterprise-specific features
        └── custom-integrations/   # Custom third-party integrations
```

## Inheritance System

### File Inheritance Priority

The template processor resolves files using the following priority order:

1. **Feature Files** (Priority: 3) - Highest priority
2. **Template Files** (Priority: 2) - Medium priority
3. **Base Files** (Priority: 1) - Lowest priority

### Inheritance Rules

#### Always Inherit Files

These files are always inherited from base unless explicitly overridden:

- `eslint.config.js.hbs`
- `postcss.config.js.hbs`
- `tailwind.config.js.hbs`
- `tsconfig.json.hbs`
- `tsconfig.node.json.hbs`
- `vite.config.ts.hbs`
- `index.html.hbs`

#### Never Inherit Files

These files are template-specific and never inherited:

- `README.md.hbs`
- `package.json.hbs` (uses special dependency merging)

#### Dependency Inheritance

Package.json files use special dependency merging logic:

- **Core dependencies** are inherited from base template
- **Template-specific dependencies** are added to core dependencies
- **Conflicts** are detected and logged (template wins by default)
- **Override protection** prevents accidental base dependency conflicts

### Configuration

Templates can be configured with inheritance settings:

```typescript
// Template inheritance configuration
interface TemplateInheritanceConfig {
  base?: string; // Base template name (default: "base")
  excludeFromInheritance?: string[]; // Files to exclude from inheritance
  overrideFiles?: string[]; // Files that can override base
  featuresDir?: string; // Features directory name
  allowDependencyOverride?: boolean; // Allow overriding base dependencies
}

// File conflict resolution strategy
interface FileInheritanceStrategy {
  conflictResolution: "base-wins" | "template-wins" | "merge" | "error";
  alwaysInherit?: string[]; // Files that should always inherit
  neverInherit?: string[]; // Files that should never inherit
  mergeStrategies?: Record<string, string>; // Custom merge strategies
}
```

## Template Processing Pipeline

### 1. Inheritance Resolution Phase

```
🔍 Discovery & Validation
├── Validate template exists
├── Validate base template exists
├── Check for circular inheritance
└── Load inheritance configuration

📂 File Discovery
├── Discover base template files
├── Discover template-specific files
├── Discover feature files (based on context.features)
└── Apply file filtering rules

🔀 Conflict Resolution
├── Group files by relative path
├── Apply inheritance rules
├── Resolve conflicts using strategy
└── Generate final file list
```

### 2. Processing Phase

```
⚙️  Template Processing
├── Create template data context
├── Process files in optimized batches
├── Handle Handlebars templates
├── Copy binary/static files
└── Apply special merging (package.json)

📊 Metrics & Reporting
├── Track files processed/inherited/overridden
├── Monitor performance metrics
├── Log inheritance decisions
└── Generate processing report
```

## Usage Examples

### Basic Template Generation

```typescript
import { EnhancedTemplateProcessor } from "./enhanced-processor";

const processor = new EnhancedTemplateProcessor();

const result = await processor.processTemplate(
  "ai-chat",
  {
    projectName: "my-ai-app",
    template: "ai-chat",
    features: ["ai", "auth"],
    database: "postgresql",
  },
  "./output",
  {
    verbose: true,
    validateInheritance: true,
  }
);

console.log(`Generated ${result.generatedFiles.length} files`);
console.log(`Inherited ${result.inheritedFiles.length} files from base`);
console.log(`Overridden ${result.overriddenFiles.length} base files`);
```

### Custom Inheritance Configuration

```typescript
const processor = new EnhancedTemplateProcessor(
  {
    base: "custom-base",
    excludeFromInheritance: ["custom-config.json.hbs"],
    allowDependencyOverride: true,
  },
  {
    conflictResolution: "template-wins",
    alwaysInherit: ["shared-config.js.hbs"],
    neverInherit: ["template-specific.md.hbs"],
  }
);
```

## Dependency Management

### Core Dependencies (Base Template)

All templates inherit these core dependencies:

- `react` & `react-dom` - React framework
- `@tanstack/react-query` - Data fetching
- `react-router-dom` - Routing
- `zustand` - State management
- `tailwindcss` - Styling
- `typescript` - Type safety
- `vite` - Build tool

### Template-Specific Dependencies

Each template adds only its specific dependencies:

**AI Chat Template:**

- `framer-motion` - Animations
- `react-markdown` - Markdown rendering
- `react-syntax-highlighter` - Code highlighting

**E-commerce Template:**

- `@stripe/stripe-js` - Payment processing
- `react-hook-form` - Form handling
- `yup` - Validation

**CMS Template:**

- `@tiptap/react` - Rich text editor
- `@tiptap/starter-kit` - Editor plugins
- `react-beautiful-dnd` - Drag & drop

### Conflict Prevention

The system prevents dependency conflicts by:

1. **Version Consistency**: All templates use the same version of core dependencies
2. **Conflict Detection**: Warns when template dependencies conflict with base
3. **Override Protection**: Requires explicit flag to override base dependencies
4. **Automated Updates**: Scripts maintain version consistency across templates

## Features System

### Feature Structure

Features are self-contained modules in `templates/features/`:

```
features/auth/
├── apps/
│   ├── api/src/auth/              # Backend auth components
│   └── web/src/components/auth/   # Frontend auth components
├── requirements.txt.hbs           # Python dependencies
├── package.json.hbs               # NPM dependencies (merged)
└── README.md                      # Feature documentation
```

### Feature Activation

Features are activated through the template context:

```typescript
const context = {
  projectName: "my-app",
  template: "basic",
  features: ["auth", "ai", "payments"], // Activate features
  database: "postgresql",
};
```

### Feature Dependencies

Features can declare their own dependencies:

- **Python dependencies**: Added to `requirements.txt`
- **NPM dependencies**: Merged into `package.json`
- **Configuration**: Added to `farm.config.ts`

## Extending the System

### Adding New Templates

1. **Create template directory**: `packages/cli/templates/my-template/`
2. **Add package.json.hbs**: Define template-specific dependencies
3. **Add template files**: Components, pages, configurations
4. **Test inheritance**: Ensure proper base inheritance

### Adding New Features

1. **Create feature directory**: `packages/cli/templates/features/my-feature/`
2. **Add components**: Frontend and backend components
3. **Add dependencies**: Package.json and requirements.txt
4. **Document feature**: README with usage instructions

### Custom Inheritance Rules

```typescript
// Create custom processor with specific rules
const processor = new EnhancedTemplateProcessor(
  {
    base: "enterprise-base",
    featuresDir: "enterprise-features",
    excludeFromInheritance: ["enterprise-config.ts.hbs", "custom-build.js.hbs"],
  },
  {
    conflictResolution: "error", // Fail on conflicts
    alwaysInherit: ["shared-enterprise-config.js.hbs"],
    mergeStrategies: {
      "enterprise-config.ts.hbs": "deep-merge",
    },
  }
);
```

## Performance Optimizations

### Caching

- **Template compilation caching**: Compiled Handlebars templates are cached
- **File stats caching**: File system stats are cached to avoid repeated reads
- **Template data caching**: Generated template data is cached per context

### Batch Processing

- **Optimized batches**: Files are processed in configurable batches (default: 10)
- **Parallel processing**: Multiple files processed simultaneously within batches
- **Progress tracking**: Real-time progress updates for long operations

### Metrics & Monitoring

- **Processing metrics**: Track files processed, inherited, overridden
- **Performance timing**: Measure inheritance resolution and processing time
- **Cache efficiency**: Monitor cache hit/miss ratios

## Troubleshooting

### Common Issues

**Template not found:**

```
Error: Template directory not found: /path/to/template
Available templates: basic, ai-chat, ecommerce, cms
```

→ Check template name spelling and ensure template directory exists

**Inheritance validation failed:**

```
Error: Template inheritance validation failed: Base template not found: custom-base
```

→ Ensure base template exists or update inheritance configuration

**Dependency conflicts:**

```
Warning: Dependency conflicts detected (template will override): react@18.0.0 vs react@19.0.0
```

→ Review dependency versions or enable `allowDependencyOverride`

**File conflicts:**

```
Error: File conflict detected for apps/web/src/App.tsx. Sources: base, template
```

→ Check inheritance rules or change conflict resolution strategy

### Debugging

Enable verbose logging:

```typescript
const result = await processor.processTemplate(templateName, context, output, {
  verbose: true,
  validateInheritance: true,
});
```

Get inheritance information:

```typescript
const inheritanceInfo = await processor.inheritanceResolver.getInheritanceInfo(
  templateName,
  context
);
console.log("Inheritance info:", inheritanceInfo);
```

## Best Practices

### Template Development

1. **Keep templates minimal**: Only include template-specific files
2. **Use inheritance**: Leverage base template for common configurations
3. **Document dependencies**: Clearly document why specific dependencies are needed
4. **Test inheritance**: Verify templates work correctly with base inheritance

### Feature Development

1. **Self-contained**: Features should be independent modules
2. **Clear boundaries**: Avoid feature interdependencies
3. **Optional dependencies**: Use optional/peer dependencies where possible
4. **Documentation**: Include clear usage and integration docs

### Dependency Management

1. **Version consistency**: Keep core dependencies consistent across templates
2. **Minimal additions**: Only add truly necessary template-specific dependencies
3. **Regular updates**: Keep dependencies up to date using automation scripts
4. **Conflict avoidance**: Choose dependencies that don't conflict with core stack

This inheritance system provides a powerful foundation for scalable template development while maintaining simplicity and avoiding code duplication.
