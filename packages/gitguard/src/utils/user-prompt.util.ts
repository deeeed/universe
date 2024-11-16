import chalk from "chalk";
import { confirm, input, select } from "@inquirer/prompts";
import { AIProvider } from "../types/ai.types.js";
import { CommitSuggestion } from "../types/analysis.types.js";
import { Config } from "../types/config.types.js";
import { Logger } from "../types/logger.types.js";

// Common patterns helpers
export async function displaySuggestions(params: {
  suggestions: Array<{
    message: string;
    explanation: string;
  }>;
  logger: Logger;
  allowEmpty?: boolean;
  originalMessage?: string;
}): Promise<string | undefined> {
  const { suggestions, logger, originalMessage, allowEmpty = true } = params;

  if (originalMessage) {
    logger.info(`\nOriginal message: "${originalMessage}"`);
  }

  try {
    const choices: InquirerChoiceWithDescription<string>[] = suggestions.map(
      (suggestion) => ({
        name: suggestion.message,
        value: suggestion.message,
        description: suggestion.explanation,
      }),
    );

    if (allowEmpty) {
      choices.push({
        name: "Skip",
        value: "",
        description: "Continue without selecting a suggestion",
      });
    }

    const selected = await select({
      message: "Choose a suggestion:",
      choices,
      pageSize: 10,
    });

    return selected || undefined;
  } catch (error) {
    logger.error("Failed to prompt for suggestion:", error);
    return undefined;
  }
}

export async function displayChoicesWithActions<T extends string>(params: {
  message: string;
  choices: Array<{
    label: string;
    value: T;
    action: () => Promise<void>;
  }>;
  logger: Logger;
}): Promise<void> {
  const { choices, logger, message } = params;

  try {
    const inquirerChoices = choices.map(({ label, value }) => ({
      name: label,
      value,
    }));

    const selectedValue = await select({
      message,
      choices: inquirerChoices,
    });

    const selectedChoice = choices.find(
      (choice) => choice.value === selectedValue,
    );
    if (selectedChoice) {
      await selectedChoice.action();
    }
  } catch (error) {
    logger.error("Failed to prompt for choice:", error);
  }
}

export async function promptYesNo(params: {
  message: string;
  logger: Logger;
  defaultValue?: boolean;
  forceTTY?: boolean;
}): Promise<boolean> {
  const { message, defaultValue = false, logger } = params;

  try {
    return await confirm({
      message,
      default: defaultValue,
    });
  } catch (error) {
    logger.info("\nNon-interactive environment detected, using default value.");
    return defaultValue;
  }
}

export async function promptNumeric(params: {
  message: string;
  logger: Logger;
  allowEmpty?: boolean;
  defaultValue?: string;
  maxValue?: number;
}): Promise<string | undefined> {
  const { message, logger, allowEmpty = true, defaultValue, maxValue } = params;

  try {
    const result = await input({
      message,
      default: defaultValue,
      validate: (value) => {
        if (allowEmpty && value === "") return true;
        const num = parseInt(value, 10);
        if (
          isNaN(num) ||
          (maxValue !== undefined && (num < 0 || num > maxValue))
        ) {
          return "Please enter a valid number";
        }
        return true;
      },
    });

    return result || undefined;
  } catch (error) {
    logger.info("\nNon-interactive environment detected, using default value.");
    return defaultValue;
  }
}

export async function promptChoice<T extends string>(params: {
  message: string;
  choices: Array<{
    label: string;
    value: T;
  }>;
  logger: Logger;
  defaultValue?: T;
}): Promise<T> {
  const { choices, defaultValue } = params;

  try {
    const inquirerChoices = choices.map((choice) => ({
      name: `${choice.value === defaultValue ? chalk.yellow("* ") : ""}${choice.label}`,
      value: choice.value,
    }));

    return await select({
      message: params.message,
      choices: inquirerChoices,
      default: choices.findIndex((c) => c.value === defaultValue),
    });
  } catch (error) {
    params.logger.error("Failed to prompt for choice:", error);
    return defaultValue ?? choices[0].value;
  }
}

export type AIProviderName = "azure" | "openai" | "ollama" | "skip";

interface InitPromptResponses {
  baseBranch: string;
  conventionalCommits: boolean;
  security: boolean;
  ai: {
    enabled: boolean;
    provider: AIProviderName | null;
  };
  prTemplate: boolean;
}

