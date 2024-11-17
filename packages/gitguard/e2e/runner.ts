import chalk from "chalk";
import { LoggerService } from "../src/services/logger.service.js";
import {
  PromptActionChoice,
  promptInquirerChoice,
  promptUser,
} from "../src/utils/user-prompt.util.js";
import { aiSuggestionsTest } from "./scenarios/ai-suggestions.e2e.test.js";
import { branchFeaturesTest } from "./scenarios/branch-features.e2e.test.js";
import { commitMessageTest } from "./scenarios/commit-message.e2e.test.js";
import { initTest } from "./scenarios/init.test.e2e.js";
import { largeCommitsTest } from "./scenarios/large-commits.e2e.test.js";
import { securityTest } from "./scenarios/security.e2e.test.js";
import { statusTest } from "./scenarios/status.e2e.test.js";
import { templateTest } from "./scenarios/template.e2e.test.js";
import { aiProvidersTest } from "./scenarios/ai-providers.e2e.test.js";
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
  [TestSuites.AI_PROVIDERS, aiProvidersTest],
]);

export async function promptForTestSuite(
  logger: LoggerService,
): Promise<E2ETest | "exit"> {
  const testEntries = Array.from(TEST_MAP.entries());

  const choices: PromptActionChoice<E2ETest | "exit">[] = [
    ...testEntries.map(([key, test], index) => ({
      label: `${index + 1}. ${test.name} ${chalk.gray(`(${key})`)}`,
      value: test,
      disabled: false,
    })),
    {
      label: `${testEntries.length + 1}. ${chalk.red("Exit")}`,
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
    ...test.scenarios.map((scenario, index) => ({
      label: `${index + 1}. ${scenario.name}`,
      value: scenario,
      disabled: false,
    })),
    {
      label: `${test.scenarios.length + 1}. ${chalk.yellow("← Back to Test Suites")}`,
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

interface RunOptions {
  [key: string]: string;
}

interface RunSpecificTestParams {
  options: RunOptions;
  logger: LoggerService;
}

interface RunTestScenariosParams {
  test: E2ETest;
  logger: LoggerService;
}

interface RunInteractiveModeParams {
  logger: LoggerService;
}

interface RunTestsParams {
  options?: RunOptions;
}

async function runInteractiveMode({
  logger,
}: RunInteractiveModeParams): Promise<void> {
  let isRunning = true;
  while (isRunning) {
    const selectedTest = await promptForTestSuite(logger);

    if (selectedTest === "exit") {
      logger.info(chalk.yellow("\nExiting test runner..."));
      isRunning = false;
      continue;
    }

    await runTestScenarios({ test: selectedTest, logger });
    clearScreen();
  }
}

async function runTestScenarios({
  test,
  logger,
}: RunTestScenariosParams): Promise<void> {
  let shouldContinueScenarios = true;
  while (shouldContinueScenarios) {
    const scenario = await promptForScenario(test, logger);

    if (scenario === "back") {
      shouldContinueScenarios = false;
      continue;
    }

    clearScreen();
    logger.info(chalk.cyan(`\n🧪 Running: ${test.name} - ${scenario.name}\n`));

    const results = await test.run(logger, [scenario]);
    results.forEach((result) => displayTestResult(result, logger));
    logger.info(
      `\n📊 Result: ${
        results[0].success ? chalk.green("✅ Passed") : chalk.red("❌ Failed")
      }`,
    );

    const shouldContinue = await promptUser({
      type: "yesno",
      message: "\nRun another scenario?",
      logger,
      defaultYes: true,
    });

    if (!shouldContinue) {
      shouldContinueScenarios = false;
    }
  }
}

async function runSpecificTest({
  options,
  logger,
}: RunSpecificTestParams): Promise<void> {
  const testKey = options.tests as TestSuiteKey;
  const selectedTest = TEST_MAP.get(testKey);

  if (!selectedTest) {
    const availableTests = Array.from(TEST_MAP.keys()).join(", ");
    throw new Error(
      `Test suite '${options.tests}' not found. Available tests: ${availableTests}`,
    );
  }

  logger.info(
    "Available scenarios:",
    selectedTest.scenarios.map((s) => ({
      id: s.id,
      name: s.name,
    })),
  );
  logger.info("Looking for scenario:", options.scenario);

  const scenario = selectedTest.scenarios.find(
    (s) => s.id === options.scenario,
  );
  if (!scenario) {
    const availableScenarios = selectedTest.scenarios
      .map((s) => s.id)
      .join(", ");
    throw new Error(
      `Scenario '${options.scenario}' not found in test suite '${options.tests}'. Available scenarios: ${availableScenarios}`,
    );
  }

  logger.info(
    chalk.cyan(`\n🧪 Running: ${selectedTest.name} - ${scenario.name}\n`),
  );
  const results = await selectedTest.run(logger, [scenario]);
  results.forEach((result) => displayTestResult(result, logger));
}

export async function runTests({
  options = {},
}: RunTestsParams): Promise<void> {
  const logger = new LoggerService({ debug: true });
  logger.info(chalk.green("Welcome to GitGuard E2E Tests!"));

  try {
    // Check if we have both test suite and scenario specified
    if (options.tests && options.scenario) {
      await runSpecificTest({ options, logger });
    } else if (options.tests) {
      // If only test suite is specified, run all scenarios for that suite
      const testKey = options.tests as TestSuiteKey;
      const selectedTest = TEST_MAP.get(testKey);
      if (!selectedTest) {
        throw new Error(
          `Test suite '${options.tests}' not found. Available tests: ${Array.from(TEST_MAP.keys()).join(", ")}`,
        );
      }
      logger.info(
        chalk.cyan(`\n🧪 Running all scenarios for: ${selectedTest.name}\n`),
      );
      const results = await selectedTest.run(logger, selectedTest.scenarios);
      results.forEach((result) => displayTestResult(result, logger));
    } else {
      // If no specific test is specified, run interactive mode
      await runInteractiveMode({ logger });
    }
  } catch (error) {
    logger.error("Test suite failed:", error);
    process.exit(1);
  }
}

function clearScreen(): void {
  process.stdout.write("\x1Bc");
}
