import { LoggerService } from "../../src/services/logger.service.js";
import { E2ETest, TestResult, TestScenario } from "../tests.types.js";
import { runScenario } from "../tests.utils.js";

const scenarios: TestScenario[] = [
  {
    name: "Basic commit message formatting",
    setup: {
      files: [{ path: "src/feature.ts", content: "console.log('test');" }],
    },
    input: {
      message: "add new feature",
    },
    expected: {
      message: "feat: add new feature",
    },
  },
  {
    name: "Monorepo package detection",
    setup: {
      monorepo: true,
      files: [
        {
          path: "packages/app/src/feature.ts",
          content: "console.log('test');",
        },
      ],
    },
    input: {
      message: "add new feature",
    },
    expected: {
      message: "feat(app): add new feature",
    },
  },
  {
    name: "Multi-package changes",
    setup: {
      monorepo: true,
      files: [
        {
          path: "packages/app/src/feature.ts",
          content: "console.log('app');",
        },
        {
          path: "packages/core/src/utils.ts",
          content: "console.log('core');",
        },
      ],
    },
    input: {
      message: "update features",
    },
    expected: {
      message: "feat(app,core): update features",
      splitSuggestion: true,
    },
  },
];

export const commitMessageTest: E2ETest = {
  name: "Commit Message Formatting",
  scenarios,
  async run(logger: LoggerService): Promise<TestResult[]> {
    const results: TestResult[] = [];
    for (const scenario of scenarios) {
      results.push(await runScenario(scenario, logger));
    }
    return results;
  },
};
