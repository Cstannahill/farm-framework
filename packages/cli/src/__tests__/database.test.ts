import { describe, it, expect } from 'vitest';
import { createDatabaseCommands } from '../commands/database.js';
import { Command } from 'commander';

describe('database command', () => {
  it('registers add subcommand', () => {
    const program = new Command();
    program.addCommand(createDatabaseCommands());
    const db = program.commands.find(c => c.name() === 'database');
    expect(db).toBeDefined();
    const add = db?.commands.find(c => c.name() === 'add');
    expect(add).toBeDefined();
  });
});
