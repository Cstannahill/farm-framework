// packages/core/src/codegen/type-sync/watcher.ts
import chokidar from 'chokidar';
import fs from 'fs-extra';
import { debounce } from 'lodash-es';
import { TypeSyncOrchestrator } from './orchestrator';

export class TypeSyncWatcher {
  private watcher: chokidar.FSWatcher | null = null;
  private syncInProgress = false;

  constructor(private orchestrator: TypeSyncOrchestrator) {
    this.handleChange = debounce(this.handleChange.bind(this), 500);
  }

  async start() {
    this.watcher = chokidar.watch([
      'apps/api/src/models/**/*.py',
      'apps/api/src/routes/**/*.py',
      'apps/api/src/schemas/**/*.py',
      'apps/api/src/ai/models/**/*.py',
    ], {
      ignored: ['**/__pycache__/**', '**/*.pyc'],
      ignoreInitial: true,
    });
    this.watcher.on('all', this.handleChange);
    console.log('👀 Watching for Python model changes...');
  }

  async stop() {
    await this.watcher?.close();
  }

  private async handleChange() {
    if (this.syncInProgress) return;
    console.log('🔄 Detected change, regenerating types...');
    try {
      this.syncInProgress = true;
      const start = Date.now();
      const result = await this.orchestrator.syncOnce();
      const duration = Date.now() - start;
      console.log(`✅ Types regenerated in ${duration}ms (${result.filesGenerated} files)`);
      await this.notifyFrontend();
    } catch (err) {
      console.error('❌ Type regeneration failed:', err);
    } finally {
      this.syncInProgress = false;
    }
  }

  private async notifyFrontend() {
    const triggerPath = '.farm/types/generated/.timestamp';
    await fs.ensureFile(triggerPath);
    await fs.writeFile(triggerPath, Date.now().toString());
  }
}
