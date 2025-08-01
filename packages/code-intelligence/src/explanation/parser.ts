// Simple TypeScript/JavaScript code parser using AST
import * as ts from "typescript";
import * as path from "path";
import type { CodeEntity, EntityType } from "../types/index";

export class TypeScriptParser {
  /**
   * Parse a TypeScript/JavaScript file and extract code entities
   */
  async parseFile(filePath: string, content: string): Promise<CodeEntity[]> {
    const entities: CodeEntity[] = [];

    try {
      // Create TypeScript source file
      const sourceFile = ts.createSourceFile(
        filePath,
        content,
        ts.ScriptTarget.Latest,
        true,
        filePath.endsWith(".tsx") || filePath.endsWith(".jsx")
          ? ts.ScriptKind.TSX
          : ts.ScriptKind.TS
      );

      // Walk the AST and extract entities
      this.visitNode(sourceFile, entities, content, filePath);

      return entities;
    } catch (error) {
      console.warn(`Failed to parse ${filePath}:`, error);
      return [];
    }
  }

  /**
   * Recursively visit AST nodes and extract code entities
   */
  private visitNode(
    node: ts.Node,
    entities: CodeEntity[],
    content: string,
    filePath: string
  ): void {
    switch (node.kind) {
      case ts.SyntaxKind.FunctionDeclaration:
        this.extractFunction(node as ts.FunctionDeclaration, entities, content, filePath);
        break;

      case ts.SyntaxKind.ClassDeclaration:
        this.extractClass(node as ts.ClassDeclaration, entities, content, filePath);
        break;

      case ts.SyntaxKind.InterfaceDeclaration:
        this.extractInterface(node as ts.InterfaceDeclaration, entities, content, filePath);
        break;

      case ts.SyntaxKind.TypeAliasDeclaration:
        this.extractTypeAlias(node as ts.TypeAliasDeclaration, entities, content, filePath);
        break;

      case ts.SyntaxKind.VariableStatement:
        this.extractVariable(node as ts.VariableStatement, entities, content, filePath);
        break;

      case ts.SyntaxKind.ArrowFunction:
      case ts.SyntaxKind.FunctionExpression:
        // Handle arrow functions and function expressions in variable declarations
        if (node.parent && ts.isVariableDeclaration(node.parent)) {
          this.extractArrowFunction(
            node.parent,
            node as ts.ArrowFunction | ts.FunctionExpression,
            entities,
            content,
            filePath
          );
        }
        break;
    }

    // Continue visiting child nodes
    ts.forEachChild(node, (child) => this.visitNode(child, entities, content, filePath));
  }

  /**
   * Extract function declaration
   */
  private extractFunction(
    node: ts.FunctionDeclaration,
    entities: CodeEntity[],
    content: string,
    filePath: string
  ): void {
    if (!node.name) return;

    const name = node.name.getText();
    const position = this.getPosition(node, content);
    const codeContent = this.getNodeContent(node, content);
    const signature = this.getFunctionSignature(node);
    const docstring = this.getDocstring(node, content);

    entities.push({
      id: `${filePath}:${name}:${position.line}`,
      name,
      entityType: "function" as EntityType,
      filePath,
      position,
      content: codeContent,
      signature,
      docstring,
      dependencies: [],
      references: [],
      complexity: this.calculateComplexity(codeContent),
      tokens: codeContent.split(/\s+/).length,
      metadata: {
        language: this.getLanguage(filePath),
        async: this.isAsync(node),
        exported: this.isExported(node),
        parameters: this.getParameters(node),
      },
      relationships: [],
    });
  }

