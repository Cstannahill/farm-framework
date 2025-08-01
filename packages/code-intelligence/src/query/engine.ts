import type { QueryResponse, QueryPlan, QueryContext } from "../types/index";

export class CodeQueryEngine {
  private vectorStore: any;
  private analyzer: any;
  private aiProvider: any;
  private queryPlanner: QueryPlanner;

  constructor(vectorStore: any, analyzer: any, aiProvider: any) {
    this.vectorStore = vectorStore;
    this.analyzer = analyzer;
    this.aiProvider = aiProvider;
    this.queryPlanner = new QueryPlanner();
  }

  /**
   * Execute a natural language query against the codebase
   */
  async query(naturalQuery: string, context?: QueryContext): Promise<QueryResponse> {
    try {
      // Plan the query
      const plan = await this.queryPlanner.plan(naturalQuery, context);
      
      let response: QueryResponse;

      // Execute based on query type
      switch (plan.queryType) {
        case "search":
          response = await this.executeSearch(naturalQuery, plan, context);
          break;
        case "explain":
          response = await this.executeExplain(naturalQuery, plan, context);
          break;
        case "analyze":
          response = await this.executeAnalyze(naturalQuery, plan, context);
          break;
        case "generate":
          response = await this.executeGenerate(naturalQuery, plan, context);
          break;
        default:
          response = await this.executeHybrid(naturalQuery, plan, context);
      }

      response.plan = plan;
      return response;
    } catch (error) {
      return {
        results: [],
        error: error instanceof Error ? error.message : "Unknown query error",
        metrics: {
          totalResults: 0,
          searchTime: 0,
          cacheHit: false,
        },
      };
    }
  }

  private async executeSearch(
    query: string,
    plan: QueryPlan,
    context?: QueryContext
  ): Promise<QueryResponse> {
    const startTime = Date.now();

    // Generate embedding for the query
    const embedding = await this.generateQueryEmbedding(query);

    // Search the vector store
    const searchResults = await this.vectorStore.similaritySearch(
      embedding,
      plan.maxResults,
      plan.filters
    );

    // Enrich with context if requested
    const enrichedResults = plan.includeContext
      ? await this.enrichWithContext(searchResults)
      : searchResults;

    // Generate AI synthesis if requested
    let synthesis;
    if (plan.useAiSynthesis) {
      synthesis = await this.synthesizeResponse(query, enrichedResults);
    }

    return {
      results: enrichedResults.map((result: any) => ({
        id: result.entity.id,
        score: result.score,
        entity: result.entity,
        highlights: this.extractHighlights(query, result.entity.content),
      })),
      synthesis,
      metrics: {
        totalResults: enrichedResults.length,
        searchTime: Date.now() - startTime,
        cacheHit: false,
      },
    };
  }

  private async executeExplain(
    query: string,
    plan: QueryPlan,
    context?: QueryContext
  ): Promise<QueryResponse> {
    const startTime = Date.now();

    // Extract entity name from query
    const entityName = this.extractEntityName(query);
    if (!entityName) {
      throw new Error("Could not identify entity to explain");
    }

    // Find the entity
    const entity = await this.findEntity(entityName);
    if (!entity) {
      throw new Error(`Entity '${entityName}' not found`);
    }

    // Build context
    const entityContext = plan.includeContext
      ? await this.buildEntityContext(entity)
      : undefined;

    // Generate explanation
    const explanation = await this.generateExplanation(entity, entityContext);

    return {
      results: [{
        id: entity.id,
        score: 1.0,
        entity,
        explanation,
      }],
      context: entityContext,
      metrics: {
        totalResults: 1,
        searchTime: Date.now() - startTime,
        cacheHit: false,
      },
    };
  }

  private async executeAnalyze(
    query: string,
    plan: QueryPlan,
    context?: QueryContext
  ): Promise<QueryResponse> {
    const startTime = Date.now();

    // Use the analyzer to get insights
    const analysis = await this.analyzer.analyzeCodebase({
      includePatterns: true,
      includeMetrics: true,
      includeHotspots: true,
    });

    // Filter analysis based on query intent
    const relevantFindings = this.filterAnalysisResults(analysis, query);

    return {
      results: relevantFindings,
      synthesis: `Analysis complete. Found ${relevantFindings.length} relevant insights.`,
      metrics: {
        totalResults: relevantFindings.length,
        searchTime: Date.now() - startTime,
        cacheHit: false,
      },
    };
  }

