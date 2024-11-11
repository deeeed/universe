import chalk from "chalk";
import readline from "readline/promises";
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
  const { suggestions, logger, originalMessage } = params;

  if (originalMessage) {
    logger.info(`\nOriginal message: "${originalMessage}"`);
  }

  suggestions.forEach((suggestion, index) => {
    logger.info(`\n${index + 1}. ${suggestion.message}`);
    logger.info(`   Explanation: ${suggestion.explanation}`);
  });

  const answer = await promptNumeric({
    message: "\nChoose a suggestion number or press Enter to skip:",
    allowEmpty: params.allowEmpty ?? true,
    logger,
  });

  if (!answer) return undefined;

  const index = parseInt(answer) - 1;
  return suggestions[index]?.message;
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
  const { choices, logger } = params;

  const selectedValue = await promptChoice<T>({
    message: params.message,
    choices: choices.map(({ label, value }) => ({ label, value })),
    logger,
  });

  const selectedChoice = choices.find(
    (choice) => choice.value === selectedValue,
  );
  if (selectedChoice) {
    await selectedChoice.action();
  }
}

export async function promptYesNo(params: {
  message: string;
  logger: Logger;
  defaultValue?: boolean;
  forceTTY?: boolean;
}): Promise<boolean> {
  const { message, logger, defaultValue = false } = params;
  const rl = createReadlineInterface();

  try {
    const answer = await rl.question(
      `${message} [${defaultValue ? "Y/n" : "y/N"}] `,
    );
    const response = answer.trim().toLowerCase();

    if (response === "") {
      return defaultValue;
    }
    return response === "y" || response === "yes";
  } catch (error) {
    logger.info("\nNon-interactive environment detected, using default value.");
    return defaultValue;
  } finally {
    rl.close();
  }
}

export async function promptNumeric(params: {
  message: string;
  logger: Logger;
  allowEmpty?: boolean;
  defaultValue?: string;
  forceTTY?: boolean;
  maxValue?: number;
}): Promise<string | undefined> {
  const { message, logger, allowEmpty = true, defaultValue, maxValue } = params;
  const rl = createReadlineInterface();

  try {
    const answer = await rl.question(`${message} `);
    const response = answer.trim();

    // Handle empty input
    if (response === "") {
      if (allowEmpty) {
        return defaultValue;
      }
      logger.error("Please enter a value.");
      return promptNumeric(params);
    }

    // Handle cancellation
    if (response.toLowerCase() === "c") {
      logger.info("\nCommit cancelled by user.");
      process.exit(1);
    }

    // Validate numeric input
    const num = parseInt(response, 10);
    if (isNaN(num) || (maxValue !== undefined && (num < 0 || num > maxValue))) {
      logger.error("Please enter a valid number.");
      return promptNumeric(params);
    }

    return String(num);
  } catch (error) {
    logger.info("\nNon-interactive environment detected, using default value.");
    return defaultValue;
  } finally {
    rl.close();
  }
}

export async function promptChoice<T extends string>(params: {
  message: string;
  choices: Array<{
    label: string;
    value: T;
  }>;
  logger: Logger;
}): Promise<T> {
  const { choices, logger } = params;

  choices.forEach((choice, index) => {
    logger.info(`${index + 1}. ${choice.label}`);
  });

  const answer = await promptNumeric({
    message: "\nEnter your choice (number):",
    allowEmpty: false,
    logger,
    maxValue: choices.length,
  });

  if (!answer) {
    logger.error("Invalid selection. Please try again.");
    return promptChoice(params);
  }

  const index = parseInt(answer) - 1;
  const choice = choices[index];

  if (!choice) {
    logger.error(`Please select a number between 1 and ${choices.length}`);
    return promptChoice(params);
  }

  return choice.value;
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
}): Promise<InitPromptResponses> {
  const { logger, currentConfig } = params;

  logger.info(chalk.cyan("\n🔍 Base Branch Configuration"));
  logger.info("Select the main branch for your repository:");

  const baseBranch = await promptChoice({
    message: "Select base branch:",
    choices: [
      { label: "main - Default branch for new repositories", value: "main" },
      { label: "master - Legacy default branch name", value: "master" },
      { label: "develop - Development branch (GitFlow)", value: "develop" },
    ],
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
  const rl = createReadlineInterface();

  try {
    const prompt = `${message}${defaultValue ? ` (${defaultValue})` : ""}\n`;
    const response = await rl.question(prompt);
    return (response.trim() || defaultValue) ?? "";
  } finally {
    rl.close();
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

// Add new helper function for creating readline interface
function createReadlineInterface(): readline.Interface {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

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

  const choices = [
    `${chalk.yellow("0.")} Keep all changes together`,
    ...suggestions.map(
      (suggestion, index) =>
        `${chalk.green(`${index + 1}.`)} Keep only ${chalk.cyan(suggestion.scope ?? "root")} changes and unstage others`,
    ),
  ];

  logger.info("\n📋 Choose how to proceed:");
  choices.forEach((choice) => logger.info(choice));

  const answer = await promptNumeric({
    message: `\nEnter choice (0-${suggestions.length}):`,
    maxValue: suggestions.length,
    logger,
  });

  return { selection: answer ? parseInt(answer) : 0 };
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

export function displayAISuggestions(params: {
  suggestions: CommitSuggestion[];
  detectedScope?: string;
  logger: Logger;
}): void {
  const { suggestions, detectedScope, logger } = params;
  const scopeDisplay = detectedScope ? `(${detectedScope})` : "";

  logger.info("\n🤖 AI Suggestions:");
  suggestions.forEach((suggestion, index) => {
    const formattedTitle = `${suggestion.type}${scopeDisplay}: ${suggestion.title}`;

    logger.info(
      `\n${chalk.bold.green(`${index + 1}.`)} ${chalk.bold(formattedTitle)}`,
    );
    if (suggestion.message) {
      suggestion.message.split("\n").forEach((paragraph) => {
        logger.info(`   ${chalk.gray(paragraph)}`);
      });
    }
  });
}

interface PromptActionChoice<T extends string> {
  label: string;
  value: T;
  isDefault?: boolean;
}

export async function promptActionChoice<T extends string>(params: {
  message: string;
  choices: PromptActionChoice<T>[];
  logger: Logger;
}): Promise<{ action: T }> {
  const { message, choices, logger } = params;

  logger.info(`\n${message}`);
  choices.forEach((choice, index) => {
    const prefix = choice.isDefault ? chalk.yellow("*") : " ";
    logger.info(`${prefix} ${index + 1}. ${choice.label}`);
  });

  const defaultChoice = choices.findIndex((c) => c.isDefault) + 1;

  const answer = await promptNumeric({
    message: "\nEnter your choice (number):",
    allowEmpty: true,
    maxValue: choices.length,
    defaultValue: defaultChoice ? String(defaultChoice) : "1",
    logger,
  });

  const selectedChoice =
    choices[Number(answer) - 1] ??
    choices.find((c) => c.isDefault) ??
    choices[0];
  return { action: selectedChoice.value };
}
