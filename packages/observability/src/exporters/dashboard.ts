import type {
  CostAnalysis,
  AIMetrics,
  DashboardExportOptions,
  DashboardWidgetConfig,
  ExportedDashboard,
} from "@farm-framework/types";

export interface DashboardTemplate {
  id: string;
  name: string;
  description: string;
  widgets: DashboardWidgetConfig[];
  layout: "grid" | "stack" | "custom";
  refreshInterval?: number;
}

export class DashboardExporter {
  private static readonly TEMPLATES: Record<string, DashboardTemplate> = {
    cost_overview: {
      id: "cost_overview",
      name: "Cost Overview Dashboard",
      description: "Comprehensive cost tracking and analysis dashboard",
      layout: "grid",
      refreshInterval: 60000,
      widgets: [
        {
          id: "cost_ticker",
          type: "metric",
          title: "Current Cost Rate",
          position: { x: 0, y: 0, w: 3, h: 1 },
          config: {
            metric: "cost.current",
            format: "currency",
            sparkline: true,
          },
          dataSource: "cost_metrics",
          visualization: {
            type: "gauge",
            options: { animated: true },
          },
        },
        {
          id: "daily_spend",
          type: "metric",
          title: "Today's Spend",
          position: { x: 3, y: 0, w: 3, h: 1 },
          config: {
            metric: "cost.daily",
            format: "currency",
            comparison: "yesterday",
          },
          dataSource: "cost_metrics",
          visualization: {
            type: "gauge",
            options: { comparison: true },
          },
        },
        {
          id: "monthly_spend",
          type: "metric",
          title: "Monthly Spend",
          position: { x: 6, y: 0, w: 3, h: 1 },
          config: {
            metric: "cost.monthly",
            format: "currency",
            showProgress: true,
            target: "quota.monthly",
          },
          dataSource: "cost_metrics",
          visualization: {
            type: "gauge",
            options: { showProgress: true },
          },
        },
        {
          id: "cost_trend",
          type: "chart",
          title: "Cost Trend (7 Days)",
          position: { x: 0, y: 1, w: 6, h: 3 },
          config: {
            chartType: "line",
            metric: "cost.timeseries",
            groupBy: "hour",
            showForecast: true,
          },
          dataSource: "cost_timeseries",
          visualization: {
            type: "line",
            options: { forecast: true, smooth: true },
          },
        },
        {
          id: "provider_breakdown",
          type: "chart",
          title: "Cost by Provider",
          position: { x: 6, y: 1, w: 3, h: 3 },
          config: {
            chartType: "pie",
            metric: "cost.by_provider",
            showLegend: true,
          },
          dataSource: "provider_metrics",
          visualization: {
            type: "pie",
            options: { legend: true },
          },
        },
      ],
    },
    performance: {
      id: "performance",
      name: "Performance Dashboard",
      description: "AI service performance and reliability metrics",
      layout: "grid",
      refreshInterval: 30000,
      widgets: [
        {
          id: "latency_p95",
          type: "metric",
          title: "95th Percentile Latency",
          position: { x: 0, y: 0, w: 3, h: 1 },
          config: {
            metric: "latency.p95",
            format: "duration",
            threshold: { warning: 3000, error: 5000 },
          },
          dataSource: "performance_metrics",
          visualization: {
            type: "gauge",
            options: { thresholds: true },
          },
        },
        {
          id: "error_rate",
          type: "metric",
          title: "Error Rate",
          position: { x: 3, y: 0, w: 3, h: 1 },
          config: {
            metric: "errors.rate",
            format: "percentage",
            threshold: { warning: 0.02, error: 0.05 },
          },
          dataSource: "performance_metrics",
          visualization: {
            type: "gauge",
            options: { thresholds: true },
          },
        },
        {
          id: "throughput",
          type: "metric",
          title: "Requests/Minute",
          position: { x: 6, y: 0, w: 3, h: 1 },
          config: {
            metric: "throughput.rpm",
            format: "number",
            sparkline: true,
          },
          dataSource: "performance_metrics",
          visualization: {
            type: "gauge",
            options: { sparkline: true },
          },
        },
        {
          id: "latency_heatmap",
          type: "heatmap",
          title: "Latency Heatmap",
          position: { x: 0, y: 1, w: 9, h: 3 },
          config: {
            metric: "latency.distribution",
            buckets: [100, 250, 500, 1000, 2500, 5000, 10000],
          },
          dataSource: "latency_distribution",
          visualization: {
            type: "table",
            options: { buckets: [100, 250, 500, 1000, 2500, 5000, 10000] },
          },
        },
      ],
    },
  };

