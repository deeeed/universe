import chalk from "chalk";
import { parseArgs } from "node:util";
import { createInterface } from "readline";
import { LoggerService } from "../src/services/logger.service.js";
import { aiSuggestionsTest } from "./test/ai-suggestions.test.js";
import { commitMessageTest } from "./test/commit-message.test.js";
import { largeCommitsTest } from "./test/large-commits.test.js";
import { securityTest } from "./test/security.test.js";
import { branchFeaturesTest } from "./test/branch-features.test.js";
import { initTest } from "./test/init.test.js";
import { statusTest } from "./test/status.test.js";
import {
  E2ETest,
  TestResult,
  TestScenario,
  TestSuiteKey,
  TestSuites,
} from "./tests.types.js";

const TEST_MAP = new Map<TestSuiteKey, E2ETest>([
  [TestSuites.COMMIT_MESSAGE, commitMessageTest],
  [TestSuites.SECURITY, securityTest],
  [TestSuites.AI_SUGGESTIONS, aiSuggestionsTest],
  [TestSuites.LARGE_COMMITS, largeCommitsTest],
  [TestSuites.BRANCH_FEATURES, branchFeaturesTest],
  [TestSuites.INIT, initTest],
  [TestSuites.STATUS, statusTest],
]);

interface ParsedArgs {
  tests?: string;
  all?: boolean;
  interactive?: boolean;
  scenario?: string;
  debug?: boolean;
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

async function promptForTestSuite(logger: LoggerService): Promise<E2ETest> {
  const testEntries = Array.from(TEST_MAP.entries());

  logger.info("\n📋 Available Test Suites:");
  testEntries.forEach(([key, test], index) => {
    logger.info(
      `${chalk.cyan(`${index + 1}`)}. ${chalk.bold(test.name)} ${chalk.gray(`(${key})`)}`,
    );
  });

  const answer = await promptUser(
    `\nEnter number to select test suite ${chalk.cyan(`(1-${testEntries.length})`)}: `,
  );
  const testIndex = parseInt(answer) - 1;

  if (isNaN(testIndex) || testIndex < 0 || testIndex >= testEntries.length) {
    throw new Error(
      `Invalid selection. Please enter a number between ${chalk.cyan("1")} and ${chalk.cyan(testEntries.length)}`,
    );
  }

  const selectedTest = testEntries[testIndex][1];
  if (!selectedTest) {
    throw new Error("Invalid test suite selection");
  }

  return selectedTest;
}

async function promptForScenario(
  test: E2ETest,
  logger: LoggerService,
): Promise<TestScenario> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  logger.info("\n📋 Available Scenarios:");
  test.scenarios.forEach((scenario, index) => {
    logger.info(`${chalk.cyan(`${index + 1}`)}. ${chalk.bold(scenario.name)}`);
  });

  const answer = await new Promise<string>((resolve) => {
    rl.question(
      `\nEnter number to select scenario ${chalk.cyan(`(1-${test.scenarios.length})`)}: `,
      (answer: string) => {
        rl.close();
        resolve(answer.trim());
      },
    );
  });

  const scenarioIndex = parseInt(answer) - 1;
  if (
    isNaN(scenarioIndex) ||
    scenarioIndex < 0 ||
    scenarioIndex >= test.scenarios.length
  ) {
    throw new Error(
      `Invalid selection. Please enter a number between ${chalk.cyan("1")} and ${chalk.cyan(test.scenarios.length)}`,
    );
  }

  return test.scenarios[scenarioIndex];
}