  /**
   * Extract class declaration
   */
  private extractClass(
    node: ts.ClassDeclaration,
    entities: CodeEntity[],
    content: string,
    filePath: string
  ): void {
    if (!node.name) return;

    const name = node.name.getText();
    const position = this.getPosition(node, content);
    const codeContent = this.getNodeContent(node, content);
    const docstring = this.getDocstring(node, content);

    entities.push({
      id: `${filePath}:${name}:${position.line}`,
      name,
      entityType: "class" as EntityType,
      filePath,
      position,
      content: codeContent,
      docstring,
      dependencies: [],
      references: [],
      complexity: this.calculateComplexity(codeContent),
      tokens: codeContent.split(/\s+/).length,
      metadata: {
        language: this.getLanguage(filePath),
        exported: this.isExported(node),
        extends: this.getExtendsClause(node),
        implements: this.getImplementsClause(node),
      },
      relationships: [],
    });

    // Extract methods from the class
    node.members.forEach((member) => {
      if (ts.isMethodDeclaration(member) && member.name) {
        const methodName = member.name.getText();
        const methodPosition = this.getPosition(member, content);
        const methodContent = this.getNodeContent(member, content);
        const methodSignature = this.getMethodSignature(member);

        entities.push({
          id: `${filePath}:${name}.${methodName}:${methodPosition.line}`,
          name: `${name}.${methodName}`,
          entityType: "method" as EntityType,
          filePath,
          position: methodPosition,
          content: methodContent,
          signature: methodSignature,
          dependencies: [],
          references: [],
          complexity: this.calculateComplexity(methodContent),
          tokens: methodContent.split(/\s+/).length,
          metadata: {
            language: this.getLanguage(filePath),
            async: this.isAsync(member),
            className: name,
            static: this.hasModifier(member, ts.SyntaxKind.StaticKeyword),
            private: this.hasModifier(member, ts.SyntaxKind.PrivateKeyword),
            protected: this.hasModifier(member, ts.SyntaxKind.ProtectedKeyword),
          },
          relationships: [],
        });
      }
    });
  }

  /**
   * Extract interface declaration
   */
  private extractInterface(
    node: ts.InterfaceDeclaration,
    entities: CodeEntity[],
    content: string,
    filePath: string
  ): void {
    const name = node.name.getText();
    const position = this.getPosition(node, content);
    const codeContent = this.getNodeContent(node, content);
    const docstring = this.getDocstring(node, content);

    entities.push({
      id: `${filePath}:${name}:${position.line}`,
      name,
      entityType: "interface" as EntityType,
      filePath,
      position,
      content: codeContent,
      docstring,
      dependencies: [],
      references: [],
      complexity: this.calculateComplexity(codeContent),
      tokens: codeContent.split(/\s+/).length,
      metadata: {
        language: this.getLanguage(filePath),
        exported: this.isExported(node),
        extends: this.getInterfaceExtends(node),
      },
      relationships: [],
    });
  }

  /**
   * Extract type alias
   */
  private extractTypeAlias(
    node: ts.TypeAliasDeclaration,
    entities: CodeEntity[],
    content: string,
    filePath: string
  ): void {
    const name = node.name.getText();
    const position = this.getPosition(node, content);
    const codeContent = this.getNodeContent(node, content);
    const docstring = this.getDocstring(node, content);

    entities.push({
      id: `${filePath}:${name}:${position.line}`,
      name,
      entityType: "type" as EntityType,
      filePath,
      position,
      content: codeContent,
      docstring,
      dependencies: [],
      references: [],
      complexity: this.calculateComplexity(codeContent),
      tokens: codeContent.split(/\s+/).length,
      metadata: {
        language: this.getLanguage(filePath),
        exported: this.isExported(node),
      },
      relationships: [],
    });
  }

  /**
   * Extract variable declaration
   */
  private extractVariable(
    node: ts.VariableStatement,
    entities: CodeEntity[],
    content: string,
    filePath: string
  ): void {
    node.declarationList.declarations.forEach((decl) => {
      if (ts.isIdentifier(decl.name)) {
        const name = decl.name.getText();
        const position = this.getPosition(decl, content);
        const codeContent = this.getNodeContent(node, content);

        entities.push({
          id: `${filePath}:${name}:${position.line}`,
          name,
          entityType: "variable" as EntityType,
          filePath,
          position,
          content: codeContent,
          dependencies: [],
          references: [],
          complexity: this.calculateComplexity(codeContent),
          tokens: codeContent.split(/\s+/).length,
          metadata: {
            language: this.getLanguage(filePath),
            exported: this.isExported(node),
            const: this.hasKeyword(node, ts.SyntaxKind.ConstKeyword),
            let: this.hasKeyword(node, ts.SyntaxKind.LetKeyword),
          },
          relationships: [],
        });
      }
    });
  }