  private async executeGenerate(
    query: string,
    plan: QueryPlan,
    context?: QueryContext
  ): Promise<QueryResponse> {
    const startTime = Date.now();

    // Generate code or documentation based on query
    const generatedContent = await this.aiProvider.generateExplanation(
      `Generate code or documentation based on this request: ${query}`,
      context?.selectedText || ""
    );

    return {
      results: [{
        id: `generated-${Date.now()}`,
        score: 1.0,
        entity: {
          id: `generated-${Date.now()}`,
          name: "Generated Content",
          entityType: "generated" as any,
          filePath: "generated",
          content: generatedContent,
          dependencies: [],
          references: [],
          complexity: 1,
          tokens: generatedContent.split(' ').length,
          metadata: { generated: true, language: "text" },
          relationships: [],
          position: { line: 1, column: 1 },
        },
      }],
      synthesis: "Content generated based on your request.",
      metrics: {
        totalResults: 1,
        searchTime: Date.now() - startTime,
        cacheHit: false,
      },
    };
  }

  private async executeHybrid(
    query: string,
    plan: QueryPlan,
    context?: QueryContext
  ): Promise<QueryResponse> {
    // Combine search and analysis for complex queries
    const searchResponse = await this.executeSearch(query, plan, context);
    
    // Add AI synthesis to interpret results
    const synthesis = await this.synthesizeResponse(query, searchResponse.results);
    
    return {
      ...searchResponse,
      synthesis,
    };
  }

  private async generateQueryEmbedding(query: string): Promise<number[]> {
    // Mock implementation - would use actual embedding service
    return Array.from({ length: 384 }, () => Math.random());
  }

  private async enrichWithContext(results: any[]): Promise<any[]> {
    // Add related entities, dependencies, etc.
    return results.map(result => ({
      ...result,
      relevantContext: [], // Would populate with related entities
    }));
  }

  private async synthesizeResponse(query: string, results: any[]): Promise<string> {
    if (results.length === 0) {
      return "No relevant code found for your query.";
    }

    const prompt = `
Synthesize a response for the query: "${query}"

Based on these search results:
${results.slice(0, 3).map((r, i) => 
  `${i + 1}. ${r.entity.name} (${r.entity.entityType}) - ${r.entity.filePath}`
).join('\n')}

Provide a helpful summary and guidance.
`;

    return await this.aiProvider.generateExplanation(prompt, "");
  }

  private extractEntityName(query: string): string | null {
    // Simple extraction - would use more sophisticated NLP
    const patterns = [
      /explain\s+(\w+)/i,
      /what\s+is\s+(\w+)/i,
      /tell\s+me\s+about\s+(\w+)/i,
      /describe\s+(\w+)/i,
    ];

    for (const pattern of patterns) {
      const match = query.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return null;
  }

  private async findEntity(name: string): Promise<any> {
    // Search for entity by name
    const results = await this.vectorStore.textSearch(name, 1, {
      exactMatch: true,
    });

    return results.length > 0 ? results[0].entity : null;
  }

  private async buildEntityContext(entity: any): Promise<any> {
    // Build comprehensive context for the entity
    return {
      entity,
      related: [], // Related entities
      usages: [], // Usage examples
      tests: [], // Test cases
      documentation: [], // Documentation
    };
  }

  private async generateExplanation(entity: any, context?: any): Promise<string> {
    const prompt = `Explain the code entity: ${entity.name}`;
    return await this.aiProvider.generateExplanation(prompt, entity.content);
  }

  private extractHighlights(query: string, content: string): string[] {
    // Extract relevant snippets from content
    const queryWords = query.toLowerCase().split(/\s+/);
    const lines = content.split('\n');
    
    return lines
      .filter(line => 
        queryWords.some(word => line.toLowerCase().includes(word))
      )
      .slice(0, 3);
  }

  private filterAnalysisResults(analysis: any, query: string): any[] {
    // Filter analysis results based on query intent
    const results = [];

    if (query.includes("pattern") || query.includes("architecture")) {
      results.push(...analysis.patterns.map((p: any) => ({
        id: `pattern-${p.type}`,
        score: p.confidence,
        entity: {
          id: `pattern-${p.type}`,
          name: `${p.type} Pattern`,
          entityType: "pattern" as any,
          filePath: "analysis",
          content: `Architectural pattern: ${p.type}`,
          dependencies: [],
          references: [],
          complexity: 1,
          tokens: 10,
          metadata: { pattern: true },
          relationships: [],
          position: { line: 1, column: 1 },
        },
      })));
    }

    if (query.includes("issue") || query.includes("problem") || query.includes("improvement")) {
      results.push(...analysis.improvements.map((i: any) => ({
        id: `improvement-${i.type}`,
        score: i.severity === "critical" ? 1.0 : 0.7,
        entity: {
          id: `improvement-${i.type}`,
          name: `${i.type} Improvement`,
          entityType: "improvement" as any,
          filePath: "analysis",
          content: i.description,
          dependencies: [],
          references: [],
          complexity: 1,
          tokens: 20,
          metadata: { improvement: true, severity: i.severity },
          relationships: [],
          position: { line: 1, column: 1 },
        },
      })));
    }

    return results;
  }
}

export class QueryPlanner {
  private intentClassifier: any;
  private filterExtractor: any;

