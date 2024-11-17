import { readFile } from "fs/promises";
import { join } from "path";
import { LoggerService } from "../../src/services/logger.service.js";
import { E2ETest, TestResult, TestScenario } from "../tests.types.js";
import { runScenario } from "../tests.utils.js";

// Helper to load provider configs from env
async function loadProviderConfigs(
  logger: LoggerService,
): Promise<Record<string, unknown>> {
  try {
    const testEnvPath = join(process.cwd(), ".env.test");
    const envContent = await readFile(testEnvPath, "utf-8");

    return envContent.split("\n").reduce(
      (acc, line) => {
        const [key, value] = line.split("=").map((s) => s.trim());
        if (!key || !value) return acc;
        acc[key] = value;
        return acc;
      },
      {} as Record<string, unknown>,
    );
  } catch (error) {
    logger.warn("Failed to load provider configurations:", error);
    return {};
  }
}

const scenarios: TestScenario[] = [
  // Azure OpenAI Scenario
  {
    id: "azure-provider-config",
    name: "Azure OpenAI Provider Configuration",
    setup: {
      files: [
        {
          path: "test.txt",
          content: "Hello World",
        },
      ],
      config: {
        ai: {
          enabled: true,
          provider: "azure",
          azure: {
            endpoint: process.env.AZURE_OPENAI_ENDPOINT ?? "",
            deployment: process.env.AZURE_OPENAI_DEPLOYMENT ?? "",
            apiVersion: process.env.AZURE_OPENAI_API_VERSION ?? "",
            apiKey: process.env.AZURE_OPENAI_API_KEY ?? "",
          },
        },
      },
    },
    input: {
      message: "test completion",
      command: {
        name: "commit",
        subcommand: "suggest",
        args: [],
      },
      options: {
        ai: true,
      },
    },
  },

  // OpenAI Scenario
  {
    id: "openai-provider-config",
    name: "OpenAI Provider Configuration",
    setup: {
      files: [
        {
          path: "test.txt",
          content: "Hello World",
        },
      ],
      config: {
        ai: {
          enabled: true,
          provider: "openai",
          openai: {
            apiKey: process.env.OPENAI_API_KEY ?? "",
            model: process.env.OPENAI_MODEL ?? "gpt-4",
            organization: process.env.OPENAI_ORG_ID,
          },
        },
      },
    },
    input: {
      message: "test completion",
      command: {
        name: "commit",
        subcommand: "suggest",
        args: [],
      },
      options: {
        ai: true,
      },
    },
  },

  // Anthropic Scenario
  {
    id: "anthropic-provider-config",
    name: "Anthropic Provider Configuration",
    setup: {
      files: [
        {
          path: "test.txt",
          content: "Hello World",
        },
      ],
      config: {
        ai: {
          enabled: true,
          provider: "anthropic",
          anthropic: {
            apiKey: process.env.ANTHROPIC_API_KEY ?? "",
            model: process.env.ANTHROPIC_MODEL ?? "claude-3-opus-20240229",
          },
        },
      },
    },
    input: {
      message: "test completion",
      command: {
        name: "commit",
        subcommand: "suggest",
        args: [],
      },
      options: {
        ai: true,
      },
    },
  },

  // Custom AI Scenario
  {
    id: "custom-provider-config",
    name: "Custom AI Provider Configuration",
    setup: {
      files: [
        {
          path: "test.txt",
          content: "Hello World",
        },
      ],
      config: {
        ai: {
          enabled: true,
          provider: "custom",
          custom: {
            host: process.env.CUSTOM_AI_HOST ?? "http://localhost:11434",
            model: process.env.CUSTOM_AI_MODEL ?? "codellama",
          },
        },
      },
    },
    input: {
      message: "test completion",
      command: {
        name: "commit",
        subcommand: "suggest",
        args: [],
      },
      options: {
        ai: true,
      },
    },
  },
];

export const aiProvidersTest: E2ETest = {
  name: "AI Providers Configuration",
  scenarios,
  async run(
    logger: LoggerService,
    selectedScenarios?: TestScenario[],
  ): Promise<TestResult[]> {
    const results: TestResult[] = [];
    const envConfigs = await loadProviderConfigs(logger);

    // Use selectedScenarios if provided, otherwise use all scenarios
    const scenariosToRun = selectedScenarios ?? scenarios;

    // Enhance scenarios with environment configurations
    const enhancedScenarios = scenariosToRun.map((scenario) => {
      const config = { ...scenario.setup.config };

      switch (config.ai?.provider) {
        case "azure":
          if (config.ai.azure) {
            config.ai.azure = {
              ...config.ai.azure,
              endpoint: envConfigs.AZURE_OPENAI_ENDPOINT as string,
              deployment: envConfigs.AZURE_OPENAI_DEPLOYMENT as string,
              apiVersion: envConfigs.AZURE_OPENAI_API_VERSION as string,
              apiKey: envConfigs.AZURE_OPENAI_API_KEY as string,
            };
          }
          break;
        case "openai":
          if (config.ai.openai) {
            config.ai.openai = {
              ...config.ai.openai,
              apiKey: envConfigs.OPENAI_API_KEY as string,
              model: envConfigs.OPENAI_MODEL as string,
              organization: envConfigs.OPENAI_ORG_ID as string,
            };
          }
          break;
        case "anthropic":
          if (config.ai.anthropic) {
            config.ai.anthropic = {
              ...config.ai.anthropic,
              apiKey: envConfigs.ANTHROPIC_API_KEY as string,
              model: envConfigs.ANTHROPIC_MODEL as string,
            };
          }
          break;
        case "custom":
          if (config.ai.custom) {
            config.ai.custom = {
              ...config.ai.custom,
              host: envConfigs.CUSTOM_AI_HOST as string,
              model: envConfigs.CUSTOM_AI_MODEL as string,
            };
          }
          break;
      }

      return {
        ...scenario,
        setup: {
          ...scenario.setup,
          config,
        },
      };
    });

    // Run all scenarios regardless of configuration
    for (const scenario of enhancedScenarios) {
      results.push(await runScenario({ scenario, logger }));
    }

    return results;
  },
};
