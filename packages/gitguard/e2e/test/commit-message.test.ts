import { LoggerService } from "../../src/services/logger.service.js";
import { E2ETest, TestResult, TestScenario } from "../tests.types.js";
import { runScenario } from "../tests.utils.js";

const scenarios: TestScenario[] = [
  {
    id: "basic-formatting",
    name: "Basic commit message formatting",
    setup: {
      files: [{ path: "src/feature.ts", content: "console.log('test');" }],
      config: {
        debug: false,
      },
    },
    input: {
      message: "add new feature",
    },
    expected: {
      message: "feat: add new feature",
    },
  },
  {
    id: "monorepo-detection",
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
    id: "multi-package",
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
  async run(
    logger: LoggerService,
    selectedScenarios?: TestScenario[],
  ): Promise<TestResult[]> {
    const scenariosToRun = selectedScenarios || scenarios;
    const results: TestResult[] = [];

    for (const scenario of scenariosToRun) {
      results.push(await runScenario(scenario, logger));
    }

    return results;
  },
};
