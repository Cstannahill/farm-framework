# @farm/deployment

The FARM Framework deployment package provides comprehensive deployment automation and management for FARM applications. It supports multiple deployment platforms, container orchestration, and CI/CD integration.

## 🚀 Quick Start

```bash
npm install @farm/deployment
```

```typescript
import { DeploymentManager } from '@farm/deployment';

const deployment = new DeploymentManager({
  platform: 'vercel',
  config: {
    projectId: 'my-farm-app',
    token: process.env.VERCEL_TOKEN
  }
});

await deployment.deploy();
```

## 📋 Core Features

### Multi-Platform Support
- **Vercel**: Frontend and full-stack deployment
- **Railway**: Full-stack deployment with databases
- **AWS**: Cloud deployment with EC2, ECS, Lambda
- **Docker**: Container-based deployment
- **Self-hosted**: On-premises deployment

### Container Orchestration
- Docker containerization
- Docker Compose for local development
- Kubernetes deployment manifests
- Container health checks and monitoring

### CI/CD Integration
- GitHub Actions workflows
- GitLab CI pipelines
- Automated testing and deployment
- Environment-specific configurations

### Environment Management
- Development, staging, and production environments
- Environment-specific configuration
- Secret management and security
- Database migration handling

## 🏗️ Architecture

```
@farm/deployment
├── Platforms/
│   ├── VercelDeployer        # Vercel deployment
│   ├── RailwayDeployer       # Railway deployment
│   ├── AWSDeployer           # AWS deployment
│   ├── DockerDeployer        # Docker deployment
│   └── SelfHostedDeployer    # Self-hosted deployment
├── Containers/
│   ├── DockerBuilder         # Docker image building
│   ├── ContainerRegistry     # Container registry management
│   └── ContainerOrchestrator # Container orchestration
├── CI/
│   ├── GitHubActions         # GitHub Actions integration
│   ├── GitLabCI              # GitLab CI integration
│   └── JenkinsCI             # Jenkins integration
├── Environments/
│   ├── EnvironmentManager    # Environment management
│   ├── ConfigManager         # Configuration management
│   └── SecretManager         # Secret management
└── Monitoring/
    ├── HealthChecker         # Health monitoring
    ├── LogAggregator         # Log aggregation
    └── MetricsCollector      # Metrics collection
```

## 📚 API Reference

### DeploymentManager

Main orchestrator for deployment operations.

```typescript
import { DeploymentManager } from '@farm/deployment';

const deployment = new DeploymentManager({
  platform: 'vercel',
  config: {
    projectId: 'my-farm-app',
    token: process.env.VERCEL_TOKEN
  },
  environments: {
    development: {
      url: 'https://dev.my-app.vercel.app'
    },
    production: {
      url: 'https://my-app.vercel.app'
    }
  }
});

// Deploy to specific environment
await deployment.deploy('production');

// Deploy with custom configuration
await deployment.deploy('staging', {
  buildCommand: 'npm run build:staging',
  environmentVariables: {
    NODE_ENV: 'staging'
  }
});
```

### Platform Deployers

#### VercelDeployer
Deploy to Vercel platform.

```typescript
import { VercelDeployer } from '@farm/deployment';

const deployer = new VercelDeployer({
  projectId: 'my-farm-app',
  token: process.env.VERCEL_TOKEN,
  teamId: 'team_123'
});

// Deploy frontend
await deployer.deployFrontend({
  buildCommand: 'npm run build',
  outputDirectory: './dist'
});

// Deploy full-stack
await deployer.deployFullStack({
  frontend: {
    buildCommand: 'npm run build',
    outputDirectory: './dist'
  },
  backend: {
    buildCommand: 'npm run build:api',
    outputDirectory: './api/dist'
  }
});
```

#### RailwayDeployer
Deploy to Railway platform.

```typescript
import { RailwayDeployer } from '@farm/deployment';

const deployer = new RailwayDeployer({
  projectId: 'my-farm-app',
  token: process.env.RAILWAY_TOKEN
});

// Deploy with database
await deployer.deploy({
  services: [
    {
      name: 'frontend',
      buildCommand: 'npm run build',
      startCommand: 'npm start'
    },
    {
      name: 'backend',
      buildCommand: 'npm run build:api',
      startCommand: 'npm run start:api'
    },
    {
      name: 'database',
      type: 'postgresql',
      plan: 'hobby'
    }
  ]
});
```

