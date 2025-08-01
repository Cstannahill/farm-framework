import type {
  QueryRequest,
  QueryResponse,
  QueryPlan,
  QueryContext,
  SearchResult,
} from "../types/index";
import { EntityType } from "../types/index";

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
  async query(
    naturalQuery: string,
    context?: QueryContext
  ): Promise<QueryResponse> {
    const startTime = Date.now();

    try {
      // Generate query plan
      const plan = await this.queryPlanner.plan(naturalQuery, context);

      // Execute based on query type
      let response: QueryResponse;

      switch (plan.queryType) {
        case "search":
          response = await this.executeSearch(naturalQuery, plan);
          break;
        case "explain":
          response = await this.executeExplain(naturalQuery, plan);
          break;
        case "analyze":
          response = await this.executeAnalyze(naturalQuery, plan);
          break;
        case "generate":
          response = await this.executeGenerate(naturalQuery, plan);
          break;
        default:
          response = await this.executeHybrid(naturalQuery, plan);
      }

      // Add timing metrics
      response.metrics = {
        totalResults: response.metrics?.totalResults || 0,
        ...response.metrics,
        searchTime: Date.now() - startTime,
        cacheHit: false,
      };

      return response;
    } catch (error) {
      console.error("Query execution failed:", error);
      return {
        results: [],
        error: error instanceof Error ? error.message : "Unknown error",
        plan: await this.queryPlanner.plan(naturalQuery, context),
        metrics: {
          totalResults: 0,
          searchTime: Date.now() - startTime,
          cacheHit: false,
        },
      };
    }
  }

  private async executeSearch(
    query: string,
    plan: QueryPlan
  ): Promise<QueryResponse> {
    // Generate query embedding
    const queryEmbedding = await this.generateQueryEmbedding(query);

    // Search with filters
    const results = await this.vectorStore.search(
      queryEmbedding,
      plan.maxResults,
      plan.filters
    );

    // Enrich with context if requested
    let enrichedResults = results;
    if (plan.includeContext) {
      enrichedResults = await this.enrichWithContext(results);
    }

    // Synthesize response if requested
    let synthesis: string | undefined;
    if (plan.useAiSynthesis) {
      synthesis = await this.synthesizeResponse(query, enrichedResults);
    }

    return {
      results: enrichedResults,
      synthesis,
      plan,
      metrics: {
        totalResults: results.length,
        searchTime: 0, // Will be set by caller
        cacheHit: false,
      },
    };
  }

  private async executeExplain(
    query: string,
    plan: QueryPlan
  ): Promise<QueryResponse> {
    // Extract entity name from query
    const entityName = this.extractEntityName(query);

    // Find entity
    const entityResults = await this.findEntity(entityName);

    if (entityResults.length === 0) {
      return {
        results: [],
        plan,
        error: `Entity '${entityName}' not found`,
        metrics: {
          totalResults: 0,
          searchTime: 0,
          cacheHit: false,
        },
      };
    }

    // Get full context
    const entity = entityResults[0];
    const context = await this.buildEntityContext(entity);

    // Generate explanation
    const explanation = await this.generateExplanation(entity, context);

    return {
      results: entityResults,
      synthesis: explanation,
      plan,
      context,
      metrics: {
        totalResults: entityResults.length,
        searchTime: 0,
        cacheHit: false,
      },
    };
  }

  private async executeAnalyze(
    query: string,
    plan: QueryPlan
  ): Promise<QueryResponse> {
    // TODO: Implement analysis queries
    return {
      results: [],
      synthesis: "Analysis functionality coming soon",
      plan,
      metrics: {
        totalResults: 0,
        searchTime: 0,
        cacheHit: false,
      },
    };
  }

  private async executeGenerate(
    query: string,
    plan: QueryPlan
  ): Promise<QueryResponse> {
    // TODO: Implement generation queries
    return {
      results: [],
      synthesis: "Generation functionality coming soon",
      plan,
      metrics: {
        totalResults: 0,
        searchTime: 0,
        cacheHit: false,
      },
    };
  }

  private async executeHybrid(
    query: string,
    plan: QueryPlan
  ): Promise<QueryResponse> {
    // Combine multiple strategies
    return await this.executeSearch(query, plan);
  }

  private async generateQueryEmbedding(query: string): Promise<number[]> {
    // TODO: Generate embedding using sentence transformer or similar
    // For now return mock embedding
    return new Array(384).fill(0).map(() => Math.random());
  }

  private async enrichWithContext(
    results: SearchResult[]
  ): Promise<SearchResult[]> {
    // TODO: Add related entities, usage examples, etc.
    return results;
  }

  private async synthesizeResponse(
    query: string,
    results: SearchResult[]
  ): Promise<string> {
    if (!this.aiProvider) {
      return "";
    }

    // Build context from results
    const context = results
      .slice(0, 5)
      .map(
        (r) =>
          `File: ${r.entity.filePath}\n` +
          `Type: ${r.entity.entityType}\n` +
          `Name: ${r.entity.name}\n` +
          `\`\`\`${r.entity.metadata.language || "typescript"}\n${r.entity.content}\n\`\`\``
      )
      .join("\n\n");

    // Generate synthesis
    const prompt = `
Based on the following code context, answer this question: ${query}

Context:
${context}

Provide a clear, concise answer that references specific code elements.
`;

    try {
      return await this.aiProvider.generate(
        prompt,
        "You are a senior software architect analyzing code."
      );
    } catch (error) {
      console.error("AI synthesis failed:", error);
      return "";
    }
  }

  private extractEntityName(query: string): string {
    // Simple extraction - could be more sophisticated
    const match = query.match(/(?:explain|describe|what is|how does)\s+(\w+)/i);
    return match ? match[1] : "";
  }

  private async findEntity(entityName: string): Promise<SearchResult[]> {
    if (!entityName) {
      return [];
    }

    // TODO: Search for entity by name
    return [];
  }

  private async buildEntityContext(entity: SearchResult): Promise<any> {
    // TODO: Build comprehensive context
    return {
      entity: entity.entity,
      related: [],
      usages: [],
      tests: [],
      documentation: [],
    };
  }

  private async generateExplanation(
    entity: SearchResult,
    context: any
  ): Promise<string> {
    if (!this.aiProvider) {
      return `${entity.entity.name} is a ${entity.entity.entityType} in ${entity.entity.filePath}`;
    }

    const prompt = `
Explain this ${entity.entity.entityType} in detail:

Name: ${entity.entity.name}
File: ${entity.entity.filePath}
Code:
\`\`\`${entity.entity.metadata.language || "typescript"}
${entity.entity.content}
\`\`\`

Provide a clear explanation of:
1. What this code does
2. How it works
3. Key parameters and return values
4. Usage patterns
5. Any important relationships or dependencies
`;

    try {
      return await this.aiProvider.generate(
        prompt,
        "You are a senior software architect explaining code to a colleague."
      );
    } catch (error) {
      console.error("AI explanation failed:", error);
      return `${entity.entity.name} is a ${entity.entity.entityType} in ${entity.entity.filePath}`;
    }
  }
}

