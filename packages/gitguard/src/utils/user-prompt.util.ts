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
}): Promise<boolean> {
  const { message, defaultValue = false } = params;
  process.stdout.write(`${message} [${defaultValue ? "Y/n" : "y/N"}] `);

  return new Promise((resolve) => {
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

export async function promptNumeric(params: {
  message: string;
  logger: Logger;
  allowEmpty?: boolean;
  defaultValue?: string;
}): Promise<string | undefined> {
  const { message, logger, allowEmpty = true, defaultValue } = params;

  const displayMessage = defaultValue
    ? `${message} (${defaultValue})`
    : message;

  logger.info(displayMessage);

  return new Promise((resolve) => {
    const onData = (buffer: Buffer): void => {
      const response = buffer.toString().trim();
      process.stdin.removeListener("data", onData);

      if (allowEmpty && response === "") {
        resolve(defaultValue);
        return;
      }

      const num = parseInt(response);
      if (isNaN(num)) {
        logger.error("Please enter a valid number");
        process.stdin.once("data", onData);
        return;
      }

      resolve(response);
    };
    process.stdin.once("data", onData);
  });
}

export async function promptChoice<
  T extends string,
  L extends string = string,
>(params: {
  message: string;
  choices: Array<{
    label: L;
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
  });

  if (!answer) {
    throw new Error("No choice selected");
  }

  const index = parseInt(answer) - 1;
  const choice = choices[index];

  if (!choice) {
    throw new Error("Invalid choice selected");
  }

  return choice.value;
}

// Add new types and prompts for init command
interface InitPromptResponses {
  baseBranch: string;
  conventionalCommits: boolean;
  security: boolean;
  enableAI: boolean;
  aiProvider?: "azure" | "openai" | "ollama";
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
        })) || "90",
      ),
    },
  };
  if (responses.enableAI) {
    responses.aiProvider = await promptChoice<"azure" | "openai" | "ollama">({
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
      resolve(response || defaultValue || "");
    };
    process.stdin.once("data", onData);
  });
}

// Helper functions for AI defaults
function getDefaultEndpoint(
  provider: "azure" | "openai" | "ollama",
  config: Partial<Config> | null,
): string {
  if (provider === "azure") {
    return (
      config?.ai?.azure?.endpoint || "https://your-resource.openai.azure.com/"
    );
  }
  if (provider === "ollama") {
    return config?.ai?.ollama?.host || "http://localhost:11434";
  }
  return "";
}

export function getDefaultDeployment(
  provider: "azure" | "openai" | "ollama",
  config: Partial<Config> | null,
): string {
  if (provider === "azure") {
    return config?.ai?.azure?.deployment || "gpt-4";
  }
  if (provider === "ollama") {
    return config?.ai?.ollama?.model || "codellama";
  }
  if (provider === "openai") {
    return config?.ai?.openai?.model || "gpt-4";
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
          endpoint: responses.aiEndpoint || "",
          deployment: responses.aiDeployment || "",
          apiVersion: "2024-02-15-preview",
        },
      };
    case "ollama":
      return {
        enabled: true,
        provider: "ollama",
        ollama: {
          host: responses.aiEndpoint || "",
          model: responses.aiDeployment || "",
        },
      };
    case "openai":
      return {
        enabled: true,
        provider: "openai",
        openai: {
          model: responses.aiDeployment || "",
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

  return result || "";
}

// Add new interface and function for AI prompts
export interface AIPromptResult {
  action: "generate" | "copy" | "skip";
}

export async function promptAIAction(params: {
  logger: Logger;
  tokenUsage: {
    count: number;
    estimatedCost: string;
  };
}): Promise<AIPromptResult> {
  const { logger, tokenUsage } = params;

  logger.info(
    `\n💰 Estimated cost for AI generation: ${tokenUsage.estimatedCost}`,
  );
  logger.info(`📊 Estimated tokens: ${tokenUsage.count}`);

  const choices = [
    {
      label: "Generate AI suggestions now",
      value: "generate" as const,
    },
    {
      label: "Copy prompt to clipboard for manual use",
      value: "copy" as const,
    },
    {
      label: "Skip AI suggestions",
      value: "skip" as const,
    },
  ];

  const action = await promptChoice<AIPromptResult["action"]>({
    message: "🤖 How would you like to proceed with AI suggestions?",
    choices,
    logger,
  });

  return { action };
}