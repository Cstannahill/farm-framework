# Performance & Monitoring Design

## Overview

FARM's performance and monitoring system provides comprehensive observability across the entire AI-first full-stack architecture. It monitors development workflows, AI provider performance, GPU utilization, cross-stack type generation, and production application metrics while optimizing for speed through pnpm package management and intelligent caching strategies.

---

## Multi-Layer Performance Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                 FARM Performance & Monitoring                   │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────┐ │
│  │Development  │  │   AI/ML     │  │Production   │  │Framework│ │
│  │Performance  │  │Performance  │  │Monitoring   │  │Metrics  │ │
│  │(Dev Server) │  │(GPU/Models) │  │(Apps)       │  │(Core)   │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────┘ │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────┐ │
│  │   pnpm      │  │ Hot Reload  │  │   Build     │  │  Type   │ │
│  │Performance  │  │Performance  │  │Performance  │  │ GenPerf │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────┘ │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────┐ │
│  │ Metrics     │  │ Alerting    │  │ Dashboards  │  │ Reports │ │
│  │ Collection  │  │ System      │  │ (Real-time) │  │ (Trends)│ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## Core Performance Components

### 1. Development Performance Optimization

**Purpose:** Maximize developer productivity through optimized tooling and workflows

**pnpm Integration & Optimization:**
```javascript
// packages/farm-core/src/performance/package-manager.js
export class PackageManager {
  constructor() {
    this.manager = 'pnpm'; // Default to pnpm for performance
    this.cacheDir = '.farm/cache/pnpm';
    this.metrics = new PerformanceMetrics();
  }

  async install(projectPath, options = {}) {
    const startTime = performance.now();
    
    try {
      // Configure pnpm for optimal performance
      const pnpmConfig = {
        'store-dir': path.join(os.homedir(), '.pnpm-store'),
        'package-import-method': 'hardlink',
        'symlink': false,
        'hoist': true,
        'shamefully-hoist': true, // For better compatibility
        'prefer-offline': true,
        'registry': options.registry || 'https://registry.npmjs.org'
      };

      // Create .npmrc for pnpm optimization
      await this.createPnpmConfig(projectPath, pnpmConfig);

      // Run pnpm install with performance optimizations
      const result = await this.runPnpmInstall(projectPath, options);
      
      const duration = performance.now() - startTime;
      this.metrics.recordInstallTime(duration, result.packageCount);
      
      return {
        success: true,
        duration,
        packageCount: result.packageCount,
        cacheHitRate: result.cacheHitRate
      };
      
    } catch (error) {
      const duration = performance.now() - startTime;
      this.metrics.recordInstallError(error, duration);
      throw error;
    }
  }

  async createPnpmConfig(projectPath, config) {
    const npmrcPath = path.join(projectPath, '.npmrc');
    const configLines = Object.entries(config)
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');
    
    await fs.writeFile(npmrcPath, configLines);
  }

  async runPnpmInstall(projectPath, options) {
    const args = ['install'];
    
    if (options.frozen) args.push('--frozen-lockfile');
    if (options.production) args.push('--production');
    if (options.offline) args.push('--prefer-offline');
    
    // Add performance flags
    args.push('--reporter=silent'); // Reduce output overhead
    args.push('--prefer-frozen-lockfile');
    
    const result = await execAsync('pnpm', args, { cwd: projectPath });
    
    // Parse pnpm output for metrics
    return this.parsePnpmOutput(result.stdout);
  }

  parsePnpmOutput(output) {
    // Extract metrics from pnpm output
    const packageCountMatch = output.match(/(\d+) packages installed/);
    const cacheHitMatch = output.match(/(\d+)% cache hit/);
    
    return {
      packageCount: packageCountMatch ? parseInt(packageCountMatch[1]) : 0,
      cacheHitRate: cacheHitMatch ? parseInt(cacheHitMatch[1]) : 0
    };
  }
}
```