#### DockerDeployer
Deploy using Docker containers.

```typescript
import { DockerDeployer } from '@farm/deployment';

const deployer = new DockerDeployer({
  registry: 'my-registry.com',
  username: 'my-username',
  password: process.env.REGISTRY_PASSWORD
});

// Build and push Docker image
await deployer.buildAndPush({
  dockerfile: './Dockerfile',
  context: '.',
  tags: ['my-app:latest', 'my-app:v1.0.0']
});

// Deploy to Docker Swarm
await deployer.deployToSwarm({
  stackName: 'my-app',
  composeFile: './docker-compose.yml'
});
```

### Container Management

#### DockerBuilder
Build Docker images with optimization.

```typescript
import { DockerBuilder } from '@farm/deployment';

const builder = new DockerBuilder({
  registry: 'my-registry.com',
  cache: true,
  multiStage: true
});

// Build optimized image
await builder.build({
  dockerfile: './Dockerfile',
  context: '.',
  tags: ['my-app:latest'],
  buildArgs: {
    NODE_ENV: 'production'
  },
  target: 'production'
});
```

#### ContainerRegistry
Manage container registries.

```typescript
import { ContainerRegistry } from '@farm/deployment';

const registry = new ContainerRegistry({
  url: 'my-registry.com',
  username: 'my-username',
  password: process.env.REGISTRY_PASSWORD
});

// Push image
await registry.push('my-app:latest');

// Pull image
await registry.pull('my-app:latest');

// List images
const images = await registry.listImages();
```

### CI/CD Integration

#### GitHubActions
Generate GitHub Actions workflows.

```typescript
import { GitHubActions } from '@farm/deployment';

const actions = new GitHubActions({
  repository: 'my-org/my-farm-app',
  token: process.env.GITHUB_TOKEN
});

// Generate workflow
await actions.generateWorkflow({
  name: 'Deploy to Production',
  triggers: ['push'],
  branches: ['main'],
  steps: [
    {
      name: 'Build',
      run: 'npm run build'
    },
    {
      name: 'Deploy',
      run: 'farm deploy production'
    }
  ]
});
```

#### GitLabCI
Generate GitLab CI pipelines.

```typescript
import { GitLabCI } from '@farm/deployment';

const gitlab = new GitLabCI({
  projectId: '12345',
  token: process.env.GITLAB_TOKEN
});

// Generate pipeline
await gitlab.generatePipeline({
  stages: ['build', 'test', 'deploy'],
  jobs: [
    {
      stage: 'build',
      script: ['npm run build']
    },
    {
      stage: 'deploy',
      script: ['farm deploy production']
    }
  ]
});
```

### Environment Management

#### EnvironmentManager
Manage deployment environments.

```typescript
import { EnvironmentManager } from '@farm/deployment';

const manager = new EnvironmentManager({
  environments: {
    development: {
      url: 'https://dev.my-app.com',
      database: 'mongodb://localhost:27017/dev'
    },
    staging: {
      url: 'https://staging.my-app.com',
      database: 'mongodb://staging:27017/staging'
    },
    production: {
      url: 'https://my-app.com',
      database: 'mongodb://prod:27017/prod'
    }
  }
});

// Get environment configuration
const config = manager.getEnvironment('production');

// Deploy to environment
await manager.deploy('staging', {
  buildCommand: 'npm run build:staging'
});
```

#### ConfigManager
Manage environment-specific configurations.

```typescript
import { ConfigManager } from '@farm/deployment';

const configManager = new ConfigManager({
  configPath: './config',
  environments: ['development', 'staging', 'production']
});

// Load environment configuration
const config = await configManager.loadConfig('production');

// Update configuration
await configManager.updateConfig('staging', {
  apiUrl: 'https://staging-api.my-app.com',
  databaseUrl: 'mongodb://staging:27017/staging'
});
```

