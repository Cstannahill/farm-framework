# Deployment Package Integration Plan

This document refines the ideas from `designplan.md` and maps them onto the existing FARM framework. It outlines the architecture, required packages, type additions and integration points needed to implement the Deploy Recipes system.

## 1. Package Structure

```
packages/deployment/
├── src/
│   ├── detector/            # PlatformDetector & helpers
│   ├── engine/              # DeployEngine core logic
│   ├── recipes/             # Platform specific recipe implementations
│   ├── health/              # Health checks & monitoring
│   ├── cost/                # Cost estimator utilities
│   ├── rollback/            # RollbackManager implementation
│   ├── ui/                  # CLI progress components
│   ├── analytics/           # DeploymentAnalytics module
│   ├── errors/              # Error classes and diagnostics
│   ├── utils/               # Git and helper utilities
│   └── index.ts             # Public exports
├── designplan.md
└── integration-notes.md     # (this file)
```

The package will be built with tsup like the other libraries.

## 2. Shared Types

New interfaces will live in `packages/types/src/deployment.ts` and will be barrel‑exported from `packages/types/src/index.ts`.
Key types:

- `Platform` – union of supported platform identifiers (`"railway" | "vercel" | "fly" | "aws" | "gcp"`).
- `PlatformRecommendation` – result of platform detection (recommended, alternatives, reasons, estimatedCost).
- `DeploymentPlan` – normalized representation of tasks the engine will execute.
- `DeployOptions` – optional overrides for the deploy command (platform, dryRun, verbose, region).
- `DeploymentResult` – final result including platform, success flag, url, services, errors and cost.
- `RollbackOptions` – options for the rollback command (to snapshot, dryRun).
- `Snapshot` – representation of a saved deployment state for rollbacks.
- `CostEstimate` – projected monthly cost returned before deployment.
- `HealthStatus` – result of post-deploy health checks.

These types will be used by CLI commands, recipes and analytics modules.

## 3. Integration Points

### CLI
- Add a new `deploy` command in `packages/cli/src/commands` that loads `@farm/deployment`.
- Command delegates to `DeployEngine.deploy()` and streams status events using the existing logger utilities.
- Use the **DeploymentProgress** UI from `@farm/deployment/src/ui` to render a live progress bar and step list.
- Support a `--profile` flag to load environment-specific overrides from `deploy.<name>.yml`.
- Provide subcommands for `status`, `logs`, `rollback` and `cost` as described in the design plan.
- When run without options, launch an interactive **Deploy Wizard** to guide first-time users.

### Core & Observability
- Reuse `@farm/core` for configuration loading (`FarmConfig`) and watcher utilities.
- Integrate with `@farm/observability` for real‑time status and cost reporting. The `DeployEngine` will emit telemetry events using `FarmAutoInstrumentor` when available.

### Templates
- Update template README files to mention `farm deploy` as the default deployment workflow.
- Provide sample config in generated projects (`farm.config.ts`) using the `DeploymentConfig` type.

## 4. Platform Recipes

Recipes encapsulate the steps required to deploy to a specific provider. Each recipe implements a common interface:

```ts
export interface DeployRecipe {
  name: Platform;
  detect?(config: FarmConfig): Promise<boolean>;
  generatePlan(config: FarmConfig): Promise<DeploymentPlan>;
  execute(plan: DeploymentPlan, ctx: DeployContext): Promise<DeploymentResult>;
  rollback?(result: DeploymentResult): Promise<void>;
}
```

Recipes live under `src/recipes/<platform>/` and are registered via a simple registry. The engine selects the recipe returned by the PlatformDetector or explicitly specified in options.

Initial recipes: **Railway** (default), **Fly.io** (GPU support), **Vercel** (edge functions), with stubs for **AWS** and **GCP**.

## 5. PlatformDetector

Implementation in `src/detector/platform-detector.ts` closely follows the code in `designplan.md` but adapted to existing config types. The detector analyses `farm.config.ts`, git history, and project metadata from `packages/core`. It returns a `PlatformRecommendation` object used by the CLI to inform the user before deployment.

## 6. DeployEngine

Central orchestrator located in `src/engine/deploy-engine.ts`.
Responsibilities:
- Resolve platform via `PlatformDetector` or CLI option.
- Load the chosen recipe and call `generatePlan`.
- Stream progress events via `EventEmitter` so the CLI and observability system can react.
- Execute each step, run preflight checks and collect metrics.
- Render progress using `DeploymentProgress`.
- Handle errors via `DeployErrorHandler` for helpful diagnostics.
- Delegate rollback logic to `RollbackManager` when failures occur.

## 7. Cost Estimation & Health Monitoring

Use helper classes under `src/cost` and `src/health` to estimate monthly cost before deployment and to poll deployment status after launch. These modules will reuse types already defined in `@farm/observability` (`CostPrediction`, `AIMetrics`).
Results from health checks are summarised as `HealthStatus` and surfaced in the CLI. The health monitor can trigger an automatic rollback through `RollbackManager` if checks fail. The cost estimator exposes a `cost estimate` command for quick budgeting and includes cross‑platform comparisons with optimisation suggestions.

## 8. Rollback Manager

Located at `src/rollback/manager.ts`. Provides a simple interface to revert deployments when supported by the platform. Snapshots capture containers, database dumps, environment variables and AI models so a failed rollout can be cleanly restored. The manager works with the recipe system to determine available rollback strategies (previous image, last successful deployment, etc.).

## 9. Analytics

A small analytics module `src/analytics/deployment-analytics.ts` records deployment metrics using the observability provider. It listens to `DeployEngine` events and sends data after each deployment.
On success, a summary is printed highlighting cost, duration and next steps.

## 10. Future Enhancements
- Dashboard integration for viewing deployment history.
- Plugin hooks allowing templates or packages to extend the deployment workflow.
- Preview environment support for pull requests.

## 11. Quick Wins

Small improvements that can be tackled alongside the main implementation:

- **Dry-run mode** for `deploy` and `rollback` commands to print the plan without making changes.
- **Config overrides** via `deploy.prod.yml` so environments can tweak container options.
- **Docker layer caching** during image builds to speed up successive deploys.
- **Environment validation** step that warns about missing secrets before pushing.
- `.farmignore` support to exclude files from packaging.
- Cache platform detection results to speed up repeated runs.
- Parallelize container builds where possible.

