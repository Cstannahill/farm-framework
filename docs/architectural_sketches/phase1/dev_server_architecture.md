# Development Server Architecture

## Overview

The FARM development server (`farm dev`) provides a unified development experience by orchestrating multiple services, file watchers, and hot reload systems. It manages the complexity of running React, FastAPI, databases, and AI services while maintaining seamless integration and developer feedback.

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    FARM Development Server                      │
│                         (farm dev)                             │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────┐ │
│  │    Vite     │  │  FastAPI    │  │  Database   │  │ Ollama  │ │
│  │   (3000)    │  │   (8000)    │  │   Service   │  │ (11434) │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────┘ │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────┐ │
│  │File Watcher │  │Code Gen     │  │Hot Reload   │  │ Proxy   │ │
│  │   System    │  │  Pipeline   │  │Coordinator  │  │ Manager │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────┘ │
├─────────────────────────────────────────────────────────────────┤
│               Process Manager & Health Monitor                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Core Components

### 1. Process Manager

**Purpose:** Spawn, monitor, and manage all development services

**Implementation:**
```javascript
// tools/dev-server/process_manager.js
import { spawn } from 'child_process';
import { EventEmitter } from 'events';

class ProcessManager extends EventEmitter {
  constructor() {
    super();
    this.processes = new Map();
    this.healthChecks = new Map();
  }

  async startService(name, command, options = {}) {
    const process = spawn(command.cmd, command.args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, ...options.env },
      cwd: options.cwd
    });

    this.processes.set(name, {
      process,
      status: 'starting',
      port: options.port,
      healthCheckUrl: options.healthCheck,
      restartCount: 0
    });

    this.setupProcessHandlers(name, process);
    await this.waitForHealthy(name);
    
    return process;
  }

  setupProcessHandlers(name, process) {
    process.stdout.on('data', (data) => {
      this.emit('log', { service: name, type: 'stdout', data: data.toString() });
    });

    process.stderr.on('data', (data) => {
      this.emit('log', { service: name, type: 'stderr', data: data.toString() });
    });

    process.on('exit', (code) => {
      this.handleProcessExit(name, code);
    });
  }

  async waitForHealthy(name, timeout = 30000) {
    const service = this.processes.get(name);
    if (!service.healthCheckUrl) return;

    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      try {
        await fetch(service.healthCheckUrl);
        service.status = 'healthy';
        this.emit('service-ready', name);
        return;
      } catch {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    throw new Error(`Service ${name} failed to start within ${timeout}ms`);
  }

  async shutdown() {
    const shutdownPromises = Array.from(this.processes.keys()).map(name => 
      this.stopService(name)
    );
    await Promise.all(shutdownPromises);
  }
}
```

### 2. Service Configurations

**Service Definitions:**
```javascript
// tools/dev-server/service_config.js
export const SERVICES = {
  database: {
    name: 'MongoDB',
    command: {
      cmd: 'docker',
      args: ['compose', 'up', 'mongodb', '-d']
    },
    healthCheck: 'http://localhost:27017',
    required: true,
    order: 1
  },

  ollama: {
    name: 'Ollama AI',
    command: {
      cmd: 'docker',
      args: ['run', '-d', '--name', 'farm-ollama', '-p', '11434:11434', 
             '-v', 'ollama:/root/.ollama', 'ollama/ollama']
    },
    healthCheck: 'http://localhost:11434/api/tags',
    required: false, // Only if AI features enabled
    order: 1.5, // Start after database, before backend
    autoStart: true,
    postStart: async (config) => {
      // Auto-pull configured models
      const autoPull = config.ai?.providers?.ollama?.autoPull || [];
      
      for (const model of autoPull) {
        console.log(`📥 Auto-pulling Ollama model: ${model}`);
        await pullOllamaModel(model);
      }
    }
  },
  
  backend: {
    name: 'FastAPI',
    command: {
      cmd: 'uvicorn',
      args: ['src.main:app', '--reload', '--host', '0.0.0.0', '--port', '8000']
    },
    cwd: 'apps/api',
    healthCheck: 'http://localhost:8000/health',
    env: {
      FARM_ENV: 'development',
      PYTHONPATH: '.',
      OLLAMA_URL: 'http://localhost:11434'
    },
    required: true,
    order: 2
  },

  frontend: {
    name: 'Vite',
    command: {
      cmd: 'npm',
      args: ['run', 'dev']
    },
    cwd: 'apps/web',
    healthCheck: 'http://localhost:3000',
    required: true,
    order: 3
  }
};
```

