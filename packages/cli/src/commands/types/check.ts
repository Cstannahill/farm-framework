// packages/cli/src/commands/types/check.ts
import { Command } from 'commander';
import chalk from 'chalk';
import { TypeSyncOrchestrator, TypeDiffer } from '@farm/core/codegen/type-sync';
import fs from 'fs-extra';

export function createTypeCheckCommand(): Command {
  const cmd = new Command('types:check');
  cmd
    .description('Validate committed type definitions are up to date')
    .action(async () => {
      console.log(chalk.blue('🔍 Checking type synchronization...'));
      const tempDir = '.farm/temp/type-check';
      const orchestrator = new TypeSyncOrchestrator();
      await orchestrator.initialize({
        apiUrl: 'http://localhost:8000',
        outputDir: tempDir,
        features: { client: true, hooks: true, streaming: true },
      });
      await orchestrator.syncOnce();
      const differ = new TypeDiffer();
      const diffs = await differ.compareDirectories('.farm/types/generated', tempDir);
      await fs.remove(tempDir);
      if (diffs.length > 0) {
        console.error(chalk.red('❌ Type definitions are out of sync!'));
        diffs.forEach(d => console.error(`  - ${d.file}: ${d.message}`));
        process.exit(1);
      }
      console.log(chalk.green('✅ Type definitions are in sync'));
    });
  return cmd;
}
