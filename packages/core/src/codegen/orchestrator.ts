import { TypeSyncOrchestrator } from "@farm/type-sync";
import type { SyncOptions, SyncResult } from "@farm/type-sync";

/** Wrapper orchestrator that hooks framework specifics into type-sync. */
export interface CodegenOptions extends SyncOptions {}

export class CodegenOrchestrator {
  private typeSync = new TypeSyncOrchestrator();

  async initialize(config: CodegenOptions) {
    await this.typeSync.initialize(config);
  }

  async run(): Promise<SyncResult> {
    return this.typeSync.syncOnce();
  }
}
