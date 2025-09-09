# @farm/code-intelligence

The FARM Framework code intelligence package provides AI-powered code analysis, suggestions, and automation. It includes code completion, refactoring suggestions, bug detection, and performance optimization recommendations.

## 🚀 Quick Start

```bash
npm install @farm/code-intelligence
```

```typescript
import { CodeIntelligence } from '@farm/code-intelligence';

const intelligence = new CodeIntelligence({
  providers: {
    ollama: {
      model: 'codellama:7b',
      baseUrl: 'http://localhost:11434'
    }
  }
});

const suggestions = await intelligence.analyzeCode('./src/app.tsx');
```

## 📋 Core Features

### Code Analysis
- **Static Analysis**: Code quality and complexity analysis
- **Bug Detection**: Identify potential bugs and issues
- **Performance Analysis**: Performance bottleneck identification
- **Security Scanning**: Security vulnerability detection

### AI-Powered Suggestions
- **Code Completion**: Intelligent code completion
- **Refactoring Suggestions**: Code improvement recommendations
- **Documentation Generation**: Automatic documentation creation
- **Test Generation**: Unit test generation

### Code Understanding
- **Code Explanation**: Explain complex code sections
- **Dependency Analysis**: Understand code dependencies
- **Pattern Recognition**: Identify design patterns
- **Code Metrics**: Calculate code complexity metrics

### Automation
- **Auto-fix**: Automatically fix common issues
- **Code Generation**: Generate boilerplate code
- **Migration Assistance**: Help with code migrations
- **Refactoring**: Automated code refactoring

## 🏗️ Architecture

```
@farm/code-intelligence
├── Analysis/
│   ├── StaticAnalyzer       # Static code analysis
│   ├── BugDetector          # Bug detection
│   ├── PerformanceAnalyzer  # Performance analysis
│   └── SecurityScanner      # Security scanning
├── AI/
│   ├── CodeCompletion       # AI code completion
│   ├── RefactoringAI        # AI refactoring suggestions
│   ├── DocumentationAI      # AI documentation generation
│   └── TestGenerationAI     # AI test generation
├── Understanding/
│   ├── CodeExplainer        # Code explanation
│   ├── DependencyAnalyzer   # Dependency analysis
│   ├── PatternRecognizer    # Pattern recognition
│   └── MetricsCalculator    # Code metrics
├── Automation/
│   ├── AutoFixer            # Automatic fixes
│   ├── CodeGenerator        # Code generation
│   ├── MigrationHelper      # Migration assistance
│   └── RefactoringEngine    # Refactoring engine
└── Integration/
    ├── VSCodeExtension      # VS Code integration
    ├── CLI                  # Command line interface
    └── API                  # Programmatic API
```

## 📚 API Reference

### CodeIntelligence

Main orchestrator for code intelligence features.

```typescript
import { CodeIntelligence } from '@farm/code-intelligence';

const intelligence = new CodeIntelligence({
  providers: {
    ollama: {
      model: 'codellama:7b',
      baseUrl: 'http://localhost:11434'
    }
  },
  analysis: {
    enabled: true,
    rules: ['complexity', 'performance', 'security']
  },
  ai: {
    enabled: true,
    suggestions: true,
    completion: true
  }
});

// Analyze code
const analysis = await intelligence.analyzeCode('./src/app.tsx');

// Get suggestions
const suggestions = await intelligence.getSuggestions('./src/app.tsx');

// Generate documentation
const docs = await intelligence.generateDocumentation('./src/app.tsx');
```

### Code Analysis

#### StaticAnalyzer
Perform static code analysis.

```typescript
import { StaticAnalyzer } from '@farm/code-intelligence';

const analyzer = new StaticAnalyzer({
  rules: ['complexity', 'performance', 'security'],
  thresholds: {
    complexity: 10,
    maintainability: 80
  }
});

// Analyze file
const analysis = await analyzer.analyzeFile('./src/app.tsx');

// Analyze project
const projectAnalysis = await analyzer.analyzeProject('./src');

// Get analysis report
const report = analyzer.generateReport(analysis);
```

#### BugDetector
Detect potential bugs and issues.

```typescript
import { BugDetector } from '@farm/code-intelligence';

const detector = new BugDetector({
  rules: ['null-check', 'type-safety', 'error-handling'],
  severity: 'warning'
});

// Detect bugs
const bugs = await detector.detectBugs('./src/app.tsx');

// Get bug report
const report = detector.generateBugReport(bugs);
```

