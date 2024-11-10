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

export type AIProviderName = "azure" | "openai" | "ollama";

interface InitPromptResponses {
  baseBranch: string;
  conventionalCommits: boolean;
  security: boolean;
  enableAI: boolean;
  aiProvider?: AIProviderName;
  aiEndpoint?: string;
  aiDeployment?: string;
  prTemplate: boolean;
  hook: {
    defaultChoice: "keep" | "ai" | "format";
    timeoutSeconds: number;
  };
}

export async function promptForInit(params: {
  logger: Logger;
  currentConfig: Partial<Config> | null;
}): Promise<InitPromptResponses> {
  const { logger, currentConfig } = params;
  const responses: InitPromptResponses = {
    baseBranch: await promptChoice({
      message: "Select your default base branch:",
      choices: [
        { label: "main", value: "main" },
        { label: "master", value: "master" },
        { label: "develop", value: "develop" },
      ],
      logger,
    }),
    conventionalCommits: await promptYesNo({
      message: "Enable Conventional Commits validation?",
      defaultValue: currentConfig?.analysis?.checkConventionalCommits ?? true,
      logger,
    }),
    security: await promptYesNo({
      message: "Enable security checks (secrets and sensitive files)?",
      defaultValue: currentConfig?.security?.enabled ?? true,
      logger,
    }),
    enableAI: await promptYesNo({
      message: "Would you like to enable AI features?",
      defaultValue: currentConfig?.ai?.enabled ?? false,
      logger,
    }),
    prTemplate: await promptYesNo({
      message: "Enable PR template validation?",
      defaultValue: currentConfig?.pr?.template?.required ?? true,
      logger,
    }),
    hook: {
      defaultChoice: await promptChoice<"keep" | "ai" | "format">({
        message: "\nSelect default action for commit hooks:",
        choices: [
          { label: "Keep original message", value: "keep" },
          { label: "Generate with AI", value: "ai" },
          { label: "Use formatted message", value: "format" },
        ],
        logger,
      }),
      timeoutSeconds: parseInt(
        (await promptNumeric({
          message: "Enter timeout for hook prompts (seconds) [30-300]:",
          logger,
          allowEmpty: true,
          defaultValue: currentConfig?.hook?.timeoutSeconds?.toString() ?? "90",
        })) ?? "90",
      ),
    },
  };
  if (responses.enableAI) {
    responses.aiProvider = await promptChoice<AIProviderName>({
      message: "Select AI provider:",
      choices: [
        { label: "Azure OpenAI", value: "azure" },
        { label: "OpenAI", value: "openai" },
        { label: "Ollama", value: "ollama" },
      ],
      logger,
    });

    if (responses.aiProvider !== "openai") {
      responses.aiEndpoint = await promptInput({
        message: `Enter ${responses.aiProvider} endpoint:`,
        defaultValue: responses.aiProvider
          ? getDefaultEndpoint(responses.aiProvider, currentConfig)
          : "",
        logger,
      });
    }

    if (responses.aiProvider) {
      responses.aiDeployment = await promptInput({
        message: `Enter ${responses.aiProvider} model/deployment:`,
        defaultValue: getDefaultDeployment(responses.aiProvider, currentConfig),
        logger,
      });
    }
  }

  return responses;
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

// Helper functions for AI defaults
function getDefaultEndpoint(
  provider: AIProviderName,
  config: Partial<Config> | null,
): string {
  if (provider === "azure") {
    return (
      config?.ai?.azure?.endpoint ?? "https://your-resource.openai.azure.com/"
    );
  }
  if (provider === "ollama") {
    return config?.ai?.ollama?.host ?? "http://localhost:11434";
  }
  return "";
}

export function getDefaultDeployment(
  provider: AIProviderName,
  config: Partial<Config> | null,
): string {
  if (provider === "azure") {
    return config?.ai?.azure?.deployment ?? "gpt-4";
  }
  if (provider === "ollama") {
    return config?.ai?.ollama?.model ?? "codellama";
  }
  if (provider === "openai") {
    return config?.ai?.openai?.model ?? "gpt-4";
  }
  return "";
}

export function getAIConfig(responses: InitPromptResponses): Config["ai"] {
  if (!responses.enableAI) {
    return {
      enabled: false,
      provider: null,
    };
  }

  const provider = responses.aiProvider;
  if (!provider) {
    return {
      enabled: false,
      provider: null,
    };
  }

  switch (provider) {
    case "azure":
      return {
        enabled: true,
        provider: "azure",
        azure: {
          endpoint: responses.aiEndpoint ?? "",
          deployment: responses.aiDeployment ?? "",
          apiVersion: "2024-02-15-preview",
        },
      };
    case "ollama":
      return {
        enabled: true,
        provider: "ollama",
        ollama: {
          host: responses.aiEndpoint ?? "",
          model: responses.aiDeployment ?? "",
        },
      };
    case "openai":
      return {
        enabled: true,
        provider: "openai",
        openai: {
          model: responses.aiDeployment ?? "",
        },
      };
    default:
      return {
        enabled: false,
        provider: null,
      };
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