**Development Server Performance Monitoring:**
```javascript
// tools/dev-server/performance-monitor.js
export class DevServerPerformanceMonitor {
  constructor() {
    this.metrics = {
      startupTime: null,
      serviceStartTimes: new Map(),
      hotReloadTimes: new Map(),
      typeGenerationTimes: [],
      memoryUsage: [],
      cpuUsage: []
    };
    
    this.startSystemMonitoring();
  }

  recordStartupTime(serviceName, startTime, endTime) {
    const duration = endTime - startTime;
    this.metrics.serviceStartTimes.set(serviceName, duration);
    
    console.log(`⚡ ${serviceName} started in ${duration.toFixed(0)}ms`);
    
    // Alert if startup is slow
    if (duration > this.getSlowStartupThreshold(serviceName)) {
      console.warn(`⚠️ ${serviceName} startup slower than expected (${duration.toFixed(0)}ms)`);
      this.suggestOptimizations(serviceName, duration);
    }
  }

  recordHotReloadTime(triggerType, duration) {
    this.metrics.hotReloadTimes.set(triggerType, duration);
    
    const emoji = duration < 100 ? '🚀' : duration < 500 ? '⚡' : '🐌';
    console.log(`${emoji} Hot reload (${triggerType}): ${duration.toFixed(0)}ms`);
    
    // Track hot reload performance trends
    this.trackHotReloadTrends(triggerType, duration);
  }

  recordTypeGenerationTime(trigger, duration, filesGenerated) {
    this.metrics.typeGenerationTimes.push({
      trigger,
      duration,
      filesGenerated,
      timestamp: Date.now()
    });
    
    const efficiency = filesGenerated / (duration / 1000); // files per second
    console.log(`🔄 Type generation: ${duration.toFixed(0)}ms (${filesGenerated} files, ${efficiency.toFixed(1)} files/sec)`);
    
    // Warn if type generation is slow
    if (duration > 2000) {
      console.warn(`⚠️ Type generation taking longer than expected. Consider optimizing model complexity.`);
    }
  }

  startSystemMonitoring() {
    setInterval(() => {
      const memUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();
      
      this.metrics.memoryUsage.push({
        rss: memUsage.rss / 1024 / 1024, // MB
        heapUsed: memUsage.heapUsed / 1024 / 1024, // MB
        timestamp: Date.now()
      });
      
      this.metrics.cpuUsage.push({
        user: cpuUsage.user / 1000, // milliseconds
        system: cpuUsage.system / 1000, // milliseconds
        timestamp: Date.now()
      });
      
      // Keep only last 100 measurements
      if (this.metrics.memoryUsage.length > 100) {
        this.metrics.memoryUsage.shift();
      }
      if (this.metrics.cpuUsage.length > 100) {
        this.metrics.cpuUsage.shift();
      }
      
    }, 1000); // Every second
  }

  getSlowStartupThreshold(serviceName) {
    const thresholds = {
      'database': 5000,    // 5 seconds for DB startup
      'ollama': 10000,     // 10 seconds for Ollama (model loading)
      'backend': 3000,     // 3 seconds for FastAPI
      'frontend': 2000     // 2 seconds for Vite
    };
    return thresholds[serviceName] || 5000;
  }

  suggestOptimizations(serviceName, duration) {
    const suggestions = {
      'ollama': [
        '💡 Consider pre-pulling frequently used models',
        '💡 Enable GPU acceleration if available',
        '💡 Use smaller models for development (llama3.1 8B vs 70B)'
      ],
      'backend': [
        '💡 Check for unnecessary imports in main.py',
        '💡 Consider lazy loading of ML dependencies',
        '💡 Optimize database connection pooling'
      ],
      'frontend': [
        '💡 Use pnpm instead of npm for faster installs',
        '💡 Consider reducing bundle size',
        '💡 Check for unnecessary dependencies'
      ]
    };
    
    if (suggestions[serviceName]) {
      suggestions[serviceName].forEach(suggestion => console.log(suggestion));
    }
  }

  generatePerformanceReport() {
    const totalStartupTime = Array.from(this.metrics.serviceStartTimes.values())
      .reduce((sum, time) => sum + time, 0);
    
    const avgHotReloadTime = Array.from(this.metrics.hotReloadTimes.values())
      .reduce((sum, time) => sum + time, 0) / this.metrics.hotReloadTimes.size;
    
    const recentMemory = this.metrics.memoryUsage.slice(-10);
    const avgMemoryUsage = recentMemory.reduce((sum, m) => sum + m.rss, 0) / recentMemory.length;
    
    return {
      startup: {
        total: totalStartupTime,
        services: Object.fromEntries(this.metrics.serviceStartTimes)
      },
      hotReload: {
        average: avgHotReloadTime,
        byType: Object.fromEntries(this.metrics.hotReloadTimes)
      },
      system: {
        memoryUsageMB: avgMemoryUsage,
        peakMemoryMB: Math.max(...recentMemory.map(m => m.rss))
      },
      typeGeneration: {
        recent: this.metrics.typeGenerationTimes.slice(-5),
        average: this.getAverageTypeGenerationTime()
      }
    };
  }
}
```

### 2. AI/ML Performance Monitoring

**Purpose:** Track AI provider performance, GPU utilization, and model inference metrics