#### PerformanceAnalyzer
Analyze code performance.

```typescript
import { PerformanceAnalyzer } from '@farm/code-intelligence';

const analyzer = new PerformanceAnalyzer({
  metrics: ['execution-time', 'memory-usage', 'complexity'],
  thresholds: {
    executionTime: 100, // ms
    memoryUsage: 50 // MB
  }
});

// Analyze performance
const performance = await analyzer.analyzePerformance('./src/app.tsx');

// Get performance report
const report = analyzer.generatePerformanceReport(performance);
```

### AI Features

#### CodeCompletion
AI-powered code completion.

```typescript
import { CodeCompletion } from '@farm/code-intelligence';

const completion = new CodeCompletion({
  provider: 'ollama',
  model: 'codellama:7b',
  context: 1000 // characters
});

// Get completions
const completions = await completion.getCompletions(
  './src/app.tsx',
  { line: 10, column: 20 }
);

// Get function completion
const functionCompletion = await completion.getFunctionCompletion(
  './src/app.tsx',
  'calculateTotal'
);
```

#### RefactoringAI
AI-powered refactoring suggestions.

```typescript
import { RefactoringAI } from '@farm/code-intelligence';

const refactoring = new RefactoringAI({
  provider: 'ollama',
  model: 'codellama:7b'
});

// Get refactoring suggestions
const suggestions = await refactoring.getSuggestions('./src/app.tsx');

// Apply refactoring
const refactored = await refactoring.applyRefactoring(
  './src/app.tsx',
  'extract-method'
);
```

#### DocumentationAI
AI-powered documentation generation.

```typescript
import { DocumentationAI } from '@farm/code-intelligence';

const docs = new DocumentationAI({
  provider: 'ollama',
  model: 'codellama:7b',
  format: 'markdown'
});

// Generate function documentation
const functionDocs = await docs.generateFunctionDocs(
  './src/app.tsx',
  'calculateTotal'
);

// Generate class documentation
const classDocs = await docs.generateClassDocs(
  './src/app.tsx',
  'UserService'
);

// Generate API documentation
const apiDocs = await docs.generateAPIDocs('./src/routes');
```

#### TestGenerationAI
AI-powered test generation.

```typescript
import { TestGenerationAI } from '@farm/code-intelligence';

const testGen = new TestGenerationAI({
  provider: 'ollama',
  model: 'codellama:7b',
  framework: 'jest'
});

// Generate unit tests
const tests = await testGen.generateUnitTests('./src/app.tsx');

// Generate integration tests
const integrationTests = await testGen.generateIntegrationTests(
  './src/routes'
);
```

### Code Understanding

#### CodeExplainer
Explain complex code sections.

```typescript
import { CodeExplainer } from '@farm/code-intelligence';

const explainer = new CodeExplainer({
  provider: 'ollama',
  model: 'codellama:7b',
  detail: 'high'
});

// Explain function
const explanation = await explainer.explainFunction(
  './src/app.tsx',
  'calculateTotal'
);

// Explain class
const classExplanation = await explainer.explainClass(
  './src/app.tsx',
  'UserService'
);

// Explain complex code block
const blockExplanation = await explainer.explainCodeBlock(
  './src/app.tsx',
  { startLine: 10, endLine: 20 }
);
```

#### DependencyAnalyzer
Analyze code dependencies.

```typescript
import { DependencyAnalyzer } from '@farm/code-intelligence';

const analyzer = new DependencyAnalyzer({
  includeExternal: true,
  includeInternal: true
});

// Analyze dependencies
const dependencies = await analyzer.analyzeDependencies('./src/app.tsx');

// Get dependency graph
const graph = analyzer.getDependencyGraph('./src');

// Find circular dependencies
const circular = analyzer.findCircularDependencies('./src');
```

### Automation

#### AutoFixer
Automatically fix common issues.

```typescript
import { AutoFixer } from '@farm/code-intelligence';

const fixer = new AutoFixer({
  rules: ['imports', 'formatting', 'types'],
  autoApply: false
});

// Fix issues
const fixes = await fixer.fixIssues('./src/app.tsx');

// Apply fixes
await fixer.applyFixes('./src/app.tsx', fixes);

// Fix project
await fixer.fixProject('./src');
```

