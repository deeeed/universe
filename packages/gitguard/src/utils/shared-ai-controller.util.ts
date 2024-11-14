import chalk from "chalk";
import {
  DEFAULT_CONTEXT_LINES,
  DEFAULT_MAX_PROMPT_TOKENS,
} from "../constants.js";
import { TemplateRegistry } from "../services/template/template-registry.js";
import { AIProvider } from "../types/ai.types.js";
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
}

export type AIActionType = "skip" | `generate-${string}` | `copy-${string}`;

export interface AIActionHandlerParams<TResult> {
  type: PromptType;
  variables: TemplateVariables;
  generateLabel?: string;
  actionHandler: (action: AIActionType, prompt?: string) => Promise<TResult>;
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

interface GetTemplateOptionsParams {
  type: PromptType;
  templateRegistry: TemplateRegistry;
  logger: Logger;
  variables: TemplateVariables;
}

function getTemplateOptions(params: GetTemplateOptionsParams): Array<{
  template: LoadedPromptTemplate;
  renderedPrompt: string;
  isApi: boolean;
  label: string;
}> {
  const { type, templateRegistry, logger, variables } = params;

  logger.debug("Getting template options:", {
    type,
    variableKeys: Object.keys(variables),
  });

  // Get all templates for this type (both API and human)
  const templates = templateRegistry.getTemplatesForType({
    type,
    format: "api",
  });
  const humanTemplates = templateRegistry.getTemplatesForType({
    type,
    format: "human",
  });

  logger.debug("Found templates:", {
    apiCount: templates.length,
    humanCount: humanTemplates.length,
    apiTemplateIds: templates.map((t) => t.id),
    humanTemplateIds: humanTemplates.map((t) => t.id),
  });

  return [...templates, ...humanTemplates].map((template) => {
    logger.debug(`Rendering template ${template.id}:`, {
      format: template.format,
      title: template.title,
    });

    const renderedPrompt = templateRegistry.renderTemplate({
      template,
      variables,
    });

    return {
      template,
      renderedPrompt,
      isApi: template.format === "api",
      label: template.title
        ? `"${template.title}"`
        : `${template.type} (${template.format})`,
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
    choices: customChoices,
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

  // Get all available templates and their rendered prompts
  const templateOptions = getTemplateOptions({
    type,
    templateRegistry,
    logger,
    variables,
  });

  // Group templates by format for easier handling
  const apiTemplates = templateOptions.filter((t) => t.isApi);
  const humanTemplates = templateOptions.filter((t) => !t.isApi);

  logger.debug("Template options prepared:", {
    totalTemplates: templateOptions.length,
    apiTemplatesCount: apiTemplates.length,
    humanTemplatesCount: humanTemplates.length,
  });

  // Build choices for user prompt
  const defaultChoices = [
    ...apiTemplates.map((t) => ({
      label: `Generate using ${t.label} ${!aiStatus.canGenerate ? `(${aiStatus.reason}. Fix by ${getFixSuggestion(aiStatus)})` : ""}`,
      value: `generate-${t.template.id}` as AIActionType,
      isDefault: aiStatus.canGenerate,
      disabled: !aiStatus.canGenerate,
      disabledReason: aiStatus.reason,
    })),
    ...humanTemplates.map((t) => ({
      label: `Copy ${t.label} to clipboard`,
      value: `copy-${t.template.id}` as AIActionType,
      isDefault:
        !aiStatus.canGenerate &&
        humanTemplates[0]?.template.id === t.template.id,
    })),
    {
      label: "Skip",
      value: "skip" as AIActionType,
      isDefault: !aiStatus.canGenerate && humanTemplates.length === 0,
    },
  ];

  const choices = customChoices ?? defaultChoices;

  // Get user choice
  const { action } = await promptActionChoice({
    message: "Choose an action:",
    choices,
    logger,
  });

  logger.debug("User selected action:", { action });

  // Handle the selected action
  if (action === "skip") {
    logger.debug("Skipping AI action");
    return actionHandler("skip");
  }

  interface TemplateResult {
    template: LoadedPromptTemplate;
    renderedPrompt: string;
    isApi: boolean;
    label: string;
  }

  interface HandleTemplateActionParams {
    templateId: string;
    requireApi?: boolean;
  }

  const handleTemplateAction = ({
    templateId,
    requireApi = false,
  }: HandleTemplateActionParams): TemplateResult | null => {
    const template = templateOptions.find(
      (t) => t.template.id === templateId && (!requireApi || t.isApi),
    );
    if (template) {
      logger.debug("Found template:", {
        id: template.template.id,
        format: template.template.format,
      });
      return template;
    }
    logger.warn(`Template not found:`, { templateId, requireApi });
    return null;
  };

  if (action.startsWith("copy-")) {
    const templateId = action.replace("copy-", "");
    const template = handleTemplateAction({ templateId });
    if (template) {
      await handleClipboardCopy({
        prompt: template.renderedPrompt,
        isApi: template.isApi,
        ai,
        config,
        logger,
      });
    }
    return actionHandler("skip");
  }

  if (action.startsWith("generate-")) {
    const templateId = action.replace("generate-", "");
    const template = handleTemplateAction({ templateId, requireApi: true });
    if (template) {
      return actionHandler(action, template.renderedPrompt);
    }
  }

  logger.debug("No matching action handler, falling back to skip");
  return actionHandler("skip");
}

// Add helper function to provide fix suggestions
function getFixSuggestion(aiStatus: AIGenerateResult): string {
  if (!aiStatus.debug) return "checking AI configuration";

  if (!aiStatus.debug.aiEnabled) {
    return "setting ai.enabled=true in config";
  }

  if (aiStatus.debug.provider === "openai" && !aiStatus.debug.hasOpenAIKey) {
    return "setting OPENAI_API_KEY or ai.openai.apiKey in config";
  }

  if (aiStatus.debug.provider === "azure") {
    if (!aiStatus.debug.hasAzureKey) {
      return "setting AZURE_OPENAI_API_KEY or ai.azure.apiKey in config";
    }
    if (!aiStatus.debug.hasAzureEndpoint) {
      return "setting AZURE_OPENAI_ENDPOINT or ai.azure.endpoint in config";
    }
  }

  return "checking AI configuration";
}

// Update the return type to include debug info
interface AIGenerateResult {
  canGenerate: boolean;
  reason?: string;
  debug?: {
    hasAI: boolean;
    aiEnabled: boolean;
    provider: "azure" | "openai" | "ollama" | null;
    hasOpenAIKey: boolean;
    hasAzureKey: boolean;
    hasAzureEndpoint: boolean;
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