export class QueryPlanner {
  private intentClassifier: IntentClassifier;
  private filterExtractor: FilterExtractor;

  constructor() {
    this.intentClassifier = new IntentClassifier();
    this.filterExtractor = new FilterExtractor();
  }

  async plan(query: string, context?: QueryContext): Promise<QueryPlan> {
    // Classify query intent
    const intent = await this.intentClassifier.classify(query);

    // Extract filters
    const filters = await this.filterExtractor.extract(query);

    // Determine strategy based on query patterns
    if (this.isExplainQuery(query)) {
      return {
        queryType: "explain",
        searchStrategy: "semantic",
        filters,
        includeContext: true,
        maxResults: 10,
        useAiSynthesis: true,
      };
    } else if (this.isAnalyzeQuery(query)) {
      return {
        queryType: "analyze",
        searchStrategy: "hybrid",
        filters,
        includeContext: true,
        maxResults: 20,
        useAiSynthesis: true,
      };
    } else {
      return {
        queryType: "search",
        searchStrategy: "semantic",
        filters,
        includeContext: false,
        maxResults: context?.maxResults || 5,
        useAiSynthesis: false,
      };
    }
  }

  private isExplainQuery(query: string): boolean {
    const explainPatterns = [
      /how does/i,
      /explain/i,
      /what is/i,
      /describe/i,
      /tell me about/i,
    ];

    return explainPatterns.some((pattern) => pattern.test(query));
  }

  private isAnalyzeQuery(query: string): boolean {
    const analyzePatterns = [
      /analyze/i,
      /find issues/i,
      /problems with/i,
      /review/i,
      /audit/i,
    ];

    return analyzePatterns.some((pattern) => pattern.test(query));
  }
}

class IntentClassifier {
  async classify(query: string): Promise<string> {
    // TODO: Implement intent classification
    // Could use a small ML model or rule-based approach
    return "search";
  }
}

class FilterExtractor {
  async extract(query: string): Promise<Record<string, any>> {
    const filters: Record<string, any> = {};

    // Extract entity types
    const entityTypes = this.extractEntityTypes(query);
    if (entityTypes.length > 0) {
      filters.entityTypes = entityTypes;
    }

    // Extract languages
    const languages = this.extractLanguages(query);
    if (languages.length > 0) {
      filters.languages = languages;
    }

    // Extract file patterns
    const filePatterns = this.extractFilePatterns(query);
    if (filePatterns.length > 0) {
      filters.filePatterns = filePatterns;
    }

    return filters;
  }

  private extractEntityTypes(query: string): EntityType[] {
    const types: EntityType[] = [];

    if (/function/i.test(query)) types.push(EntityType.Function);
    if (/class/i.test(query)) types.push(EntityType.Class);
    if (/component/i.test(query)) types.push(EntityType.Component);
    if (/hook/i.test(query)) types.push(EntityType.Hook);
    if (/interface/i.test(query)) types.push(EntityType.Interface);
    if (/type/i.test(query)) types.push(EntityType.Type);

    return types;
  }

  private extractLanguages(query: string): string[] {
    const languages: string[] = [];

    if (/typescript|ts/i.test(query)) languages.push("typescript");
    if (/javascript|js/i.test(query)) languages.push("javascript");
    if (/python|py/i.test(query)) languages.push("python");
    if (/react|jsx|tsx/i.test(query)) languages.push("typescript");

    return languages;
  }

  private extractFilePatterns(query: string): string[] {
    const patterns: string[] = [];

    // Look for file extensions or patterns
    const fileMatches = query.match(/\*?\*?\.[a-z]+/gi);
    if (fileMatches) {
      patterns.push(...fileMatches);
    }

    return patterns;
  }
}
