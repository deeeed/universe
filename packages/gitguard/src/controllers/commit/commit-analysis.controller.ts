import chalk from "chalk";
import { CommitCommandOptions } from "../../commands/commit.js";
import { CommitService } from "../../services/commit.service.js";
import { GitService } from "../../services/git.service.js";
import { CommitAnalysisResult } from "../../types/analysis.types.js";
import { Config } from "../../types/config.types.js";
import { FileChange } from "../../types/git.types.js";
import { Logger } from "../../types/logger.types.js";
import { SecurityCheckResult } from "../../types/security.types.js";
import { promptSplitChoice } from "../../utils/user-prompt.util.js";

interface CommitAnalysisControllerParams {
  logger: Logger;
  git: GitService;
  config: Config;
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
  enablePrompts: boolean;
  securityResult: SecurityCheckResult;
}

export class CommitAnalysisController {
  private readonly logger: Logger;
  private readonly git: GitService;
  private readonly commitService: CommitService;
  private readonly config: Config;
  constructor({ logger, git, config }: CommitAnalysisControllerParams) {
    this.logger = logger;
    this.git = git;

    this.commitService = new CommitService({
      config,
      git,
      logger,
    });
    this.config = config;
  }

  getFilesToAnalyze({
    options,
    stagedFiles,
    unstagedFiles,
  }: GetFilesToAnalyzeParams): GetFilesToAnalyzeResult {
    const shouldAnalyzeStaged = options.all ?? options.staged !== false;
    const shouldAnalyzeUnstaged = options.all ?? options.unstaged === true;

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
    enablePrompts,
    securityResult,
  }: AnalyzeChangesParams): Promise<CommitAnalysisResult> {
    const result = await this.commitService.analyze({
      files,
      message,
      enablePrompts,
      securityResult,
    });

    if (!this.config.analysis.multiPackageDetection) {
      return result;
    }

    const cohesionAnalysis = this.commitService.analyzeCommitCohesion({
      files,
      originalMessage: message,
    });

    if (cohesionAnalysis.shouldSplit && cohesionAnalysis.warnings.length > 0) {
      this.logger.info("\n📦 Detected changes that should be split");
      const splitReason = cohesionAnalysis.warnings[0].message;
      this.logger.info(chalk.yellow(splitReason));

      const splitSuggestion = cohesionAnalysis.splitSuggestion;

      if (splitSuggestion) {
        this.logger.info("\n📦 Suggested commit splits:");
        splitSuggestion.suggestions.forEach((suggestion, index) => {
          this.logger.info(`\n${index + 1}. ${chalk.cyan(suggestion.message)}`);
          suggestion.files.forEach((file) => {
            this.logger.info(`   ${chalk.dim("•")} ${file}`);
          });
        });

        if (enablePrompts) {
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
              enablePrompts: true,
              securityResult,
            });
          }
        }

        return {
          ...result,
          splitSuggestion: undefined, // Remove suggestions to avoid re-asking user.
        };
      }
    }

    return result;
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
    if (result.splitSuggestion) {
      this.logger.info("\n📦 Suggested commit splits:");
      result.splitSuggestion.suggestions.forEach((suggestion, index) => {
        this.logger.info(`\n${index + 1}. ${chalk.cyan(suggestion.message)}`);
        suggestion.files.forEach((file) => {
          this.logger.info(`   ${chalk.dim("•")} ${file}`);
        });
      });
    }

    if (
      result.complexity.needsStructure ||
      result.complexity.reasons.length > 0
    ) {
      this.logger.info(
        chalk.yellow("\n⚠️") + "  This commit appears to be complex:",
      );
      if (result.complexity.reasons.length > 0) {
        result.complexity.reasons.forEach((reason) => {
          this.logger.info(`  ${chalk.dim("•")} ${chalk.yellow(reason)}`);
        });

        this.logger.info(
          chalk.dim(
            "\n💡 Pro tip: You can configure complexity thresholds in .gitguard/config.json:",
          ),
        );
        this.logger.info(
          chalk.dim(`  "analysis": {
    "complexity": {
      "structureThresholds": {
        "scoreThreshold": 10,     // Total complexity score that triggers restructuring
        "reasonsThreshold": 2    // Number of reasons that triggers restructuring
      },
      "thresholds": {
        "largeFile": 100,        // Lines changed to consider a file large
        "multipleFiles": 5       // Number of files to consider too many
        // ... other thresholds
      }
    }
  }`),
        );
        this.logger.info(
          chalk.dim(
            "\nHigher thresholds will be more permissive, lower thresholds will encourage smaller commits.",
          ),
        );
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
