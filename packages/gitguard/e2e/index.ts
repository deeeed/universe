import { Command } from "commander";
import { runTests } from "./runner.js";

// Register unhandled rejection handler first
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});

void (async (): Promise<void> => {
  try {
    const program = new Command();

    program
      .option("--tests <suite>", "Test suite to run")
      .option("--scenario <name>", "Specific scenario to run")
      .option("--interactive", "Run in interactive mode")
      .option("--debug", "Run in debug mode");

    program.parse();

    const options = program.opts();

    await runTests({ options });
  } catch (error) {
    console.error("Failed to run tests:", error);
    process.exit(1);
  }
})();
