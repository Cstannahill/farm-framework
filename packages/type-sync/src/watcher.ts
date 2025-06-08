// packages/type-sync/src/watcher.ts
import chokidar from "chokidar";
import fs from "fs-extra";
import { debounce } from "lodash";
import { TypeSyncOrchestrator } from "./orchestrator";

export class TypeSyncWatcher {
  private watcher: chokidar.FSWatcher | null = null;
  private syncInProgress = false;

  constructor(private orchestrator: TypeSyncOrchestrator) {
    // Debounce is now applied directly to the event handler registration, not to the method itself.
  }

  async start() {
    this.watcher = chokidar.watch(
      [
        "apps/api/src/models/**/*.py",
        "apps/api/src/routes/**/*.py",
        "apps/api/src/schemas/**/*.py",
        "apps/api/src/ai/models/**/*.py",
      ],
      {
        ignored: ["**/__pycache__/**", "**/*.pyc"],
        ignoreInitial: true,
      }
    );
    this.watcher.on(
      "all",
      debounce(() => this.handleChange(), 500)
    );
    console.log("👀 Watching for Python model changes...");
  }

  async stop() {
    await this.watcher?.close();
  }

  private handleChange = async () => {
    if (this.syncInProgress) return;
    console.log("🔄 Detected change, regenerating types...");
    try {
      this.syncInProgress = true;
      const start = Date.now();
      const result = await this.orchestrator.syncOnce();
      const duration = Date.now() - start;
      console.log(
        `✅ Types regenerated in ${duration}ms (${result.filesGenerated} files)`
      );
      await this.notifyFrontend();
    } catch (err) {
      console.error("❌ Type regeneration failed:", err);
    } finally {
      this.syncInProgress = false;
    }
  };

  private async notifyFrontend() {
    const triggerPath = ".farm/types/generated/.timestamp";
    await fs.ensureFile(triggerPath);
    await fs.writeFile(triggerPath, Date.now().toString());
  }
}