**AI Provider Performance Tracking:**
```python
# packages/farm-core/src/ai/performance_monitor.py
import time
import psutil
import asyncio
from typing import Dict, List, Optional
from dataclasses import dataclass
from collections import defaultdict, deque

@dataclass
class AIPerformanceMetric:
    provider: str
    model: str
    operation: str  # chat, chat_stream, embed
    duration_ms: float
    tokens_input: int
    tokens_output: int
    memory_used_mb: float
    gpu_utilization: Optional[float]
    timestamp: float

class AIPerformanceMonitor:
    """Comprehensive AI performance monitoring and optimization"""
    
    def __init__(self):
        self.metrics = deque(maxlen=1000)  # Keep last 1000 metrics
        self.provider_stats = defaultdict(list)
        self.gpu_available = self.check_gpu_availability()
        self.baseline_memory = self.get_current_memory()
        
    def check_gpu_availability(self) -> bool:
        """Check if GPU monitoring is available"""
        try:
            import nvidia_ml_py3 as nvml
            nvml.nvmlInit()
            return True
        except:
            return False
    
    def get_current_memory(self) -> float:
        """Get current process memory usage in MB"""
        process = psutil.Process()
        return process.memory_info().rss / 1024 / 1024
    
    def get_gpu_utilization(self) -> Optional[float]:
        """Get current GPU utilization percentage"""
        if not self.gpu_available:
            return None
            
        try:
            import nvidia_ml_py3 as nvml
            handle = nvml.nvmlDeviceGetHandleByIndex(0)
            utilization = nvml.nvmlDeviceGetUtilizationRates(handle)
            return utilization.gpu
        except:
            return None
    
    async def monitor_ai_operation(self, provider: str, model: str, operation: str, 
                                 operation_func, *args, **kwargs):
        """Monitor performance of an AI operation"""
        
        start_time = time.time()
        start_memory = self.get_current_memory()
        start_gpu = self.get_gpu_utilization()
        
        # Count input tokens (approximate)
        tokens_input = self.estimate_input_tokens(args, kwargs)
        
        try:
            # Execute the AI operation
            result = await operation_func(*args, **kwargs)
            
            # Calculate metrics
            end_time = time.time()
            duration_ms = (end_time - start_time) * 1000
            end_memory = self.get_current_memory()
            end_gpu = self.get_gpu_utilization()
            
            # Count output tokens (approximate)
            tokens_output = self.estimate_output_tokens(result)
            
            # Record metrics
            metric = AIPerformanceMetric(
                provider=provider,
                model=model,
                operation=operation,
                duration_ms=duration_ms,
                tokens_input=tokens_input,
                tokens_output=tokens_output,
                memory_used_mb=end_memory - start_memory,
                gpu_utilization=end_gpu if end_gpu else start_gpu,
                timestamp=time.time()
            )
            
            self.metrics.append(metric)
            self.provider_stats[provider].append(metric)
            
            # Log performance if notable
            self.log_performance_if_notable(metric)
            
            return result
            
        except Exception as e:
            # Record failed operation
            duration_ms = (time.time() - start_time) * 1000
            print(f"❌ AI operation failed after {duration_ms:.0f}ms: {e}")
            raise
    
    def estimate_input_tokens(self, args, kwargs) -> int:
        """Estimate input tokens from operation arguments"""
        text_content = ""
        
        # Extract text from common argument patterns
        if args and hasattr(args[0], '__iter__'):
            # Chat messages
            for item in args[0]:
                if hasattr(item, 'content'):
                    text_content += item.content + " "
        
        # Simple token estimation (4 chars ≈ 1 token)
        return len(text_content) // 4
    
    def estimate_output_tokens(self, result) -> int:
        """Estimate output tokens from AI response"""
        if isinstance(result, str):
            return len(result) // 4
        return 0
    
    def log_performance_if_notable(self, metric: AIPerformanceMetric):
        """Log performance metrics if they're notably good or bad"""
        
        # Define thresholds
        slow_thresholds = {
            'ollama': 5000,    # 5 seconds for local AI
            'openai': 10000,   # 10 seconds for OpenAI
            'huggingface': 8000 # 8 seconds for HuggingFace
        }
        
        fast_thresholds = {
            'ollama': 500,     # 500ms for local AI
            'openai': 1000,    # 1 second for OpenAI
            'huggingface': 1500 # 1.5 seconds for HuggingFace
        }
        
        provider_slow = slow_thresholds.get(metric.provider, 5000)
        provider_fast = fast_thresholds.get(metric.provider, 1000)
        
        if metric.duration_ms > provider_slow:
            print(f"🐌 Slow AI response: {metric.provider}/{metric.model} took {metric.duration_ms:.0f}ms")
            self.suggest_ai_optimizations(metric)
        elif metric.duration_ms < provider_fast:
            print(f"🚀 Fast AI response: {metric.provider}/{metric.model} in {metric.duration_ms:.0f}ms")
        
        # Check GPU utilization
        if metric.gpu_utilization and metric.gpu_utilization < 10 and metric.provider == 'ollama':
            print(f"⚠️ Low GPU utilization ({metric.gpu_utilization:.1f}%) - consider enabling GPU acceleration")
    
    def suggest_ai_optimizations(self, metric: AIPerformanceMetric):
        """Suggest optimizations based on performance metrics"""
        
        suggestions = []
        
        if metric.provider == 'ollama':
            if metric.gpu_utilization and metric.gpu_utilization < 50:
                suggestions.append("💡 Enable GPU acceleration in Ollama configuration")
            if metric.memory_used_mb > 1000:
                suggestions.append("💡 Consider using a smaller model variant")
            suggestions.append("💡 Ensure Ollama is running with sufficient resources")
            
        elif metric.provider == 'openai':
            suggestions.append("💡 Consider caching responses for repeated queries")
            suggestions.append("💡 Use streaming for long responses to improve perceived performance")
            
        elif metric.provider == 'huggingface':
            suggestions.append("💡 Consider pre-loading the model to avoid cold start")
            suggestions.append("💡 Use batch processing for multiple requests")
        
        for suggestion in suggestions:
            print(suggestion)
    
    def get_provider_performance_summary(self, provider: str) -> Dict:
        """Get performance summary for a specific AI provider"""
        
        if provider not in self.provider_stats:
            return {"error": f"No metrics available for provider {provider}"}
        
        metrics = self.provider_stats[provider]
        recent_metrics = [m for m in metrics if time.time() - m.timestamp < 3600]  # Last hour
        
        if not recent_metrics:
            return {"error": f"No recent metrics for provider {provider}"}
        
        durations = [m.duration_ms for m in recent_metrics]
        
        return {
            "provider": provider,
            "total_requests": len(recent_metrics),
            "average_duration_ms": sum(durations) / len(durations),
            "min_duration_ms": min(durations),
            "max_duration_ms": max(durations),
            "p95_duration_ms": sorted(durations)[int(len(durations) * 0.95)],
            "average_tokens_per_second": self.calculate_tokens_per_second(recent_metrics),
            "average_gpu_utilization": self.calculate_average_gpu_utilization(recent_metrics),
            "memory_efficiency": self.calculate_memory_efficiency(recent_metrics)
        }
    
    def calculate_tokens_per_second(self, metrics: List[AIPerformanceMetric]) -> float:
        """Calculate average tokens per second"""
        total_tokens = sum(m.tokens_output for m in metrics)
        total_time_seconds = sum(m.duration_ms for m in metrics) / 1000
        
        return total_tokens / total_time_seconds if total_time_seconds > 0 else 0
    
    def calculate_average_gpu_utilization(self, metrics: List[AIPerformanceMetric]) -> Optional[float]:
        """Calculate average GPU utilization"""
        gpu_metrics = [m.gpu_utilization for m in metrics if m.gpu_utilization is not None]
        
        return sum(gpu_metrics) / len(gpu_metrics) if gpu_metrics else None
    
    def calculate_memory_efficiency(self, metrics: List[AIPerformanceMetric]) -> float:
        """Calculate memory efficiency (tokens per MB)"""
        total_tokens = sum(m.tokens_output for m in metrics)
        total_memory = sum(max(m.memory_used_mb, 0.1) for m in metrics)  # Avoid division by zero
        
        return total_tokens / total_memory if total_memory > 0 else 0
```