#### CodeGenerator
Generate boilerplate code.

```typescript
import { CodeGenerator } from '@farm/code-intelligence';

const generator = new CodeGenerator({
  templates: './templates',
  language: 'typescript'
});

// Generate component
const component = await generator.generateComponent({
  name: 'UserCard',
  props: ['user', 'onClick'],
  type: 'react'
});

// Generate service
const service = await generator.generateService({
  name: 'UserService',
  methods: ['create', 'read', 'update', 'delete'],
  type: 'class'
});
```

## 🔧 Configuration

### Basic Configuration

```typescript
const intelligence = new CodeIntelligence({
  providers: {
    ollama: {
      model: 'codellama:7b',
      baseUrl: 'http://localhost:11434'
    }
  },
  analysis: {
    enabled: true
  },
  ai: {
    enabled: true
  }
});
```

### Advanced Configuration

```typescript
const intelligence = new CodeIntelligence({
  providers: {
    ollama: {
      model: 'codellama:7b',
      baseUrl: 'http://localhost:11434'
    },
    openai: {
      apiKey: process.env.OPENAI_API_KEY,
      model: 'gpt-4'
    }
  },
  analysis: {
    enabled: true,
    rules: ['complexity', 'performance', 'security'],
    thresholds: {
      complexity: 10,
      maintainability: 80
    }
  },
  ai: {
    enabled: true,
    suggestions: true,
    completion: true,
    documentation: true,
    testGeneration: true
  },
  automation: {
    enabled: true,
    autoFix: false,
    codeGeneration: true
  }
});
```

## 🎯 Advanced Usage

### Custom Analysis Rules

```typescript
import { StaticAnalyzer } from '@farm/code-intelligence';

const analyzer = new StaticAnalyzer({
  rules: ['complexity', 'performance', 'security'],
  customRules: [
    {
      name: 'no-console-log',
      message: 'Console.log statements should be removed in production',
      severity: 'warning',
      check: (node) => {
        return node.type === 'CallExpression' && 
               node.callee.name === 'console.log';
      }
    }
  ]
});
```

### Custom AI Prompts

```typescript
import { CodeCompletion } from '@farm/code-intelligence';

const completion = new CodeCompletion({
  provider: 'ollama',
  model: 'codellama:7b',
  customPrompts: {
    'react-component': 'Generate a React functional component with TypeScript',
    'api-endpoint': 'Generate a FastAPI endpoint with proper error handling'
  }
});
```

### Integration with Build Tools

```typescript
// webpack.config.js
const { CodeIntelligencePlugin } = require('@farm/code-intelligence');

module.exports = {
  plugins: [
    new CodeIntelligencePlugin({
      analysis: true,
      suggestions: true,
      autoFix: false
    })
  ]
};
```

## 🐛 Troubleshooting

### Common Issues

#### Analysis Failures
```typescript
// Check analysis configuration
const analyzer = new StaticAnalyzer({ rules: ['complexity'] });
const isValid = analyzer.validateConfiguration();
if (!isValid) {
  console.error('Invalid analysis configuration');
}
```

#### AI Provider Issues
```typescript
// Check AI provider status
const intelligence = new CodeIntelligence({ providers: { ollama: { model: 'codellama:7b' } } });
const status = await intelligence.checkProviderStatus('ollama');
console.log('Provider status:', status);
```

#### Performance Issues
```typescript
// Monitor analysis performance
const analyzer = new StaticAnalyzer({ performance: true });
const startTime = Date.now();
await analyzer.analyzeFile('./src/app.tsx');
const duration = Date.now() - startTime;
console.log(`Analysis took ${duration}ms`);
```

### Getting Help

- **GitHub Issues**: [Report bugs](https://github.com/farm-stack/framework/issues)
- **Documentation**: [Code Intelligence Reference](../docs/reference/code-intelligence/)
- **Discussions**: [Community help](https://github.com/farm-stack/framework/discussions)

## 🔄 Changelog

### v0.2.0
- Added comprehensive code analysis
- Enhanced AI-powered suggestions
- Improved code understanding features
- Added automation capabilities

### v0.1.0
- Initial release with basic analysis
- Simple AI integration
- Basic code completion
- VS Code extension support

## 📄 License

MIT © FARM Framework