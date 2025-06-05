#!/usr/bin/env node

import { Command } from "commander";

console.log("Starting CLI...");

try {
  const program = new Command();

  console.log("Created Command instance");

  program
    .name("farm")
    .description("Test CLI")
    .version("1.0.0")
    .helpOption("-h, --help", "Display help");

  console.log("Configured program");

  program.parse(process.argv);

  console.log("Parsed argv");
} catch (error) {
  console.error("Error:", error);
  process.exit(1);
}
