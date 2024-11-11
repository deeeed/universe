import { LoggerService } from "../../src/services/logger.service.js";
import { E2ETest, TestResult, TestScenario } from "../tests.types.js";
import { runScenario } from "../tests.utils.js";

const scenarios: TestScenario[] = [
  {
    id: "init-basic",
    name: "Basic Init - Default Configuration",
    setup: {
      files: [],
      config: {
        debug: true,
      },
    },
    input: {
      message: "initialize with defaults",
      command: {
        name: "init",
        args: ["--yes"],
      },
    },
  },
  {
    id: "init-global",
    name: "Global Init - Custom Configuration",
    setup: {
      files: [],
      config: {
        debug: true,
      },
    },
    input: {
      message: "initialize global configuration",
      command: {
        name: "init",
        args: ["--global", "--yes"],
      },
    },
  },
  {
    id: "init-monorepo",
    name: "Init in Monorepo Context",
    setup: {
      files: [
        {
          path: "packages/app1/package.json",
          content: JSON.stringify({
            name: "app1",
            version: "1.0.0",
          }),
        },
        {
          path: "packages/app2/package.json",
          content: JSON.stringify({
            name: "app2",
            version: "1.0.0",
          }),
        },
      ],
      config: {
        debug: true,
      },
    },
    input: {
      message: "initialize in monorepo",
      command: {
        name: "init",
        args: ["--yes"],
      },
    },
  },
  {
    id: "init-create-command",
    name: "Init Create Command - Custom Configuration",
    setup: {
      files: [],
      config: {
        debug: true,
      },
    },
    input: {
      message: "create new configuration",
      command: {
        name: "init",
        subcommand: "create",
        args: ["--yes"],
      },
    },
  },
  {
    id: "init-with-ai",
    name: "Init with AI Configuration",
    setup: {
      files: [],
      config: {
        debug: true,
      },
      changes: [
        {
          path: ".env",
          content:
            "AZURE_OPENAI_API_KEY=test-key\nAZURE_OPENAI_ENDPOINT=https://test.openai.azure.com",
        },
      ],
    },
    input: {
      message: "initialize with AI configuration",
      command: {
        name: "init",
        args: ["--yes"],
      },
      options: {
        ai: true,
      },
    },
  },
];

export const initTest: E2ETest = {
  name: "Init Commands",
  scenarios,
  async run(
    logger: LoggerService,
    selectedScenarios?: TestScenario[],
  ): Promise<TestResult[]> {
    return Promise.all(
      (selectedScenarios || scenarios).map((scenario) =>
        runScenario(scenario, logger),
      ),
    );
  },
};
