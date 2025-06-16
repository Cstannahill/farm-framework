// Simple TypeScript/JavaScript code parser using AST
import * as ts from "typescript";
import * as path from "path";
import type { CodeEntity, EntityType, CodePosition } from "../types/index";

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
        this.extractFunction(
          node as ts.FunctionDeclaration,
          entities,
          content,
          filePath
        );
        break;

      case ts.SyntaxKind.ClassDeclaration:
        this.extractClass(
          node as ts.ClassDeclaration,
          entities,
          content,
          filePath
        );
        break;

      case ts.SyntaxKind.InterfaceDeclaration:
        this.extractInterface(
          node as ts.InterfaceDeclaration,
          entities,
          content,
          filePath
        );
        break;

      case ts.SyntaxKind.TypeAliasDeclaration:
        this.extractTypeAlias(
          node as ts.TypeAliasDeclaration,
          entities,
          content,
          filePath
        );
        break;

      case ts.SyntaxKind.VariableStatement:
        this.extractVariable(
          node as ts.VariableStatement,
          entities,
          content,
          filePath
        );
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
    ts.forEachChild(node, (child) =>
      this.visitNode(child, entities, content, filePath)
    );
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
      metadata: {
        language: this.getLanguage(filePath),
        async: this.isAsync(node),
        exported: this.isExported(node),
        parameters: this.getParameters(node),
      },
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
      metadata: {
        language: this.getLanguage(filePath),
        exported: this.isExported(node),
        extends: this.getExtendsClause(node),
        implements: this.getImplementsClause(node),
      },
    });

    // Extract methods
    node.members.forEach((member) => {
      if (
        ts.isMethodDeclaration(member) &&
        member.name &&
        ts.isIdentifier(member.name)
      ) {
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
          metadata: {
            language: this.getLanguage(filePath),
            className: name,
            async: this.isAsync(member),
            static: this.hasModifier(member, ts.SyntaxKind.StaticKeyword),
            private: this.hasModifier(member, ts.SyntaxKind.PrivateKeyword),
          },
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
      metadata: {
        language: this.getLanguage(filePath),
        exported: this.isExported(node),
        extends: this.getInterfaceExtends(node),
      },
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
      metadata: {
        language: this.getLanguage(filePath),
        exported: this.isExported(node),
      },
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
    node.declarationList.declarations.forEach((declaration) => {
      if (ts.isIdentifier(declaration.name)) {
        const name = declaration.name.getText();
        const position = this.getPosition(declaration, content);
        const codeContent = this.getNodeContent(node, content);

        // Check if it's a component (starts with capital letter and has JSX)
        const isComponent =
          /^[A-Z]/.test(name) &&
          (codeContent.includes("jsx") ||
            codeContent.includes("tsx") ||
            codeContent.includes("React.") ||
            codeContent.includes("return (") ||
            codeContent.includes("return<"));

        entities.push({
          id: `${filePath}:${name}:${position.line}`,
          name,
          entityType: isComponent ? "component" : ("variable" as EntityType),
          filePath,
          position,
          content: codeContent,
          metadata: {
            language: this.getLanguage(filePath),
            exported: this.isExported(node),
            const: this.hasKeyword(node, ts.SyntaxKind.ConstKeyword),
            isComponent,
          },
        });
      }
    });
  }

  /**
   * Extract arrow function from variable declaration
   */
  private extractArrowFunction(
    declaration: ts.VariableDeclaration,
    func: ts.ArrowFunction | ts.FunctionExpression,
    entities: CodeEntity[],
    content: string,
    filePath: string
  ): void {
    if (!ts.isIdentifier(declaration.name)) return;

    const name = declaration.name.getText();
    const position = this.getPosition(declaration, content);
    const codeContent = this.getNodeContent(declaration.parent.parent, content); // Get the whole variable statement

    // Check if it's a React component
    const isComponent =
      /^[A-Z]/.test(name) &&
      (codeContent.includes("jsx") ||
        codeContent.includes("tsx") ||
        codeContent.includes("React.") ||
        codeContent.includes("return (") ||
        codeContent.includes("return<"));

    entities.push({
      id: `${filePath}:${name}:${position.line}`,
      name,
      entityType: isComponent ? "component" : ("function" as EntityType),
      filePath,
      position,
      content: codeContent,
      metadata: {
        language: this.getLanguage(filePath),
        async: this.isAsync(func),
        arrow: true,
        isComponent,
      },
    });
  }

  // Helper methods

  private getPosition(node: ts.Node, content: string): CodePosition {
    const sourceFile = node.getSourceFile();
    const { line, character } = sourceFile.getLineAndCharacterOfPosition(
      node.getStart()
    );
    return { line: line + 1, column: character + 1 };
  }

  private getNodeContent(node: ts.Node, content: string): string {
    const sourceFile = node.getSourceFile();
    return content.substring(node.getStart(sourceFile), node.getEnd());
  }

  private getLanguage(filePath: string): string {
    const ext = path.extname(filePath);
    switch (ext) {
      case ".ts":
        return "typescript";
      case ".tsx":
        return "typescript";
      case ".js":
        return "javascript";
      case ".jsx":
        return "javascript";
      default:
        return "typescript";
    }
  }

  private getFunctionSignature(node: ts.FunctionDeclaration): string {
    const sourceFile = node.getSourceFile();
    const signatureEnd = node.body
      ? node.body.getStart(sourceFile)
      : node.getEnd();
    return node
      .getSourceFile()
      .text.substring(node.getStart(sourceFile), signatureEnd)
      .trim();
  }

  private getMethodSignature(node: ts.MethodDeclaration): string {
    const sourceFile = node.getSourceFile();
    const signatureEnd = node.body
      ? node.body.getStart(sourceFile)
      : node.getEnd();
    return node
      .getSourceFile()
      .text.substring(node.getStart(sourceFile), signatureEnd)
      .trim();
  }

  private getDocstring(node: ts.Node, content: string): string | undefined {
    const sourceFile = node.getSourceFile();
    const comments = ts.getLeadingCommentRanges(content, node.getFullStart());

    if (comments && comments.length > 0) {
      const lastComment = comments[comments.length - 1];
      const commentText = content.substring(lastComment.pos, lastComment.end);

      // Clean up JSDoc comments
      return commentText
        .replace(/\/\*\*|\*\/|\*/g, "")
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .join("\n");
    }

    return undefined;
  }

  private isAsync(node: ts.Node): boolean {
    return !!(
      ts.getCombinedModifierFlags(node as any) & ts.ModifierFlags.Async
    );
  }

  private isExported(node: ts.Node): boolean {
    return !!(
      ts.getCombinedModifierFlags(node as any) & ts.ModifierFlags.Export
    );
  }

  private hasModifier(node: ts.Node, modifier: ts.SyntaxKind): boolean {
    return node.modifiers?.some((mod) => mod.kind === modifier) || false;
  }

  private hasKeyword(node: ts.Node, keyword: ts.SyntaxKind): boolean {
    return (node as any).declarationList?.flags & ts.NodeFlags.Const || false;
  }

  private getParameters(node: ts.FunctionDeclaration): string[] {
    return node.parameters.map((param) => param.name.getText());
  }

  private getExtendsClause(node: ts.ClassDeclaration): string | undefined {
    return node.heritageClauses
      ?.find((clause) => clause.token === ts.SyntaxKind.ExtendsKeyword)
      ?.types[0]?.expression.getText();
  }

  private getImplementsClause(node: ts.ClassDeclaration): string[] {
    return (
      node.heritageClauses
        ?.find((clause) => clause.token === ts.SyntaxKind.ImplementsKeyword)
        ?.types.map((type) => type.expression.getText()) || []
    );
  }

  private getInterfaceExtends(node: ts.InterfaceDeclaration): string[] {
    return (
      node.heritageClauses
        ?.find((clause) => clause.token === ts.SyntaxKind.ExtendsKeyword)
        ?.types.map((type) => type.expression.getText()) || []
    );
  }
}