  /**
   * Extract arrow function from variable declaration
   */
  private extractArrowFunction(
    varDecl: ts.VariableDeclaration,
    funcNode: ts.ArrowFunction | ts.FunctionExpression,
    entities: CodeEntity[],
    content: string,
    filePath: string
  ): void {
    if (!ts.isIdentifier(varDecl.name)) return;

    const name = varDecl.name.getText();
    const position = this.getPosition(varDecl, content);
    const codeContent = this.getNodeContent(funcNode, content);

    entities.push({
      id: `${filePath}:${name}:${position.line}`,
      name,
      entityType: "function" as EntityType,
      filePath,
      position,
      content: codeContent,
      dependencies: [],
      references: [],
      complexity: this.calculateComplexity(codeContent),
      tokens: codeContent.split(/\s+/).length,
      metadata: {
        language: this.getLanguage(filePath),
        async: this.isAsync(funcNode),
        arrow: true,
      },
      relationships: [],
    });
  }

  private getPosition(node: ts.Node, content: string) {
    const sourceFile = node.getSourceFile();
    const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
    return {
      line: line + 1,
      column: character,
    };
  }

  private getNodeContent(node: ts.Node, content: string): string {
    return node.getText();
  }

  private getLanguage(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    switch (ext) {
      case ".ts":
      case ".tsx":
        return "typescript";
      case ".js":
      case ".jsx":
        return "javascript";
      default:
        return "typescript";
    }
  }

  private getFunctionSignature(node: ts.FunctionDeclaration): string {
    return node.getText().split("{")[0].trim() + " {";
  }

  private getMethodSignature(node: ts.MethodDeclaration): string {
    return node.getText().split("{")[0].trim() + " {";
  }

  private getDocstring(node: ts.Node, content: string): string | undefined {
    // Look for JSDoc comments before the node
    const sourceFile = node.getSourceFile();
    const fullText = sourceFile.getFullText();
    const nodeStart = node.getFullStart();
    
    // Simple regex to find JSDoc comments
    const beforeNode = fullText.substring(0, nodeStart);
    const jsdocMatch = beforeNode.match(/\/\*\*[\s\S]*?\*\/\s*$/);
    
    if (jsdocMatch) {
      return jsdocMatch[0].trim();
    }

    return undefined;
  }

  private isAsync(node: ts.Node): boolean {
    return this.hasModifier(node, ts.SyntaxKind.AsyncKeyword);
  }

  private isExported(node: ts.Node): boolean {
    return this.hasModifier(node, ts.SyntaxKind.ExportKeyword);
  }

  private hasModifier(node: ts.Node, kind: ts.SyntaxKind): boolean {
    return ts.canHaveModifiers(node) && 
           ts.getModifiers(node)?.some(mod => mod.kind === kind) || false;
  }

  private hasKeyword(node: ts.VariableStatement, kind: ts.SyntaxKind): boolean {
    return node.declarationList.flags === ts.NodeFlags.Const && kind === ts.SyntaxKind.ConstKeyword ||
           node.declarationList.flags === ts.NodeFlags.Let && kind === ts.SyntaxKind.LetKeyword;
  }

  private getParameters(node: ts.FunctionDeclaration | ts.MethodDeclaration): string[] {
    return node.parameters.map(param => param.name.getText());
  }

  private getExtendsClause(node: ts.ClassDeclaration): string | undefined {
    const heritageClause = node.heritageClauses?.find(
      clause => clause.token === ts.SyntaxKind.ExtendsKeyword
    );
    return heritageClause?.types[0]?.expression.getText();
  }

  private getImplementsClause(node: ts.ClassDeclaration): string[] {
    const implementsClause = node.heritageClauses?.find(
      clause => clause.token === ts.SyntaxKind.ImplementsKeyword
    );
    return implementsClause?.types.map(type => type.expression.getText()) || [];
  }

  private getInterfaceExtends(node: ts.InterfaceDeclaration): string[] {
    const extendsClause = node.heritageClauses?.find(
      clause => clause.token === ts.SyntaxKind.ExtendsKeyword
    );
    return extendsClause?.types.map(type => type.expression.getText()) || [];
  }

  private calculateComplexity(content: string): number {
    let complexity = 1;

    // Simple complexity calculation
    const lowerContent = content.toLowerCase();

    // Control flow statements
    complexity += (lowerContent.match(/\b(if|else|for|while|switch|case)\b/g) || []).length;

    // Function calls
    complexity += (content.match(/\w+\(/g) || []).length * 0.5;

    // Nested structures
    complexity += (content.match(/\{/g) || []).length * 0.3;

    return Math.round(complexity);
  }
}