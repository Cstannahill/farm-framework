// packages/cli/src/cli.ts
import { Command } from 'commander';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { createCreateCommand } from './commands/create.js';
import { createDevCommand } from './commands/dev.js';
import { createBuildCommand } from './commands/build.js';
import { createGenerateCommand } from './commands/generate.js';
import { createValidateCommands } from './commands/validate';
import { registerTypeCommands } from './commands/types/index.js';
import { createAddUICommand } from './commands/add-ui.js';
import { createDatabaseCommands } from './commands/database.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageJson = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf-8'));

export function createCLI(): Command {
  const program = new Command();
  program
    .name('farm')
    .description('FARM Stack Framework - AI-first full-stack development')
    .version(packageJson.version)
    .helpOption('-h, --help', 'Display help for command')
    .addHelpCommand('help [command]', 'Display help for command');

  program
    .option('-v, --verbose', 'Enable verbose logging')
    .option('--no-color', 'Disable colored output')
    .option('--config <path>', 'Path to configuration file');

  program.addCommand(createCreateCommand());
  program.addCommand(createDevCommand());
  program.addCommand(createBuildCommand());
  program.addCommand(createGenerateCommand());
  program.addCommand(createAddUICommand());
  program.addCommand(createDatabaseCommands());
  program.addCommand(createValidateCommands());
  registerTypeCommands(program);

  program
    .command('version')
    .description('Show version information')
    .action(() => {
      console.log(`FARM CLI v${packageJson.version}`);
    });

  program.on('command:*', (operands) => {
    console.error(`\n❌ Unknown command: ${operands[0]}`);
    console.log('\nRun "farm --help" to see available commands.\n');
    process.exit(1);
  });

  return program;
}

export function setupErrorHandling() {
  process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
  });
  process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    process.exit(1);
  });
}
