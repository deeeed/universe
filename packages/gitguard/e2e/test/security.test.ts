import { LoggerService } from "../../src/services/logger.service.js";
import { E2ETest, TestResult, TestScenario } from "../tests.types.js";
import { runScenario } from "../tests.utils.js";

const scenarios: TestScenario[] = [
  {
    id: "secrets-detection",
    name: "Security check - AWS credentials",
    setup: {
      files: [
        {
          path: ".env",
          content: "AWS_SECRET_KEY=AKIAXXXXXXXXXXXXXXXX",
        },
      ],
      config: {
        security: {
          enabled: true,
        },
      },
    },
    input: {
      message: "add config",
    },
  },
  {
    id: "token-detection",
    name: "Security check - Environment variables",
    setup: {
      files: [
        {
          path: ".env.local",
          content: "DATABASE_URL=postgresql://user:password@localhost:5432/db",
        },
      ],
      config: {
        security: {
          enabled: true,
        },
      },
    },
    input: {
      message: "add database config",
    },
  },
];

export const securityTest: E2ETest = {
  name: "Security Checks",
  scenarios,
  async run(
    logger: LoggerService,
    selectedScenarios?: TestScenario[],
  ): Promise<TestResult[]> {
    const results: TestResult[] = [];
    const scenariosToRun = selectedScenarios || scenarios;

    for (const scenario of scenariosToRun) {
      results.push(await runScenario(scenario, logger));
    }
    return results;
  },
};
