import { LoggerService } from "../../src/services/logger.service.js";
import { E2ETest, TestResult, TestScenario } from "../tests.types.js";
import { runScenario } from "../tests.utils.js";

const scenarios: TestScenario[] = [
  {
    name: "AI suggestions enabled",
    setup: {
      files: [{ path: "src/feature.ts", content: "console.log('test');" }],
      config: {
        ai: { enabled: true },
      },
    },
    input: {
      message: "add new feature",
    },
    expected: {
      message: "feat: add new feature",
      aiSuggestions: true,
    },
  },
];

export const aiSuggestionsTest: E2ETest = {
  name: "AI Suggestions",
  scenarios,
  async run(logger: LoggerService): Promise<TestResult[]> {
    const results: TestResult[] = [];
    for (const scenario of scenarios) {
      results.push(await runScenario(scenario, logger));
    }
    return results;
  },
};
