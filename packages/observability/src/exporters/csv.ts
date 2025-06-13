import type {
  AIMetrics,
  CostAnalysis,
  CSVExportOptions,
  TimeSeriesDataPoint,
} from "@farm-framework/types";

export class CSVExporter {
  private readonly defaultOptions: Required<CSVExportOptions> = {
    delimiter: ",",
    includeHeaders: true,
    dateFormat: "iso",
    columns: [],
    groupBy: "hour",
    format: "csv",
    timeRange: {
      start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      end: new Date(),
    },
    includeMetadata: true,
    compression: false,
  };

  /**
   * Export AI metrics to CSV format
   */
  async exportMetrics(
    metrics: AIMetrics[],
    options: Partial<CSVExportOptions> = {}
  ): Promise<string> {
    const opts = { ...this.defaultOptions, ...options };

    // Filter by time range
    const filtered = metrics.filter(
      (m) =>
        m.timestamp >= opts.timeRange.start.getTime() &&
        m.timestamp <= opts.timeRange.end.getTime()
    );

    // Determine columns
    const columns =
      opts.columns.length > 0 ? opts.columns : this.getDefaultMetricsColumns();

    // Build CSV
    const rows: string[] = [];

    if (opts.includeHeaders) {
      rows.push(this.escapeRow(columns, opts.delimiter));
    }

    // Add data rows
    filtered.forEach((metric) => {
      const row = columns.map((col) => this.getMetricValue(metric, col, opts));
      rows.push(this.escapeRow(row, opts.delimiter));
    });

    return rows.join("\n");
  }

  /**
   * Export cost analysis to CSV format
   */
  async exportCostAnalysis(
    analysis: CostAnalysis,
    options: Partial<CSVExportOptions> = {}
  ): Promise<string> {
    const opts = { ...this.defaultOptions, ...options };
    const sections: string[] = [];

    // Summary section
    sections.push(this.generateSummarySection(analysis, opts));

    // Time series data
    if (analysis.timeSeries && opts.includeMetadata) {
      sections.push(this.generateTimeSeriesSection(analysis.timeSeries, opts));
    }

    // Provider breakdown
    if (analysis.providers) {
      sections.push(this.generateProviderSection(analysis.providers, opts));
    }

    // Model breakdown
    if (analysis.models) {
      sections.push(this.generateModelSection(analysis.models, opts));
    }

    return sections.join("\n\n");
  }

  /**
   * Export time series data to CSV
   */
  async exportTimeSeries(
    data: TimeSeriesDataPoint[],
    options: Partial<CSVExportOptions> = {}
  ): Promise<string> {
    const opts = { ...this.defaultOptions, ...options };
    const rows: string[] = [];

    // Headers
    if (opts.includeHeaders) {
      const headers = ["Timestamp", "Value", "Count", "Providers"];
      rows.push(this.escapeRow(headers, opts.delimiter));
    }

    // Data
    data.forEach((point) => {
      const row = [
        this.formatDate(point.timestamp, opts.dateFormat),
        point.value.toFixed(4),
        point.count.toString(),
        point.providers.join(";"),
      ];
      rows.push(this.escapeRow(row, opts.delimiter));
    });

    return rows.join("\n");
  }

  /**
   * Generate aggregated report CSV
   */
  async generateReport(
    metrics: AIMetrics[],
    analysis: CostAnalysis,
    options: Partial<CSVExportOptions> = {}
  ): Promise<{ filename: string; content: string }> {
    const opts = { ...this.defaultOptions, ...options };
    const sections: string[] = [];

    // Title and metadata
    sections.push(this.generateReportHeader(opts));

    // Executive summary
    sections.push(this.generateExecutiveSummary(analysis, metrics, opts));

    // Detailed metrics
    if (opts.includeMetadata) {
      sections.push("--- DETAILED METRICS ---");
      sections.push(await this.exportMetrics(metrics, opts));
    }

    // Cost analysis
    sections.push("\n--- COST ANALYSIS ---");
    sections.push(await this.exportCostAnalysis(analysis, opts));

    const filename = `farm-observability-report-${this.formatDate(Date.now(), "iso").split("T")[0]}.csv`;

    return {
      filename,
      content: sections.join("\n\n"),
    };
  }

  // Private helper methods