  /**
   * Export dashboard configuration for external visualization tools
   */
  async exportForGrafana(
    analysis: CostAnalysis,
    options: Partial<DashboardExportOptions> = {}
  ): Promise<ExportedDashboard> {
    const template = options.template
      ? DashboardExporter.TEMPLATES[options.template]
      : DashboardExporter.TEMPLATES.cost_overview;

    return {
      id: "grafana-export",
      name: template.name,
      title: options.title || template.name,
      description: template.description,
      widgets: template.widgets.map((widget) => ({
        id: widget.id || "widget",
        title: widget.title || "Untitled",
        type: widget.type || "metric",
        position: {
          x: widget.position?.x || 0,
          y: widget.position?.y || 0,
          width: widget.position?.w || 4,
          height: widget.position?.h || 2,
        },
        config: widget.config || {},
      })),
      layout: {
        type: "grid",
        rows: 4,
        columns: 12,
        gap: 8,
        padding: 16,
      },
      exportedAt: new Date(),
      version: "1.0.0",
    };
  }

  /**
   * Export dashboard for Datadog
   */
  async exportForDatadog(
    analysis: CostAnalysis,
    options: Partial<DashboardExportOptions> = {}
  ): Promise<ExportedDashboard> {
    const template =
      DashboardExporter.TEMPLATES[options.template || "cost_overview"];

    return {
      id: `datadog-${Date.now()}`,
      name: template.name,
      title: options.title || template.name,
      description: template.description,
      widgets: template.widgets.map((widget) =>
        this.convertToDatadogWidget(widget, analysis)
      ),
      layout: {
        type: "grid",
        columns: 12,
        gap: 8,
        padding: 16,
        rows: 4,
      },
      exportedAt: new Date(),
      version: "1.0",
    };
  }

  /**
   * Export standalone HTML dashboard
   */
  async exportAsHTML(
    metrics: AIMetrics[],
    analysis: CostAnalysis,
    options: Partial<DashboardExportOptions> = {}
  ): Promise<{ filename: string; content: string }> {
    const template =
      DashboardExporter.TEMPLATES[options.template || "cost_overview"];

    const html = `<!DOCTYPE html>
  <html lang="en">
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${options.title || "FARM Observability Dashboard"}</title>
      <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.js"></script>
      <script src="https://cdn.jsdelivr.net/npm/date-fns@2.30.0/index.min.js"></script>
      <style>
          ${this.generateDashboardStyles()}
      </style>
  </head>
  <body>
      <div class="dashboard-container">
          <header class="dashboard-header">
              <h1>${options.title || template.name}</h1>
              <div class="header-info">
                  <span>Generated: ${new Date().toLocaleString()}</span>
                  <span>Period: ${analysis.timeRange.start.toLocaleDateString()} - ${analysis.timeRange.end.toLocaleDateString()}</span>
              </div>
          </header>
          
          <div class="dashboard-grid">
              ${template.widgets.map((widget) => this.generateHTMLWidget(widget, metrics, analysis)).join("")}
          </div>
          
          <footer class="dashboard-footer">
              <p>Generated by FARM Framework Observability</p>
          </footer>
      </div>
      
      <script>
          ${this.generateDashboardScript(metrics, analysis)}
      </script>
  </body>
  </html>`;

    const filename = `farm-dashboard-${new Date().toISOString().split("T")[0]}.html`;

    return { filename, content: html };
  }

  /**
   * Export dashboard configuration as JSON
   */
  async exportAsJSON(
    analysis: CostAnalysis,
    options: Partial<DashboardExportOptions> = {}
  ): Promise<{ filename: string; content: string }> {
    const template =
      DashboardExporter.TEMPLATES[options.template || "cost_overview"];

    const dashboardConfig = {
      metadata: {
        name: options.title || template.name,
        description: template.description,
        version: "1.0.0",
        created: new Date().toISOString(),
        framework: "farm-framework",
      },
      data: {
        timeRange: analysis.timeRange,
        summary: {
          totalCost: analysis.totalCost,
          trend: analysis.trend,
          projections: analysis.projections,
        },
        breakdown: analysis.breakdown,
        providers: analysis.providers,
        models: analysis.models,
        timeSeries: analysis.timeSeries,
      },
      widgets: template.widgets,
      config: options,
    };

    const filename = `farm-dashboard-config-${new Date().toISOString().split("T")[0]}.json`;
    const content = JSON.stringify(dashboardConfig, null, 2);

    return { filename, content };
  }