**GPU Performance Monitoring:**
```python
# packages/farm-core/src/ai/gpu_monitor.py
class GPUMonitor:
    """Monitor GPU usage for AI workloads"""
    
    def __init__(self):
        self.gpu_available = self.initialize_gpu_monitoring()
        self.metrics_history = deque(maxlen=300)  # 5 minutes at 1 sample/second
        
        if self.gpu_available:
            self.start_monitoring()
    
    def initialize_gpu_monitoring(self) -> bool:
        """Initialize GPU monitoring if available"""
        try:
            import nvidia_ml_py3 as nvml
            nvml.nvmlInit()
            self.device_count = nvml.nvmlDeviceGetCount()
            return True
        except:
            print("ℹ️ GPU monitoring not available (NVIDIA GPU not found)")
            return False
    
    def start_monitoring(self):
        """Start continuous GPU monitoring"""
        async def monitor_loop():
            while True:
                try:
                    metrics = self.collect_gpu_metrics()
                    self.metrics_history.append(metrics)
                    
                    # Alert on high memory usage
                    for gpu_id, gpu_metrics in enumerate(metrics['gpus']):
                        memory_percent = (gpu_metrics['memory_used'] / gpu_metrics['memory_total']) * 100
                        if memory_percent > 90:
                            print(f"⚠️ GPU {gpu_id} memory usage high: {memory_percent:.1f}%")
                        
                        # Alert on thermal throttling
                        if gpu_metrics['temperature'] > 80:
                            print(f"🌡️ GPU {gpu_id} running hot: {gpu_metrics['temperature']}°C")
                    
                    await asyncio.sleep(1)
                except Exception as e:
                    print(f"GPU monitoring error: {e}")
                    await asyncio.sleep(5)
        
        # Start monitoring in background
        asyncio.create_task(monitor_loop())
    
    def collect_gpu_metrics(self) -> Dict:
        """Collect current GPU metrics"""
        if not self.gpu_available:
            return {"available": False}
        
        import nvidia_ml_py3 as nvml
        
        metrics = {
            "timestamp": time.time(),
            "available": True,
            "gpus": []
        }
        
        for i in range(self.device_count):
            handle = nvml.nvmlDeviceGetHandleByIndex(i)
            
            # Get utilization
            utilization = nvml.nvmlDeviceGetUtilizationRates(handle)
            
            # Get memory info
            memory_info = nvml.nvmlDeviceGetMemoryInfo(handle)
            
            # Get temperature
            temperature = nvml.nvmlDeviceGetTemperature(handle, nvml.NVML_TEMPERATURE_GPU)
            
            # Get power usage
            try:
                power_usage = nvml.nvmlDeviceGetPowerUsage(handle) / 1000  # Convert to watts
            except:
                power_usage = None
            
            gpu_metrics = {
                "gpu_id": i,
                "name": nvml.nvmlDeviceGetName(handle).decode(),
                "utilization": utilization.gpu,
                "memory_utilization": utilization.memory,
                "memory_used": memory_info.used // 1024 // 1024,  # MB
                "memory_total": memory_info.total // 1024 // 1024,  # MB
                "memory_free": memory_info.free // 1024 // 1024,  # MB
                "temperature": temperature,
                "power_usage": power_usage
            }
            
            metrics["gpus"].append(gpu_metrics)
        
        return metrics
    
    def get_performance_recommendations(self) -> List[str]:
        """Analyze GPU performance and provide recommendations"""
        if not self.metrics_history:
            return ["No GPU metrics available for analysis"]
        
        recent_metrics = list(self.metrics_history)[-60:]  # Last minute
        recommendations = []
        
        for gpu_id in range(self.device_count):
            gpu_utilizations = [m['gpus'][gpu_id]['utilization'] for m in recent_metrics]
            avg_utilization = sum(gpu_utilizations) / len(gpu_utilizations)
            
            memory_usages = [m['gpus'][gpu_id]['memory_used'] / m['gpus'][gpu_id]['memory_total'] * 100 
                           for m in recent_metrics]
            avg_memory_usage = sum(memory_usages) / len(memory_usages)
            
            if avg_utilization < 20:
                recommendations.append(f"💡 GPU {gpu_id}: Low utilization ({avg_utilization:.1f}%) - consider enabling GPU acceleration in Ollama")
            
            if avg_memory_usage > 90:
                recommendations.append(f"⚠️ GPU {gpu_id}: High memory usage ({avg_memory_usage:.1f}%) - consider using smaller AI models")
            
            if avg_utilization > 95:
                recommendations.append(f"🚀 GPU {gpu_id}: Excellent utilization ({avg_utilization:.1f}%)")
        
        return recommendations
```

