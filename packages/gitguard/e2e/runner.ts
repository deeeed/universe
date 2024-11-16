import chalk from "chalk";
import { LoggerService } from "../src/services/logger.service.js";
import {
  PromptActionChoice,
  promptInquirerChoice,
  promptUser,
} from "../src/utils/user-prompt.util.js";
import { aiSuggestionsTest } from "./test/ai-suggestions.test.js";
import { branchFeaturesTest } from "./test/branch-features.test.js";
import { commitMessageTest } from "./test/commit-message.test.js";
import { initTest } from "./test/init.test.js";
import { largeCommitsTest } from "./test/large-commits.test.js";
import { securityTest } from "./test/security.test.js";
import { statusTest } from "./test/status.test.js";
import { templateTest } from "./test/template.test.js";
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
  [TestSuites.TEMPLATE, templateTest],
]);

export async function promptForTestSuite(
  logger: LoggerService,
): Promise<E2ETest | "exit"> {
  const testEntries = Array.from(TEST_MAP.entries());

  const choices: PromptActionChoice<E2ETest | "exit">[] = [
    ...testEntries.map(([key, test]) => ({
      label: `${test.name} ${chalk.gray(`(${key})`)}`,
      value: test,
      disabled: false,
    })),
    {
      label: chalk.red("Exit"),
      value: "exit",
      disabled: false,
    },
  ];

  const selectedTest = await promptInquirerChoice<E2ETest | "exit">({
    message: "Select a test suite to run:",
    choices,
    logger,
  });

  return selectedTest.action;
}

export async function promptForScenario(
  test: E2ETest,
  logger: LoggerService,
): Promise<TestScenario | "back"> {
  const choices: PromptActionChoice<TestScenario | "back">[] = [
    ...test.scenarios.map((scenario) => ({
      label: scenario.name,
      value: scenario,
      disabled: false,
    })),
    {
      label: chalk.yellow("← Back to Test Suites"),
      value: "back",
      disabled: false,
    },
  ];

  const result = await promptInquirerChoice<TestScenario | "back">({
    message: "Select a scenario to run:",
    choices,
    logger,
  });

  return result.action;
}

export function displayTestResult(
  result: TestResult,
  logger: LoggerService,
): void {
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

  logger.info(chalk.green("Welcome to GitGuard E2E Tests!"));

  try {
    const running = true;
    while (running) {
      process.stdout.write("\x1Bc"); // Clear screen

      const selectedTest = await promptForTestSuite(logger);

      if (selectedTest === "exit") {
        logger.info(chalk.yellow("\nExiting test runner..."));
        break;
      }

      let selectingScenarios = true;
      while (selectingScenarios) {
        process.stdout.write("\x1Bc");

        const scenario = await promptForScenario(selectedTest, logger);
        if (scenario === "back") {
          break;
        }

        // Clear screen before running test
        process.stdout.write("\x1Bc");
        logger.info(
          chalk.cyan(`\n🧪 Running: ${selectedTest.name} - ${scenario.name}\n`),
        );

        const results = await selectedTest.run(logger, [scenario]);
        results.forEach((result) => displayTestResult(result, logger));

        logger.info(
          `\n📊 Result: ${results[0].success ? chalk.green("✅ Passed") : chalk.red("❌ Failed")}`,
        );

        const shouldContinue = await promptUser({
          type: "yesno",
          message: "\nRun another scenario?",
          logger,
          defaultYes: true,
        });

        if (!shouldContinue) {
          selectingScenarios = false;
        }
      }
    }
  } catch (error) {
    logger.error("Test suite failed:", error);
    process.exit(1);
  }
}
