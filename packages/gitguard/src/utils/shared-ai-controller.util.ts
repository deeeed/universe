import chalk from "chalk";
import { DEFAULT_MAX_PROMPT_TOKENS } from "../constants.js";
import { AIProvider } from "../types/ai.types.js";
import { Config } from "../types/config.types.js";
import { Logger } from "../types/logger.types.js";
import { checkAILimits } from "./ai-limits.util.js";
import { copyToClipboard } from "./clipboard.util.js";

// Base interface for shared dependencies
interface BaseAIParams {
  config: Config;
  logger: Logger;
  ai?: AIProvider;
}

// Specific interfaces extending the base
export interface DiffStrategy {
  name: string;
  content: string;
  score: number;
}

export interface SelectBestDiffParams extends Pick<BaseAIParams, "config"> {
  fullDiff: string;
  prioritizedDiffs: string;
  isClipboardAction: boolean;
}

export interface HandleClipboardCopyParams extends BaseAIParams {
  prompt: string;
  isApi: boolean;
}

export function selectBestDiff({
  fullDiff,
  prioritizedDiffs,
  isClipboardAction,
  config,
}: SelectBestDiffParams): DiffStrategy {
  const diffs: DiffStrategy[] = [
    {
      name: "full",
      content: fullDiff,
      score: isClipboardAction
        ? 2
        : fullDiff.length >
            (config.ai.maxPromptTokens ?? DEFAULT_MAX_PROMPT_TOKENS) / 4
          ? 0
          : 1,
    },
    {
      name: "prioritized",
      content: prioritizedDiffs,
      score: !isClipboardAction && prioritizedDiffs.length > 0 ? 2 : 0,
    },
  ];

  return diffs.reduce((best, current) => {
    if (current.score > best.score) return current;
    if (
      current.score === best.score &&
      current.content.length < best.content.length
    )
      return current;
    return best;
  }, diffs[0]);
}

export async function handleClipboardCopy({
  prompt,
  isApi,
  ai,
  config,
  logger,
}: HandleClipboardCopyParams): Promise<void> {
  const clipboardTokens = ai?.calculateTokenUsage({
    prompt,
    options: { isClipboardAction: true },
  });

  if (!clipboardTokens) {
    logger.error("\n❌ Failed to calculate token usage for clipboard content");
    return;
  }

  if (
    checkAILimits({
      tokenUsage: clipboardTokens,
      config,
      logger,
      isClipboardAction: true,
    })
  ) {
    await copyToClipboard({ text: prompt, logger });
    logger.info("\n✅ AI prompt copied to clipboard!");
    if (isApi) {
      logger.info(
        chalk.dim(
          "\nTip: This prompt will return a JSON response that matches the API format.",
        ),
      );
    } else {
      logger.info(
        chalk.dim(
          "\nTip: Paste this prompt into ChatGPT or similar AI assistant for interactive suggestions.",
        ),
      );
    }
  } else {
    logger.warn("\n⚠️ Content exceeds maximum clipboard token limit");
  }
}
