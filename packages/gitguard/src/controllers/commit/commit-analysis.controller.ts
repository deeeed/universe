import chalk from "chalk";
import { CommitCommandOptions } from "../../commands/commit.js";
import { CommitService } from "../../services/commit.service.js";
import { GitService } from "../../services/git.service.js";
import { AIProvider } from "../../types/ai.types.js";
import { CommitAnalysisResult } from "../../types/analysis.types.js";
import { Config } from "../../types/config.types.js";
import { FileChange } from "../../types/git.types.js";
import { Logger } from "../../types/logger.types.js";
import { SecurityCheckResult } from "../../types/security.types.js";
import { generateSplitSuggestionPrompt } from "../../utils/ai-prompt.util.js";
import { handleClipboardCopy } from "../../utils/shared-ai-controller.util.js";
import {
  displaySplitSuggestions,
  promptAIAction,
  promptSplitChoice,
  promptYesNo,
} from "../../utils/user-prompt.util.js";

interface CommitAnalysisControllerParams {
  logger: Logger;
  git: GitService;
  config: Config;
  ai?: AIProvider;
}

interface GetFilesToAnalyzeParams {
  options: CommitCommandOptions;
  stagedFiles: FileChange[];
  unstagedFiles: FileChange[];
}

interface GetFilesToAnalyzeResult {
  filesToAnalyze: FileChange[];
  shouldAnalyzeStaged: boolean;
  shouldAnalyzeUnstaged: boolean;
}

interface AnalyzeChangesParams {
  files: FileChange[];
  message: string;
  enableAI: boolean;
  enablePrompts: boolean;
  securityResult: SecurityCheckResult;
}

interface HandleComplexCommitParams {
  result: CommitAnalysisResult;
  files: FileChange[];
  message: string;
  enableAI: boolean;
  securityResult: SecurityCheckResult;
}

export class CommitAnalysisController {
  private readonly logger: Logger;
  private readonly git: GitService;
  private readonly config: Config;
  private readonly ai?: AIProvider;
  private readonly commitService: CommitService;

  constructor({ logger, git, config, ai }: CommitAnalysisControllerParams) {
    this.logger = logger;
    this.git = git;
    this.config = config;
    this.ai = ai;

    this.logger.debug("CommitAnalysisController initialized with:", {
      hasAI: !!ai,
      aiConfig: config.ai,
      debug: config.debug,
    });

    this.commitService = new CommitService({
      config,
      git,
      ai,
      logger,
    });
  }

  getFilesToAnalyze({
    options,
    stagedFiles,
    unstagedFiles,
  }: GetFilesToAnalyzeParams): GetFilesToAnalyzeResult {
    const shouldAnalyzeStaged = options.all || options.staged !== false;
    const shouldAnalyzeUnstaged = options.all || options.unstaged === true;

    const filesToAnalyze = [
      ...(shouldAnalyzeStaged ? stagedFiles : []),
      ...(shouldAnalyzeUnstaged ? unstagedFiles : []),
    ];

    if (filesToAnalyze.length > 0) {
      this.logger.info("\n📂 Analyzing changes:");
      if (shouldAnalyzeStaged && stagedFiles.length > 0) {
        this.logger.info(
          `  ${chalk.dim("•")} ${chalk.cyan(`${stagedFiles.length} staged files`)}`,
        );
      }
      if (shouldAnalyzeUnstaged && unstagedFiles.length > 0) {
        this.logger.info(
          `  ${chalk.dim("•")} ${chalk.yellow(`${unstagedFiles.length} unstaged files`)}`,
        );
      }
    } else {
      this.logger.info("\n⚠️  No files to analyze");
    }

    return {
      filesToAnalyze,
      shouldAnalyzeStaged,
      shouldAnalyzeUnstaged,
    };
  }

  getEmptyAnalysisResult({
    currentBranch,
    baseBranch,
  }: {
    currentBranch: string;
    baseBranch: string;
  }): CommitAnalysisResult {
    return {
      branch: currentBranch,
      originalMessage: "",
      baseBranch,
      formattedMessage: "",
      stats: {
        filesChanged: 0,
        additions: 0,
        deletions: 0,
      },
      warnings: [],
      complexity: {
        score: 0,
        reasons: [],
        needsStructure: false,
      },
    };
  }