### 3. Build System Performance

**Purpose:** Optimize build times and track build performance metrics

**Build Performance Monitoring:**
```javascript
// tools/build/performance-monitor.js
export class BuildPerformanceMonitor {
  constructor() {
    this.buildMetrics = new Map();
    this.bundleAnalyzer = new BundleAnalyzer();
  }

  async monitorBuild(buildType, buildFunction) {
    const startTime = performance.now();
    const startMemory = process.memoryUsage();
    
    console.log(`🏗️ Starting ${buildType} build...`);
    
    try {
      const result = await buildFunction();
      
      const endTime = performance.now();
      const endMemory = process.memoryUsage();
      const duration = endTime - startTime;
      
      const metrics = {
        buildType,
        duration,
        memoryUsed: (endMemory.heapUsed - startMemory.heapUsed) / 1024 / 1024, // MB
        bundleSize: await this.calculateBundleSize(result),
        timestamp: Date.now()
      };
      
      this.buildMetrics.set(buildType, metrics);
      this.logBuildPerformance(metrics);
      
      return result;
      
    } catch (error) {
      const duration = performance.now() - startTime;
      console.error(`❌ ${buildType} build failed after ${duration.toFixed(0)}ms:`, error.message);
      throw error;
    }
  }

  logBuildPerformance(metrics) {
    const { buildType, duration, memoryUsed, bundleSize } = metrics;
    
    console.log(`✅ ${buildType} build completed in ${duration.toFixed(0)}ms`);
    console.log(`📊 Bundle size: ${this.formatBytes(bundleSize)}`);
    console.log(`🧠 Memory used: ${memoryUsed.toFixed(1)}MB`);
    
    // Performance warnings
    if (duration > 30000) { // 30 seconds
      console.warn(`⚠️ Build time exceeded 30 seconds. Consider optimizing:
💡 Enable pnpm caching with --prefer-offline
💡 Use build caching for unchanged files  
💡 Consider code splitting optimization`);
    }
    
    if (bundleSize > 5 * 1024 * 1024) { // 5MB
      console.warn(`⚠️ Large bundle size detected (${this.formatBytes(bundleSize)})
💡 Consider code splitting
💡 Review AI/ML dependencies for tree-shaking
💡 Use dynamic imports for heavy libraries`);
    }
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  async calculateBundleSize(buildResult) {
    // Calculate total bundle size from build output
    if (buildResult.output) {
      return buildResult.output.reduce((total, chunk) => {
        return total + (chunk.code ? chunk.code.length : 0);
      }, 0);
    }
    return 0;
  }

  async optimizePnpmWorkspace(projectPath) {
    """Optimize pnpm workspace configuration for better performance"""
    
    const workspaceConfig = {
      'prefer-workspace-packages': true,
      'link-workspace-packages': true,
      'shared-workspace-lockfile': true,
      'hoist-pattern': ['*'],
      'shamefully-hoist': true,
      'package-import-method': 'hardlink'
    };

    // Create optimized .npmrc
    const npmrcPath = path.join(projectPath, '.npmrc');
    const configContent = Object.entries(workspaceConfig)
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');
    
    await fs.writeFile(npmrcPath, configContent);
    
    // Create pnpm-workspace.yaml if it doesn't exist
    const workspaceFile = path.join(projectPath, 'pnpm-workspace.yaml');
    if (!await fs.pathExists(workspaceFile)) {
      const workspaceContent = `
packages:
  - 'apps/*'
  - 'packages/*'
  - '!**/test/**'
`;
      await fs.writeFile(workspaceFile, workspaceContent);
    }
    
    console.log('⚡ pnpm workspace optimized for performance');
  }
}
```

**Type Generation Performance:**
```typescript
// tools/codegen/performance-monitor.ts
export class TypeGenerationMonitor {
  private metrics: GenerationMetric[] = [];

  async monitorGeneration(trigger: string, generationFn: () => Promise<GenerationResult>) {
    const startTime = performance.now();
    const startMemory = process.memoryUsage().heapUsed;

    try {
      const result = await generationFn();
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      const memoryUsed = (process.memoryUsage().heapUsed - startMemory) / 1024 / 1024;

      const metric: GenerationMetric = {
        trigger,
        duration,
        memoryUsed,
        filesGenerated: result.filesGenerated,
        linesGenerated: result.linesGenerated,
        typesGenerated: result.typesGenerated,
        timestamp: Date.now()
      };

      this.metrics.push(metric);
      this.logGenerationPerformance(metric);

      // Cleanup old metrics
      this.metrics = this.metrics.slice(-100);

      return result;

    } catch (error) {
      const duration = performance.now() - startTime;
      console.error(`❌ Type generation failed after ${duration.toFixed(0)}ms:`, error.message);
      throw error;
    }
  }

  private logGenerationPerformance(metric: GenerationMetric) {
    const efficiency = metric.typesGenerated / (metric.duration / 1000); // types per second
    
    console.log(`🔄 Type generation (${metric.trigger}): ${metric.duration.toFixed(0)}ms`);
    console.log(`📁 Generated: ${metric.filesGenerated} files, ${metric.typesGenerated} types`);
    console.log(`⚡ Efficiency: ${efficiency.toFixed(1)} types/second`);

    // Performance optimization suggestions
    if (metric.duration > 5000) {
      console.warn(`⚠️ Type generation slower than expected:
