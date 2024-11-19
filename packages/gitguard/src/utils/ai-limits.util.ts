import chalk from "chalk";
import {
  DEFAULT_MAX_CLIPBOARD_TOKENS,
  DEFAULT_MAX_PROMPT_TOKENS,
} from "../constants.js";
import { TokenUsage } from "../types/ai.types.js";
import { Logger } from "../types/logger.types.js";
import { Config } from "../types/config.types.js";

interface DisplayTokenInfoParams {
  tokenUsage: TokenUsage;
  prompt: string;
  maxTokens: number;
  logger: Logger;
}

export function displayTokenInfo({
  tokenUsage,
  prompt,
  maxTokens,
  logger,
}: DisplayTokenInfoParams): void {
  const byteLength = Buffer.from(prompt).length;
  const charLength = prompt.length;
  const readableBytes = formatBytes(byteLength);

  logger.info(
    `\n💰 ${chalk.cyan("Estimated cost:")} ${chalk.bold(tokenUsage.estimatedCost)}`,
  );
  logger.info(
    `📊 ${chalk.cyan("Estimated tokens:")} ${chalk.bold(tokenUsage.count)}/${chalk.dim(maxTokens)}`,
  );
  logger.info(
    `📝 ${chalk.cyan("Prompt size:")} ${chalk.bold(readableBytes)} (${chalk.dim(charLength)} chars)`,
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface CheckAILimitsParams {
  tokenUsage: TokenUsage;
  config: Config;
  logger: Logger;
  isClipboardAction?: boolean;
}

export function checkAILimits(params: CheckAILimitsParams): boolean {
  const { tokenUsage, config, logger, isClipboardAction } = params;

  if (isClipboardAction) {
    const maxTokens =
      config.ai.maxClipboardTokens ?? DEFAULT_MAX_CLIPBOARD_TOKENS; // Higher limit for clipboard
    return tokenUsage.count <= maxTokens;
  }

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