### 3. Proxy Manager

**Purpose:** Route frontend requests to appropriate backend services

**Configuration:**
```javascript
// tools/dev-server/proxy_manager.js
import httpProxy from 'http-proxy-middleware';
import express from 'express';

class ProxyManager {
  constructor() {
    this.app = express();
    this.setupProxyRules();
  }

  setupProxyRules() {
    // API requests to FastAPI
    this.app.use('/api', httpProxy({
      target: 'http://localhost:8000',
      changeOrigin: true,
      pathRewrite: {
        '^/api': '/api'
      },
      onError: this.handleProxyError.bind(this)
    }));

    // Ollama API requests (direct proxy for AI operations)
    this.app.use('/ollama', httpProxy({
      target: 'http://localhost:11434',
      changeOrigin: true,
      pathRewrite: {
        '^/ollama': '/api'
      },
      onError: this.handleProxyError.bind(this)
    }));

    // WebSocket proxying for real-time features
    this.app.use('/ws', httpProxy({
      target: 'http://localhost:8000',
      ws: true,
      changeOrigin: true
    }));

    // Everything else to Vite
    this.app.use('/', httpProxy({
      target: 'http://localhost:3000',
      changeOrigin: true,
      ws: true // Support Vite HMR WebSocket
    }));
  }

  handleProxyError(err, req, res) {
    console.error(`Proxy error for ${req.url}:`, err.message);
    res.status(502).json({
      error: 'Service temporarily unavailable',
      message: 'Backend service is starting up...'
    });
  }

  start(port = 4000) {
    return this.app.listen(port, () => {
      console.log(`🌐 FARM proxy server running on http://localhost:${port}`);
    });
  }
}
```

### 4. File Watcher Integration

**Purpose:** Coordinate file watching with code generation and hot reload

**Implementation:**
```javascript
// tools/dev-server/file_watcher.js
import chokidar from 'chokidar';
import { CodeGenerator } from '../codegen/generator.js';

class DevFileWatcher {
  constructor(processManager) {
    this.processManager = processManager;
    this.codeGenerator = new CodeGenerator();
    this.watchers = new Map();
  }

  startWatching() {
    this.setupPythonWatcher();
    this.setupConfigWatcher();
    this.setupMLModelWatcher();
  }

  setupPythonWatcher() {
    const pythonWatcher = chokidar.watch([
      'apps/api/src/models/**/*.py',
      'apps/api/src/routes/**/*.py'
    ], {
      ignoreInitial: true,
      persistent: true
    });

    pythonWatcher.on('change', async (path) => {
      console.log(`🔄 Python file changed: ${path}`);
      
      try {
        // Regenerate types
        await this.codeGenerator.regenerateTypes();
        console.log('✅ TypeScript types regenerated');
        
        // Trigger frontend HMR update
        this.triggerFrontendUpdate();
      } catch (error) {
        console.error('❌ Type generation failed:', error);
        this.processManager.emit('generation-error', { path, error });
      }
    });

    this.watchers.set('python', pythonWatcher);
  }

  setupConfigWatcher() {
    const configWatcher = chokidar.watch([
      'farm.config.js',
      'apps/api/src/core/config.py',
      'apps/web/vite.config.ts'
    ], {
      ignoreInitial: true
    });

    configWatcher.on('change', async (path) => {
      console.log(`⚙️ Config file changed: ${path}`);
      
      // Restart affected services
      if (path.includes('farm.config.js')) {
        await this.processManager.restartAllServices();
      } else if (path.includes('vite.config.ts')) {
        await this.processManager.restartService('frontend');
      } else if (path.includes('config.py')) {
        await this.processManager.restartService('backend');
      }
    });

    this.watchers.set('config', configWatcher);
  }

