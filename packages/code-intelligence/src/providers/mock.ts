// Mock AI provider for testing and development
import type { AIProvider } from "../explanation/engine";

export class MockProvider implements AIProvider {
  private delay: number;

  constructor(delay: number = 500) {
    this.delay = delay;
  }

  async generateExplanation(prompt: string, context: string): Promise<string> {
    // Simulate AI processing delay
    await new Promise((resolve) => setTimeout(resolve, this.delay));

    // Generate a mock explanation based on the context
    const lines = context.split("\n");
    const firstLine = lines[0] || "";

    // Simple heuristics to generate explanations
    if (
      firstLine.includes("function ") ||
      (firstLine.includes("const ") && firstLine.includes("="))
    ) {
      return this.generateFunctionExplanation(context);
    } else if (firstLine.includes("class ")) {
      return this.generateClassExplanation(context);
    } else if (
      firstLine.includes("interface ") ||
      firstLine.includes("type ")
    ) {
      return this.generateTypeExplanation(context);
    } else if (
      firstLine.includes("export ") &&
      firstLine.includes("const ") &&
      context.includes("React")
    ) {
      return this.generateComponentExplanation(context);
    }

    return this.generateGenericExplanation(context);
  }

  private generateFunctionExplanation(context: string): string {
    const lines = context.split("\n");
    const functionLine = lines[0];

    // Extract function name
    const nameMatch = functionLine.match(/(?:function\s+|const\s+)(\w+)/);
    const functionName = nameMatch ? nameMatch[1] : "this function";

    // Check if it's async
    const isAsync = functionLine.includes("async");

    // Check parameters
    const paramMatch = functionLine.match(/\(([^)]*)\)/);
    const hasParams = paramMatch && paramMatch[1].trim().length > 0;

    return `## ${functionName}

**Type**: ${isAsync ? "Async " : ""}Function

**Purpose**: This ${isAsync ? "asynchronous " : ""}function ${hasParams ? "accepts parameters and " : ""}performs a specific operation in the codebase.

**Key Features**:
- ${isAsync ? "🔄 Asynchronous execution with Promise-based return" : "⚡ Synchronous execution"}
- ${hasParams ? "📥 Accepts input parameters for processing" : "🎯 No-parameter function"}
- 🏗️ Part of the application's business logic

**Usage Context**: 
This function appears to be a utility or business logic function that handles ${hasParams ? "parameterized operations" : "specific functionality"} within the application.

*Note: This is a mock explanation. In production, this would be generated by an AI model with deep code understanding.*`;
  }

  private generateClassExplanation(context: string): string {
    const lines = context.split("\n");
    const classLine = lines[0];

    // Extract class name
    const nameMatch = classLine.match(/class\s+(\w+)/);
    const className = nameMatch ? nameMatch[1] : "this class";

    // Check if it extends something
    const extendsMatch = classLine.match(/extends\s+(\w+)/);
    const parentClass = extendsMatch ? extendsMatch[1] : null;

    return `## ${className}

**Type**: Class Definition

**Purpose**: This class defines a reusable component or service within the application architecture.

**Key Features**:
- 🏛️ Object-oriented design pattern
- ${parentClass ? `🔗 Inherits from ${parentClass}` : "🎯 Base class implementation"}
- 🎭 Encapsulates data and methods
- 🔧 Provides structured functionality

**Architecture Role**: 
This class serves as a ${parentClass ? "specialized extension" : "foundational component"} in the application's object model, providing organized and reusable functionality.

*Note: This is a mock explanation. In production, this would be generated by an AI model with deep code understanding.*`;
  }

  private generateTypeExplanation(context: string): string {
    const lines = context.split("\n");
    const typeLine = lines[0];

    // Extract type name
    const nameMatch = typeLine.match(/(?:interface|type)\s+(\w+)/);
    const typeName = nameMatch ? nameMatch[1] : "this type";

    const isInterface = typeLine.includes("interface");

    return `## ${typeName}

**Type**: ${isInterface ? "Interface" : "Type"} Definition

**Purpose**: This ${isInterface ? "interface" : "type"} defines the structure and contract for data in the application.

**Key Features**:
- 📋 Type safety and structure definition
- ${isInterface ? "🔧 Extensible and implementable" : "🎯 Precise type alias"}
- 🛡️ Compile-time validation
- 📚 Documentation through types

**Usage Context**: 
This ${isInterface ? "interface" : "type"} provides type safety and clear contracts for data structures used throughout the application, ensuring consistent data handling.

*Note: This is a mock explanation. In production, this would be generated by an AI model with deep code understanding.*`;
  }

  private generateComponentExplanation(context: string): string {
    const lines = context.split("\n");
    const componentLine = lines[0];

    // Extract component name
    const nameMatch = componentLine.match(/const\s+(\w+)/);
    const componentName = nameMatch ? nameMatch[1] : "this component";

    return `## ${componentName}

**Type**: React Component

**Purpose**: This React component renders UI elements and manages user interface logic.

**Key Features**:
- ⚛️ React functional component
- 🎨 UI rendering and presentation
- 🔄 State management (potentially)
- 🎯 User interaction handling

**UI Role**: 
This component is part of the user interface, responsible for rendering specific UI elements and handling user interactions within the React application.

*Note: This is a mock explanation. In production, this would be generated by an AI model with deep code understanding.*`;
  }

  private generateGenericExplanation(context: string): string {
    return `## Code Analysis

**Type**: Code Entity

**Purpose**: This code defines functionality within the application.

**Key Features**:
- 💻 Application logic implementation
- 🔧 Functional code structure
- 📦 Part of the codebase architecture

**Context**: 
This code entity contributes to the overall application functionality and serves a specific purpose within the system architecture.

*Note: This is a mock explanation. In production, this would be generated by an AI model with deep code understanding.*`;
  }
}
