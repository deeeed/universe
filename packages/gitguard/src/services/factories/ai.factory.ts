import { OpenAIService } from "../openai.service.js";
import { Config } from "../../types/config.types.js";
import { AIProvider } from "../../types/ai.types.js";
import { Logger } from "../../types/logger.types.js";

interface AIFactoryOptions {
  config: Config;
  logger: Logger;
}

export class AIFactory {
  static create(options: AIFactoryOptions): AIProvider | undefined {
    const { config, logger } = options;

    if (!config.ai?.enabled) {
      return undefined;
    }

    let azureApiKey: string | undefined;
    let openaiApiKey: string | undefined;

    switch (config.ai.provider) {
      case "azure":
        if (!config.ai.azure) {
          return undefined;
        }

        azureApiKey =
          config.ai.azure.apiKey ?? process.env.AZURE_OPENAI_API_KEY;
        if (!azureApiKey) {
          return undefined;
        }

        return new OpenAIService({
          logger,
          config: {
            type: "azure",
            azure: {
              apiKey: azureApiKey,
              endpoint: config.ai.azure.endpoint ?? "",
              deployment: config.ai.azure.deployment ?? "gpt-4",
              apiVersion: config.ai.azure.apiVersion ?? "2024-02-15-preview",
            },
          },
        });

      case "openai":
        if (!config.ai.openai) {
          return undefined;
        }

        openaiApiKey = config.ai.openai.apiKey ?? process.env.OPENAI_API_KEY;
        if (!openaiApiKey) {
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

      default:
        return undefined;
    }
  }
}
