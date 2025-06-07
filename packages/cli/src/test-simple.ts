#!/usr/bin/env node

import { Command } from "commander";

const program = new Command();

program
  .name("farm")
  .description("AI-first full-stack development framework")
  .version("1.0.0");

program
  .command("test")
  .description("Test command")
  .action(() => {
    console.log("Test command works!");
  });

program.parse();
