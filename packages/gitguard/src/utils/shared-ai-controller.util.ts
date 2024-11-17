import chalk from "chalk";
import {
  DEFAULT_CONTEXT_LINES,
  DEFAULT_MAX_PROMPT_TOKENS,
} from "../constants.js";
import { TemplateRegistry } from "../services/template/template-registry.js";
import { AIProvider, TokenUsage } from "../types/ai.types.js";
import { Config } from "../types/config.types.js";
import { FileChange } from "../types/git.types.js";
import { Logger } from "../types/logger.types.js";
import {
  LoadedPromptTemplate,
  PromptType,
  TemplateVariables,
} from "../types/templates.type.js";
import { checkAILimits } from "./ai-limits.util.js";
import { copyToClipboard } from "./clipboard.util.js";
import { formatDiffForAI } from "./diff.util.js";
import { selectTemplateChoice } from "./template-choice.util.js";
import { editor } from "@inquirer/prompts";

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
}

export type AIActionType = "skip" | `generate-${string}` | `copy-${string}`;

export interface AIActionHandlerParams<TResult> {
  type: PromptType;
  variables: TemplateVariables;
  generateLabel?: string;
  actionHandler: (
    action: AIActionType,
    templateResult?: TemplateResult,
  ) => Promise<TResult>;
  choices?: Array<{
    label: string;
    value: AIActionType;
    isDefault?: boolean;
    disabled?: boolean;
    disabledReason?: string;
  }>;
  skipAsDefault?: boolean;
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

  logger?.debug("Calculating diff score:", {
    contentLength: content.length,
    isClipboardAction,
    maxTokens,
    hasAI: !!ai,
  });

  if (isClipboardAction) {
    logger?.debug("Using clipboard action score");
    return 2;
  }

  const tokenCount = ai
    ? ai.calculateTokenUsage({ prompt: content }).count
    : Math.ceil(content.length / 4);

  logger?.debug("Token calculation result:", {
    contentLength: content.length,
    tokenCount,
    maxTokens,
    score: tokenCount <= maxTokens ? 1 : 0,
  });

  return tokenCount <= maxTokens ? 1 : 0;
}

interface HandleSimulationParams {
  logger: Logger;
  templateResult: TemplateResult;
}

function truncateMultilineString(text: string, maxLines: number): string {
  const lines = text.split("\n");
  if (lines.length <= maxLines) return text;

  const halfLines = Math.floor(maxLines / 2);
  const firstHalf = lines.slice(0, halfLines);
  const secondHalf = lines.slice(-halfLines);

  return [
    ...firstHalf,
    chalk.yellow(`\n  [...${lines.length - maxLines} more lines...]`),
    ...secondHalf,
  ].join("\n");
}

async function handleSimulation({
  logger,
  templateResult,
}: HandleSimulationParams): Promise<unknown> {
  const { template, renderedPrompt, renderedSystemPrompt, tokenUsage } =
    templateResult;

  logger.info(chalk.cyan("\n📋 Template Preview"));
  logger.info("━".repeat(50));

  // Display model settings
  logger.info(
    chalk.yellow("🎯 Model Settings:") +
      chalk.dim(`\n  Temperature: ${template.ai?.temperature ?? "default"}`) +
      (tokenUsage
        ? chalk.dim(`\n  Estimated Cost: ${tokenUsage.estimatedCost}`)
        : "") +
      (tokenUsage ? chalk.dim(`\n  Token Count: ${tokenUsage.count}`) : ""),
  );

  // Display truncated system prompt
  if (renderedSystemPrompt) {
    const truncatedSystemPrompt = truncateMultilineString(
      renderedSystemPrompt,
      10,
    );
    logger.info(
      chalk.yellow("\n🤖 System Prompt:") +
        chalk.dim(
          `\n${truncatedSystemPrompt
            .split("\n")
            .map((line) => `  ${line}`)
            .join("\n")}`,
        ),
    );
  }

  // Display truncated user prompt
  const truncatedPrompt = truncateMultilineString(renderedPrompt, 10);
  logger.info(
    chalk.yellow("\n💬 User Prompt:") +
      chalk.dim(
        `\n${truncatedPrompt
          .split("\n")
          .map((line) => `  ${line}`)
          .join("\n")}`,
      ),
  );

  logger.info("━".repeat(10));

  try {
    const jsonInput = await editor({
      message: chalk.cyan(
        "\n🤖 Paste the JSON response from your AI assistant (or press Esc to cancel):",
      ),
      postfix: ".json",
    });

    if (!jsonInput) {
      logger.info("User skipped simulation input");
      return undefined;
    }

    try {
      const parsedResponse = JSON.parse(jsonInput) as unknown;
      logger.info(
        chalk.green("\n✅ JSON response received and parsed successfully!"),
      );
      return parsedResponse;
    } catch (error) {
      logger.error("Invalid JSON input. Skipping simulation.");
      logger.debug("JSON parse error:", error);
      return undefined;
    }
  } catch (error) {
    logger.debug("Simulation input error:", error);
    return undefined;
  }
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
  }) ?? {
    count: Math.ceil(prompt.length / 4),
    estimatedCost: "$0.00",
    isWithinApiLimits: true,
    isWithinClipboardLimits: true,
  };

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

