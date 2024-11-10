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
        debug: true,
        git: {
          monorepoPatterns: ["packages/*"],
        },
      },
      changes: [{ path: "src/feature.ts", content: "console.log('test');" }],
      stageOnly: true,
    },
    input: {
      message: "add new feature",
      command: {
        name: "commit",
        subcommand: "create",
        args: ["-m", "add new feature", "--staged"],
      },
      options: {
        staged: true,
      },
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
      config: {
        debug: true,
        git: {
          monorepoPatterns: ["packages/*"],
        },
      },
      changes: [
        {
          path: "packages/app/src/feature.ts",
          content: "console.log('test');",
        },
      ],
      stageOnly: true,
    },
    input: {
      message: "add new feature",
      command: {
        name: "commit",
        subcommand: "create",
        args: ["-m", "add new feature", "--staged", "--debug"],
      },
      options: {
        staged: true,
        debug: true,
      },
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
      config: {
        debug: true,
        git: {
          monorepoPatterns: ["packages/*"],
        },
      },
      changes: [
        {
          path: "packages/app/src/feature.ts",
          content: "console.log('app');",
        },
        {
          path: "packages/core/src/utils.ts",
          content: "console.log('core');",
        },
      ],
      stageOnly: true,
    },
    input: {
      message: "update features",
      command: {
        name: "commit",
        subcommand: "create",
        args: ["-m", "update features", "--staged"],
      },
      options: {
        staged: true,
      },
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
