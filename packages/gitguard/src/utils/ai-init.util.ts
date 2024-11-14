import chalk from "chalk";
import { AIFactory } from "../services/factories/ai.factory.js";
import { AIProvider } from "../types/ai.types.js";
import { Config } from "../types/config.types.js";
import { Logger } from "../types/logger.types.js";

interface InitializeAIParams {
  config: Config;
  logger: Logger;
  isAIRequested?: boolean;
}

export function initializeAI({
  config,
  logger,
  isAIRequested,
}: InitializeAIParams): AIProvider | undefined {
  logger.info("\n🔍 Checking AI configuration...");
  let ai: AIProvider | undefined;

  if (!isAIRequested) {
    logger.info("ℹ️  AI analysis disabled");
    return undefined;
  }

  try {
    if (!config.ai?.provider) {
      // Create default fallback config
      const fallbackConfig: Config = {
        ...config,
        ai: {
          ...config.ai, // Preserve any existing AI config
          enabled: true,
          provider: "openai",
          openai: {
            model: "gpt-4-turbo",
          },
        },
      };

      ai = AIFactory.create({ config: fallbackConfig, logger });

      logger.newLine();
      logger.warn("AI requested but no provider configured in settings");
      logger.info(
        "\n💡 Using default OpenAI configuration for offline prompts. To configure AI properly:",
      );
      logger.info(chalk.cyan("\n1. Run setup command:"));
      logger.info(chalk.dim("   gitguard init"));
      logger.info(chalk.cyan("\n2. Or manually update your config file:"));
      logger.info(
        chalk.dim("   .gitguard/config.json or ~/.gitguard/config.json"),
      );
      logger.info(
        chalk.dim("\nTip: Run 'gitguard init --help' for more options"),
      );
    } else {
      ai = AIFactory.create({ config, logger });
    }

    if (ai) {
      logger.info(`✅ AI initialized using ${ai.getName()}`);
    } else {
      logger.warn(
        `⚠️  AI configuration found but initialization failed. Falling back to offline prompts.`,
      );
    }
  } catch (error) {
    logger.warn("⚠️  Failed to initialize AI provider:", error);
    logger.info("💡 Falling back to offline prompts");
  }

  return ai;
}
