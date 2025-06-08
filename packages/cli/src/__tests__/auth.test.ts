import { describe, it, expect } from 'vitest';
import { Command } from 'commander';
import { createAuthCommands } from '../commands/auth.js';

describe('auth command', () => {
  it('registers subcommands', () => {
    const program = new Command();
    program.addCommand(createAuthCommands());
    const auth = program.commands.find(c => c.name() === 'auth');
    expect(auth).toBeDefined();
    const scaffold = auth?.commands.find(c => c.name() === 'scaffold');
    expect(scaffold).toBeDefined();
    const roles = auth?.commands.find(c => c.name() === 'roles');
    expect(roles).toBeDefined();
    const tokens = auth?.commands.find(c => c.name() === 'tokens');
    expect(tokens).toBeDefined();
    const devLogin = auth?.commands.find(c => c.name() === 'dev:login');
    expect(devLogin).toBeDefined();
  });
});
