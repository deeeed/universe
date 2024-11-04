/**
 * Git Prepare Commit Hook
 *
 * Note on TTY handling:
 * Git hooks don't always run in a TTY context, especially in GUI clients or CI environments.
 * We duplicate the prompt logic here (instead of using ../utils/user-prompt.util.ts) to:
 * 1. Explicitly handle TTY availability
 * 2. Provide fallback mechanisms when TTY isn't available
 * 3. Ensure proper resource cleanup
 * 4. Handle timeouts appropriately in non-interactive environments
 *
 * This is separate from the regular CLI prompts in user-prompt.util.ts which assume
 * a TTY is always available.
 */

import chalk from "chalk";
import { closeSync, openSync } from "fs";
import { ReadStream, WriteStream } from "tty";
import { CommitService } from "../services/commit.service.js";
import { AIFactory } from "../services/factories/ai.factory.js";
import { GitService } from "../services/git.service.js";
import { LoggerService } from "../services/logger.service.js";
import { SecurityService } from "../services/security.service.js";
import { AIProvider } from "../types/ai.types.js";
import { CommitSplitSuggestion } from "../types/analysis.types.js";
import { Config } from "../types/config.types.js";
import { SecurityFinding } from "../types/security.types.js";
import { copyToClipboard } from "../utils/clipboard.util.js";
import { loadConfig } from "../utils/config.util.js";

interface CommitHookOptions {
  messageFile: string;
  config?: Config;
  forceTTY?: boolean;
}

interface HandleSecurityFindingsParams {
  secretFindings: SecurityFinding[];
  fileFindings: SecurityFinding[];
  logger: LoggerService;
  git: GitService;
}

// Add interfaces for different prompt types
interface BasePromptOptions {
  message: string;
  timeoutSeconds?: number;
}

interface YesNoPromptOptions extends BasePromptOptions {
  type: "yesno";
  defaultYes?: boolean;
}

interface NumericPromptOptions extends BasePromptOptions {
  type: "numeric";
  allowEmpty?: boolean;
  defaultValue?: string;
  maxValue: number;
}

type PromptOptions = YesNoPromptOptions | NumericPromptOptions;

interface TTYStreams {
  input: ReadStream;
  output: WriteStream;
  fd: number;
  isActive: boolean;
  dispose: () => void;
}

interface CreateTTYStreamsParams {
  logger: LoggerService;
}

function createTTYStreams({ logger }: CreateTTYStreamsParams): TTYStreams {
  try {
    const fd = openSync("/dev/tty", "r+");
    const input = new ReadStream(fd);
    const output = new WriteStream(fd);
    let isActive = true;

    input.setRawMode(true);
    input.setEncoding("utf-8");
    input.resume();

    // Centralized cleanup function
    const cleanup = (): void => {
      if (!isActive) return;

      input.setRawMode(false);
      input.pause();
      closeSync(fd);
      isActive = false;

      logger.debug("TTY streams cleaned up");
    };

    // Handle SIGINT (Ctrl+C) globally for this TTY
    const handleSigInt = (data: string): void => {
      if (data === "\x03") {
        output.write("\n\n❌ Operation cancelled by user (Ctrl+C)\n");
        cleanup();
        process.exit(1);
      }
    };

    input.on("data", handleSigInt);

    // Handle process exit
    process.once("exit", cleanup);
    process.once("SIGTERM", cleanup);
    process.once("SIGINT", cleanup);

    const tty: TTYStreams = {
      input,
      output,
      fd,
      get isActive(): boolean {
        return isActive;
      },
      dispose: cleanup,
    };

    return tty;
  } catch (error) {
    logger.debug("Failed to open /dev/tty:", error);
    throw error;
  }
}

interface PromptUserParams {
  options: PromptOptions;
  logger: LoggerService;
  context: PrepareCommitContext;
}