  setupMLModelWatcher() {
    const modelWatcher = chokidar.watch([
      'apps/api/models/**/*',
      'apps/api/src/ai/**/*.py',
      'farm.config.ts' // Watch for Ollama model configuration changes
    ], {
      ignoreInitial: true
    });

    modelWatcher.on('change', async (path) => {
      console.log(`🤖 AI model/service changed: ${path}`);
      
      if (path.includes('farm.config.ts')) {
        // Handle Ollama model configuration changes
        await this.handleOllamaConfigChange();
      } else {
        // Hot reload AI models without restarting service
        try {
          await this.hotReloadAIModels();
        } catch (error) {
          // Fallback to service restart
          await this.processManager.restartService('backend');
        }
      }
    });

    this.watchers.set('models', modelWatcher);
  }

  triggerFrontendUpdate() {
    // Send HMR update signal to Vite
    // Vite will automatically pick up new type files
    this.processManager.emit('frontend-update', { 
      type: 'types-updated',
      timestamp: Date.now()
    });
  }

  async hotReloadAIModels() {
    // Send reload signal to AI service through FastAPI
    await fetch('http://localhost:8000/api/ai/reload-models', { method: 'POST' });
  }

  async handleOllamaConfigChange() {
    console.log('⚙️ Ollama configuration changed, checking for new models...');
    
    try {
      // Reload config and check for new models to pull
      const config = await this.loadFarmConfig();
      const autoPull = config.ai?.providers?.ollama?.autoPull || [];
      
      // Check which models are missing and pull them
      for (const model of autoPull) {
        const hasModel = await this.checkOllamaModel(model);
        if (!hasModel) {
          console.log(`📥 Pulling new Ollama model: ${model}`);
          await this.pullOllamaModel(model);
        }
      }
    } catch (error) {
      console.error('❌ Failed to handle Ollama config change:', error);
    }
  }

  async checkOllamaModel(modelName) {
    try {
      const response = await fetch('http://localhost:11434/api/tags');
      const data = await response.json();
      const models = data.models?.map(m => m.name) || [];
      return models.includes(modelName);
    } catch {
      return false;
    }
  }

