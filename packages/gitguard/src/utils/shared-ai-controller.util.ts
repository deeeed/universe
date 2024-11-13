import chalk from "chalk";
import {
  DEFAULT_CONTEXT_LINES,
  DEFAULT_MAX_PROMPT_TOKENS,
} from "../constants.js";
import { TemplateRegistry } from "../services/template/template-registry.js";
import { AIProvider, TokenUsage } from "../types/ai.types.js";
import { PRStats } from "../types/analysis.types.js";
import { Config } from "../types/config.types.js";
import { CommitInfo, FileChange } from "../types/git.types.js";
import { Logger } from "../types/logger.types.js";
import {
  BaseTemplateVariables,
  PromptTemplate,
  PromptType,
} from "../types/templates.type.js";
import { checkAILimits } from "./ai-limits.util.js";
import { copyToClipboard } from "./clipboard.util.js";
import { formatDiffForAI } from "./diff.util.js";
import { getTemplateBasedChoices } from "./template-choice.util.js";
import { promptActionChoice } from "./user-prompt.util.js";

// Base interface for shared dependencies
interface BaseAIParams {
  config: Config;
  logger: Logger;
  ai?: AIProvider;
  templateRegistry: TemplateRegistry;
}

// Specific interfaces extending the base
export interface DiffStrategy {
  name: string;
  content: string;
  score: number;
}

export interface SelectBestDiffParams extends BaseAIParams {
  fullDiff: string;
  files: FileChange[];
  isClipboardAction?: boolean;
}

export interface HandleClipboardCopyParams {
  prompt: string;
  isApi: boolean;
  ai?: AIProvider;
  config: Config;
  logger: Logger;
  templateRegistry?: TemplateRegistry;
}

export type AIActionType =
  | "generate"
  | "copy-api"
  | "copy-manual"
  | "skip"
  | `copy-${string}`;

export interface AIActionHandlerParams<T> {
  prompt: string;
  humanFriendlyPrompt: string;
  tokenUsage: TokenUsage;
  generateLabel?: string;
  actionHandler: (action: AIActionType) => Promise<T>;
  type: PromptType;
  choices?: Array<{
    label: string;
    value: AIActionType;
    isDefault?: boolean;
    disabled?: boolean;
    disabledReason?: string;
  }>;
}

export interface DiffGenerationParams {
  files: FileChange[];
  diff: string;
  maxLength: number;
  logger: Logger;
}

function calculateDiffScore(params: {
  content: string;
  isClipboardAction: boolean;
  maxTokens: number;
  ai?: AIProvider;
  logger?: Logger;
}): number {
  const { content, isClipboardAction, maxTokens, ai, logger } = params;

  if (isClipboardAction) return 2;

  const tokenCount = ai
    ? ai.calculateTokenUsage({ prompt: content }).count
    : Math.ceil(content.length / 4);

  logger?.debug("Token count for diff:", {
    content: content.length,
    tokenCount,
  });

  return tokenCount <= maxTokens ? 1 : 0;
}

