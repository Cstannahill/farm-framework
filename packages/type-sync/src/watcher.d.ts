import { TypeSyncOrchestrator } from "./orchestrator";
/**
 * Watches Python source files for changes and triggers TypeScript type
 * regeneration when modifications are detected.
 */
export declare class TypeSyncWatcher {
    private orchestrator;
    private watcher;
    private syncInProgress;
    constructor(orchestrator: TypeSyncOrchestrator);
    /**
     * Begin watching the configured file globs and respond to changes.
     */
    start(): Promise<void>;
    /**
     * Stop watching for file changes.
     */
    stop(): Promise<void>;
    private handleChange;
    /**
     * Touch a file within the generated types directory so that the frontend
     * development server can react to new types.
     */
    private notifyFrontend;
}
//# sourceMappingURL=watcher.d.ts.map