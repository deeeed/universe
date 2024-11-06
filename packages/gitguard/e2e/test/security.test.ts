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
    expected: {
      message: "chore: add config",
      securityIssues: true,
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
    expected: {
      message: "chore: add database config",
      securityIssues: true,
    },
  },
];

export const securityTest: E2ETest = {
  name: "Security Checks",
  scenarios,
  async run(logger: LoggerService): Promise<TestResult[]> {
    const results: TestResult[] = [];
    for (const scenario of scenarios) {
      results.push(await runScenario(scenario, logger));
    }
    return results;
  },
};
