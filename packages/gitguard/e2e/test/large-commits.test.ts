import { LoggerService } from "../../src/services/logger.service.js";
import { E2ETest, TestResult, TestScenario } from "../tests.types.js";
import { runScenario } from "../tests.utils.js";

const scenarios: TestScenario[] = [
  {
    id: "size-detection",
    name: "Large commit detection",
    setup: {
      files: Array.from({ length: 10 }, (_, i) => ({
        path: `src/feature${i}.ts`,
        content: "console.log('test');".repeat(100),
      })),
      config: {
        analysis: {
          maxCommitSize: 500,
          maxFileSize: 800,
        },
      },
    },
    input: {
      message: "massive update",
    },
    expected: {
      message: "feat: massive update",
      splitSuggestion: true,
    },
  },
  {
    id: "many-files",
    name: "Many files detection",
    setup: {
      files: Array.from({ length: 50 }, (_, i) => ({
        path: `src/feature${i}.ts`,
        content: "console.log('test');",
      })),
      config: {
        analysis: {
          maxFileSize: 800,
          maxCommitSize: 500,
        },
      },
    },
    input: {
      message: "update multiple files",
    },
    expected: {
      message: "feat: update multiple files",
      splitSuggestion: true,
    },
  },
];

export const largeCommitsTest: E2ETest = {
  name: "Large Commits Detection",
  scenarios,
  async run(logger: LoggerService): Promise<TestResult[]> {
    const results: TestResult[] = [];
    for (const scenario of scenarios) {
      results.push(await runScenario(scenario, logger));
    }
    return results;
  },
};
