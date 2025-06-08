# Error Handling & Developer Feedback

## Overview

The FARM error handling system provides comprehensive error management, developer-friendly feedback, and intelligent debugging assistance across the entire stack. It features cross-component error correlation, AI-powered error analysis, actionable suggestions, and seamless integration with the development workflow to maintain exceptional developer experience even when things go wrong.

---

## High-Level Error Management Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                  FARM Error Management System                  │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────┐ │
│  │   Error     │  │ Cross-Stack │  │  Developer  │  │   AI    │ │
│  │Aggregation  │  │Correlation  │  │  Feedback   │  │Analysis │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────┘ │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────┐ │
│  │  Frontend   │  │  Backend    │  │ Database    │  │   AI    │ │
│  │   Errors    │  │   Errors    │  │   Errors    │  │ Errors  │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────┘ │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────┐ │
│  │ Performance │  │ Debug Tools │  │   Error     │  │Solution │ │
│  │ Monitoring  │  │ Integration │  │ Recovery    │  │Suggestions│ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## Core Error Management System

### 1. Central Error Aggregator

**Unified Error Collection and Processing:**

```typescript
// packages/core/src/errors/aggregator.ts
import { EventEmitter } from "events";
import { ErrorAnalyzer } from "./analyzer";
import { ErrorCorrelator } from "./correlator";
import { DeveloperFeedback } from "./feedback";

export class ErrorAggregator extends EventEmitter {
  private errors: Map<string, ErrorContext> = new Map();
  private analyzer: ErrorAnalyzer;
  private correlator: ErrorCorrelator;
  private feedback: DeveloperFeedback;
  private config: ErrorHandlingConfig;

  constructor(config: ErrorHandlingConfig) {
    super();
    this.config = config;
    this.analyzer = new ErrorAnalyzer(config);
    this.correlator = new ErrorCorrelator(config);
    this.feedback = new DeveloperFeedback(config);

    this.setupErrorSources();
  }

  private setupErrorSources(): void {
    // Listen for errors from different components
    process.on("uncaughtException", this.handleUncaughtException.bind(this));
    process.on("unhandledRejection", this.handleUnhandledRejection.bind(this));

    // Setup custom error handlers
    this.setupFrontendErrorHandler();
    this.setupBackendErrorHandler();
    this.setupDatabaseErrorHandler();
    this.setupAIErrorHandler();
    this.setupBuildErrorHandler();
    this.setupHotReloadErrorHandler();
  }

  async reportError(error: FarmError): Promise<void> {
    const errorId = this.generateErrorId(error);

    // Create error context
    const context: ErrorContext = {
      id: errorId,
      error,
      timestamp: Date.now(),
      stack: this.captureStackTrace(),
      environment: this.captureEnvironment(),
      correlation: null,
      analysis: null,
      suggestions: [],
    };

    // Store error
    this.errors.set(errorId, context);

    try {
      // Analyze error
      context.analysis = await this.analyzer.analyze(error);

      // Find correlations with other errors
      context.correlation = await this.correlator.findCorrelations(
        error,
        context
      );

      // Generate suggestions
      context.suggestions = await this.generateSuggestions(context);

      // Provide developer feedback
      await this.feedback.displayError(context);

      // Emit for external handlers
      this.emit("error-processed", context);
    } catch (analysisError) {
      console.error("Failed to analyze error:", analysisError);
      // Still provide basic feedback
      await this.feedback.displayBasicError(error);
    }
  }

  private generateErrorId(error: FarmError): string {
    const hash = require("crypto").createHash("md5");
    hash.update(error.message + error.component + error.type);
    return hash.digest("hex").substring(0, 8);
  }

  private captureStackTrace(): StackFrame[] {
    const stack = new Error().stack || "";
    return stack
      .split("\n")
      .slice(2)
      .map((line) => {
        const match = line.match(/at\s+(.+?)\s+\((.+?):(\d+):(\d+)\)/);
        if (match) {
          return {
            function: match[1],
            file: match[2],
            line: parseInt(match[3]),
            column: parseInt(match[4]),
          };
        }
        return { function: "unknown", file: "unknown", line: 0, column: 0 };
      });
  }

  private captureEnvironment(): EnvironmentContext {
    return {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      memory: process.memoryUsage(),
      uptime: process.uptime(),
      farmVersion: this.config.farmVersion,
      developmentMode: process.env.NODE_ENV === "development",
      services: this.getServiceStatus(),
    };
  }

  private async generateSuggestions(
    context: ErrorContext
  ): Promise<ErrorSuggestion[]> {
    const suggestions: ErrorSuggestion[] = [];

    // Rule-based suggestions
    const ruleSuggestions = await this.analyzer.generateRuleSuggestions(
      context.error
    );
    suggestions.push(...ruleSuggestions);

    // AI-powered suggestions (if enabled)
    if (this.config.aiSuggestions.enabled) {
      const aiSuggestions = await this.analyzer.generateAISuggestions(context);
      suggestions.push(...aiSuggestions);
    }

    // Community knowledge suggestions
    const communitySuggestions =
      await this.analyzer.generateCommunitySuggestions(context.error);
    suggestions.push(...communitySuggestions);

    return suggestions.slice(0, 5); // Limit to top 5 suggestions
  }

  async getErrorHistory(hours: number = 24): Promise<ErrorContext[]> {
    const cutoff = Date.now() - hours * 60 * 60 * 1000;
    return Array.from(this.errors.values())
      .filter((context) => context.timestamp > cutoff)
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  async getErrorStats(): Promise<ErrorStats> {
    const recent = await this.getErrorHistory(24);

    const byComponent = recent.reduce((acc, context) => {
      const component = context.error.component;
      acc[component] = (acc[component] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byType = recent.reduce((acc, context) => {
      const type = context.error.type;
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total: recent.length,
      byComponent,
      byType,
      mostCommon: this.findMostCommonError(recent),
      trends: this.analyzeErrorTrends(recent),
    };
  }
}
```

