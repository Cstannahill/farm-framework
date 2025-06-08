// packages/cli/src/commands/types/index.ts
import { Command } from 'commander';
import { createTypeSyncCommand } from './sync';
import { createTypeCheckCommand } from './check';

export function registerTypeCommands(program: Command) {
  program.addCommand(createTypeSyncCommand());
  program.addCommand(createTypeCheckCommand());
}
