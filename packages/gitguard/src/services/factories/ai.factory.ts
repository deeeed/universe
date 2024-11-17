import chalk from "chalk";
import { AIProvider } from "../../types/ai.types.js";
import { Config } from "../../types/config.types.js";
import { Logger } from "../../types/logger.types.js";
import { AnthropicService } from "../anthropic.service.js";
import { CustomAIService } from "../customai.service.js";
import { OpenAIService } from "../openai.service.js";

interface AIFactoryOptions {
  config: Config;
  logger: Logger;
}

export class AIFactory {
  static create(options: AIFactoryOptions): AIProvider | undefined {
    const { config, logger } = options;

    if (!config.ai?.enabled) {
      logger.debug("AI not enabled in config");
      return undefined;
    }

    try {
      switch (config.ai.provider) {
        case "azure":
          return AIFactory.createAzureProvider(config, logger);
        case "openai":
          return AIFactory.createOpenAIProvider(config, logger);
        case "anthropic":
          return AIFactory.createAnthropicProvider(config, logger);
        case "custom":
          return AIFactory.createCustomProvider(config, logger);
        default:
          return AIFactory.handleUnsupportedProvider(
            config.ai.provider ?? "unknown",
            logger,
          );
      }
    } catch (error) {
      AIFactory.handleError(error as Error, logger);
      return undefined;
    }
  }

  private static createAzureProvider(
    config: Config,
    logger: Logger,
  ): AIProvider | undefined {
    if (!config.ai?.azure) {
      logger.warn("Azure OpenAI configuration missing");
      return undefined;
    }

    const azureApiKey =
      config.ai.azure.apiKey ?? process.env.AZURE_OPENAI_API_KEY;
    const azureEndpoint = config.ai.azure.endpoint;

    if (!azureApiKey) {
      AIFactory.logAzureKeyMissing(logger);
      return undefined;
    }

    if (!azureEndpoint) {
      AIFactory.logAzureEndpointMissing(logger);
      return undefined;
    }

    return new OpenAIService({
      logger,
      config: {
        type: "azure",
        azure: {
          apiKey: azureApiKey,
          endpoint: azureEndpoint,
          deployment: config.ai.azure.deployment ?? "gpt-4",
          apiVersion: config.ai.azure.apiVersion ?? "2024-02-15-preview",
        },
      },
    });
  }

  private static createOpenAIProvider(
    config: Config,
    logger: Logger,
  ): AIProvider | undefined {
    if (!config.ai?.openai) {
      logger.warn("OpenAI configuration missing");
      return undefined;
    }

    const openaiApiKey = config.ai.openai.apiKey ?? process.env.OPENAI_API_KEY;

    if (!openaiApiKey) {
      AIFactory.logOpenAIApiKeyMissing(logger);
      return undefined;
    }

    return new OpenAIService({
      logger,
      config: {
        type: "openai",
        openai: {
          apiKey: openaiApiKey,
          model: config.ai.openai.model ?? "gpt-4",
          organization:
            config.ai.openai.organization ?? process.env.OPENAI_ORG_ID,
        },
      },
    });
  }

  private static createAnthropicProvider(
    config: Config,
    logger: Logger,
  ): AIProvider | undefined {
    if (!config.ai?.anthropic) {
      logger.warn("Anthropic configuration missing");
      return undefined;
    }

    const anthropicApiKey =
      config.ai.anthropic.apiKey ?? process.env.ANTHROPIC_API_KEY;

    if (!anthropicApiKey) {
      AIFactory.logAnthropicKeyMissing(logger);
      return undefined;
    }

    return new AnthropicService({
      logger,
      config: {
        type: "anthropic",
        anthropic: {
          apiKey: anthropicApiKey,
          model: config.ai.anthropic.model ?? "claude-3-opus-20240229",
        },
      },
    });
  }