### 2. Cross-Stack Error Correlation

**Intelligent Error Relationship Detection:**

```typescript
// packages/core/src/errors/correlator.ts
export class ErrorCorrelator {
  private recentErrors: Map<string, ErrorContext[]> = new Map();
  private correlationRules: CorrelationRule[] = [];

  constructor(config: ErrorHandlingConfig) {
    this.setupCorrelationRules();
  }

  async findCorrelations(
    error: FarmError,
    context: ErrorContext
  ): Promise<ErrorCorrelation | null> {
    // Get recent errors from the same and different components
    const recentErrors = this.getRecentErrors(5 * 60 * 1000); // Last 5 minutes

    if (recentErrors.length === 0) {
      return null;
    }

    // Apply correlation rules
    for (const rule of this.correlationRules) {
      const correlation = await rule.check(error, context, recentErrors);
      if (correlation) {
        return correlation;
      }
    }

    // Check for timing-based correlations
    const timingCorrelation = this.findTimingCorrelations(error, recentErrors);
    if (timingCorrelation) {
      return timingCorrelation;
    }

    // Check for cascade errors
    const cascadeCorrelation = this.findCascadeErrors(error, recentErrors);
    if (cascadeCorrelation) {
      return cascadeCorrelation;
    }

    return null;
  }

  private setupCorrelationRules(): void {
    // Database connection errors often cause backend API failures
    this.correlationRules.push({
      name: "database-backend-cascade",
      check: async (error, context, recent) => {
        if (error.component === "backend" && error.type === "api-error") {
          const dbError = recent.find(
            (e) =>
              e.error.component === "database" &&
              e.error.type === "connection-error" &&
              e.timestamp > context.timestamp - 30000 // Within 30 seconds
          );

          if (dbError) {
            return {
              type: "cascade",
              rootCause: dbError,
              description:
                "Backend API error likely caused by database connection issue",
              confidence: 0.9,
            };
          }
        }
        return null;
      },
    });

    // Type generation errors often cause frontend compilation issues
    this.correlationRules.push({
      name: "types-frontend-cascade",
      check: async (error, context, recent) => {
        if (
          error.component === "frontend" &&
          error.type === "compilation-error"
        ) {
          const typeError = recent.find(
            (e) =>
              e.error.component === "codegen" &&
              e.error.type === "type-generation-error" &&
              e.timestamp > context.timestamp - 60000 // Within 1 minute
          );

          if (typeError) {
            return {
              type: "cascade",
              rootCause: typeError,
              description:
                "Frontend compilation error caused by type generation failure",
              confidence: 0.85,
            };
          }
        }
        return null;
      },
    });

    // AI model loading errors affect AI API endpoints
    this.correlationRules.push({
      name: "ai-model-api-cascade",
      check: async (error, context, recent) => {
        if (
          (error.component === "backend" && error.message.includes("AI")) ||
          error.message.includes("model")
        ) {
          const aiError = recent.find(
            (e) =>
              e.error.component === "ai" &&
              (e.error.type === "model-load-error" ||
                e.error.type === "provider-error") &&
              e.timestamp > context.timestamp - 120000 // Within 2 minutes
          );

          if (aiError) {
            return {
              type: "cascade",
              rootCause: aiError,
              description:
                "Backend AI endpoint error caused by AI model loading failure",
              confidence: 0.8,
            };
          }
        }
        return null;
      },
    });

    // Plugin errors can affect both frontend and backend
    this.correlationRules.push({
      name: "plugin-cross-stack-cascade",
      check: async (error, context, recent) => {
        const pluginError = recent.find(
          (e) =>
            e.error.component === "plugin" &&
            e.timestamp > context.timestamp - 60000 // Within 1 minute
        );

        if (pluginError && error.component !== "plugin") {
          return {
            type: "cascade",
            rootCause: pluginError,
            description: `${error.component} error likely caused by plugin system issue`,
            confidence: 0.7,
          };
        }
        return null;
      },
    });
  }

  private findTimingCorrelations(
    error: FarmError,
    recentErrors: ErrorContext[]
  ): ErrorCorrelation | null {
    // Find errors that occurred very close in time
    const timeWindow = 5000; // 5 seconds
    const nearbyErrors = recentErrors.filter(
      (e) => Math.abs(e.timestamp - Date.now()) < timeWindow
    );

    if (nearbyErrors.length > 1) {
      return {
        type: "timing",
        description: `Multiple errors occurred within ${timeWindow}ms, suggesting a common trigger`,
        confidence: 0.6,
        relatedErrors: nearbyErrors,
      };
    }

    return null;
  }

  private findCascadeErrors(
    error: FarmError,
    recentErrors: ErrorContext[]
  ): ErrorCorrelation | null {
    // Look for patterns indicating error cascades
    const componentOrder = ["database", "ai", "backend", "codegen", "frontend"];
    const errorIndex = componentOrder.indexOf(error.component);

    if (errorIndex > 0) {
      // Check for errors in upstream components
      const upstreamErrors = recentErrors.filter((e) => {
        const upstreamIndex = componentOrder.indexOf(e.error.component);
        return upstreamIndex >= 0 && upstreamIndex < errorIndex;
      });

      if (upstreamErrors.length > 0) {
        const rootCause = upstreamErrors.reduce((earliest, current) =>
          current.timestamp < earliest.timestamp ? current : earliest
        );

        return {
          type: "cascade",
          rootCause,
          description:
            "This error appears to be caused by an upstream component failure",
          confidence: 0.75,
        };
      }
    }

    return null;
  }
}
```