  async analyzeChanges({
    files,
    message,
    enableAI,
    enablePrompts,
    securityResult,
  }: AnalyzeChangesParams): Promise<CommitAnalysisResult> {
    this.logger.debug("analyzeChanges called with:", {
      enableAI,
      enablePrompts,
      hasAI: !!this.ai,
      aiConfig: this.config.ai,
      fileCount: files.length,
    });

    // Get initial analysis
    const result = await this.commitService.analyze({
      files,
      message,
      enableAI,
      enablePrompts,
      securityResult,
    });

    this.logger.debug("Starting analysis with params:", {
      enableAI,
      enablePrompts,
      fileCount: files.length,
    });

    // First check for multi-package changes
    const hasMultiPackage = this.hasMultiPackageChanges(result);
    this.logger.debug("Multi-package check:", { hasMultiPackage });

    if (enablePrompts && hasMultiPackage) {
      this.logger.debug("Processing multi-package split");
      const splitSuggestion = this.commitService.getSplitSuggestion({
        files,
        message,
      });

      if (splitSuggestion) {
        displaySplitSuggestions({
          suggestions: splitSuggestion.suggestions.map((s) => ({
            scope: s.scope,
            message: s.message,
            files: s.files,
          })),
          logger: this.logger,
        });

        const { selection } = await promptSplitChoice({
          suggestions: splitSuggestion.suggestions,
          logger: this.logger,
        });

        if (selection > 0) {
          const selectedSplit = splitSuggestion.suggestions[selection - 1];
          await this.git.unstageFiles({
            files: files
              .map((f) => f.path)
              .filter((path) => !selectedSplit.files.includes(path)),
          });

          return this.commitService.analyze({
            files: files.filter((f) => selectedSplit.files.includes(f.path)),
            message: selectedSplit.message,
            enableAI,
            enablePrompts,
            securityResult,
          });
        }
      }
    }

    // Then check for complex changes
    const isComplex = this.isComplexCommit(result);
    this.logger.debug("Complexity check:", {
      isComplex,
      enablePrompts,
      enableAI,
      hasAIProvider: !!this.ai,
      warnings: result.warnings,
      complexity: result.complexity,
    });

    if (enablePrompts && isComplex) {
      this.logger.debug("About to handle complex commit");
      const updatedResult = await this.handleComplexCommit({
        result,
        files,
        message,
        enableAI,
        securityResult,
      });

      this.logger.debug("Complex commit handling complete", {
        wasHandled: updatedResult !== result,
        hasWarnings: updatedResult.warnings.length > 0,
      });

      return updatedResult;
    }

    return result;
  }

  private isComplexCommit(result: CommitAnalysisResult): boolean {
    this.logger.debug("Checking commit complexity:", {
      score: result.complexity.score,
      needsStructure: result.complexity.needsStructure,
      reasonCount: result.complexity.reasons.length,
      reasons: result.complexity.reasons,
      complexity: result.complexity,
    });

    // Add complexity warning if needed
    if (result.complexity.needsStructure) {
      // Add a reason if none exist
      if (result.complexity.reasons.length === 0) {
        result.complexity.reasons.push("Commit structure is too complex");
      }

      // Add warning if not already present
      if (!result.warnings.some((w) => w.message.includes("complex"))) {
        result.warnings.push({
          type: "structure",
          message: "This commit is complex and might need to be split",
          severity: "medium",
        });
      }
    }

    const isComplex =
      result.complexity.needsStructure || result.complexity.reasons.length > 0;

    this.logger.debug("Complexity check result:", {
      isComplex,
      factors: {
        needsStructure: result.complexity.needsStructure,
        hasReasons: result.complexity.reasons.length > 0,
        reasons: result.complexity.reasons,
      },
    });

    return isComplex;
  }