#### SecretManager
Manage secrets and sensitive data.

```typescript
import { SecretManager } from '@farm/deployment';

const secretManager = new SecretManager({
  provider: 'aws-secrets-manager',
  region: 'us-east-1'
});

// Store secret
await secretManager.storeSecret('database-password', 'secret123');

// Retrieve secret
const password = await secretManager.getSecret('database-password');

// Update secret
await secretManager.updateSecret('api-key', 'new-api-key');
```

## 🔧 Configuration

### Basic Configuration

```typescript
const deployment = new DeploymentManager({
  platform: 'vercel',
  config: {
    projectId: 'my-farm-app',
    token: process.env.VERCEL_TOKEN
  }
});
```

### Advanced Configuration

```typescript
const deployment = new DeploymentManager({
  platform: 'vercel',
  config: {
    projectId: 'my-farm-app',
    token: process.env.VERCEL_TOKEN,
    teamId: 'team_123'
  },
  environments: {
    development: {
      url: 'https://dev.my-app.vercel.app',
      buildCommand: 'npm run build:dev'
    },
    staging: {
      url: 'https://staging.my-app.vercel.app',
      buildCommand: 'npm run build:staging'
    },
    production: {
      url: 'https://my-app.vercel.app',
      buildCommand: 'npm run build:prod'
    }
  },
  monitoring: {
    enabled: true,
    healthChecks: true,
    metrics: true
  }
});
```

## 🎯 Advanced Usage

### Custom Deployment Strategy

```typescript
import { DeploymentManager } from '@farm/deployment';

class CustomDeployer extends DeploymentManager {
  async deploy(environment: string, options?: DeployOptions) {
    // Custom deployment logic
    console.log(`Deploying to ${environment}...`);
    
    // Build application
    await this.build(options);
    
    // Run tests
    await this.test();
    
    // Deploy to platform
    await this.deployToPlatform(environment, options);
    
    // Run health checks
    await this.healthCheck(environment);
    
    console.log(`Deployment to ${environment} completed!`);
  }
}
```

### Multi-Environment Deployment

```typescript
const deployment = new DeploymentManager({
  platform: 'vercel',
  config: { projectId: 'my-farm-app' }
});

// Deploy to multiple environments
const environments = ['development', 'staging', 'production'];

for (const env of environments) {
  try {
    await deployment.deploy(env);
    console.log(`✅ Deployed to ${env}`);
  } catch (error) {
    console.error(`❌ Failed to deploy to ${env}:`, error);
  }
}
```

### Blue-Green Deployment

```typescript
const deployment = new DeploymentManager({
  platform: 'aws',
  config: { region: 'us-east-1' }
});

// Blue-green deployment
await deployment.blueGreenDeploy({
  serviceName: 'my-farm-app',
  newVersion: 'v2.0.0',
  healthCheckPath: '/health',
  rollbackOnFailure: true
});
```

## 🐛 Troubleshooting

### Common Issues

#### Deployment Failures
```typescript
// Check deployment status
const status = await deployment.getStatus('production');
console.log('Deployment status:', status);

// Check logs
const logs = await deployment.getLogs('production');
console.log('Deployment logs:', logs);
```

#### Environment Issues
```typescript
// Validate environment configuration
const isValid = await deployment.validateEnvironment('production');
if (!isValid) {
  console.error('Invalid environment configuration');
}
```

#### Secret Management Issues
```typescript
// Check secret availability
const secret = await secretManager.getSecret('database-password');
if (!secret) {
  console.error('Secret not found');
}
```

### Getting Help

- **GitHub Issues**: [Report bugs](https://github.com/farm-stack/framework/issues)
- **Documentation**: [Deployment Reference](../docs/reference/deployment/)
- **Discussions**: [Community help](https://github.com/farm-stack/framework/discussions)

## 🔄 Changelog

### v0.2.0
- Added multi-platform deployment support
- Enhanced container orchestration
- Improved CI/CD integration
- Added environment management

### v0.1.0
- Initial release with basic deployment
- Docker support
- Vercel integration
- Basic CI/CD workflows

## 📄 License

MIT © FARM Framework