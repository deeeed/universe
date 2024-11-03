import { CommitService } from "../services/commit.service.js";
import { AIFactory } from "../services/factories/ai.factory.js";
import { GitService } from "../services/git.service.js";
import { LoggerService } from "../services/logger.service.js";
import { PRService } from "../services/pr.service.js";
import { ReporterService } from "../services/reporter.service.js";
import { SecurityService } from "../services/security.service.js";
import {
  CommitAnalysisResult,
  PRAnalysisResult,
} from "../types/analysis.types.js";
import { generateCommitSuggestionPrompt } from "../utils/ai-prompt.util.js";
import { copyToClipboard } from "../utils/clipboard.util.js";
import { loadConfig } from "../utils/config.util.js";
import { promptAIAction } from "../utils/user-prompt.util.js";

interface AnalyzeOptions {
  pr?: string | number;
  branch?: string;
  message?: string;
  format?: "console" | "json" | "markdown";
  color?: boolean;
  detailed?: boolean;
  debug?: boolean;
  configPath?: string;
  staged?: boolean;
  unstaged?: boolean;
  all?: boolean;
  ai?: boolean;
}

type AnalyzeResult = CommitAnalysisResult | PRAnalysisResult;

export async function analyze(params: AnalyzeOptions): Promise<AnalyzeResult> {
  const logger = new LoggerService({ debug: params.debug });
  const reporter = new ReporterService({ logger });

  try {
    const config = await loadConfig({ configPath: params.configPath });
    const git = new GitService({
      config: {
        ...config.git,
        baseBranch: config.git?.baseBranch || "main",
      },
      logger,
    });
    const security = new SecurityService({ config, logger });
    const ai =
      (params.ai ?? config.ai?.enabled)
        ? AIFactory.create({
            config: {
              ...config,
            },
            logger,
          })
        : undefined;

    // If no specific analysis type is specified, analyze working directory
    if (!params.pr && !params.branch) {
      const stagedFiles = await git.getStagedChanges();
      const unstagedFiles = await git.getUnstagedChanges();
      const currentBranch = await git.getCurrentBranch();
      const baseBranch = git.config.baseBranch;

      // Determine what to analyze based on options
      const shouldAnalyzeStaged = params.all || params.staged !== false;
      const shouldAnalyzeUnstaged = params.all || params.unstaged === true;

      // For debugging
      logger.debug("Analysis options:", {
        shouldAnalyzeStaged,
        shouldAnalyzeUnstaged,
        stagedFiles: stagedFiles.length,
        unstagedFiles: unstagedFiles.length,
        params,
      });

      // Combine files based on what should be analyzed
      const filesToAnalyze = [
        ...(shouldAnalyzeStaged ? stagedFiles : []),
        ...(shouldAnalyzeUnstaged ? unstagedFiles : []),
      ];

      // Log what we're analyzing
      if (filesToAnalyze.length > 0) {
        logger.info("\n📂 Analyzing changes:");
        if (shouldAnalyzeStaged && stagedFiles.length > 0) {
          logger.info(`  • ${stagedFiles.length} staged files`);
        }
        if (shouldAnalyzeUnstaged && unstagedFiles.length > 0) {
          logger.info(`  • ${unstagedFiles.length} unstaged files`);
        }
        logger.info(""); // Empty line for spacing
      }

      // If no changes to analyze, show helpful message
      if (filesToAnalyze.length === 0) {
        logger.info("\n📂 No changes found in the working directory.");
        logger.info("\nTo get started:");
        logger.info("1. Make some changes to your files");
        logger.info("2. Use 'git add <file>' to stage changes");
        logger.info("3. Run 'gitguard analyze' again");

        const now = new Date();
        return {
          branch: currentBranch,
          baseBranch,
          stats: {
            filesChanged: 0,
            additions: 0,
            deletions: 0,
            totalCommits: 0,
            authors: [],
            timeSpan: {
              firstCommit: now,
              lastCommit: now,
            },
          },
          warnings: [],
          commits: [],
          filesByDirectory: {},
        };
      }

      const commitService = new CommitService({
        config,
        git,
        security,
        ai,
        logger,
      });

      // Run security checks on all files being analyzed
      const diff = shouldAnalyzeStaged
        ? await git.getStagedDiff()
        : await git.getUnstagedDiff();

      const securityResult = security?.analyzeSecurity({
        files: filesToAnalyze,
        diff,
      });

      // Analyze all relevant files
      const result = await commitService.analyze({
        files: filesToAnalyze,
        message: params.message || "",
        enableAI: false, // Don't enable AI yet
        enablePrompts: true,
        securityResult,
      });

      // Show analysis results
      if (result.warnings.length > 0) {
        logger.info("\n⚠️  Analysis found some concerns:");
        result.warnings.forEach((warning) => {
          logger.info(`  • ${warning.message}`);
        });
      } else {
        logger.info("\n✅ Analysis completed successfully!");
      }

      // Message Analysis
      if (params.message) {
        logger.info("\n📝 Message Analysis:");
        if (
          result.formattedMessage &&
          result.formattedMessage !== params.message
        ) {
          logger.info(`  • Suggested format: "${result.formattedMessage}"`);
        }
      }

      // Show next steps based on analysis
      logger.info("\n📋 Next steps:");

      if (
        result.formattedMessage &&
        result.formattedMessage !== params.message
      ) {
        logger.info(
          `  • Run 'git commit -m "${result.formattedMessage}"' to create commit with suggested format`,
        );
      }

      if (!params.message) {
        logger.info(
          "  • Run 'gitguard analyze --message \"your message\"' to analyze with a commit message",
        );
      }

      if (config.ai?.enabled && !params.ai) {
        logger.info(
          "  • Run 'gitguard analyze --ai' to generate commit message suggestions",
        );
      }

      if (result.warnings.length > 0) {
        logger.info("  • Address the warnings above before committing");
      }

      logger.info(""); // Empty line for spacing

      // Handle AI suggestions
      if (ai) {
        logger.debug("Preparing AI analysis");

        // Use optimized diff generation
        const diff = await git.getStagedDiffForAI();
        const prompt = generateCommitSuggestionPrompt({
          files: filesToAnalyze,
          message: params.message || "",
          diff,
          logger,
        });

        const tokenUsage = ai.calculateTokenUsage({ prompt });

        const result = await promptAIAction({
          logger,
          tokenUsage,
        });

        switch (result.action) {
          case "generate": {
            const aiResult = await commitService.analyze({
              files: filesToAnalyze,
              message: params.message,
              enableAI: true,
              enablePrompts: true,
              securityResult,
            });

            if (aiResult.suggestions?.length) {
              logger.info("  • Alternative suggestions:");
              aiResult.suggestions.forEach((suggestion, index) => {
                logger.info(`    ${index + 1}. ${suggestion.message}`);
              });
            }
            break;
          }

          case "copy": {
            const prompt = generateCommitSuggestionPrompt({
              files: filesToAnalyze,
              message: params.message || "",
              diff,
              logger,
            });

            await copyToClipboard({
              text: prompt,
              logger,
            });

            logger.info("\n✅ AI prompt copied to clipboard!");
            break;
          }

          case "skip":
            logger.info("\n⏭️  Skipping AI suggestions");
            break;
        }
      }

      return result;
    }

    // PR analysis logic
    const prService = new PRService({
      config,
      git,
      security,
      ai,
      logger,
    });

    const result = await prService.analyze({
      branch: params.branch,
      enableAI: Boolean(config.ai?.enabled),
      enablePrompts: true,
    });

    reporter.generateReport({
      result,
      options: {
        format: params.format || "console",
        color: params.color,
        detailed: params.detailed,
      },
    });

    return result;
  } catch (error) {
    logger.error("Analysis failed:", error);
    throw error;
  }
}