### 3. AI-Powered Error Analysis

**Intelligent Error Diagnosis:**

```typescript
// packages/core/src/errors/ai-analyzer.ts
export class AIErrorAnalyzer {
  private aiProvider: any;
  private knowledgeBase: ErrorKnowledgeBase;

  constructor(config: ErrorHandlingConfig) {
    this.aiProvider = config.aiProvider;
    this.knowledgeBase = new ErrorKnowledgeBase();
  }

  async analyzeError(context: ErrorContext): Promise<AIErrorAnalysis> {
    const prompt = this.buildAnalysisPrompt(context);

    try {
      const response = await this.aiProvider.chat(
        [
          {
            role: "system",
            content: `You are an expert developer assistant specializing in FARM stack applications. 
          Analyze errors and provide actionable solutions. Be specific and practical.`,
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        {
          model: "gpt-4", // Use most capable model for error analysis
          temperature: 0.1, // Low temperature for consistent, accurate responses
          max_tokens: 1000,
        }
      );

      return this.parseAIResponse(response);
    } catch (error) {
      console.warn("AI error analysis failed:", error.message);
      return this.fallbackAnalysis(context);
    }
  }

  private buildAnalysisPrompt(context: ErrorContext): string {
    return `
Analyze this FARM stack application error:

Component: ${context.error.component}
Error Type: ${context.error.type}
Message: ${context.error.message}

Stack Trace:
${context.error.stack?.slice(0, 10).join("\n") || "No stack trace available"}

Environment:
- Node.js: ${context.environment.nodeVersion}
- Platform: ${context.environment.platform}
- Development Mode: ${context.environment.developmentMode}
- FARM Version: ${context.environment.farmVersion}

${
  context.correlation
    ? `
Related Error: This error may be related to a ${context.correlation.type} error in ${context.correlation.rootCause?.error.component}
`
    : ""
}

Please provide:
1. Root cause analysis
2. Specific steps to fix this error
3. Prevention strategies
4. Related documentation or resources

Focus on FARM stack specifics including:
- React/TypeScript frontend issues
- FastAPI/Python backend issues  
- MongoDB database connectivity
- AI/ML model integration (Ollama, OpenAI)
- Type generation pipeline
- Hot reload system
- Plugin system
`;
  }

  private parseAIResponse(response: string): AIErrorAnalysis {
    // Parse structured response from AI
    const sections = this.extractSections(response);

    return {
      rootCause: sections.rootCause || "Unable to determine root cause",
      fixSteps: this.parseSteps(sections.fixSteps || []),
      prevention: sections.prevention || [],
      resources: this.parseResources(sections.resources || []),
      confidence: this.calculateConfidence(response),
      generatedAt: Date.now(),
    };
  }

  private extractSections(response: string): any {
    const sections: any = {};

    // Extract root cause
    const rootCauseMatch = response.match(
      /root cause[:\s]*(.*?)(?=\n\d\.|\nsteps|\nprevention|$)/is
    );
    if (rootCauseMatch) {
      sections.rootCause = rootCauseMatch[1].trim();
    }

    // Extract fix steps
    const stepsMatch = response.match(
      /steps?(.*?)(?=\nprevention|\nresources|$)/is
    );
    if (stepsMatch) {
      sections.fixSteps = this.parseNumberedList(stepsMatch[1]);
    }

    // Extract prevention strategies
    const preventionMatch = response.match(
      /prevention(.*?)(?=\nresources|$)/is
    );
    if (preventionMatch) {
      sections.prevention = this.parseNumberedList(preventionMatch[1]);
    }

    // Extract resources
    const resourcesMatch = response.match(/resources?(.*?)$/is);
    if (resourcesMatch) {
      sections.resources = this.parseNumberedList(resourcesMatch[1]);
    }

    return sections;
  }

  private parseNumberedList(text: string): string[] {
    return text
      .split(/\n\s*\d+\./)
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }

  async generateCodeFix(
    error: FarmError,
    context: ErrorContext
  ): Promise<CodeFixSuggestion | null> {
    if (!this.shouldGenerateCodeFix(error)) {
      return null;
    }

    const prompt = `