💡 Consider simplifying complex model relationships
💡 Enable incremental generation for large schemas
💡 Use type generation caching`);
    }

    if (metric.memoryUsed > 100) {
      console.warn(`⚠️ High memory usage during type generation (${metric.memoryUsed.toFixed(1)}MB):
💡 Process models in smaller batches
💡 Clear intermediate data structures`);
    }
  }

  getGenerationTrends(): GenerationTrends {
    if (this.metrics.length < 5) {
      return { insufficient_data: true };
    }

    const recent = this.metrics.slice(-10);
    const avgDuration = recent.reduce((sum, m) => sum + m.duration, 0) / recent.length;
    const avgEfficiency = recent.reduce((sum, m) => sum + (m.typesGenerated / (m.duration / 1000)), 0) / recent.length;

    return {
      average_duration_ms: avgDuration,
      average_efficiency_types_per_second: avgEfficiency,
      trend: this.calculateTrend(recent.map(m => m.duration)),
      recommendations: this.getOptimizationRecommendations(recent)
    };
  }

  private getOptimizationRecommendations(metrics: GenerationMetric[]): string[] {
    const recommendations: string[] = [];
    
    const avgDuration = metrics.reduce((sum, m) => sum + m.duration, 0) / metrics.length;
    const avgMemory = metrics.reduce((sum, m) => sum + m.memoryUsed, 0) / metrics.length;
    
    if (avgDuration > 2000) {
      recommendations.push('Enable incremental type generation');
      recommendations.push('Consider type generation caching');
    }
    
    if (avgMemory > 50) {
      recommendations.push('Optimize memory usage in type generator');
      recommendations.push('Process models in smaller batches');
    }
    
    const variability = this.calculateVariability(metrics.map(m => m.duration));
    if (variability > 0.5) {
      recommendations.push('Investigate inconsistent generation times');
      recommendations.push('Consider warming up type generation cache');
    }
    
    return recommendations;
  }
}
```

### 4. Production Monitoring

**Purpose:** Monitor production applications with AI-specific metrics

**Production Metrics Collection:**
```python
# packages/farm-monitoring/src/production_monitor.py
from prometheus_client import Counter, Histogram, Gauge, CollectorRegistry
import time
from typing import Dict, Any

class ProductionMonitor:
    """Production monitoring for FARM applications with AI metrics"""
    
    def __init__(self):
        self.registry = CollectorRegistry()
        self.setup_metrics()
    
    def setup_metrics(self):
        """Setup Prometheus metrics for production monitoring"""
        
        # HTTP request metrics
        self.http_requests_total = Counter(
            'farm_http_requests_total',
            'Total HTTP requests',
            ['method', 'endpoint', 'status_code'],
            registry=self.registry
        )
        
        self.http_request_duration = Histogram(
            'farm_http_request_duration_seconds',
            'HTTP request duration',
            ['method', 'endpoint'],
            registry=self.registry
        )
        
        # AI-specific metrics
        self.ai_requests_total = Counter(
            'farm_ai_requests_total',
            'Total AI requests',
            ['provider', 'model', 'operation'],
            registry=self.registry
        )
        
        self.ai_request_duration = Histogram(
            'farm_ai_request_duration_seconds',
            'AI request duration',
            ['provider', 'model', 'operation'],
            buckets=(0.1, 0.5, 1.0, 2.5, 5.0, 10.0, 25.0, 50.0, 100.0),
            registry=self.registry
        )
        
        self.ai_tokens_processed = Counter(
            'farm_ai_tokens_processed_total',
            'Total AI tokens processed',
            ['provider', 'model', 'type'],  # type: input/output
            registry=self.registry
        )
        
        self.ai_provider_errors = Counter(
            'farm_ai_provider_errors_total',
            'AI provider errors',
            ['provider', 'error_type'],
            registry=self.registry
        )
        
        # System metrics
        self.active_connections = Gauge(
            'farm_active_connections',
            'Active database connections',
            registry=self.registry
        )
        
        self.memory_usage = Gauge(
            'farm_memory_usage_bytes',
            'Memory usage',
            ['type'],  # heap, rss, external
            registry=self.registry
        )
        
        # GPU metrics (if available)
        self.gpu_utilization = Gauge(
            'farm_gpu_utilization_percent',
            'GPU utilization percentage',
            ['gpu_id'],
            registry=self.registry
        )
        
        self.gpu_memory_usage = Gauge(
            'farm_gpu_memory_usage_bytes',
            'GPU memory usage',
            ['gpu_id', 'type'],  # used, total
            registry=self.registry
        )
    
    def record_http_request(self, method: str, endpoint: str, status_code: int, duration: float):
        """Record HTTP request metrics"""
        self.http_requests_total.labels(
            method=method,
            endpoint=endpoint,
            status_code=status_code
        ).inc()
        
        self.http_request_duration.labels(
            method=method,
            endpoint=endpoint
        ).observe(duration)
    
    def record_ai_request(self, provider: str, model: str, operation: str, 
                         duration: float, input_tokens: int, output_tokens: int):
        """Record AI request metrics"""
        self.ai_requests_total.labels(
            provider=provider,
            model=model,
            operation=operation
        ).inc()
        
        self.ai_request_duration.labels(
            provider=provider,
            model=model,
            operation=operation
        ).observe(duration)
        
        self.ai_tokens_processed.labels(
            provider=provider,
            model=model,
            type='input'
        ).inc(input_tokens)
        
        self.ai_tokens_processed.labels(
            provider=provider,
            model=model,
            type='output'
        ).inc(output_tokens)
    
    def record_ai_error(self, provider: str, error_type: str):
        """Record AI provider errors"""
        self.ai_provider_errors.labels(
            provider=provider,
            error_type=error_type
        ).inc()
    
    async def update_system_metrics(self):
        """Update system metrics periodically"""
        import psutil
        
        # Memory metrics
        memory = psutil.virtual_memory()
        self.memory_usage.labels(type='total').set(memory.total)
        self.memory_usage.labels(type='used').set(memory.used)
        self.memory_usage.labels(type='available').set(memory.available)
        
        # Process memory
        process = psutil.Process()
        process_memory = process.memory_info()
        self.memory_usage.labels(type='process_rss').set(process_memory.rss)
        self.memory_usage.labels(type='process_vms').set(process_memory.vms)
    
    async def update_gpu_metrics(self):
        """Update GPU metrics if available"""
        try:
            import nvidia_ml_py3 as nvml
            
            for i in range(nvml.nvmlDeviceGetCount()):
                handle = nvml.nvmlDeviceGetHandleByIndex(i)
                
                # Utilization
                utilization = nvml.nvmlDeviceGetUtilizationRates(handle)
                self.gpu_utilization.labels(gpu_id=str(i)).set(utilization.gpu)
                
                # Memory
                memory = nvml.nvmlDeviceGetMemoryInfo(handle)
                self.gpu_memory_usage.labels(gpu_id=str(i), type='used').set(memory.used)
                self.gpu_memory_usage.labels(gpu_id=str(i), type='total').set(memory.total)
                
        except Exception:
            pass  # GPU metrics not available
```

