// packages/type-sync/src/watcher.ts
import chokidar from "chokidar";
import fs from "fs-extra";
import { debounce } from "lodash";
/**
 * Watches Python source files for changes and triggers TypeScript type
 * regeneration when modifications are detected.
 */
export class TypeSyncWatcher {
    orchestrator;
    watcher = null;
    syncInProgress = false;
    constructor(orchestrator) {
        this.orchestrator = orchestrator;
        // Debounce is now applied directly to the event handler registration, not to the method itself.
    }
    /**
     * Begin watching the configured file globs and respond to changes.
     */
    async start() {
        this.watcher = chokidar.watch([
            "apps/api/src/models/**/*.py",
            "apps/api/src/routes/**/*.py",
            "apps/api/src/schemas/**/*.py",
            "apps/api/src/ai/models/**/*.py",
        ], {
            ignored: ["**/__pycache__/**", "**/*.pyc"],
            ignoreInitial: true,
        });
        this.watcher.on("all", debounce(() => this.handleChange(), 500));
        console.log("👀 Watching for Python model changes...");
    }
    /**
     * Stop watching for file changes.
     */
    async stop() {
        await this.watcher?.close();
    }
    handleChange = async () => {
        if (this.syncInProgress)
            return;
        console.log("🔄 Detected change, regenerating types...");
        try {
            this.syncInProgress = true;
            const start = Date.now();
            const result = await this.orchestrator.syncOnce();
            const duration = Date.now() - start;
            console.log(`✅ Types regenerated in ${duration}ms (${result.filesGenerated} files)`);
            await this.notifyFrontend();
        }
        catch (err) {
            console.error("❌ Type regeneration failed:", err);
        }
        finally {
            this.syncInProgress = false;
        }
    };
    /**
     * Touch a file within the generated types directory so that the frontend
     * development server can react to new types.
     */
    async notifyFrontend() {
        const triggerPath = ".farm/types/generated/.timestamp";
        await fs.ensureFile(triggerPath);
        await fs.writeFile(triggerPath, Date.now().toString());
    }
}
//# sourceMappingURL=watcher.js.map