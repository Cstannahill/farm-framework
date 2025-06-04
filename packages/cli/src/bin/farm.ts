import { FarmCLI } from "../core/cli.js";
import { handleError } from "../core/errors.js";

async function main() {
  try {
    const cli = new FarmCLI();
    await cli.run(process.argv);
  } catch (error) {
    handleError(error);
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled promise rejection:", reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("Uncaught exception:", error);
  process.exit(1);
});

main();
