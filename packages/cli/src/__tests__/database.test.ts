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
    const sw = db?.commands.find(c => c.name() === 'switch');
    expect(sw).toBeDefined();
    const info = db?.commands.find(c => c.name() === 'info');
    expect(info).toBeDefined();
    const migrate = db?.commands.find(c => c.name() === 'migrate');
    expect(migrate).toBeDefined();
  });
});
