import chalk from "chalk";
import execa from "execa";
import { closeSync, openSync } from "fs";
import { writeFile } from "fs/promises";
import readline from "readline";
import { ReadStream, WriteStream } from "tty";
import { CommitService } from "../services/commit.service.js";
import { AIFactory } from "../services/factories/ai.factory.js";
import { GitService } from "../services/git.service.js";
import { LoggerService } from "../services/logger.service.js";
import { SecurityService } from "../services/security.service.js";
import { AIProvider } from "../types/ai.types.js";
import { Config } from "../types/config.types.js";
import { SecurityFinding } from "../types/security.types.js";
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
}

interface YesNoPromptOptions extends BasePromptOptions {
  type: "yesno";
  defaultYes?: boolean;
}

interface NumericPromptOptions extends BasePromptOptions {
  type: "numeric";
  allowEmpty?: boolean;
}

type PromptOptions = YesNoPromptOptions | NumericPromptOptions;

interface TTYStreams {
  input: ReadStream | NodeJS.ReadStream;
  output: WriteStream | NodeJS.WriteStream;
  fd?: number;
}

function createTTYStreams(): TTYStreams {
  if (process.stdin.isTTY) {
    return {
      input: process.stdin,
      output: process.stdout,
    };
  }

  try {
    const fd = openSync("/dev/tty", "r+");
    const input = new ReadStream(fd);
    const output = new WriteStream(fd);
    return { input, output, fd };
  } catch (error) {
    console.warn("Failed to open TTY:", error);
    return {
      input: process.stdin,
      output: process.stdout,
    };
  }
}

export async function handleSecurityFindings(
  params: HandleSecurityFindingsParams,
): Promise<void> {
  const { secretFindings, fileFindings, logger, git } = params;
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
      type: "yesno",
      message: "\n⚠️  Detected potential secrets. Proceed with commit?",
      defaultYes: false,
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
      type: "yesno",
      message:
        "\n⚠️  Detected potentially sensitive files. Proceed with commit?",
      defaultYes: false,
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

// Update promptUser to handle different types of prompts
async function promptUser(options: PromptOptions): Promise<string | boolean> {
  return new Promise((resolve) => {
    const streams = createTTYStreams();

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
    const timeoutDuration = 90000;
    setTimeout(() => {
      streams.output.write(
        `\n${chalk.yellow("⏰ No input received after")} ${chalk.bold(timeoutDuration / 1000)} ${chalk.yellow("seconds. Using default value.")}\n`,
      );
      cleanup();

      if (options.type === "yesno") {
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
      type: "yesno",
      message: "\n🤖 Would you like to proceed with AI suggestion generation?",
      defaultYes: true,
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
    type: "numeric",
    message: `\n${chalk.cyan("Choose a suggestion number or press Enter to skip:")}`,
    allowEmpty: true,
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
    await copyToClipboard(unstageCommand);
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

async function copyToClipboard(text: string): Promise<void> {
  try {
    if (process.platform === "darwin") {
      await execa("pbcopy", { input: text });
    } else if (process.platform === "win32") {
      await execa("clip", { input: text });
    } else {
      await execa("xclip", ["-selection", "clipboard"], { input: text });
    }
  } catch (error) {
    throw new Error("Failed to copy to clipboard");
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

    // Build available options based on analysis and configuration
    const choices: Array<{
      label: string;
      value: string;
      action: () => Promise<void>;
    }> = [];

    // If analysis suggests splitting, add that as first option
    if (analysis.splitSuggestion) {
      choices.push({
        label: "Split into multiple commits (recommended)",
        value: "split",
        action: () => {
          logger.info("\n📦 Suggested split structure:");
          const splitSuggestion = analysis.splitSuggestion;
          if (!splitSuggestion) return Promise.resolve();

          for (const suggestion of splitSuggestion.suggestions) {
            logger.info(`\n${suggestion.order}. ${suggestion.message}`);
            logger.info("   Files:");
            suggestion.files.forEach((file) => logger.info(`   - ${file}`));
          }
          logger.info("\n📋 Commands to execute:");
          splitSuggestion.commands.forEach((cmd) => logger.info(`   ${cmd}`));
          process.exit(1);
          return Promise.resolve();
        },
      });
    }

    // Keep original message option
    choices.push({
      label: `Keep original message: "${analysis.originalMessage}"`,
      value: "keep",
      action: () => {
        process.exit(0);
        return Promise.resolve();
      },
    });

    // Add AI option if enabled
    if (config.ai?.enabled && ai) {
      choices.push({
        label: "Generate commit message with AI",
        value: "ai",
        action: async () => {
          // Show cost estimate before proceeding
          await displayAICostEstimate({ ai, git, logger });

          const shouldProceed = await promptUser({
            type: "yesno",
            message:
              "\n🤖 Would you like to proceed with AI suggestion generation?",
            defaultYes: true,
          });

          if (!shouldProceed) {
            process.exit(0);
            return;
          }

          logger.info("\n🔄 Getting AI suggestions...");
          const aiAnalysis = await commitService.analyze({
            messageFile: options.messageFile,
            enableAI: true,
            enablePrompts: true,
            securityResult,
          });

          if (aiAnalysis.suggestions?.length) {
            const chosenMessage = await displaySuggestions({
              suggestions: aiAnalysis.suggestions,
              logger,
              prompt: aiAnalysis.originalMessage,
              ai, // Pass AI instance
              git, // Pass Git instance
            });

            if (chosenMessage) {
              await writeFile(options.messageFile, chosenMessage);
              logger.success("✅ Commit message updated with AI suggestion!\n");
              process.exit(0);
            }
          }
          // If no AI suggestion was chosen, continue to next option
          process.exit(0);
        },
      });
    }

    // Add automatic formatting option
    choices.push({
      label: `Use formatted message: "${analysis.formattedMessage}"`,
      value: "format",
      action: async () => {
        await writeFile(options.messageFile, analysis.formattedMessage);
        logger.success("✅ Commit message updated with formatting!\n");
        process.exit(0);
      },
    });

    // Display single prompt with all options
    logger.info("\n🤔 Choose how to proceed with your commit:");
    const answer = await promptUser({
      type: "numeric",
      message:
        choices.map((c, i) => `${i + 1}. ${c.label}`).join("\n") +
        "\n\nEnter your choice (1-" +
        choices.length +
        "):",
      allowEmpty: false,
    });

    const index = parseInt(String(answer)) - 1;
    if (index >= 0 && index < choices.length) {
      await choices[index].action();
    } else {
      logger.error("Invalid choice. Keeping original message.");
      process.exit(0);
    }
  } catch (error) {
    console.error("Failed to process commit:", error);
    process.exit(1);
  }
}