**AI Performance Dashboard:**
```typescript
// packages/farm-monitoring/src/dashboard.tsx
export function AIPerformanceDashboard() {
  const [metrics, setMetrics] = useState(null);
  const [timeRange, setTimeRange] = useState('1h');

  useEffect(() => {
    const fetchMetrics = async () => {
      const response = await fetch(`/api/metrics/ai?range=${timeRange}`);
      const data = await response.json();
      setMetrics(data);
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, [timeRange]);

  if (!metrics) return <div>Loading metrics...</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
      {/* AI Provider Performance */}
      <MetricCard
        title="AI Provider Performance"
        subtitle="Average response times"
      >
        <div className="space-y-2">
          {Object.entries(metrics.providers).map(([provider, data]) => (
            <div key={provider} className="flex justify-between items-center">
              <span className="font-medium capitalize">{provider}</span>
              <div className="text-right">
                <div className="text-lg font-mono">
                  {data.avgDuration.toFixed(0)}ms
                </div>
                <div className="text-sm text-gray-500">
                  {data.requests} requests
                </div>
              </div>
            </div>
          ))}
        </div>
      </MetricCard>

      {/* Token Processing Rate */}
      <MetricCard
        title="Token Processing"
        subtitle="Tokens per second by provider"
      >
        <div className="space-y-2">
          {Object.entries(metrics.tokenRates).map(([provider, rate]) => (
            <div key={provider} className="flex justify-between items-center">
              <span className="font-medium capitalize">{provider}</span>
              <span className="text-lg font-mono">{rate.toFixed(1)} tok/s</span>
            </div>
          ))}
        </div>
      </MetricCard>

      {/* GPU Utilization */}
      {metrics.gpu && (
        <MetricCard
          title="GPU Utilization"
          subtitle="Real-time GPU metrics"
        >
          <div className="space-y-3">
            {metrics.gpu.devices.map((device, index) => (
              <div key={index} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>GPU {index}</span>
                  <span>{device.utilization}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: `${device.utilization}%` }}
                  />
                </div>
                <div className="text-xs text-gray-500">
                  Memory: {device.memoryUsed}MB / {device.memoryTotal}MB
                </div>
              </div>
            ))}
          </div>
        </MetricCard>
      )}

      {/* Error Rates */}
      <MetricCard
        title="Error Rates"
        subtitle="AI provider error tracking"
      >
        <div className="space-y-2">
          {Object.entries(metrics.errors).map(([provider, errorData]) => (
            <div key={provider} className="flex justify-between items-center">
              <span className="font-medium capitalize">{provider}</span>
              <div className="text-right">
                <div className={`text-lg font-mono ${
                  errorData.rate > 0.05 ? 'text-red-600' : 'text-green-600'
                }`}>
                  {(errorData.rate * 100).toFixed(2)}%
                </div>
                <div className="text-sm text-gray-500">
                  {errorData.count} errors
                </div>
              </div>
            </div>
          ))}
        </div>
      </MetricCard>

      {/* Response Time Trends */}
      <div className="col-span-full">
        <MetricCard
          title="Response Time Trends"
          subtitle="AI response times over time"
        >
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={metrics.timeSeries}>
                <XAxis dataKey="timestamp" />
                <YAxis />
                <Tooltip />
                <Legend />
                {Object.keys(metrics.providers).map((provider, index) => (
                  <Line
                    key={provider}
                    type="monotone"
                    dataKey={provider}
                    stroke={`hsl(${index * 60}, 70%, 50%)`}
                    strokeWidth={2}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </MetricCard>
      </div>
    </div>
  );
}
```

---

## Performance CLI Integration

### Performance Commands

