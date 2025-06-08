import { describe, it, expect } from 'vitest';
import { createAddUICommand } from '../commands/add-ui.js';
import { Command } from 'commander';

describe('add ui assistant command', () => {
  it('registers subcommand', () => {
    const program = new Command();
    program.addCommand(createAddUICommand());
    const add = program.commands.find(c => c.name() === 'add');
    expect(add).toBeDefined();
    const ui = add?.commands.find(c => c.name() === 'ui');
    expect(ui).toBeDefined();
    const assistant = ui?.commands.find(c => c.name() === 'assistant');
    expect(assistant).toBeDefined();
  });
});
