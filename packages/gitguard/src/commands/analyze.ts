import { handleSecurityFindings } from "../hooks/prepare-commit.js";
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
import { loadConfig } from "../utils/config.util.js";
import { promptYesNo } from "../utils/user-prompt.util.js";

interface AnalyzeOptions {
  pr?: string | number;
  branch?: string;
  message?: string;
  format?: "console" | "json" | "markdown";
  color?: boolean;
  detailed?: boolean;
  debug?: boolean;
  configPath?: string;
}

type AnalyzeResult = CommitAnalysisResult | PRAnalysisResult;

export async function analyze(options: AnalyzeOptions): Promise<AnalyzeResult> {
  const logger = new LoggerService({ debug: options.debug });
  const reporter = new ReporterService({ logger });

  try {
    const config = await loadConfig({ configPath: options.configPath });
    const git = new GitService({
      config: {
        ...config.git,
        cwd: process.cwd(),
      },
      logger,
    });

    const security = config.security?.enabled
      ? new SecurityService({ logger, config })
      : undefined;

    const ai = config.ai?.enabled
      ? AIFactory.create({ config, logger })
      : undefined;

    // If no specific analysis type is specified, analyze working directory
    if (!options.pr && !options.branch) {
      const stagedFiles = await git.getStagedChanges();
      const unstagedFiles = await git.getUnstagedChanges();

      // If no changes at all, exit with helpful message
      if (stagedFiles.length === 0 && unstagedFiles.length === 0) {
        logger.info("No changes found in the working directory.");
        logger.info("\nTo get started:");
        logger.info("1. Make some changes to your files");
        logger.info("2. Use 'git add <file>' to stage changes");
        logger.info("3. Run 'gitguard analyze' again");
        process.exit(0);
      }

      // If there are only unstaged changes, provide helpful suggestions
      if (stagedFiles.length === 0 && unstagedFiles.length > 0) {
        logger.info("Found unstaged changes:");
        unstagedFiles.forEach((file) => {
          logger.info(
            `  - ${file.path} (+${file.additions} -${file.deletions})`,
          );
        });

        // Run security checks on unstaged files
        if (security) {
          const diff = await git.getUnstagedDiff();
          const securityResult = security.analyzeSecurity({
            files: unstagedFiles,
            diff,
          });

          if (
            securityResult?.secretFindings.length ||
            securityResult?.fileFindings.length
          ) {
            logger.warning("\n⚠️ Security issues found in unstaged changes:");
            await handleSecurityFindings({
              secretFindings: securityResult.secretFindings || [],
              fileFindings: securityResult.fileFindings || [],
              logger,
              git,
            });
          }
        }

        // Generate AI suggestions for unstaged changes if available
        if (ai) {
          logger.info("\n🤖 Analyzing unstaged changes...");
          const commitService = new CommitService({
            config,
            git,
            security,
            ai,
            logger,
          });

          const diff = await git.getUnstagedDiff();
          const suggestions = await commitService.getSuggestions({
            files: unstagedFiles,
            message: "",
            diff,
          });

          if (suggestions?.length) {
            logger.info("\nSuggested commit messages for these changes:");
            suggestions.forEach((suggestion, index) => {
              logger.info(`\n${index + 1}. ${suggestion.message}`);
              logger.info(`   Explanation: ${suggestion.explanation}`);
            });
          }

          // Check if changes should be split
          const splitSuggestion = commitService.getSplitSuggestion({
            files: unstagedFiles,
            message: "",
          });

          if (splitSuggestion) {
            logger.info(
              "\n📦 Suggestion: Split these changes into multiple commits:",
            );
            logger.info(`Reason: ${splitSuggestion.reason}`);
            splitSuggestion.suggestions.forEach((suggestion, index) => {
              logger.info(`\n${index + 1}. ${suggestion.message}`);
              logger.info(`   Files: ${suggestion.files.join(", ")}`);
            });
          }
        }

        logger.info("\nNext steps:");
        logger.info("1. Review the changes above");
        logger.info(
          "2. Use 'git add <file>' to stage the changes you want to commit",
        );
        logger.info(
          "3. Run 'gitguard analyze' again to analyze staged changes",
        );
        process.exit(0);
      }

      const commitService = new CommitService({
        config,
        git,
        security,
        ai,
        logger,
      });

      // Run security checks first
      const diff = await git.getStagedDiff();
      const securityResult = security?.analyzeSecurity({
        files: stagedFiles,
        diff,
      });

      if (
        securityResult?.secretFindings.length ||
        securityResult?.fileFindings.length
      ) {
        await handleSecurityFindings({
          secretFindings: securityResult.secretFindings || [],
          fileFindings: securityResult.fileFindings || [],
          logger,
          git,
        });
      }

      // If no message provided, use AI to suggest one if available
      if (!options.message && ai) {
        const stagedDiff = await git.getStagedDiff();
        const tokenUsage = ai.calculateTokenUsage({
          prompt: stagedDiff,
        });

        logger.info(
          `\n💰 Estimated cost for AI generation: ${tokenUsage.estimatedCost}`,
        );
        logger.info(`📊 Estimated tokens: ${tokenUsage.count}`);

        const shouldGenerateAI = await promptYesNo({
          message:
            "🤖 Would you like to generate AI suggestions for your commit message?",
          defaultValue: true,
          logger,
        });

        if (shouldGenerateAI) {
          logger.info("\n🔄 Generating AI suggestions...");
          const result = await commitService.analyze({
            enableAI: true,
            enablePrompts: true,
            securityResult,
          });

          if (result.suggestions?.length) {
            logger.info("\n✨ AI Suggestions:");
            result.suggestions.forEach((suggestion, index) => {
              logger.info(`\n${index + 1}. ${suggestion.message}`);
              logger.info(
                `   Explanation: ${suggestion.explanation || "No explanation provided"}`,
              );
            });
            logger.info(
              "\nThese are suggested commit messages you can use when committing your changes.",
            );
          } else {
            logger.warning("\n⚠️ No AI suggestions generated");
          }
        }
      }

      // Continue with analysis using automatic type detection
      const type = commitService.detectCommitType(stagedFiles);
      const scope = commitService.detectScope(stagedFiles);
      logger.info("\n📝 Generated commit type based on changes.");
      logger.info(`Suggested format: ${type}(${scope}): <description>`);

      // Continue with analysis using the chosen or generated message
      const result = await commitService.analyze({
        message: options.message,
        enableAI: false, // Don't generate AI suggestions again
        enablePrompts: true,
        securityResult,
      });

      reporter.generateReport({
        result,
        options: {
          format: options.format || "console",
          color: options.color,
          detailed: options.detailed,
        },
      });

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
      branch: options.branch,
      enableAI: Boolean(config.ai?.enabled),
      enablePrompts: true,
    });

    reporter.generateReport({
      result,
      options: {
        format: options.format || "console",
        color: options.color,
        detailed: options.detailed,
      },
    });

    return result;
  } catch (error) {
    logger.error("Analysis failed:", error);
    throw error;
  }
}