**CLI Performance Monitoring:**
```bash
# Performance monitoring commands
farm perf                           # Show current performance dashboard
farm perf:dev                      # Development server performance
farm perf:ai                       # AI provider performance
farm perf:build                    # Build performance analysis

# Performance optimization
farm optimize                      # Run all optimizations
farm optimize:pnpm                 # Optimize pnpm configuration
farm optimize:ai                   # Optimize AI model configuration
farm optimize:build                # Optimize build configuration

# Performance testing
farm perf:test                     # Run performance test suite
farm perf:test --ai-providers      # Test all AI providers
farm perf:test --load              # Load testing
farm perf:benchmark               # Benchmark AI operations

# Performance reports
farm perf:report                   # Generate performance report
farm perf:report --export          # Export metrics to file
farm perf:report --compare         # Compare with previous runs
```

### Performance Configuration

**Farm Config Performance Settings:**
```typescript
// farm.config.ts - Performance configuration
export default defineConfig({
  performance: {
    // Development optimizations
    development: {
      pnpm: {
        enabled: true,
        preferOffline: true,
        shamefullyHoist: true,
        storeDir: '~/.pnpm-store'
      },
      hotReload: {
        typeGeneration: {
          incremental: true,
          debounceMs: 200,
          caching: true
        },
        aiModels: {
          hotSwap: true,
          preloadModels: ['llama3.1']
        }
      },
      monitoring: {
        enabled: true,
        gpuMonitoring: true,
        memoryTracking: true
      }
    },
    
    // AI performance settings
    ai: {
      caching: {
        enabled: true,
        ttl: 3600, // 1 hour
        maxSize: '500MB'
      },
      optimization: {
        batchRequests: true,
        connectionPooling: true,
        timeouts: {
          ollama: 30000,
          openai: 60000,
          huggingface: 45000
        }
      },
      monitoring: {
        enabled: true,
        detailedMetrics: true,
        performanceAlerts: true
      }
    },
    
    // Build performance
    build: {
      optimization: {
        codeSplitting: true,
        treeshaking: true,
        minification: true,
        compressionLevel: 6
      },
      caching: {
        enabled: true,
        strategy: 'filesystem',
        maxAge: '7d'
      },
      monitoring: {
        bundleAnalysis: true,
        buildTiming: true,
        memoryTracking: true
      }
    },
    
    // Production monitoring
    production: {
      metrics: {
        enabled: true,
        prometheus: true,
        customMetrics: true
      },
      alerting: {
        enabled: true,
        thresholds: {
          responseTime: 5000,    // 5 seconds
          errorRate: 0.05,       // 5%
          aiProviderTimeout: 30000 // 30 seconds
        }
      },
      optimization: {
        caching: true,
        compression: true,
        aiResponseCaching: true
      }
    }
  }
});
```

---

## Alert System

### Performance Alerts

**Intelligent Performance Alerting:**
```python
# packages/farm-monitoring/src/alerts.py
class PerformanceAlertSystem:
    """Intelligent alerting for performance issues"""
    
    def __init__(self):
        self.thresholds = {
            'ai_response_time': {
                'ollama': 10000,    # 10 seconds
                'openai': 30000,    # 30 seconds
                'huggingface': 20000 # 20 seconds
            },
            'error_rate': 0.05,     # 5%
            'gpu_utilization': 95,  # 95%
            'memory_usage': 90,     # 90%
            'build_time': 120000    # 2 minutes
        }
        
        self.alert_cooldowns = {}  # Prevent spam
        
    def check_ai_performance(self, metrics):
        """Check AI performance and alert if necessary"""
        alerts = []
        
        for provider, provider_metrics in metrics.items():
            threshold = self.thresholds['ai_response_time'].get(provider, 15000)
            
            if provider_metrics['avg_response_time'] > threshold:
                alert = {
                    'type': 'ai_performance',
                    'severity': 'warning',
                    'provider': provider,
                    'message': f"{provider} response time ({provider_metrics['avg_response_time']:.0f}ms) exceeds threshold ({threshold}ms)",
                    'suggestions': self.get_ai_optimization_suggestions(provider, provider_metrics)
                }
                alerts.append(alert)
        
        return alerts
    
    def get_ai_optimization_suggestions(self, provider, metrics):
        """Get provider-specific optimization suggestions"""
        suggestions = []
        
        if provider == 'ollama':
            if metrics.get('gpu_utilization', 0) < 50:
                suggestions.append("Enable GPU acceleration in Ollama")
            if metrics.get('memory_usage', 0) > 8000:  # 8GB
                suggestions.append("Consider using a smaller model variant")
            suggestions.append("Ensure Ollama has sufficient CPU/GPU resources")
            
        elif provider == 'openai':
            suggestions.append("Consider implementing response caching")
            suggestions.append("Use streaming for long responses")
            suggestions.append("Check network connectivity to OpenAI")
            
        elif provider == 'huggingface':
            suggestions.append("Pre-load models to avoid cold starts")
            suggestions.append("Consider using model quantization")
            suggestions.append("Implement request batching")
        
        return suggestions
    
    def format_alert_message(self, alert):
        """Format alert for display/notification"""
        message = f"🚨 {alert['type'].title()} Alert\n"
        message += f"Severity: {alert['severity'].upper()}\n"
        message += f"Message: {alert['message']}\n"
        
        if alert.get('suggestions'):
            message += "\n💡 Suggestions:\n"
            for suggestion in alert['suggestions']:
                message += f"• {suggestion}\n"
        
        return message
```

---

*Status: ✅ Completed - Ready for implementation*