  private async handleComplexCommit({
    result,
    files,
    message,
    enableAI,
    securityResult,
  }: HandleComplexCommitParams): Promise<CommitAnalysisResult> {
    this.logger.debug("handleComplexCommit called with:", {
      enableAI,
      hasAI: !!this.ai,
      complexityScore: result.complexity.score,
      reasonCount: result.complexity.reasons.length,
    });

    if (!enableAI || !this.ai) {
      this.logger.debug(
        "Skipping complex commit handling - AI not enabled/available",
      );
      return result;
    }

    this.logger.info(chalk.yellow("\n⚠️  This commit appears to be complex:"));
    result.complexity.reasons.forEach((reason) => {
      this.logger.info(`  ${chalk.dim("•")} ${chalk.yellow(reason)}`);
    });

    const shouldSplit = await promptYesNo({
      message: "Would you like AI to suggest how to split this commit?",
      defaultValue: true,
      logger: this.logger,
    });

    if (!shouldSplit) {
      this.logger.info("\n⏭️  Continuing without splitting commit...");
      return result;
    }

    // Get the full diff for AI analysis
    const stagedDiff = await this.git.getStagedDiffForAI();

    // Calculate token usage for the AI prompt
    const tokenUsage = this.ai.calculateTokenUsage({
      prompt: generateSplitSuggestionPrompt({
        files,
        message,
        logger: this.logger,
        diff: stagedDiff,
      }),
    });

    // Let user choose action
    const { action } = await promptAIAction({
      logger: this.logger,
      tokenUsage,
    });

    switch (action) {
      case "generate": {
        // Use AI to generate split suggestions
        const aiSplitResponse = await this.ai.generateCompletion<{
          reason: string;
          suggestions: Array<{
            message: string;
            files: string[];
            order: number;
            type: string;
            scope?: string;
          }>;
        }>({
          prompt: generateSplitSuggestionPrompt({
            files,
            message,
            logger: this.logger,
            diff: stagedDiff,
          }),
          options: {
            requireJson: true,
            temperature: 0.7,
          },
        });

        if (aiSplitResponse?.suggestions?.length) {
          this.logger.info(chalk.cyan("\n🤖 AI Split Suggestions:"));
          this.logger.info(chalk.dim(`\nReason: ${aiSplitResponse.reason}`));

          displaySplitSuggestions({
            suggestions: aiSplitResponse.suggestions.map((s) => ({
              scope: s.scope,
              message: s.message,
              files: s.files,
            })),
            logger: this.logger,
          });

          const { selection } = await promptSplitChoice({
            suggestions: aiSplitResponse.suggestions,
            logger: this.logger,
          });

          if (selection > 0) {
            const selectedSplit = aiSplitResponse.suggestions[selection - 1];

            // Unstage files not in the selected split
            await this.git.unstageFiles({
              files: files
                .map((f) => f.path)
                .filter((path) => !selectedSplit.files.includes(path)),
            });

            // Re-analyze with only the selected files
            return this.commitService.analyze({
              files: files.filter((f) => selectedSplit.files.includes(f.path)),
              message: selectedSplit.message,
              enableAI,
              enablePrompts: true,
              securityResult,
            });
          }
        }
        break;
      }

      case "copy-api":
      case "copy-manual": {
        await handleClipboardCopy({
          prompt: generateSplitSuggestionPrompt({
            files,
            message,
            logger: this.logger,
            diff: stagedDiff,
          }),
          isApi: action === "copy-api",
          ai: this.ai,
          config: this.config,
          logger: this.logger,
        });
        break;
      }

      case "skip":
        this.logger.info("\n⏭️  Continuing without splitting commit...");
        break;
    }

    return result;
  }

  private hasMultiPackageChanges(result: CommitAnalysisResult): boolean {
    return result.warnings.some((w) =>
      w.message.includes("Changes span multiple packages"),
    );
  }

  async executeCommit({ message }: { message: string }): Promise<void> {
    this.logger.info("\n📝 Creating commit...");
    try {
      await this.git.createCommit({ message });
      this.logger.info(chalk.green("✅ Commit created successfully!"));
    } catch (error) {
      this.logger.error(chalk.red("❌ Failed to create commit:"), error);
      throw error;
    }
  }

  displayAnalysisResults(result: CommitAnalysisResult): void {
    if (
      result.complexity.needsStructure ||
      result.complexity.reasons.length > 0
    ) {
      this.logger.info(
        chalk.yellow("\n⚠️  This commit appears to be complex:"),
      );
      if (result.complexity.reasons.length > 0) {
        result.complexity.reasons.forEach((reason) => {
          this.logger.info(`  ${chalk.dim("•")} ${chalk.yellow(reason)}`);
        });
      }
    }

    if (result.warnings.length > 0) {
      this.logger.info(`\n${chalk.yellow("⚠️")} Analysis found some concerns:`);
      result.warnings.forEach((warning) => {
        this.logger.info(
          `  ${chalk.dim("•")} ${chalk.yellow(warning.message)}`,
        );
      });
    } else {
      this.logger.info("\n✅ Analysis completed successfully!");
      this.logger.info(chalk.green("No issues detected."));
    }
  }
}
