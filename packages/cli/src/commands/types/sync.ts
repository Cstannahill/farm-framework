// packages/cli/src/commands/types/sync.ts
import { Command } from "commander";
import chalk from "chalk";
import { TypeSyncOrchestrator, SyncOptions, TypeSyncWatcher } from "@farm/core";

export function createTypeSyncCommand(): Command {
  const cmd = new Command("types:sync");
  cmd
    .description("Synchronize TypeScript types from FastAPI models")
    .option("-w, --watch", "Watch for changes and auto-regenerate")
    .option("--no-client", "Skip API client generation")
    .option("--no-hooks", "Skip React hooks generation")
    .option(
      "--output <path>",
      "Custom output directory",
      ".farm/types/generated"
    )
    .action(async (opts) => {
      const orchestrator = new TypeSyncOrchestrator();
      const options: SyncOptions = {
        apiUrl: "http://localhost:8000",
        outputDir: opts.output,
        features: {
          client: opts.client !== false,
          hooks: opts.hooks !== false,
          streaming: true,
        },
      };
      await orchestrator.initialize(options);
      if (opts.watch) {
        console.log(chalk.blue("🔄 Starting type sync in watch mode..."));
        const watcher = new TypeSyncWatcher(orchestrator);
        await watcher.start();
      } else {
        console.log(chalk.blue("🔄 Generating types..."));
        const result = await orchestrator.syncOnce();
        console.log(chalk.green(`✅ Generated ${result.filesGenerated} files`));
      }
    });
  return cmd;
}
