#!/usr/bin/env node
/* eslint-disable no-console */
console.log("GitGuard CJS Wrapper Starting...");

interface MainModule {
  main: () => Promise<void>;
}

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { main } = require("./gitguard.cjs") as MainModule;

if (typeof main !== "function") {
  console.error("Failed to load main function");
  process.exit(1);
}

void main().catch((error: Error) => {
  console.error("Error:", error);
  process.exit(1);
});
