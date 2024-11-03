import { parseArgs } from "node:util";
import { LoggerService } from "../src/services/logger.service.js";
import { commitMessageTest } from "./test/commit-message.test.js";
import { securityTest } from "./test/security.test.js";
import { aiSuggestionsTest } from "./test/ai-suggestions.test.js";
import { largeCommitsTest } from "./test/large-commits.test.js";
import { E2ETest } from "./tests.types.js";
import { createInterface } from "readline";

const ALL_TESTS = [
  commitMessageTest,
  securityTest,
  aiSuggestionsTest,
  largeCommitsTest,
] satisfies E2ETest[];

interface ParsedArgs {
  tests?: string;
  all?: boolean;
  interactive?: boolean;
}

async function promptUser(question: string): Promise<string> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise<string>((resolve) => {
    rl.question(question, (answer: string) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function selectTests(logger: LoggerService): Promise<E2ETest[]> {
  const { values } = parseArgs({
    options: {
      tests: { type: "string" },
      all: { type: "boolean" },
    },
  });

  const args = values as ParsedArgs;

  if (args.tests) {
    const selectedIndices = args.tests
      .split(",")
      .map((n: string) => parseInt(n.trim(), 10) - 1)
      .filter((n: number) => n >= 0 && n < ALL_TESTS.length);
    return selectedIndices.map((i: number) => ALL_TESTS[i]);
  }

  if (args.all) {
    return ALL_TESTS;
  }

  logger.info("\n📋 Available Test Suites:");
  ALL_TESTS.forEach((test, index) => {
    logger.info(`${index + 1}. ${test.name}`);
  });

  const answer = await promptUser(
    "\nEnter test suite numbers to run (comma-separated) or 'all': ",
  );

  if (answer.toLowerCase() === "all") {
    return ALL_TESTS;
  }

  const selectedIndices = answer
    .split(",")
    .map((n: string) => parseInt(n.trim(), 10) - 1)
    .filter((n: number) => n >= 0 && n < ALL_TESTS.length);

  return selectedIndices.map((i: number) => ALL_TESTS[i]);
}

export async function runTests(): Promise<void> {
  const logger = new LoggerService({ debug: true });

  try {
    const selectedTests = await selectTests(logger);
    let totalSuccess = 0;
    let totalFailed = 0;

    for (const test of selectedTests) {
      logger.info(`\n🧪 Running test suite: ${test.name}`);
      const results = await test.run(logger);

      const success = results.filter((r) => r.success).length;
      const failed = results.length - success;

      totalSuccess += success;
      totalFailed += failed;

      logger.info(
        `\n📊 ${test.name} Results: ${success}/${results.length} passed`,
      );
    }

    logger.info(
      `\n📊 Final Results: ${totalSuccess}/${totalSuccess + totalFailed} total tests passed`,
    );

    if (totalFailed > 0) {
      process.exit(1);
    }
  } catch (error) {
    logger.error("Test suite failed:", error);
    process.exit(1);
  }
}
