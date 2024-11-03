import { parseArgs } from "node:util";
import { LoggerService } from "../src/services/logger.service.js";
import { commitMessageTest } from "./test/commit-message.test.js";
import { securityTest } from "./test/security.test.js";
import { aiSuggestionsTest } from "./test/ai-suggestions.test.js";
import { largeCommitsTest } from "./test/large-commits.test.js";
import { E2ETest, TestSuites, TestSuiteKey } from "./tests.types.js";
import { createInterface } from "readline";

const TEST_MAP = new Map<TestSuiteKey, E2ETest>([
  [TestSuites.COMMIT_MESSAGE, commitMessageTest],
  [TestSuites.SECURITY, securityTest],
  [TestSuites.AI_SUGGESTIONS, aiSuggestionsTest],
  [TestSuites.LARGE_COMMITS, largeCommitsTest],
]);

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
    const selectedKeys = args.tests.split(",").map((key) => key.trim());
    return selectedKeys
      .map((key) => TEST_MAP.get(key as TestSuiteKey))
      .filter((test): test is E2ETest => test !== undefined);
  }

  if (args.all) {
    return Array.from(TEST_MAP.values());
  }

  logger.info("\n📋 Available Test Suites:");
  Array.from(TEST_MAP.entries()).forEach(([key, test]) => {
    logger.info(`${key}: ${test.name}`);
  });

  const answer = await promptUser(
    "\nEnter test suite keys to run (comma-separated) or 'all': ",
  );

  if (answer.toLowerCase() === "all") {
    return Array.from(TEST_MAP.values());
  }

  const selectedKeys = answer.split(",").map((key) => key.trim());
  return selectedKeys
    .map((key) => TEST_MAP.get(key as TestSuiteKey))
    .filter((test): test is E2ETest => test !== undefined);
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
