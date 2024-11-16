import chalk from "chalk";
import { Command } from "commander";
import { promises as fs } from "fs";
import { join } from "path";
import { LoggerService } from "../services/logger.service.js";
import { Config } from "../types/config.types.js";
import { Logger } from "../types/logger.types.js";
import {
  getConfigPaths,
  getConfigStatus,
  getDefaultConfig,
  validateConfig,
} from "../utils/config.util.js";
import { FileUtil } from "../utils/file.util.js";
import { determineDefaultBranch } from "../utils/git.util.js";
import { promptForInit } from "../utils/user-prompt.util.js";

interface InitCommandOptions {
  global?: boolean;
  debug?: boolean;
  noColors?: boolean;
  configPath?: string;
  useDefaults?: boolean;
}

interface InitAnalyzeParams {
  options: InitCommandOptions;
}

interface VerifyConfigParams {
  configPath: string;
  logger: Logger;
}

async function verifyConfig({
  configPath,
  logger,
}: VerifyConfigParams): Promise<void> {
  try {
    const fileContent = await fs.readFile(configPath, "utf-8");
    const savedConfig = JSON.parse(fileContent) as Partial<Config>;
    validateConfig({ config: savedConfig });
    logger.success("✓ Configuration validation passed");
  } catch (verificationError) {
    logger.error("Failed to verify saved configuration:", verificationError);
    throw verificationError;
  }
}

async function initializeConfig({ options }: InitAnalyzeParams): Promise<void> {
  const logger = new LoggerService({ debug: options.debug });
  logger.info(chalk.blue("\n📝 GitGuard Configuration Setup"));

  const configPaths = getConfigPaths();
  const configPath = options.global ? configPaths.global : configPaths.local;

  if (!configPath) {
    logger.error("Cannot initialize local config: not in a git repository");
    throw new Error("Not in a git repository");
  }

  const status = await getConfigStatus();
  const currentConfig = options.global
    ? status.global.config
    : status.local.config;

  const detectedBaseBranch = await determineDefaultBranch();

  const responses = await promptForInit({
    logger,
    currentConfig,
    detectedBaseBranch,
  });

  const configDir = join(configPath, "..");
  await FileUtil.mkdirp(configDir);

  const defaultCfg = getDefaultConfig();
  const config: Partial<Config> = {
    debug: options.debug,
    colors: options.noColors ? false : defaultCfg.colors,
    git: {
      baseBranch: detectedBaseBranch,
      monorepoPatterns: defaultCfg.git.monorepoPatterns,
      ignorePatterns: defaultCfg.git.ignorePatterns,
    },
    analysis: {
      ...defaultCfg.analysis,
      checkConventionalCommits: responses.conventionalCommits,
    },
    security: {
      enabled: responses.security,
      rules: {
        secrets: {
          enabled: responses.security,
          severity: "high",
          blockPR: true,
        },
        files: {
          enabled: responses.security,
          severity: "high",
        },
      },
    },
    ai: {
      enabled: responses.ai.enabled,
      provider: responses.ai.enabled ? "openai" : null,
      maxPromptTokens: defaultCfg.ai.maxPromptTokens,
      maxPromptCost: defaultCfg.ai.maxPromptCost,
      openai: {
        model: "gpt-4-turbo",
      },
      azure: {
        endpoint: "https://YOURENDPOINT.openai.azure.com/",
        deployment: "gpt-4",
        apiVersion: "2024-02-15-preview",
      },
      anthropic: {
        model: "claude-3-opus-20240229",
      },
      custom: {
        host: "http://localhost:11434",
        model: "custom-model",
      },
    },
    pr: {
      ...defaultCfg.pr,
      template: {
        ...defaultCfg.pr.template,
        required: responses.prTemplate,
      },
    },
  };

  // Validate and save configuration
  validateConfig({ config });
  await fs.writeFile(configPath, JSON.stringify(config, null, 2));
  logger.success("\n✨ Configuration saved successfully!");

  // Verify saved configuration
  await verifyConfig({ configPath, logger });

  if (responses.ai.enabled) {
    logger.info(chalk.blue("\nAI Configuration Details:"));
    logger.info(`- Default provider set to: ${chalk.cyan("openai")}`);
    logger.info(`- Default model set to: ${chalk.cyan("gpt-4-turbo")}`);
    logger.info(
      `- To use OpenAI, set your ${chalk.yellow("OPENAI_API_KEY")} environment variable`,
    );
    logger.info(
      `- To use Azure OpenAI, set ${chalk.yellow("AZURE_OPENAI_API_KEY")}, ${chalk.yellow("AZURE_OPENAI_ENDPOINT")}, and ${chalk.yellow("AZURE_OPENAI_DEPLOYMENT")}`,
    );
    logger.info(
      `- To use Anthropic, set your ${chalk.yellow("ANTHROPIC_API_KEY")} environment variable`,
    );
    logger.info(
      `- To use Custom AI, set your ${chalk.yellow("CUSTOM_AI_HOST")} environment variable`,
    );
    logger.info(
      `- You can change providers and settings in your config file: ${chalk.dim(configPath)}`,
    );
  }
}

// Subcommands
const create = new Command("create")
  .description("Create a new configuration")
  .option("-g, --global", "Create global configuration")
  .action(async (cmdOptions: InitCommandOptions) => {
    await initializeConfig({ options: cmdOptions });
  });

// Main init command
export const initCommand = new Command("init")
  .description("Initialize GitGuard configuration")
  .option("-d, --debug", "Enable debug mode")
  .option("-g, --global", "Initialize global configuration")
  .option("-y, --yes", "Use default values without prompting")
  .addHelpText(
    "after",
    `
${chalk.blue("Examples:")}
  ${chalk.yellow("$")} gitguard init              # Interactive initialization
  ${chalk.yellow("$")} gitguard init -g           # Initialize global configuration
  ${chalk.yellow("$")} gitguard init -y           # Use defaults without prompting
  ${chalk.yellow("$")} gitguard init create       # Create new configuration`,
  );

// Add subcommands
initCommand
  .addCommand(create)
  .action(async (cmdOptions: InitCommandOptions) => {
    await initializeConfig({ options: cmdOptions });
  });

// Keep original export for backward compatibility
export async function initLegacy(params: InitAnalyzeParams): Promise<void> {
  return initializeConfig(params);
}
