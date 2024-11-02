import execa from "execa";
import { promises as fs } from "fs";
import readline from "readline";
import { loadConfig } from "../config";
import { CommitService } from "../services/commit.service";
import { AIFactory } from "../services/factories/ai.factory";
import { GitService } from "../services/git.service";
import { LoggerService } from "../services/logger.service";
import { PromptService } from "../services/prompt.service";
import { SecurityService } from "../services/security.service";
import { Config } from "../types/config.types";
import { SecurityFinding } from "../types/security.types";

// Add missing interfaces
interface CommitHookOptions {
  messageFile: string;
  config?: Config;
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

async function handleSecurityFindings(
  params: HandleSecurityFindingsParams,
): Promise<void> {
  const { secretFindings, fileFindings, logger, git } = params;
  const affectedFiles = new Set<string>();

  if (secretFindings.length) {
    logger.error("\n📛 CRITICAL: Potential sensitive data detected:");

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
      logger.error(`\n📁 File: ${file}`);
      for (const finding of findings) {
        logger.error(
          `⚠️  ${finding.type} detected${finding.line ? ` on line ${finding.line}` : ""}:`,
        );
        if (finding.content) {
          logger.error(`   ${finding.content}`);
        }
        logger.error(`   Suggestion: ${finding.suggestion}`);
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
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const suffix =
      options.type === "yesno"
        ? options.defaultYes
          ? "[Y/n] "
          : "[y/N] "
        : "";

    rl.question(`${options.message} ${suffix}`, (answer) => {
      rl.close();
      const normalized = answer.toLowerCase().trim();

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
  });
}

// Update displaySuggestions to use the new prompt interface
async function displaySuggestions(
  params: DisplaySuggestionsParams,
): Promise<string | undefined> {
  const { suggestions, logger } = params;

  suggestions.forEach((suggestion, index) => {
    logger.info(`\n${index + 1}. ${suggestion.message}`);
    logger.info(`   Explanation: ${suggestion.explanation}`);
  });

  const answer = await promptUser({
    type: "numeric",
    message: "\nChoose a suggestion number or press Enter to skip:",
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
  const logger = new LoggerService({ debug: true });
  logger.debug("🎣 Starting prepareCommit hook with options:", options);

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
        cwd: options.config?.git.cwd || process.cwd(), // Use the provided cwd or fallback
      },
      logger,
    });
    const security = new SecurityService({ logger, config });
    const prompt = new PromptService({ logger });
    const ai = config.ai?.enabled
      ? AIFactory.create({ config, logger })
      : undefined;

    // Initialize CommitService
    const commitService = new CommitService({
      config,
      git,
      security,
      prompt,
      ai,
      logger,
    });

    // Get staged changes and diff first
    const files = await git.getStagedChanges();
    const diff = await git.getStagedDiff();

    // Run security checks before commit analysis
    const securityResult = security.analyzeSecurity({ files, diff });

    if (
      securityResult.secretFindings.length ||
      securityResult.fileFindings.length
    ) {
      await handleSecurityFindings({
        secretFindings: securityResult.secretFindings,
        fileFindings: securityResult.fileFindings,
        logger,
        git,
      });
    }

    // Run the commit analysis
    const analysis = await commitService.analyze({
      messageFile: options.messageFile,
      enableAI: Boolean(config.ai?.enabled),
      enablePrompts: true,
    });

    // If we have AI suggestions and user wants them
    const shouldUseAI = await promptUser({
      type: "yesno",
      message: "\nWould you like AI suggestions?",
      defaultYes: true,
    });

    if (analysis.suggestions?.length && shouldUseAI) {
      logger.info("\n🤖 Getting AI suggestions...");
      const chosenMessage = await displaySuggestions({
        suggestions: analysis.suggestions,
        logger,
        prompt: analysis.originalMessage,
      });

      if (chosenMessage) {
        await fs.writeFile(options.messageFile, chosenMessage);
        logger.success("✅ Commit message updated!\n");
        return;
      }
    }

    // Show automatic formatting suggestion
    logger.info("\n⚙️ Using automatic formatting...");
    logger.info(`\n✨ Suggested message:\n${analysis.formattedMessage}`);

    const useFormatted = await promptUser({
      type: "yesno",
      message: "\nUse suggested message?",
      defaultYes: true,
    });

    if (useFormatted) {
      await fs.writeFile(options.messageFile, analysis.formattedMessage);
      logger.success("✅ Commit message updated!\n");
    }
  } catch (error) {
    console.error("Failed to process commit:", error);
    process.exit(1);
  }
}