  // Private helper methods

  private convertWidgetsToGrafanaPanels(
    widgets: DashboardWidgetConfig[],
    analysis: CostAnalysis
  ): any[] {
    return widgets.map((widget, index) => ({
      id: index + 1,
      gridPos: {
        x: (widget.position?.x ?? 0) * 2.67, // Convert to 24-column grid
        y: (widget.position?.y ?? 0) * 4,
        w: (widget.position?.w ?? 4) * 2.67,
        h: (widget.position?.h ?? 2) * 4,
      },
      title: widget.title || "Untitled Widget",
      type: this.mapWidgetTypeToGrafana(widget.type),
      targets: [this.generateGrafanaQuery(widget, analysis)],
      options: this.generateGrafanaOptions(widget),
      fieldConfig: this.generateGrafanaFieldConfig(widget),
    }));
  }

  private mapWidgetTypeToGrafana(type: DashboardWidgetConfig["type"]): string {
    const mapping: Record<string, string> = {
      metric: "stat",
      chart: "timeseries",
      pie: "piechart",
      table: "table",
      heatmap: "heatmap",
    };
    return (type && mapping[type]) || "graph";
  }

  private generateGrafanaQuery(
    widget: DashboardWidgetConfig,
    analysis: CostAnalysis
  ): any {
    const metric = widget.config?.metric || "cost.total";
    return {
      refId: "A",
      expr: this.buildPrometheusQuery(metric),
      interval: "",
      legendFormat: "",
    };
  }

  private buildPrometheusQuery(metric: string): string {
    // Convert metric path to Prometheus query
    const metricName = metric.replace(/\./g, "_");
    return `farm_${metricName}{service="farm-app"}`;
  }

  private generateGrafanaOptions(widget: DashboardWidgetConfig): any {
    const baseOptions = {
      reduceOptions: {
        values: false,
        calcs: ["lastNotNull"],
      },
    };

    if (widget.type === "chart") {
      return {
        ...baseOptions,
        tooltip: { mode: "multi", sort: "none" },
        legend: { displayMode: "list", placement: "bottom" },
      };
    }

    return baseOptions;
  }

  private generateGrafanaFieldConfig(widget: DashboardWidgetConfig): any {
    const config: any = {
      defaults: {
        mappings: [],
        color: { mode: "palette-classic" },
      },
    };

    if (widget.config.format === "currency") {
      config.defaults.unit = "currencyUSD";
      config.defaults.decimals = 2;
    } else if (widget.config.format === "percentage") {
      config.defaults.unit = "percent";
      config.defaults.decimals = 1;
    } else if (widget.config.format === "duration") {
      config.defaults.unit = "ms";
    }

    if (widget.config.threshold) {
      config.defaults.thresholds = {
        mode: "absolute",
        steps: [
          { color: "green", value: null },
          { color: "yellow", value: widget.config.threshold.warning },
          { color: "red", value: widget.config.threshold.error },
        ],
      };
    }

    return config;
  }

  private generateGrafanaVariables(
    options: Partial<DashboardExportOptions>
  ): any[] {
    return [
      {
        name: "provider",
        type: "query",
        query: "label_values(farm_ai_requests_total, provider)",
        refresh: 1,
        multi: true,
        includeAll: true,
      },
      {
        name: "model",
        type: "query",
        query:
          'label_values(farm_ai_requests_total{provider="$provider"}, model)',
        refresh: 1,
        multi: true,
        includeAll: true,
      },
    ];
  }

  private generateAnnotations(analysis: CostAnalysis): any[] {
    const annotations: any[] = [];

    // Add trend change annotations
    if (analysis.trend.percentageChange > 20) {
      annotations.push({
        name: "Cost Increase",
        datasource: "FARM Metrics",
        enable: true,
        iconColor: "red",
        query: 'farm_cost_anomaly{severity="high"}',
      });
    }

    return annotations;
  }