// Update the interfaces to include AI and token usage
interface GetTemplateOptionsParams {
  type: PromptType;
  templateRegistry: TemplateRegistry;
  logger: Logger;
  variables: TemplateVariables;
  ai?: AIProvider;
}

interface HandleTemplateActionParams {
  templateId: string;
  requireApi?: boolean;
}

export interface TemplateResult {
  template: LoadedPromptTemplate;
  renderedPrompt: string;
  renderedSystemPrompt: string;
  isApi: boolean;
  label: string;
  tokenUsage?: TokenUsage;
  simulatedResponse?: unknown;
}

function getTemplateOptions(
  params: GetTemplateOptionsParams,
): TemplateResult[] {
  const { type, templateRegistry, logger, variables, ai } = params;

  logger.debug("Getting template options:", {
    type,
    variableKeys: Object.keys(variables),
  });

  const templates = templateRegistry.getTemplatesForType({
    type,
    format: "api",
  });
  const humanTemplates = templateRegistry.getTemplatesForType({
    type,
    format: "human",
  });

  return [...templates, ...humanTemplates].map((template) => {
    const { userPrompt, systemPrompt } = templateRegistry.renderTemplate({
      template,
      variables,
    });

    // Calculate token usage only for API templates
    const tokenUsage =
      template.format === "api" && ai
        ? ai.calculateTokenUsage({
            prompt: systemPrompt + userPrompt,
            options: { isClipboardAction: false },
          })
        : undefined;

    return {
      template,
      renderedPrompt: userPrompt,
      renderedSystemPrompt: systemPrompt,
      isApi: template.format === "api",
      label: template.title
        ? `"${template.title}"`
        : `${template.type} (${template.format})`,
      tokenUsage,
    };
  });
}

export async function handleAIAction<TResult>(
  params: AIActionHandlerParams<TResult> & BaseAIParams,
): Promise<TResult> {
  const {
    type,
    templateRegistry,
    logger,
    variables,
    ai,
    config,
    generateLabel,
    actionHandler,
  } = params;

  logger.debug("Starting AI action handler:", {
    type,
    hasAI: !!ai,
    aiEnabled: config.ai?.enabled,
    aiProvider: config.ai?.provider,
  });

  // Check if AI generation is possible
  const aiStatus = canGenerateAI(config, ai);

  // Pass AI to getTemplateOptions
  const templateOptions = getTemplateOptions({
    type,
    templateRegistry,
    logger,
    variables,
    ai,
  });

  // If using default templates, show pro tip
  if (templateOptions.some((t) => t.template.source === "default")) {
    logger.info(
      chalk.yellow(
        "\n💡 Pro Tip: Using default templates. You can customize templates by running:",
      ) +
        "\n   gitguard template --init" +
        "\n   This will create editable templates in .gitguard/templates/",
    );
  }

  // Group templates by format for easier handling
  const apiTemplates = templateOptions.filter((t) => t.isApi);
  const humanTemplates = templateOptions.filter((t) => !t.isApi);

  logger.debug("Template options prepared:", {
    totalTemplates: templateOptions.length,
    apiTemplatesCount: apiTemplates.length,
    humanTemplatesCount: humanTemplates.length,
  });

  // Extract common template handling logic into a function
  const handleTemplateAction = ({
    templateId,
    requireApi = false,
    isApiClipboard = false,
  }: HandleTemplateActionParams & {
    isApiClipboard?: boolean;
  }): TemplateResult | null => {
    logger.debug("Looking for template:", {
      templateId,
      requireApi,
      isApiClipboard,
      availableTemplates: templateOptions.map((t) => ({
        id: t.template.id,
        isApi: t.isApi,
      })),
    });

    // For API clipboard and generate actions, look for the exact API template
    const template = templateOptions.find((t) => {
      if (isApiClipboard) {
        // Remove the 'api-' prefix if it exists in the templateId
        const searchId = templateId.replace(/^api-/, "");
        return t.isApi && t.template.id === searchId;
      }
      return t.template.id === templateId && (!requireApi || t.isApi);
    });

    if (template) {
      logger.debug("Found template:", {
        id: template.template.id,
        format: template.template.format,
        isApi: template.isApi,
      });
      return template;
    }

    logger.warn(`Template not found:`, {
      templateId,
      requireApi,
      isApiClipboard,
      availableTemplates: templateOptions.map((t) => ({
        id: t.template.id,
        isApi: t.isApi,
      })),
    });
    return null;
  };

  // Use the new selectTemplateChoice instead of building choices manually
  const selectedAction = await selectTemplateChoice({
    type,
    generateLabel: generateLabel ?? "Generate using AI",
    canGenerate: aiStatus.canGenerate,
    disabledReason: aiStatus.reason,
    tokenUsage: {
      estimatedCost: templateOptions[0]?.tokenUsage?.estimatedCost ?? "$0.00",
    },
    templateRegistry,
    logger,
    useKeyboard: true,
    clipboardEnabled: config.ai?.apiClipboard ?? false,
  });

  // Convert string action to AIActionType to maintain type safety
  const action = selectedAction as AIActionType;

  logger.debug("User selected action:", { action });

  // Handle the selected action
  if (action === "skip") {
    logger.debug("Skipping AI action");
    return actionHandler("skip");
  }

  if (
    action.startsWith("copy-") ||
    action.startsWith("generate-") ||
    action.startsWith("copy-api-")
  ) {
    const templateId = action.replace(/^(copy|generate|copy-api)-/, "");
    const requireApi = action.startsWith("generate-");
    const isApiClipboard = action.startsWith("copy-api-");

    const templateResult = handleTemplateAction({
      templateId,
      requireApi,
      isApiClipboard,
    });

    logger.debug("Template result:", { templateResult });

    if (!templateResult) {
      logger.error("Failed to find template for action");
      return actionHandler("skip");
    }

    if (action.startsWith("copy-") || action.startsWith("copy-api-")) {
      await handleClipboardCopy({
        prompt: templateResult.renderedPrompt,
        isApi: action.startsWith("copy-api-") || templateResult.isApi,
        ai,
        config,
        logger,
      });
    }

    if (action.startsWith("copy-api-")) {
      const simulatedResponse = await handleSimulation({
        logger,
        templateResult,
      });

      if (simulatedResponse) {
        // Convert copy-api action to generate action when we have a simulated response
        const generateAction = `generate-${templateId}` as AIActionType;
        return actionHandler(generateAction, {
          ...templateResult,
          simulatedResponse,
        });
      }

      return actionHandler(action, templateResult);
    }

    return actionHandler(action, templateResult);
  }

  logger.debug("No matching action handler, falling back to skip");
  return actionHandler("skip");
}