Generate a code fix for this FARM stack error:

Error: ${error.message}
Component: ${error.component}
File: ${error.file || "unknown"}

${
  error.code
    ? `
Current Code:
${error.code}
`
    : ""
}

Provide a corrected version of the code with explanation.
Focus on FARM stack patterns and best practices.
`;

    try {
      const response = await this.aiProvider.chat(
        [
          {
            role: "system",
            content:
              "You are a FARM stack expert. Provide accurate, working code fixes.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        {
          model: "gpt-4",
          temperature: 0.1,
          max_tokens: 800,
        }
      );

      return this.parseCodeFix(response);
    } catch (error) {
      console.warn("AI code fix generation failed:", error.message);
      return null;
    }
  }

  private shouldGenerateCodeFix(error: FarmError): boolean {
    const fixableTypes = [
      "syntax-error",
      "type-error",
      "import-error",
      "api-error",
      "validation-error",
    ];

    return fixableTypes.includes(error.type) && error.file && error.line;
  }
}
```

### 4. Developer Feedback Interface

**Rich, Actionable Error Display:**

```typescript
// packages/core/src/errors/feedback.ts
import chalk from "chalk";
import boxen from "boxen";
import figures from "figures";

export class DeveloperFeedback {
  private config: ErrorHandlingConfig;

  constructor(config: ErrorHandlingConfig) {
    this.config = config;
  }

  async displayError(context: ErrorContext): Promise<void> {
    const { error, correlation, analysis, suggestions } = context;

    console.log("\n"); // Add spacing

    // Main error display
    this.displayMainError(error);

    // Show correlation if exists
    if (correlation) {
      this.displayCorrelation(correlation);
    }

    // Show AI analysis if available
    if (analysis) {
      this.displayAnalysis(analysis);
    }

    // Show suggestions
    if (suggestions.length > 0) {
      this.displaySuggestions(suggestions);
    }

    // Show debugging tools
    this.displayDebuggingTools(context);

    // Show related resources
    this.displayResources(error);

    console.log("\n"); // Add spacing
  }

  private displayMainError(error: FarmError): void {
    const icon = this.getErrorIcon(error.type);
    const title = chalk.red.bold(
      `${icon} ${error.component.toUpperCase()} ERROR`
    );

    const content = [
      `${chalk.red("Message:")} ${error.message}`,
      `${chalk.gray("Type:")} ${error.type}`,
      `${chalk.gray("Component:")} ${error.component}`,
      error.file && `${chalk.gray("File:")} ${error.file}:${error.line || "?"}`,
      error.timestamp &&
        `${chalk.gray("Time:")} ${new Date(
          error.timestamp
        ).toLocaleTimeString()}`,
    ]
      .filter(Boolean)
      .join("\n");

    console.log(
      boxen(content, {
        title,
        padding: 1,
        margin: 1,
        borderStyle: "round",
        borderColor: "red",
      })
    );

    // Show stack trace if available
    if (error.stack && this.config.showStackTrace) {
      this.displayStackTrace(error.stack);
    }
  }

  private displayCorrelation(correlation: ErrorCorrelation): void {
    if (correlation.type === "cascade" && correlation.rootCause) {
      const icon = figures.arrowDown;
      console.log(chalk.yellow(`\n${icon} RELATED ERROR DETECTED`));
      console.log(
        chalk.gray(`Root cause in ${correlation.rootCause.error.component}:`)
      );
      console.log(chalk.gray(`"${correlation.rootCause.error.message}"`));
      console.log(chalk.yellow(`${figures.info} ${correlation.description}`));
      console.log(
        chalk.gray(`Confidence: ${Math.round(correlation.confidence * 100)}%`)
      );
    }
  }

  private displayAnalysis(analysis: AIErrorAnalysis): void {
    console.log(chalk.blue(`\n${figures.lightbulb} AI ANALYSIS`));

    // Root cause
    if (analysis.rootCause) {
      console.log(chalk.blue("Root Cause:"));
      console.log(chalk.gray(this.wrapText(analysis.rootCause, 80)));
    }

    // Fix steps
    if (analysis.fixSteps.length > 0) {
      console.log(chalk.blue("\nRecommended Fix:"));
      analysis.fixSteps.forEach((step, index) => {
        console.log(chalk.gray(`${index + 1}. ${step}`));
      });
    }
  }

  private displaySuggestions(suggestions: ErrorSuggestion[]): void {
    console.log(chalk.green(`\n${figures.play} QUICK FIXES`));

    suggestions.forEach((suggestion, index) => {
      const icon = this.getSuggestionIcon(suggestion.type);
      console.log(chalk.green(`${icon} ${suggestion.title}`));

      if (suggestion.description) {
        console.log(chalk.gray(`   ${suggestion.description}`));
      }

      if (suggestion.command) {
        console.log(chalk.cyan(`   $ ${suggestion.command}`));
      }

      if (suggestion.codeExample) {
        console.log(chalk.gray("   Example:"));
        console.log(
          chalk.gray("   " + suggestion.codeExample.split("\n").join("\n   "))
        );
      }

      console.log(); // Add spacing between suggestions
    });
  }

  private displayDebuggingTools(context: ErrorContext): void {
    const tools = this.getAvailableDebuggingTools(context.error);

    if (tools.length > 0) {
      console.log(chalk.magenta(`\n${figures.wrench} DEBUGGING TOOLS`));

      tools.forEach((tool) => {
        console.log(
          chalk.magenta(`${figures.pointer} ${tool.name}: ${tool.command}`)
        );
        if (tool.description) {
          console.log(chalk.gray(`   ${tool.description}`));
        }
      });
    }
  }

  private displayResources(error: FarmError): void {
    const resources = this.getRelatedResources(error);

    if (resources.length > 0) {
      console.log(chalk.blue(`\n${figures.info} HELPFUL RESOURCES`));

      resources.forEach((resource) => {
        console.log(chalk.blue(`${figures.arrowRight} ${resource.title}`));
        console.log(chalk.gray(`   ${resource.url}`));
      });
    }
  }

  private displayStackTrace(stack: string[]): void {
    console.log(chalk.gray("\nStack Trace:"));
    stack.slice(0, 5).forEach((line, index) => {
      const isUserCode = this.isUserCode(line);
      const color = isUserCode ? chalk.white : chalk.gray;
      console.log(color(`  ${index + 1}. ${line}`));
    });

    if (stack.length > 5) {
      console.log(chalk.gray(`  ... and ${stack.length - 5} more`));
    }
  }

  private getErrorIcon(errorType: string): string {
    const icons: Record<string, string> = {
      "syntax-error": "❌",
      "type-error": "🔤",
      "import-error": "📦",
      "api-error": "🌐",
      "database-error": "🗄️",
      "ai-error": "🤖",
      "build-error": "🔨",
      "runtime-error": "⚡",
      "validation-error": "✅",
      "permission-error": "🔒",
      "network-error": "📡",
      "configuration-error": "⚙️",
    };

    return icons[errorType] || "❌";
  }

  private getSuggestionIcon(suggestionType: string): string {
    const icons: Record<string, string> = {
      command: "💻",
      "code-fix": "🔧",
      configuration: "⚙️",
      documentation: "📚",
      dependency: "📦",
      restart: "🔄",
    };

    return icons[suggestionType] || "💡";
  }

  private getAvailableDebuggingTools(error: FarmError): DebuggingTool[] {
    const tools: DebuggingTool[] = [];

    // Component-specific debugging tools
    switch (error.component) {
      case "frontend":
        tools.push({
          name: "Open React DevTools",
          command: "farm debug react",
          description: "Inspect React component tree and state",
        });
        break;

      case "backend":
        tools.push({
          name: "View API Logs",
          command: "farm logs backend",
          description: "Show recent FastAPI server logs",
        });
        break;

      case "database":
        tools.push({
          name: "Test Database Connection",
          command: "farm db connect",
          description: "Verify database connectivity",
        });
        break;

      case "ai":
        tools.push({
          name: "Check AI Provider Status",
          command: "farm ai status",
          description: "Verify AI provider connections and models",
        });
        break;
    }

    // General debugging tools
    tools.push({
      name: "View All Logs",
      command: "farm logs --all",
      description: "Show logs from all services",
    });

    tools.push({
      name: "System Health Check",
      command: "farm health",
      description: "Check status of all FARM components",
    });

    return tools;
  }

  private getRelatedResources(error: FarmError): Resource[] {
    const resources: Resource[] = [];

    // Add component-specific documentation
    const baseUrl = "https://farm-stack.dev/docs";

    switch (error.component) {
      case "frontend":
        resources.push({
          title: "Frontend Troubleshooting Guide",
          url: `${baseUrl}/frontend/troubleshooting`,
        });
        break;

      case "backend":
        resources.push({
          title: "Backend API Documentation",
          url: `${baseUrl}/backend/api`,
        });
        break;

      case "database":
        resources.push({
          title: "Database Configuration Guide",
          url: `${baseUrl}/database/configuration`,
        });
        break;

      case "ai":
        resources.push({
          title: "AI Integration Guide",
          url: `${baseUrl}/ai/setup`,
        });
        break;
    }

    // Add error-type specific resources
    if (error.type === "type-error") {
      resources.push({
        title: "TypeScript Type System Guide",
        url: `${baseUrl}/typescript/types`,
      });
    }

    // Always add general troubleshooting
    resources.push({
      title: "General Troubleshooting",
      url: `${baseUrl}/troubleshooting`,
    });

    return resources;
  }

  private isUserCode(stackLine: string): boolean {
    return (
      stackLine.includes("/apps/") ||
      stackLine.includes("/src/") ||
      !stackLine.includes("node_modules")
    );
  }

  private wrapText(text: string, width: number): string {
    const words = text.split(" ");
    const lines: string[] = [];
    let currentLine = "";

    words.forEach((word) => {
      if (currentLine.length + word.length + 1 <= width) {
        currentLine += (currentLine ? " " : "") + word;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    });

    if (currentLine) lines.push(currentLine);
    return lines.join("\n");
  }
}
```

