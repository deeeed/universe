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
          ...config.ai,
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
      try {
        ai = AIFactory.create({ config, logger });
        if (ai) {
          logger.info(`✅ AI initialized using ${config.ai.provider}`);
        } else {
          logger.warn(
            `⚠️  Failed to initialize ${config.ai.provider} AI provider`,
          );
          if (
            config.ai.provider === "openai" &&
            !process.env.OPENAI_API_KEY &&
            !config.ai.openai?.apiKey
          ) {
            logger.info("\n💡 Missing OpenAI API key. To fix this:");
            logger.info(chalk.cyan("\n1. Set environment variable:"));
            logger.info(chalk.dim("   export OPENAI_API_KEY=your_api_key"));
            logger.info(chalk.cyan("\n2. Or update your config file:"));
            logger.info(chalk.dim("   .gitguard/config.json:"));
            logger.info(
              chalk.dim('   "ai": { "openai": { "apiKey": "your_api_key" } }'),
            );
          }
        }
      } catch (error) {
        logger.warn(
          `⚠️  Failed to initialize ${config.ai.provider} AI provider`,
        );
        if (error instanceof Error) {
          logger.debug("AI initialization error:", {
            provider: config.ai.provider,
            message: error.message,
            stack: error.stack,
          });

          // Provide specific guidance based on the error
          if (error.message.includes("API key")) {
            logger.info("\n💡 API key issue detected. To fix this:");
            if (config.ai.provider === "openai") {
              logger.info(chalk.cyan("\n1. Set environment variable:"));
              logger.info(chalk.dim("   export OPENAI_API_KEY=your_api_key"));
              logger.info(chalk.cyan("\n2. Or update your config file:"));
              logger.info(chalk.dim("   .gitguard/config.json:"));
              logger.info(
                chalk.dim(
                  '   "ai": { "openai": { "apiKey": "your_api_key" } }',
                ),
              );
            }
          }
        }
        // Return undefined to indicate AI is not available
        return undefined;
      }
    }
  } catch (error) {
    // Log the error for debugging but don't prevent initialization
    logger.debug("AI initialization warning:", error);
    if (error instanceof Error) {
      logger.debug("Details:", {
        message: error.message,
        stack: error.stack,
      });
    }
    // Return undefined to indicate AI is not available
    return undefined;
  }

  return ai;
}
