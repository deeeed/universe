import { readFile, writeFile } from "fs/promises";
import { loadConfig } from "../config";
import { CommitService } from "../services/commit.service";
import { AIFactory } from "../services/factories/ai.factory";
import { GitService } from "../services/git.service";
import { LoggerService } from "../services/logger.service";
import { PromptService } from "../services/prompt.service";
import { SecurityService } from "../services/security.service";

interface CommitHookOptions {
  messageFile: string;
  debug?: boolean;
  config?: {
    git: {
      baseBranch: string;
      ignorePatterns?: string[];
      cwd?: string;
    };
    analysis: {
      maxCommitSize: number;
      maxFileSize: number;
      checkConventionalCommits: boolean;
    };
  };
}

export async function prepareCommit(options: CommitHookOptions): Promise<void> {
  const logger = new LoggerService({ debug: true }); // Force debug mode for better visibility
  logger.debug("🎣 Starting prepareCommit hook with options:", options);

  try {
    // Load configuration, but prefer passed config if available
    logger.debug("Loading configuration...");
    const config = options.config || (await loadConfig());
    logger.debug("Configuration loaded:", {
      git: config.git,
      analysis: config.analysis,
    });

    // Initialize services with correct working directory
    logger.debug("Initializing services...");
    const git = new GitService({
      config: config.git,
      logger,
    });

    const security = new SecurityService({ logger, config });
    logger.debug("Security service initialized");

    const prompt = new PromptService({ logger });
    logger.debug("Prompt service initialized");

    // Initialize AI service using factory
    logger.debug("Initializing AI service...");
    const ai = AIFactory.create({ config, logger });
    logger.debug("AI service initialized:", ai ? "✓" : "✗");

    // Initialize commit service
    logger.debug("Initializing commit service...");
    const commitService = new CommitService({
      config,
      git,
      security,
      prompt,
      ai,
      logger,
    });
    logger.debug("Commit service initialized");

    // Read original message
    logger.debug("Reading commit message from:", options.messageFile);
    const originalMessage = await readFile(options.messageFile, "utf-8");
    logger.debug("Original commit message:", originalMessage);

    // Skip for merge commits
    if (originalMessage.startsWith("Merge")) {
      logger.debug("Skipping merge commit");
      return;
    }

    // Get staged changes for debugging
    const stagedChanges = await git.getStagedChanges();
    logger.debug("Staged changes:", {
      fileCount: stagedChanges.length,
      files: stagedChanges.map((f) => f.path),
    });

    // Analyze commit
    logger.debug("Starting commit analysis...");
    const analysis = await commitService.analyze({
      messageFile: options.messageFile,
    });
    logger.debug("Analysis complete:", {
      warnings: analysis.warnings.length,
      suggestions: analysis.suggestions?.length ?? 0,
      splitSuggestion: analysis.splitSuggestion ? "available" : "none",
    });

    // Handle security warnings first
    if (analysis.warnings.some((w) => w.severity === "error")) {
      logger.error("Security issues detected:");
      analysis.warnings
        .filter((w) => w.severity === "error")
        .forEach((w) => logger.error(`- ${w.message}`));
      process.exit(1);
    }

    // If AI suggestions are available and there are no blocking issues
    if (analysis.suggestions?.length) {
      logger.info(
        "\n🤖 AI Suggestions available:",
        analysis.suggestions.length,
      );
      analysis.suggestions.forEach((suggestion, index) => {
        logger.info(`\n${index + 1}. ${suggestion.message}`);
        logger.info(`   Explanation: ${suggestion.explanation}`);
      });

      // For now, just use the first suggestion
      // TODO: Add interactive selection
      await writeFile(options.messageFile, analysis.suggestions[0].message);
      logger.success("\n✅ Commit message updated!");
    }
  } catch (error) {
    console.error("Failed to process commit:", error);
    process.exit(1);
  }
}