### 5. Performance Issue Detection

**Proactive Performance Monitoring:**

```typescript
// packages/core/src/errors/performance-monitor.ts
export class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private thresholds: PerformanceThresholds;
  private alerts: PerformanceAlert[] = [];

  constructor(config: ErrorHandlingConfig) {
    this.thresholds = config.performanceThresholds;
    this.startMonitoring();
  }

  private startMonitoring(): void {
    // Monitor memory usage
    setInterval(() => {
      this.checkMemoryUsage();
    }, 30000); // Every 30 seconds

    // Monitor response times
    this.setupResponseTimeMonitoring();

    // Monitor build performance
    this.setupBuildPerformanceMonitoring();

    // Monitor hot reload performance
    this.setupHotReloadMonitoring();
  }

  private checkMemoryUsage(): void {
    const usage = process.memoryUsage();
    const heapUsedMB = usage.heapUsed / 1024 / 1024;

    if (heapUsedMB > this.thresholds.memoryUsageMB) {
      this.createAlert({
        type: "memory",
        severity: "warning",
        message: `High memory usage detected: ${heapUsedMB.toFixed(1)}MB`,
        suggestions: [
          {
            type: "command",
            title: "Restart development server",
            command: "farm dev --restart",
            description: "Clear memory and restart all services",
          },
          {
            type: "documentation",
            title: "Memory optimization guide",
            description:
              "Learn how to optimize memory usage in FARM applications",
          },
        ],
      });
    }
  }

  recordAPIResponseTime(endpoint: string, duration: number): void {
    if (duration > this.thresholds.apiResponseTimeMs) {
      this.createAlert({
        type: "api-performance",
        severity: "warning",
        message: `Slow API response: ${endpoint} took ${duration}ms`,
        suggestions: [
          {
            type: "code-fix",
            title: "Optimize database queries",
            description: "Add database indexes or optimize query logic",
          },
          {
            type: "command",
            title: "Profile API endpoint",
            command: `farm profile api ${endpoint}`,
            description: "Get detailed performance breakdown",
          },
        ],
      });
    }
  }

  recordBuildTime(component: string, duration: number): void {
    if (duration > this.thresholds.buildTimeMs) {
      this.createAlert({
        type: "build-performance",
        severity: "info",
        message: `Slow build detected: ${component} took ${duration}ms`,
        suggestions: [
          {
            type: "configuration",
            title: "Enable build cache",
            description: "Reduce build times with intelligent caching",
          },
          {
            type: "command",
            title: "Analyze build bundle",
            command: "farm build --analyze",
            description:
              "Identify large dependencies and optimization opportunities",
          },
        ],
      });
    }
  }

  recordHotReloadTime(type: string, duration: number): void {
    if (duration > this.thresholds.hotReloadTimeMs) {
      this.createAlert({
        type: "hot-reload-performance",
        severity: "info",
        message: `Slow hot reload: ${type} took ${duration}ms`,
        suggestions: [
          {
            type: "configuration",
            title: "Optimize file watching",
            description: "Adjust file watch patterns to reduce overhead",
          },
          {
            type: "command",
            title: "Check system resources",
            command: "farm status --verbose",
            description: "Verify system has adequate resources",
          },
        ],
      });
    }
  }

  private createAlert(alert: PerformanceAlert): void {
    this.alerts.push({
      ...alert,
      timestamp: Date.now(),
      id: this.generateAlertId(),
    });

    // Limit alert history
    if (this.alerts.length > 50) {
      this.alerts = this.alerts.slice(-50);
    }

    // Display alert to developer
    this.displayPerformanceAlert(alert);
  }

  private displayPerformanceAlert(alert: PerformanceAlert): void {
    const icon = alert.severity === "warning" ? "⚠️" : "ℹ️";
    const color = alert.severity === "warning" ? chalk.yellow : chalk.blue;

    console.log("\n" + color(`${icon} PERFORMANCE ALERT`));
    console.log(color(alert.message));

    if (alert.suggestions && alert.suggestions.length > 0) {
      console.log(color("\nSuggestions:"));
      alert.suggestions.forEach((suggestion) => {
        console.log(color(`• ${suggestion.title}`));
        if (suggestion.command) {
          console.log(chalk.gray(`  $ ${suggestion.command}`));
        }
        if (suggestion.description) {
          console.log(chalk.gray(`  ${suggestion.description}`));
        }
      });
    }

    console.log(); // Add spacing
  }
}
```