  constructor() {
    // Initialize intent classification and filter extraction
    this.intentClassifier = this.createMockIntentClassifier();
    this.filterExtractor = this.createMockFilterExtractor();
  }

  async plan(query: string, context?: QueryContext): Promise<QueryPlan> {
    // Classify the intent
    const queryType = this.classifyIntent(query);
    
    // Extract filters
    const filters = this.extractFilters(query);
    
    // Determine search strategy
    const searchStrategy = this.determineSearchStrategy(query, queryType);
    
    return {
      queryType,
      searchStrategy,
      filters,
      includeContext: context?.includeContext || this.shouldIncludeContext(query),
      maxResults: context?.maxResults || this.determineMaxResults(query),
      useAiSynthesis: this.shouldUseSynthesis(query),
    };
  }

  private classifyIntent(query: string): string {
    if (this.isExplainQuery(query)) return "explain";
    if (this.isAnalyzeQuery(query)) return "analyze";
    if (query.includes("generate") || query.includes("create")) return "generate";
    return "search";
  }

  private isExplainQuery(query: string): boolean {
    const explainKeywords = ["explain", "what is", "how does", "tell me about", "describe"];
    return explainKeywords.some(keyword => query.toLowerCase().includes(keyword));
  }

  private isAnalyzeQuery(query: string): boolean {
    const analyzeKeywords = ["analyze", "analysis", "pattern", "architecture", "issues", "problems"];
    return analyzeKeywords.some(keyword => query.toLowerCase().includes(keyword));
  }

  private extractFilters(query: string): Record<string, any> {
    const filters: Record<string, any> = {};
    
    // Extract file type filters
    const fileTypeMatch = query.match(/\.(ts|js|py|java|cpp|go)\b/);
    if (fileTypeMatch) {
      filters.language = fileTypeMatch[1];
    }
    
    // Extract entity type filters
    if (query.includes("function")) filters.entityType = "function";
    if (query.includes("class")) filters.entityType = "class";
    if (query.includes("interface")) filters.entityType = "interface";
    
    return filters;
  }

  private determineSearchStrategy(query: string, queryType: string): string {
    if (queryType === "explain" || queryType === "analyze") {
      return "precise";
    }
    
    if (query.length > 50 || query.includes("similar to")) {
      return "semantic";
    }
    
    return "hybrid";
  }

  private shouldIncludeContext(query: string): boolean {
    return query.includes("context") || query.includes("related") || query.includes("dependencies");
  }

  private determineMaxResults(query: string): number {
    if (query.includes("all") || query.includes("everything")) return 50;
    if (query.includes("few") || query.includes("some")) return 5;
    return 10;
  }

  private shouldUseSynthesis(query: string): boolean {
    return query.length > 20 || query.includes("explain") || query.includes("summarize");
  }

  private createMockIntentClassifier(): any {
    return {
      classify: (query: string) => this.classifyIntent(query)
    };
  }

  private createMockFilterExtractor(): any {
    return {
      extract: (query: string) => this.extractFilters(query)
    };
  }
}