  private static createCustomProvider(
    config: Config,
    logger: Logger,
  ): AIProvider | undefined {
    if (!config.ai?.custom) {
      logger.warn("Custom AI configuration missing");
      return undefined;
    }

    const customHost = config.ai.custom.host ?? process.env.CUSTOM_AI_HOST;

    if (!customHost) {
      AIFactory.logCustomHostMissing(logger);
      return undefined;
    }

    return new CustomAIService({
      logger,
      config: {
        type: "custom",
        custom: {
          host: customHost,
          model: config.ai.custom.model,
        },
      },
    });
  }

  private static handleUnsupportedProvider(
    provider: string,
    logger: Logger,
  ): AIProvider | undefined {
    logger.warn(`\n⚠️  Unsupported AI provider: ${provider}`);
    logger.info("\n💡 Supported providers are:");
    logger.info(chalk.dim("   - openai"));
    logger.info(chalk.dim("   - azure"));
    logger.info(chalk.dim("   - anthropic"));
    logger.info(chalk.dim("   - custom"));
    return undefined;
  }

  private static handleError(error: unknown, logger: Logger): void {
    logger.error("Failed to create AI service:", error);
    if (error instanceof Error) {
      logger.debug("Error details:", {
        message: error.message,
        stack: error.stack,
      });
    }
  }

  private static logAzureKeyMissing(logger: Logger): void {
    logger.warn("\n⚠️  Azure OpenAI API key missing");
    logger.info("\n💡 To enable Azure OpenAI, you need to:");
    logger.info(chalk.cyan("\n1. Set environment variable:"));
    logger.info(chalk.dim("   export AZURE_OPENAI_API_KEY=your_api_key"));
    logger.info(chalk.cyan("\n2. Or update your config file:"));
    logger.info(chalk.dim("   .gitguard/config.json:"));
    logger.info(
      chalk.dim('   "ai": { "azure": { "apiKey": "your_api_key" } }'),
    );
  }

  private static logAzureEndpointMissing(logger: Logger): void {
    logger.warn("\n⚠️  Azure OpenAI endpoint missing");
    logger.info("\n💡 To configure Azure OpenAI endpoint:");
    logger.info(chalk.cyan("\n1. Update your config file:"));
    logger.info(chalk.dim("   .gitguard/config.json:"));
    logger.info(
      chalk.dim(
        '   "ai": { "azure": { "endpoint": "https://your-resource.openai.azure.com" } }',
      ),
    );
  }

  private static logOpenAIApiKeyMissing(logger: Logger): void {
    logger.warn("\n⚠️  OpenAI API key missing");
    logger.info("\n💡 To enable OpenAI, you need to:");
    logger.info(chalk.cyan("\n1. Set environment variable:"));
    logger.info(chalk.dim("   export OPENAI_API_KEY=your_api_key"));
    logger.info(chalk.cyan("\n2. Or update your config file:"));
    logger.info(chalk.dim("   .gitguard/config.json:"));
    logger.info(
      chalk.dim('   "ai": { "openai": { "apiKey": "your_api_key" } }'),
    );
  }

  private static logAnthropicKeyMissing(logger: Logger): void {
    logger.warn("\n⚠️  Anthropic API key missing");
    logger.info("\n💡 To enable Anthropic, you need to:");
    logger.info(chalk.cyan("\n1. Set environment variable:"));
    logger.info(chalk.dim("   export ANTHROPIC_API_KEY=your_api_key"));
    logger.info(chalk.cyan("\n2. Or update your config file:"));
    logger.info(chalk.dim("   .gitguard/config.json:"));
    logger.info(
      chalk.dim('   "ai": { "anthropic": { "apiKey": "your_api_key" } }'),
    );
  }

  private static logCustomHostMissing(logger: Logger): void {
    logger.warn("\n⚠️  Custom AI host missing");
    logger.info("\n💡 To configure Custom AI host:");
    logger.info(chalk.cyan("\n1. Set environment variable:"));
    logger.info(chalk.dim("   export CUSTOM_AI_HOST=your_host_url"));
    logger.info(chalk.cyan("\n2. Or update your config file:"));
    logger.info(chalk.dim("   .gitguard/config.json:"));
    logger.info(
      chalk.dim('   "ai": { "custom": { "host": "your_host_url" } }'),
    );
  }
}
