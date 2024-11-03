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
import readline from "readline";
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
import { loadConfig } from "../utils/config.util.js";
import { copyToClipboard } from "../utils/clipboard.util.js";

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

interface DisplaySuggestionsParams {
  suggestions: Array<{
    message: string;
    explanation: string;
  }>;
  logger: LoggerService;
  prompt: string;
  ai?: AIProvider;
  git?: GitService;
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
}

type PromptOptions = YesNoPromptOptions | NumericPromptOptions;

interface TTYStreams {
  input: ReadStream | NodeJS.ReadStream;
  output: WriteStream | NodeJS.WriteStream;
  fd?: number;
  isTTY?: boolean;
}

interface CreateTTYStreamsParams {
  logger: LoggerService;
}

function createTTYStreams({ logger }: CreateTTYStreamsParams): TTYStreams {
  logger.debug("🔍 TTY Status:", {
    stdin: process.stdin.isTTY,
    stdout: process.stdout.isTTY,
    stderr: process.stderr.isTTY,
    env: {
      NODE_ENV: process.env.NODE_ENV,
      TERM: process.env.TERM,
    },
  });

  // First try to use process.stdin/stdout if they're TTY
  if (process.stdin.isTTY && process.stdout.isTTY) {
    logger.debug("✅ Using process.stdin/stdout TTY streams");
    return {
      input: process.stdin,
      output: process.stdout,
      isTTY: true,
    };
  }

  // If not TTY, try to open /dev/tty explicitly
  try {
    logger.debug("⚠️ Process streams not TTY, attempting to open /dev/tty...");
    const fd = openSync("/dev/tty", "r+");
    const input = new ReadStream(fd);
    const output = new WriteStream(fd);

    logger.debug("TTY Stream Status:", {
      fd,
      inputReadable: input.readable,
      outputWritable: output.writable,
    });

    // Verify streams are writable
    if (input.readable && output.writable) {
      logger.debug("✅ Successfully opened /dev/tty streams");
      return { input, output, fd, isTTY: true };
    }

    // If not writable, clean up and fall back
    logger.debug("❌ TTY streams not writable");
    closeSync(fd);
    throw new Error("TTY streams not writable");
  } catch (error) {
    logger.debug("❌ Failed to open TTY:", { error });
    logger.debug("⚠️ Falling back to non-interactive mode");
    return {
      input: process.stdin,
      output: process.stdout,
      isTTY: false,
    };
  }
}

interface PromptUserParams {
  options: PromptOptions;
  logger: LoggerService;
}