  private getDefaultMetricsColumns(): string[] {
    return [
      "timestamp",
      "provider",
      "model",
      "operation",
      "tokens_prompt",
      "tokens_completion",
      "tokens_total",
      "cost",
      "duration",
    ];
  }

  private getMetricValue(
    metric: AIMetrics,
    column: string,
    options: Required<CSVExportOptions>
  ): string {
    switch (column) {
      case "timestamp":
        return this.formatDate(metric.timestamp, options.dateFormat);
      case "provider":
        return metric.provider;
      case "model":
        return metric.model;
      case "operation":
        return metric.operation;
      case "tokens_prompt":
        return metric.tokens.prompt.toString();
      case "tokens_completion":
        return metric.tokens.completion.toString();
      case "tokens_total":
        return metric.tokens.total.toString();
      case "cost":
        return metric.cost.amount.toFixed(4);
      case "currency":
        return metric.cost.currency;
      case "duration":
        return metric.duration.toString();
      default:
        // Handle nested properties
        const value = this.getNestedValue(metric, column);
        return value !== undefined ? String(value) : "";
    }
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split(".").reduce((current, key) => current?.[key], obj);
  }

  private formatDate(
    timestamp: number,
    format: CSVExportOptions["dateFormat"]
  ): string {
    const date = new Date(timestamp);

    switch (format) {
      case "excel":
        // Excel-friendly format
        return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()} ${date.getHours()}:${date.getMinutes().toString().padStart(2, "0")}`;
      case "unix":
        return timestamp.toString();
      case "iso":
      default:
        return date.toISOString();
    }
  }

  private escapeRow(values: string[], delimiter: string): string {
    return values
      .map((value) => this.escapeValue(value, delimiter))
      .join(delimiter);
  }

  private escapeValue(value: string, delimiter: string): string {
    // Escape quotes and wrap in quotes if contains delimiter, quotes, or newlines
    if (
      value.includes(delimiter) ||
      value.includes('"') ||
      value.includes("\n")
    ) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  private generateSummarySection(
    analysis: CostAnalysis,
    options: Required<CSVExportOptions>
  ): string {
    const rows: string[] = ["--- SUMMARY ---"];

    if (options.includeHeaders) {
      rows.push(this.escapeRow(["Metric", "Value"], options.delimiter));
    }

    rows.push(
      this.escapeRow(
        ["Total Cost", `$${analysis.totalCost.toFixed(2)}`],
        options.delimiter
      )
    );

    if (analysis.timeRange) {
      rows.push(
        this.escapeRow(
          [
            "Time Range",
            `${analysis.timeRange.start.toISOString()} to ${analysis.timeRange.end.toISOString()}`,
          ],
          options.delimiter
        )
      );
    }

    if (analysis.trend) {
      rows.push(
        this.escapeRow(["Trend", analysis.trend.direction], options.delimiter)
      );
      rows.push(
        this.escapeRow(
          ["Trend Change", `${analysis.trend.percentageChange.toFixed(1)}%`],
          options.delimiter
        )
      );
      rows.push(
        this.escapeRow(
          ["Daily Average", `$${analysis.trend.averageDaily.toFixed(2)}`],
          options.delimiter
        )
      );
      rows.push(
        this.escapeRow(
          ["Hourly Average", `$${analysis.trend.averageHourly.toFixed(2)}`],
          options.delimiter
        )
      );
    }

    if (analysis.projections) {
      rows.push(
        this.escapeRow(
          [
            "Next Day Projection",
            `$${analysis.projections.nextDay.toFixed(2)}`,
          ],
          options.delimiter
        )
      );
      rows.push(
        this.escapeRow(
          [
            "Next Week Projection",
            `$${analysis.projections.nextWeek.toFixed(2)}`,
          ],
          options.delimiter
        )
      );
      rows.push(
        this.escapeRow(
          [
            "Next Month Projection",
            `$${analysis.projections.nextMonth.toFixed(2)}`,
          ],
          options.delimiter
        )
      );
    }

    return rows.join("\n");
  }

  private generateTimeSeriesSection(
    timeSeries: TimeSeriesDataPoint[],
    options: Required<CSVExportOptions>
  ): string {
    const rows: string[] = ["--- TIME SERIES ---"];

    if (options.includeHeaders) {
      rows.push(
        this.escapeRow(
          ["Timestamp", "Cost", "Request Count", "Active Providers"],
          options.delimiter
        )
      );
    }

    timeSeries.forEach((point) => {
      rows.push(
        this.escapeRow(
          [
            this.formatDate(point.timestamp, options.dateFormat),
            point.value.toFixed(4),
            point.count.toString(),
            point.providers.join(";"),
          ],
          options.delimiter
        )
      );
    });

    return rows.join("\n");
  }

  private generateProviderSection(
    providers: CostAnalysis["providers"],
    options: Required<CSVExportOptions>
  ): string {
    const rows: string[] = ["--- PROVIDER BREAKDOWN ---"];

    if (options.includeHeaders) {
      rows.push(
        this.escapeRow(
          [
            "Provider",
            "Total Cost",
            "Average Cost",
            "Request Count",
            "Total Tokens",
            "Cost per Token",
          ],
          options.delimiter
        )
      );
    }

    providers.forEach((provider) => {
      rows.push(
        this.escapeRow(
          [
            provider.provider,
            provider.totalCost.toFixed(4),
            provider.averageCost.toFixed(4),
            provider.requestCount.toString(),
            provider.totalTokens.toString(),
            provider.costPerToken.toFixed(6),
          ],
          options.delimiter
        )
      );
    });

    return rows.join("\n");
  }

  private generateModelSection(
    models: CostAnalysis["models"],
    options: Required<CSVExportOptions>
  ): string {
    const rows: string[] = ["--- MODEL BREAKDOWN ---"];

    if (options.includeHeaders) {
      rows.push(
        this.escapeRow(
          [
            "Model",
            "Provider",
            "Total Cost",
            "Average Cost",
            "Request Count",
            "Total Tokens",
            "Cost per Token",
          ],
          options.delimiter
        )
      );
    }

    models.forEach((model) => {
      rows.push(
        this.escapeRow(
          [
            model.model,
            model.provider,
            model.totalCost.toFixed(4),
            model.averageCost.toFixed(4),
            model.requestCount.toString(),
            model.totalTokens.toString(),
            model.costPerToken.toFixed(6),
          ],
          options.delimiter
        )
      );
    });

    return rows.join("\n");
  }

  private generateReportHeader(options: Required<CSVExportOptions>): string {
    return [
      "=== FARM FRAMEWORK OBSERVABILITY REPORT ===",
      `Generated: ${new Date().toISOString()}`,
      `Time Range: ${options.timeRange.start.toISOString()} to ${options.timeRange.end.toISOString()}`,
      "",
    ].join("\n");
  }

  private generateExecutiveSummary(
    analysis: CostAnalysis,
    metrics: AIMetrics[],
    options: Required<CSVExportOptions>
  ): string {
    const totalRequests = metrics.length;
    const uniqueProviders = new Set(metrics.map((m) => m.provider)).size;
    const uniqueModels = new Set(metrics.map((m) => `${m.provider}:${m.model}`))
      .size;

    const rows: string[] = ["--- EXECUTIVE SUMMARY ---"];

    if (options.includeHeaders) {
      rows.push(this.escapeRow(["Metric", "Value"], options.delimiter));
    }

    rows.push(
      this.escapeRow(
        ["Total Requests", totalRequests.toString()],
        options.delimiter
      )
    );
    rows.push(
      this.escapeRow(
        ["Total Cost", `$${analysis.totalCost.toFixed(2)}`],
        options.delimiter
      )
    );
    rows.push(
      this.escapeRow(
        [
          "Average Cost per Request",
          `$${(analysis.totalCost / totalRequests).toFixed(4)}`,
        ],
        options.delimiter
      )
    );
    rows.push(
      this.escapeRow(
        ["Active Providers", uniqueProviders.toString()],
        options.delimiter
      )
    );
    rows.push(
      this.escapeRow(
        ["Active Models", uniqueModels.toString()],
        options.delimiter
      )
    );

    if (analysis.trend) {
      rows.push(
        this.escapeRow(
          [
            "Cost Trend",
            `${analysis.trend.direction} (${analysis.trend.percentageChange.toFixed(1)}%)`,
          ],
          options.delimiter
        )
      );
    }

    // Add top recommendations if available
    if (analysis.suggestions && analysis.suggestions.length > 0) {
      rows.push("");
      rows.push("Top Recommendations:");
      analysis.suggestions.slice(0, 3).forEach((suggestion, i) => {
        rows.push(`${i + 1}. ${suggestion}`);
      });
    }

    return rows.join("\n");
  }
}