### 6. Error Recovery Mechanisms

**Automatic Error Recovery:**

```typescript
// packages/core/src/errors/recovery.ts
export class ErrorRecovery {
  private recoveryStrategies: Map<string, RecoveryStrategy> = new Map();
  private recoveryAttempts: Map<string, number> = new Map();

  constructor() {
    this.setupRecoveryStrategies();
  }

  async attemptRecovery(
    error: FarmError,
    context: ErrorContext
  ): Promise<RecoveryResult> {
    const strategyKey = `${error.component}-${error.type}`;
    const strategy =
      this.recoveryStrategies.get(strategyKey) ||
      this.recoveryStrategies.get(error.component) ||
      this.recoveryStrategies.get("default");

    if (!strategy) {
      return { success: false, message: "No recovery strategy available" };
    }

    const attempts = this.recoveryAttempts.get(strategyKey) || 0;

    if (attempts >= strategy.maxAttempts) {
      return {
        success: false,
        message: `Maximum recovery attempts (${strategy.maxAttempts}) exceeded`,
      };
    }

    console.log(
      `🔄 Attempting automatic recovery for ${error.component} ${error.type}...`
    );

    try {
      const result = await strategy.recover(error, context);

      if (result.success) {
        console.log(`✅ Recovery successful: ${result.message}`);
        this.recoveryAttempts.delete(strategyKey);
      } else {
        this.recoveryAttempts.set(strategyKey, attempts + 1);
        console.log(`❌ Recovery failed: ${result.message}`);
      }

      return result;
    } catch (recoveryError) {
      this.recoveryAttempts.set(strategyKey, attempts + 1);
      console.error(`❌ Recovery attempt failed:`, recoveryError.message);

      return {
        success: false,
        message: `Recovery attempt failed: ${recoveryError.message}`,
      };
    }
  }

  private setupRecoveryStrategies(): void {
    // Database connection recovery
    this.recoveryStrategies.set("database-connection-error", {
      name: "Database Connection Recovery",
      maxAttempts: 3,
      recover: async (error, context) => {
        // Wait and retry connection
        await this.delay(2000);

        try {
          // Attempt to reconnect
          await this.testDatabaseConnection();
          return { success: true, message: "Database connection restored" };
        } catch (e) {
          return { success: false, message: "Database still unreachable" };
        }
      },
    });

    // AI provider recovery
    this.recoveryStrategies.set("ai-provider-error", {
      name: "AI Provider Recovery",
      maxAttempts: 2,
      recover: async (error, context) => {
        // Try to restart AI provider or switch to fallback
        if (error.message.includes("ollama")) {
          try {
            await this.restartOllamaService();
            return { success: true, message: "Ollama service restarted" };
          } catch (e) {
            // Fallback to OpenAI if available
            try {
              await this.switchToFallbackAIProvider();
              return {
                success: true,
                message: "Switched to fallback AI provider",
              };
            } catch (fallbackError) {
              return {
                success: false,
                message: "All AI providers unavailable",
              };
            }
          }
        }

        return { success: false, message: "Unknown AI provider error" };
      },
    });

    // Type generation recovery
    this.recoveryStrategies.set("codegen-type-generation-error", {
      name: "Type Generation Recovery",
      maxAttempts: 2,
      recover: async (error, context) => {
        try {
          // Clear type cache and regenerate
          await this.clearTypeCache();
          await this.regenerateTypes();
          return { success: true, message: "Types regenerated successfully" };
        } catch (e) {
          return { success: false, message: "Type generation still failing" };
        }
      },
    });

    // Frontend compilation recovery
    this.recoveryStrategies.set("frontend-compilation-error", {
      name: "Frontend Compilation Recovery",
      maxAttempts: 1,
      recover: async (error, context) => {
        try {
          // Clear node_modules cache and reinstall
          await this.clearNodeCache();
          await this.reinstallDependencies();
          return { success: true, message: "Dependencies reinstalled" };
        } catch (e) {
          return { success: false, message: "Dependency reinstall failed" };
        }
      },
    });

    // Default recovery strategy
    this.recoveryStrategies.set("default", {
      name: "Default Recovery",
      maxAttempts: 1,
      recover: async (error, context) => {
        // Generic recovery: restart the affected service
        try {
          await this.restartService(error.component);
          return {
            success: true,
            message: `${error.component} service restarted`,
          };
        } catch (e) {
          return { success: false, message: "Service restart failed" };
        }
      },
    });
  }

  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async testDatabaseConnection(): Promise<void> {
    // Implementation would test actual database connection
    throw new Error("Not implemented");
  }

  private async restartOllamaService(): Promise<void> {
    // Implementation would restart Ollama Docker container
    throw new Error("Not implemented");
  }

  private async switchToFallbackAIProvider(): Promise<void> {
    // Implementation would switch AI provider configuration
    throw new Error("Not implemented");
  }
}
```

