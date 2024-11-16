import { runTests } from "./runner.js";

// Register unhandled rejection handler first
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});

void (async (): Promise<void> => {
  try {
    // Get all command line arguments after the script name
    const args = process.argv.slice(2);

    const options: Record<string, string> = {};

    // Parse command line arguments
    args.forEach((arg) => {
      if (arg.startsWith("--")) {
        const [key, value] = arg.slice(2).split("=");
        if (value !== undefined) {
          options[key] = value;
        } else {
          options[key] = "true";
        }
      }
    });

    await runTests(options);
  } catch (error) {
    console.error("Failed to run tests:", error);
    process.exit(1);
  }
})();
