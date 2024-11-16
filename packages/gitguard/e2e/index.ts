import { runTests } from "./runner.js";

// Register unhandled rejection handler first
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});

void (async (): Promise<void> => {
  try {
    await runTests();
  } catch (error) {
    console.error("Failed to run tests:", error);
    process.exit(1);
  }
})();