async function promptUser({
  options,
  logger,
  context,
  prompt,
}: PromptUserParams & { prompt?: string }): Promise<string | boolean> {
  return new Promise((resolve) => {
    try {
      if (!context.tty?.isActive) {
        context.tty = createTTYStreams({ logger });
      }

      const { input, output } = context.tty;
      let isActive = true;

      const cleanup = (): void => {
        if (!isActive) return;
        logger.debug("Cleaning up prompt...");
        isActive = false;
        input.removeAllListeners("data");
        if (context.tty?.isActive) {
          output.write("\n");
        }
      };

      // Display initial prompt only once
      if (prompt) {
        output.write(prompt);
      }

      if (options.type === "yesno") {
        const message = options.message || "Would you like to proceed?";
        output.write(`${message} (Y/n): `);
      } else if (options.type === "numeric") {
        output.write(`Enter your choice (1-${options.maxValue} or c): `);
      }

      const handleInput = (data: unknown): void => {
        if (!isActive || !context.tty?.isActive) return;

        const inputStr =
          typeof data === "string"
            ? data
            : Buffer.isBuffer(data)
              ? data.toString()
              : String(data);

        logger.debug("Received input:", {
          raw: data,
          parsed: inputStr,
          charCodes: Array.from(inputStr).map((c) => c.charCodeAt(0)),
          isActive,
          ttyActive: context.tty?.isActive,
        });

        // Handle Ctrl+C
        if (inputStr === "\u0003") {
          cleanup();
          output.write("\n\n❌ Operation cancelled by user (Ctrl+C)\n");
          process.exit(1);
        }

        if (options.type === "yesno") {
          // Immediate validation for yes/no
          const char = inputStr.toLowerCase();

          if (char === "\r" || char === "\n") {
            cleanup();
            output.write("yes\n");
            logger.debug("Resolving with default yes");
            resolve(true);
            return;
          }

          if (char === "y") {
            cleanup();
            output.write("yes\n");
            logger.debug("Resolving with yes");
            resolve(true);
            return;
          }

          if (char === "n") {
            cleanup();
            output.write("no\n");
            logger.debug("Resolving with no");
            resolve(false);
            return;
          }

          return;
        }

        // Handle numeric input
        if (options.type === "numeric") {
          const char = inputStr.toLowerCase();

          if (char === "c") {
            cleanup();
            output.write("cancelled\n");
            logger.debug("Resolving with cancel");
            resolve("c");
            return;
          }

          const num = parseInt(char, 10);
          if (!isNaN(num) && num >= 1 && num <= options.maxValue) {
            cleanup();
            output.write(`${num}\n`);
            logger.debug("Resolving with number:", num);
            resolve(num.toString());
            return;
          }

          if (char === "\r" || char === "\n") {
            if (options.defaultValue) {
              cleanup();
              output.write(`${options.defaultValue}\n`);
              logger.debug("Resolving with default:", options.defaultValue);
              resolve(options.defaultValue);
              return;
            }
          }

          // Ignore invalid input
          return;
        }
      };

      logger.debug("Setting up input handler");
      input.on("data", handleInput);

      // Cleanup handlers
      process.once("exit", () => {
        logger.debug("Process exit cleanup");
        cleanup();
      });
      process.once("SIGINT", () => {
        logger.debug("SIGINT cleanup");
        cleanup();
      });
      process.once("SIGTERM", () => {
        logger.debug("SIGTERM cleanup");
        cleanup();
      });
    } catch (error) {
      logger.error("Failed to create interactive prompt:", error);
      if (options.type === "yesno") {
        logger.info(
          "\n⚠️ Non-interactive environment detected, using default: Yes",
        );
        resolve(true);
      } else {
        logger.info(
          "\n⚠️ Non-interactive environment detected, using default: 1",
        );
        resolve("1");
      }
    }
  });
}

// Update displayAICostEstimate to use AIProvider type
async function displayAICostEstimate(params: {
  ai: AIProvider;
  git: GitService;
  logger: LoggerService;
}): Promise<void> {
  const { ai, git, logger } = params;
  const diff = await git.getStagedDiff();
  const tokenUsage = ai.calculateTokenUsage({ prompt: diff });

  logger.info(
    `\n💰 ${chalk.cyan("Estimated cost for AI generation:")} ${chalk.bold(tokenUsage.estimatedCost)}`,
  );
  logger.info(
    `📊 ${chalk.cyan("Estimated tokens:")} ${chalk.bold(tokenUsage.count)}`,
  );
}

