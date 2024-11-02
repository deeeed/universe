import { readFile, writeFile } from "fs/promises";
import { CommitService } from "../services/commit.service";
import { GitService } from "../services/git.service";
import { SecurityService } from "../services/security.service";
import { LoggerService } from "../services/logger.service";
import { loadConfig } from "../config";
import { AIFactory } from "../services/factories/ai.factory";

interface CommitHookOptions {
  messageFile: string;
  debug?: boolean;
}

export async function prepareCommit(options: CommitHookOptions): Promise<void> {
  const logger = new LoggerService({ debug: options.debug });

  try {
    // Load configuration
    const config = await loadConfig();

    // Initialize services
    const git = new GitService({
      config: config.git,
      logger,
    });

    const security = new SecurityService({ logger, config });

    // Initialize AI service using factory
    const ai = AIFactory.create({ config, logger });

    // Initialize commit service
    const commitService = new CommitService({
      config,
      git,
      security,
      ai,
      logger,
    });

    // Read original message
    const originalMessage = await readFile(options.messageFile, "utf-8");

    // Skip for merge commits
    if (originalMessage.startsWith("Merge")) {
      return;
    }

    // Analyze commit
    const analysis = await commitService.analyze({
      messageFile: options.messageFile,
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
      logger.info("\n🤖 AI Suggestions:");
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
    logger.error("Failed to process commit:", error);
    process.exit(1);
  }
}
