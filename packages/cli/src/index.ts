import { createCLI, setupErrorHandling } from "./cli.js";

async function main() {
  setupErrorHandling();

  const program = createCLI();
  await program.parseAsync(process.argv);
}

main().catch((error) => {
  console.error("❌ CLI Error:", error.message || error);
  process.exit(1);
});