async function selectTests(logger: LoggerService): Promise<{
  tests: E2ETest[];
  interactive: boolean;
  scenarioId?: string;
}> {
  const { values } = parseArgs({
    options: {
      tests: { type: "string" },
      all: { type: "boolean" },
      interactive: { type: "boolean" },
      scenario: { type: "string" },
      debug: { type: "boolean" },
    },
  });

  const args = values as ParsedArgs;
  const scenarioId = args.scenario;

  // Return early if interactive mode is specified
  if (args.interactive) {
    const selectedTest = await promptForTestSuite(logger);
    return { tests: [selectedTest], interactive: true, scenarioId };
  }

  // Original logic for non-interactive mode
  if (args.tests) {
    const selectedKeys = args.tests.split(",").map((key) => key.trim());
    return {
      tests: selectedKeys
        .map((key) => TEST_MAP.get(key as TestSuiteKey))
        .filter((test): test is E2ETest => test !== undefined),
      interactive: false,
      scenarioId,
    };
  }

  if (args.all) {
    return {
      tests: Array.from(TEST_MAP.values()),
      interactive: false,
      scenarioId,
    };
  }

  const answer = await promptUser(
    "\nEnter test suite keys to run (comma-separated) or 'all': ",
  );

  if (answer.toLowerCase() === "all") {
    return {
      tests: Array.from(TEST_MAP.values()),
      interactive: false,
      scenarioId,
    };
  }

  const selectedKeys = answer.split(",").map((key) => key.trim());
  return {
    tests: selectedKeys
      .map((key) => TEST_MAP.get(key as TestSuiteKey))
      .filter((test): test is E2ETest => test !== undefined),
    interactive: false,
    scenarioId,
  };
}

function displayTestResult(result: TestResult, logger: LoggerService): void {
  logger.info("\n📊 Test Result:", result.message);

  if (!result.success || !result.details) {
    if (result.error) {
      logger.error("Error:", result.error);
    }
    return;
  }

  logger.info("\n📝 Command:", chalk.cyan(result.details.command));

  if (result.details.initialState) {
    logger.info("\n📁 Initial Repository State:");
    logger.info(
      "Git Status:",
      chalk.gray(result.details.initialState.status || "Clean"),
    );
    logger.info("Git History:", chalk.gray(result.details.initialState.log));
  }

  if (result.details.finalState) {
    logger.info("\n📁 Final Repository State:");
    logger.info(
      "Git Status:",
      chalk.gray(result.details.finalState.status || "Clean"),
    );
    logger.info("Git History:", chalk.gray(result.details.finalState.log));

    // Show file changes
    const changes = diffStates(
      result.details.initialState?.files ?? [],
      result.details.finalState.files,
    );
    if (changes.length) {
      logger.info("\n📄 File Changes:");
      changes.forEach((change) => {
        logger.info(`${chalk.cyan(change.path)}:`);
        logger.info(chalk.gray(change.diff));
      });
    }
  }
}

function diffStates(
  initial: Array<{ path: string; content: string }>,
  final: Array<{ path: string; content: string }>,
): Array<{ path: string; diff: string }> {
  const changes: Array<{ path: string; diff: string }> = [];

  // Use simple diff for now, could be enhanced with proper diff library
  final.forEach((file) => {
    const initialFile = initial.find((f) => f.path === file.path);
    if (!initialFile || initialFile.content !== file.content) {
      changes.push({
        path: file.path,
        diff: file.content, // Simple content display, could be enhanced with actual diff
      });
    }
  });

  return changes;
}

export async function runTests(): Promise<void> {
  const logger = new LoggerService({ debug: true });

  try {
    const {
      tests: selectedTests,
      interactive,
      scenarioId,
    } = await selectTests(logger);
    let totalSuccess = 0;
    let totalFailed = 0;

    for (const test of selectedTests) {
      logger.info(`\n🧪 Running test suite: ${test.name}`);

      let results: TestResult[];

      if (interactive) {
        const scenario = await promptForScenario(test, logger);
        results = await test.run(logger, [scenario]);
        displayTestResult(results[0], logger);
      } else if (scenarioId) {
        const scenario = test.scenarios.find((s) => s.id === scenarioId);
        if (!scenario) {
          throw new Error(`Invalid scenario ID: ${scenarioId}`);
        }
        results = await test.run(logger, [scenario]);
        displayTestResult(results[0], logger);
      } else {
        results = await test.run(logger);
        results.forEach((result) => displayTestResult(result, logger));
      }

      const success = results.filter((r) => r.success).length;
      const failed = results.length - success;

      totalSuccess += success;
      totalFailed += failed;

      if (interactive || scenarioId) {
        logger.info(
          `\n📊 Scenario Result: ${results[0].success ? "✅ Passed" : "❌ Failed"}`,
        );
      } else {
        logger.info(
          `\n📊 ${test.name} Results: ${success}/${results.length} passed`,
        );
      }
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
