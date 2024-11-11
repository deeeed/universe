import { LoggerService } from "../../src/services/logger.service.js";
import { E2ETest, TestResult, TestScenario } from "../tests.types.js";
import { runScenario } from "../tests.utils.js";

const scenarios: TestScenario[] = [
  {
    id: "status-basic",
    name: "Basic Status - No Configuration",
    setup: {
      files: [],
      config: {
        debug: true,
      },
    },
    input: {
      message: "check status without configuration",
      command: {
        name: "status",
        args: [],
      },
    },
  },
  {
    id: "status-global",
    name: "Global Status - With Global Configuration",
    setup: {
      files: [],
      config: {
        debug: true,
        git: {
          baseBranch: "main",
          monorepoPatterns: ["packages/*"],
        },
        security: {
          enabled: true,
          rules: {
            secrets: {
              enabled: true,
              severity: "high",
            },
            files: {
              enabled: true,
              severity: "medium",
            },
          },
        },
      },
    },
    input: {
      message: "check global configuration status",
      command: {
        name: "status",
        args: ["--global"],
      },
    },
  },
  {
    id: "status-local",
    name: "Local Status - With Local Configuration",
    setup: {
      files: [],
      config: {
        debug: true,
        git: {
          baseBranch: "develop",
          monorepoPatterns: ["apps/*", "libs/*"],
        },
        analysis: {
          checkConventionalCommits: true,
          maxCommitSize: 500,
        },
      },
    },
    input: {
      message: "check local configuration status",
      command: {
        name: "status",
        args: ["--local"],
      },
    },
  },
  {
    id: "status-with-ai",
    name: "Status - With AI Configuration",
    setup: {
      files: [],
      config: {
        debug: true,
        ai: {
          enabled: true,
          provider: "azure",
          azure: {
            endpoint: "https://test.openai.azure.com",
            deployment: "test-deployment",
            apiVersion: "2024-02-15",
          },
        },
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
      message: "check status with AI configuration",
      command: {
        name: "status",
        args: [],
      },
    },
  },
  {
    id: "status-show-command",
    name: "Status Show Command",
    setup: {
      files: [],
      config: {
        debug: true,
        git: {
          baseBranch: "main",
        },
        pr: {
          template: {
            path: ".github/pull_request_template.md",
          },
        },
      },
    },
    input: {
      message: "check status show command",
      command: {
        name: "status",
        args: ["--show-command"],
      },
    },
  },
];

export const statusTest: E2ETest = {
  name: "Status Commands",
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
