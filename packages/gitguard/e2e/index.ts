import { runTests } from "./runner.js";

void runTests().catch((error: Error) => {
  console.error("Fatal error in test suite:", error);
  process.exit(1);
});
