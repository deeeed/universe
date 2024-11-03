import chalk from "chalk";
import inquirer from "inquirer";
import execa from "execa";
import { readFile } from "fs/promises";
import { homedir } from "os";
import { join } from "path";
import { LoggerService } from "./services/logger.service.js";
import { Config } from "./types/config.types.js";
import { deepMerge } from "./utils/deep-merge.js";
import type { QuestionCollection, Answers } from "inquirer";

const defaultConfig: Config = {
  git: {
    baseBranch: "main",
    ignorePatterns: ["*.lock", "dist/*"],
    cwd: process.cwd(),
  },
  analysis: {
    maxCommitSize: 500,
    maxFileSize: 800,
    checkConventionalCommits: true,
  },
  debug: false,
  security: {
    enabled: true,
    checkSecrets: true,
    checkFiles: true,
  },
  ai: {
    enabled: false,
    provider: null,
  },
  pr: {
    template: {
      path: ".github/pull_request_template.md",
      required: false,
      sections: {
        description: true,
        breaking: true,
        testing: true,
        checklist: true,
      },
    },
    maxSize: 800,
    requireApprovals: 1,
  },
};

async function loadJsonFile(path: string): Promise<Partial<Config>> {
  try {
    const content = await readFile(path, "utf-8");
    const parsed = JSON.parse(content) as Partial<Config>;
    return parsed;
  } catch {
    return {};
  }
}

async function getGitRoot(): Promise<string> {
  try {
    const { stdout } = await execa("git", ["rev-parse", "--show-toplevel"]);
    return stdout;
  } catch {
    return process.cwd();
  }
}

function getEnvConfig(): Partial<Config> {
  const envMappings = {
    GITGUARD_USE_AI: (val: string) => ({
      ai: { enabled: val.toLowerCase() === "true" },
    }),
    AZURE_OPENAI_ENDPOINT: (val: string) => ({
      ai: { azure: { endpoint: val } },
    }),
    AZURE_OPENAI_DEPLOYMENT: (val: string) => ({
      ai: { azure: { deployment: val } },
    }),
    AZURE_OPENAI_API_VERSION: (val: string) => ({
      ai: { azure: { apiVersion: val } },
    }),
  };

  return Object.entries(envMappings).reduce((config, [envVar, transform]) => {
    const value = process.env[envVar];
    if (value) {
      return { ...config, ...transform(value) };
    }
    return config;
  }, {});
}

type BaseBranch = "main" | "master" | "develop";

interface PromptResponses extends Answers {
  baseBranch: BaseBranch;
  enableAI: boolean;
  security: boolean;
}

async function promptForConfig(): Promise<Partial<Config>> {
  const logger = new LoggerService({ debug: false });
  logger.info(chalk.blue("\n📝 GitGuard Configuration Setup"));

  const questions: QuestionCollection<PromptResponses> = [
    {
      type: "list",
      name: "baseBranch",
      message: "Select your default base branch:",
      choices: ["main", "master", "develop"],
      default: "main",
    },
    {
      type: "confirm",
      name: "enableAI",
      message:
        "Would you like to enable AI features? (Requires additional setup)",
      default: false,
    },
    {
      type: "confirm",
      name: "security",
      message: "Enable security checks for secrets and sensitive files?",
      default: true,
    },
  ];

  try {
    const responses = await inquirer.prompt<PromptResponses>(questions);

    if (responses.enableAI) {
      logger.warn("\n⚠️  AI features require additional configuration:");
      logger.info(
        "1. Create a config file at ~/.gitguard/config.json or .gitguard/config.json",
      );
      logger.info("2. Add your AI provider settings:");
      logger.info(
        chalk.gray(`
    {
      "ai": {
        "enabled": true,
        "provider": "azure",
        "azure": {
          "endpoint": "your-endpoint",
          "deployment": "gpt-4",
          "apiVersion": "2024-02-15-preview"
        }
      }
    }`),
      );
    }

    const config: Partial<Config> = {
      git: {
        baseBranch: responses.baseBranch,
        ignorePatterns: defaultConfig.git.ignorePatterns,
        cwd: defaultConfig.git.cwd,
      },
      security: {
        enabled: responses.security,
        checkSecrets: responses.security,
        checkFiles: responses.security,
      },
      ai: {
        enabled: false,
        provider: null,
      },
    };

    return config;
  } catch (error) {
    logger.error("Failed to get user input:", error);
    return {};
  }
}

export async function loadConfig(
  options: {
    interactive?: boolean;
    configPath?: string;
  } = {},
): Promise<Config> {
  const logger = new LoggerService({ debug: false });

  try {
    // Load config from specified path if provided
    const customConfig = options.configPath
      ? await loadJsonFile(options.configPath)
      : {};

    // Load other configs
    const homeConfig = await loadJsonFile(
      join(homedir(), ".gitguard", "config.json"),
    );
    const gitRoot = await getGitRoot();
    const localConfig = await loadJsonFile(
      join(gitRoot, ".gitguard", "config.json"),
    );
    const envConfig = getEnvConfig();
    const interactiveConfig =
      options.interactive && !homeConfig && !localConfig && !customConfig
        ? await promptForConfig()
        : {};

    // Merge configs with custom config taking precedence over default
    const finalConfig = deepMerge<Config>(
      defaultConfig,
      homeConfig,
      localConfig,
      envConfig,
      customConfig,
      interactiveConfig,
    );

    // Type guard for AI config
    if (
      typeof finalConfig.ai === "object" &&
      finalConfig.ai &&
      !("azure" in finalConfig.ai && finalConfig.ai.azure?.endpoint) &&
      !("ollama" in finalConfig.ai && finalConfig.ai.ollama?.host)
    ) {
      finalConfig.ai.enabled = false;
    }

    return finalConfig;
  } catch (error) {
    logger.error("Failed to load configuration:", error);
    return defaultConfig;
  }
}
