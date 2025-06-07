# @farm/cli

The command line interface for the FARM framework.  Commands are
implemented with [commander](https://github.com/tj/commander.js) and
provide project scaffolding and dev server control.

## Structure

- **src/index.ts** – main entry that defines the `farm` program and its
  `create`, `dev` and `build` commands.  Uses helpers in
  `src/utils/error-handling.ts` for consistent error reporting.
- **src/utils/error-handling.ts** – utilities for building `FarmError`
  objects and displaying helpful messages.
- **src/test-simple.ts** – small example binary used for smoke testing.
