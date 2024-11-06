import { readFile } from "fs/promises";
import { join } from "path";
import { LoggerService } from "../../src/services/logger.service.js";
import { AIConfig } from "../../src/types/config.types.js";
import { E2ETest, TestResult, TestScenario } from "../tests.types.js";
import { runScenario } from "../tests.utils.js";

const scenarios: TestScenario[] = [
  {
    id: "basic-suggestions",
    name: "AI suggestions enabled",
    setup: {
      files: [{ path: "src/feature.ts", content: "console.log('test');" }],
      config: {
        ai: {
          enabled: true,
          provider: "azure",
          azure: {
            endpoint: "",
            deployment: "",
            apiVersion: "",
            apiKey: "",
          }, // Will be populated from .env.test
        },
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
  {
    id: "complex-suggestions",
    name: "Complex AI suggestions",
    setup: {
      files: [{ path: "src/feature.ts", content: "console.log('test');" }],
      config: {
        ai: { enabled: true },
      },
    },
    input: {
      message: "implement new authentication system with oauth2",
    },
    expected: {
      message: "feat: implement oauth2 authentication system",
      aiSuggestions: true,
    },
  },
];

async function loadAITestConfig(
  logger: LoggerService,
): Promise<Required<NonNullable<AIConfig["azure"]>>> {
  try {
    const testEnvPath = join(process.cwd(), ".env.test");
    const envContent = await readFile(testEnvPath, "utf-8");

    const config = envContent.split("\n").reduce(
      (acc, line) => {
        const [key, value] = line.split("=").map((s) => s.trim());
        if (!key || !value) return acc;

        switch (key) {
          case "AZURE_OPENAI_ENDPOINT":
            acc.endpoint = value;
            break;
          case "AZURE_OPENAI_DEPLOYMENT":
            acc.deployment = value;
            break;
          case "AZURE_OPENAI_API_VERSION":
            acc.apiVersion = value;
            break;
          case "AZURE_OPENAI_API_KEY":
            acc.apiKey = value;
            break;
        }
        return acc;
      },
      {} as Required<NonNullable<AIConfig["azure"]>>,
    );

    logger.debug("Loaded AI test configuration:", {
      hasEndpoint: !!config.endpoint,
      hasDeployment: !!config.deployment,
      hasApiVersion: !!config.apiVersion,
      hasApiKey: !!config.apiKey,
    });

    return config;
  } catch (error) {
    logger.warn("Failed to load AI test configuration:", error);
    logger.warn(`
To run AI tests, create a .env.test file with the following variables:
AZURE_OPENAI_ENDPOINT=https://your-endpoint.openai.azure.com/
AZURE_OPENAI_DEPLOYMENT=your-deployment-name
AZURE_OPENAI_API_VERSION=2024-02-15-preview
AZURE_OPENAI_API_KEY=your-api-key
    `);
    return {} as Required<NonNullable<AIConfig["azure"]>>;
  }
}

export const aiSuggestionsTest: E2ETest = {
  name: "AI Suggestions",
  scenarios,
  async run(logger: LoggerService): Promise<TestResult[]> {
    const results: TestResult[] = [];
    const aiConfig = await loadAITestConfig(logger);

    if (
      !aiConfig.endpoint ||
      !aiConfig.deployment ||
      !aiConfig.apiVersion ||
      !aiConfig.apiKey
    ) {
      return scenarios.map((scenario) => ({
        scenario,
        success: true,
        skipped: true,
        message: "Skipped - Missing Azure OpenAI configuration",
      }));
    }

    // Type assertion to ensure config is fully defined
    const enhancedScenarios = scenarios.map((scenario) => ({
      ...scenario,
      setup: {
        ...scenario.setup,
        config: {
          ...scenario.setup.config,
          ai: {
            ...scenario.setup.config?.ai,
            azure: aiConfig,
          },
        },
      },
    }));

    for (const scenario of enhancedScenarios) {
      results.push(await runScenario(scenario, logger));
    }

    return results;
  },
};
