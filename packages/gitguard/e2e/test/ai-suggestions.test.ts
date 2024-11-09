import { readFile } from "fs/promises";
import { join } from "path";
import { LoggerService } from "../../src/services/logger.service.js";
import { AIConfig, DeepPartial } from "../../src/types/config.types.js";
import { E2ETest, TestResult, TestScenario } from "../tests.types.js";
import { runScenario } from "../tests.utils.js";

// Create base configurations that can be reused
const baseAIConfig: DeepPartial<AIConfig> = {
  enabled: true,
  provider: "azure",
  maxPromptTokens: 4000,
  azure: {
    endpoint: "",
    deployment: "",
    apiVersion: "",
    apiKey: "",
  },
};

const baseButtonComponent = {
  path: "src/components/Button.tsx",
  content: "export const Button = () => <button>Click</button>;",
};

const enhancedButtonComponent = {
  path: "src/components/Button.tsx",
  content: `
export interface ButtonProps {
  variant: 'primary' | 'secondary';
  size: 'sm' | 'md' | 'lg';
  label: string;
  onClick: () => void;
}

export const Button = ({ variant, size, label, onClick }: ButtonProps) => {
  return (
    <button
      className={\`btn btn-\${variant} btn-\${size}\`}
      onClick={onClick}
    >
      {label}
    </button>
  );
};`,
};

// Create a function to generate common scenario structure
function createScenario(params: {
  id: string;
  name: string;
  setup: Partial<TestScenario["setup"]>;
  input: TestScenario["input"];
}): TestScenario {
  return {
    id: params.id,
    name: params.name,
    setup: {
      files: [],
      config: { ai: baseAIConfig },
      ...params.setup,
    },
    input: params.input,
  };
}

const scenarios: TestScenario[] = [
  createScenario({
    id: "commit-ai-basic",
    name: "Basic commit with AI suggestions",
    setup: {
      files: [
        {
          path: "src/api/auth.ts",
          content: "export const auth = () => console.log('auth');",
        },
      ],
      commit: "Initial auth implementation",
      changes: [
        {
          path: "src/api/auth.ts",
          content: `
export interface AuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export class OAuth2Client {
  constructor(private config: AuthConfig) {}
  
  async authenticate() {
    // Implementation
  }
}`,
        },
      ],
    },
    input: {
      message: "implement oauth authentication",
      command: {
        name: "commit",
        subcommand: "suggest",
        args: ["--staged"],
      },
    },
  }),

  createScenario({
    id: "commit-ai-large",
    name: "Commit with large changes (should exceed limits)",
    setup: {
      files: [{ path: "src/generated.ts", content: "// Initial content" }],
      config: {
        ai: {
          ...baseAIConfig,
          maxPromptTokens: 2000,
          maxPromptCost: 0.01,
        },
      },
      changes: [
        {
          path: "src/generated.ts",
          content: Array.from({ length: 100 }, (_, i) =>
            generateTypeAndService(i),
          ).join("\n"),
        },
      ],
    },
    input: {
      message: "update generated types",
      command: {
        name: "commit",
        subcommand: "suggest",
        args: ["--staged"],
      },
    },
  }),

  createScenario({
    id: "branch-ai-analyze",
    name: "Branch analysis with AI suggestions",
    setup: {
      files: [baseButtonComponent],
      config: {
        ...baseAIConfig,
        git: { baseBranch: "main" },
      },
      commit: "Initial button component",
      branch: "feature/ui-components",
      changes: [{ ...enhancedButtonComponent }],
    },
    input: {
      message: "analyze branch changes",
      command: {
        name: "branch",
        subcommand: "analyze",
        args: ["--ai"],
      },
    },
  }),

  createScenario({
    id: "branch-ai-pr",
    name: "Create PR with AI suggestions",
    setup: {
      files: [baseButtonComponent],
      branch: "feature/ui-components",
      changes: [{ ...enhancedButtonComponent }],
    },
    input: {
      message: "create PR with AI description",
      command: {
        name: "branch",
        subcommand: "pr",
        args: ["--ai", "--draft"],
      },
    },
  }),
];

// Helper function to generate type and service code
function generateTypeAndService(index: number): string {
  return `
export interface Type${index} {
  id: string;
  metadata: Record<string, unknown>;
  config: { enabled: boolean; settings: Record<string, unknown>; };
}
export class Service${index} {
  constructor(private config: Type${index}) {}
  async process(): Promise<void> {
    console.log('Processing', this.config);
  }
}`;
}

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
  async run(
    logger: LoggerService,
    selectedScenarios?: TestScenario[],
  ): Promise<TestResult[]> {
    const results: TestResult[] = [];
    const aiConfig = await loadAITestConfig(logger);

    if (
      !aiConfig.endpoint ||
      !aiConfig.deployment ||
      !aiConfig.apiVersion ||
      !aiConfig.apiKey
    ) {
      return (selectedScenarios || scenarios).map((scenario) => ({
        scenario,
        success: true,
        skipped: true,
        message: "Skipped - Missing Azure OpenAI configuration",
      }));
    }

    // Use selectedScenarios if provided, otherwise use all scenarios
    const scenariosToRun = selectedScenarios || scenarios;

    // Type assertion to ensure config is fully defined
    const enhancedScenarios = scenariosToRun.map((scenario) => ({
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
