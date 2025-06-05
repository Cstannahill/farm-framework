export * from "./commands";
export * from "./utils/logger";
export * from "./utils/error-utils";
export * from "./utils/paths";
export * from "./utils/validation";
import { createCLI } from "./cli.js";
import { getErrorMessage } from "./utils/error-utils";

async function main() {
  const program = createCLI();

  try {
    await program.parseAsync(process.argv);
  } catch (error) {
    console.error(`\n❌ Error: ${getErrorMessage(error)}`);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Unexpected error:", getErrorMessage(error));
  process.exit(1);
});
