# @farm/types

Collection of shared TypeScript interfaces used across the FARM
packages.  These describe configuration files, CLI options, AI
providers and database models.

## Structure

- **src/config.ts** – main `FarmConfig` definition including database
  and AI configuration sections.
- **src/ai.ts** – types for AI providers, chat messages and model
  information.
- **src/database.ts** – database schema helper interfaces.
- **src/cli.ts** – options objects for CLI commands.
- **src/templates.ts** – structures describing project templates.
- **src/build.ts** – build artefact and bundle analysis types.
- **src/errors.ts** – common error shapes used by tooling.
- **src/index.ts** – barrel file re-exporting the above modules.
