import chalk from "chalk";
import { promises as fs } from "fs";
import type { Answers, QuestionCollection } from "inquirer";
import inquirer from "inquirer";
import { join } from "path";
import { LoggerService } from "../services/logger.service.js";
import { Config } from "../types/config.types.js";
import { defaultConfig, getConfigPaths } from "../utils/config.util.js";
import { FileUtil } from "../utils/file.util.js";

export interface InitOptions {
  global?: boolean;
  debug?: boolean;
}

interface PromptResponses extends Answers {
  baseBranch: Config["git"]["baseBranch"];
  enableAI: boolean;
  aiProvider?: "azure" | "openai" | "ollama";
  security: boolean;
  conventionalCommits: boolean;
  prTemplate: boolean;
}

export async function init(options: InitOptions): Promise<void> {
  const logger = new LoggerService({ debug: options.debug });
  logger.info(chalk.blue("\n📝 GitGuard Configuration Setup"));

  const configPaths = getConfigPaths();
  const configPath = options.global ? configPaths.global : configPaths.local;

  if (!configPath) {
    logger.error("Cannot initialize local config: not in a git repository");
    throw new Error("Not in a git repository");
  }

  const questions: QuestionCollection<PromptResponses> = [
    {
      type: "list",
      name: "baseBranch",
      message: "Select your default base branch:",
      choices: ["main", "master", "develop"],
      default: defaultConfig.git.baseBranch,
    },
    {
      type: "confirm",
      name: "conventionalCommits",
      message: "Enable Conventional Commits validation?",
      default: defaultConfig.analysis.checkConventionalCommits,
    },
    {
      type: "confirm",
      name: "security",
      message: "Enable security checks (secrets and sensitive files)?",
      default: defaultConfig.security.enabled,
    },
    {
      type: "confirm",
      name: "enableAI",
      message: "Would you like to enable AI features?",
      default: false,
    },
    {
      type: "list",
      name: "aiProvider",
      message: "Select AI provider:",
      choices: ["azure", "openai", "ollama"],
      default: "azure",
      when: (answers) => answers.enableAI,
    },
    {
      type: "confirm",
      name: "prTemplate",
      message: "Enable PR template validation?",
      default: defaultConfig.pr.template.required,
    },
  ];

  try {
    const responses = await inquirer.prompt<PromptResponses>(questions);
    const configDir = join(configPath, "..");
    await FileUtil.mkdirp(configDir);

    const config: Partial<Config> = {
      git: {
        baseBranch: responses.baseBranch,
        ignorePatterns: defaultConfig.git.ignorePatterns,
        cwd: process.cwd(),
      },
      analysis: {
        ...defaultConfig.analysis,
        checkConventionalCommits: responses.conventionalCommits,
      },
      security: {
        enabled: responses.security,
        checkSecrets: responses.security,
        checkFiles: responses.security,
      },
      ai: {
        enabled: responses.enableAI,
        provider: responses.aiProvider || null,
      },
      pr: {
        ...defaultConfig.pr,
        template: {
          ...defaultConfig.pr.template,
          required: responses.prTemplate,
        },
      },
    };

    await fs.writeFile(configPath, JSON.stringify(config, null, 2));

    logger.success("\n✨ Configuration saved successfully!");

    if (responses.enableAI) {
      logger.warn("\n⚠️  Additional AI configuration required:");
      logger.info(
        `Edit ${chalk.cyan(configPath)} and add your AI provider settings:`,
      );

      if (responses.aiProvider === "azure") {
        logger.info(
          chalk.gray(`
  "ai": {
    "enabled": true,
    "provider": "azure",
    "azure": {
      "endpoint": "YOUR_AZURE_ENDPOINT",
      "deployment": "gpt-4",
      "apiVersion": "2024-02-15-preview"
    }
  }`),
        );
      } else if (responses.aiProvider === "openai") {
        logger.info(
          chalk.gray(`
  "ai": {
    "enabled": true,
    "provider": "openai",
    "openai": {
      "model": "gpt-4",
      "organization": "YOUR_ORG_ID"
    }
  }`),
        );
      } else {
        logger.info(
          chalk.gray(`
  "ai": {
    "enabled": true,
    "provider": "ollama",
    "ollama": {
      "host": "http://localhost:11434",
      "model": "llama2"
    }
  }`),
        );
      }
    }

    logger.info("\n📋 Next steps:");
    logger.info(
      `1. ${chalk.cyan("gitguard hook install")}     Install Git hooks`,
    );
    logger.info(
      `2. ${chalk.cyan("gitguard status")}           Verify configuration`,
    );
    if (responses.enableAI) {
      logger.info(
        `3. Configure AI provider settings in ${chalk.cyan(configPath)}`,
      );
    }
  } catch (error) {
    logger.error("Failed to initialize configuration:", error);
    throw error;
  }
}
