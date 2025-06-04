#!/usr/bin/env node

const { execSync } = require("child_process");
const packageJson = require("../package.json");

console.log("🔍 Checking engine requirements...");

// Check Node.js version
const nodeVersion = process.version;
const requiredNode = packageJson.engines.node;
console.log(`Node.js: ${nodeVersion} (required: ${requiredNode})`);

// Check pnpm version
try {
  const pnpmVersion = execSync("pnpm --version", { encoding: "utf8" }).trim();
  const requiredPnpm = packageJson.engines.pnpm;
  console.log(`pnpm: v${pnpmVersion} (required: ${requiredPnpm})`);
} catch (error) {
  console.error("❌ pnpm not found. Please install pnpm: npm install -g pnpm");
  process.exit(1);
}

console.log("✅ All engine requirements satisfied");
