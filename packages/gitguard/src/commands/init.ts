import chalk from "chalk";
import { promises as fs } from "fs";
import { join } from "path";
import { LoggerService } from "../services/logger.service.js";
import { Config } from "../types/config.types.js";
import {
  defaultConfig,
  getConfigPaths,
  getConfigStatus,
} from "../utils/config.util.js";
import { FileUtil } from "../utils/file.util.js";
import { getAIConfig, promptForInit } from "../utils/user-prompt.util.js";

export interface InitOptions {
  global?: boolean;
  debug?: boolean;
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

  const status = await getConfigStatus();
  const currentConfig = options.global
    ? status.global.config
    : status.local.config;

  try {
    const responses = await promptForInit({ logger, currentConfig });
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
      ai: getAIConfig(responses),
      pr: {
        ...defaultConfig.pr,
        template: {
          ...defaultConfig.pr.template,
          required: responses.prTemplate,
        },
      },
      hook: {
        defaultChoice: responses.hook.defaultChoice,
        timeoutSeconds: responses.hook.timeoutSeconds,
      },
    };

    await fs.writeFile(configPath, JSON.stringify(config, null, 2));
    logger.success("\n✨ Configuration saved successfully!");
  } catch (error) {
    logger.error("Failed to save configuration:", error);
    throw error;
  }
}