  private convertToDatadogWidget(
    widget: DashboardWidgetConfig,
    analysis: CostAnalysis
  ): any {
    const baseWidget: any = {
      id: Date.now() + Math.random(),
      definition: {
        title: widget.title,
        type: this.mapWidgetTypeToDatadog(widget.type),
        requests: [],
      },
    };

    // Add widget-specific configuration
    switch (widget.type) {
      case "metric":
        baseWidget.definition.requests = [
          {
            q: `avg:farm.${widget.config?.metric || "cost.total"}{*}`,
            aggregator: "last",
          },
        ];
        break;
      case "chart":
        baseWidget.definition.requests = [
          {
            q: `avg:farm.${widget.config?.metric || "cost.total"}{*} by {provider}`,
            display_type: widget.config?.chartType || "line",
          },
        ];
        break;
    }

    return baseWidget;
  }

  private mapWidgetTypeToDatadog(type: DashboardWidgetConfig["type"]): string {
    const mapping: Record<string, string> = {
      metric: "query_value",
      chart: "timeseries",
      pie: "sunburst",
      table: "query_table",
      heatmap: "heatmap",
    };
    return (type && mapping[type]) || "timeseries";
  }

  private generateDatadogVariables(
    options: Partial<DashboardExportOptions>
  ): any[] {
    return [
      {
        name: "provider",
        prefix: "provider",
        available_values: ["ollama", "openai", "anthropic"],
        default: "*",
      },
    ];
  }

  private generateDashboardStyles(): string {
    return `
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
  
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: #0a0a0a;
          color: #e0e0e0;
          line-height: 1.6;
        }
  
        .dashboard-container {
          max-width: 1400px;
          margin: 0 auto;
          padding: 20px;
        }
  
        .dashboard-header {
          background: linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%);
          padding: 30px;
          border-radius: 12px;
          margin-bottom: 30px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        }
  
        .dashboard-header h1 {
          font-size: 32px;
          font-weight: 600;
          margin-bottom: 10px;
          background: linear-gradient(135deg, #60a5fa, #a78bfa);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
  
        .header-info {
          display: flex;
          gap: 30px;
          color: #888;
          font-size: 14px;
        }
  
        .dashboard-grid {
          display: grid;
          grid-template-columns: repeat(9, 1fr);
          grid-auto-rows: 120px;
          gap: 20px;
          margin-bottom: 30px;
        }
  
        .widget {
          background: #1a1a1a;
          border: 1px solid #333;
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
          transition: all 0.3s ease;
          overflow: hidden;
        }
  
        .widget:hover {
          border-color: #60a5fa;
          box-shadow: 0 4px 20px rgba(96, 165, 250, 0.1);
        }
  
        .widget-title {
          font-size: 14px;
          color: #888;
          margin-bottom: 10px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
  
        .metric-value {
          font-size: 36px;
          font-weight: 600;
          color: #60a5fa;
          margin-bottom: 5px;
        }
  
        .metric-change {
          font-size: 14px;
          display: flex;
          align-items: center;
          gap: 5px;
        }
  
        .positive { color: #10b981; }
        .negative { color: #ef4444; }
  
        .chart-container {
          width: 100%;
          height: calc(100% - 40px);
          position: relative;
        }
  
        .dashboard-footer {
          text-align: center;
          color: #666;
          font-size: 12px;
          padding-top: 20px;
          border-top: 1px solid #333;
        }
  
        /* Responsive adjustments */
        @media (max-width: 1200px) {
          .dashboard-grid {
            grid-template-columns: repeat(6, 1fr);
          }
        }
  
        @media (max-width: 768px) {
          .dashboard-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }
      `;
  }

  private generateHTMLWidget(
    widget: DashboardWidgetConfig,
    metrics: AIMetrics[],
    analysis: CostAnalysis
  ): string {
    const gridStyle = `grid-column: span ${widget.position.w}; grid-row: span ${widget.position.h};`;

    switch (widget.type) {
      case "metric":
        return this.generateMetricWidget(widget, analysis, gridStyle);
      case "chart":
        return this.generateChartWidget(widget, analysis, gridStyle);
      default:
        return `<div class="widget" style="${gridStyle}">
            <div class="widget-title">${widget.title}</div>
            <div>Widget type not implemented</div>
          </div>`;
    }
  }