---

## CLI Error Commands

### 1. Error Management CLI

**Developer Error Tools:**

```bash
# Error investigation commands
farm errors list                    # Show recent errors
farm errors show <error-id>         # Show detailed error information
farm errors search <query>          # Search error history
farm errors export                  # Export error logs for support

# Debugging commands
farm debug                          # Start interactive debugging session
farm debug component <name>         # Debug specific component
farm logs --follow                  # Follow live logs from all services
farm logs backend --errors          # Show only backend errors

# Health and status
farm health                         # System health check
farm status --verbose               # Detailed system status
farm doctor                         # Automated problem detection

# Recovery commands
farm recover                        # Attempt automatic recovery
farm restart <component>            # Restart specific component
farm reset --dev                    # Reset development environment
```

### 2. CLI Implementation

**Error CLI Commands:**

```typescript
// packages/cli/src/commands/errors/index.ts
export function createErrorCommands(): Command {
  const errors = new Command("errors");
  errors.description("Error management and debugging tools");

  errors
    .command("list")
    .option("-h, --hours <hours>", "Hours of history to show", "24")
    .option("-c, --component <component>", "Filter by component")
    .option("-t, --type <type>", "Filter by error type")
    .action(async (options) => {
      const errorManager = await getErrorManager();
      const history = await errorManager.getErrorHistory(
        parseInt(options.hours)
      );

      if (history.length === 0) {
        console.log(
          chalk.green("🎉 No errors found in the specified time period!")
        );
        return;
      }

      console.log(
        chalk.blue(
          `\n📋 Found ${history.length} errors in the last ${options.hours} hours:\n`
        )
      );

      history.forEach((context, index) => {
        const error = context.error;
        const timeAgo = formatTimeAgo(context.timestamp);
        const icon = getErrorIcon(error.type);

        console.log(
          `${icon} ${chalk.red(error.component)} - ${error.message.substring(
            0,
            60
          )}...`
        );
        console.log(
          chalk.gray(`   ${timeAgo} • Type: ${error.type} • ID: ${context.id}`)
        );
        console.log();
      });

      console.log(
        chalk.blue(`Use 'farm errors show <id>' for detailed information`)
      );
    });

  const doctor = new Command("doctor");
  doctor.description("Automated problem detection and solutions");

  doctor.action(async () => {
    console.log(chalk.blue("🩺 Running FARM health diagnostics...\n"));

    const diagnostics = new HealthDiagnostics();
    const results = await diagnostics.runFullDiagnostic();

    displayDiagnosticResults(results);
  });

  return errors;
}
```

