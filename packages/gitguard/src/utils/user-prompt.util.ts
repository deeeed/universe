import { closeSync, openSync } from "fs";
import { ReadStream, WriteStream } from "tty";
import { Config } from "../types/config.types.js";
import { Logger } from "../types/logger.types.js";
import { AIProvider } from "../types/ai.types.js";

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
  const { message, logger, defaultValue = false, forceTTY } = params;

  if (forceTTY) {
    try {
      const { input, output, cleanup } = createTTYStreams();
      output.write(`${message} [${defaultValue ? "Y/n" : "y/N"}] `);

      return new Promise<boolean>((resolve) => {
        input.once("data", (key: string) => {
          cleanup();
          const keyStr = key.toLowerCase();

          if (keyStr === "\r" || keyStr === "\n" || keyStr === "") {
            resolve(defaultValue);
            return;
          }
          if (keyStr === "y") {
            resolve(true);
            return;
          }
          if (keyStr === "n") {
            resolve(false);
            return;
          }
          logger.info("\nInvalid input. Please enter 'y' or 'n'.");
          resolve(promptYesNo(params));
        });
      });
    } catch {
      logger.info(
        "\nNon-interactive environment detected, using default value.",
      );
      return defaultValue;
    }
  } else {
    process.stdout.write(`${message} [${defaultValue ? "Y/n" : "y/N"}] `);

    return new Promise<boolean>((resolve) => {
      const onData = (buffer: Buffer): void => {
        const response = buffer.toString().trim().toLowerCase();
        process.stdin.removeListener("data", onData);

        if (response === "") {
          resolve(defaultValue);
        } else {
          resolve(response === "y" || response === "yes");
        }
      };
      process.stdin.once("data", onData);
    });
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
  const {
    message,
    logger,
    allowEmpty = true,
    defaultValue,
    forceTTY,
    maxValue,
  } = params;

  if (forceTTY) {
    try {
      const { input, output, cleanup } = createTTYStreams();
      output.write(`${message} `);

      return new Promise<string | undefined>((resolve) => {
        input.once("data", (key: string) => {
          cleanup();
          const keyStr = key.trim();

          // Handle cancellation
          if (keyStr.toLowerCase() === "c") {
            logger.info("\nCommit cancelled by user.");
            process.exit(1);
          }

          // Validate numeric input
          const num = parseInt(keyStr, 10);
          if (!isNaN(num) && (!maxValue || (num >= 1 && num <= maxValue))) {
            resolve(String(num));
            return;
          }

          logger.info("\nInvalid input. Please enter a valid number.");
          resolve(promptNumeric(params));
        });
      });
    } catch {
      logger.info(
        "\nNon-interactive environment detected, using default value.",
      );
      return defaultValue;
    }
  } else {
    process.stdout.write(`${message} `);

    return new Promise<string | undefined>((resolve) => {
      const onData = (buffer: Buffer): void => {
        const response = buffer.toString().trim();
        process.stdin.removeListener("data", onData);

        if (allowEmpty && response === "") {
          resolve(defaultValue);
          return;
        }

        const num = parseInt(response);
        if (isNaN(num) || (maxValue && (num < 1 || num > maxValue))) {
          logger.error("Please enter a valid number.");
          resolve(promptNumeric(params));
          return;
        }

        resolve(response);
      };
      process.stdin.once("data", onData);
    });
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

// Add new helper for text input
export async function promptInput(params: {
  message: string;
  logger: Logger;
  defaultValue?: string;
}): Promise<string> {
  const { message, logger, defaultValue } = params;
  logger.info(`${message}${defaultValue ? ` (${defaultValue})` : ""}`);

  return new Promise((resolve) => {
    const onData = (buffer: Buffer): void => {
      const response = buffer.toString().trim();
      process.stdin.removeListener("data", onData);
      resolve((response || defaultValue) ?? "");
    };
    process.stdin.once("data", onData);
  });
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
export async function promptAIAction(params: {
  logger: Logger;
  tokenUsage: {
    count: number;
    estimatedCost: string;
  };
}): Promise<{ action: "generate" | "copy" | "skip" }> {
  const { logger } = params;

  logger.info("\n1. Generate AI suggestions now");
  logger.info("2. Copy prompt to clipboard for manual use");
  logger.info("3. Skip AI suggestions");

  const readline = await import("readline/promises");
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    const answer = await rl.question("\nEnter your choice (number): ");

    switch (answer.trim()) {
      case "1":
        return { action: "generate" };
      case "2":
        return { action: "copy" };
      case "3":
      default:
        return { action: "skip" };
    }
  } finally {
    rl.close();
  }
}

export interface TTYStreams {
  input: ReadStream;
  output: WriteStream;
  fd: number;
  cleanup: () => void;
}

export function createTTYStreams(): TTYStreams {
  const fd = openSync("/dev/tty", "r+");
  const input = new ReadStream(fd);
  const output = new WriteStream(fd);

  input.setRawMode(true);
  input.setEncoding("utf-8");
  input.resume();

  function cleanup(): void {
    input.setRawMode(false);
    input.pause();
    closeSync(fd);
  }

  return { input, output, fd, cleanup };
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