export function selectBestDiff({
  fullDiff,
  files,
  isClipboardAction = false,
  config,
  ai,
  logger,
}: SelectBestDiffParams): DiffStrategy {
  const prioritizedDiffs = formatDiffForAI({
    files,
    diff: fullDiff,
    maxLength: config.ai?.maxPromptTokens ?? DEFAULT_MAX_PROMPT_TOKENS,
    logger,
    options: {
      includeTests: false,
      prioritizeCore: true,
      contextLines: DEFAULT_CONTEXT_LINES,
    },
  });

  const maxTokens = isClipboardAction
    ? (config.ai?.maxPromptTokens ?? DEFAULT_MAX_PROMPT_TOKENS) * 2
    : (config.ai?.maxPromptTokens ?? DEFAULT_MAX_PROMPT_TOKENS);

  logger?.debug("Selecting best diff strategy:", {
    fullDiffLength: fullDiff.length,
    prioritizedDiffLength: prioritizedDiffs.length,
    maxTokens,
    isClipboardAction,
  });

  const fullDiffScore = calculateDiffScore({
    content: fullDiff,
    isClipboardAction,
    maxTokens,
    ai,
    logger,
  });

  const prioritizedDiffScore = calculateDiffScore({
    content: prioritizedDiffs,
    isClipboardAction: false,
    maxTokens,
    ai,
    logger,
  });

  const diffs: DiffStrategy[] = [
    { name: "full", content: fullDiff, score: fullDiffScore },
    {
      name: "prioritized",
      content: prioritizedDiffs,
      score:
        !isClipboardAction && prioritizedDiffs.length > 0
          ? prioritizedDiffScore * 2
          : 0,
    },
  ];

  const selectedDiff = diffs.reduce((best, current) => {
    if (current.score > best.score) return current;
    if (
      current.score === best.score &&
      current.content.length < best.content.length
    )
      return current;
    return best;
  }, diffs[0]);

  logger?.debug("Selected diff strategy:", {
    strategy: selectedDiff.name,
    contentLength: selectedDiff.content.length,
    score: selectedDiff.score,
  });

  return selectedDiff;
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

function getTemplateVariables(params: {
  template: PromptTemplate;
  context: {
    files: FileChange[];
    diff: string;
    commits?: CommitInfo[];
    baseBranch?: string;
    stats?: PRStats;
    message?: string;
    options?: {
      includeTesting?: boolean;
      includeChecklist?: boolean;
    };
  };
}): PromptTemplate["variables"] {
  const { template, context } = params;
  const baseVars: BaseTemplateVariables = {
    files: context.files,
    diff: context.diff,
  };

  switch (template.type) {
    case "commit":
      return {
        ...baseVars,
        commits: context.commits ?? [],
        baseBranch: context.baseBranch ?? "main",
        stats: context.stats,
        template: context.message,
        options: context.options,
      };

    case "split-commit":
      return {
        ...baseVars,
        message: context.message ?? "",
      };

    case "pr":
      return {
        ...baseVars,
        commits: context.commits ?? [],
        baseBranch: context.baseBranch ?? "main",
        stats: context.stats,
        template: context.message,
        options: context.options,
      };

    case "split-pr":
      return {
        ...baseVars,
        commits: context.commits ?? [],
        baseBranch: context.baseBranch ?? "main",
        stats: context.stats,
      };

    default: {
      throw new Error(`Unhandled template type`);
    }
  }
}

export async function handleAIAction<T>({
  prompt,
  humanFriendlyPrompt,
  tokenUsage,
  generateLabel = "Generate content",
  actionHandler,
  config,
  logger,
  ai,
  choices: customChoices,
  type,
  templateRegistry,
  context = {
    files: [],
    diff: "",
    commits: [],
    baseBranch: "main",
  },
}: AIActionHandlerParams<T> &
  BaseAIParams & {
    context?: {
      files: FileChange[];
      diff: string;
      commits?: CommitInfo[];
      baseBranch?: string;
      stats?: PRStats;
      message?: string;
      options?: {
        includeTesting?: boolean;
        includeChecklist?: boolean;
      };
    };
  }): Promise<T> {
  logger.info(`\n💰 Estimated cost: ${tokenUsage.estimatedCost}`);
  logger.info(`📊 Estimated tokens: ${tokenUsage.count}/32000`);
  logger.info(
    `📝 Prompt size: ${(prompt.length / 1024).toFixed(1)} KB (${prompt.length} chars)`,
  );

  if (ai && !checkAILimits({ tokenUsage, config, logger })) {
    return actionHandler("skip");
  }

  const { canGenerate, reason } = canGenerateAI(config, ai);
  logger.debug("AI generation status:", { canGenerate, reason });

  const choices =
    customChoices ??
    getTemplateBasedChoices({
      type,
      generateLabel,
      canGenerate,
      disabledReason: reason,
      tokenUsage,
      templateRegistry,
      logger,
    });

  const { action } = await promptActionChoice<AIActionType>({
    message: "Choose how to proceed:",
    choices: choices.map((choice) => ({
      ...choice,
      value: choice.value as AIActionType,
    })),
    logger,
  });

  if (
    action.startsWith("copy-") &&
    action !== "copy-api" &&
    action !== "copy-manual"
  ) {
    const templateId = action.replace("copy-", "");
    const template = templateRegistry.getTemplateById({ id: templateId });
    if (template) {
      const variables = getTemplateVariables({ template, context });
      const renderedPrompt = templateRegistry.renderTemplate({
        template,
        variables,
      });
      await handleClipboardCopy({
        prompt: renderedPrompt,
        isApi: false,
        ai,
        config,
        logger,
      });
      return actionHandler("skip");
    }
  }

  if (action === "copy-api" || action === "copy-manual") {
    await handleClipboardCopy({
      prompt: action === "copy-api" ? prompt : humanFriendlyPrompt,
      isApi: action === "copy-api",
      ai,
      config,
      logger,
    });
    return actionHandler("skip");
  }

  return actionHandler(action);
}

export function canGenerateAI(
  config: Config,
  ai?: AIProvider,
): {
  canGenerate: boolean;
  reason?: string;
} {
  if (!ai) {
    return {
      canGenerate: false,
      reason: "AI provider not configured",
    };
  }

  if (!config.ai?.enabled) {
    return {
      canGenerate: false,
      reason: "AI is disabled in configuration",
    };
  }

  // Check both environment variables and config values
  if (config.ai.provider === "openai") {
    if (!process.env.OPENAI_API_KEY && !config.ai.openai?.apiKey) {
      return {
        canGenerate: false,
        reason: "OpenAI API key not found",
      };
    }
  }

  if (config.ai.provider === "azure") {
    if (!process.env.AZURE_OPENAI_API_KEY && !config.ai.azure?.apiKey) {
      return {
        canGenerate: false,
        reason: "Azure OpenAI API key not found",
      };
    }
    if (!process.env.AZURE_OPENAI_ENDPOINT && !config.ai.azure?.endpoint) {
      return {
        canGenerate: false,
        reason: "Azure OpenAI endpoint not found",
      };
    }
  }

  return { canGenerate: true };
}