async function promptUser({
  options,
  logger,
}: PromptUserParams): Promise<string | boolean> {
  return new Promise((resolve) => {
    logger.debug("🎯 Initializing prompt:", { options });
    const streams = createTTYStreams({ logger });

    logger.debug("📥 Prompt streams:", {
      isTTY: streams.isTTY,
      hasFd: streams.fd !== undefined,
    });

    const rl = readline.createInterface({
      input: streams.input,
      output: streams.output,
      terminal: true,
    });

    const cleanup = (): void => {
      rl.close();
      if (streams.fd !== undefined) {
        try {
          closeSync(streams.fd);
        } catch (error) {
          console.warn("Failed to close TTY:", error);
        }
      }
    };

    const suffix =
      options.type === "yesno"
        ? options.defaultYes
          ? chalk.gray("[Y/n] ")
          : chalk.gray("[y/N] ")
        : "";

    const prompt = `${chalk.cyan(options.message)} ${suffix}`;

    // Write prompt directly to ensure it's displayed
    streams.output.write(prompt);

    rl.on("line", (answer) => {
      const normalized = answer.toLowerCase().trim();
      cleanup();

      if (options.type === "yesno") {
        if (options.defaultYes) {
          resolve(normalized !== "n" && normalized !== "no");
        } else {
          resolve(normalized === "y" || normalized === "yes");
        }
      } else {
        resolve(normalized);
      }
    });

    // Handle Ctrl+C
    rl.on("SIGINT", () => {
      cleanup();
      process.exit(130);
    });

    // If no input is provided within 90 seconds, notify user and use default
    const timeoutDuration = (options.timeoutSeconds || 90) * 1000;
    setTimeout(() => {
      streams.output.write(
        `\n${chalk.yellow("⏰ No input received after")} ${chalk.bold(timeoutDuration / 1000)} ${chalk.yellow("seconds. Using default value.")}\n`,
      );
      cleanup();

      if (options.type === "numeric" && options.defaultValue) {
        streams.output.write(`${chalk.cyan("Using default choice")}\n`);
        resolve(options.defaultValue);
      } else if (options.type === "yesno") {
        const defaultValue = !!options.defaultYes;
        streams.output.write(
          `${chalk.cyan("Using default:")} ${chalk.bold(defaultValue ? "Yes" : "No")}\n`,
        );
        resolve(defaultValue);
      } else if (options.allowEmpty) {
        streams.output.write(chalk.cyan("Using empty value\n"));
        resolve("");
      } else {
        streams.output.write(`${chalk.red("❌ Input required. Aborting.")}\n`);
        process.exit(1);
      }
    }, timeoutDuration);
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

// Update DisplaySuggestionsParams interface
export async function displaySuggestions(
  params: DisplaySuggestionsParams,
): Promise<string | undefined> {
  const { suggestions, logger, ai, git } = params;

  // Show cost estimate before generating suggestions
  if (ai && git) {
    await displayAICostEstimate({ ai, git, logger });

    const shouldProceed = await promptUser({
      options: {
        type: "yesno",
        message:
          "\n🤖 Would you like to proceed with AI suggestion generation?",
        defaultYes: true,
      },
      logger,
    });

    if (!shouldProceed) {
      return undefined;
    }
  }

  suggestions.forEach((suggestion, index) => {
    logger.info(
      `\n${chalk.cyan(index + 1)}. ${chalk.bold(suggestion.message)}`,
    );
    logger.info(`   ${chalk.gray("Explanation:")} ${suggestion.explanation}`);
  });

  const answer = await promptUser({
    options: {
      type: "numeric",
      message: `\n${chalk.cyan("Choose a suggestion number or press Enter to skip:")}`,
      allowEmpty: true,
    },
    logger,
  });

  if (typeof answer !== "string" || !answer || isNaN(parseInt(answer))) {
    return undefined;
  }

  const index = parseInt(answer) - 1;
  return suggestions[index]?.message;
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

async function handleSplitSuggestion(params: {
  splitSuggestion: CommitSplitSuggestion;
  logger: LoggerService;
  git: GitService;
}): Promise<void> {
  const { splitSuggestion, logger } = params;

  logger.info("\n📦 Multiple package changes detected:");
  logger.info(chalk.yellow(splitSuggestion.reason));

  // Display suggested splits with proper typing
  splitSuggestion.suggestions.forEach((suggestion, index: number) => {
    logger.info(
      `\n${chalk.cyan(index + 1)}. ${chalk.bold(suggestion.scope || "root")}:`,
    );
    logger.info(`   Message: ${chalk.bold(suggestion.message)}`);
    logger.info("   Files:");
    suggestion.files.forEach((file) => {
      logger.info(`     • ${chalk.gray(file)}`);
    });
  });

  const shouldSplit = await promptUser({
    options: {
      type: "yesno",
      message: "\n🤔 Would you like to split this commit by package?",
      defaultYes: true,
    },
    logger,
  });

  if (shouldSplit) {
    logger.info("\n📋 Commands to execute:");
    try {
      await copyToClipboard({
        text: splitSuggestion.commands.join("\n"),
        logger,
      });
      logger.info(
        chalk.green("Commands copied to clipboard! Execute them in order:"),
      );
    } catch {
      logger.info("Execute these commands in order:");
    }

    splitSuggestion.commands.forEach((cmd: string) => {
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
}: HandleSecurityFindingsParams): Promise<void> {
  const affectedFiles = new Set<string>();

  if (secretFindings.length) {
    logger.error(
      `\n${chalk.red("📛 CRITICAL:")} ${chalk.bold("Potential sensitive data detected:")}`,
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
      logger.error(`\n${chalk.yellow("📁 File:")} ${chalk.bold(file)}`);
      for (const finding of findings) {
        logger.error(
          `${chalk.red("⚠️")}  ${chalk.bold(finding.type)} detected${finding.line ? chalk.gray(` on line ${finding.line}`) : ""}:`,
        );
        if (finding.content) {
          logger.error(`   ${chalk.red(finding.content)}`);
        }
        logger.error(`   ${chalk.cyan("Suggestion:")} ${finding.suggestion}`);
      }
    }

    logger.info("\n🛡️  Security Recommendations for Secrets:");
    logger.info("   • Review the detected patterns for false positives");
    logger.info("   • Use environment variables for secrets");
    logger.info("   • Consider using a secret manager");
    logger.info("   • Update any exposed secrets immediately");

    const shouldProceed = await promptUser({
      options: {
        type: "yesno",
        message: "\n⚠️  Detected potential secrets. Proceed with commit?",
        defaultYes: false,
      },
      logger,
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
      logger.error(`\n⚠️  File: ${finding.path}`);
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

export async function prepareCommit(options: CommitHookOptions): Promise<void> {
  const logger = new LoggerService({
    debug: process.env.GITGUARD_DEBUG === "true" || options.config?.debug,
  });
  logger.debug("🎣 Starting prepareCommit hook with options:", options);

  try {
    // Load configuration, but prefer passed config if available
    logger.debug("Loading configuration...");
    const config = options.config || (await loadConfig());
    logger.debug("Configuration loaded:", config);

    // Check if we're in an interactive session or if TTY is forced
    const isInteractive = process.stdin.isTTY || options.forceTTY;

    if (!isInteractive) {
      logger.info("Non-interactive mode detected, skipping prompts");
      return;
    }

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

    // Run the commit analysis without re-running security checks
    const analysis = await commitService.analyze({
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
      });
    }

    // Check for split suggestions before other options
    if (analysis.splitSuggestion) {
      await handleSplitSuggestion({
        splitSuggestion: analysis.splitSuggestion,
        logger,
        git,
      });
    }

    // If we get here, user didn't choose to split, show regular options
    const choices: Choice[] = [
      {
        label: "Keep original message",
        value: "keep",
        action: async (): Promise<void> => {
          // No action needed, original message stays
        },
      },
    ];

    if (ai) {
      choices.push({
        label: "Generate commit message with AI",
        value: "ai",
        action: async () => {
          if (analysis.suggestions) {
            const message = await displaySuggestions({
              suggestions: analysis.suggestions,
              logger,
              prompt: "Choose a suggestion:",
              ai,
              git,
            });
            if (message) {
              await git.updateCommitMessage({
                file: options.messageFile,
                message,
              });
            }
          }
        },
      });
    }

    // Add format option last (single scope or multi-scope based on analysis)
    choices.push({
      label: `Use formatted message: "${analysis.formattedMessage}"`,
      value: "format",
      action: async () => {
        await git.updateCommitMessage({
          file: options.messageFile,
          message: analysis.formattedMessage,
        });
      },
    });

    // Display choices
    logger.info("\n🤔 Choose how to proceed with your commit:");
    choices.forEach((choice, index) => {
      logger.info(`${index + 1}. ${choice.label}`);
    });

    const answer = await promptUser({
      options: {
        type: "numeric",
        message: "\nEnter your choice (1-" + choices.length + "):",
        timeoutSeconds: config.hook.timeoutSeconds,
      },
      logger,
    });

    if (typeof answer === "string") {
      const index = parseInt(answer) - 1;
      if (choices[index]) {
        await choices[index].action();
      }
    }
  } catch (error) {
    logger.error("Hook failed:", error);
    process.exit(1);
  }
}