export async function promptForInit(params: {
  logger: Logger;
  currentConfig: Partial<Config> | null;
  detectedBaseBranch: string;
}): Promise<InitPromptResponses> {
  const { logger, currentConfig, detectedBaseBranch } = params;

  logger.info(chalk.cyan("\n🔍 Base Branch Configuration"));
  logger.info(`Detected base branch: ${chalk.cyan(detectedBaseBranch)}`);

  const baseBranch = await promptChoice({
    message: "Select base branch:",
    choices: [
      { label: "main - Default branch for new repositories", value: "main" },
      { label: "master - Legacy default branch name", value: "master" },
      { label: "develop - Development branch (GitFlow)", value: "develop" },
    ],
    defaultValue: detectedBaseBranch,
    logger,
  });

  logger.info(chalk.cyan("\n🔍 Code Quality Settings"));
  const conventionalCommits = await promptYesNo({
    message: "Enable Conventional Commits validation?",
    defaultValue: currentConfig?.analysis?.checkConventionalCommits ?? true,
    logger,
  });

  const security = await promptYesNo({
    message: "Enable security checks for secrets and sensitive files?",
    defaultValue: currentConfig?.security?.enabled ?? true,
    logger,
  });

  logger.info(chalk.cyan("\n🤖 AI Configuration"));
  logger.info(
    "AI features help with commit messages, PR descriptions, and code analysis",
  );
  const aiEnabled = await promptYesNo({
    message: "Enable AI features?",
    defaultValue: currentConfig?.ai?.enabled ?? true,
    logger,
  });

  if (aiEnabled) {
    logger.info(
      "\nTo configure AI providers, add their settings to .gitguard/config.json",
    );
    logger.info("and set API keys via environment variables.");
    logger.info("\nSupported providers:");
    logger.info("- Azure OpenAI (AZURE_OPENAI_API_KEY)");
    logger.info("- OpenAI (OPENAI_API_KEY)");
    logger.info("- Ollama (local setup)");
  }

  const prTemplate = await promptYesNo({
    message: "Enable PR template validation?",
    defaultValue: currentConfig?.pr?.template?.required ?? true,
    logger,
  });

  return {
    baseBranch,
    conventionalCommits,
    security,
    ai: {
      enabled: aiEnabled,
      provider: null,
    },
    prTemplate,
  };
}

export async function promptInput(params: {
  message: string;
  logger: Logger;
  defaultValue?: string;
}): Promise<string> {
  const { message, defaultValue } = params;

  try {
    return await input({
      message,
      default: defaultValue,
    });
  } catch (error) {
    return defaultValue ?? "";
  }
}

// Add new interface for promptUser options
export interface PromptUserOptions {
  type: "yesno" | "numeric";
  message: string;
  logger: Logger;
  defaultYes?: boolean;
  allowEmpty?: boolean;
  defaultValue?: string;
  timeoutSeconds?: number;
}

export async function promptUser(
  options: PromptUserOptions,
): Promise<string | boolean> {
  const { type, message, logger, defaultYes, allowEmpty, defaultValue } =
    options;

  if (type === "yesno") {
    return promptYesNo({
      message,
      logger,
      defaultValue: defaultYes,
    });
  }

  const result = await promptNumeric({
    message,
    logger,
    allowEmpty,
    defaultValue,
  });

  return result ?? "";
}

// Add new interface and function for AI prompts
export type AIAction = "generate" | "copy-api" | "copy-manual" | "skip";

interface AICostConfirmationParams {
  logger: Logger;
  provider: AIProvider;
  promptTokens: number;
  estimatedCost: string;
  action: string;
}

export async function confirmAIUsage(
  params: AICostConfirmationParams,
): Promise<boolean> {
  const { logger, provider, promptTokens, estimatedCost, action } = params;

  logger.info("\n📊 AI Usage Details:");
  logger.info(`Provider: ${provider.getName()}`);
  logger.info(`Estimated tokens: ${promptTokens}`);
  logger.info(`Estimated cost: ${estimatedCost}`);

  return promptYesNo({
    message: `\nWould you like to proceed with ${action} using AI?`,
    logger,
    defaultValue: true,
  });
}