async function handleUnstageFiles(params: {
  files: string[];
  git: GitService;
  logger: LoggerService;
}): Promise<void> {
  const { files, git, logger } = params;
  const unstageCommand = `git reset HEAD ${files.map((f) => `"${f}"`).join(" ")}`;

  try {
    // Try to copy to clipboard
    await copyToClipboard({ text: unstageCommand, logger });
    logger.error("\n❌ Commit aborted. To fix:");
    logger.error(
      "1. Command to unstage sensitive files has been copied to your clipboard:",
    );
    logger.error(`   ${unstageCommand}`);
    logger.error("2. Paste and run the command");
  } catch {
    logger.error("\n❌ Commit aborted. To fix:");
    logger.error("1. Run this command to unstage sensitive files:");
    logger.error(`   ${unstageCommand}`);
  }

  logger.error("3. Add sensitive files to .gitignore if needed");
  logger.error("4. Run 'git commit' again to create a clean commit");

  await git.unstageFiles({ files });
}

interface Choice {
  label: string;
  value: "keep" | "ai" | "format";
  action: () => Promise<void>;
}

async function handleSplitSuggestion({
  suggestion,
  logger,
  context,
}: {
  suggestion: CommitSplitSuggestion;
  logger: LoggerService;
  git: GitService;
  context: PrepareCommitContext;
}): Promise<void> {
  logger.info(`\n${chalk.yellow("📦")} Multiple package changes detected:`);
  logger.info(chalk.yellow(suggestion.reason));

  suggestion.suggestions.forEach((suggestedSplit, index: number) => {
    logger.info(
      `\n${chalk.bold.green(`${index + 1}.`)} ${chalk.bold.cyan(suggestedSplit.scope || "root")}:`,
    );
    logger.info(
      `   ${chalk.dim("Message:")} ${chalk.bold(suggestedSplit.message)}`,
    );
    logger.info(`   ${chalk.dim("Files:")}`);
    suggestedSplit.files.forEach((file) => {
      logger.info(`     ${chalk.dim("•")} ${chalk.gray(file)}`);
    });
  });

  const shouldSplit = await promptUser({
    options: {
      type: "yesno",
      message: "\n🤔 Would you like to split this commit by package?",
      defaultYes: true,
    },
    logger,
    context,
  });

  if (shouldSplit) {
    logger.info("\n📋 Commands to execute:");
    try {
      await copyToClipboard({
        text: suggestion.commands.join("\n"),
        logger,
      });
      logger.info(
        chalk.green("Commands copied to clipboard! Execute them in order:"),
      );
    } catch {
      logger.info("Execute these commands in order:");
    }

    suggestion.commands.forEach((cmd: string) => {
      logger.info(chalk.gray(cmd));
    });

    process.exit(1);
  }
}

export async function handleSecurityFindings({
  secretFindings,
  fileFindings,
  logger,
  git,
  context,
}: HandleSecurityFindingsParams & {
  context: PrepareCommitContext;
}): Promise<void> {
  const affectedFiles = new Set<string>();

  if (secretFindings.length) {
    logger.error(
      `\n${chalk.bold.red("⚠️ CRITICAL:")} ${chalk.bold("Potential sensitive data detected:")}`,
    );

    // Group findings by file for better readability
    const findingsByFile = secretFindings.reduce(
      (acc, finding) => {
        if (!acc[finding.path]) acc[finding.path] = [];
        acc[finding.path].push(finding);
        affectedFiles.add(finding.path);
        return acc;
      },
      {} as Record<string, SecurityFinding[]>,
    );

    // Display findings grouped by file
    for (const [file, findings] of Object.entries(findingsByFile)) {
      logger.error(`\n${chalk.yellow("📁")} ${chalk.bold.underline(file)}`);
      for (const finding of findings) {
        logger.error(
          `${chalk.red("▶")} ${chalk.bold(finding.type)}${finding.line ? chalk.dim(` (line ${finding.line})`) : ""}:`,
        );
        if (finding.content) {
          logger.error(`   ${chalk.red.dim(finding.content)}`);
        }
        logger.error(`   ${chalk.cyan("→")} ${finding.suggestion}`);
      }
    }

    logger.info("\n🛡️  Security Recommendations:");
    logger.info(
      `   ${chalk.dim("•")} Review the detected patterns for false positives`,
    );
    logger.info(`   ${chalk.dim("•")} Use environment variables for secrets`);
    logger.info(`   ${chalk.dim("•")} Consider using a secret manager`);
    logger.info(`   ${chalk.dim("•")} Update any exposed secrets immediately`);

    const shouldProceed = await promptUser({
      options: {
        type: "yesno",
        message: "\n⚠️  Detected potential secrets. Proceed with commit?",
        defaultYes: false,
      },
      logger,
      context,
    });

    if (!shouldProceed) {
      await handleUnstageFiles({
        files: Array.from(affectedFiles),
        git,
        logger,
      });
      process.exit(1);
    }
  }

  if (fileFindings.length) {
    logger.error("\n📁 WARNING: Potentially problematic new files detected:");

    // Display each problematic file with its suggestion
    for (const finding of fileFindings) {
      logger.error(`\n⚠  File: ${finding.path}`);
      logger.error(`   Suggestion: ${finding.suggestion}`);
      affectedFiles.add(finding.path);
    }

    logger.info("\n📋 Recommendations for Files:");
    logger.info("   • Consider adding sensitive files to .gitignore");
    logger.info("   • Use example files for templates (e.g., .env.example)");
    logger.info("   • Consider using git-crypt for encrypted files");

    const shouldProceed = await promptUser({
      options: {
        type: "yesno",
        message:
          "\n⚠️  Detected potentially sensitive files. Proceed with commit?",
        defaultYes: false,
      },
      logger,
      context,
    });

    if (!shouldProceed) {
      await handleUnstageFiles({
        files: Array.from(affectedFiles),
        git,
        logger,
      });
      process.exit(1);
    }
  }
}