  private generateMetricWidget(
    widget: DashboardWidgetConfig,
    analysis: CostAnalysis,
    style: string
  ): string {
    const value = this.getMetricValue(widget.config.metric, analysis);
    const formatted = this.formatValue(value, widget.config.format);
    const change = widget.config.comparison
      ? this.calculateChange(widget.config.metric, analysis)
      : null;

    return `
        <div class="widget metric-widget" style="${style}">
          <div class="widget-title">${widget.title}</div>
          <div class="metric-value">${formatted}</div>
          ${
            change
              ? `
            <div class="metric-change ${change > 0 ? "negative" : "positive"}">
              ${change > 0 ? "↑" : "↓"} ${Math.abs(change).toFixed(1)}%
            </div>
          `
              : ""
          }
        </div>
      `;
  }

  private generateChartWidget(
    widget: DashboardWidgetConfig,
    analysis: CostAnalysis,
    style: string
  ): string {
    const chartId = `chart-${widget.id}`;

    return `
        <div class="widget chart-widget" style="${style}">
          <div class="widget-title">${widget.title}</div>
          <div class="chart-container">
            <canvas id="${chartId}"></canvas>
          </div>
        </div>
      `;
  }

  private generateDashboardScript(
    metrics: AIMetrics[],
    analysis: CostAnalysis
  ): string {
    return `
        // Initialize charts after DOM load
        document.addEventListener('DOMContentLoaded', function() {
          const charts = [];
          
          // Cost trend chart
          const costTrendCtx = document.getElementById('chart-cost_trend');
          if (costTrendCtx) {
            const costData = ${JSON.stringify(analysis.timeSeries)};
            
            new Chart(costTrendCtx, {
              type: 'line',
              data: {
                labels: costData.map(d => new Date(d.timestamp).toLocaleString()),
                datasets: [{
                  label: 'Cost ($)',
                  data: costData.map(d => d.value),
                  borderColor: '#60a5fa',
                  backgroundColor: 'rgba(96, 165, 250, 0.1)',
                  tension: 0.4,
                }]
              },
              options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: false },
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: {
                      callback: value => '$' + value.toFixed(2),
                    },
                  },
                },
              },
            });
          }
          
          // Provider breakdown chart
          const providerCtx = document.getElementById('chart-provider_breakdown');
          if (providerCtx) {
            const providerData = ${JSON.stringify(analysis.breakdown.byProvider)};
            
            new Chart(providerCtx, {
              type: 'doughnut',
              data: {
                labels: Object.keys(providerData),
                datasets: [{
                  data: Object.values(providerData),
                  backgroundColor: [
                    '#60a5fa',
                    '#a78bfa',
                    '#f472b6',
                    '#fb923c',
                    '#34d399',
                  ],
                }]
              },
              options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'bottom',
                    labels: { color: '#e0e0e0' },
                  },
                },
              },
            });
          }
          
          // Auto-refresh simulation (in real dashboard would fetch new data)
          setInterval(() => {
            document.querySelectorAll('.metric-value').forEach(el => {
              const current = parseFloat(el.textContent.replace('$', ''));
              const variation = (Math.random() - 0.5) * 0.1;
              const newValue = current * (1 + variation);
              el.textContent = '$' + newValue.toFixed(2);
            });
          }, 5000);
        });
      `;
  }

  private getMetricValue(metric: string, analysis: CostAnalysis): number {
    // Extract metric value from analysis
    switch (metric) {
      case "cost.current":
        return analysis.trend.averageHourly;
      case "cost.daily":
        return analysis.trend.averageDaily;
      case "cost.monthly":
        return analysis.totalCost;
      default:
        return 0;
    }
  }

  private formatValue(value: number, format?: string): string {
    switch (format) {
      case "currency":
        return `$${value.toFixed(2)}`;
      case "percentage":
        return `${value.toFixed(1)}%`;
      case "duration":
        return `${value.toFixed(0)}ms`;
      default:
        return value.toFixed(2);
    }
  }

  private calculateChange(metric: string, analysis: CostAnalysis): number {
    // Simplified change calculation
    return analysis.trend.percentageChange;
  }
}
