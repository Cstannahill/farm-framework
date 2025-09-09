### 3. AI Dashboard Template (`--template ai-dashboard`)

**Description:** Data dashboard with ML insights, charts, and analytics.

**Additional Structure:**

```plaintext

├── apps/
│   ├── web/
│   │   └── src/
│   │       ├── components/
│   │       │   ├── dashboard/
│   │       │   │   ├── DashboardGrid.tsx
│   │       │   │   ├── MetricCard.tsx
│   │       │   │   └── InsightPanel.tsx
│   │       │   ├── charts/
│   │       │   │   ├── LineChart.tsx
│   │       │   │   ├── BarChart.tsx
│   │       │   │   ├── PieChart.tsx
│   │       │   │   └── HeatMap.tsx
│   │       │   └── ml/
│   │       │       ├── ModelMetrics.tsx
│   │       │       ├── PredictionViewer.tsx
│   │       │       └── DataExplorer.tsx
│   │       └── hooks/
│   │           ├── useAnalytics.ts
│   │           ├── useChartData.ts
│   │           └── useMLModels.ts
│   └── api/
│       ├── src/
│       │   ├── routes/
│       │   │   ├── analytics.py
│       │   │   ├── ml_models.py
│       │   │   └── data.py
│       │   ├── models/
│       │   │   ├── dataset.py
│       │   │   ├── metric.py
│       │   │   └── prediction.py
│       │   ├── ml/
│       │   │   ├── analytics.py
│       │   │   ├── preprocessing.py
│       │   │   ├── visualization.py
│       │   │   └── ollama_integration.py
│       │   └── data/
│       │       ├── __init__.py
│       │       ├── loaders.py
│       │       └── processors.py
│       ├── datasets/             # Sample datasets
│       │   └── .gitkeep
│       └── models/               # AI model storage (Ollama models)
│           ├── .gitkeep
│           └── ollama/
│               └── .gitkeep
```

**Additional Dependencies:**

- **Frontend:** Recharts, D3.js, data visualization libraries
- **Backend:** Pandas, NumPy, Scikit-learn, Plotly, Ollama client

---