interface PrepareCommitContext {
  tty?: TTYStreams;
  logger: LoggerService;
  // ... other context properties
}

async function displaySuggestions({
  suggestions,
  logger,
  allowEmpty,
  originalMessage,
  context,
}: {
  suggestions: Array<{
    message: string;
    explanation: string;
  }>;
  logger: LoggerService;
  allowEmpty: boolean;
  originalMessage: string;
  context: PrepareCommitContext;
}): Promise<string | undefined> {
  logger.info(
    `\n${chalk.dim("Original message:")} ${chalk.cyan(`"${originalMessage}"`)})\n`,
  );

  suggestions.forEach((suggestion, index) => {
    logger.info(
      `\n${chalk.bold.green(`${index + 1}.`)} ${chalk.bold(suggestion.message)}`,
    );
    logger.info(`   ${chalk.dim("Explanation:")} ${suggestion.explanation}`);
  });

  const answer = await promptUser({
    options: {
      type: "numeric",
      maxValue: suggestions.length,
      message: `\n${chalk.yellow("?")} Choose a suggestion number or press Enter to skip:`,
      allowEmpty,
    },
    logger,
    context,
  });

  if (!answer) return undefined;

  const index = parseInt(String(answer)) - 1;
  return suggestions[index]?.message;
}

