import chalk from "chalk";
import { Command } from "commander";
import { promises as fs } from "fs";
import { join } from "path";
import { LoggerService } from "../services/logger.service.js";
import { Config } from "../types/config.types.js";
import {
  getConfigPaths,
  getConfigStatus,
  getDefaultConfig,
} from "../utils/config.util.js";
import { FileUtil } from "../utils/file.util.js";
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

  try {
    const responses = await promptForInit({
      logger,
      currentConfig,
    });

    const configDir = join(configPath, "..");
    await FileUtil.mkdirp(configDir);

    const defaultCfg = getDefaultConfig();
    const config: Partial<Config> = {
      debug: options.debug,
      colors: options.noColors ? false : defaultCfg.colors,
      git: {
        baseBranch: responses.baseBranch,
        monorepoPatterns: defaultCfg.git.monorepoPatterns,
        ignorePatterns: defaultCfg.git.ignorePatterns,
        cwd: process.cwd(),
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
        provider: null,
        maxPromptTokens: defaultCfg.ai.maxPromptTokens,
        maxPromptCost: defaultCfg.ai.maxPromptCost,
      },
      pr: {
        ...defaultCfg.pr,
        template: {
          ...defaultCfg.pr.template,
          required: responses.prTemplate,
        },
      },
    };

    await fs.writeFile(configPath, JSON.stringify(config, null, 2));
    logger.success("\n✨ Configuration saved successfully!");
  } catch (error) {
    logger.error("Failed to save configuration:", error);
    throw error;
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