  async pullOllamaModel(modelName) {
    try {
      const response = await fetch('http://localhost:11434/api/pull', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: modelName })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to pull model ${modelName}`);
      }
      
      console.log(`✅ Successfully pulled Ollama model: ${modelName}`);
    } catch (error) {
      console.error(`❌ Failed to pull Ollama model ${modelName}:`, error);
    }
  }
}
```

### 5. Hot Reload Coordinator

**Purpose:** Coordinate hot reload across different systems

**Implementation:**
```javascript
// tools/dev-server/hot_reload.js
class HotReloadCoordinator {
  constructor(processManager) {
    this.processManager = processManager;
    this.setupEventHandlers();
  }

  setupEventHandlers() {
    // Listen for type generation events
    this.processManager.on('types-regenerated', this.handleTypesUpdate.bind(this));
    
    // Listen for model changes
    this.processManager.on('models-updated', this.handleModelsUpdate.bind(this));
    
    // Listen for config changes
    this.processManager.on('config-changed', this.handleConfigUpdate.bind(this));
  }

  async handleTypesUpdate(event) {
    // Notify frontend that new types are available
    await this.notifyViteHMR({
      type: 'types-updated',
      files: event.generatedFiles
    });
    
    // Update IDE/TypeScript service
    this.triggerTypeScriptReload();
  }

  async handleModelsUpdate(event) {
    // Hot reload AI models without service restart
    try {
      await this.hotSwapAIModels(event.modelPath);
      console.log('🔥 AI models hot-reloaded successfully');
    } catch (error) {
      console.warn('⚠️ Hot reload failed, restarting AI service...');
      await this.processManager.restartService('ai');
    }
  }

  async notifyViteHMR(update) {
    // Send HMR update to Vite dev server
    const viteProcess = this.processManager.getProcess('frontend');
    if (viteProcess && viteProcess.status === 'healthy') {
      // Vite automatically watches the types directory
      // Just ensure the files are written and Vite will pick them up
      console.log('📡 Frontend will auto-reload with new types');
    }
  }

  triggerTypeScriptReload() {
    // Trigger TypeScript service reload for better IDE experience
    // This helps VS Code and other editors pick up new types immediately
    console.log('🔄 TypeScript service reloading...');
  }
}
```

---

## Development Server CLI Integration

### Command Implementation

```javascript
// tools/dev-server/index.js
import { ProcessManager } from './process_manager.js';
import { ProxyManager } from './proxy_manager.js';
import { DevFileWatcher } from './file_watcher.js';
import { HotReloadCoordinator } from './hot_reload.js';

export class FarmDevServer {
  constructor(options = {}) {
    this.options = {
      port: 4000,
      frontendOnly: false,
      backendOnly: false,
      verbose: false,
      ...options
    };
    
    this.processManager = new ProcessManager();
    this.proxyManager = new ProxyManager();
    this.fileWatcher = new DevFileWatcher(this.processManager);
    this.hotReload = new HotReloadCoordinator(this.processManager);
  }

  async start() {
    console.log('🌾 Starting FARM development server...\n');
    
    try {
      // Load project configuration
      const config = await this.loadFarmConfig();
      
      // Start services in order
      await this.startServices(config);
      
      // Start file watching
      this.fileWatcher.startWatching();
      
      // Start proxy server
      this.proxyManager.start(this.options.port);
      
      // Setup graceful shutdown
      this.setupShutdownHandlers();
      
      this.printStartupSummary();
    } catch (error) {
      console.error('❌ Failed to start development server:', error);
      await this.shutdown();
      process.exit(1);
    }
  }

  async startServices(config) {
    const servicesToStart = this.determineServicesToStart(config);
    
    for (const serviceConfig of servicesToStart) {
      console.log(`🚀 Starting ${serviceConfig.name}...`);
      await this.processManager.startService(
        serviceConfig.key,
        serviceConfig.command,
        serviceConfig.options
      );
      console.log(`✅ ${serviceConfig.name} ready\n`);
    }
  }

  determineServicesToStart(config) {
    let services = [];
    
    if (this.options.frontendOnly) {
      services = ['frontend'];
    } else if (this.options.backendOnly) {
      services = ['database', 'backend'];
      if (config.features?.includes('ai') && config.ai?.providers?.ollama?.enabled) {
        services.splice(1, 0, 'ollama'); // Insert Ollama before backend
      }
    } else {
      services = ['database', 'backend', 'frontend'];
      if (config.features?.includes('ai') && config.ai?.providers?.ollama?.enabled) {
        services.splice(1, 0, 'ollama'); // Insert Ollama after database, before backend
      }
    }
    
    return services.map(key => ({
      key,
      ...SERVICES[key]
    })).sort((a, b) => a.order - b.order);
  }

  printStartupSummary() {
    console.log('\n🎉 FARM development server is ready!\n');
    console.log('📱 Frontend:  http://localhost:3000');
    console.log('🔗 Proxy:     http://localhost:4000');
    console.log('⚡ Backend:   http://localhost:8000');
    console.log('📚 API Docs:  http://localhost:8000/docs');
    
    if (this.processManager.hasService('ollama')) {
      console.log('🤖 Ollama AI: http://localhost:11434');
    }
    
    console.log('\n🔍 Watching for changes...\n');
  }

  setupShutdownHandlers() {
    const shutdown = async () => {
      console.log('\n🛑 Shutting down FARM development server...');
      await this.shutdown();
      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  }

  async shutdown() {
    try {
      await this.processManager.shutdown();
      this.fileWatcher.stopAll();
      console.log('✅ All services stopped');
    } catch (error) {
      console.error('❌ Error during shutdown:', error);
    }
  }
}

// CLI command handler
export async function devCommand(options) {
  const server = new FarmDevServer(options);
  await server.start();
}
```

---

## Error Handling & Recovery

### Service Health Monitoring

```javascript
class HealthMonitor {
  constructor(processManager) {
    this.processManager = processManager;
    this.healthCheckInterval = 30000; // 30 seconds
  }

  startMonitoring() {
    setInterval(async () => {
      for (const [name, service] of this.processManager.processes) {
        if (service.healthCheckUrl) {
          const isHealthy = await this.checkServiceHealth(service.healthCheckUrl);
          
          if (!isHealthy && service.status === 'healthy') {
            console.warn(`⚠️ Service ${name} appears unhealthy`);
            service.status = 'unhealthy';
            
            // Attempt restart if configured
            if (service.autoRestart && service.restartCount < 3) {
              await this.processManager.restartService(name);
            }
          }
        }
      }
    }, this.healthCheckInterval);
  }

  async checkServiceHealth(url) {
    try {
      const response = await fetch(url, { 
        timeout: 5000,
        signal: AbortSignal.timeout(5000)
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}
```

### Error Recovery Strategies

```javascript
class ErrorRecovery {
  constructor(processManager) {
    this.processManager = processManager;
    this.setupErrorHandlers();
  }

  setupErrorHandlers() {
    this.processManager.on('process-exit', this.handleProcessExit.bind(this));
    this.processManager.on('generation-error', this.handleGenerationError.bind(this));
    this.processManager.on('startup-error', this.handleStartupError.bind(this));
  }

  async handleProcessExit(name, code) {
    const service = this.processManager.getService(name);
    
    if (code !== 0 && service.required) {
      console.error(`💥 Critical service ${name} crashed with code ${code}`);
      
      if (service.restartCount < 3) {
        console.log(`🔄 Attempting to restart ${name}...`);
        await this.processManager.restartService(name);
      } else {
        console.error(`❌ Service ${name} failed too many times, giving up`);
        process.exit(1);
      }
    } else if (code !== 0 && name === 'ollama') {
      console.warn(`⚠️ Ollama service crashed but continuing without local AI`);
      console.log(`💡 You can still develop using OpenAI or other configured providers`);
    }
  }

  handleGenerationError(error) {
    console.error('⚠️ Code generation failed:', error.error.message);
    console.log('📝 Fix the error in your Python code and save to retry');
    
    // Don't crash - just wait for next file change
  }

  handleStartupError(name, error) {
    console.error(`❌ Failed to start ${name}:`, error.message);
    
    // Provide helpful error messages
    if (error.message.includes('EADDRINUSE')) {
      console.log(`💡 Port already in use. Try: farm dev --port <different-port>`);
    } else if (error.message.includes('ENOENT')) {
      console.log(`💡 Command not found. Make sure dependencies are installed.`);
    } else if (name === 'ollama' && error.message.includes('docker')) {
      console.log(`💡 Docker not running or Ollama image not available.`);
      console.log(`   Try: docker pull ollama/ollama`);
    } else if (name === 'ollama') {
      console.log(`💡 Ollama failed to start. You can still develop without local AI.`);
      console.log(`   The framework will fallback to OpenAI if configured.`);
    }
  }
}
```

---

## Configuration Integration

### Farm Config Loading

```javascript
// Load and validate farm.config.ts
async function loadFarmConfig() {
  try {
    const config = await import(path.resolve('farm.config.ts'));
    return config.default || config;
  } catch (error) {
    console.warn('⚠️ No farm.config.ts found, using defaults');
    return getDefaultConfig();
  }
}

function getDefaultConfig() {
  return {
    database: { type: 'mongodb' },
    features: [],
    ai: { 
      providers: {
        ollama: {
          enabled: false,
          url: 'http://localhost:11434',
          models: ['llama3.1'],
          defaultModel: 'llama3.1'
        }
      }
    },
    development: {
      ports: {
        frontend: 3000,
        backend: 8000,
        proxy: 4000,
        ollama: 11434
      }
    }
  };
}

async function pullOllamaModel(modelName) {
  try {
    console.log(`📥 Pulling Ollama model: ${modelName}...`);
    
    const response = await fetch('http://localhost:11434/api/pull', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: modelName })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    // Stream the pull progress
    const reader = response.body?.getReader();
    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = new TextDecoder().decode(value);
        const lines = chunk.split('\n').filter(line => line.trim());
        
        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            if (data.status) {
              console.log(`📦 ${data.status}`);
            }
          } catch (e) {
            // Ignore malformed JSON lines
          }
        }
      }
    }
    
    console.log(`✅ Successfully pulled Ollama model: ${modelName}`);
  } catch (error) {
    console.error(`❌ Failed to pull Ollama model ${modelName}:`, error.message);
  }
}
```

---

*Status: ✅ Completed - Ready for implementation*