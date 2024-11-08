import chalk from "chalk";
import { Logger } from "../types/logger.types.js";
import { DEFAULT_MAX_PROMPT_TOKENS } from "../constants.js";

interface CheckAILimitsParams {
  tokenUsage: {
    count: number;
    estimatedCost: string;
  };
  config: {
    ai: {
      maxPromptTokens?: number;
      maxPromptCost?: number;
    };
  };
  logger: Logger;
}

export function checkAILimits(params: CheckAILimitsParams): boolean {
  const { tokenUsage, config, logger } = params;
  const maxTokens = config.ai.maxPromptTokens ?? DEFAULT_MAX_PROMPT_TOKENS;
  const maxCost = config.ai.maxPromptCost ?? 1.0;

  if (
    tokenUsage.count > maxTokens ||
    parseFloat(tokenUsage.estimatedCost) > maxCost
  ) {
    logger.warn(
      "\n⚠️  This analysis would exceed configured limits. Please reduce the scope or adjust limits in config.",
    );
    logger.info(`\nLimits:
  - Max tokens: ${chalk.bold(maxTokens)}
  - Max cost: ${chalk.bold(`$${maxCost}`)}
    `);
    return false;
  }

  return true;
}
