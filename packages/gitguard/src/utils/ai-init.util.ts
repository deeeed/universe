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

function handleOpenAIKeyMissing(logger: Logger): void {
  logger.info("\n💡 Missing OpenAI API key. To fix this:");
  logger.info(chalk.cyan("\n1. Set environment variable:"));
  logger.info(chalk.dim("   export OPENAI_API_KEY=your_api_key"));
  logger.info(chalk.cyan("\n2. Or update your config file:"));
  logger.info(chalk.dim("   .gitguard/config.json:"));
  logger.info(chalk.dim('   "ai": { "openai": { "apiKey": "your_api_key" } }'));
}

function handleNoProviderConfigured(logger: Logger): void {
  logger.newLine();
  logger.warn("AI requested but no provider configured in settings");
  logger.info(
    "\n💡 Using default OpenAI configuration for offline prompts. To configure AI properly:",
  );
  logger.info(chalk.cyan("\n1. Run setup command:"));
  logger.info(chalk.dim("   gitguard init"));
  logger.info(chalk.cyan("\n2. Or manually update your config file:"));
  logger.info(chalk.dim("   .gitguard/config.json or ~/.gitguard/config.json"));
  logger.info(chalk.dim("\nTip: Run 'gitguard init --help' for more options"));
}

function createFallbackConfig(config: Config): Config {
  return {
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
}

export function initializeAI({
  config,
  logger,
  isAIRequested,
}: InitializeAIParams): AIProvider | undefined {
  logger.info("\n🔍 Checking AI configuration...");

  if (!isAIRequested) {
    logger.info("ℹ️  AI analysis disabled");
    return undefined;
  }

  if (!config.ai?.provider) {
    const fallbackConfig = createFallbackConfig(config);
    const ai = AIFactory.create({ config: fallbackConfig, logger });
    handleNoProviderConfigured(logger);
    return ai;
  }

  try {
    const ai = AIFactory.create({ config, logger });
    if (!ai) {
      logger.warn(`⚠️  Failed to initialize ${config.ai.provider} AI provider`);
      if (
        config.ai.provider === "openai" &&
        !process.env.OPENAI_API_KEY &&
        !config.ai.openai?.apiKey
      ) {
        handleOpenAIKeyMissing(logger);
      }
      return undefined;
    }

    logger.info(`✅ AI initialized using ${config.ai.provider}`);
    return ai;
  } catch (error) {
    logger.warn(`Failed to initialize ${config.ai.provider} AI provider`);

    if (error instanceof Error) {
      logger.debug("AI initialization error:", {
        provider: config.ai.provider,
        message: error.message,
        stack: error.stack,
      });

      if (
        error.message.includes("API key") &&
        config.ai.provider === "openai"
      ) {
        handleOpenAIKeyMissing(logger);
      }
    }

    return undefined;
  }
}