export async function promptSplitChoice(params: {
  suggestions: Array<{ scope?: string; files: string[] }>;
  logger: Logger;
}): Promise<{ selection: number }> {
  const { suggestions, logger } = params;

  try {
    const choices = [
      {
        name: `${chalk.yellow("0.")} Keep all changes together`,
        value: 0,
        description: "Proceed with the commit as is",
      },
      ...suggestions.map((suggestion, index) => ({
        name: `${chalk.green(`${index + 1}.`)} Keep only ${chalk.cyan(suggestion.scope ?? "root")} changes and unstage others`,
        value: index + 1,
        description: `${suggestion.files.length} files`,
      })),
    ];

    const selection = await select({
      message: "Choose how to proceed:",
      choices,
      pageSize: 10,
    });

    return { selection };
  } catch (error) {
    logger.error("Failed to prompt for split choice:", error);
    return { selection: 0 };
  }
}

export async function promptCommitSuggestion(params: {
  suggestions: CommitSuggestion[];
  logger: Logger;
}): Promise<CommitSuggestion | undefined> {
  const { suggestions, logger } = params;

  logger.info(
    `\n📝 ${chalk.yellow("Select a suggestion to commit")} (${chalk.cyan(`1-${suggestions.length}`)}):`,
  );

  const answer = await promptNumeric({
    message: "Enter number (or press enter to skip):",
    allowEmpty: true,
    maxValue: suggestions.length,
    logger,
  });

  return answer ? suggestions[parseInt(answer) - 1] : undefined;
}

export function displaySplitSuggestions(params: {
  suggestions: Array<{ scope?: string; message: string; files: string[] }>;
  logger: Logger;
}): void {
  const { suggestions, logger } = params;

  suggestions.forEach((suggestedSplit, index) => {
    logger.info(
      `\n${chalk.bold.green(`${index + 1}.`)} ${chalk.bold.cyan(suggestedSplit.scope ?? "root")}:`,
    );
    logger.info(
      `   ${chalk.dim("Message:")} ${chalk.bold(suggestedSplit.message)}`,
    );
    logger.info(`   ${chalk.dim("Files:")}`);
    suggestedSplit.files.forEach((file) => {
      logger.info(`     ${chalk.dim("•")} ${chalk.gray(file)}`);
    });
  });
}

export async function promptAISuggestions(params: {
  suggestions: CommitSuggestion[];
  detectedScope?: string;
  logger: Logger;
}): Promise<CommitSuggestion | undefined> {
  const { suggestions, detectedScope, logger } = params;
  const scopeDisplay = detectedScope ? `(${detectedScope})` : "";

  try {
    const choices: InquirerChoiceWithDescription<
      CommitSuggestion | undefined
    >[] = [
      ...suggestions.map((suggestion) => ({
        name: `${suggestion.type}${scopeDisplay}: ${suggestion.title}`,
        value: suggestion,
        description: suggestion.message ?? undefined,
      })),
      {
        name: "Skip",
        value: undefined,
        description: "Continue without using any AI suggestion",
      },
    ];

    const selected = await select<CommitSuggestion | undefined>({
      message: "🤖 Select an AI suggestion to commit:",
      choices,
      pageSize: 10,
    });

    return selected;
  } catch (error) {
    logger.error("Failed to prompt for AI suggestion:", error);
    return undefined;
  }
}

// Update PromptActionChoice interface to include isDefault
export interface PromptActionChoice<T> {
  label: string;
  value: T;
  isDefault?: boolean;
  disabled?: boolean;
  disabledReason?: string;
}

// Update promptInquirerChoice to use description
export async function promptInquirerChoice<T>(params: {
  message: string;
  choices: PromptActionChoice<T>[];
  logger: Logger;
  pageSize?: number;
}): Promise<{ action: T }> {
  const { message, choices, logger } = params;

  try {
    const inquirerChoices: InquirerChoiceWithDescription<T>[] = choices.map(
      (choice) => ({
        name: choice.label,
        value: choice.value,
        description: choice.disabledReason,
        disabled: choice.disabled,
      }),
    );

    const selected = await select({
      message,
      choices: inquirerChoices,
      pageSize: params.pageSize ?? 20,
      default: choices.findIndex((c) => c.isDefault),
    });

    return { action: selected };
  } catch (error) {
    logger.error("Failed to prompt for choice:", error);
    process.exit(1);
  }
}

interface InquirerChoiceWithDescription<T> {
  name: string;
  value: T;
  description?: string;
  disabled?: boolean | string;
}