export async function prepareCommit(options: CommitHookOptions): Promise<void> {
  if (
    process.env.SKIP_GITGUARD === "true" ||
    process.env.GITGUARD_SKIP === "true"
  ) {
    process.exit(0);
  }

  const logger = new LoggerService({
    debug: process.env.GITGUARD_DEBUG === "true" || options.config?.debug,
  });

  // Create context object to share TTY
  const context: PrepareCommitContext = {
    logger,
  };

  // Create TTY once if in interactive mode
  if (process.stdin.isTTY || options.forceTTY) {
    try {
      context.tty = createTTYStreams({ logger });
    } catch (error) {
      logger.debug("Failed to create TTY streams:", error);
    }
  }

  try {
    // Load configuration, but prefer passed config if available
    logger.debug("Loading configuration...");
    const config = options.config || (await loadConfig());
    logger.debug("Configuration loaded:", config);

    // Initialize services with the correct working directory
    logger.debug("Initializing services...");
    const git = new GitService({
      config: {
        ...config.git,
        cwd: options.config?.git.cwd || process.cwd(),
      },
      logger,
    });
    const security = config.security?.enabled
      ? new SecurityService({ logger, config })
      : undefined;
    const ai = config.ai?.enabled
      ? AIFactory.create({ config, logger })
      : undefined;

    // Get staged changes and diff first
    const files = await git.getStagedChanges();
    const diff = await git.getStagedDiff();

    // Run security checks ONLY ONCE
    const securityResult = security?.analyzeSecurity({ files, diff });

    if (
      securityResult?.secretFindings.length ||
      securityResult?.fileFindings.length
    ) {
      await handleSecurityFindings({
        secretFindings: securityResult?.secretFindings,
        fileFindings: securityResult?.fileFindings,
        logger,
        git,
        context,
      });
    }

    // Initialize CommitService with the security result
    const commitService = new CommitService({
      config,
      git,
      security,
      ai,
      logger,
    });

    // Make analysis mutable
    let analysis = await commitService.analyze({
      messageFile: options.messageFile,
      enableAI: false, // Don't generate AI suggestions yet
      enablePrompts: true,
      securityResult,
    });

    // Handle security findings first
    if (analysis.warnings.some((w) => w.type === "security")) {
      const securityFindings: SecurityFinding[] = analysis.warnings
        .filter((w) => w.type === "security")
        .map((w) => ({
          type: "secret" as const,
          severity: w.severity === "error" ? "high" : "medium",
          path: w.message,
          suggestion: w.message,
        }));

      await handleSecurityFindings({
        secretFindings: securityFindings,
        fileFindings: [],
        logger,
        git,
        context,
      });
    }

    // Check for split suggestions before other options
    if (analysis.splitSuggestion) {
      await handleSplitSuggestion({
        suggestion: analysis.splitSuggestion,
        logger,
        git,
        context,
      });
    }

    // If we get here, user didn't choose to split, show regular options
    const choices: Choice[] = [
      {
        label: "Keep original message",
        value: "keep",
        action: async (): Promise<void> => {
          await Promise.resolve();
          logger.debug("📝 Keeping original message");
          process.exit(0); // Immediate exit for keep
        },
      },
    ];

    if (ai) {
      choices.push({
        label: "Generate commit message with AI",
        value: "ai",
        action: async () => {
          logger.debug("🤖 Starting AI message generation");

          if (!analysis.suggestions) {
            await displayAICostEstimate({ ai, git, logger });

            const shouldProceed = await promptUser({
              options: {
                type: "yesno",
                message:
                  "\n🤖 Would you like to proceed with AI suggestion generation?",
                defaultYes: true,
              },
              logger,
              context,
            });

            if (!shouldProceed) {
              logger.info("\n❌ AI generation cancelled");
              process.exit(1);
            }

            logger.info("\n⏳ Generating AI suggestions...");
            analysis = await commitService.analyze({
              messageFile: options.messageFile,
              enableAI: true,
              enablePrompts: true,
            });
          }

          if (analysis.suggestions) {
            const message = await displaySuggestions({
              suggestions: analysis.suggestions,
              logger,
              allowEmpty: false,
              originalMessage: analysis.originalMessage,
              context,
            });
            if (message) {
              logger.debug(
                "✍️ Updating commit message with AI suggestion:",
                message,
              );
              await git.updateCommitMessage({
                file: options.messageFile,
                message,
              });
              process.exit(0);
            } else {
              logger.debug("❌ No AI suggestion selected");
              process.exit(1);
            }
          } else {
            logger.error("❌ Failed to generate AI suggestions");
            process.exit(1);
          }
        },
      });
    }

    choices.push({
      label: `Use formatted message: "${analysis.formattedMessage}"`,
      value: "format",
      action: async () => {
        logger.debug("✨ Using formatted message:", analysis.formattedMessage);
        await git.updateCommitMessage({
          file: options.messageFile,
          message: analysis.formattedMessage,
        });
        logger.debug("✅ Commit message updated successfully");
        process.exit(0);
      },
    });

    // Display choices once
    logger.info("\n🤔 Choose how to proceed with your commit:");
    choices.forEach((choice, index) => {
      logger.info(`${chalk.bold.green(`${index + 1}.`)} ${choice.label}`);
    });
    logger.info(`${chalk.bold.red("c.")} Cancel commit`);

    const answer = await promptUser({
      options: {
        type: "numeric",
        maxValue: choices.length,
        message: `\nEnter your choice (1-${choices.length}) or 'c' to cancel:`,
      },
      logger,
      context,
    });

    logger.debug("Selected choice:", { answer, type: typeof answer });

    // Handle cancellation
    if (answer === "c") {
      logger.info("\n❌ Operation cancelled by user");
      process.exit(1);
    }

    const index = parseInt(String(answer)) - 1;
    if (choices[index]) {
      logger.debug("Starting action execution for choice:", {
        choice: choices[index].value,
      });
      try {
        await choices[index].action();
      } catch (error) {
        logger.error("Action failed:", error);
        process.exit(1);
      }
    } else {
      logger.error("Invalid choice:", { index });
      process.exit(1);
    }
  } catch (error) {
    logger.error("Hook failed:", error);
  } finally {
    // Cleanup TTY at the end
    if (context.tty?.isActive) {
      context.tty.dispose();
    }
    process.exit(1);
  }
}