---

## Integration with Development Workflow

### 1. IDE Integration

**Error Information in Development Environment:**

```typescript
// packages/core/src/errors/ide-integration.ts
export class IDEIntegration {
  async sendErrorToIDE(context: ErrorContext): Promise<void> {
    // Send error information to VS Code, WebStorm, etc.
    const errorData = {
      file: context.error.file,
      line: context.error.line,
      column: context.error.column,
      message: context.error.message,
      severity: this.mapSeverity(context.error.type),
      suggestions: context.suggestions,
      quickFixes: await this.generateQuickFixes(context),
    };

    // VS Code integration
    await this.sendToVSCode(errorData);

    // Create problem matcher output for terminal
    this.outputProblemMatcher(errorData);
  }

  private async generateQuickFixes(context: ErrorContext): Promise<QuickFix[]> {
    const fixes: QuickFix[] = [];

    // Generate code fixes based on error type
    if (context.error.type === "import-error") {
      fixes.push({
        title: "Add missing import",
        edit: await this.generateImportFix(context.error),
      });
    }

    if (context.error.type === "type-error") {
      fixes.push({
        title: "Fix type annotation",
        edit: await this.generateTypeFix(context.error),
      });
    }

    return fixes;
  }
}
```

---

## Configuration Integration

### 1. Error Handling Configuration

**TypeScript Configuration:**

```typescript
// farm.config.ts - Error handling configuration
export default defineConfig({
  errorHandling: {
    // Error collection and analysis
    enabled: true,
    collectStackTraces: true,
    maxErrorHistory: 1000,

    // AI-powered error analysis
    aiSuggestions: {
      enabled: true,
      provider: "openai", // or 'ollama'
      model: "gpt-4",
      maxSuggestions: 5,
    },

    // Developer feedback
    feedback: {
      showInTerminal: true,
      showStackTrace: process.env.NODE_ENV === "development",
      colorOutput: true,
      detailedSuggestions: true,
      showPerformanceAlerts: true,
    },

    // Error correlation
    correlation: {
      enabled: true,
      timeWindowMs: 300000, // 5 minutes
      cascadeDetection: true,
      crossComponentAnalysis: true,
    },

    // Performance monitoring
    performanceThresholds: {
      memoryUsageMB: 1024,
      apiResponseTimeMs: 2000,
      buildTimeMs: 30000,
      hotReloadTimeMs: 5000,
    },

    // Recovery mechanisms
    autoRecovery: {
      enabled: true,
      maxAttempts: 3,
      strategies: ["restart", "fallback", "cache-clear"],
    },

    // Production error handling
    production: {
      reportErrors: true,
      errorReporting: {
        service: "sentry", // or 'custom'
        apiKey: process.env.ERROR_REPORTING_KEY,
      },
      suppressStackTraces: true,
      logLevel: "error",
    },
  },
});
```

---

_Status: ✅ Completed - Ready for implementation_

This comprehensive error handling system provides:

- **Central error aggregation** across all FARM components
- **Intelligent error correlation** to identify root causes and cascading failures
- **AI-powered error analysis** with actionable solutions and code fixes
- **Rich developer feedback** with terminal-based error display
- **Performance monitoring** with proactive issue detection
- **Automatic error recovery** mechanisms to maintain development flow
- **Cross-stack debugging tools** integrated with the CLI
- **IDE integration** for seamless development workflow
- **Production-ready error reporting** with privacy and security considerations

The system maintains FARM's commitment to excellent developer experience by turning errors from roadblocks into learning opportunities with clear, actionable guidance for resolution.

---

## Phase 2 Completion Summary

✅ **Plugin System Architecture** - Type-safe, hot-reloadable plugin system
✅ **Authentication & Authorization Flow** - Comprehensive auth with RBAC and AI integration  
✅ **Database Integration Architecture** - MongoDB-first with flexible multi-database support
✅ **Build System Architecture** - Production-ready build pipeline with optimization
✅ **Hot Reload System Design** - Intelligent cross-stack hot reloading
✅ **Error Handling & Developer Feedback** - AI-powered error management and recovery
