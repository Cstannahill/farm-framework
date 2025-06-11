// packages/cli/src/commands/types/sync.ts
import { Command } from "commander";
import chalk from "chalk";
import {
  TypeSyncOrchestrator,
  SyncOptions,
  TypeSyncWatcher,
} from "@farm-framework/core";
import {
  CodegenOrchestrator,
  type CodegenOptions,
  type ProgressInfo,
} from "@farm-framework/core";
import { performance } from "perf_hooks";

export function createTypeSyncCommand(): Command {
  const cmd = new Command("types:sync");
  cmd
    .description("Synchronize TypeScript types from FastAPI models")
    .option("-w, --watch", "Watch for changes and auto-regenerate")
    .option("--no-client", "Skip API client generation")
    .option("--no-hooks", "Skip React hooks generation")
    .option("--no-ai-hooks", "Skip AI-specific hooks generation")
    .option("--dry-run", "Show what would be generated without creating files")
    .option("-v, --verbose", "Enable verbose output with performance metrics")
    .option("--profile", "Enable detailed performance profiling")
    .option(
      "--max-concurrency <num>",
      "Maximum parallel generators (default: 4)",
      "4"
    )
    .option(
      "--cache-timeout <ms>",
      "Cache timeout in milliseconds (default: 300000)",
      "300000"
    )
    .option(
      "--output <path>",
      "Custom output directory",
      ".farm/types/generated"
    )
    .option("--api-url <url>", "FastAPI server URL", "http://localhost:8000")
    .action(async (opts) => {
      const startTime = performance.now();
      let currentStage = "";

      try {
        // Initialize orchestrator with progress tracking
        const orchestrator = new CodegenOrchestrator();

        // Configure options
        const options: SyncOptions = {
          apiUrl: opts.apiUrl,
          outputDir: opts.output,
          features: {
            client: opts.client !== false,
            hooks: opts.hooks !== false,
            streaming: true,
            aiHooks: opts.aiHooks !== false,
          },
          performance: {
            enableMonitoring: opts.verbose || opts.profile,
            enableIncrementalGeneration: true,
            maxConcurrency: parseInt(opts.maxConcurrency),
            cacheTimeout: parseInt(opts.cacheTimeout),
          },
        };

        // Setup progress reporting
        const progressCallback = (progress: ProgressInfo) => {
          currentStage = progress.stage;
          if (opts.verbose) {
            console.log(
              chalk.blue(
                `[${progress.stage.toUpperCase()}] ${progress.message} (${progress.progress}%)`
              )
            );
            if (progress.details && opts.profile) {
              console.log(
                chalk.gray(
                  `  Details: ${JSON.stringify(progress.details, null, 2)}`
                )
              );
            }
          } else {
            // Simple progress without spinner dependency
            if (progress.progress === 0 || progress.progress === 100) {
              console.log(chalk.blue(`${progress.message}`));
            }
          }
        };

        await orchestrator.initialize({
          ...options,
          verbose: opts.verbose,
          dryRun: opts.dryRun,
          profile: opts.profile,
          progressCallback,
        } as CodegenOptions);

        if (opts.watch) {
          console.log(chalk.blue("🔄 Starting type sync in watch mode..."));
          console.log(chalk.gray(`   API URL: ${options.apiUrl}`));
          console.log(chalk.gray(`   Output: ${options.outputDir}`));
          console.log(
            chalk.gray(
              `   Features: ${Object.entries(options.features)
                .filter(([, enabled]) => enabled)
                .map(([name]) => name)
                .join(", ")}`
            )
          );
          console.log(chalk.gray("   Press Ctrl+C to stop\n"));

          await orchestrator.run({ watch: true });
        } else {
          if (!opts.verbose) {
            console.log(chalk.blue("🔄 Generating types..."));
          }

          const result = await orchestrator.run({ dryRun: opts.dryRun });

          // Success output
          const totalTime = performance.now() - startTime;
          const timeStr =
            totalTime > 1000
              ? `${(totalTime / 1000).toFixed(2)}s`
              : `${Math.round(totalTime)}ms`;

          if (opts.dryRun) {
            console.log(chalk.yellow(`🔍 Dry run completed in ${timeStr}`));
            console.log(
              chalk.gray(`   Would generate ${result.filesGenerated} files`)
            );
          } else {
            console.log(
              chalk.green(
                `✅ Generated ${result.filesGenerated} files in ${timeStr}`
              )
            );

            if (result.fromCache) {
              console.log(chalk.gray(`   (loaded from cache)`));
            }
          }

          // Show artifacts if verbose
          if (opts.verbose && result.artifacts) {
            console.log(chalk.blue("\n📁 Generated files:"));
            for (const artifact of result.artifacts) {
              console.log(chalk.gray(`   ${artifact}`));
            }
          }

          // Show performance details if profiling
          if (opts.profile && result.performance) {
            console.log(chalk.blue("\n📊 Performance Profile:"));
            console.log(
              chalk.gray(
                `   Extraction: ${Math.round(result.performance.extractionTime)}ms`
              )
            );
            console.log(
              chalk.gray(
                `   Generation: ${Math.round(result.performance.generationTime)}ms`
              )
            );
            console.log(
              chalk.gray(
                `   Caching: ${Math.round(result.performance.cacheTime)}ms`
              )
            );
            console.log(
              chalk.gray(`   Parallel jobs: ${result.performance.parallelJobs}`)
            );

            if (result.generationDetails) {
              console.log(chalk.blue("\n🔧 Generator Details:"));
              for (const detail of result.generationDetails) {
                console.log(
                  chalk.gray(
                    `   ${detail.generator}: ${Math.round(detail.time)}ms (${detail.size} bytes)`
                  )
                );
              }
            }
          }

          // Show cache hit ratio if available
          const metrics = orchestrator.getMetrics?.();
          if (metrics && opts.verbose) {
            console.log(chalk.blue("\n📈 Cache Statistics:"));
            console.log(
              chalk.gray(`   Total files processed: ${metrics.totalFiles}`)
            );
            console.log(
              chalk.gray(
                `   Generated: ${metrics.generatedFiles}, Cached: ${metrics.cachedFiles}`
              )
            );
          }
        }
      } catch (error) {
        console.error(chalk.red("❌ Type synchronization failed:"));

        if (opts.verbose) {
          console.error(
            chalk.red(error instanceof Error ? error.stack : String(error))
          );
        } else {
          console.error(
            chalk.red(error instanceof Error ? error.message : String(error))
          );
          console.log(
            chalk.gray("   Use --verbose for detailed error information")
          );
        }

        // Suggest common fixes
        console.log(chalk.yellow("\n💡 Common solutions:"));
        console.log(
          chalk.gray(
            "   • Ensure FastAPI server is running on the specified URL"
          )
        );
        console.log(
          chalk.gray("   • Check that the API endpoints are accessible")
        );
        console.log(chalk.gray("   • Verify output directory permissions"));
        console.log(
          chalk.gray("   • Try clearing the cache: rm -rf .farm/cache")
        );

        process.exit(1);
      }
    });

  return cmd;
}