// Update the return type to include debug info
interface AIGenerateResult {
  canGenerate: boolean;
  reason?: string;
  debug?: {
    hasAI: boolean;
    aiEnabled: boolean;
    provider: "azure" | "openai" | "anthropic" | "custom" | null;
    hasOpenAIKey: boolean;
    hasAzureKey: boolean;
    hasAzureEndpoint: boolean;
    hasAnthropicKey: boolean;
    hasCustomHost: boolean;
  };
}

export function canGenerateAI(
  config: Config,
  ai?: AIProvider,
): AIGenerateResult {
  const debug = {
    hasAI: !!ai,
    aiEnabled: config.ai?.enabled ?? false,
    provider: config.ai?.provider,
    hasOpenAIKey: !!(process.env.OPENAI_API_KEY ?? config.ai?.openai?.apiKey),
    hasAzureKey: !!(
      process.env.AZURE_OPENAI_API_KEY ?? config.ai?.azure?.apiKey
    ),
    hasAzureEndpoint: !!(
      process.env.AZURE_OPENAI_ENDPOINT ?? config.ai?.azure?.endpoint
    ),
    hasAnthropicKey: !!(
      process.env.ANTHROPIC_API_KEY ?? config.ai?.anthropic?.apiKey
    ),
    hasCustomHost: !!(process.env.CUSTOM_AI_HOST ?? config.ai?.custom?.host),
  };

  if (!ai) {
    return {
      canGenerate: false,
      reason: "AI provider not configured",
      debug,
    };
  }

  if (!config.ai?.enabled) {
    return {
      canGenerate: false,
      reason: "AI is disabled in configuration",
      debug,
    };
  }

  if (config.ai.provider === "openai" && !debug.hasOpenAIKey) {
    return {
      canGenerate: false,
      reason: "OpenAI API key not found",
      debug,
    };
  }

  if (config.ai.provider === "azure") {
    if (!debug.hasAzureKey) {
      return {
        canGenerate: false,
        reason: "Azure OpenAI API key not found",
        debug,
      };
    }
    if (!debug.hasAzureEndpoint) {
      return {
        canGenerate: false,
        reason: "Azure OpenAI endpoint not found",
        debug,
      };
    }
  }

  return {
    canGenerate: true,
    debug,
  };
}
